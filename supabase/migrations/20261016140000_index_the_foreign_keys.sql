-- Index the foreign keys our queries and our cascades actually use.
--
-- WHY THESE AND NOT THE OTHER FIFTY COLUMNS WE FILTER ON
--
-- Every `.eq()`, `.in()`, `.gte()` and `.order()` in the server was extracted
-- and compared against the indexes that exist: 73 table/column pairs across 24
-- tables. Most were already covered, and most of what was left should NOT be
-- indexed, because an index is only read when it is more selective than a scan:
--
--   exchange_category.status      180 rows, nearly all 'active'
--   exchange_territory.status     3 rows
--   exchange_section.sort_order   5 rows
--   organizations.logo_state      1,108 rows, all 'none'
--
-- Postgres would build those, ignore them, and charge every write for the
-- privilege. Measured first: the front-door map query — three tables joined,
-- 787 rows out — runs in 1.9 ms on sequential scans, because at 1,100 rows a
-- scan is 28 cached pages and the filters keep 82% and 98% of their tables. An
-- index is not used to return most of a table.
--
-- WHAT IS DIFFERENT ABOUT A FOREIGN KEY
--
-- Its cost does not depend on how selective it is. When a parent row is
-- deleted, Postgres checks every child table for referencing rows, and without
-- an index that check is a sequential scan per table per deleted row. Deleting
-- one `auth.users` row touches eleven of these. That is the case these earn,
-- and it is why Supabase's own linter reports them separately from everything
-- else.
--
-- They are also the ones that stay right as the tables grow, because a foreign
-- key is selective by construction — a given parent owns few children — which
-- is exactly the property the status columns above lack.
--
-- MEASURED, BEFORE AND AFTER
--
-- Honestly: at today's row counts this changes nothing you can see. The lookup
-- these replace is a scan of 28 rows taking 3 ms. They are added because they
-- are correct as the tables grow, not because anything is slow now, and the
-- numbers are in the commit that carries this file so nobody has to guess
-- later.

-- ── the Exchange ledgers, which grow fastest ────────────────────────────────
create index if not exists exchange_demand_event_category_idx
  on public.exchange_demand_event (category_id);
create index if not exists exchange_demand_event_actor_idx
  on public.exchange_demand_event (actor_user_id);
create index if not exists exchange_demand_event_section_idx
  on public.exchange_demand_event (section_slug);
create index if not exists exchange_lead_event_actor_idx
  on public.exchange_lead_event (actor_user_id);
create index if not exists exchange_lead_event_category_idx
  on public.exchange_lead_event (category_id);

-- ── who decided what, on the claim and deal queues ──────────────────────────
create index if not exists exchange_claim_decided_by_idx
  on public.exchange_claim (decided_by);
create index if not exists exchange_deal_created_by_idx
  on public.exchange_deal (created_by);
create index if not exists exchange_deal_decided_by_idx
  on public.exchange_deal (decided_by);

-- ── membership and entitlement ──────────────────────────────────────────────
create index if not exists organization_members_invited_by_idx
  on public.organization_members (invited_by);
create index if not exists feature_grants_granted_by_idx
  on public.feature_grants (granted_by);
create index if not exists organizations_legacy_company_idx
  on public.organizations (legacy_company_id);

-- ── the bid room ────────────────────────────────────────────────────────────
create index if not exists bid_invitations_invited_by_idx
  on public.bid_invitations (invited_by);
create index if not exists bid_request_media_uploaded_by_idx
  on public.bid_request_media (uploaded_by);
create index if not exists bid_requests_awarded_bid_idx
  on public.bid_requests (awarded_bid_id);
create index if not exists bid_requests_created_by_idx
  on public.bid_requests (created_by);
create index if not exists bid_requests_first_refusal_idx
  on public.bid_requests (first_refusal_org_id);
create index if not exists bids_submitted_by_idx
  on public.bids (submitted_by);
create index if not exists payout_distributions_opportunity_idx
  on public.payout_distributions (opportunity_id);
