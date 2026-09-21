-- Recovered from the project's applied migration history on 2026-09-20.
--
-- A trigger function has no business being reachable at /rest/v1/rpc/.
-- It is inert if called directly (NEW and OLD are undefined outside a trigger),
-- but a security-definer function on the public API surface should exist for a
-- reason, and this one has none.
revoke execute on function public.sync_bid_amount_from_lines() from anon, authenticated;
