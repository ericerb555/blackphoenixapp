/**
 * Collecting what the Content-Security-Policy would have blocked.
 *
 * WHY THIS EXISTS
 *
 * `docs/security/headers.md` deploys the policy as `Report-Only` and then says
 * how to promote it: "Collect reports for a week across the storefront,
 * portals, checkout and the Exchange map. Add a `report-uri`/`report-to`
 * endpoint first, or read them from browser consoles — right now nothing
 * collects them, so this step means actually looking."
 *
 * Nothing collected them, so nobody looked, so the policy sat in report-only
 * for three weeks reporting into the void. A CSP that is never promoted is a
 * header that costs a round trip and buys nothing. This is the missing piece:
 * real browsers, on real traffic, telling us what the policy would break
 * before it breaks it.
 *
 * It is DIAGNOSTIC AND TEMPORARY. Once the policy is enforcing and quiet, the
 * `report-uri` can come out of `vercel.json` and this can go with it.
 *
 * THE PROBLEM WITH A PUBLIC WRITE ENDPOINT
 *
 * Browsers send violation reports with no credentials, so this route has to be
 * public — which makes it the only unauthenticated write on the API that is
 * not a payment webhook. The obvious implementation reads the store, merges
 * one report and writes it back. That is a read and a write per request, on a
 * route anybody can call as fast as they like, on a usage-priced stack. The
 * anti-abuse code would be the cheapest thing in the system to abuse.
 *
 * `ipReputation.ts` had the same problem and solved it the same way: do no
 * storage work in the common case. Reports accumulate in a module-level
 * buffer inside the isolate and are flushed at most once every
 * `FLUSH_INTERVAL_MS`. A thousand reports in a minute cost one write, not a
 * thousand. An isolate that is torn down before its flush loses what it held,
 * which for a one-week diagnostic is a fair trade and is the reason this is
 * not the place to put anything that must not be lost.
 *
 * WHAT IS BOUNDED, AND WHY EACH BOUND IS THERE
 *
 *   body size        a report is small; anything large is not a report
 *   fingerprints     an attacker can mint unlimited distinct blocked-uris,
 *                    so distinct entries are capped and the overflow is
 *                    COUNTED rather than stored. A cap that silently discards
 *                    would make the store look clean while it overflowed.
 *   sample length    one short example per fingerprint, not every URL seen
 *   buffer size      a flood between flushes cannot grow the isolate's memory
 *                    without limit
 */

/** One violation, reduced to the fields worth keeping. */
export interface CspViolation {
  /** Which directive refused it — `script-src`, `connect-src`, … */
  directive: string;
  /** What was refused, normalised to scheme + host + path. */
  blocked: string;
  /** The page it happened on, path only. */
  document: string;
}

/** A fingerprint and everything learned about it. */
export interface CspEntry extends CspViolation {
  count: number;
  firstSeen: string;
  lastSeen: string;
  /** One unreduced example, for when the normalised form is not enough. */
  sample: string;
}

export interface CspStore {
  updatedAt: string;
  /** Reports discarded because the fingerprint cap was reached. */
  dropped: number;
  /**
   * POSTs that reached the endpoint at all, whatever they contained.
   *
   * WHY THIS IS THE FIELD THAT DECIDES PROMOTION
   *
   * Without it an empty store is unfalsifiable. On 2026-11-10 the store had
   * been collecting for four days and held nothing, and there was no way to
   * tell "the policy fits the site" from "no report has ever arrived" — a
   * wrong `report-uri`, a browser that stopped sending, a route returning
   * 204 to something it could not read. All of those look exactly like a
   * clean site, and "clean, promote it" is the dangerous conclusion.
   *
   * `requests` makes the difference visible: hundreds received and nothing
   * recorded is evidence the policy fits. Zero received is evidence of
   * nothing at all, and means fixing the pipe before trusting the silence.
   *
   * It is the same reasoning as `dropped`, one level up: a counter that
   * stops counting looks identical to a site with no violations.
   */
  requests: number;
  /** Requests that arrived carrying nothing usable — malformed, empty, not a report. */
  rejected: number;
  /** When a report last arrived, usable or not. Null until one does. */
  lastRequestAt: string | null;
  entries: Record<string, CspEntry>;
}

