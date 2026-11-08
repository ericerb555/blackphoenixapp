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
import { trustedRole, isTrustedStaff } from "./trustedRole.ts";
import { estimateCostCents } from "./modelPricing.ts";
import { assertAiAllowed } from "./aiKillSwitch.ts";

export type AiAuthority = 'staff' | 'subscriber' | 'public' | 'cron' | 'internal';
export type AiOutcome = 'running' | 'ok' | 'refused' | 'error';

export interface BeginAiCall {
  /** The capability: 'quote-generator', 'design-assistant', 'lead-scoring'. */
  agent: string;
  /** What it was asked for within that capability. */
  operation: string;
  /**
   * On what basis this was allowed. Recorded, never inferred later.
   *
   * Optional here and defaulted to `internal` by `beginAiCall`, because the
   * column is NOT NULL and the common instrumentation pattern is a route
   * spreading a context object into this call. A caller that forgets to set
   * it should get a row saying "we did not record who authorised this", which
   * is true and visible, rather than a failed INSERT that loses the row
   * entirely and takes the record of the call with it.
   */
  authority?: AiAuthority;
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
      authority: input.authority || 'internal',
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
    return handleFor(String(data.id), startedAt, input.model);
  } catch (e: any) {
    console.error('[aiLedger] beginAiCall threw:', e?.message || e);
    return deadHandle();
  }
}

function handleFor(id: string, startedAt: number, openedWithModel?: string): AiCallHandle {
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

      /**
       * Cost is derived here rather than at each call site.
       *
       * Every wrapper and every hand-written `call.ok(...)` passes through
       * this one function, so pricing it here covers all 40-odd of them at
       * once and means a price-table change takes effect everywhere without
       * touching a single agent. A caller that computed its own figure is
       * still honoured — nothing here second-guesses an explicit number.
       *
       * An unpriceable model leaves the column NULL, which the dashboard
       * reads as "not computed" rather than as zero.
       */
      if (Number.isFinite(finish.costCents as number)) {
        patch.cost_cents = finish.costCents;
      } else {
        const model = finish.model || openedWithModel;
        const estimate = estimateCostCents(model, finish.tokensIn, finish.tokensOut);
        if (estimate) patch.cost_cents = estimate.cents;
      }

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

/**
 * The parts of a ledger entry a ROUTE knows and a worker function does not.
 *
 * Instrumented functions like `runEstimator` are called from several places
 * and have no Hono context of their own, so they take this and spread it. It
 * is optional at every call site: an un-instrumented caller still produces a
 * row, just one that says `internal` and names nobody — a truthful record of
 * a call nobody attributed, rather than no record at all.
 */
export type LedgerContext = Partial<Pick<
  BeginAiCall,
  'actor' | 'actorRole' | 'authority' | 'requestPath' | 'businessId' | 'applicationId'
>>;

/**
 * Describe who is asking, from a Hono context, for free.
 *
 * READS THE ACTOR OFF THE CONTEXT, NEVER RE-RESOLVES IT
 *
 * The auth wall in `index.tsx` already calls `intakeActor` for every request
 * that is not public and stores the result with `c.set('actor', user)`,
 * specifically so that nothing downstream looks it up again. `intakeActor` is
 * a network round trip to Supabase auth; calling it here would add one to
 * every instrumented route purely to write a log line, which is a bad trade
 * on a latency-sensitive path and would make instrumenting a route something
 * people avoid.
 *
 * So this reads what the gate already established. A route with no actor on
 * the context is a public one, and is recorded as such.
 *
 * AUTHORITY IS DERIVED FROM app_metadata ONLY
 *
 * Through `isTrustedStaff`, for the reason set out in `trustedRole.ts`: a role
 * read from `user_metadata` is one the account holder wrote themselves. A
 * ledger that believed it would record a customer's own claim about their
 * authority as though the platform had agreed with it — which is worse than
 * recording nothing, because it reads as verified.
 */
export function ledgerContextFor(c: any): LedgerContext {
  let requestPath: string | undefined;
  try { requestPath = new URL(c.req.url).pathname; } catch { /* not worth failing over */ }

  try {
    const user = c.get?.('actor');
    if (!user?.id && !user?.email) return { authority: 'public', requestPath };
    return {
      actor: { id: user.id, email: user.email },
      actorRole: trustedRole(user) || undefined,
      authority: isTrustedStaff(user) ? 'staff' : 'subscriber',
      requestPath,
    };
  } catch {
    return { authority: 'internal', requestPath };
  }
}

/* ── instrumenting a call without rewriting the call site ────────────────── */

/**
 * `fetch` to OpenAI, with the ledger written around it.
 *
 * WHY A FETCH WRAPPER RATHER THAN A NICER CLIENT
 *
 * There are 31 `api.openai.com/v1/chat/completions` calls across this server
 * and 11 image generations, each with its own body, its own response
 * handling and its own idea of what a failure means. A tidy `askTheModel()`
 * that returned parsed content would mean rewriting all 42 of them, and a
 * rewrite of 42 working call sites to add LOGGING is a bad trade.
 *
 * This takes the same arguments as `fetch` and returns the same `Response`,
 * so converting a call site is one line and the code around it — `res.ok`,
 * `await res.json()`, every existing error path — is untouched.
 *
 * HOW IT READS USAGE WITHOUT CONSUMING THE BODY
 *
 * `res.clone()`. A `Response` body can only be read once, so reading usage
 * directly would leave the caller with a consumed stream and a confusing
 * failure some distance away. The clone is read on a background path and its
 * own failures are swallowed — a malformed response is the caller's problem
 * to report, not something this should turn into a second error.
 *
 * WHAT COUNTS AS FAILURE HERE
 *
 * A non-2xx reply is recorded as an error even though `fetch` does not throw
 * on one. That is the specific trap that made `/leads/blast` claim it had
 * sent fifty emails while the auth wall refused every one.
 *
 * WHY `meta` COMES FIRST
 *
 * So converting a call site is a single-line change. The arguments after it
 * are exactly `fetch`'s, and the body of the init object — which is where
 * all the length and all the per-site variation lives — does not have to be
 * touched or even read. With `meta` last, every conversion would mean
 * finding the matching close brace of a forty-line object literal, 42 times,
 * by hand. That is how a mechanical change becomes a risky one.
 */
export async function recordedOpenAIFetch(
  meta: { agent: string; operation: string; bucket?: 'ai' | 'render' | 'blueprint' } & LedgerContext,
  url: string,
  init: RequestInit,
): Promise<Response> {
  const { agent, operation, bucket, ...context } = meta;

  // Before anything else, and before a ledger row exists: a stopped agent
  // should leave no trace of work it never did.
  await assertAiAllowed(agent);

  // Best effort, and never allowed to break the call it is describing.
  let model: string | undefined;
  let prompt: string | undefined;
  try {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    model = body?.model;
    prompt = typeof body?.prompt === 'string'
      ? body.prompt
      : Array.isArray(body?.messages)
        ? body.messages.map((m: any) => (typeof m?.content === 'string' ? m.content : '')).join('\n')
        : undefined;
  } catch { /* an unparseable body is still a call worth recording */ }

  const call = await beginAiCall({
    agent, operation, bucket: bucket || 'ai',
    provider: 'openai', model, input: prompt,
    ...context,
  });

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    await call.failed(e, { summary: 'the request never completed' });
    throw e;
  }

  if (!res.ok) {
    // Read the error text off a clone so the caller can still read it too.
    let detail = '';
    try { detail = (await res.clone().text()).slice(0, 300); } catch { /* ignore */ }
    await call.refused(`HTTP ${res.status}`, { summary: detail || `HTTP ${res.status}` });
    return res;
  }

  try {
    const copy = await res.clone().json();
    const usage = copy?.usage || {};
    await call.ok({
      summary: operation,
      tokensIn: usage.prompt_tokens ?? usage.input_tokens,
      tokensOut: usage.completion_tokens ?? usage.output_tokens,
      model: copy?.model || model,
    });
  } catch {
    // A 2xx whose body is not JSON — an image endpoint returning binary, say.
    // The call still succeeded; we just know less about it.
    await call.ok({ summary: operation });
  }

  return res;
}

