/**
 * Where failures are written down.
 *
 * WHY THE INGEST ROUTE IS NOT STAFF-GATED
 *
 * The failures worth hearing about most are the ones happening to people who
 * are not staff: a customer whose portal will not load, a visitor whose quote
 * form posts into nothing. Gating this would record only the breakages that
 * happen to us, which are the ones we would have found anyway.
 *
 * That makes it the one route on this server that accepts content from anyone
 * the platform gate lets through, so it is written defensively and gives
 * nothing back:
 *
 *   - the body is capped and every field truncated, so a row cannot be large
 *   - `kind` is checked against a closed set, so queries cannot be fragmented
 *   - the query string is stripped from the path, because that is where tokens
 *     and customer identifiers live
 *   - the fingerprint is computed HERE, not accepted from the caller, so no
 *     client can scatter one bug across a thousand groups and hide it
 *   - the actor comes from the request's own identity, never from the body
 *   - it answers 204 to everything, including rubbish: no error text, no
 *     validation detail, nothing to probe and nothing for a client to retry
 *   - a per-isolate bucket drops the rest once somebody exceeds the ceiling,
 *     because a page in a render loop would otherwise write a row a frame
 *
 * READING IT IS GATED, and gated hard. The list of what is failing is a map of
 * where this platform is weakest.
 */
import { Hono } from 'npm:hono@4';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireStaffOn } from './requireStaff.ts';

const appErrorsRouter = new Hono();

const admin = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const INGEST = '/make-server-3eae23a6/app-errors';
const GROUPS = '/make-server-3eae23a6/app-errors/groups';

/** Staff to read. Only the sub-path, so the ingest above stays open. */
appErrorsRouter.use('*', requireStaffOn([GROUPS]));

/** Longer than any honest report, shorter than anything worth storing. */
const MAX_BODY_BYTES = 8 * 1024;

const KINDS = new Set(['fetch', 'unhandled', 'rejection', 'route']);

const trim = (v: unknown, max: number): string | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

/**
 * The pathname, and nothing else.
 *
 * A URL in an error report arrives complete, and a complete URL to this
 * platform regularly carries an access token, a signed storage link or a
 * customer identifier in its query. Keeping the pathname keeps everything the
 * grouping needs and none of that.
 */
function pathOnly(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  try {
    return trim(new URL(s, 'https://x.invalid').pathname, 300);
  } catch {
    return trim(s.split('?')[0], 300);
  }
}

/**
 * What makes two failures the same failure.
 *
 * Computed here rather than taken from the body — see the header. Numbers,
 * uuids and hex blobs are replaced before hashing, because "quote 41f9 failed"
 * and "quote 7c02 failed" are one bug and would otherwise be two groups, and a
 * thousand of them would be a thousand.
 */
async function fingerprintOf(parts: {
  kind: string; feature: string | null; message: string; path: string | null; status: number | null;
}): Promise<string> {
  const shape = parts.message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<id>')
    .replace(/\b[0-9a-f]{12,}\b/g, '<hex>')
    .replace(/\d+/g, '<n>')
    .slice(0, 200);
  const basis = [parts.kind, parts.feature ?? '', parts.path ?? '', parts.status ?? '', shape].join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(basis));
  return Array.from(new Uint8Array(digest)).slice(0, 10)
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The ceiling, per isolate.
 *
 * In memory deliberately. A shared counter would mean a database round trip to
 * decide whether to make a database write, which doubles the cost of the thing
 * it is trying to limit. Supabase may run several isolates, so the real
 * ceiling is this times however many — which is the right kind of imprecision:
 * it never blocks a genuine report and it does stop a render loop.
 */
const BUCKET_MS = 60_000;
const BUCKET_MAX = 40;
const buckets = new Map<string, { n: number; until: number }>();

function overLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.until) {
    buckets.set(key, { n: 1, until: now + BUCKET_MS });
    // Bounded, so a flood of distinct keys cannot grow this without end.
    if (buckets.size > 500) {
      for (const [k, v] of buckets) if (now > v.until) buckets.delete(k);
    }
    return false;
  }
  b.n += 1;
  return b.n > BUCKET_MAX;
}

appErrorsRouter.post(INGEST, async (c) => {
  // 204 to everything. The caller is a page that has already failed once; it
  // must never be given a second failure to report, and a reason would only
  // tell a prober what the shape of a valid report is.
  const done = () => c.body(null, 204);

  try {
    const raw = await c.req.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return done();

    let body: any;
    try { body = JSON.parse(raw); } catch { return done(); }
    if (!body || typeof body !== 'object') return done();

    const kind = String(body.kind || '').trim();
    if (!KINDS.has(kind)) return done();

    const message = trim(body.message, 500);
    if (!message) return done();

    let actorEmail: string | null = null;
    let actorId: string | null = null;
    try {
      const actor = c.get?.('actor');
      if (actor?.email) actorEmail = String(actor.email).toLowerCase().slice(0, 200);
      if (actor?.id) actorId = String(actor.id);
    } catch { /* anonymous is a valid answer and worth recording as one */ }

    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (overLimit(actorEmail || ip)) return done();

    const feature = trim(body.feature, 120);
    const path = pathOnly(body.path);
    const statusRaw = Number(body.status);
    const status = Number.isInteger(statusRaw) && statusRaw > 0 && statusRaw < 600 ? statusRaw : null;

    const row = {
      source: 'client',
      kind,
      feature,
      fingerprint: await fingerprintOf({ kind, feature, message, path, status }),
      message,
      detail: trim(body.detail, 500),
      path,
      status,
      actor_email: actorEmail,
      actor_id: actorId,
      app_version: trim(body.appVersion, 80),
      user_agent: trim(c.req.header('user-agent'), 300),
    };

    const { error } = await admin().from('app_error_log').insert(row);
    if (error) {
      // Logged to the function's own console, never returned. If the error log
      // cannot write, that is our problem to find, not the page's to handle.
      console.error('[app-errors] could not record a failure:', error.message);
    }
  } catch (e: any) {
    console.error('[app-errors] ingest threw:', String(e?.message || e));
  }

  return done();
});

/**
 * Distinct problems, newest first. Staff only.
 *
 * Grouped in the database by `app_error_groups` rather than here — see that
 * function's note. This route is the human-readable door onto the same data
 * Phoenix's `feature_health` tool reads, so that a person and the assistant
 * can never be looking at two different versions of what is broken.
 */
appErrorsRouter.get(GROUPS, async (c) => {
  try {
    const hours = Math.min(Math.max(Number(c.req.query('hours')) || 24, 1), 24 * 30);
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 20, 1), 100);

    const { data, error } = await admin()
      .rpc('app_error_groups', { since_hours: hours, max_groups: limit });

    if (error) return c.json({ success: false, error: error.message }, 500);
    return c.json({ success: true, windowHours: hours, groups: data || [] });
  } catch (e: any) {
    return c.json({ success: false, error: String(e?.message || e) }, 500);
  }
});

export default appErrorsRouter;
