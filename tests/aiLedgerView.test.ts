/**
 * What Mission Control is allowed to tell the owner about his own system.
 *
 * The rule worth pinning hardest is `isStuck`. A ledger row is opened before
 * the model is called and closed after it answers, so a row saying `running`
 * means one of two very different things: work genuinely in progress, or a
 * handler that died without recording anything. Too tight a threshold reports
 * live work as broken and teaches the owner to ignore the indicator; too
 * loose and a dead call shows as busy forever.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STUCK_AFTER_MS, isStuck, effectiveState, summarise, byAgent, concerns,
  type LedgerRow,
} from '../supabase/functions/server/aiLedgerView.ts';

const NOW = Date.parse('2026-11-08T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function row(over: Partial<LedgerRow> = {}): LedgerRow {
  return { started_at: ago(1000), agent: 'quote-generator', outcome: 'ok', ...over };
}

/* ── running vs abandoned ────────────────────────────────────────────────── */

test('a call that just started is running, not stuck', () => {
  assert.equal(isStuck(row({ outcome: 'running', started_at: ago(5_000) }), NOW), false);
});

test('a long blueprint read is still running at two minutes', () => {
  // The slowest real call here is a vision read over several full-size
  // sheets. Flagging that as dead would be the indicator crying wolf.
  assert.equal(isStuck(row({ outcome: 'running', started_at: ago(120_000) }), NOW), false);
});

test('a call still open past the threshold is abandoned', () => {
  const r = row({ outcome: 'running', started_at: ago(STUCK_AFTER_MS + 1000) });
  assert.equal(isStuck(r, NOW), true);
  assert.equal(effectiveState(r, NOW), 'abandoned');
});

test('a finished call is never stuck, however old', () => {
  assert.equal(isStuck(row({ outcome: 'ok', started_at: ago(99 * 3600_000) }), NOW), false);
  assert.equal(isStuck(row({ outcome: 'error', started_at: ago(99 * 3600_000) }), NOW), false);
});

test('an unparseable timestamp is not called stuck', () => {
  // Guessing from a broken row would invent an incident out of bad data.
  assert.equal(isStuck(row({ outcome: 'running', started_at: 'not a date' }), NOW), false);
});

/* ── summarise ───────────────────────────────────────────────────────────── */

test('outcomes are counted separately, and abandoned is split out of running', () => {
  const s = summarise([
    row({ outcome: 'ok' }),
    row({ outcome: 'ok' }),
    row({ outcome: 'refused' }),
    row({ outcome: 'error' }),
    row({ outcome: 'running', started_at: ago(1000) }),
    row({ outcome: 'running', started_at: ago(STUCK_AFTER_MS + 1) }),
  ], NOW);
  assert.equal(s.total, 6);
  assert.equal(s.ok, 2);
  assert.equal(s.refused, 1);
  assert.equal(s.errors, 1);
  assert.equal(s.running, 1);
  assert.equal(s.abandoned, 1);
});

test('cost adds up and survives nulls and strings', () => {
  // Postgres numeric comes back as a string through PostgREST.
  const s = summarise([
    row({ cost_cents: '1.25' }),
    row({ cost_cents: 2.5 }),
    row({ cost_cents: null }),
    row({ cost_cents: undefined }),
  ], NOW);
  assert.equal(s.estimatedCostCents, 3.75);
});

test('only calls that changed something count as actions', () => {
  const s = summarise([
    row({ action_taken: 'emailed the lead' }),
    row({ action_taken: null }),
    row({}),
  ], NOW);
  assert.equal(s.actionsTaken, 1);
});

test('duration is a median, so one slow call does not set the figure', () => {
  const s = summarise([
    row({ duration_ms: 100 }), row({ duration_ms: 120 }),
    row({ duration_ms: 140 }), row({ duration_ms: 90_000 }),
  ], NOW);
  // The mean here is over 22 seconds, which would describe none of them.
  assert.equal(s.medianDurationMs, 130);
});

test('an empty window reports zeroes rather than throwing', () => {
  const s = summarise([], NOW);
  assert.equal(s.total, 0);
  assert.equal(s.estimatedCostCents, 0);
  assert.equal(s.medianDurationMs, null);
});

/* ── byAgent ─────────────────────────────────────────────────────────────── */

test('agents are rolled up busiest first', () => {
  const rollup = byAgent([
    row({ agent: 'design-assistant' }),
    row({ agent: 'quote-generator' }),
    row({ agent: 'quote-generator' }),
    row({ agent: 'quote-generator' }),
  ], NOW);
  assert.equal(rollup[0].agent, 'quote-generator');
  assert.equal(rollup[0].total, 3);
  assert.equal(rollup[1].agent, 'design-assistant');
});

test('an agent rollup carries when it was last seen', () => {
  const rollup = byAgent([
    row({ agent: 'a', started_at: ago(50_000) }),
    row({ agent: 'a', started_at: ago(10_000) }),
  ], NOW);
  assert.equal(rollup[0].lastSeen, ago(10_000));
});

test('a row with no agent is grouped rather than dropped', () => {
  const rollup = byAgent([row({ agent: '' as any })], NOW);
  assert.equal(rollup[0].agent, 'unknown');
  assert.equal(rollup[0].total, 1);
});

/* ── concerns ────────────────────────────────────────────────────────────── */

test('a healthy window raises nothing', () => {
  const rows = Array.from({ length: 10 }, () => row({ outcome: 'ok' }));
  assert.deepEqual(concerns(summarise(rows, NOW)), []);
});

test('one failure in six hundred is not an incident', () => {
  const rows = [
    ...Array.from({ length: 599 }, () => row({ outcome: 'ok' })),
    row({ outcome: 'error' }),
  ];
  assert.deepEqual(concerns(summarise(rows, NOW)), []);
});

test('a fifth of calls failing is', () => {
  const rows = [
    ...Array.from({ length: 8 }, () => row({ outcome: 'ok' })),
    row({ outcome: 'error' }), row({ outcome: 'error' }),
  ];
  const reasons = concerns(summarise(rows, NOW));
  assert.equal(reasons.length, 1);
  assert.match(reasons[0], /20% of calls failed/);
});

test('a single failure on a quiet day does not read as 100%', () => {
  // Without the floor, one error out of one call is a screaming dashboard.
  const reasons = concerns(summarise([row({ outcome: 'error' })], NOW));
  assert.deepEqual(reasons, []);
});

test('an abandoned call is always worth saying, even one', () => {
  const reasons = concerns(summarise([
    row({ outcome: 'running', started_at: ago(STUCK_AFTER_MS + 1) }),
  ], NOW));
  assert.equal(reasons.length, 1);
  assert.match(reasons[0], /never finished/);
});

test('concerns are phrased, not just flagged', () => {
  // "Degraded" with no reason is an indicator people learn to scroll past.
  const reasons = concerns(summarise([
    row({ outcome: 'running', started_at: ago(STUCK_AFTER_MS + 1) }),
    row({ outcome: 'running', started_at: ago(STUCK_AFTER_MS + 2) }),
  ], NOW));
  assert.match(reasons[0], /2 calls started and never finished/);
});
