/**
 * Talking to the assistant, and it answering from the record rather than
 * from memory.
 *
 * WHY THIS EXISTS
 *
 * `tasks/phoenix-ai-audit.md` gap 1: there was no way to ask the system what
 * it was doing. The ledger answered that for a dashboard; this answers it in
 * a sentence. It is the smallest honest version of the specification's §8
 * conversation surface — one endpoint, twelve tools, and supervised
 * autonomy rather than none.
 *
 * WHAT IT CAN DO, AND THE SHAPE OF THE LIMIT
 *
 * It reads the work requests, quotes, invoices, leads and alerts that run the
 * business, plus `ai_call_log` and the kill switch. Every tool is a read
 * except `propose_action`, which writes a PENDING row into an approval queue
 * and stops. Nothing it proposes happens until a person taps approve, and
 * the parameters cannot change between the review and the act.
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
import { proposeAction, listActions, expireStale, approveAndRun, rejectAction } from "./actionQueue.ts";
import { actionCatalogue } from "./aiActions.ts";
import { PLATFORM_OWNER_EMAILS } from "./identity.ts";

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

async function runTool(name: string, input: any, asker: string): Promise<unknown> {
  if (name === "propose_action") {
    /**
     * The one tool that is not a read, and it still does not act.
     *
     * It writes a pending row and returns its id. `requestedBy` is the
     * authenticated caller from the route, never anything the model said —
     * a proposal that could name its own requester would be a proposal that
     * could name its own approver next.
     */
    const proposed = await proposeAction({
      agent: "phoenix-chat",
      requestedBy: asker || null,
      action: String(input?.action || ""),
      params: (input?.params && typeof input.params === "object") ? input.params : {},
      summary: String(input?.summary || ""),
    });
    if (!proposed.ok) return { proposed: false, error: proposed.error };
    return {
      proposed: true,
      id: proposed.request!.id,
      risk: proposed.request!.risk,
      expiresAt: proposed.request!.expiresAt,
      note: "Nothing has happened. This is waiting for a person to approve it.",
    };
  }

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

  /* ── proposing, and spotting what should run on a schedule ─────────────── */

  if (name === 'pending_actions') {
    await expireStale();
    const status = String(input?.status || 'pending');
    const rows = await listActions(status as any, 25);
    return {
      status,
      count: rows.length,
      actions: rows.map((r) => ({
        id: r.id, action: r.action, summary: r.summary, risk: r.risk,
        status: r.status, createdAt: r.createdAt, expiresAt: r.expiresAt,
      })),
    };
  }

  if (name === 'automation_opportunities') {
    /**
     * Backlogs with an age, plus what already runs.
     *
     * The age is the point. Forty leads never contacted is a number; forty
     * where the oldest arrived three weeks ago is an argument for putting
     * something on a schedule. Without it the model has to guess whether a
     * pile is a backlog or just today's work.
     *
     * The existing jobs are included so it does not propose building
     * something that already exists — this platform has a scheduler and a
     * job registry, and the honest suggestion is usually "add a job",
     * not "build an agent".
     */
    const [wr, invoices, leadRows, alertRows] = await Promise.all([
      workRequests(),
      kv.getByPrefix('invoice:') as Promise<any[]>,
      kv.get('leads:all') as Promise<any[]>,
      kv.get('admin_alerts') as Promise<any[]>,
    ]);

    const ageDays = (iso: unknown): number | null => {
      const t = Date.parse(String(iso || ''));
      if (!Number.isFinite(t)) return null;
      return Math.max(0, Math.round((Date.now() - t) / 86400_000));
    };
    const oldest = (rows: any[], field: string): number | null => {
      const ages = rows.map((r) => ageDays(r?.[field])).filter((d): d is number => d !== null);
      return ages.length ? Math.max(...ages) : null;
    };

    const leads = leadRows || [];
    const uncontacted = leads.filter((l: any) => !Number(l?.emailsSent));
    const unpaid = (invoices || []).filter(Boolean).filter(isUnpaid);
    const pendingWr = wr.filter((r) => ['pending', 'pending_approval'].includes(statusOf(r)));
    const unread = (alertRows || []).filter((a: any) => statusOf(a) === 'unread');

    return {
      backlogs: [
        { what: 'leads never contacted', count: uncontacted.length, oldestDays: oldest(uncontacted, 'capturedAt') },
        { what: 'invoices unpaid', count: unpaid.length, oldestDays: oldest(unpaid, 'created_at') },
        { what: 'work requests awaiting a decision', count: pendingWr.length, oldestDays: oldest(pendingWr, 'created_at') },
        { what: 'alerts unread', count: unread.length, oldestDays: oldest(unread, 'timestamp') },
      ],
      alreadyAutomated: [
        'store-cron-tick — fulfilment retries, tracking and supplier catalogue, every 15 minutes',
        'store-watchdog — hourly, reports a clock that has stopped',
        'autopilot-tick — advances social campaigns every 15 minutes',
        'exchange-upkeep — hourly',
        'compliance-expiry-reminders, screening-expiry, on-call-escalation',
      ],
      howAutomationWorksHere:
        'There is a scheduler (pg_cron) and a job registry in storeAutonomy.ts where a new '
        + 'recurring job is registered rather than built from scratch: each job is small, '
        + 'idempotent, individually switchable, and bounded by spend and order ceilings. '
        + 'A proposal to automate something should normally be "add a job to that registry", '
        + 'not "build a new service".',
      note: 'Counts and ages only. A backlog with a large oldestDays is the case for a '
        + 'schedule; a large count with a small age is just a busy day.',
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
    const askerEmail = String((c.get?.("actor"))?.email || "").toLowerCase();
    const asked = fence("The question", message);

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
          const out = await runTool(t.name, t.input || {}, askerEmail);
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

/* ── the approval queue ──────────────────────────────────────────────────── */

const QUEUE = '/make-server-3eae23a6/phoenix/actions';
phoenixChatRouter.use('*', requireStaffOn([QUEUE]));

/**
 * Who is deciding.
 *
 * Read from the actor the auth wall established, never from the body. The
 * whole value of the queue is that approval comes from an authenticated
 * person, so the one thing that must not be caller-supplied is which person.
 */
function approverFrom(c: any) {
  const user = c.get?.('actor');
  const email = String(user?.email || '').toLowerCase();
  return {
    email,
    isStaff: true,                       // requireStaffOn has already refused anybody else
    isOwner: PLATFORM_OWNER_EMAILS.has(email),
  };
}

/** What is waiting, and what was recently decided. */
phoenixChatRouter.get(QUEUE, async (c) => {
  try {
    await expireStale();
    const status = String(c.req.query('status') || 'pending');
    const rows = await listActions(status as any, 50);
    return c.json({
      success: true,
      status,
      actions: rows,
      catalogue: actionCatalogue(),
      /**
       * Said here so the UI can show it without hardcoding the rule: a
       * high-risk action needs an owner, and the person looking may not be
       * one.
       */
      youCanApprove: { low: true, medium: true, high: PLATFORM_OWNER_EMAILS.has(approverFrom(c).email) },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Approve, and run it.
 *
 * One call, because the gap between "approved" and "done" is a state
 * somebody would have to reason about and nobody would want. The row still
 * records the decision and the execution separately.
 */
phoenixChatRouter.post(`${QUEUE}/:id/approve`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const approver = approverFrom(c);
    const outcome = await approveAndRun(c.req.param('id'), approver, String(body?.note || ''));
    if (!outcome.ok) {
      console.warn(`[actionQueue] approve refused by=${approver.email}: ${outcome.error}`);
      return c.json({ success: false, error: outcome.error }, 400);
    }
    console.warn(`[actionQueue] EXECUTED id=${c.req.param('id')} by=${approver.email}: ${outcome.result}`);
    return c.json({ success: true, result: outcome.result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

phoenixChatRouter.post(`${QUEUE}/:id/reject`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const outcome = await rejectAction(c.req.param('id'), approverFrom(c), String(body?.note || ''));
    if (!outcome.ok) return c.json({ success: false, error: outcome.error }, 400);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
