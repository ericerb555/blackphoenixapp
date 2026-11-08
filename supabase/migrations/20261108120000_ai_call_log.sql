-- Every model call this platform makes, and what came of it.
--
-- WHY THIS EXISTS
--
-- There are about fifteen places in this server that call a model — writing a
-- quote, reading a blueprint, scoring a lead, scripting a reel, pricing a
-- product — and until now not one of them recorded that it had. `aiSpend`
-- counts calls per account so a bill cannot run away, and that is all it does:
-- it knows a customer made 41 calls this month and nothing about what any of
-- them were.
--
-- So the two questions the owner actually asks have had no answer:
--
--   "what is the AI doing right now"      nothing tracks in-flight work
--   "what has the AI done"                nothing was ever written down
--
-- `tasks/phoenix-ai-audit.md` lists this as gap 3 and recommends it before any
-- agent work, because it is the cheapest thing to build and everything else
-- depends on it. An agent you cannot audit is one you cannot safely give more
-- authority to, and the blueprint's whole premise is giving it more authority.
--
-- IT IS ALSO THE HONESTY MECHANISM
--
-- The specification says PHOENIX must "never claim an action was completed
-- without verifying the result". That cannot be a rule the model is asked to
-- follow; it has to be a record kept by something other than the model. This
-- table is that record — `outcome` is written by the caller after the fact,
-- not by the thing being described.
--
-- WHAT IS DELIBERATELY NOT STORED
--
-- Not the prompt, and not the completion.
--
-- The inputs here include customer photographs, home addresses, blueprints,
-- tenant screening context and lead contact details. A complete transcript of
-- every model call would be the single most sensitive table in the database,
-- it would be the most attractive thing in it to steal, and almost none of its
-- value is needed to answer "what has the AI been doing".
--
-- So this keeps shape rather than content: which agent, which operation, how
-- big the input was, how it turned out. `input_digest` is a SHA-256 of the
-- prompt, which is enough to tell that two calls were identical — the thing
-- worth knowing for a retry loop — without holding the prompt itself.
-- `summary` is a short caller-written description, meant to be read by a
-- person, and the caller is responsible for keeping customer data out of it.
--
-- If full transcripts are ever needed for a specific debugging session, that
-- should be a separate, short-retention, explicitly-enabled thing rather than
-- the default for everything forever.

create table if not exists public.ai_call_log (
  id                uuid        primary key default gen_random_uuid(),

  -- When the call started, and how long it took. Started rather than finished
  -- because an in-flight row is written at the start: that is what makes
  -- "what is it doing right now" answerable at all.
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  duration_ms       integer,

  -- WHO ASKED. Nullable because some calls are made by the clock rather than
  -- by a person, and `authority` says which.
  actor_email       text,
  actor_id          uuid,
  actor_role        text,

  /**
   * On what basis this call was allowed to happen.
   *
   *   staff        somebody who works here, established from app_metadata
   *   subscriber   a paying portal account, within its aiSpend ceiling
   *   public       an unauthenticated caller on a deliberately public route
   *   cron         the scheduler, carrying a shared secret, with no person
   *   internal     one server module calling another in process
   *
   * Recorded rather than inferred, because "how was this permitted" is the
   * first question after anything goes wrong, and reconstructing it later
   * from a role and a path is guesswork.
   */
  authority         text        not null,

  -- WHAT RAN. `agent` is the capability — 'quote-generator', 'design-
  -- assistant', 'lead-scoring'. `operation` is the specific thing it was asked
  -- for within that capability.
  agent             text        not null,
  operation         text        not null,
  provider          text,
  model             text,

  -- Ties a row to the ceiling it was counted against, so the ledger and the
  -- spend counter can be reconciled. Matches SpendBucket in aiCeiling.ts.
  bucket            text,

  -- HOW IT TURNED OUT.
  --   running   written at the start; still in flight
  --   ok        the model answered and the caller used the answer
  --   refused   a guard stopped it — over ceiling, not permitted, bad input
  --   error     the model or the network failed
  -- A row left in 'running' long after started_at is itself a finding: it
  -- means the handler died without recording an outcome.
  outcome           text        not null default 'running',
  error             text,

  -- Shape of the input, never its content. See the note above.
  input_digest      text,
  input_chars       integer,
  summary           text,

  -- What it cost. Tokens come from the provider's response where it gives
  -- them. cost_cents is an ESTIMATE derived from published per-token prices
  -- and is labelled as such everywhere it is shown — it is not a bill.
  tokens_in         integer,
  tokens_out        integer,
  cost_cents        numeric(12, 4),

  /**
   * Did anything actually happen as a result?
   *
   * This is the column the blueprint's "verified action reporting" rests on. A
   * model answering is not an action; sending the email is. A caller that
   * performs an action records what it was, so "the AI contacted 50 leads" can
   * be checked rather than believed.
   *
   * Null means the call produced advice or text and changed nothing, which is
   * most of them and is a perfectly good answer.
   */
  action_taken      text,

  -- Which business and application this belonged to. Both nullable and unused
  -- today: there is one of each. They are here because adding a column to a
  -- log table later means backfilling rows that cannot be backfilled, and
  -- multi-application support is §7 of the specification.
  business_id       text,
  application_id    text,

  request_path      text
);

comment on table public.ai_call_log is
  'One row per model call: who asked, on what authority, which agent, how it turned out and what it cost. Deliberately holds no prompt or completion text — shape only. See the header of the migration that created it.';

-- The dashboard reads "most recent first", always.
create index if not exists ai_call_log_started_idx
  on public.ai_call_log (started_at desc);

-- "What has this agent been doing", and "what is still running".
create index if not exists ai_call_log_agent_idx
  on public.ai_call_log (agent, started_at desc);
create index if not exists ai_call_log_outcome_idx
  on public.ai_call_log (outcome, started_at desc)
  where outcome = 'running';

-- "What has this customer's account been spending", for reconciling against
-- the aiSpend counters.
create index if not exists ai_call_log_actor_idx
  on public.ai_call_log (actor_email, started_at desc)
  where actor_email is not null;

/**
 * Nothing is granted, same as `query_perf_snapshot` and the ledgers.
 *
 * The service role writes it, and it is read through a route that checks for
 * staff. `anon` and `authenticated` get nothing directly — a customer must not
 * be able to read the row describing another customer's quote being drafted,
 * and the set of agent names alone describes the shape of the whole system.
 *
 * RLS with no policy means no row is visible to anybody but the service role,
 * which is the intent. It is enabled explicitly rather than left off, because
 * a table with RLS off is one Supabase's own advisor flags and one a future
 * `grant` would silently open.
 */
alter table public.ai_call_log enable row level security;

/**
 * Keep ninety days.
 *
 * Long enough to answer "was it doing this last quarter" and to show a trend
 * in cost, short enough that the table stays small and that nothing
 * identifying lingers indefinitely. At a few thousand rows a day this settles
 * well under a million rows.
 *
 * Deliberately NOT scheduled here. `storeAutonomy`'s job registry is where
 * recurring work belongs on this platform, so this is a function the tick can
 * call rather than a sixth pg_cron schedule with its own secret to rotate.
 */
create or replace function public.prune_ai_call_log(keep_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.ai_call_log
   where started_at < now() - make_interval(days => greatest(keep_days, 1));
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Same treatment every other definer function here gets: callable by the
-- service role only. A definer function left executable by `anon` is an RPC
-- that bypasses the RLS above, which is M-3 in the October audit.
revoke all on function public.prune_ai_call_log(integer) from public, anon, authenticated;
