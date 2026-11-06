/**
 * Is the Exchange running properly, and what needs doing?
 *
 * This is the brain behind the control page. The assistant reads what this
 * produces and explains it; it never names its own actions.
 *
 * THE TESTS THAT MATTER MOST are the ones about approval. Everything this
 * can execute is a closed union, and the two members that create sellable
 * inventory or put a town in front of the public must never be marked
 * 'auto' — not by an edit, not by a refactor, not by accident. A test that
 * fails when somebody loosens that is worth more than every other
 * assertion here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessExchange, describeHealth, autoActions, approvalActions,
  CLOCK_SILENT_HOURS, PUBLISH_MIN_LISTINGS, DEMAND_MIN_SEARCHES, COVERAGE_THIN_BELOW,
  type HealthInput,
} from '../supabase/functions/server/exchangeHealth.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const hoursAgo = (h: number) => new Date(Date.parse(NOW) - h * 3_600_000).toISOString();

/** A healthy, boring Exchange. Each test breaks exactly one thing. */
const healthy = (over: Partial<HealthInput> = {}): HealthInput => ({
  secretConfigured: true,
  refusedRecently: 0,
  failedRecently: 0,
  lastRunAt: hoursAgo(1),
  territories: Array.from({ length: 12 }, (_, i) => ({
    slug: `town-${i}`, name: `Town ${i}`, status: 'visible',
    listings: 30, lastCompiledAt: hoursAgo(24),
  })),
  demand: [],
  needsReview: 0,
  now: NOW,
  ...over,
});

const ids = (input: HealthInput) => assessExchange(input).map((f) => f.id);
const find = (input: HealthInput, id: string) => assessExchange(input).find((f) => f.id === id);

/* ── the approval boundary ───────────────────────────────────────────────── */

/**
 * The single most important assertion in this file. These two actions cost
 * money or reputation when they are wrong, and neither is undone by
 * pressing the button again.
 */
test('creating inventory and publishing to the public always ask first', () => {
  const findings = assessExchange(healthy({
    territories: [{ slug: 'pelham-nh', name: 'Pelham', status: 'hidden', listings: 40, lastCompiledAt: hoursAgo(10) }],
  }));
  for (const f of findings) {
    if (f.action && (f.action.kind === 'publish-town' || f.action.kind === 'add-towns')) {
      assert.equal(f.action.approval, 'ask', `${f.action.kind} must never be auto`);
      assert.ok(f.action.whyApproval, `${f.action.kind} must say why it is asking`);
    }
  }
});

test('nothing auto-runnable can create inventory or publish', () => {
  const findings = assessExchange(healthy({
    territories: [{ slug: 'a', name: 'A', status: 'hidden', listings: 99, lastCompiledAt: null }],
    demand: [{ category: 'Roofing', town: 'Salem', searches: 20 }],
    needsReview: 4, failedRecently: 5, lastRunAt: hoursAgo(99),
  }));
  for (const f of autoActions(findings)) {
    assert.ok(
      !['publish-town', 'add-towns'].includes(f.action!.kind),
      `${f.action!.kind} slipped into the auto set`,
    );
  }
});

test('every action declares an approval mode', () => {
  const findings = assessExchange(healthy({
    territories: [{ slug: 'a', name: 'A', status: 'hidden', listings: 99, lastCompiledAt: null }],
    needsReview: 2, lastRunAt: hoursAgo(99),
  }));
  for (const f of findings) {
    if (f.action) assert.ok(['auto', 'ask'].includes(f.action.approval), f.id);
  }
});

/* ── the clock ───────────────────────────────────────────────────────────── */

/**
 * The failure that started all this: pg_cron records a refused tick as
 * "succeeded", so a dead clock looks exactly like a quiet one.
 */
test('no secret is critical and offers no button', () => {
  const f = find(healthy({ secretConfigured: false }), 'clock.no-secret')!;
  assert.equal(f.severity, 'critical');
  assert.equal(f.action, undefined, 'a web page must not mint the credential guarding the directory');
  assert.match(f.detail, /succeeded/, 'says why it fails silently');
});

test('a mismatched secret is critical and distinct from a missing one', () => {
  const out = ids(healthy({ refusedRecently: 4 }));
  assert.ok(out.includes('clock.refused'));
  assert.ok(!out.includes('clock.no-secret'), 'different cause, different advice');
});

test('a clock that has never run is critical', () => {
  assert.equal(find(healthy({ lastRunAt: null }), 'clock.never-run')!.severity, 'critical');
});

test('a silent clock is critical and can be kicked', () => {
  const f = find(healthy({ lastRunAt: hoursAgo(CLOCK_SILENT_HOURS + 2) }), 'clock.silent')!;
  assert.equal(f.severity, 'critical');
  assert.equal(f.action!.kind, 'run-upkeep-now');
  assert.equal(f.action!.approval, 'auto', 'this is what the clock does anyway');
});

test('one quiet night is not a stopped clock', () => {
  assert.ok(!ids(healthy({ lastRunAt: hoursAgo(CLOCK_SILENT_HOURS - 2) })).includes('clock.silent'));
});

/** Overpass refusing is expected, not exceptional. */
test('occasional failures are a warning, not a crisis', () => {
  assert.equal(find(healthy({ failedRecently: 4 }), 'clock.failing')!.severity, 'warning');
  assert.ok(!ids(healthy({ failedRecently: 2 })).includes('clock.failing'), 'two is noise');
});

