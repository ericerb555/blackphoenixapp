/**
 * The CSP violation collector.
 *
 * This exists so the policy in `vercel.json` can stop being report-only.
 * `docs/security/headers.md` says to collect for a week and then promote;
 * nothing collected, so nothing was promoted. The value of this module is
 * entirely in whether the numbers it produces can be trusted to make that
 * decision, which is what these tests are about.
 *
 * TWO PROPERTIES MATTER MORE THAN THE REST
 *
 * 1. **Nothing is silently discarded.** A store that fills up and quietly
 *    stops counting looks exactly like a site with no violations, and the
 *    conclusion drawn from it — "clean, promote it" — is the dangerous one.
 *    Overflow increments `dropped` so the summary can say so out loud.
 *
 * 2. **Cardinality is bounded by us, not by the caller.** The endpoint is
 *    public and unauthenticated, so the blocked URI is attacker-controlled.
 *    If each distinct URI made a new entry, one script could fill the cap
 *    and push every real finding out of the window.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readReport,
  normaliseUri,
  fingerprint,
  mergeViolation,
  emptyStore,
  plausible,
  summarise,
  FINGERPRINT_CAP,
  SAMPLE_MAX,
} from '../supabase/functions/server/cspReports.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const LATER = '2026-11-06T13:00:00.000Z';

/* ── reading what browsers actually send ─────────────────────────────────── */

/**
 * Chrome sends `report-to`, Firefox and Safari still send `report-uri`, and
 * the two use different key names for the same facts. Reading only one shape
 * would mean collecting from some browsers and not others, and the gap would
 * look like "those browsers have no violations".
 */
test('the report-uri shape is read', () => {
  const v = readReport({
    'csp-report': {
      'violated-directive': "script-src 'self'",
      'effective-directive': 'script-src',
      'blocked-uri': 'https://evil.example/x.js?cb=123',
      'document-uri': 'https://theblackphoenixcompany.com/work/abc?utm=1',
    },
  });
  assert.deepEqual(v, {
    directive: 'script-src',
    blocked: 'https://evil.example/x.js',
    document: '/work/abc',
  });
});

test('the report-to shape is read', () => {
  const v = readReport({
    type: 'csp-violation',
    body: {
      effectiveDirective: 'connect-src',
      blockedURL: 'https://api.example.com/v1/thing',
      documentURL: 'https://theblackphoenixcompany.com/portal',
    },
  });
  assert.deepEqual(v, {
    directive: 'connect-src',
    blocked: 'https://api.example.com/v1/thing',
    document: '/portal',
  });
});

test('a directive with its source list keeps only the directive', () => {
  const v = readReport({ 'csp-report': { 'violated-directive': "style-src 'self' https://fonts.googleapis.com", 'document-uri': 'https://x.test/a' } });
  assert.equal(v?.directive, 'style-src');
});

test('nonsense is rejected rather than stored', () => {
  assert.equal(readReport(null), null);
  assert.equal(readReport({}), null);
  assert.equal(readReport({ 'csp-report': {} }), null);
  assert.equal(readReport('not an object' as any), null);
});

/* ── the keyword cases, which are the interesting ones ───────────────────── */

/**
 * The violations worth the most are the ones with no URL: `inline` means a
 * script or style the policy would have stopped executing, which is the whole
 * point of having a CSP. Reducing those to '' would throw away the signal.
 */
test('CSP keywords survive normalisation', () => {
  for (const kw of ['inline', 'eval', 'data', 'blob', 'self']) {
    assert.equal(normaliseUri(kw), kw, kw);
  }
});

test('a URI is reduced to scheme, host and path', () => {
  assert.equal(
    normaliseUri('https://cdn.example.com/a/b.png?v=99#frag'),
    'https://cdn.example.com/a/b.png',
  );
});

test('a malformed URI does not throw', () => {
  assert.equal(normaliseUri('https://['), 'https://[');
  assert.equal(normaliseUri(undefined), '');
  assert.equal(normaliseUri(null), '');
});

