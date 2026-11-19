/**
 * Telling the server when the browser breaks.
 *
 * WHY THIS EXISTS
 *
 * Phoenix's microphone shipped broken and took three rounds to find. The
 * browser recorded a clip, posted it, and the fetch rejected with "Failed to
 * fetch" — one missing name in a CORS allowlist, which means the browser
 * refused to send the request and no server was ever involved. There was
 * nothing in any log anywhere, because nothing in this application told anyone
 * when something failed in a browser. It was found by probing the live
 * preflight by hand.
 *
 * That class of bug — the request that never arrives — is invisible from the
 * server by definition, and it is the most common way a deploy is quietly
 * broken for everybody. This file is the other end of the telescope.
 *
 * WHAT IT WILL NOT DO
 *
 *  1. It never changes behaviour. Every reporting path is fire-and-forget,
 *     wrapped, and swallows its own failures. A logger that breaks the page it
 *     is watching is worse than no logger.
 *  2. It never reports itself. A failure posting a report is dropped on the
 *     floor — the alternative is a loop that writes a row per attempt.
 *  3. It never sends bodies, headers or query strings. Those carry tokens and
 *     customer data; the server strips the query again on the way in, because
 *     one guard in one place is a guard that eventually moves.
 *  4. It stops. Twenty reports per page load, and one per fingerprint per
 *     minute — a render loop that throws every frame says it once.
 */
import { API_BASE_URL, SUPABASE_ORIGIN } from './apiConfig';
import { publicAnonKey } from '../utils/supabase/info';

const ENDPOINT = `${API_BASE_URL}/make-server-3eae23a6/app-errors`;

export type ErrorKind = 'fetch' | 'unhandled' | 'rejection';
/** `'security'` is written only by `reportSecurityEvent`, which sends the session token. */
export type ReportKind = ErrorKind | 'security';

export interface ErrorReport {
  kind: ErrorKind;
  message: string;
  /** The coarse area, for somebody reading a list of problems. */
  feature?: string | null;
  detail?: string | null;
  path?: string | null;
  status?: number | null;
}

/** Enough for a bad deploy, few enough that a loop cannot bill us. */
const MAX_PER_PAGE = 20;
const SAME_AGAIN_MS = 60_000;

let sent = 0;
const lastSeen = new Map<string, number>();

/**
 * Which build this is.
 *
 * Read off the bundle filename, which vite stamps with the build time — see
 * the `entryFileNames` note in vite.config.ts. "Is this still happening since
 * the fix shipped" is the question that has cost this project the most time,
 * and it is unanswerable without this.
 */
function buildStamp(): string | null {
  try {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    for (const s of scripts) {
      const m = /\/assets\/[^/]*-(\d{10,})\.js/.exec((s as HTMLScriptElement).src || '');
      if (m) return m[1];
    }
  } catch { /* no document, or a hostile one */ }
  return null;
}

/**
 * The area a path belongs to, in one or two words.
 *
 * Grouping by full pathname puts every id in its own bucket. The first two
 * meaningful segments after the function slug are what a person recognises:
 * 'phoenix/transcribe', 'quotes', 'exchange/bids'.
 */
function featureFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.split('?')[0].split('/')
    .filter(Boolean)
    .filter((p) => !p.startsWith('make-server-') && p !== 'functions' && p !== 'v1');
  if (!parts.length) return null;
  return parts.slice(0, 2).join('/').slice(0, 120);
}

/** A local key for the "say it once" rule. Not the server's fingerprint. */
const keyFor = (r: ErrorReport) =>
  `${r.kind}|${r.feature || ''}|${r.status || ''}|${r.message.replace(/\d+/g, '#').slice(0, 120)}`;

/**
 * Post one report. Never throws, never awaits anything the caller needs.
 *
 * `keepalive` so a report survives the navigation that often follows a
 * failure, and the anon key because the ingest route sits behind the same
 * platform gate as everything else — an unauthenticated visitor's breakage is
 * still worth hearing about.
 */
export function reportAppError(report: ErrorReport): void {
  try {
    if (sent >= MAX_PER_PAGE) return;
    const message = String(report.message || '').trim();
    if (!message) return;

    const key = keyFor({ ...report, message });
    const now = Date.now();
    const when = lastSeen.get(key);
    if (when && now - when < SAME_AGAIN_MS) return;
    lastSeen.set(key, now);
    sent += 1;

    const body = JSON.stringify({
      kind: report.kind,
      message: message.slice(0, 500),
      feature: report.feature ?? featureFromPath(report.path),
      detail: report.detail ? String(report.detail).slice(0, 500) : null,
      // Pathname only. The server strips it again; see the header.
      path: report.path ? String(report.path).split('?')[0].slice(0, 300) : null,
      status: typeof report.status === 'number' ? report.status : null,
      appVersion: buildStamp(),
    });

    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body,
      keepalive: true,
    }).catch(() => { /* see rule 2 in the header */ });
  } catch {
    // See rule 1. There is no failure here worth a second one.
  }
}

