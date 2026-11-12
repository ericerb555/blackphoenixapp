/**
 * What the assistant is allowed to say about security, and when it must
 * refuse to say it.
 *
 * Two failure modes are worth more than the rest put together, and both end
 * with somebody being told everything is fine when nobody knows that.
 *
 * The first is age. A probe that stopped running leaves exactly the same clean
 * last result as one that keeps passing, so staleness is asserted at its
 * boundary rather than somewhere comfortably past it.
 *
 * The second is a malformed post. Counts that go missing coerce to zero, "0
 * failed" gets stored, and the assistant reports all clear on the strength of
 * a broken request — a wrong answer nobody would think to question.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assess, parseProbeReport, STALE_AFTER_HOURS, type ProbeReport,
} from '../supabase/functions/server/securityPosture.ts';

const NOW = Date.parse('2026-11-12T00:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

const clean = (over: Partial<ProbeReport> = {}): ProbeReport => ({
  at: hoursAgo(2), passed: 14, failed: 0, warnings: 1, skipped: 2,
  failures: [], warned: [], ...over,
});

/* ── age, which is half the answer ───────────────────────────────────────── */

test('a result inside the window is reported with its age', () => {
  const a = assess(clean({ at: hoursAgo(26) }), NOW);
  assert.equal(a.stale, false);
  assert.match(a.verdict, /1 day\(s\) ago/);
});

test('a result past the window is stale, and the verdict says unknown not pass', () => {
  const a = assess(clean({ at: hoursAgo(STALE_AFTER_HOURS + 1) }), NOW);
  assert.equal(a.stale, true);
  assert.match(a.verdict, /unknown rather than as a pass/);
  // The point in one assertion: a clean run does not get to read as a pass
  // once nobody can vouch for when it happened.
  assert.doesNotMatch(a.verdict, /All 14 checks passed/);
});

test('the boundary itself is not yet stale', () => {
  assert.equal(assess(clean({ at: hoursAgo(STALE_AFTER_HOURS - 1) }), NOW).stale, false);
});

test('never having reported is stale, and blames the pipeline not the platform', () => {
  const a = assess(null, NOW);
  assert.equal(a.stale, true);
  assert.match(a.verdict, /gap in reporting, not a finding about the platform/);
});

test('an unparseable timestamp is treated as unknown age, never as fresh', () => {
  const a = assess(clean({ at: 'last Tuesday' }), NOW);
  assert.equal(a.stale, true);
  assert.equal(a.ageHours, null);
});

/* ── what a fresh result says ────────────────────────────────────────────── */

test('failures are named, so the answer is actionable rather than a number', () => {
  const a = assess(clean({
    failed: 2, passed: 12,
    failures: [{ id: 'WAF-1', title: 'no firewall' }, { id: 'CSP-1', title: 'report only' }],
  }), NOW);
  assert.match(a.verdict, /WAF-1, CSP-1/);
  assert.match(a.verdict, /2 controls/);
});

test('one failure reads as singular', () => {
  const a = assess(clean({ failed: 1, failures: [{ id: 'WAF-1', title: 'no firewall' }] }), NOW);
  assert.match(a.verdict, /1 control that should be in place is not/);
});

test('a clean run still says what it did NOT cover', () => {
  // The probe runs with a public key. A pass is a statement about the exposed
  // surface, and an answer that forgets to say so overclaims.
  assert.match(assess(clean(), NOW).verdict, /exposed surface.*not the source/);
});

test('a quick run says it skipped the slow checks', () => {
  assert.match(assess(clean({ mode: 'quick' }), NOW).verdict, /quick run/);
});

/* ── the posted body, which arrives over the network ─────────────────────── */

test('a body missing its counts is rejected, not stored as a pass', () => {
  // The dangerous one: {} would otherwise become "0 failed, all clear".
  for (const bad of [null, undefined, 'x', 42, {}, { passed: 3 }, { failed: 1 }]) {
    assert.equal(parseProbeReport(bad), null, `${JSON.stringify(bad)} must not parse`);
  }
});

test('negative or non-numeric counts are refused rather than coerced', () => {
  assert.equal(parseProbeReport({ passed: -1, failed: 0 }), null);
  assert.equal(parseProbeReport({ passed: 'lots', failed: 0 }), null);
});

test('a valid body parses, and findings without an id are dropped', () => {
  const r = parseProbeReport({
    at: hoursAgo(1), passed: 14, failed: 1,
    failures: [{ id: 'WAF-1', title: 'no firewall' }, { title: 'nameless' }],
  })!;
  assert.equal(r.failed, 1);
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].id, 'WAF-1');
});

test('a missing timestamp becomes now rather than nothing', () => {
  // Otherwise the report would parse and then immediately read as stale.
  const r = parseProbeReport({ passed: 1, failed: 0 })!;
  assert.ok(Number.isFinite(Date.parse(r.at)));
});

test('oversized fields are capped so one post cannot bloat the record', () => {
  const r = parseProbeReport({
    passed: 1, failed: 0,
    failures: Array.from({ length: 200 }, (_, i) => ({ id: `X-${i}`, title: 'x'.repeat(900) })),
  })!;
  assert.ok(r.failures.length <= 50);
  assert.ok(r.failures[0].title.length <= 200);
});
