/**
 * Writing down every model call, so "what has the AI done" has an answer.
 *
 * WHY THIS EXISTS
 *
 * Fifteen places in this server call a model and none of them recorded it.
 * `aiSpend` counts calls against a ceiling so a bill cannot run away, which is
 * a different job: it knows an account made 41 calls and nothing about what
 * any of them were. See the migration `20261108120000_ai_call_log.sql` for the
 * reasoning and for what is deliberately not stored.
 *
 * HOW IT IS MEANT TO BE USED
 *
 *     const call = await beginAiCall({
 *       agent: 'quote-generator', operation: 'draft from description',
 *       authority: 'staff', actor: user, model: 'gpt-4o', bucket: 'ai',
 *       input: prompt,
 *     });
 *     try {
 *       const answer = await callTheModel(prompt);
 *       await call.ok({ summary: 'drafted 14 line items', tokensOut: n });
 *       return answer;
 *     } catch (e) {
 *       await call.failed(e);
 *       throw e;
 *     }
 *
 * Two writes rather than one, deliberately. The row is created BEFORE the
 * model is called, which is the only way "what is it doing right now" can be
 * answered — a ledger written only on completion cannot show in-flight work,
 * and cannot show a call that never completed at all. A row still saying
 * `running` an hour later is itself the finding: the handler died without
 * recording an outcome.
 *
 * IT MUST NEVER BREAK ITS CALLER
 *
 * Every function here swallows its own errors and logs them. This is wrapped
 * around work that matters more than the logging of it — drafting a customer's
 * quote, reading their blueprint — and failing that because an INSERT failed
 * would be a worse outcome than losing the record.
 *
 * That trade is only acceptable because the failures are logged loudly, and
 * because the ledger is not a security control. Nothing is permitted on the
 * strength of a ledger write succeeding; `aiSpend` and the auth wall decide
 * that, and they fail closed. This only observes.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

export type AiAuthority = 'staff' | 'subscriber' | 'public' | 'cron' | 'internal';
export type AiOutcome = 'running' | 'ok' | 'refused' | 'error';

export interface BeginAiCall {
  /** The capability: 'quote-generator', 'design-assistant', 'lead-scoring'. */
  agent: string;
  /** What it was asked for within that capability. */
  operation: string;
  /** On what basis this was allowed. Recorded, never inferred later. */
  authority: AiAuthority;
  /** The verified user, where there is one. Never anything caller-supplied. */
  actor?: { id?: string; email?: string } | null;
  actorRole?: string;
  provider?: string;
  model?: string;
  /** Matches SpendBucket in `aiCeiling.ts`, so the two can be reconciled. */
  bucket?: 'ai' | 'render' | 'blueprint';
  /** The prompt. Hashed and measured, never stored. */
  input?: string;
  requestPath?: string;
  businessId?: string;
  applicationId?: string;
}

export interface FinishAiCall {
  summary?: string;
  /** What actually changed in the world, if anything. Usually nothing. */
  actionTaken?: string;
  tokensIn?: number;
  tokensOut?: number;
  costCents?: number;
  model?: string;
}

/** The handle returned by `beginAiCall`. Every method is best-effort. */
export interface AiCallHandle {
  id: string | null;
  ok(finish?: FinishAiCall): Promise<void>;
  refused(reason: string, finish?: FinishAiCall): Promise<void>;
  failed(error: unknown, finish?: FinishAiCall): Promise<void>;
}

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

/**
 * SHA-256 of the prompt, so two identical calls are recognisable as identical
 * without the prompt being kept.
 *
 * That is the question worth answering about prompt content in a log — "is
 * something retrying the same thing in a loop" — and it is answerable from a
 * hash. Anything that needs the actual text needs a different, deliberately
 * enabled, short-retention mechanism.
 */
async function digest(input: string): Promise<string | null> {
  try {
    const bytes = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);
  } catch {
    return null;
  }
}