/**
 * `client.messages.create(...)` with the ledger written around it.
 *
 * The Anthropic counterpart to `recordedOpenAIFetch`, and `meta` comes first
 * for the same reason: every one of these call sites passes a multi-line
 * object literal, and a one-line conversion cannot go wrong in the way that
 * hunting for a closing brace can.
 *
 * Returns exactly what the SDK returned, so the caller's handling of
 * `message.content`, usage and errors is untouched.
 */
export async function recordedAnthropic(
  meta: { agent: string; operation: string; bucket?: 'ai' | 'render' | 'blueprint' } & LedgerContext,
  client: any,
  params: any,
): Promise<any> {
  const { agent, operation, bucket, ...context } = meta;

  await assertAiAllowed(agent);

  // The prompt, for its length and hash only.
  let prompt: string | undefined;
  try {
    const parts = (params?.messages || []).map((m: any) =>
      typeof m?.content === 'string' ? m.content : '');
    prompt = [params?.system, ...parts].filter(Boolean).join('\n') || undefined;
  } catch { /* shape is unusual; the call is still worth recording */ }

  const call = await beginAiCall({
    agent, operation, bucket: bucket || 'ai',
    provider: 'anthropic', model: params?.model, input: prompt,
    ...context,
  });

  try {
    const message = await client.messages.create(params);
    const usage = (message as any)?.usage || {};
    await call.ok({
      summary: operation,
      tokensIn: usage.input_tokens,
      tokensOut: usage.output_tokens,
      model: (message as any)?.model || params?.model,
    });
    return message;
  } catch (e) {
    await call.failed(e);
    throw e;
  }
}
