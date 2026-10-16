-- A slow query log, and the history that makes it readable.
--
-- WHY A SNAPSHOT TABLE AND NOT JUST pg_stat_statements
--
-- `pg_stat_statements` already counts everything, but its numbers are totals
-- since the last reset — which here is 2026-07-17. Asked "what is slow", it
-- answers with three months of history in one number, and the loudest entry
-- turned out to be an index incident that was fixed in September: 787 calls to
-- `ALTER TABLE … ENABLE ROW LEVEL SECURITY` at 3.2 seconds each, long since
-- resolved, still dominating the average and making a current reading
-- impossible.
--
-- A total that cannot be reset without destroying the history, and cannot be
-- read without the history distorting it, is not a monitor. So this samples it
-- every fifteen minutes and keeps the samples. Subtracting two samples gives
-- what actually happened between them, which is the question anybody asking
-- about a slow query means.
--
-- WHY IT SAMPLES RATHER THAN LOGS EVERY STATEMENT
--
-- Postgres can log each slow statement individually with
-- `log_min_duration_statement`, and that is the other shape this could take.
-- It answers "show me the exact statement that took 4 seconds at 09:41", which
-- is better for one incident; it does not answer "which query is costing the
-- most overall", because reading it means parsing a log. The three things
-- asked for here — which queries crossed the threshold, how often they run and
-- what they consume — are all aggregate questions, and this is the aggregate
-- source. The two are complementary rather than alternatives.
--
-- WHAT A ROW COSTS
--
-- Fifty rows every fifteen minutes is 4,800 a day, pruned at thirty days, so
-- the table settles around 144,000 rows of roughly 300 bytes. That is small
-- enough not to need thinking about and long enough to answer "was this slow
-- last week too".

create table if not exists public.query_perf_snapshot (
  captured_at       timestamptz      not null default now(),
  queryid           bigint           not null,
  -- Truncated: some statements here are thousands of characters, and the
  -- opening of one is enough to recognise it.
  query             text             not null,
  calls             bigint           not null,
  total_exec_ms     double precision not null,
  mean_exec_ms      double precision not null,
  max_exec_ms       double precision not null,
  rows_returned     bigint           not null,
  -- The resource question. `hit` came from memory and `read` came from disk;
  -- a query with a large read count is the one making the database work.
  shared_blks_hit   bigint           not null,
  shared_blks_read  bigint           not null,
  -- Write volume, so an expensive INSERT is not invisible beside a slow SELECT.
  wal_bytes         numeric          not null,
  primary key (captured_at, queryid)
);

comment on table public.query_perf_snapshot is
  'Fifteen-minute samples of pg_stat_statements. Two samples subtracted give what happened between them; the totals in pg_stat_statements itself cannot be read that way because they run from the last reset.';

create index if not exists query_perf_snapshot_time_idx
  on public.query_perf_snapshot (captured_at desc);

-- Nothing is granted. Same treatment as the ledgers: the service role reads it
-- through a route that checks for staff, and anon and authenticated get
-- nothing from it directly. Query text can contain table and column names that
-- describe the shape of the whole system, which is not a thing to publish.
alter table public.query_perf_snapshot enable row level security;

/**
 * Take one sample.
 *
 * SECURITY DEFINER because `pg_stat_statements` is owned by the extension and
 * the cron job's role cannot read it otherwise. The function body is fixed —
 * it takes no arguments and interpolates nothing — so there is no injection
 * surface to go with the elevated right.
 */
create or replace function public.capture_query_perf()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  taken integer;
begin
  insert into public.query_perf_snapshot (
    queryid, query, calls, total_exec_ms, mean_exec_ms, max_exec_ms,
    rows_returned, shared_blks_hit, shared_blks_read, wal_bytes
  )
  select
    s.queryid,
    left(regexp_replace(s.query, '\s+', ' ', 'g'), 2000),
    s.calls,
    s.total_exec_time,
    s.mean_exec_time,
    s.max_exec_time,
    s.rows,
    s.shared_blks_hit,
    s.shared_blks_read,
    s.wal_bytes
  from extensions.pg_stat_statements s
  where s.queryid is not null
    and s.calls > 0
    -- The reader itself, and the statements that read it, are noise.
    and s.query not ilike '%pg_stat_statements%'
    and s.query not ilike '%query_perf_snapshot%'
  order by s.total_exec_time desc
  limit 50
  on conflict (captured_at, queryid) do nothing;

  get diagnostics taken = row_count;

  -- Thirty days is long enough to answer "was it slow last week", and short
  -- enough that nobody has to think about the size of this table.
  delete from public.query_perf_snapshot
  where captured_at < now() - interval '30 days';

  return taken;
end;
$$;

revoke all on function public.capture_query_perf() from public, anon, authenticated;

-- Every fifteen minutes. Frequent enough that a slow query appearing at
-- lunchtime is visible by the afternoon, rare enough to be free.
select cron.schedule(
  'query-perf-snapshot',
  '*/15 * * * *',
  $$ select public.capture_query_perf(); $$
);
