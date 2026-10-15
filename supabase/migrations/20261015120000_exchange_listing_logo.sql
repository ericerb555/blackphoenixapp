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