/**
 * Report a security-relevant event — a tenant boundary refusing somebody.
 *
 * WHY THIS IS NOT JUST `reportAppError`
 *
 * One header. `reportAppError` sends the publishable anon key, which identifies
 * the project and nobody in particular; that is right for "a page broke",
 * because an anonymous visitor's breakage is still worth hearing about. It is
 * useless here. A security event whose subject is `null` records that somebody
 * was refused and declines to say who.
 *
 * So this one sends the signed-in user's access token when there is one, and
 * **the server takes the actor from that verified token and never from the
 * body** — see the `c.get('actor')` block in `app-errors.tsx`. That is the
 * actual fix, not the transport: a caller cannot name themselves in a record of
 * their own refusal.
 *
 * WHAT THIS REPLACED
 *
 * `logSecurityEvent` in `AuthContext` used to be a `console.log`, under a
 * comment saying the table did not exist. It still does not. So the one
 * category of event this application deliberately calls a security event — a
 * tenant-boundary violation, five of its eight call sites being
 * `company_switch_denied` — was written to the browser console of the person
 * who had just been refused, and nowhere else. The one party who should not
 * hold that record was the only one holding it.
 *
 * WHY `app_error_log` AND NOT A NEW TABLE
 *
 * Because this sink already exists and is already hardened: RLS on with zero
 * policies, so it is deny-all to `anon` and `authenticated` and only the
 * service role touches it; per-caller rate limiting; field caps; query strings
 * stripped on the way in. A new `security_audit_log` is the tidier home and
 * wants a migration and a decision that is not mine to make at speed. `kind`
 * is `'security'` on every row this writes, so filtering them out later — or
 * backfilling them into that table — is one `where`.
 *
 * Rules 1 through 4 in the header still hold. This never throws, never changes
 * behaviour, and is capped by the same counters.
 */
export function reportSecurityEvent(
  eventType: string,
  detail?: Record<string, unknown> | null,
): void {
  try {
    const type = String(eventType || '').trim();
    if (!type) return;
    void postSecurity(type, detail);
  } catch {
    // See rule 1. A logger must not be able to break what it is watching.
  }
}

/**
 * Security events get their OWN counter, and a stricter idea of "the same".
 *
 * The "say it once per minute" rule above is right for errors and wrong here.
 * A render loop throwing every frame is one bug and should say so once. Thirty
 * refusals in a minute are thirty refusals — collapsing them to one would
 * under-report a probe by thirty times, on the exact trail that exists to make
 * probing visible. That would be a worse bug than the one being fixed.
 *
 * So two changes. The dedupe key includes the detail, which means a different
 * target company or a different reason is a different event rather than a
 * repeat. And the budget is separate, so twenty broken images cannot starve
 * the security trail — these shared one counter at first, which is exactly how
 * a page full of failures would have swallowed the refusal that mattered.
 *
 * A ceiling still exists, because a loop must not be able to bill us. It is
 * deliberately generous and it is not the real one: the server caps at 40 a
 * minute per caller, which is the ceiling that actually holds, and it is on a
 * machine the caller does not control.
 */
const MAX_SECURITY_PER_PAGE = 60;
let securitySent = 0;

