/**
 * The payment schedule, and the one property that matters.
 *
 * THE DRAWS MUST SUM TO THE CONTRACT TOTAL. Every other test here is detail;
 * that one is the product. A schedule a cent out from its own contract is
 * something the customer finds while checking the maths, and at that point
 * every other number on the document is in question too.
 *
 * So it is tested twice: on worked examples a human can verify by hand, and
 * then on a few thousand randomised contracts, because proportional splitting
 * is exactly the kind of arithmetic that works on the numbers you thought of
 * and fails on 3 phases of $1,000.01.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPaymentSchedule,
  scheduleTotal,
  scheduleOutstanding,
  allocate,
} from '../src/app/lib/paymentSchedule.ts';

const PHASES = [
  { title: 'Strip out', subtotal: 1508 },
  { title: 'Structural', subtotal: 4390 },
  { title: 'Second fix', subtotal: 13754 },
];
const TOTAL = 21371.55;

/* ── the shape of it ─────────────────────────────────────────────────────── */

test('a deposit, then one draw per phase', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  assert.equal(s.length, 4);
  assert.equal(s[0].type, 'deposit');
  assert.deepEqual(s.slice(1).map((d) => d.phase), ['Strip out', 'Structural', 'Second fix']);
  assert.ok(s.every((d) => d.status === 'pending'));
});

test('the deposit is the stated percentage of the contract', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  assert.equal(s[0].amount, 6411.47);
  assert.match(s[0].label, /30%/);
});

test('each phase draw is its share of the contract less its share of the deposit', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  for (const d of s.filter((x) => x.type === 'phase')) {
    assert.equal(
      Math.round((d.phaseValue! - d.depositCredit!) * 100) / 100,
      d.amount,
      `${d.label}: value - credit must equal the draw exactly`,
    );
  }
});

test('the phase values sum to the whole contract', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  const value = s.filter((d) => d.type === 'phase').reduce((a, d) => a + d.phaseValue!, 0);
  assert.equal(Math.round(value * 100) / 100, TOTAL);
});

test('a bigger phase draws more than a smaller one', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  const [strip, structural, second] = s.filter((d) => d.type === 'phase');
  assert.ok(strip.amount < structural.amount);
  assert.ok(structural.amount < second.amount);
});

test('triggers name the phase rather than a date nobody agreed', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  assert.match(s[0].trigger, /acceptance/i);
  assert.match(s[1].trigger, /completion of strip out/i);
  for (const d of s) assert.ok(!/\d{4}-\d{2}-\d{2}/.test(d.trigger), 'no invented dates');
});

/* ── THE PROPERTY ────────────────────────────────────────────────────────── */

test('the draws sum to the contract total, exactly', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  assert.equal(scheduleTotal(s), TOTAL);
});

test('the draws sum to the total across thousands of random contracts', () => {
  // A deterministic generator, so a failure is reproducible rather than a
  // thing that happened once in CI and never again.
  let seed = 20261022;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  for (let run = 0; run < 4000; run++) {
    const phaseCount = Math.floor(rnd() * 7);
    const phases = Array.from({ length: phaseCount }, (_, i) => ({
      title: `Phase ${i + 1}`,
      subtotal: Math.round(rnd() * 5000000) / 100,
    }));
    const total = Math.round(rnd() * 20000000) / 100;
    const depositRate = Math.round(rnd() * 100) / 100;

    const s = buildPaymentSchedule({ phases, total, depositRate });
    assert.equal(
      scheduleTotal(s),
      total,
      `run ${run}: ${phaseCount} phases, total ${total}, deposit ${depositRate}`,
    );
  }
});

