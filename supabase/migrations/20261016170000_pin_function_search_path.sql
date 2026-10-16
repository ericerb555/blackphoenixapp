-- Pin the search_path on six functions that did not set one.
--
-- WHY, AND HOW SERIOUS IT ACTUALLY IS
--
-- Supabase's database linter raises `function_search_path_mutable` for these
-- six. The attack it exists for: a function with no `search_path` of its own
-- resolves unqualified names using the CALLER's, so somebody who can create a
-- schema earlier in that path can put their own `organizations` in front of
-- ours and have our function read it instead.
--
-- Worth being straight about the severity rather than borrowing the alarm from
-- the linter's name. **Not one of these six is SECURITY DEFINER.** Checked:
--
--   proname                        prosecdef
--   bid_request_distance_miles     false
--   exchange_category_depth_guard  false
--   exchange_normalise_phrase      false
--   exchange_org_category_guard    false
--   update_investor_totals         false
--   update_opportunity_stats       false
--
-- A SECURITY INVOKER function runs with the caller's own rights, so a caller who
-- redirects it gains nothing they did not already have — they are fooling
-- themselves. The reason to fix it anyway is that the dangerous version of this
-- is one `security definer` away: the day somebody adds that keyword to a
-- trigger guard, the hole opens silently and nothing in review would catch it.
-- Pinning the path now means that day is safe.
--
-- WHY `public` AND NOT `''`
--
-- The stronger form is `set search_path = ''` with every name schema-qualified,
-- and for three of these it would work as-is. The other three — both Exchange
-- guards and the depth guard — read `exchange_category`, `organizations` and
-- `organization_category` unqualified, so an empty path breaks them outright.
--
-- Those three are triggers on live tables. `exchange_org_category_guard` is what
-- enforces the category allowance on every business in the directory, and
-- `exchange_category_depth_guard` is what keeps the taxonomy two levels deep.
-- Rewriting their bodies to qualify every name is a bigger change with a real
-- failure mode, for a threat that needs SECURITY DEFINER to exist at all. So
-- this pins the path and leaves the bodies alone: behaviour identical, caller's
-- path no longer consulted, lint satisfied.
--
-- `pg_catalog` is always searched first whatever this says, so the built-ins
-- these functions lean on — round, acos, radians, regexp_replace,
-- pg_advisory_xact_lock, hashtext — are unaffected.
--
-- If anybody later qualifies those three bodies, change their path to `''` and
-- this file becomes the record of why it was not done that way first.
--
-- APPLIED 2026-10-16, by hand through the management API. `supabase db push` is
-- not safe in this repository — see the note in
-- `20261015120000_exchange_listing_logo.sql` for the version-mismatch reason.
-- Verified afterwards by reading `proconfig` back out of `pg_proc`, and by
-- exercising both Exchange guards against live rows to confirm they still
-- refuse what they are there to refuse.

alter function public.bid_request_distance_miles(numeric, numeric, numeric, numeric)
  set search_path = public;

alter function public.exchange_category_depth_guard()
  set search_path = public;

alter function public.exchange_normalise_phrase(text)
  set search_path = public;

alter function public.exchange_org_category_guard()
  set search_path = public;

alter function public.update_investor_totals()
  set search_path = public;

alter function public.update_opportunity_stats()
  set search_path = public;
