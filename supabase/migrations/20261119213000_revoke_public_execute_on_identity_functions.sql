-- D-3 — take nine SECURITY DEFINER functions off the anonymous surface.
--
-- APPLIED 2026-11-19 through the management API, and it took two goes. The
-- first revoked EXECUTE from `anon` and changed nothing observable:
-- has_function_privilege('anon', …) stayed true on all nine. Postgres grants
-- EXECUTE on a new function to PUBLIC by default and `anon` was inheriting it
-- there, so a role-specific revoke had nothing of its own to remove. The ACL
-- said so plainly — the leading empty grantee IS public:
--
--     {=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
-- Worth recording because the migration reported success. A successful apply
-- that changes no privilege is the same shape as every other finding in this
-- audit, and reading the grants back is the only thing that caught it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS FOUND
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Nine functions were callable by anyone holding the publishable key, through
-- /rest/v1/rpc/<name>: is_platform_operator() and the my_*_ids() family.
--
-- Not a hole. Every one derives from auth.uid(), which is null for an
-- anonymous caller, and is_platform_operator() was measured answering `false`
-- to an anonymous call during the audit. Unnecessary surface, not exposure —
-- which is why this is P3 and why it is still worth closing.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY ONLY PUBLIC, AND WHY THAT IS THE SAFE HALF
-- ─────────────────────────────────────────────────────────────────────────────
--
-- These functions are the engine of the Phoenix Exchange's row-level security:
-- 27 policies across 9 tables evaluate `org_id in (select my_org_ids())` and
-- its siblings. A policy body runs as the QUERYING role, so revoking EXECUTE
-- from a role a policy applies to makes that policy ERROR rather than return
-- no rows — it would have taken the Exchange down.
--
-- Checked before writing this: all 27 of those policies are scoped to
-- `{authenticated}`, not one to `anon`. And `authenticated` and `service_role`
-- hold EXPLICIT grants in the ACL above, so revoking PUBLIC leaves them
-- untouched while `anon`, which has no grant of its own, loses access.
--
-- Verified after applying, both directions:
--   anon  → 401 {"code":"42501","message":"permission denied for function …"}
--           (it answered 200 with `false` before)
--   authenticated → `set local role authenticated` then counting
--           organizations, bids and bid_requests returns 0 rows rather than a
--           permission error, which is the proof the policies still evaluate.

revoke execute on function public.is_platform_operator() from public;
revoke execute on function public.my_org_ids() from public;
revoke execute on function public.my_admin_org_ids() from public;
revoke execute on function public.my_visible_bid_ids() from public;
revoke execute on function public.my_editable_bid_ids() from public;
revoke execute on function public.my_open_bid_request_ids() from public;
revoke execute on function public.my_owned_bid_request_ids() from public;
revoke execute on function public.my_invited_bid_request_ids() from public;
revoke execute on function public.my_admin_owned_bid_request_ids() from public;

-- Belt and braces: `anon` holds no grant of its own today, and if one is ever
-- added by hand this keeps the intent explicit rather than relying on the
-- absence.
revoke execute on function public.is_platform_operator() from anon;
revoke execute on function public.my_org_ids() from anon;
revoke execute on function public.my_admin_org_ids() from anon;
revoke execute on function public.my_visible_bid_ids() from anon;
revoke execute on function public.my_editable_bid_ids() from anon;
revoke execute on function public.my_open_bid_request_ids() from anon;
revoke execute on function public.my_owned_bid_request_ids() from anon;
revoke execute on function public.my_invited_bid_request_ids() from anon;
revoke execute on function public.my_admin_owned_bid_request_ids() from anon;
