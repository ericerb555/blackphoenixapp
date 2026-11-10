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
