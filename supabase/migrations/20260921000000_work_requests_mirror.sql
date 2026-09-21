-- The work_requests table the server has been writing to since it was written.
--
-- WHY IT DID NOT EXIST
--
-- `persistWorkRequest` upserts into `work_requests` inside a try/catch, and the
-- table was never created. Every one of those writes has failed silently and
-- been swallowed as a "Database mirror skipped" warning, so the KV store has
-- been the only real home for work requests the entire time. Found while
-- deleting a test request: the delete could not clear a table row because there
-- was no table.
--
-- WHAT IT IS AND IS NOT
--
-- It is a mirror. Nothing in the application reads it — all three references in
-- the server are writes — so creating it adds no behaviour to the app. What it
-- adds is a queryable copy: work requests visible in the Supabase dashboard,
-- joinable in SQL, and reachable by reporting that should not have to page
-- through a JSON blob in a key-value table.
--
-- The KV store stays the source of truth. This trails it. If the two ever
-- disagree, KV is right and this is stale, because KV is what every read path
-- in the application actually uses.
--
-- WHY `data` IS HERE AS WELL AS THE COLUMNS
--
-- The columns are the handful of fields worth indexing and filtering on. `data`
-- is the whole record, because a work request carries far more than these —
-- media attachments, project details, internal notes — and a mirror that
-- silently dropped them would be a trap for the first person who queried it and
-- believed what they saw.

create table if not exists public.work_requests (
  id            text primary key,
  client_name   text not null default '',
  client_email  text not null default '',
  client_phone  text not null default '',
  -- Nullable on purpose: anonymous intake leads have no account behind them
  -- yet. Deliberately NOT a foreign key to auth.users — deleting an account
  -- must not delete the record of what they asked for, and a cascade here
  -- would do exactly that.
  user_id       uuid,
  service_type  text,
  title         text,
  description   text,
  status        text not null default 'pending',
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- What a report actually filters on: whose it is, what state it is in, and
-- when it arrived.
create index if not exists work_requests_client_email_idx on public.work_requests (lower(client_email));
create index if not exists work_requests_user_id_idx      on public.work_requests (user_id);
create index if not exists work_requests_status_idx       on public.work_requests (status);
create index if not exists work_requests_created_at_idx   on public.work_requests (created_at desc);

-- ── Row level security ──────────────────────────────────────────────────────
--
-- THIS IS THE PART THAT MATTERS, AND IT IS NOT OPTIONAL.
--
-- This table holds customer names, email addresses, phone numbers, site
-- addresses and the whole record in `data`. A table in `public` with RLS off is
-- readable by anyone holding the anon key, and the anon key is published in the
-- frontend bundle — so creating this without RLS would take work requests that
-- are currently only reachable through an authorising server route and publish
-- them to the internet.
--
-- The edge function writes with the service role, which bypasses RLS entirely,
-- so no insert, update or delete policy is needed and none is granted. Nothing
-- but the server may write here.

alter table public.work_requests enable row level security;

-- A signed-in person may read their own requests and nobody else's. Matched on
-- the account id where there is one, and on the email otherwise, because an
-- anonymous intake that later signs up is matched by the address it was left
-- under. Email compared case-insensitively: addresses are stored lowercased by
-- the server, but a policy that assumes that silently fails open the day
-- something writes one that is not.
create policy work_requests_read_own on public.work_requests
  for select to authenticated
  using (
    (user_id is not null and user_id = auth.uid())
    or (
      client_email <> ''
      and lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- No policy for anon, and none for insert, update or delete by anybody. Absence
-- is the deny: with RLS enabled and no policy, the answer is no.

comment on table public.work_requests is
  'Read-only mirror of the KV work request store. The server writes it with the service role; nothing in the app reads it. KV is the source of truth.';
