-- ============================================================
-- Black Phoenix Builds — bid room write rules
--
-- 003 made the bid room readable. Without write policies every insert has to
-- go through an edge function on the service role, which bypasses RLS — so the
-- rules ("only an invited provider may bid", "only while the request is open")
-- would live in TypeScript again. That is the exact failure mode BACKEND-PLAN
-- names about the kv tables: RLS enabled, no policies, every decision
-- remembered in application code.
--
-- With these policies the frontend can write directly through supabase-js with
-- the user's own session and the database enforces the rules. An edge function
-- may still front these operations, but it is no longer the only thing
-- standing between a provider and someone else's bid.
--
-- Requires 003_bid_room.sql.
-- ============================================================


-- ------------------------------------------------------------
-- 1. HELPER — requests I may currently bid on.
--
-- Security definer for the same reason as the others: it reads bid_requests
-- and bid_invitations, and inlining it into a policy on `bids` would drag both
-- tables' policies into the check.
--
-- Encodes the whole "may I bid" question in one place: I am invited, the
-- request is open (not draft, closed, awarded or cancelled), and the deadline
-- has not passed.
-- ------------------------------------------------------------

create or replace function my_open_bid_request_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select i.bid_request_id
  from bid_invitations i
  join bid_requests r on r.id = i.bid_request_id
  where r.status = 'open'
    and (r.due_at is null or r.due_at > now())
    and i.org_id in (
      select m.org_id from organization_members m
      where m.user_id = auth.uid() and m.status = 'active'
    );
$$;


-- ------------------------------------------------------------
-- 2. BID REQUESTS — only an owner/admin of the posting org.
--
-- Deliberately my_admin_org_ids() rather than my_org_ids(): a `viewer` or
-- ordinary `member` of the operator org should not be able to put work out to
-- bid or award a contract.
-- ------------------------------------------------------------

create policy bid_request_insert on bid_requests
  for insert to authenticated
  with check (org_id in (select my_admin_org_ids()));

create policy bid_request_update on bid_requests
  for update to authenticated
  using (org_id in (select my_admin_org_ids()))
  with check (org_id in (select my_admin_org_ids()));


-- ------------------------------------------------------------
-- 3. INVITATIONS — only whoever posted the request may invite.
--
-- Separate INSERT/DELETE policies rather than FOR ALL: FOR ALL would also
-- apply to SELECT and widen the read rule from 003, which is what keeps a
-- provider from seeing the competitor list.
-- ------------------------------------------------------------

create policy bid_invitation_insert on bid_invitations
  for insert to authenticated
  with check (bid_request_id in (select my_owned_bid_request_ids()));

create policy bid_invitation_delete on bid_invitations
  for delete to authenticated
  using (bid_request_id in (select my_owned_bid_request_ids()));


-- ------------------------------------------------------------
-- 4. BIDS — the important ones.
--
-- A provider may submit a bid only:
--   * for an org they actively belong to  (no bidding as someone else)
--   * on a request they were invited to   (no bidding on unseen work)
--   * while that request is open and the deadline has not passed
--
-- The unique (bid_request_id, org_id) constraint from 003 stops a second bid;
-- revisions are updates, allowed on the same terms.
--
-- There is no delete policy on purpose. A submitted bid is a commercial record;
-- withdrawing sets status = 'withdrawn' and leaves the history intact.
-- ------------------------------------------------------------

create policy bid_insert on bids
  for insert to authenticated
  with check (
    org_id in (select my_org_ids())
    and bid_request_id in (select my_open_bid_request_ids())
  );

-- USING picks which existing rows may be touched; WITH CHECK constrains the
-- result. Both name the org so a provider cannot reassign their bid to another
-- org on the way through.
create policy bid_update on bids
  for update to authenticated
  using (
    org_id in (select my_org_ids())
    and bid_request_id in (select my_open_bid_request_ids())
  )
  with check (
    org_id in (select my_org_ids())
    and bid_request_id in (select my_open_bid_request_ids())
  );

-- The org that posted the request also needs to write bids — marking won/lost
-- when awarding. Scoped to requests they own, so it cannot touch bids
-- elsewhere.
create policy bid_owner_update on bids
  for update to authenticated
  using (bid_request_id in (select my_owned_bid_request_ids()))
  with check (bid_request_id in (select my_owned_bid_request_ids()));