/* ── the map ─────────────────────────────────────────────────────────────── */

test('a thin map is flagged, because coverage is the inventory', () => {
  const f = find(healthy({ territories: healthy().territories.slice(0, COVERAGE_THIN_BELOW - 1) }), 'map.thin')!;
  assert.equal(f.severity, 'warning');
  assert.equal(f.action!.kind, 'discover-county');
  assert.equal(f.action!.approval, 'auto', 'discovery writes nothing');
});

test('uncompiled towns are named, not just counted', () => {
  const f = find(healthy({
    territories: [
      { slug: 'a', name: 'Amherst', status: 'hidden', listings: 0, lastCompiledAt: null },
      ...healthy().territories,
    ],
  }), 'map.uncompiled')!;
  assert.match(f.detail, /Amherst/);
});

test('a hidden town with enough listings is offered for publishing', () => {
  const f = find(healthy({
    territories: [{ slug: 'pelham-nh', name: 'Pelham', status: 'hidden', listings: PUBLISH_MIN_LISTINGS, lastCompiledAt: hoursAgo(5) }],
  }), 'map.publish.pelham-nh')!;
  assert.equal(f.action!.kind, 'publish-town');
  assert.equal(f.action!.params.slug, 'pelham-nh');
});

/** "A town with nine businesses reads as a broken product rather than a new one." */
test('a hidden town with too few listings is left alone', () => {
  const out = ids(healthy({
    territories: [{ slug: 'pelham-nh', name: 'Pelham', status: 'hidden', listings: PUBLISH_MIN_LISTINGS - 1, lastCompiledAt: hoursAgo(5) }],
  }));
  assert.ok(!out.some((i) => i.startsWith('map.publish')));
});

test('an already visible town is not offered for publishing', () => {
  assert.ok(!ids(healthy()).some((i) => i.startsWith('map.publish')));
});

/* ── demand: what people looked for and did not find ─────────────────────── */

test('real demand is surfaced, and offers no button', () => {
  const f = find(healthy({ demand: [{ category: 'Roofing', town: 'Salem', searches: 14 }] }),
    'demand.roofing.salem')!;
  assert.match(f.title, /14 searches for Roofing in Salem/);
  assert.equal(f.action, undefined, 'recruiting a roofer is not something software does');
});

test('a handful of searches is not yet a signal', () => {
  const out = ids(healthy({ demand: [{ category: 'Roofing', town: 'Salem', searches: DEMAND_MIN_SEARCHES - 1 }] }));
  assert.equal(out.filter((i) => i.startsWith('demand.')).length, 0);
});

test('the busiest gaps come first and the list is capped', () => {
  const demand = Array.from({ length: 9 }, (_, i) => ({ category: `Cat${i}`, town: 'Salem', searches: 10 + i }));
  const shown = assessExchange(healthy({ demand })).filter((f) => f.id.startsWith('demand.'));
  assert.equal(shown.length, 5, 'a worklist, not a dump');
  assert.match(shown[0].title, /18 searches/, 'busiest first');
});

test('an unclassifiable phrase is still reported', () => {
  const f = assessExchange(healthy({ demand: [{ category: null, town: null, searches: 9 }] }))
    .find((x) => x.id.startsWith('demand.'))!;
  assert.match(f.title, /could not classify/);
});

/* ── liveness ────────────────────────────────────────────────────────────── */

test('listings that may have closed are raised, and nothing is auto-deleted', () => {
  const f = find(healthy({ needsReview: 7 }), 'listings.review')!;
  assert.equal(f.action!.kind, 'open-review-list');
  assert.match(f.detail, /Nothing has been deleted/);
});

/* ── the whole picture ───────────────────────────────────────────────────── */

test('a healthy Exchange reports nothing outstanding', () => {
  assert.deepEqual(assessExchange(healthy()), []);
  assert.match(describeHealth([]), /nothing outstanding/);
});

test('worst first', () => {
  const findings = assessExchange(healthy({
    secretConfigured: false, failedRecently: 5, needsReview: 2,
    demand: [{ category: 'Roofing', town: 'Salem', searches: 12 }],
  }));
  const sev = findings.map((f) => f.severity);
  assert.deepEqual([...sev].sort((a, b) => ({ critical: 0, warning: 1, info: 2 } as any)[a] - ({ critical: 0, warning: 1, info: 2 } as any)[b]), sev);
});

test('the headline counts what is stopping it, not what is merely suggested', () => {
  assert.match(describeHealth(assessExchange(healthy({ secretConfigured: false }))), /stopping the Exchange/);
  assert.match(describeHealth(assessExchange(healthy({ failedRecently: 5 }))), /worth attention/);
});

test('the two action lists do not overlap and cover every action', () => {
  const findings = assessExchange(healthy({
    territories: [{ slug: 'a', name: 'A', status: 'hidden', listings: 50, lastCompiledAt: null }],
    needsReview: 1, lastRunAt: hoursAgo(99),
  }));
  const withAction = findings.filter((f) => f.action).length;
  assert.equal(autoActions(findings).length + approvalActions(findings).length, withAction);
});

test('rubbish in does not throw', () => {
  assert.deepEqual(assessExchange({} as any).filter((f) => f.severity === 'critical').length > 0, true);
  assert.ok(Array.isArray(assessExchange(null as any)));
});