async function postSecurity(
  eventType: string,
  detail?: Record<string, unknown> | null,
): Promise<void> {
  try {
    if (securitySent >= MAX_SECURITY_PER_PAGE) return;

    /*
     * The detail is summarised, not forwarded.
     *
     * These objects carry company ids and reason codes, which is what makes
     * them worth keeping — but the server caps `detail` at 500 characters and
     * silently truncates, and a truncated JSON blob is worse than a short
     * readable one. So it is flattened to `k=v` pairs here, where it can be
     * read in a list of events without being parsed.
     */
    /*
     * `company_id` and `outcome` are lifted out into their own fields.
     *
     * They are columns in `security_audit_log`, and the question the table
     * exists to answer — who has been refused at which boundary, how often —
     * is a `where` on exactly those two. Leaving them inside a flattened blob
     * would have made that a substring search over text.
     */
    const { company_id: companyId, outcome, ...rest } = detail ?? {};

    const flat = Object.entries(rest)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' ')
      .slice(0, 480) || null;

    /*
     * Deduped on the event AND its detail, so only a genuine repeat collapses.
     *
     * Checked here rather than at the top of the function because the detail is
     * half the key: `company_switch_denied` against two different companies is
     * two attempts on two boundaries, and keying on the event type alone would
     * have recorded the first and thrown the second away.
     */
    // companyId and outcome belong in the key even though they are no longer
    // inside `flat`. They were, until they were lifted into their own fields
    // just above, and keying on `flat` alone would quietly have made two
    // refusals at two different company boundaries look like one repeat —
    // re-breaking the under-reporting this dedupe was written to avoid.
    const key = `security|${eventType}|${companyId ?? ''}|${outcome ?? ''}|${flat ?? ''}`;
    const now = Date.now();
    const when = lastSeen.get(key);
    if (when && now - when < SAME_AGAIN_MS) return;
    lastSeen.set(key, now);
    securitySent += 1;

    // Session token when there is one, anon key otherwise. Never throws: an
    // expired session is a thing worth recording, not a reason to drop the
    // record. The server decides whose event this is, from the token.
    const { authedHeadersOrAnon } = await import('../utils/authHeaders');
    const headers = await authedHeadersOrAnon(publicAnonKey);

    await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        kind: 'security',
        // `message` is the event type; the server stores it as `event_type`.
        message: eventType.slice(0, 500),
        companyId: companyId == null ? null : String(companyId).slice(0, 200),
        outcome: outcome === 'denied' || outcome === 'allowed' ? outcome : null,
        detail: flat,
        path: typeof window !== 'undefined' ? window.location?.pathname || null : null,
        appVersion: buildStamp(),
      }),
      keepalive: true,
    }).catch(() => { /* rule 2 */ });
  } catch {
    /* rule 1 */
  }
}

let installed = false;

/**
 * Watch the window and our own API.
 *
 * THE FETCH WRAPPER IS THE POINT. `installSessionExpiryNotice` wraps fetch the
 * same way for 401s and the two compose — each calls whatever it found. What
 * this one catches is the case that leaves no other trace:
 *
 *   - a rejected fetch: network down, CORS refusal, blocked request. The
 *     browser gives one unhelpful sentence and the server never hears of it.
 *   - a 5xx, which means the server broke and may not have logged it either
 *   - a 404, which usually means a route was renamed or never deployed
 *
 * 401 and 403 are deliberately NOT reported. They are the normal sound of an
 * expired session and of a portal account meeting a staff route, they happen
 * in their thousands, and they would bury everything that matters.
 */
export function installErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  try {
    window.addEventListener('error', (e: ErrorEvent) => {
      // Resource load failures arrive here with no Error object and are
      // better handled by installStaleChunkReload, which reloads into the
      // current build rather than merely writing it down.
      if (!e?.error && !e?.message) return;
      reportAppError({
        kind: 'unhandled',
        message: String(e.message || e.error?.message || 'Unhandled error'),
        detail: e.error?.name || null,
        feature: featureFromPath(window.location?.pathname),
        path: window.location?.pathname || null,
      });
    });

    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      const r: any = e?.reason;
      reportAppError({
        kind: 'rejection',
        message: String(r?.message || r || 'Unhandled promise rejection'),
        detail: r?.name || null,
        feature: featureFromPath(window.location?.pathname),
        path: window.location?.pathname || null,
      });
    });
  } catch { /* an environment without listeners is not one to fail over */ }

  try {
    if (!window.fetch) return;
    const original = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input
        : input instanceof URL ? input.toString()
          : (input as Request)?.url || '';

      // Rule 2. Never report a failure to report.
      const ours = url.startsWith(SUPABASE_ORIGIN);
      const mute = !ours || url.startsWith(ENDPOINT);

      try {
        const res = await original(input as any, init);
        if (!mute && (res.status >= 500 || res.status === 404)) {
          reportAppError({
            kind: 'fetch',
            message: `${res.status} from ${pathOf(url)}`,
            detail: res.statusText || null,
            path: pathOf(url),
            status: res.status,
          });
        }
        return res;
      } catch (e: any) {
        if (!mute) {
          reportAppError({
            kind: 'fetch',
            // The browser's own words. "Failed to fetch" is what a CORS
            // refusal, a dropped connection and a blocked request all say, and
            // the path is what separates them.
            message: `${String(e?.message || 'fetch failed')} — ${pathOf(url)}`,
            detail: e?.name || null,
            path: pathOf(url),
          });
        }
        // Rethrown untouched. This watches; it does not interfere.
        throw e;
      }
    };
  } catch { /* see rule 1 */ }
}

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return url.split('?')[0]; }
}
