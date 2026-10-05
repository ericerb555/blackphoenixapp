/**
 * The Revenue Opportunity Report's arithmetic.
 *
 * WHY THESE ASSERTIONS
 *
 * The product is the gap between what the units earn and what comparable units
 * earn, so the dangerous outputs are the confident ones. A report that tells a
 * landlord to raise a rent by $200 on a market estimate that ranged over $800
 * has given advice we cannot stand behind, and the landlord may lose a tenant
 * acting on it — a month empty costs more than a year of most increases.
 *
 * So what is pinned: a weak estimate is refused rather than softened, the
 * confidence follows the range rather than the headline, a unit already let
 * above the market is said so plainly, an empty unit outranks every rent gap,
 * and no recommendation appears without the vacancy cost beside it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  marketIsUsable, confidenceOf, gapFor, analyseRevenue, monthsToRecoverVacancy,
  MAX_USABLE_SPREAD, type MarketRent, type UnitRent,
} from '../supabase/functions/server/revenueRules.ts';

const market = (over: Partial<MarketRent> = {}): MarketRent => ({
  rent: 1800, rangeLow: 1700, rangeHigh: 1950, comparableCount: 11,
  fetchedAt: '2026-10-01T00:00:00Z', ...over,
});

const units = (...rents: Array<[string, number]>): UnitRent[] =>
  rents.map(([label, rent]) => ({ label, rent }));

// ─── A market figure has to be worth comparing against ──────────────────────

test('no estimate at all is refused, with a reason', () => {
  for (const bad of [null, undefined, { rent: 0 }, { rent: -5 }] as any[]) {
    const verdict = marketIsUsable(bad);
    assert.equal(verdict.ok, false);
    assert.ok((verdict.reason || '').length > 10, 'refused without saying why');
  }
});

test('an estimate with no range is refused', () => {
  // An unqualified number presented as "the market rate" is a stronger claim
  // than an automated valuation can support.
  const verdict = marketIsUsable({ rent: 1800 });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason || '', /no range/);
});

test('a range too wide to price against is refused rather than softened', () => {
  const wide = marketIsUsable(market({ rent: 1800, rangeLow: 1200, rangeHigh: 2500 }));
  assert.equal(wide.ok, false);
  assert.match(wide.reason || '', /\$1200/);
  assert.match(wide.reason || '', /too wide/);

  // And the boundary holds: just inside the limit is usable.
  const spread = MAX_USABLE_SPREAD * 1800;
  assert.equal(marketIsUsable(market({ rangeLow: 1800 - spread / 2 + 10, rangeHigh: 1800 + spread / 2 - 10 })).ok, true);
});

test('a sound estimate is usable', () => {
  assert.equal(marketIsUsable(market()).ok, true);
});

// ─── Confidence follows the range, not the headline ─────────────────────────

test('a tight range speaks firmly, a wide one does not', () => {
  assert.equal(confidenceOf(market({ rangeLow: 1750, rangeHigh: 1850 })).level, 'firm');
  assert.equal(confidenceOf(market({ rangeLow: 1650, rangeHigh: 2050 })).level, 'fair');
  assert.equal(confidenceOf(market({ rangeLow: 1500, rangeHigh: 2150 })).level, 'soft');
});

test('every confidence prints the actual range, not an adjective alone', () => {
  for (const m of [market({ rangeLow: 1750, rangeHigh: 1850 }), market({ rangeLow: 1500, rangeHigh: 2150 })]) {
    const { note } = confidenceOf(m);
    assert.match(note, /\$\d/, 'the note gives no figures');
    assert.ok(note.length > 40);
  }
});

test('the softest confidence says not to set a rent from the figure', () => {
  const { note } = confidenceOf(market({ rangeLow: 1400, rangeHigh: 2200 }));
  assert.match(note, /not something to set a rent from/);
});

// ─── A unit at or above the market is said so plainly ───────────────────────

test('a unit let above the estimate is told there is nothing to chase', () => {
  const gap = gapFor({ label: '1A', rent: 2000 }, market());
  assert.ok(gap.gapMonthly <= 0);
  assert.match(gap.verdict, /at or above/);
  assert.match(gap.verdict, /worth knowing/);
});

test('a small gap is not dressed up as an opportunity', () => {
  // $30 a month is not worth unsettling a sitting tenant for, and saying so is
  // the difference between advice and a sales pitch.
  const gap = gapFor({ label: '1A', rent: 1770 }, market());
  assert.equal(gap.gapMonthly, 30);
  assert.match(gap.verdict, /not worth unsettling/);
});

test('a real gap is named as the one to look at', () => {
  const gap = gapFor({ label: '2B', rent: 1500 }, market());
  assert.equal(gap.gapMonthly, 300);
  assert.equal(gap.gapAnnual, 3600);
  assert.match(gap.verdict, /worth looking at/);
});

test('where the rent sits in the range is reported, not just the midpoint gap', () => {
  const low = gapFor({ label: 'A', rent: 1700 }, market());
  const high = gapFor({ label: 'B', rent: 1950 }, market());
  assert.equal(low.positionInRange, 0);
  assert.equal(high.positionInRange, 1);
  // A rent in the upper half of the range but still under the estimate is
  // described differently from one at the bottom. That combination needs the
  // estimate to sit above its own range midpoint, which real AVM output does —
  // the midpoint of a range and the model's estimate are not the same number.
  const skewed = market({ rent: 1850, rangeLow: 1600, rangeHigh: 1900 });
  const upper = gapFor({ label: 'C', rent: 1800 }, skewed);
  assert.ok(upper.gapMonthly > 0, 'still under the estimate');
  assert.ok((upper.positionInRange || 0) >= 0.5, 'but in the upper half of the range');
  assert.match(upper.verdict, /upper half/);
  assert.match(upper.verdict, /real but modest/);
});

// ─── Vacancy outranks every rent gap ────────────────────────────────────────

test('an empty unit leads the recommendations', () => {
  const analysis = analyseRevenue(units(['1A', 1500], ['2B', 1550]), market(), 3);
  assert.equal(analysis.vacantCount, 1);
  assert.equal(analysis.vacancyCostMonthly, 1800);
  assert.match(analysis.recommendations[0], /Fill the empty unit first/);
  assert.match(analysis.recommendations[0], /worth more than every rent gap/);
});

test('no vacancy means no vacancy line', () => {
  const analysis = analyseRevenue(units(['1A', 1500], ['2B', 1550]), market(), 2);
  assert.equal(analysis.vacantCount, 0);
  assert.ok(!/empty unit/.test(analysis.recommendations.join(' ')));
});

test('a unit count lower than the let units does not invent a negative vacancy', () => {
  const analysis = analyseRevenue(units(['1A', 1500], ['2B', 1550]), market(), 1);
  assert.equal(analysis.vacantCount, 0);
});

test('every rent recommendation carries what a vacant month costs', () => {
  // The honest counterweight. An owner who sees only the gain makes a worse
  // decision than one who sees both numbers.
  const analysis = analyseRevenue(units(['1A', 1400], ['2B', 1450]), market(), 2);
  const rentLines = analysis.recommendations.filter((r) => /^Unit /.test(r));
  assert.ok(rentLines.length >= 2);
  for (const line of rentLines) {
    assert.match(line, /One vacant month costs/, line);
    assert.match(line, /at renewal, not mid-tenancy/, line);
  }
});

test('the months-to-recover arithmetic is the rent over the gap', () => {
  assert.equal(monthsToRecoverVacancy(100, 1800), 18);
  assert.equal(monthsToRecoverVacancy(300, 1800), 6);
  // No gap, or no rent, means there is nothing to recover.
  assert.equal(monthsToRecoverVacancy(0, 1800), null);
  assert.equal(monthsToRecoverVacancy(-50, 1800), null);
  assert.equal(monthsToRecoverVacancy(100, 0), null);
});

// ─── The totals ─────────────────────────────────────────────────────────────

test('a property already at market is told so as a finding', () => {
  const analysis = analyseRevenue(units(['1A', 1900], ['2B', 1850]), market(), 2);
  assert.equal(analysis.gapMonthly, 0);
  assert.equal(analysis.recommendations.length, 1);
  assert.match(analysis.recommendations[0], /a finding rather than an absence of one/);
});

test('the market total never counts a unit DOWN to the estimate', () => {
  // A unit let at $2,000 against an $1,800 estimate must not appear as $200 of
  // lost revenue, which is what subtracting would do.
  const analysis = analyseRevenue(units(['1A', 2000], ['2B', 1500]), market(), 2);
  assert.equal(analysis.monthlyRentNow, 3500);
  assert.equal(analysis.monthlyRentAtMarket, 2000 + 1800);
  assert.equal(analysis.gapMonthly, 300);
  assert.equal(analysis.gapAnnual, 3600);
});

test('units below the estimate are ordered by the size of the gap', () => {
  const analysis = analyseRevenue(units(['1A', 1700], ['2B', 1400], ['3C', 1550]), market(), 3);
  assert.deepEqual(analysis.below.map((g) => g.label), ['2B', '3C', '1A']);
});

test('an empty unit is not treated as a rent of zero', () => {
  // Counting it as let at $0 would report an $1,800 "gap" on it and double the
  // vacancy into the rent analysis.
  const analysis = analyseRevenue([{ label: '1A', rent: 1800 }, { label: '2B', rent: 0 }], market(), 2);
  assert.equal(analysis.units.length, 1, 'an empty unit must not appear as a let one');
  assert.equal(analysis.vacantCount, 1);
});
