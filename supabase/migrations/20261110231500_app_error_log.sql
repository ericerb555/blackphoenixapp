-- Things that broke, as opposed to things the model did.
--
-- WHY THIS EXISTS, IN ONE STORY
--
-- Phoenix's microphone shipped and did not work. The browser recorded a clip,
-- posted it, and the fetch rejected with "Failed to fetch" — nothing else. The
-- cause was one missing name in the CORS allowHeaders list, which means the
-- browser compared two lists, refused to send the request, and no server was
-- ever involved. Three rounds of "it errored" went by, and the only way it was
-- ever found was a person probing the live preflight by hand with curl.
--
-- `ai_call_log` could not have helped: it records model calls, and this failure
-- never reached a model. There was no row anywhere, because nothing in this
-- application writes a row when something fails. So the one question an owner
-- most wants to ask his assistant — "what is broken right now" — had no data
-- behind it at all, and any answer Phoenix gave would have been invention.
--
-- This table is that data. One row per failure, from the browser and from the
-- server, with enough shape to group them and enough detail to find the cause.
--
-- WHAT IS DELIBERATELY NOT STORED
--
-- No request bodies, no response bodies, no headers, no query strings.
--
-- That is where the credentials and the customer data live: an access token in
-- a URL, an address in a POST body, a tenant's name in a validation message.
-- A log that captured them would be more sensitive than the records it was
-- describing, and almost none of its value needs them. `message` is the error
-- text, truncated; `path` is a pathname with the query stripped; `detail` is a
-- status code or an exception name. That is enough to say "every POST to
-- phoenix/transcribe is failing in the browser" and nothing more.
--
-- WHY A FINGERPRINT COLUMN
--
-- Fourteen identical failures are one bug, and a tool that returns them as
-- fourteen rows has spent fourteen times the tokens to say the same thing
-- while burying the other three bugs underneath. The ingest route computes a
-- coarse fingerprint — feature, kind, path and the SHAPE of the message, with
-- ids and numbers replaced — and `app_error_groups` below counts by it. It is
-- computed on the server rather than accepted from the caller so that nothing
-- can scatter one bug across a thousand groups. Grouping is the whole point: the
-- answer to "what is broken" is a list of distinct problems, newest first,
-- with how often each has happened.

create table if not exists public.app_error_log (
  id              uuid        primary key default gen_random_uuid(),
  at              timestamptz not null default now(),

  /**
   * Which side noticed.
   *
   *   client   a browser — a failed fetch, an unhandled exception
   *   server   this edge function — a route that threw
   *
   * Worth separating because the two have completely different causes and
   * completely different fixes. A client-side failure with no matching server
   * row is the CORS-shaped bug above: the request never arrived.
   */
  source          text        not null,

  /**
   * What kind of failure.
   *
   *   fetch        a request to our API failed or returned 5xx/404
   *   unhandled    an exception nobody caught
   *   rejection    a promise rejected with nobody listening
   *   route        a server route threw
   *
   * A closed set, checked below, so a typo cannot create a category that
   * silently never matches a query again.
   */
  kind            text        not null,

  -- The coarse area, for a person reading a list: 'phoenix/transcribe',
  -- 'quotes', 'invoices'. Derived from the path or the module, never free text
  -- typed by a model.
  feature         text,

  -- What groups rows together. See the note above.
  fingerprint     text        not null,

  message         text        not null,
  detail          text,

  -- Pathname only. The query string is stripped before this is written: it is
  -- where tokens and customer identifiers end up.
  path            text,
  status          integer,

  -- Who hit it. Null for anybody not signed in, which is most of the public
  -- site and is itself worth knowing.
  actor_email     text,
  actor_id        uuid,

  -- Which build. The bundle filenames carry a timestamp, so this answers "is
  -- this still happening since the fix shipped" without guesswork — the
  -- question that has cost the most time on this project.
  app_version     text,
  user_agent      text,

  constraint app_error_log_source_known check (source in ('client', 'server')),
  constraint app_error_log_kind_known
    check (kind in ('fetch', 'unhandled', 'rejection', 'route'))
);

