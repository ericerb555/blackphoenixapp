/**
 * The slow query log.
 *
 * Staff only, and deliberately NOT in App's public route list. The route
 * behind it refuses a non-staff caller server-side, so this screen explains
 * rather than protects.
 *
 * WHAT IT ANSWERS, IN THE ORDER THE COLUMNS ASK IT
 *
 *   which queries crossed the threshold   the list itself, worst first
 *   how often they run                    calls
 *   what each one costs                   mean, worst, and total time
 *   how much work the database did        rows, blocks read from disk, WAL
 *
 * SORTED BY TOTAL TIME, NOT BY HOW SLOW ONE RUN IS
 *
 * A query taking 400 ms once a day is a curiosity. One taking 90 ms forty
 * thousand times is an hour of database time and the thing actually worth
 * fixing, and it would sit far below the curiosity on any list ordered by
 * mean. Total is what a database spends.
 *
 * CACHE HIT IS THE COLUMN THAT SAYS WHY
 *
 * A slow query with 100% cache hit is doing too much work in memory — usually
 * returning or sorting more rows than it needs. One with a low percentage is
 * going to disk, which is where an index or a narrower select changes the
 * answer. The two have different fixes, so the number is on the screen rather
 * than left to be guessed.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, Gauge, RefreshCw, Database, Clock,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface SlowQuery {
  id: string;
  query: string;
  calls: number;
  meanMs: number;
  maxMs: number;
  totalMs: number;
  rows: number;
  blocksFromDisk: number;
  cacheHitPct: number | null;
  basis: string;
  walBytes: number;
}

const THRESHOLDS = [10, 50, 100, 250, 1000];
const WINDOWS = [1, 24, 168];

const ms = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;

const count = (value: number) =>
  value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000 ? `${(value / 1_000).toFixed(1)}k`
      : String(value);

const bytes = (value: number) =>
  value >= 1_073_741_824 ? `${(value / 1_073_741_824).toFixed(1)} GB`
    : value >= 1_048_576 ? `${(value / 1_048_576).toFixed(1)} MB`
      : value >= 1024 ? `${(value / 1024).toFixed(0)} kB`
        : `${value} B`;

const when = (value: string | null) => {
  if (!value) return 'never';
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return 'unknown';
  return new Date(at).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

export default function SlowQueries() {
  const [queries, setQueries] = useState<SlowQuery[]>([]);
  const [thresholdMs, setThresholdMs] = useState(100);
  const [windowHours, setWindowHours] = useState(24);
  const [since, setSince] = useState<string | null>(null);
  const [lastSample, setLastSample] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sampling, setSampling] = useState(false);
  const [refused, setRefused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRefused(false);
    try {
      const token = await auth();
      if (!token) { setRefused(true); return; }

      const res = await fetch(
        `${SERVER}/admin/slow-queries?ms=${thresholdMs}&hours=${windowHours}`,
        { headers: { Authorization: token } },
      );
      // 403 is the gate doing its job, not a failure to apologise for.
      if (res.status === 403) { setRefused(true); return; }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setError(body?.error || 'We could not read the query log.');
        return;
      }
      setQueries(Array.isArray(body.queries) ? body.queries : []);
      setSince(body.collectingSince ?? null);
      setLastSample(body.lastSampleAt ?? null);
    } catch {
      setError('We could not reach the server just now.');
    } finally {
      setLoading(false);
    }
  }, [auth, thresholdMs, windowHours]);

  useEffect(() => { void load(); }, [load]);

  /** A second data point now, rather than waiting for the quarter hour. */
  const sampleNow = useCallback(async () => {
    setSampling(true);
    try {
      const token = await auth();
      if (!token) return;
      await fetch(`${SERVER}/admin/slow-queries/sample`, {
        method: 'POST', headers: { Authorization: token },
      });
      await load();
    } catch {
      /* The reload below reports anything that matters. */
    } finally {
      setSampling(false);
    }
  }, [auth, load]);

  const lifetimeOnly = queries.length > 0 && queries.every((q) => q.basis === 'lifetime');

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>
      <style>{BROWSE_CSS}</style>

      <div className="bpx-shell">
        <a className="bpxb-crumb" href="/"><ChevronLeft size={14} /> Back</a>

        <div className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><Gauge size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Slow queries</div>
                <div className="bpxb-section-tag">
                  sampled every 15 minutes · last {when(lastSample)}
                </div>
              </div>
            </div>
            <button className="bpx-btn" onClick={() => void sampleNow()} disabled={sampling}>
              {sampling ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Sample now
            </button>
          </div>
        </div>

        <div className="bpx-row">
          <span className="bpxb-note">Slower than</span>
          {THRESHOLDS.map((value) => (
            <button
              key={value}
              className="bpx-chip"
              data-on={thresholdMs === value}
              onClick={() => setThresholdMs(value)}
            >
              {value} ms
            </button>
          ))}
        </div>

        <div className="bpx-row">
          <span className="bpxb-note">Over the last</span>
          {WINDOWS.map((value) => (
            <button
              key={value}
              className="bpx-chip"
              data-on={windowHours === value}
              onClick={() => setWindowHours(value)}
            >
              {value === 1 ? 'hour' : value === 24 ? 'day' : 'week'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bpx-empty">
            <Loader2 size={24} className="animate-spin" color="#9ca3af" />
            <div className="bpx-desc">Reading…</div>
          </div>
        )}

        {!loading && refused && (
          <div className="bpx-empty">
            <Database size={26} color="#9ca3af" />
            <div className="bpx-card-title">Company access is required</div>
            <div className="bpx-desc" style={{ maxWidth: 460 }}>
              The query text here names tables and columns across the whole
              system, so this is kept to staff.
            </div>
          </div>
        )}

        {!loading && !refused && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <button className="bpx-btn" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {/*
          The difference between "nothing is slow" and "not enough samples yet"
          is the whole credibility of this screen, so it is stated rather than
          left to look the same.
        */}
        {!loading && !refused && !error && lifetimeOnly && (
          <div className="bpxb-note">
            Only one sample so far, so these are totals since the database
            statistics were last reset — not what happened in the window above.
            A second sample makes the figures mean what the window says. Press
            <strong> Sample now</strong>, or wait for the quarter hour.
          </div>
        )}

        {!loading && !refused && !error && queries.length === 0 && (
          <div className="bpx-empty">
            <Clock size={26} color="#9ca3af" />
            <div className="bpx-card-title">Nothing over {thresholdMs} ms</div>
            <div className="bpx-desc" style={{ maxWidth: 460 }}>
              {since
                ? `Collecting since ${when(since)}. Nothing has averaged more than ${thresholdMs} ms in this window.`
                : 'No samples have been taken yet. The first lands within fifteen minutes.'}
            </div>
          </div>
        )}

        {!loading && !refused && !error && queries.length > 0 && (
          <>
            <div className="bpxb-note">
              {queries.length} {queries.length === 1 ? 'query' : 'queries'} averaging
              over {thresholdMs} ms, worst total first — because a query taking
              90 ms forty thousand times costs more than one taking a second
              once a day.
            </div>

            <div className="bpx-list">
              {queries.map((q) => (
                <div key={q.id} className="bpx-card">
                  <div className="bpx-card-body bpxb-biz">
                    <div className="bpxb-biz-top">
                      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                        <code className="bpxq-sql">{q.query}</code>
                      </div>
                      <div className="bpx-tags">
                        <span className="bpx-pill bpxb-pill-claimed">{ms(q.totalMs)} total</span>
                        {q.basis === 'lifetime' && (
                          <span className="bpx-pill bpxb-pill-listed">lifetime</span>
                        )}
                      </div>
                    </div>

                    <div className="bpxq-stats">
                      <span><b>{count(q.calls)}</b> calls</span>
                      <span><b>{ms(q.meanMs)}</b> average</span>
                      <span><b>{ms(q.maxMs)}</b> worst</span>
                      <span><b>{count(q.rows)}</b> rows</span>
                      {/* Low cache hit means it is going to disk, which is the
                          case an index or a narrower select actually helps. */}
                      <span>
                        <b>{q.cacheHitPct === null ? '—' : `${q.cacheHitPct}%`}</b> from cache
                      </span>
                      <span><b>{count(q.blocksFromDisk)}</b> blocks off disk</span>
                      <span><b>{bytes(q.walBytes)}</b> written</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="bpxb-note">
          Sampled from <code>pg_stat_statements</code> every fifteen minutes and
          kept for thirty days. Figures are the difference between the first and
          last sample in the window, so they describe that window rather than
          all of history.
        </div>
      </div>
    </div>
  );
}