/** Distinct fingerprints kept. Past this, reports are counted and dropped. */
export const FINGERPRINT_CAP = 200;
/** Longest `sample` kept per fingerprint. */
export const SAMPLE_MAX = 300;
/** Largest body accepted, in bytes. */
export const BODY_MAX = 8 * 1024;

export function emptyStore(nowIso: string): CspStore {
  return { updatedAt: nowIso, dropped: 0, requests: 0, rejected: 0, lastRequestAt: null, entries: {} };
}

/**
 * Reduce a URI to scheme + host + path.
 *
 * Query strings on a blocked URI are where the cardinality is: one blocked
 * image CDN with a cache-busting parameter would otherwise produce a new
 * fingerprint on every page load and fill the cap by itself. The path is kept
 * because `connect-src` to `/auth/v1/token` and to `/functions/v1/...` are
 * genuinely different problems.
 *
 * Non-URL values are passed through — CSP uses bare keywords like `inline`,
 * `eval` and `data` for the cases that have no URL at all, and those are the
 * most interesting reports of the lot.
 */
export function normaliseUri(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw.slice(0, 200);
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}${u.pathname}`.slice(0, 200);
  } catch {
    return raw.slice(0, 200);
  }
}

/**
 * The two shapes a browser sends.
 *
 * `report-uri` posts `{"csp-report": {...}}` with hyphenated keys.
 * `report-to` posts an ARRAY of `{type, body}` with camelCase keys. Chrome
 * sends the second and has been threatening to drop the first for years, so
 * reading only one of them would quietly stop collecting on a browser update.
 */
export function readReport(body: any): CspViolation | null {
  const r = body?.['csp-report'] ?? body?.body ?? body;
  if (!r || typeof r !== 'object') return null;

  const directive = String(
    r['effective-directive'] ?? r.effectiveDirective ??
    r['violated-directive'] ?? r.violatedDirective ?? '',
  ).split(/\s+/)[0].slice(0, 60);
  if (!directive) return null;

  const blockedRaw = r['blocked-uri'] ?? r.blockedURL ?? r.blockedUri ?? '';
  const documentRaw = r['document-uri'] ?? r.documentURL ?? r.documentUri ?? '';

  let document = String(documentRaw || '');
  try { document = new URL(document).pathname; } catch { /* keep as sent */ }

  return {
    directive,
    blocked: normaliseUri(blockedRaw) || 'unknown',
    document: document.slice(0, 200) || '/',
  };
}

/** The key a violation is counted under. */
export function fingerprint(v: CspViolation): string {
  return `${v.directive}|${v.blocked}|${v.document}`;
}

/**
 * Fold one violation into the store.
 *
 * Returns the store so callers can treat it as a value; it is mutated in
 * place because the alternative is copying a 200-entry object per report.
 *
 * A fingerprint already present is ALWAYS counted, cap or no cap — the cap
 * exists to stop unbounded growth, not to stop counting something already
 * being tracked. Only a NEW fingerprint arriving at a full store is dropped.
 */
export function mergeViolation(
  store: CspStore,
  v: CspViolation,
  nowIso: string,
  sample = '',
  cap = FINGERPRINT_CAP,
): CspStore {
  const key = fingerprint(v);
  const existing = store.entries[key];

  if (existing) {
    existing.count += 1;
    existing.lastSeen = nowIso;
  } else if (Object.keys(store.entries).length >= cap) {
    store.dropped += 1;
  } else {
    store.entries[key] = {
      ...v,
      count: 1,
      firstSeen: nowIso,
      lastSeen: nowIso,
      sample: String(sample || v.blocked).slice(0, SAMPLE_MAX),
    };
  }

  store.updatedAt = nowIso;
  return store;
}

/**
 * Is this report about one of our own pages?
 *
 * A report naming somebody else's document is either misdirected or forged,
 * and either way tells us nothing about our policy. Checked on the path
 * rather than the origin because the document has already been reduced to a
 * path by `readReport` — and because the origin on a report from a portal
 * iframe is not reliably ours even when the page is.
 */
export function plausible(v: CspViolation | null): v is CspViolation {
  if (!v) return false;
  if (!v.directive || !/^[a-z-]+$/.test(v.directive)) return false;
  return v.document.startsWith('/');
}

/**
 * The summary a human reads: loudest first, because the top of that list is
 * the work. A policy is ready to enforce when everything left on it is
 * something you are content to break.
 */
export function summarise(store: CspStore | null | undefined) {
  const entries = Object.values(store?.entries || {});
  const requests = store?.requests || 0;
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  return {
    updatedAt: store?.updatedAt || null,
    dropped: store?.dropped || 0,
    requests,
    rejected: store?.rejected || 0,
    lastRequestAt: store?.lastRequestAt || null,
    distinct: entries.length,
    total,
    /**
     * WHAT THESE NUMBERS CAN AND CANNOT SETTLE.
     *
     * They cannot settle whether the policy is safe to enforce, and an earlier
     * draft of this function claimed they could — a `safeToPromote` of
     * `requests > 0 && total === 0`. That is wrong, and wrong in the direction
     * that breaks a site.
     *
     * A browser posts to a CSP endpoint ONLY when the policy blocks something.
     * So for a policy that fits perfectly, the correct and expected traffic is
     * none. `requests > 0` therefore cannot be a precondition for promotion —
     * it is very nearly the opposite — and `total === 0` alongside
     * `requests > 0` is close to a contradiction, since a readable report IS a
     * violation.
     *
     * What these DO settle is narrower and still worth having: whether anything
     * reaches the endpoint, and whether what reaches it can be read. A store
     * with `rejected` climbing and `total` at zero is a parsing bug, which
     * previously looked exactly like a clean site.
     *
     * Telling "no violations" from "nothing is reporting" needs a CANARY: a
     * deliberate violation the page always triggers, so a working pipe always
     * has something in it. That is not built — see docs/security/headers.md —
     * and until it is, an empty store stays unproven rather than reassuring.
     */
    verdict: requests === 0
      ? 'nothing-received'
      : total === 0 ? 'received-but-nothing-readable'
      : 'violations-recorded',
    entries: entries.sort((a, b) => b.count - a.count),
  };
}

/**
 * Fold a whole buffered entry into a store, counts and all.
 *
 * The flush path needs this rather than `mergeViolation` in a loop. An
 * isolate that buffered four thousand copies of one violation would
 * otherwise do four thousand merges to arrive at `count += 4000`, and the
 * flood this buffer exists to absorb would be paid for at flush time
 * instead of at request time — which is the same bill, moved.
 *
 * The cap behaves exactly as it does for a single violation: a fingerprint
 * already present is counted whatever the cap says, a new one arriving at a
 * full store is dropped and counted as dropped. Dropping `entry.count` as a
 * single drop would under-report the overflow, so the whole count is added.
 */
export function mergeEntry(
  store: CspStore,
  entry: CspEntry,
  cap = FINGERPRINT_CAP,
): CspStore {
  const key = fingerprint(entry);
  const existing = store.entries[key];

  if (existing) {
    existing.count += entry.count;
    if (entry.lastSeen > existing.lastSeen) existing.lastSeen = entry.lastSeen;
    if (entry.firstSeen < existing.firstSeen) existing.firstSeen = entry.firstSeen;
  } else if (Object.keys(store.entries).length >= cap) {
    store.dropped += entry.count;
  } else {
    store.entries[key] = { ...entry };
  }

  if (entry.lastSeen > store.updatedAt) store.updatedAt = entry.lastSeen;
  return store;
}

/** Fold an entire buffer into a store. One pass, whatever the counts are. */
export function mergeStore(
  store: CspStore,
  buffer: CspStore,
  cap = FINGERPRINT_CAP,
): CspStore {
  for (const entry of Object.values(buffer.entries)) mergeEntry(store, entry, cap);
  store.dropped += buffer.dropped;
  /*
   * `|| 0` on both sides, not just the buffer.
   *
   * A store written before these fields existed has them undefined, and
   * `undefined + 1` is NaN — which would serialise as null and quietly wipe
   * the count on the first flush after deploying this.
   */
  store.requests = (store.requests || 0) + (buffer.requests || 0);
  store.rejected = (store.rejected || 0) + (buffer.rejected || 0);
  if (buffer.lastRequestAt && buffer.lastRequestAt > (store.lastRequestAt || '')) {
    store.lastRequestAt = buffer.lastRequestAt;
  }
  return store;
}