comment on table public.app_error_log is
  'One row per failure, from the browser or this server: what broke, where, how often. Holds no request or response bodies, no headers and no query strings — see the header of the migration that created it.';

-- "What is broken now", which is always the first question.
create index if not exists app_error_log_at_idx
  on public.app_error_log (at desc);

-- "How long has THIS been happening", and the grouping below.
create index if not exists app_error_log_fingerprint_idx
  on public.app_error_log (fingerprint, at desc);

-- "Is anything wrong with quotes", asked by feature.
create index if not exists app_error_log_feature_idx
  on public.app_error_log (feature, at desc)
  where feature is not null;

/**
 * Nothing granted, same as `ai_call_log`.
 *
 * The service role writes it; staff read it through a gated route. `anon` and
 * `authenticated` get nothing directly — the set of failing paths is a map of
 * where this platform is weakest, which is exactly what an attacker wants and
 * what a customer has no business seeing.
 *
 * RLS is enabled with no policy, which means no row reaches anybody but the
 * service role. Enabled explicitly rather than left off, because a table with
 * RLS off is one a future `grant` would silently open.
 */
alter table public.app_error_log enable row level security;

/**
 * Distinct problems, newest first, with a count.
 *
 * In SQL rather than in the edge function because the alternative is shipping
 * every row to Deno to group it there — thousands of rows crossing the wire so
 * that twelve can be shown, and the model paying for the ones that were
 * discarded. `security definer` because the table grants nothing; revoked from
 * everybody but the service role at the bottom, same as every other definer
 * function here.
 */
create or replace function public.app_error_groups(
  since_hours integer default 24,
  max_groups  integer default 20
)
returns table (
  fingerprint  text,
  feature      text,
  kind         text,
  source       text,
  occurrences  bigint,
  people       bigint,
  first_seen   timestamptz,
  last_seen    timestamptz,
  example      text,
  example_path text,
  last_status  integer,
  builds       bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    e.fingerprint,
    -- One row per fingerprint, so the descriptive columns have to be picked
    -- rather than grouped by. The most recent occurrence is the useful one:
    -- it is the one still happening.
    (array_agg(e.feature     order by e.at desc))[1] as feature,
    (array_agg(e.kind        order by e.at desc))[1] as kind,
    (array_agg(e.source      order by e.at desc))[1] as source,
    count(*)                                          as occurrences,
    count(distinct coalesce(e.actor_email, 'anonymous')) as people,
    min(e.at)                                         as first_seen,
    max(e.at)                                         as last_seen,
    (array_agg(e.message     order by e.at desc))[1] as example,
    (array_agg(e.path        order by e.at desc))[1] as example_path,
    (array_agg(e.status      order by e.at desc))[1] as last_status,
    count(distinct e.app_version)                     as builds
  from public.app_error_log e
  where e.at >= now() - make_interval(hours => greatest(coalesce(since_hours, 24), 1))
  group by e.fingerprint
  order by max(e.at) desc
  limit greatest(least(coalesce(max_groups, 20), 100), 1);
$$;

revoke all on function public.app_error_groups(integer, integer) from public, anon, authenticated;

/**
 * Keep thirty days, not ninety.
 *
 * A fixed bug stops being interesting quickly, and this table takes the
 * highest row rate of anything here — one bad deploy can write a row per page
 * view. Thirty days still answers "did this start with the last release".
 *
 * Not scheduled here, same reasoning as `prune_ai_call_log`: recurring work
 * belongs in the job registry rather than in a sixth pg_cron schedule.
 */
create or replace function public.prune_app_error_log(keep_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.app_error_log
   where at < now() - make_interval(days => greatest(keep_days, 1));
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_app_error_log(integer) from public, anon, authenticated;