/* ── bounding what a stranger can do to the store ────────────────────────── */

/**
 * The cardinality attack, and the reason the query string is stripped. One
 * image URL with a cache-buster is one problem; without this it is one
 * problem per page load until the cap is full.
 */
test('a cache-busting query does not mint a new fingerprint each time', () => {
  const store = emptyStore(NOW);
  for (let i = 0; i < 50; i++) {
    const v = readReport({ 'csp-report': {
      'effective-directive': 'img-src',
      'blocked-uri': `https://cdn.example.com/p.png?cb=${i}`,
      'document-uri': 'https://x.test/work',
    } });
    mergeViolation(store, v!, NOW);
  }
  assert.equal(Object.keys(store.entries).length, 1);
  assert.equal(Object.values(store.entries)[0].count, 50);
});

test('distinct fingerprints are capped, and the overflow is counted not hidden', () => {
  const store = emptyStore(NOW);
  const cap = 5;
  for (let i = 0; i < 20; i++) {
    mergeViolation(store, { directive: 'img-src', blocked: `https://h${i}.test/x`, document: '/a' }, NOW, '', cap);
  }
  assert.equal(Object.keys(store.entries).length, cap);
  assert.equal(store.dropped, 15);
  // The summary must say so, or a full store reads as a clean one.
  assert.equal(summarise(store).dropped, 15);
});

/**
 * The cap bounds GROWTH, not counting. A real violation already being tracked
 * must keep counting while the store is full, or its number stops being a
 * measure of anything the moment an attacker fills the rest.
 */
test('a known fingerprint keeps counting after the cap is reached', () => {
  const store = emptyStore(NOW);
  const cap = 3;
  const real = { directive: 'script-src', blocked: 'inline', document: '/checkout' };
  mergeViolation(store, real, NOW, '', cap);
  for (let i = 0; i < 10; i++) {
    mergeViolation(store, { directive: 'img-src', blocked: `https://h${i}.test/x`, document: '/a' }, NOW, '', cap);
  }
  mergeViolation(store, real, LATER, '', cap);

  assert.equal(store.entries[fingerprint(real)].count, 2);
  assert.equal(store.entries[fingerprint(real)].lastSeen, LATER);
  assert.ok(store.dropped > 0);
});

test('the sample is bounded', () => {
  const store = emptyStore(NOW);
  mergeViolation(store, { directive: 'img-src', blocked: 'https://h.test/x', document: '/a' }, NOW, 'z'.repeat(5000));
  assert.equal(Object.values(store.entries)[0].sample.length, SAMPLE_MAX);
});

/* ── refusing reports that are not about us ──────────────────────────────── */

test('a report naming somebody else’s document is not plausible', () => {
  assert.equal(plausible(readReport({ 'csp-report': {
    'effective-directive': 'script-src',
    'document-uri': 'https://someone-else.example/page',
    'blocked-uri': 'inline',
  } })), true, 'a full URL is reduced to a path and is still ours to judge');

  // Anything that did not reduce to a path is not a page on this site.
  assert.equal(plausible({ directive: 'script-src', blocked: 'inline', document: 'garbage' }), false);
  assert.equal(plausible(null), false);
});

test('a forged directive is refused', () => {
  assert.equal(plausible({ directive: 'script-src<img>', blocked: 'inline', document: '/a' }), false);
  assert.equal(plausible({ directive: '', blocked: 'inline', document: '/a' }), false);
});

/* ── the summary a human acts on ─────────────────────────────────────────── */

test('the summary is loudest first, because the top of it is the work', () => {
  const store = emptyStore(NOW);
  const quiet = { directive: 'font-src', blocked: 'https://f.test/a.woff', document: '/a' };
  const loud = { directive: 'script-src', blocked: 'inline', document: '/checkout' };
  mergeViolation(store, quiet, NOW);
  for (let i = 0; i < 9; i++) mergeViolation(store, loud, NOW);

  const s = summarise(store);
  assert.equal(s.entries[0].directive, 'script-src');
  assert.equal(s.entries[0].count, 9);
  assert.equal(s.distinct, 2);
  assert.equal(s.total, 10);
});

