/**
 * Talking to the assistant, and it answering from the record rather than
 * from memory.
 *
 * WHY THIS EXISTS
 *
 * `tasks/phoenix-ai-audit.md` gap 1: there was no way to ask the system what
 * it was doing. The ledger answered that for a dashboard; this answers it in
 * a sentence. It is the smallest honest version of the specification's §8
 * conversation surface — one endpoint, nine read-only tools, no task
 * object and no autonomy.
 *
 * WHAT IT CAN DO, AND THE SHAPE OF THE LIMIT
 *
 * It reads the work requests, quotes, invoices, leads and alerts that run the
 * business, plus `ai_call_log` and the kill switch. Every tool is a read; see
 * `phoenixTools.ts` for why that is deliberate rather than a first increment
 * waiting to be widened.
 *
 * Each business tool returns COUNTS plus a small trimmed sample rather than
 * the records themselves — cheaper per question, and it keeps customer
 * contact details out of a prompt that does not need them to answer.
 *
 * It is subject to the same two controls as every other model call on this
 * server: the emergency stop refuses it, and the ledger records it under the
 * agent name `phoenix-chat`. That matters more here than elsewhere — an
 * assistant that reports on AI spend while being invisible in the figures it
 * reports would be lying by omission about itself.
 *
 * WHY THE LOOP IS BOUNDED
 *
 * A tool-use loop is the one shape on this server that can spend without
 * limit: the model answers, asks for another tool, answers again. MAX_TURNS
 * stops that at five, which is more than any of these tools needs and
 * far short of a runaway. `aiSpend` is also counted per turn, so a long
 * conversation draws down the same ceiling as everything else.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { requireStaffOn } from "./requireStaff.ts";
import { beginAiCall, ledgerContextFor } from "./aiLedger.ts";
import { assertAiAllowed, AiStopped } from "./aiKillSwitch.ts";
import { allStops } from "./aiKillSwitch.ts";
import { summarise, byAgent, concerns, effectiveState, type LedgerRow } from "./aiLedgerView.ts";
import { fence, UNTRUSTED_PREAMBLE } from "./untrustedContent.ts";
import {
  PHOENIX_TOOLS, PHOENIX_SYSTEM, isKnownTool, clampHours, clampLimit,
  publicCallRow, CALL_FIELDS, statusOf, countByStatus, sumAmounts, isUnpaid,
  publicWorkRequest, publicQuote, publicInvoice, publicLead, publicAlert,
} from "./phoenixTools.ts";

export const phoenixChatRouter = new Hono();

const BASE = '/make-server-3eae23a6/phoenix/chat';

/**
 * Staff only, like the rest of the AI surface.
 *
 * This answers questions about company spend and agent behaviour, and the
 * set of agent names alone describes the shape of the platform. Same
 * reasoning as `ai-activity.tsx`, and the same scoped guard, because this
 * router spells its path in full and is mounted at `/`.
 */
phoenixChatRouter.use('*', requireStaffOn([BASE]));

