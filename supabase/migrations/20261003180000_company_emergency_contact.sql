-- ============================================================================
-- The company's emergency line and support address, where the app can find them
--
-- Eric: *"we need to be able to change this number and it automatically updates
-- app wide when i save it."*
--
-- Prompted by the tenant portal showing "Black Phoenix Emergency Line:
-- (603) 555-0199" — a placeholder, presented to tenants as the number to ring
-- in an emergency.
--
-- WHY THE COLUMNS DID NOT EXIST
--
-- `companies` carries phone, email and website, and that is all. An emergency
-- line is not the office number: it is the one that is answered at two in the
-- morning when a pipe has burst, and a tenant portal has every reason to show
-- it separately. There was nowhere to put it, so it was typed into a
-- component — which is how it came to be a placeholder nobody noticed.
--
-- `support_email` is here for the same reason: the tenant portal shows one, and
-- it was hardcoded to an address on the domain being retired.
--
-- WHAT THIS DOES NOT FIX BY ITSELF
--
-- Adding columns changes nothing on its own. The reason a saved value does not
-- reach the app is that `POST /companies` writes a per-user key in the
-- key-value store, while `GET /public/branding` reads the `companies` table —
-- two unrelated places. Nothing but the logo upload has ever written this
-- table's contact fields. That is fixed alongside this, in the server.
-- ============================================================================

alter table companies
  add column if not exists emergency_phone text,
  add column if not exists support_email   text;

comment on column companies.emergency_phone is
  'The number answered out of hours. Shown to tenants and customers as the emergency contact; never a placeholder.';
comment on column companies.support_email is
  'The address people write to for help. Shown in portals.';
