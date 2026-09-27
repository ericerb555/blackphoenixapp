-- One organisation per contact address, enforced by the database.
--
-- WHY THIS IS NOT ENOUGH IN THE APPLICATION
--
-- `ensureProviderOrg` already looks for an existing organisation by email
-- before inserting. That check is correct and it is not sufficient, because it
-- is a read followed by a write: two approvals arriving together both read,
-- both find nothing, and both insert.
--
-- That is not hypothetical. Approving one vendor produced two organisations
-- 160 milliseconds apart — the approval request was sent twice, and the second
-- insert even survived the slug unique constraint because the retry loop, which
-- exists so two genuinely different firms of the same name can coexist, gave it
-- a suffixed slug.
--
-- Only the database can settle a race, so it settles it here.
--
-- PARTIAL, AND CASE-INSENSITIVE
--
-- Organisations with no email are exempt: those are matched by name instead,
-- and refusing to create a second nameless-contact organisation would block
-- legitimate records. Addresses are compared lower-cased because a person
-- typing their address in capitals is the same company.
CREATE UNIQUE INDEX IF NOT EXISTS organizations_type_email_uniq
  ON organizations (type, lower(email))
  WHERE email IS NOT NULL;
