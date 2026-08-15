-- ============================================================
-- Black Phoenix Builds — `companies`, retroactively tracked
--
-- `companies` existed in production but was never in a migration: it was
-- created out of band, so a fresh environment never had it. That broke branch
-- creation outright, because 001_platform_core declares
-- `organizations.legacy_company_id references companies(id)` — every new branch
-- came up MIGRATIONS_FAILED until the table was stubbed by hand. It happened
-- three times in one session.
--
-- THE FILENAME TIMESTAMP IS LOad-BEARING. Migrations replay in version order,
-- and platform_core is 20260815032102. This is deliberately dated
-- 20260810000000 — after the last kv table (20260809225742) and before
-- platform_core — so a rebuilt environment creates `companies` first and the
-- foreign key resolves. Renaming this file to a later timestamp reintroduces
-- the failure.
--
-- Every statement is idempotent, so this is a no-op against the existing
-- production database. It was executed there to prove exactly that before
-- being recorded in the migration history.
--
-- Shape captured from production 2026-08-15: 41 columns, primary key on `id`
-- (text, not uuid), `user_id` referencing auth.users, one index, RLS enabled
-- with four owner-scoped policies.
-- ============================================================

create table if not exists companies (
  id text not null,
  user_id uuid,
  company_name text,
  company_legal_name text,
  company_tagline text,
  slug text,
  email text,
  phone text,
  fax text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  country text,
  logo_url text,
  logo_primary text,
  logo_secondary text,
  logo_icon text,
  logo_square text,
  logo_horizontal text,
  logo_vertical text,
  logo_white text,
  logo_black text,
  primary_color text,
  secondary_color text,
  accent_color text,
  industry text,
  description text,
  tax_id text,
  tax_label text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_routing_number text,
  license_number text,
  insurance_number text,
  payment_terms text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Postgres has no `add constraint if not exists`, hence the guards.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_pkey'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table companies add constraint companies_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_user_id_fkey'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table companies
      add constraint companies_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_companies_user_id on public.companies using btree (user_id);

alter table companies enable row level security;

-- Owner-scoped policies, matching production. Dropped first so re-running
-- cannot fail on an existing name.
drop policy if exists "Users can view own companies"   on companies;
drop policy if exists "Users can insert own companies" on companies;
drop policy if exists "Users can update own companies" on companies;
drop policy if exists "Users can delete own companies" on companies;

create policy "Users can view own companies"   on companies for select using (auth.uid() = user_id);
create policy "Users can insert own companies" on companies for insert with check (auth.uid() = user_id);
create policy "Users can update own companies" on companies for update using (auth.uid() = user_id);
create policy "Users can delete own companies" on companies for delete using (auth.uid() = user_id);
