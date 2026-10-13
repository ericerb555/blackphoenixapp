-- A resident's saved businesses: the Exchange customer account, Phase 2.
--
-- Applied to production on 2026-10-13. Kept here so the schema has one history
-- a person can read, rather than living only in the remote migration table.
--
-- WHY A TABLE OF ITS OWN RATHER THAN A FLAG ON THE LEAD LEDGER
--
-- `exchange_lead_event` records what somebody DID -- revealed a number, rang,
-- asked for a quote. Saving is not an action towards a business, it is a note
-- to self, and conflating the two would put a bookmark into the ledger a
-- business is counted from. A business must never be able to tell that
-- somebody is interested but has not got in touch.
--
-- THE PRIVACY RULE THIS MUST NOT WEAKEN
--
-- A business may be told HOW MANY people wanted them. Never WHO. The index on
-- org_id exists for exactly that aggregate and nothing else; no route returns
-- a user_id beside it.

create table if not exists public.exchange_saved_business (
  user_id  uuid not null references auth.users(id) on delete cascade,
  org_id   uuid not null references public.organizations(id) on delete cascade,
  saved_at timestamptz not null default now(),
  -- Composite key, so saving twice is idempotent rather than an error or a
  -- duplicate. The screen can send "save" without first asking whether it is
  -- already saved.
  primary key (user_id, org_id)
);

-- For "how many people saved this business", the only aggregate a business is
-- ever shown from this table.
create index if not exists exchange_saved_business_org_idx
  on public.exchange_saved_business (org_id);

-- Row level security, even though every route reaches this through the server
-- with the service role. Defence in depth: if a future screen ever queries the
-- table directly with the user's own token, it must not be able to read
-- anybody else's shelf. Verified in a rolled-back transaction before this was
-- applied -- a second signed-in user could see zero rows, including the
-- first user's.
alter table public.exchange_saved_business enable row level security;

create policy "read only your own saved businesses"
  on public.exchange_saved_business for select
  using (auth.uid() = user_id);

create policy "save only for yourself"
  on public.exchange_saved_business for insert
  with check (auth.uid() = user_id);

create policy "remove only your own"
  on public.exchange_saved_business for delete
  using (auth.uid() = user_id);

-- Deliberately no UPDATE policy: a saved business has nothing to change. It is
-- saved or it is not.

comment on table public.exchange_saved_business is
  'A resident''s own shelf of Exchange businesses. Private to them; a business may be told how many people saved it, never who.';
