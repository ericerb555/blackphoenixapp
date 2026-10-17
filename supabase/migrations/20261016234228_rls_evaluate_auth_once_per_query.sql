-- Evaluate auth.uid() and auth.jwt() once per query, not once per row.
--
-- WHAT IS WRONG
--
-- A policy written `auth.uid() = user_id` is a function call Postgres cannot
-- prove is constant, so it re-runs it for every row the query touches. Wrapped
-- as `(select auth.uid())` it becomes a scalar subquery, which the planner
-- hoists into an InitPlan and evaluates exactly once. Same answer, one call
-- instead of N. Supabase's own linter flags this as `auth_rls_initplan`.
--
-- WHERE THE BENEFIT ACTUALLY IS, MEASURED
--
-- Not evenly spread across the thirteen. Measured on a 50,000-row scratch
-- table inside a rolled-back transaction, same data, same claims, only the
-- policy differing:
--
--   indexed equality, `auth.uid() = user_id`      — the other twelve
--     bare:     Index Scan, Index Cond, 1 call per scan
--     wrapped:  Index Scan, Index Cond, InitPlan 1, 1 call per scan
--     identical plans; no measurable difference, repeatedly
--
--   non-indexable filter, `lower(client_email) = lower(auth.jwt()->>email)`
--     bare:     Seq Scan, the whole current_setting + jsonb parse inlined
--               into the per-row Filter.  114.0 ms, 114.2 ms
--     wrapped:  Seq Scan, Filter reads (InitPlan 1).col1.
--               58.0 ms, 58.8 ms  (one 100.7 ms outlier; shared instance)
--
-- So twelve of these are housekeeping that satisfies the linter and changes
-- no plan, and the thirteenth — work_requests_read_own — is the real one,
-- because `auth.uid()` against an indexed column was already being evaluated
-- once per scan, while parsing the JWT for every row never was. Roughly
-- halved at 50,000 rows.
--
-- Today it changes nothing either way: these four tables hold five rows
-- between them (companies 2, work_requests 3, the other two empty), and at
-- that size there is no time to save. That is the argument for doing it now
-- rather than against it. A cost like this never announces itself; it arrives
-- as "the directory got slow" eighteen months from now, when the fix means
-- editing live policies on tables people are reading. Changing them while
-- they guard five rows is free.
--
-- WHY ALTER AND NOT DROP + CREATE
--
-- `drop policy` followed by `create policy` leaves a window — however short,
-- and inside a transaction it is still a window to anything already executing
-- — in which the table has one fewer rule protecting it. `alter policy`
-- replaces the expression in place and cannot change the name, the command, or
-- the roles by accident. For a change whose entire promise is "this alters
-- nothing about who can see what", not touching the parts that decide who can
-- see what is the point.
--
-- WHAT IS DELIBERATELY NOT HERE
--
-- `investment_documents.investment_document_read` has the same problem and is
-- the fourteenth policy the linter names. It is being rewritten in
-- 20261016230000_investment_documents_explicit_publication.sql, which is
-- in flight as this is written. Two migrations editing one policy is how you
-- get a policy that is whichever of them ran last. It belongs with that work,
-- and the `(select ...)` wrap should be applied there rather than here.
--
-- Worth saying plainly to whoever picks that up: it is the expensive shape,
-- not the harmless one. It matches on
-- `lower(c.investor_email) = lower(nullif(auth.jwt() ->> 'email', ''))`
-- inside an IN subquery over investor_commitments — the same per-row JWT
-- parse measured at 114 ms against 58 ms above, and it runs once per
-- candidate row of the subquery rather than once per document. Of the
-- fourteen the linter names, that one and work_requests_read_own are the only
-- two where the wrap changes a plan. This migration took one of them.
--
-- VERIFIED BY PROBE, NOT BY READING
--
-- Measured before and after with `set local role authenticated` and a forged
-- `request.jwt.claims`, against the live rows:
--
--   owner (1a9f3ae4…)                        2 companies
--   a user who owns nothing                  0 of everything
--   user_id branch (e252c5ef…)               wr_1781382624383_081iu
--   email branch, null user_id               wr_1781391556479_d8uns
--   lower() branch, stored email capitalised wr_1781382624383_081iu
--
-- Both branches of the work_requests policy and its case-insensitivity are
-- exercised, so a rewrite that quietly dropped one would show up as a probe
-- returning nothing rather than as nobody noticing.

-- FILENAME NOTE
--
-- Applied through the management API, which stamps its own version from the
-- clock rather than from the filename. It recorded 20261016234228, so this
-- file is named to match: a file whose name disagrees with the history table
-- shows up as unapplied in `supabase migration list` for ever, and the next
-- person reasonably concludes it never ran and runs it again.

begin;

-- ── companies ────────────────────────────────────────────────────────────
-- Four policies, one expression. UPDATE has a USING clause and no WITH CHECK,
-- which is how it was written; adding one here would be a behaviour change
-- wearing a performance change's clothes.

alter policy "Users can view own companies"   on public.companies
  using ((select auth.uid()) = user_id);

alter policy "Users can update own companies" on public.companies
  using ((select auth.uid()) = user_id);

alter policy "Users can delete own companies" on public.companies
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own companies" on public.companies
  with check ((select auth.uid()) = user_id);

-- ── exchange_follow ──────────────────────────────────────────────────────

alter policy "read only who you follow"  on public.exchange_follow
  using ((select auth.uid()) = user_id);

alter policy "unfollow only your own"    on public.exchange_follow
  using ((select auth.uid()) = user_id);

alter policy "follow only as yourself"   on public.exchange_follow
  with check ((select auth.uid()) = user_id);

-- ── exchange_saved_business ──────────────────────────────────────────────

alter policy "read only your own saved businesses" on public.exchange_saved_business
  using ((select auth.uid()) = user_id);

alter policy "remove only your own"               on public.exchange_saved_business
  using ((select auth.uid()) = user_id);

alter policy "save only for yourself"             on public.exchange_saved_business
  with check ((select auth.uid()) = user_id);

-- ── work_requests ────────────────────────────────────────────────────────
-- The only non-trivial one: two branches, and it calls both auth functions.
-- A request is yours if you are signed in as its owner, or if its client
-- email is yours — the second branch exists because a request can be filed
-- before the person filing it has an account, which is why `user_id` is
-- nullable here. Both calls are wrapped; `lower()` and `coalesce()` stay
-- exactly where they were.

alter policy "work_requests_read_own" on public.work_requests
  using (
    ((user_id is not null) and (user_id = (select auth.uid())))
    or
    ((client_email <> ''::text)
     and (lower(client_email) = lower(coalesce(((select auth.jwt()) ->> 'email'::text), ''::text))))
  );

-- ── investor-facing reads ────────────────────────────────────────────────
-- Both match on the email claim rather than the subject, because a commitment
-- is recorded against an address before there is necessarily an account
-- behind it.

alter policy "Investors can view their own commitments" on public.investor_commitments
  using (investor_email = ((select auth.jwt()) ->> 'email'::text));

alter policy "Investors can view their own payouts" on public.payout_distributions
  using (investor_email = ((select auth.jwt()) ->> 'email'::text));

commit;
