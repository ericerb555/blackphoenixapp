-- The switch that stops the AI.
--
-- WHY THIS EXISTS
--
-- There was no way to stop it. The AI Diagnostics screen had a pause button
-- and a restart button per agent; the pause flipped a boolean in React state
-- and toasted "disabled" while the agent carried on, and the restart faked a
-- recovery. Somebody reaching for either during a runaway loop would have
-- believed they had stopped the spend.
--
-- Gap 6 in `tasks/phoenix-ai-audit.md`, and items 20 and 24 of the
-- specification's acceptance criteria: the owner must be able to shut the
-- thing off.
--
-- WHY A TABLE AND NOT A SECRET OR AN ENV VAR
--
-- An env var needs a deploy, and a deploy is minutes. The whole point of this
-- is to be faster than the problem. A row can be written from a route, from
-- the dashboard, or by hand in the SQL editor at three in the morning, and it
-- takes effect on the next call.
--
-- `private_cron_config` was the other candidate — it already holds operational
-- secrets — but this is not a secret, it is a state with a history worth
-- keeping. Who stopped it, when, why, and who allowed it to start again are
-- the questions asked afterwards, and a key-value row answers none of them.
--
-- SCOPE: GLOBAL, OR ONE AGENT
--
-- `scope = 'global'` stops every model call on the platform. Any other value
-- is an agent name from `ai_call_log.agent` and stops just that one. The
-- per-agent form is what the two dead buttons on the dashboard should have
-- been doing all along: one misbehaving agent should not need the whole
-- platform turned off.
--
-- ENGAGING IS EASY. RELEASING IS NOT.
--
-- Deliberately asymmetric, and enforced in the route rather than here: any
-- member of staff can engage the stop, because an emergency is the wrong
-- moment to discover you lack a permission. Releasing it is restricted to a
-- platform owner, because "turn the safety back off" is the decision that
-- wants an owner's name against it.
--
-- HISTORY IS KEPT, NOT OVERWRITTEN
--
-- Releasing sets `released_at` rather than deleting the row, so the record of
-- an incident survives it. The live state is the most recent row per scope
-- with `released_at is null`.

create table if not exists public.ai_kill_switch (
  id            uuid        primary key default gen_random_uuid(),

  -- 'global', or an agent name. Not a foreign key: agents are code, not rows,
  -- and a stop must be settable for an agent that has never run.
  scope         text        not null,

  engaged_at    timestamptz not null default now(),
  engaged_by    text        not null,
  -- Required by the route, not by the column, so a stop engaged by hand in an
  -- emergency is never blocked by a missing explanation.
  reason        text,

  released_at   timestamptz,
  released_by   text
);

comment on table public.ai_kill_switch is
  'Emergency stop for model calls. Live state is the newest row per scope with released_at null. Releasing sets released_at rather than deleting, so an incident leaves a record.';

-- The read on the hot path: "is anything engaged right now".
create index if not exists ai_kill_switch_live_idx
  on public.ai_kill_switch (scope, engaged_at desc)
  where released_at is null;

/**
 * At most one live stop per scope.
 *
 * Without this, engaging twice leaves two open rows and releasing clears one
 * of them — the switch would read as still engaged and the person who just
 * released it would have no idea why. A partial unique index makes the second
 * engage a no-op conflict the route can handle, instead of a silent trap.
 */
create unique index if not exists ai_kill_switch_one_live_per_scope
  on public.ai_kill_switch (scope)
  where released_at is null;

/**
 * Nothing granted, same as the ledger.
 *
 * Read and written by the service role through routes that check who is
 * asking. Critically, this means an `anon` or `authenticated` caller cannot
 * write here even if they find the table — the one thing that must never
 * happen to a safety control is that the thing it governs can switch it off.
 */
alter table public.ai_kill_switch enable row level security;
