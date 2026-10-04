/**
 * The price watcher's judgement.
 *
 * WHY THESE ASSERTIONS
 *
 * Every failure mode here is silent. A watcher that proposes a 40% rise because
 * a divisor was one does not throw — it writes a confident sentence into the
 * place Eric looks and waits to be approved. A watcher that proposes nothing
 * because a count was read as a string looks exactly like a quiet month.
 *
 * So what is pinned is: the guardrails actually bind, a ratio is never taken
 * from a sample too small to mean anything, the labour floor outranks the
 * waiting period, and every proposal carries the figure that triggered it —
 * which is the half Eric asked for in so many words ("and why").
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  proposalsFor, clampMove, moveIsAllowed, daysSince, summarise,
  DEFAULT_GUARDRAILS, MIN_SAMPLE, type PriceSignals,
} from '../supabase/functions/server/priceWatchRules.ts';

const NOW = Date.parse('2026-10-04T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

const rung = (over: Partial<PriceSignals> = {}): PriceSignals => ({
  id: 'plan_tier:vendor:advanced',
  audience: 'vendor',
  rung: 'advanced',
  priceCents: 11600,
  lastChangedAt: daysAgo(200),
  ...over,
});

// ─── Guardrails ──────────────────────────────────────────────────────────────

test('a price that moved recently is left alone, and the reason says how recently', () => {
  const held = moveIsAllowed(rung({ lastChangedAt: daysAgo(10) }), DEFAULT_GUARDRAILS, NOW);
  assert.equal(held.ok, false);
  assert.match(held.reason || '', /10 days ago/);
  assert.match(held.reason || '', /90 days/);
});

test('a price that has never moved may move', () => {
  assert.equal(moveIsAllowed(rung({ lastChangedAt: null }), DEFAULT_GUARDRAILS, NOW).ok, true);
});

test('a rung with no price yet is not a candidate', () => {
  const none = moveIsAllowed(rung({ priceCents: 0 }), DEFAULT_GUARDRAILS, NOW);
  assert.equal(none.ok, false);
  assert.match(none.reason || '', /no price yet/);
});

test('the move cap clamps rather than refusing, in both directions', () => {
  // A rule wanting +25% should still get +10%: the direction is the judgement,
  // the size is what the guardrail is for.
  assert.equal(clampMove(10000, 12500), 11000);
  assert.equal(clampMove(10000, 5000), 9000);
});

test('the floor beats the clamp, and the ceiling does too', () => {
  assert.equal(clampMove(10000, 5000, { ...DEFAULT_GUARDRAILS, floorCents: 9500 }), 9500);
  assert.equal(clampMove(10000, 12000, { ...DEFAULT_GUARDRAILS, ceilingCents: 10500 }), 10500);
});

test('a clamp that lands on the current price proposes nothing', () => {
  // Otherwise the watcher proposes changing a price to itself, which reads as
  // noise and trains somebody to stop reading it.
  assert.equal(clampMove(10000, 12000, { ...DEFAULT_GUARDRAILS, ceilingCents: 10000 }), null);
  assert.equal(clampMove(0, 5000), null);
});

test('an unreadable timestamp is not treated as ancient', () => {
  assert.equal(daysSince('not a date', NOW), null);
  assert.equal(daysSince(null, NOW), null);
  assert.equal(daysSince(daysAgo(3), NOW), 3);
});

// ─── Samples too small to mean anything ──────────────────────────────────────

test('a perfect conversion rate on a tiny sample proposes nothing', () => {
  // Two out of two is a coincidence, not a signal, and a price moved on it gets
  // moved back next month.
  for (let n = 1; n < MIN_SAMPLE; n++) {
    const found = proposalsFor(rung({ trialsEnded: n, trialsConverted: n }), DEFAULT_GUARDRAILS, NOW);
    assert.deepEqual(found, [], `${n} trial(s) should not move a price`);
  }
});

test('churn on a tiny subscriber count proposes nothing', () => {
  const found = proposalsFor(rung({ subscribers: 3, cancelledLastMonth: 3 }), DEFAULT_GUARDRAILS, NOW);
  assert.deepEqual(found, []);
});

test('a quiet rung proposes nothing at all', () => {
  assert.deepEqual(proposalsFor(rung(), DEFAULT_GUARDRAILS, NOW), []);
  assert.equal(summarise([]), 'nothing to propose');
});

// ─── The rules themselves ────────────────────────────────────────────────────

test('a nearly full band is proposed for a rise, with the count as the reason', () => {
  const [p] = proposalsFor(rung({ spotsTotal: 10, spotsTaken: 9 }), DEFAULT_GUARDRAILS, NOW);
  assert.equal(p.kind, 'raise-capacity');
  assert.equal(p.toCents, 12760);                 // +10% of 11600
  assert.match(p.because, /9 of 10/);
  assert.match(p.because, /90%/);
  assert.ok(p.expect.length > 20, 'a proposal must say what it expects to achieve');
});

test('a band that has sold nothing for a quarter is proposed for a cut', () => {
  const [p] = proposalsFor(
    rung({ spotsTotal: 10, spotsTaken: 0, monthsAtCurrentCapacity: 4 }),
    DEFAULT_GUARDRAILS, NOW,
  );
  assert.equal(p.kind, 'lower-capacity');
  assert.equal(p.toCents, 10440);                 // -10%
  assert.match(p.because, /4 months/);
});

test('an empty band that has only just opened is left alone', () => {
  const found = proposalsFor(
    rung({ spotsTotal: 10, spotsTaken: 0, monthsAtCurrentCapacity: 1 }),
    DEFAULT_GUARDRAILS, NOW,
  );
  assert.deepEqual(found, []);
});

test('trials that used the product and declined the price propose a cut', () => {
  const [p] = proposalsFor(rung({ trialsEnded: 12, trialsConverted: 2 }), DEFAULT_GUARDRAILS, NOW);
  assert.equal(p.kind, 'lower-trial-conversion');
  assert.match(p.because, /2 of 12/);
  assert.match(p.because, /17%/);
});

test('trials almost nobody refuses propose a rise', () => {
  const [p] = proposalsFor(rung({ trialsEnded: 10, trialsConverted: 9 }), DEFAULT_GUARDRAILS, NOW);
  assert.equal(p.kind, 'raise-trial-conversion');
  assert.match(p.because, /90%/);
});

test('churn above a tenth of the rung proposes a cut', () => {
  const [p] = proposalsFor(rung({ subscribers: 20, cancelledLastMonth: 3 }), DEFAULT_GUARDRAILS, NOW);
  assert.equal(p.kind, 'lower-churn');
  assert.match(p.because, /3 of 20/);
});

test('an add-on nobody takes raises a question, not a number', () => {
  const [p] = proposalsFor(rung({ addOnOffered: 15, addOnTaken: 0 }), DEFAULT_GUARDRAILS, NOW);
  assert.equal(p.kind, 'review-attach-rate');
  assert.equal(p.toCents, null, 'the price may not be the thing that is wrong');
  assert.match(p.because, /none of the 15/);
});

// ─── The labour floor outranks everything ────────────────────────────────────

test('a price below the labour in it is raised even inside the waiting period', () => {
  // Every other rule is an optimisation and can wait ninety days. A price under
  // what the work costs loses money on every sale, so it does not wait.
  const [p] = proposalsFor(
    rung({ priceCents: 8000, labourFloorCents: 9500, lastChangedAt: daysAgo(2) }),
    DEFAULT_GUARDRAILS, NOW,
  );
  assert.equal(p.kind, 'raise-labour-floor');
  assert.equal(p.toCents, 9500);
  assert.match(p.because, /\$80\.00/);
  assert.match(p.because, /\$95\.00/);
});

test('the labour floor is not clamped to ten percent', () => {
  // A rung priced at half the labour in it has to reach the floor, not creep
  // towards it over a year of ninety-day steps.
  const [p] = proposalsFor(
    rung({ priceCents: 5000, labourFloorCents: 15000 }),
    DEFAULT_GUARDRAILS, NOW,
  );
  assert.equal(p.toCents, 15000);
});

test('an underwater rung proposes only the floor, nothing else', () => {
  const found = proposalsFor(
    rung({ priceCents: 8000, labourFloorCents: 9500, spotsTotal: 10, spotsTaken: 10, trialsEnded: 20, trialsConverted: 19 }),
    DEFAULT_GUARDRAILS, NOW,
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'raise-labour-floor');
});

test('a price already above its labour floor is not touched for it', () => {
  const found = proposalsFor(rung({ priceCents: 11600, labourFloorCents: 9500 }), DEFAULT_GUARDRAILS, NOW);
  assert.deepEqual(found, []);
});

// ─── Every proposal is answerable ────────────────────────────────────────────

test('every proposal names a figure and an expected effect', () => {
  const cases: Partial<PriceSignals>[] = [
    { spotsTotal: 10, spotsTaken: 10 },
    { spotsTotal: 10, spotsTaken: 0, monthsAtCurrentCapacity: 6 },
    { trialsEnded: 20, trialsConverted: 1 },
    { trialsEnded: 20, trialsConverted: 20 },
    { subscribers: 40, cancelledLastMonth: 8 },
    { addOnOffered: 10, addOnTaken: 0 },
    { priceCents: 1000, labourFloorCents: 5000 },
  ];
  for (const over of cases) {
    for (const p of proposalsFor(rung(over), DEFAULT_GUARDRAILS, NOW)) {
      assert.match(p.because, /[0-9]/, `${p.kind} gives no figure`);
      assert.ok(p.expect.length > 20, `${p.kind} does not say what it expects`);
      assert.ok(p.audience && p.rung, `${p.kind} does not say what it is about`);
      if (p.toCents !== null) assert.notEqual(p.toCents, p.fromCents, `${p.kind} proposes no change`);
    }
  }
});

test('a rung carrying several signals reports all of them', () => {
  const found = proposalsFor(
    rung({ spotsTotal: 10, spotsTaken: 9, addOnOffered: 12, addOnTaken: 0 }),
    DEFAULT_GUARDRAILS, NOW,
  );
  assert.equal(found.length, 2);
  assert.equal(summarise(found), '1 price change proposed, 1 question');
});