let cached: any = null;
function admin() {
  if (!cached) {
    cached = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cached;
}

/** How many model turns one question may take. See the header. */
const MAX_TURNS = 5;
/** How much history the client may replay. Enough for a working exchange. */
const MAX_HISTORY = 12;

async function runTool(name: string, input: any): Promise<unknown> {
  if (name === 'ai_stop_status') {
    const stops = await allStops();
    return stops.length
      ? { engaged: true, stops }
      : { engaged: false, note: 'Nothing is stopped. All agents may run.' };
  }

  const hours = clampHours(input?.hours);
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  if (name === 'ai_activity_summary') {
    const { data, error } = await admin()
      .from('ai_call_log')
      .select(CALL_FIELDS.join(','))
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data || []) as LedgerRow[];
    const summary = summarise(rows);
    return {
      windowHours: hours,
      truncated: rows.length >= 500,
      summary,
      agents: byAgent(rows),
      concerns: concerns(summary),
      costNote: 'Costs are estimates from published per-token prices. '
        + 'gpt-image-1 and dall-e-3 have no verified price and contribute nothing.',
    };
  }

  if (name === 'recent_ai_calls') {
    let q = admin()
      .from('ai_call_log')
      .select(CALL_FIELDS.join(','))
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(clampLimit(input?.limit));
    if (input?.agent) q = q.eq('agent', String(input.agent));
    if (input?.outcome) q = q.eq('outcome', String(input.outcome));
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const now = Date.now();
    return {
      windowHours: hours,
      calls: (data || []).map((row: any) => ({
        ...publicCallRow(row),
        state: effectiveState(row as LedgerRow, now),
      })),
    };
  }

  /* ── the business ──────────────────────────────────────────────────────── */

  /**
   * Work requests live under two keys for historical reasons.
   *
   * `all_work_requests` is the legacy list and `wr:{id}` the per-record form
   * that `persistWorkRequest` writes to both. Reading the legacy list is one
   * round trip instead of N and carries the same records; `workRequestStore`
   * makes the same choice for the same reason.
   */
  const workRequests = async (): Promise<any[]> =>
    ((await kv.get('all_work_requests')) as any[]) || ((await kv.get('work_requests')) as any[]) || [];

  if (name === 'work_requests') {
    const all = await workRequests();
    const wanted = input?.status ? String(input.status).toLowerCase() : null;
    const rows = wanted ? all.filter((r) => statusOf(r) === wanted) : all;
    return {
      total: all.length,
      byStatus: countByStatus(all),
      showing: wanted || 'all',
      recent: rows.slice(0, clampLimit(input?.limit, 10, 50)).map(publicWorkRequest),
    };
  }

  if (name === 'quotes_and_invoices') {
    const limit = clampLimit(input?.limit, 10, 50);
    const [quotes, invoices] = await Promise.all([
      kv.getByPrefix('quote:') as Promise<any[]>,
      kv.getByPrefix('invoice:') as Promise<any[]>,
    ]);
    const q = (quotes || []).filter(Boolean);
    const inv = (invoices || []).filter(Boolean);
    const unpaid = inv.filter(isUnpaid);
    return {
      quotes: {
        total: q.length,
        byStatus: countByStatus(q),
        totalValue: sumAmounts(q),
        recent: q.slice(0, limit).map(publicQuote),
      },
      invoices: {
        total: inv.length,
        byStatus: countByStatus(inv),
        outstandingCount: unpaid.length,
        outstandingValue: sumAmounts(unpaid),
        oldestOutstanding: unpaid.slice(0, limit).map(publicInvoice),
      },
    };
  }

  if (name === 'leads') {
    const all = ((await kv.get('leads:all')) as any[]) || [];
    const wanted = input?.intent ? String(input.intent).toLowerCase() : null;
    const rows = wanted ? all.filter((l) => String(l?.intent || '').toLowerCase() === wanted) : all;
    return {
      total: all.length,
      byIntent: {
        hot: all.filter((l) => l?.intent === 'hot').length,
        warm: all.filter((l) => l?.intent === 'warm').length,
        cold: all.filter((l) => l?.intent === 'cold').length,
      },
      contacted: all.filter((l) => Number(l?.emailsSent) > 0).length,
      neverContacted: all.filter((l) => !Number(l?.emailsSent)).length,
      showing: wanted || 'all',
      recent: rows.slice(0, clampLimit(input?.limit, 10, 50)).map(publicLead),
    };
  }

  if (name === 'alerts') {
    const all = ((await kv.get('admin_alerts')) as any[]) || [];
    const unread = all.filter((a) => statusOf(a) === 'unread');
    return {
      total: all.length,
      unreadCount: unread.length,
      alerts: [...unread, ...all.filter((a) => statusOf(a) !== 'unread')]
        .slice(0, clampLimit(input?.limit, 15, 50)).map(publicAlert),
    };
  }

  if (name === 'business_snapshot') {
    /**
     * One call, because "how are we doing" otherwise costs four.
     *
     * Counts only — no samples. The model follows up with a specific tool
     * when the answer needs detail, which keeps the common question cheap.
     */
    const [wr, quotes, invoices, leadRows, alertRows] = await Promise.all([
      workRequests(),
      kv.getByPrefix('quote:') as Promise<any[]>,
      kv.getByPrefix('invoice:') as Promise<any[]>,
      kv.get('leads:all') as Promise<any[]>,
      kv.get('admin_alerts') as Promise<any[]>,
    ]);
    const q = (quotes || []).filter(Boolean);
    const inv = (invoices || []).filter(Boolean);
    const unpaid = inv.filter(isUnpaid);
    const leads = leadRows || [];
    const open = wr.filter((r) => !['completed', 'cancelled', 'closed'].includes(statusOf(r)));
    return {
      workRequests: { total: wr.length, open: open.length, byStatus: countByStatus(wr) },
      quotes: { total: q.length, totalValue: sumAmounts(q), byStatus: countByStatus(q) },
      invoices: { total: inv.length, outstandingCount: unpaid.length, outstandingValue: sumAmounts(unpaid) },
      leads: {
        total: leads.length,
        hot: leads.filter((l: any) => l?.intent === 'hot').length,
        neverContacted: leads.filter((l: any) => !Number(l?.emailsSent)).length,
      },
      alerts: { unread: (alertRows || []).filter((a: any) => statusOf(a) === 'unread').length },
      note: 'Counts only. Ask a specific tool for the records behind any of these.',
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

phoenixChatRouter.post(BASE, async (c) => {
  let call: any = null;
  try {
    const body = await c.req.json().catch(() => ({}));
    const message = String(body?.message || '').trim().slice(0, 4000);
    if (!message) return c.json({ success: false, error: 'Ask something.' }, 400);

    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return c.json({ success: false, error: 'The assistant is not configured.' }, 503);

    await assertAiAllowed('phoenix-chat');

    /**
     * History replayed by the client, trimmed and shape-checked.
     *
     * Only `user` and `assistant` text turns survive. A client that replayed
     * a forged `tool_result` could otherwise put words in a tool's mouth and
     * have the model report a figure no query returned — which is precisely
     * the property this assistant is built to guarantee.
     */
    const history = (Array.isArray(body?.history) ? body.history : [])
      .slice(-MAX_HISTORY)
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    /**
     * The question is fenced even though it came from staff.
     *
     * Not because the asker is a threat, but because what they paste often
     * is — an error message, a customer's email, a supplier's quote. Fencing
     * it costs nothing and means the one untrusted thing in the prompt is
     * marked as such.
     */
    const asked = fence('The question', message);

    call = await beginAiCall({
      agent: 'phoenix-chat',
      operation: 'answer a question about AI activity',
      model: 'claude-opus-5', provider: 'anthropic', bucket: 'ai',
      input: message,
      ...ledgerContextFor(c),
    });

    const client = new (await import('npm:@anthropic-ai/sdk')).default({ apiKey: key });
    const messages: any[] = [...history, { role: 'user', content: asked.text }];

    let answer = '';
    let turns = 0;
    const toolsUsed: string[] = [];

    while (turns < MAX_TURNS) {
      turns += 1;
      const reply = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        system: `${PHOENIX_SYSTEM}\n\n${UNTRUSTED_PREAMBLE}`,
        tools: PHOENIX_TOOLS as any,
        messages,
      });

      const text = (reply.content || [])
        .filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();
      if (text) answer = text;

      const calls = (reply.content || []).filter((b: any) => b.type === 'tool_use');
      if (!calls.length) break;

      messages.push({ role: 'assistant', content: reply.content });

      /**
       * Every tool result goes back in ONE user message.
       *
       * Splitting them across several silently teaches the model to stop
       * asking for tools in parallel. A failure comes back as a result with
       * `is_error`, never as a dropped block — a missing result leaves the
       * model guessing at what happened.
       */
      const results = [];
      for (const t of calls as any[]) {
        if (!isKnownTool(t.name)) {
          results.push({ type: 'tool_result', tool_use_id: t.id, is_error: true,
            content: `No such tool: ${t.name}` });
          continue;
        }
        toolsUsed.push(t.name);
        try {
          const out = await runTool(t.name, t.input || {});
          results.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(out) });
        } catch (e: any) {
          results.push({ type: 'tool_result', tool_use_id: t.id, is_error: true,
            content: `That lookup failed: ${e?.message || e}` });
        }
      }
      messages.push({ role: 'user', content: results });
    }

    await call.ok({
      summary: toolsUsed.length
        ? `answered using ${[...new Set(toolsUsed)].join(', ')} over ${turns} turn(s)`
        : `answered from the conversation in ${turns} turn(s)`,
    });

    return c.json({
      success: true,
      answer: answer || 'No answer came back — try asking again.',
      toolsUsed: [...new Set(toolsUsed)],
      turns,
      /** True when the loop hit its cap, so the UI can say the answer is partial. */
      truncated: turns >= MAX_TURNS && !answer,
    });
  } catch (error: any) {
    if (error instanceof AiStopped) {
      await call?.refused?.(error.message);
      return c.json({ success: false, error: error.message, stopped: true }, 503);
    }
    await call?.failed?.(error);
    return c.json({ success: false, error: error?.message || 'The assistant could not answer.' }, 500);
  }
});
