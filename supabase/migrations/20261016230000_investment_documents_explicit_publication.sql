-- An investment document becomes public because somebody said so, not because
-- a column was left blank.
--
-- M-1 in tasks/security-audit-2026-10-16.md. The policy read:
--
--   using ((commitment_id is null) or (commitment_id in (
--     select c.id from investor_commitments c
--     where c.investor_email = auth.jwt() ->> 'email')))
--
-- The second clause is right: your commitment, your documents. The first is the
-- problem. `commitment_id is null` means "not tied to one commitment", which is
-- how an opportunity-level document is stored — a private placement memorandum,
-- a subscription agreement, an operating agreement. The policy grants those to
-- EVERY `authenticated` caller, which is every customer, tenant, vendor and
-- subcontractor on the platform, none of whom are investors.
--
-- Nothing is exposed today: the table holds zero rows. That is the entire reason
-- this is a migration and not an incident. The first offering document filed
-- against an opportunity rather than a commitment publishes itself, silently,
-- to everyone with a login — and offering documents are exactly the category an
-- acquirer's counsel opens first.
--
-- WHY A COLUMN RATHER THAN A TIGHTER NULL TEST
--
-- The failure here is a missing value being read as permission. Any fix that
-- keeps inferring visibility from whether a field was filled in has the same
-- shape and will fail the same way the next time somebody inserts a row without
-- thinking about access. `is_public` defaults to FALSE, so a document is
-- private unless a human sets it otherwise, and "make this visible to everyone"
-- becomes a deliberate act that shows up in a diff.
--
-- WHAT THE NEW POLICY GRANTS
--
--   1. is_public                     — explicitly published, to anyone signed in
--   2. your own commitment's docs    — unchanged, this part was always correct
--   3. docs on an opportunity you
--      have actually committed to    — the real intent of the null branch
--
-- Clause 3 is what the old first clause was reaching for and missing. An
-- investor should see the PPM for a deal they are in. They should not see it
-- for a deal they are not in, and a tenant should not see it at all.
--
-- WHY `nullif(..., '')` ON THE EMAIL
--
-- Supabase anonymous sign-ins issue a token with `email` set to the empty
-- string, and anonymous sign-ins are ENABLED on this project (H-1 in the same
-- audit). Without the nullif, an anonymous stranger matches any commitment row
-- whose `investor_email` is blank. There are no such rows now; the guard costs
-- nothing and removes the dependency on that staying true.
--
-- Service-role access is untouched, so the server reads this table exactly as
-- it does today.

alter table public.investment_documents
  add column if not exists is_public boolean not null default false;

comment on column public.investment_documents.is_public is
  'Visible to every signed-in user. Defaults false; set deliberately. See migration 20261016230000.';

drop policy if exists "Users can view documents for their commitments" on public.investment_documents;

create policy "investment_document_read"
  on public.investment_documents
  for select
  to authenticated
  using (
    is_public
    or (
      commitment_id is not null
      and commitment_id in (
        select c.id from public.investor_commitments c
        where lower(c.investor_email) = lower(nullif(auth.jwt() ->> 'email', ''))
      )
    )
    or (
      opportunity_id is not null
      and opportunity_id in (
        select c.opportunity_id from public.investor_commitments c
        where lower(c.investor_email) = lower(nullif(auth.jwt() ->> 'email', ''))
      )
    )
  );
