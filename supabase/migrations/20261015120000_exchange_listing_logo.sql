-- Phoenix Exchange: a logo, which can only arrive by claiming.
--
-- WHY A LOGO IS THE ONE PIECE OF BRANDING A COMPILED LISTING MAY CARRY
--
-- exchangeIngest.ts states the rule the whole directory rests on: a compiled
-- listing carries the business's name, type, address, phone and website, and
-- not one field more. No description, no hours, no photographs -- none of it
-- can be trusted before an owner stands behind it.
--
-- A logo is exactly that kind of field, so it cannot be scraped, bought in, or
-- guessed from a website's favicon. It can only come from somebody who proved
-- they control the business, which is what the claim flow already decides. That
-- is why these columns live beside claim_state rather than in an import table:
-- the claim is the authorisation, and the two are read together or not at all.
--
-- A PATH, NEVER A URL
--
-- logo_path is an object path inside the public images bucket, not an address
-- on somebody else's server. A stored logo_url would let an owner swap the
-- approved image for anything at all afterwards, and would leak every viewer's
-- IP to a third party on every page view. We store the bytes.
--
-- THE STATE IS SEPARATE FROM THE PATH, BECAUSE A REJECTED LOGO MUST STILL EXIST
--
-- Staff rejecting a logo need to be able to say why, and the owner needs to see
-- which image was refused. Deleting the row's path on rejection would make the
-- conversation impossible. So logo_state decides what the public sees and
-- logo_path merely records what was uploaded.
--
-- 1,108 listings, 18 claimed. This column will be null for almost every row
-- for a long time, which is the point: it is what makes a claimed listing look
-- different from the 1,090 that are not.

-- APPLIED 2026-10-15. AND NOT WITH `db push` -- READ THIS BEFORE THE NEXT ONE.
--
-- `supabase db push` is NOT safe in this repository, and that is worth knowing
-- before somebody reaches for it. The remote migration history records 44
-- migrations whose VERSION NUMBERS do not match the filenames here: they were
-- applied through the management API, which stamps its own version at apply
-- time. Only three of the forty-three local files line up.
--
--   exchange_follow_and_deals   local 20261013160000   remote 20261013151118
--   exchange_retail_section     local 20261012120000   remote 20261012191642
--
-- So `db push` sees about forty local migrations as unapplied and offers to
-- run them all again -- taxonomy seeds and backfills included. This one was
-- therefore applied on its own, the same way the rest of the history was
-- written, and verified by reading the columns back out of
-- information_schema afterwards.
--
-- There is no CI here and `deploy.md` documents one command,
-- `supabase functions deploy`, which applies no migrations at all. Nothing
-- applies a migration on its own; a person does, deliberately, one at a time.
--
-- THE SERVING CODE STILL DOES NOT DEPEND ON IT
--
-- `exchangeDirectory.tsx` asks for these columns and falls back to asking
-- without them if the database has never heard of them, which is what kept the
-- directory up during the gap between the frontend shipping and this running.
-- That stays: it costs one query per cold start in a state that no longer
-- happens, and it is what makes the two deploys independent.
--
-- WHAT IT DOES, SO THE DECISION IS AN INFORMED ONE
--
-- Entirely additive. Six nullable columns and one enum type; no existing column
-- is altered and no row is rewritten. `logo_state` is NOT NULL with a default,
-- which Postgres records as metadata rather than rewriting the table. The check
-- constraint validates against existing rows, and every existing row will read
-- `none`, so it cannot fail on arrival. The index is partial on a condition no
-- row yet meets.
--
-- WHAT IT DOES ON THE FIRST DAY: NOTHING VISIBLE
--
-- Every one of the 1,108 listings gets `logo_state = none`, which renders
-- exactly as today. The first change a resident could notice needs a business
-- to claim a listing, upload an image, and a member of staff to approve it.

do $$ begin
  create type public.exchange_logo_state as enum
    ('none','submitted','approved','rejected');
exception when duplicate_object then null; end $$;

alter table public.organizations
  add column if not exists logo_path          text,
  add column if not exists logo_state         public.exchange_logo_state not null default 'none',
  add column if not exists logo_submitted_at  timestamptz,
  add column if not exists logo_decided_at    timestamptz,
  add column if not exists logo_decided_by    text,
  add column if not exists logo_reject_reason text;

-- A state that claims to be anything but 'none' has to have an image behind it.
-- Without this a bug that wrote the state and lost the path would publish an
-- approved logo that does not exist, which renders as a broken image on a
-- business's own listing -- worse than no logo at all.
do $$ begin
  alter table public.organizations
    add constraint organizations_logo_path_present
    check (logo_state = 'none' or logo_path is not null);
exception when duplicate_object then null; end $$;

-- The review queue, which is the only query that reads this column across all
-- 1,108 rows. Partial, because everything else reads one listing by id and
-- almost every row is 'none' forever.
create index if not exists organizations_logo_pending_idx
  on public.organizations (logo_submitted_at)
  where logo_state = 'submitted';

comment on column public.organizations.logo_path is
  'Object path in the public images bucket. Never a remote URL: an owner must not be able to swap an approved image, and a viewer''s IP must not reach a third party. Only ever written for a listing whose claim was granted.';
comment on column public.organizations.logo_state is
  'Whether the public sees it. A business can reach submitted and nothing else -- approved is only ever written behind a staff check, the same rule exchange_deal follows.';