test('an empty or missing store summarises without throwing', () => {
  assert.deepEqual(summarise(null), { updatedAt: null, dropped: 0, distinct: 0, total: 0, entries: [] });
  assert.equal(summarise(emptyStore(NOW)).total, 0);
});

test('the default cap is the documented one', () => {
  assert.equal(FINGERPRINT_CAP, 200);
});

/* ── the flush path ──────────────────────────────────────────────────────── */

/**
 * Reports are buffered in the isolate and written once every 30 seconds, so
 * the thing that actually touches storage is a whole buffer, not a report.
 * `mergeViolation` in a loop would do the work the buffer exists to avoid —
 * four thousand merges to arrive at `count += 4000` — so the flush gets its
 * own path, and therefore its own tests.
 */
import { mergeEntry, mergeStore } from '../supabase/functions/server/cspReports.ts';

const entry = (over: Partial<import('../supabase/functions/server/cspReports.ts').CspEntry> = {}) => ({
  directive: 'img-src',
  blocked: 'https://cdn.test/a.png',
  document: '/work',
  count: 1,
  firstSeen: NOW,
  lastSeen: NOW,
  sample: 'https://cdn.test/a.png?v=1',
  ...over,
});

test('a buffered entry folds in with its whole count', () => {
  const store = emptyStore(NOW);
  mergeEntry(store, entry({ count: 4000 }));
  assert.equal(Object.values(store.entries)[0].count, 4000);
});

test('folding twice adds the counts and widens the window', () => {
  const store = emptyStore(NOW);
  mergeEntry(store, entry({ count: 3, firstSeen: NOW, lastSeen: NOW }));
  mergeEntry(store, entry({ count: 7, firstSeen: '2026-11-06T11:00:00.000Z', lastSeen: LATER }));

  const only = Object.values(store.entries)[0];
  assert.equal(only.count, 10);
  assert.equal(only.firstSeen, '2026-11-06T11:00:00.000Z', 'earliest sighting wins');
  assert.equal(only.lastSeen, LATER, 'latest sighting wins');
});

/**
 * The under-reporting bug this guards. Dropping a buffered entry of 500 as a
 * single `dropped += 1` would make an overflow of five hundred reports look
 * like one, and the summary is the thing the promotion decision is made on.
 */
test('an overflowing entry is dropped by its count, not by one', () => {
  const store = emptyStore(NOW);
  mergeEntry(store, entry({ blocked: 'https://a.test/x' }), 1);
  mergeEntry(store, entry({ blocked: 'https://b.test/x', count: 500 }), 1);

  assert.equal(Object.keys(store.entries).length, 1);
  assert.equal(store.dropped, 500);
});

test('a whole buffer folds in, carrying its own dropped count', () => {
  const store = emptyStore(NOW);
  const buffer = emptyStore(NOW);
  mergeViolation(buffer, { directive: 'script-src', blocked: 'inline', document: '/checkout' }, NOW);
  mergeViolation(buffer, { directive: 'script-src', blocked: 'inline', document: '/checkout' }, LATER);
  mergeViolation(buffer, { directive: 'font-src', blocked: 'https://f.test/a.woff', document: '/' }, NOW);
  buffer.dropped = 12;

  mergeStore(store, buffer);

  const s = summarise(store);
  assert.equal(s.distinct, 2);
  assert.equal(s.total, 3);
  assert.equal(s.dropped, 12, 'the buffer\u2019s own overflow is not lost at flush time');
});

test('flushing an empty buffer changes nothing', () => {
  const store = emptyStore(NOW);
  mergeViolation(store, { directive: 'img-src', blocked: 'x', document: '/a' }, NOW);
  const before = JSON.stringify(store.entries);

  mergeStore(store, emptyStore(LATER));

  assert.equal(JSON.stringify(store.entries), before);
  assert.equal(store.dropped, 0);
});
