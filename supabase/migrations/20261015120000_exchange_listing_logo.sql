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

-- NOBODY APPLIES THIS FOR YOU, SO HERE IS WHAT TO RUN
--
-- There is no CI in this repository and `deploy.md` documents exactly one
-- command, `supabase functions deploy make-server-3eae23a6`, which applies no
-- migrations at all. So this file does nothing until somebody runs it:
--
--   supabase db push --project-ref plzsvzwwcdopnawtiwzm
--
-- It is not named `.sql.pending` because it is not being held back — the
-- on-call, autopilot and store-clock migrations carry that suffix because
-- arming them starts something running, and this starts nothing.
--
-- THE SERVING CODE DOES NOT DEPEND ON IT, DELIBERATELY
--
-- Since the two steps are separate and manual, either can happen first and the
-- gap between them can be long. `exchangeDirectory.tsx` therefore asks for
-- these columns and falls back to asking without them if the database has never
-- heard of them — `looksLikeMissingLogoColumn` in `exchangeLogo.ts`, which has
-- tests. The reason is proportion: a logo not appearing is a disappointment,
-- while a hard dependency would have made a missing migration into a 500 on
-- every listing in the directory.
--
-- Until this runs, then: everything works as it does today and no logo can be
-- uploaded, because `/exchange/business/logo` is the one place that does need
-- the columns and says so.
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