/**
 * Keep a caller-written summary short and single-line.
 *
 * The caller is responsible for not putting customer data in it; this only
 * stops a stray stack trace or a pasted document turning the log into the
 * transcript store the migration says it must not become.
 */
function trimSummary(value: unknown, max = 500): string | null {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** A handle that writes nothing, used when the opening INSERT failed. */
function deadHandle(): AiCallHandle {
  return {
    id: null,
    async ok() {},
    async refused() {},
    async failed() {},
  };
}

/**
 * Record that a model call is starting, and return a handle to close it.
 *
 * Never throws and never returns null — a caller should be able to write
 * `const call = await beginAiCall(...)` without a guard, because the
 * alternative is fifteen call sites each deciding what to do when logging is
 * unavailable, and some of them getting it wrong.
 */
export async function beginAiCall(input: BeginAiCall): Promise<AiCallHandle> {
  const startedAt = Date.now();
  try {
    const row = {
      started_at: new Date(startedAt).toISOString(),
      actor_email: input.actor?.email ? String(input.actor.email).toLowerCase() : null,
      actor_id: input.actor?.id || null,
      actor_role: input.actorRole || null,
      authority: input.authority,
      agent: input.agent,
      operation: input.operation,
      provider: input.provider || null,
      model: input.model || null,
      bucket: input.bucket || null,
      outcome: 'running' as AiOutcome,
      input_digest: input.input ? await digest(input.input) : null,
      input_chars: input.input ? input.input.length : null,
      business_id: input.businessId || null,
      application_id: input.applicationId || null,
      request_path: input.requestPath || null,
    };

    const { data, error } = await admin()
      .from('ai_call_log').insert(row).select('id').single();

    if (error || !data?.id) {
      console.error('[aiLedger] could not open a row:', error?.message || 'no id returned');
      return deadHandle();
    }
    return handleFor(String(data.id), startedAt);
  } catch (e: any) {
    console.error('[aiLedger] beginAiCall threw:', e?.message || e);
    return deadHandle();
  }
}

function handleFor(id: string, startedAt: number): AiCallHandle {
  async function close(outcome: AiOutcome, finish: FinishAiCall, error?: string) {
    try {
      const patch: Record<string, unknown> = {
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        outcome,
      };
      if (error) patch.error = trimSummary(error, 1000);
      if (finish.summary !== undefined) patch.summary = trimSummary(finish.summary);
      if (finish.actionTaken !== undefined) patch.action_taken = trimSummary(finish.actionTaken, 200);
      if (finish.model) patch.model = finish.model;
      if (Number.isFinite(finish.tokensIn as number)) patch.tokens_in = finish.tokensIn;
      if (Number.isFinite(finish.tokensOut as number)) patch.tokens_out = finish.tokensOut;
      if (Number.isFinite(finish.costCents as number)) patch.cost_cents = finish.costCents;

      const { error: failure } = await admin()
        .from('ai_call_log').update(patch).eq('id', id);
      if (failure) console.error(`[aiLedger] could not close ${id}:`, failure.message);
    } catch (e: any) {
      console.error(`[aiLedger] closing ${id} threw:`, e?.message || e);
    }
  }

  return {
    id,
    ok: (finish = {}) => close('ok', finish),
    refused: (reason, finish = {}) => close('refused', finish, reason),
    failed: (err, finish = {}) => close('error', finish, (err as any)?.message || String(err)),
  };
}

/**
 * One call, recorded, without the caller handling the handle.
 *
 * For the common shape where the whole of the work is one awaited function.
 * The handle form above exists for callers that need to report tokens, or to
 * record an action taken after the model answered.
 */
export async function recordAiCall<T>(
  input: BeginAiCall,
  run: () => Promise<T>,
  describe?: (result: T) => FinishAiCall,
): Promise<T> {
  const call = await beginAiCall(input);
  try {
    const result = await run();
    await call.ok(describe ? describe(result) : {});
    return result;
  } catch (e) {
    await call.failed(e);
    throw e;
  }
}
