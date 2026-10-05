/**
 * The 10-Year Capital Plan's arithmetic.
 *
 * WHY THESE ASSERTIONS
 *
 * This is the $129 product, and it is the one that invites over-claiming. The
 * owner plans real money around its figures, so the failures that matter are
 * the quiet ones:
 *
 *   - a component priced at zero because a trade had no rate;
 *   - an age assumption presented as an observation;
 *   - a condition word nobody ranks silently becoming the worst in the building;
 *   - inflation compounding the wrong way;
 *   - a quantity derived from an average rather than from the record, which
 *     charges the owner for a house they do not have.
 *
 * None of those throws. Each produces a plausible table.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPONENTS, buildCapitalPlan, costComponent, remainingLifeFor, quotedCost, quantityFor,
  OVERDUE_SPREAD_YEARS,
  type PlanInput, type ComponentSpec,
} from '../supabase/functions/server/capitalPlanRules.ts';
import { STANDARD_LABOR_RATES, STANDARD_PRICING } from '../supabase/functions/server/pricingDefaults.ts';

const THIS_YEAR = 2026;
const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  property: { units: 2, squareFootage: 2400, bathrooms: 2, yearBuilt: 1962 },
  conditions: {},
  rates: STANDARD_LABOR_RATES,
  settings: STANDARD_PRICING,
  thisYear: THIS_YEAR,
  ...over,
});

const spec = (id: string): ComponentSpec => {
  const found = COMPONENTS.find((c) => c.id === id);
  assert.ok(found, `${id} is not a component`);
  return found!;
};

// ─── The catalogue itself ────────────────────────────────────────────────────

test('every component prices through a trade we hold a rate for', () => {
  // A trade with no rate falls back to labouring, which is better than free —
  // but a component whose trade does not exist at all is a typo that would
  // quietly reprice the line.
  const rateIds = new Set(STANDARD_LABOR_RATES.map((r) => r.id));
  for (const c of COMPONENTS) {
    assert.ok(rateIds.has(c.trade), `${c.id} uses trade "${c.trade}", which is not one of our rates`);
  }
});

test('every component has a life, hours and materials above zero', () => {
  for (const c of COMPONENTS) {
    assert.ok(c.usefulLife > 0 && c.usefulLife <= 60, `${c.id} life ${c.usefulLife}`);
    assert.ok(c.hoursPerUnit > 0, `${c.id} has no labour`);
    assert.ok(c.materialPerUnit > 0, `${c.id} has no materials`);
    assert.ok(c.areaKeywords.length > 0, `${c.id} can never be matched to an inspection`);
  }
});

test('every material category is one the markup table knows', () => {
  // An unknown category silently falls back to the flat markup, which is a
  // quieter error than it looks: roofing at 30% instead of 25% moves a $20,000
  // line by a thousand dollars.
  for (const c of COMPONENTS) {
    assert.ok(
      c.materialCategory in STANDARD_PRICING.materialMarkupByCategory,
      `${c.id} uses material category "${c.materialCategory}", which has no band`,
    );
  }
});

// ─── Quantities come from the record ────────────────────────────────────────

test('a property with no square footage is not given an average house', () => {
  const bare = { units: 1 };
  for (const c of COMPONENTS) {
    const q = quantityFor(c, bare);
    assert.ok(q > 0, `${c.id} priced at zero quantity`);
    assert.ok(Number.isFinite(q), `${c.id} quantity ${q}`);
  }
  // A one-unit property must not be quoted for two units of anything counted.
  assert.equal(quantityFor(spec('water-heater'), bare), 1);
  assert.equal(quantityFor(spec('kitchen'), bare), 1);
});

test('bathrooms come from the record, falling back to the unit count', () => {
  assert.equal(quantityFor(spec('bathroom'), { units: 2, bathrooms: 3 }), 3);
  assert.equal(quantityFor(spec('bathroom'), { units: 2 }), 2);
});

test('the roof is the footprint plus a pitch allowance, not the floor area', () => {
  // A two-storey 2400 sq ft house does not have 2400 sq ft of roof.
  const single = quantityFor(spec('roof-shingle'), { units: 1, squareFootage: 2400 });
  assert.equal(single, Math.round(2400 * 1.2));
  const triple = quantityFor(spec('roof-shingle'), { units: 3, squareFootage: 2400 });
  assert.ok(triple < single, 'more units over the same area means less roof per floor area');
});

// ─── Remaining life, and the line between seen and assumed ──────────────────

test('with no inspection, a component is as old as the building and SAYS so', () => {
  const { remainingLife, effectiveAge, basis, note } = remainingLifeFor(spec('roof-shingle'), 64, null);
  assert.equal(basis, 'assumed');
  // Capped at the component's own life, so a 64-year-old roof reports nothing
  // left rather than a negative remaining life.
  assert.equal(effectiveAge, 25);
  assert.equal(remainingLife, 0);
  assert.match(note, /assumed to be as old as the building/);
});

test('a young building leaves life on every component', () => {
  const { remainingLife, basis } = remainingLifeFor(spec('roof-shingle'), 4, null);
  assert.equal(basis, 'assumed');
  assert.equal(remainingLife, 21);
});

test('an inspection that found it failed makes it due now, whatever the age', () => {
  const young = remainingLifeFor(spec('heating'), 4, 'Failed');
  assert.equal(young.basis, 'seen');
  assert.equal(young.remainingLife, 0, 'a failed component is due now');
  assert.match(young.note, /found failed/);
});

test('an observation outranks the building age, in both directions', () => {
  // This is the defect a rendered sample exposed in the first version: on a
  // 1962 building, a kitchen inspected and found GOOD still came out with
  // nothing left, because the building's age swamped the adjustment — and the
  // line's note claimed its life had been extended. A document that contradicts
  // itself in adjacent columns is worse than one that is merely approximate.
  const good = remainingLifeFor(spec('kitchen'), 64, 'Good');
  assert.equal(good.basis, 'seen');
  assert.ok(good.remainingLife > 0, 'something seen and found good must have life left');
  assert.equal(good.remainingLife, Math.round(spec('kitchen').usefulLife * 0.6));
  assert.match(good.note, /an observation, rather than the building/);

  // And a NEW building with something found poor must not be reported as sound.
  const poor = remainingLifeFor(spec('kitchen'), 2, 'Poor');
  assert.ok(poor.remainingLife < good.remainingLife, 'poor must leave less life than good');
  assert.equal(poor.basis, 'seen');
});

test('the condition scale is monotonic', () => {
  const lives = ['failed', 'poor', 'fair', 'good', 'excellent']
    .map((w) => remainingLifeFor(spec('windows'), 40, w).remainingLife);
  for (let i = 1; i < lives.length; i++) {
    assert.ok(lives[i] >= lives[i - 1], `${lives} is not ordered worst to best`);
  }
  assert.equal(lives[0], 0);
});

test('a condition word nobody ranks falls back to the age and is marked ASSUMED', () => {
  // The alternative — treating an unrecognised word as the worst case — would
  // let one stray entry in an inspection pull a replacement forward by years.
  const odd = remainingLifeFor(spec('roof-shingle'), 20, 'Peculiar');
  assert.equal(odd.basis, 'assumed');
  assert.equal(odd.effectiveAge, 20);
  assert.equal(odd.remainingLife, 5);
  assert.match(odd.note, /not a word this plan ranks/);
});

test('remaining life never exceeds the component life', () => {
  for (const word of ['excellent', 'good', 'fair', 'poor', null]) {
    const { remainingLife } = remainingLifeFor(spec('interior-paint'), 0, word);
    assert.ok(remainingLife <= spec('interior-paint').usefulLife, `${word} produced ${remainingLife}`);
    assert.ok(remainingLife >= 0);
  }
});

// ─── Cost, through our own rates ────────────────────────────────────────────

test('the quote arithmetic is markup, then overhead, then profit', () => {
  // 1000 of roofing materials at 25%, no labour markup, 10% overhead, 15%
  // profit: 1250 x 1.1 x 1.15 = 1581.25, rounded.
  assert.equal(quotedCost(0, 1000, 'Roofing', STANDARD_PRICING), 1581);
  // Labour is not marked up by default, but still carries overhead and profit.
  assert.equal(quotedCost(1000, 0, 'Roofing', STANDARD_PRICING), 1265);
});

test('a component is never free, even when its trade has no rate', () => {
  const noRates = input({ rates: [{ id: 'laboring', hourlyRate: 40 }] });
  for (const c of COMPONENTS) {
    const costed = costComponent(c, noRates);
    assert.ok(costed.labourCost > 0, `${c.id} priced its labour at zero`);
    assert.ok(costed.costToday > 0, `${c.id} priced at zero`);
    assert.equal(costed.hourlyRate, 40, `${c.id} did not fall back to the labouring rate`);
  }
});

test('our own rate is what prices the labour', () => {
  const ours = input({ rates: [...STANDARD_LABOR_RATES.filter((r) => r.id !== 'roofing'), { id: 'roofing', hourlyRate: 140 }] });
  const book = costComponent(spec('roof-shingle'), input());
  const mine = costComponent(spec('roof-shingle'), ours);
  assert.equal(book.hourlyRate, 70);
  assert.equal(mine.hourlyRate, 140);
  assert.ok(mine.labourCost > book.labourCost, 'a higher rate must cost more');
});

test('cost when due grows with the remaining life, not shrinks', () => {
  const soon = costComponent(spec('interior-paint'), input());
  assert.ok(soon.costWhenDue >= soon.costToday, 'inflation compounded the wrong way');
  const far = costComponent(spec('plumbing-supply'), input({ property: { units: 2, squareFootage: 2400, yearBuilt: 2024 } }));
  assert.ok(far.remainingLife > soon.remainingLife);
  assert.ok(far.costWhenDue / far.costToday > soon.costWhenDue / soon.costToday,
    'a longer wait must inflate further');
});

test('zero inflation leaves the figure alone', () => {
  const flat = costComponent(spec('roof-shingle'), input({ inflation: 0 }));
  assert.equal(flat.costWhenDue, flat.costToday);
});

// ─── The plan as a whole ────────────────────────────────────────────────────

test('the ten-year plan only contains the next ten years', () => {
  const plan = buildCapitalPlan(input());
  for (const year of plan.byYear) {
    assert.ok(year.year >= THIS_YEAR && year.year <= THIS_YEAR + 10, `${year.year} is outside the window`);
  }
  for (const c of plan.withinTenYears) assert.ok(c.remainingLife <= 10);
  assert.equal(plan.tenYearTotal, plan.byYear.reduce((s, y) => s + y.total, 0));
});

test('the monthly reserve is the ten-year total spread over ten years', () => {
  const plan = buildCapitalPlan(input());
  assert.ok(plan.monthlyReserve > 0);
  const exact = plan.tenYearTotal / 120;
  assert.ok(plan.monthlyReserve >= exact, 'the reserve must not under-collect');
  assert.ok(plan.monthlyReserve - exact < 10, 'rounded to the nearest ten, not inflated');
});

test('a 1962 building has more due than a 2024 one', () => {
  const old = buildCapitalPlan(input());
  const recent = buildCapitalPlan(input({ property: { units: 2, squareFootage: 2400, bathrooms: 2, yearBuilt: 2024 } }));
  assert.ok(old.tenYearTotal > recent.tenYearTotal, 'age must drive the plan');
  assert.ok(old.withinTenYears.length > recent.withinTenYears.length);
});

test('the plan counts how much of itself was seen rather than assumed', () => {
  const blind = buildCapitalPlan(input());
  assert.equal(blind.seenCount, 0);
  assert.equal(blind.assumedCount, COMPONENTS.length);

  const inspected = buildCapitalPlan(input({
    conditions: { 'roof — south slope': 'Poor', 'boiler': 'Failed', 'unit 1 kitchen': 'Good' },
  }));
  assert.ok(inspected.seenCount >= 3, `only ${inspected.seenCount} lines matched an inspected area`);
  assert.equal(inspected.seenCount + inspected.assumedCount, COMPONENTS.length);
});

test('an inspected area matches its component by keyword, not exact name', () => {
  // "Roof — south slope" has to find the roof, or a real inspection note never
  // improves the plan and the whole seen/assumed distinction is decorative.
  const plan = buildCapitalPlan(input({ conditions: { 'roof — south slope': 'Failed' } }));
  const roof = plan.components.find((c) => c.id === 'roof-shingle');
  assert.equal(roof!.basisOfAge, 'seen');
  assert.equal(roof!.remainingLife, 0, 'a failed roof is due now');
  assert.equal(roof!.condition, 'Failed');
});

test('every line explains itself', () => {
  for (const c of buildCapitalPlan(input({ conditions: { boiler: 'Fair' } })).components) {
    assert.ok(c.note.length > 25, `${c.id} gives no reason for its remaining life`);
    assert.ok(['seen', 'assumed'].includes(c.basisOfAge));
  }
});

test('the plan is ordered by when the money is needed', () => {
  const plan = buildCapitalPlan(input());
  for (let i = 1; i < plan.components.length; i++) {
    assert.ok(plan.components[i].dueYear >= plan.components[i - 1].dueYear, 'out of order');
  }
});

// ─── Sequencing overdue work ────────────────────────────────────────────────

test('overdue work is spread across years, not stacked into one', () => {
  // The defect a rendered sample exposed: a 1962 duplex had every component
  // past its nominal life, so the "ten-year plan" was one line with $209,000 in
  // it. Nobody replaces the kitchen, roof, siding, plumbing and heating in the
  // same twelve months, and an owner shown that reads the document as not
  // applying to them.
  const plan = buildCapitalPlan(input());
  assert.ok(plan.overdueCount > 1, 'the fixture should have several overdue components');
  assert.ok(plan.byYear.length > 1, 'everything landed in one year');
  const years = new Set(plan.byYear.map((y) => y.year));
  assert.ok(years.size <= OVERDUE_SPREAD_YEARS + 11);
});

test('nothing overdue is scheduled beyond the spread window', () => {
  const plan = buildCapitalPlan(input());
  const overdue = plan.components.filter((c) => c.remainingLife === 0);
  for (const c of overdue) {
    assert.ok((c.scheduledYear || 0) <= THIS_YEAR + OVERDUE_SPREAD_YEARS - 1,
      `${c.id} was pushed to ${c.scheduledYear}`);
  }
});

test('safety comes first in the sequence, then what was inspected and failed', () => {
  const plan = buildCapitalPlan(input({
    conditions: { 'smoke and co alarms': 'Good', 'boiler': 'Failed' },
  }));
  const alarms = plan.components.find((c) => c.id === 'alarms');
  const heating = plan.components.find((c) => c.id === 'heating');
  const paint = plan.components.find((c) => c.id === 'interior-paint');
  // Alarms are a safety line; decoration is not. One of them waits.
  if (alarms!.remainingLife === 0 && paint!.remainingLife === 0) {
    assert.ok((alarms!.scheduledYear || 0) <= (paint!.scheduledYear || 0),
      'decoration was scheduled before life safety');
  }
  assert.equal(heating!.condition, 'Failed');
});

test('a scheduled cost is inflated to the year it is scheduled, not to today', () => {
  // Pushing a replacement out and still quoting today's price under-funds it,
  // which only shows up when the money is short.
  const plan = buildCapitalPlan(input());
  const pushed = plan.components.filter((c) => c.remainingLife === 0 && (c.scheduledYear || 0) > THIS_YEAR);
  assert.ok(pushed.length, 'nothing was pushed, so this cannot be checked');
  for (const c of pushed) {
    assert.ok(c.costWhenDue > c.costToday, `${c.id} was pushed to ${c.scheduledYear} at today's price`);
  }
  const now = plan.components.filter((c) => c.remainingLife === 0 && c.scheduledYear === THIS_YEAR);
  for (const c of now) assert.equal(c.costWhenDue, c.costToday, `${c.id} is due now and was inflated`);
});

test('a sequenced line says in its note that it was sequenced', () => {
  const plan = buildCapitalPlan(input());
  for (const c of plan.components.filter((x) => x.remainingLife === 0)) {
    assert.match(c.note, /due|overdue|sequence/i, `${c.id}: ${c.note}`);
  }
});

test('the year-by-year total still equals the ten-year total', () => {
  const plan = buildCapitalPlan(input());
  assert.equal(plan.tenYearTotal, plan.byYear.reduce((s, y) => s + y.total, 0));
  assert.ok(plan.tenYearTotal > 0);
});

test('a new building has little or nothing overdue', () => {
  const recent = buildCapitalPlan(input({ property: { units: 2, squareFootage: 2400, bathrooms: 2, yearBuilt: 2024 } }));
  assert.equal(recent.overdueCount, 0, 'a two-year-old building cannot be overdue on anything');
  const old = buildCapitalPlan(input());
  assert.ok(old.overdueCount > recent.overdueCount);
});