test('the awkward cases that break proportional splitting', () => {
  const cases = [
    { phases: [{ title: 'A', subtotal: 1000.01 }, { title: 'B', subtotal: 1000.01 }, { title: 'C', subtotal: 1000.01 }], total: 3000.03, depositRate: 0.3 },
    { phases: [{ title: 'A', subtotal: 1 }, { title: 'B', subtotal: 1 }, { title: 'C', subtotal: 1 }], total: 0.01, depositRate: 0.3 },
    { phases: [{ title: 'A', subtotal: 1 }, { title: 'B', subtotal: 2 }], total: 0.03, depositRate: 0 },
    { phases: [{ title: 'A', subtotal: 0.01 }, { title: 'B', subtotal: 999999 }], total: 1000000, depositRate: 0.5 },
  ];
  for (const c of cases) {
    assert.equal(scheduleTotal(buildPaymentSchedule(c)), c.total, JSON.stringify(c));
  }
});

/* ── degenerate input, which still has to produce a usable schedule ──────── */

test('a quote with no phases still gets a deposit and a balance', () => {
  const s = buildPaymentSchedule({ phases: [], total: 5000, depositRate: 0.3 });
  assert.deepEqual(s.map((d) => d.type), ['deposit', 'balance']);
  assert.equal(scheduleTotal(s), 5000);
});

test('a zero deposit skips the deposit draw rather than billing nothing', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0 });
  assert.ok(!s.some((d) => d.type === 'deposit'));
  assert.equal(scheduleTotal(s), TOTAL);
});

test('a full deposit leaves phase draws that are all zero, and still balances', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: 1000, depositRate: 1 });
  assert.equal(s[0].amount, 1000);
  assert.ok(s.slice(1).every((d) => d.amount === 0));
  assert.equal(scheduleTotal(s), 1000);
});

test('a zero-value contract produces a schedule rather than nothing at all', () => {
  const s = buildPaymentSchedule({ phases: [], total: 0, depositRate: 0.3 });
  assert.equal(s.length, 1);
  assert.equal(scheduleTotal(s), 0);
});

test('phases with no value share the money evenly instead of losing it', () => {
  const s = buildPaymentSchedule({
    phases: [{ title: 'A', subtotal: 0 }, { title: 'B', subtotal: 0 }],
    total: 100, depositRate: 0,
  });
  assert.equal(scheduleTotal(s), 100);
  assert.deepEqual(s.map((d) => d.amount), [50, 50]);
});

test('blank phase titles are dropped, not billed as an unnamed draw', () => {
  const s = buildPaymentSchedule({
    phases: [{ title: '  ', subtotal: 500 }, { title: 'Real', subtotal: 500 }],
    total: 1000, depositRate: 0,
  });
  assert.equal(s.length, 1);
  assert.equal(s[0].phase, 'Real');
  assert.equal(scheduleTotal(s), 1000);
});

test('rubbish input does not throw', () => {
  for (const bad of [
    { phases: null as any, total: NaN, depositRate: NaN },
    { phases: 'nope' as any, total: 100, depositRate: 2 },
    { phases: [null, undefined] as any, total: 100, depositRate: -1 },
  ]) {
    assert.doesNotThrow(() => buildPaymentSchedule(bad));
  }
});

/* ── the allocator on its own ────────────────────────────────────────────── */

test('allocate never loses or invents a cent', () => {
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocate(10, [1, 0]), [10, 0]);
  assert.deepEqual(allocate(0, [5, 5]), [0, 0]);
  assert.deepEqual(allocate(7, []), []);
  for (const [t, w] of [[101, [1, 1, 1]], [1, [1, 1]], [999, [7, 11, 13]]] as Array<[number, number[]]>) {
    assert.equal(allocate(t, w).reduce((a, b) => a + b, 0), t);
  }
});

test('allocate handles a negative total, for a credit-heavy contract', () => {
  const out = allocate(-100, [1, 1, 1]);
  assert.equal(out.reduce((a, b) => a + b, 0), -100);
});

/* ── what is left to raise ───────────────────────────────────────────────── */

test('outstanding counts only what has not been raised', () => {
  const s = buildPaymentSchedule({ phases: PHASES, total: TOTAL, depositRate: 0.3 });
  assert.equal(scheduleOutstanding(s), TOTAL);
  s[0].status = 'paid';
  s[1].status = 'invoiced';
  assert.equal(
    scheduleOutstanding(s),
    Math.round((TOTAL - s[0].amount - s[1].amount) * 100) / 100,
  );
});
