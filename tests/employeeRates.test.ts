/**
 * What an employee's hour costs.
 *
 * The test that matters most is the salary one. The HR side stores an ANNUAL
 * figure for salaried staff, and job costing multiplies a rate by hours. Feed
 * 72,000 straight in and one day of a project manager's time costs the job
 * half a million — the margin inverts, the rate-learning loop is fed from it,
 * and nothing throws anywhere along the way.
 *
 * The second rule pinned here: an unknown rate is NULL, never zero. Zero is a
 * claim that the labour was free, which understates cost and flatters margin.
 * `jobOutcome` counts unknowns separately so a job with unpriced hours reports
 * a gap instead of a good result.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hourlyCostRate,
  burdenedHourlyCost, hourlyBillRate, hourlyMargin, HOURS_PER_YEAR,
} from '../supabase/functions/server/employeeRates.ts';

/* ── the salary trap ─────────────────────────────────────────────────────── */

test('a salary is divided into an hourly cost, not used as one', () => {
  const rate = hourlyCostRate({ payType: 'salary', payRate: 72000 });
  assert.equal(rate, 72000 / HOURS_PER_YEAR);
  assert.ok(rate! < 40, 'a project manager costs tens per hour, not tens of thousands');
});

test('the divisor is a full working year', () => {
  assert.equal(HOURS_PER_YEAR, 2080, '40 hours, 52 weeks');
  assert.equal(hourlyCostRate({ payType: 'salary', payRate: 52000 }), 25);
});

test('an hourly rate is left alone', () => {
  assert.equal(hourlyCostRate({ payType: 'hourly', payRate: 45 }), 45);
});

test('an unstated pay type is treated as hourly', () => {
  assert.equal(hourlyCostRate({ payRate: 45 }), 45,
    'the existing records carry no payType, and 45 is plainly not a salary');
});

test('the salary check is not case sensitive', () => {
  assert.equal(hourlyCostRate({ payType: 'Salary' as any, payRate: 52000 }), 25);
});

/* ── unknown is not zero ─────────────────────────────────────────────────── */

test('no rate at all is null, not zero', () => {
  for (const employee of [{}, { payRate: null }, { payRate: '' }, { payRate: undefined }]) {
    assert.equal(hourlyCostRate(employee), null,
      'zero would cost the labour at nothing and overstate the margin');
  }
  assert.equal(hourlyCostRate(null), null);
  assert.equal(hourlyCostRate(undefined), null);
});

test('a rate of zero is unknown, matching how jobOutcome already reads it', () => {
  assert.equal(hourlyCostRate({ payRate: 0 }), null);
});

test('rubbish is null rather than NaN', () => {
  assert.equal(hourlyCostRate({ payRate: 'lots' as any }), null);
  assert.equal(hourlyCostRate({ payRate: -50 }), null, 'a negative wage is not a wage');
});

test('a numeric string is a rate, because form fields produce strings', () => {
  assert.equal(hourlyCostRate({ payType: 'hourly', payRate: '45' }), 45);
});

/* ── the bill rate ───────────────────────────────────────────────────────── */

test('the bill rate is hourly whatever the pay type', () => {
  assert.equal(hourlyBillRate({ payType: 'salary', payRate: 72000, billRate: 95 }), 95,
    'a salaried person is still charged out by the hour');
});

test('no bill rate is null', () => {
  assert.equal(hourlyBillRate({ billRate: 0 }), null);
  assert.equal(hourlyBillRate({}), null);
});

/* ── the margin, which is why both exist ─────────────────────────────────── */

test('the margin needs both rates or it is not reported', () => {
  assert.equal(hourlyMargin({ payRate: 45 }), null, 'no bill rate, no margin');
  assert.equal(hourlyMargin({ billRate: 95 }), null, 'no cost, no margin');
  assert.equal(hourlyMargin({}), null);
});

test('the margin is the gap between what is paid and what is charged', () => {
  const m = hourlyMargin({ payType: 'hourly', payRate: 45, billRate: 95 })!;
  assert.equal(m.cost, 45);
  assert.equal(m.bill, 95);
  assert.equal(m.profit, 50);
  assert.ok(Math.abs(m.percent - 52.63) < 0.01);
});

test('a salaried person margins against their DERIVED hourly cost', () => {
  const m = hourlyMargin({ payType: 'salary', payRate: 72000, billRate: 95 })!;
  assert.ok(Math.abs(m.cost - 34.615) < 0.01);
  assert.ok(m.profit > 60, 'against the annual figure this would read as a vast loss');
});

test('billing below cost is reported, not hidden', () => {
  const m = hourlyMargin({ payRate: 60, billRate: 45 })!;
  assert.equal(m.profit, -15);
  assert.ok(m.percent < 0,
    'somebody looking at this screen needs to see it, not have it rounded away');
});

/* ── the employer's own costs ─────────────────────────────────────────── */

test('burden is added to a W-2 hour', () => {
  // 25/hr with 20% employer burden really costs 30.
  assert.equal(burdenedHourlyCost({ payType: 'hourly', payRate: 25, workerType: 'w2' }, 20), 30);
});

test('a W-9 contractor NEVER carries burden, whatever is set', () => {
  // The most important assertion here. A contractor's cost is their rate —
  // no employer FICA, no unemployment, no workers' comp. Adding burden would
  // overstate cost and understate margin.
  assert.equal(burdenedHourlyCost({ payType: 'hourly', payRate: 25, workerType: 'w9' }, 20), 25);
  assert.equal(burdenedHourlyCost({ payType: 'hourly', payRate: 40, workerType: 'w9' }, 100), 40);
});

test('an unset burden changes nothing', () => {
  // Not a guessed 15%: a plausible default would quietly move every margin.
  const w2 = { payType: 'hourly', payRate: 25, workerType: 'w2' } as const;
  assert.equal(burdenedHourlyCost(w2, null), 25);
  assert.equal(burdenedHourlyCost(w2, undefined), 25);
  assert.equal(burdenedHourlyCost(w2, ''), 25);
  assert.equal(burdenedHourlyCost(w2, 'not a number'), 25);
  assert.equal(burdenedHourlyCost(w2, 0), 25);
});

test('a salary is converted first, then burdened', () => {
  // 72,000 a year is 34.615/hr before burden; applying burden to the ANNUAL
  // figure would be the half-million-pound-day fault with extra steps.
  const salaried = { payType: 'salary', payRate: 72000, workerType: 'w2' } as const;
  const bare = hourlyCostRate(salaried)!;
  assert.ok(Math.abs(bare - 72000 / HOURS_PER_YEAR) < 0.001);
  assert.ok(Math.abs(burdenedHourlyCost(salaried, 25)! - bare * 1.25) < 0.001);
});

test('an unknown rate stays unknown rather than becoming zero', () => {
  // Zero claims the labour was free. jobOutcome counts unknowns separately on
  // purpose, and burden must not turn a gap into a number.
  assert.equal(burdenedHourlyCost({ payType: 'hourly', payRate: null, workerType: 'w2' }, 20), null);
  assert.equal(burdenedHourlyCost(null, 20), null);
});

test('a worker with no type recorded is treated as W-2', () => {
  // The conservative direction: counting an employer cost that might not
  // apply overstates cost, which is the safe way to be wrong about margin.
  assert.equal(burdenedHourlyCost({ payType: 'hourly', payRate: 25 }, 20), 30);
});
