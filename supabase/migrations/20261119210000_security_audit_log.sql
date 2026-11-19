-- D-2 / L-1 — the table this application has named since before it existed.
--
-- APPLIED 2026-11-19 through the management API, then verified by reading the
-- grants back rather than trusting the apply: RLS on, zero policies, and
-- has_table_privilege is false for both `anon` and `authenticated` on SELECT
-- and INSERT. Proved by request too — a `kind: 'security'` report through the
-- app-errors ingest route lands a row with company_id, outcome and detail
-- intact and actor_email null, which is correct for a probe carrying only the
-- publishable key.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS FOUND
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `logSecurityEvent` exists twice in the browser — AuthContext and
-- CompanyContext — with eight call sites between them. Every one is a
-- tenant-boundary event and five are `company_switch_denied`. Both bodies were
-- a console.log, under a comment reading:
--
--     // Note: security_audit_log table doesn't exist - logging to console instead
--
-- So the single category of event this platform deliberately calls a security
-- event was recorded in the browser console of the person who had just been
-- refused, and nowhere else. The one party who should not hold that record was
-- the only one holding it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY NOT app_error_log, WHICH ALREADY HAD A HARDENED INGEST
-- ─────────────────────────────────────────────────────────────────────────────
--
-- That was the first attempt, and the database refused it:
--
--     new row for relation "app_error_log" violates check constraint
--     "app_error_log_kind_known"
--
-- The constraint was right. That table names the four kinds it accepts and is
-- read as "what is broken" through `app_error_groups`; a tenant-boundary
-- refusal is not a bug report, and widening the constraint would have buried
-- security events among failures and given them whatever retention errors get.
-- Every report had been answering 204 and storing nothing — which is the exact
-- failure shape the November audit was cataloguing.
--
-- The ingest ROUTE is still shared, because that was always the hardened part:
-- per-caller rate limiting, field caps, query strings stripped, and an actor
-- resolved from the VERIFIED bearer token rather than from the request body.
-- Only the destination branches on kind.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT IS DELIBERATELY ABSENT
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Any policy. RLS on with zero policies is deny-all to `anon` and
-- `authenticated`, which is how every other log table here is shaped —
-- ai_call_log, app_error_log, ai_action_request. Only the service role writes
-- or reads it, so the subject of a record can never read, alter or delete it.

create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),

  -- 'company_switch_denied', 'company_context_switch', and the rest.
  event_type text not null,

  -- Resolved SERVER-SIDE from the verified bearer token, never from the
  -- request body. A caller must not be able to sign somebody else's name to
  -- the record of their own refusal. Null is a real and meaningful value: it
  -- means the event arrived without a readable session.
  actor_email text,
  actor_id uuid,

  -- Which tenant boundary was involved. Text rather than a foreign key on
  -- purpose: a record of an attempt on a company must survive that company
  -- being deleted, and a cascade would erase exactly the evidence worth
  -- keeping.
  company_id text,

  outcome text,
  detail text,
  path text,
  user_agent text,

  constraint security_audit_log_outcome_known
    check (outcome is null or outcome = any (array['allowed', 'denied']))
);

alter table public.security_audit_log enable row level security;

-- Reading the trail is "everything since", or "everything about one actor".
create index if not exists security_audit_log_at_idx
  on public.security_audit_log (at desc);
create index if not exists security_audit_log_actor_idx
  on public.security_audit_log (actor_email, at desc);
-- The question that matters most: who has been refused, and how often.
create index if not exists security_audit_log_denied_idx
  on public.security_audit_log (event_type, at desc)
  where outcome = 'denied';

comment on table public.security_audit_log is
  'Tenant-boundary and authorisation events. Written only by the service role '
  'through the app-errors ingest route, which attributes each row from a '
  'verified token. RLS on with no policies: deny-all to anon and authenticated.';
