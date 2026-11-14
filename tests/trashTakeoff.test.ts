/**
 * Turning what a reader saw in photographs into a price.
 *
 * The behaviours pinned here are the ones that decide a customer's number:
 *
 *   - what could not be seen widens the TOP of the range and never the bottom
 *   - a refused item is removed from the load, not priced into it
 *   - access conditions are multipliers with reasons, not a softened base rate
 *   - structural demolition never comes back as a number anybody may treat as firm
 *   - the itemised lines add up to the likely price, exactly
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  trashTakeoff, conditionMultiplier, DEMO_MINIMUM_CREW_HOURS,
  BATHROOM_GUT_CREW_HOURS, STRUCTURAL_HIGH_FACTOR,
  type Observations,
} from '../supabase/functions/server/trashTakeoff.ts';
import { STANDARD_TRASH_RATES, resolveTrashRates } from '../supabase/functions/server/trashRates.ts';

const rates = STANDARD_TRASH_RATES;

const item = (over: Record<string, any> = {}) => ({
  name: 'sofa', count: 1, materialClass: 'mixed-household' as const,
  volumeLowCuYd: 2, volumeHighCuYd: 3, seenIn: [0], confidence: 'high' as const,
  ...over,
});

const obs = (over: Partial<Observations> = {}): Observations => ({
  items: [item()],
  ...over,
});

const sum = (t: any) => Math.round(t.lines.reduce((s: number, l: any) => s + l.cost, 0) * 100) / 100;
const lineOf = (t: any, kind: string) => t.lines.find((l: any) => l.kind === kind);

/* ── the arithmetic holds together ───────────────────────────────────────── */

test('the itemised lines add up to the likely price', () => {
  const t = trashTakeoff(obs({
    items: [item({ count: 3, volumeLowCuYd: 2, volumeHighCuYd: 4 })],
    access: { stairFlights: 1, carryDistanceFt: 120 },
  }), rates);
  assert.equal(sum(t), t.cost.likely);
});

test('an empty reading prices nothing at all — not the minimum', () => {
  const t = trashTakeoff({ items: [] }, rates);
  assert.equal(t.cost.likely, 0);
  assert.equal(t.cost.low, 0);
  assert.equal(t.lines.length, 0);
  assert.equal(t.loads, 0);
});

test('a single small item still reaches the minimum charge', () => {
  const t = trashTakeoff(obs({
    items: [item({ name: 'armchair', volumeLowCuYd: 0.5, volumeHighCuYd: 0.7 })],
  }), rates);
  assert.equal(t.cost.likely, rates.minimum);
  assert.ok(lineOf(t, 'minimum'), 'no minimum line to explain the figure');
  assert.equal(sum(t), rates.minimum);
});

test('the range is ordered, always', () => {
  const t = trashTakeoff(obs({
    items: [item({ count: 4 })],
    unseen: [{ what: 'behind the stack', estimatedVolumeCuYd: 6 }],
    access: { stairFlights: 2, occupied: true },
  }), rates);
  assert.ok(t.cost.low <= t.cost.likely, 'low above likely');
  assert.ok(t.cost.likely <= t.cost.high, 'likely above high');
});

/* ── what could not be seen ──────────────────────────────────────────────── */

test('unseen volume lifts the top of the range and leaves the bottom alone', () => {
  const seen = trashTakeoff(obs({ items: [item({ count: 4 })] }), rates);
  const hidden = trashTakeoff(obs({
    items: [item({ count: 4 })],
    unseen: [{ what: 'behind the stack on the left', estimatedVolumeCuYd: 8 }],
  }), rates);

  assert.equal(hidden.cost.low, seen.cost.low, 'what we could not see made the job cheaper at the bottom');
  assert.ok(hidden.cost.high > seen.cost.high, 'hidden volume did not raise the top');
  assert.ok(hidden.cost.likely > seen.cost.likely, 'hidden volume is ignored in the middle');
  assert.equal(hidden.unseenCuYd, 8);
});

test('a job that is mostly unseen must not be presented as firm', () => {
  const t = trashTakeoff(obs({
    items: [item({ volumeLowCuYd: 1, volumeHighCuYd: 1 })],
    unseen: [{ what: 'the rest of the basement', estimatedVolumeCuYd: 10 }],
  }), rates);
  assert.equal(t.needsSiteVisit, true);
  assert.ok(t.siteVisitReasons.some((r) => /could not be seen/.test(r)));
});

test('a range wider than twice its own bottom is a shrug, and says so', () => {
  const t = trashTakeoff(obs({
    items: [item({ volumeLowCuYd: 1, volumeHighCuYd: 30 })],
  }), rates);
  assert.equal(t.needsSiteVisit, true);
  assert.ok(t.siteVisitReasons.some((r) => /wider than twice/.test(r)));
});

/* ── hazards ─────────────────────────────────────────────────────────────── */

test('a refused item is taken out of the load, not priced into it', () => {
  const withTank = trashTakeoff(obs({
    items: [item({ count: 2 }), item({ name: 'propane tank', volumeLowCuYd: 0.3, volumeHighCuYd: 0.3 })],
  }), rates);
  const without = trashTakeoff(obs({ items: [item({ count: 2 })] }), rates);

  assert.equal(withTank.cost.likely, without.cost.likely, 'we charged to carry something we will not carry');
  assert.equal(withTank.refused.length, 1);
  assert.equal(withTank.refused[0].id, 'pressurised');
  assert.equal(withTank.refused[0].named, 'propane tank');
});

test('suspected asbestos forces a visit; a propane tank does not', () => {
  const asbestos = trashTakeoff(obs({
    items: [item(), item({ name: 'asbestos pipe lagging', volumeLowCuYd: 0.2, volumeHighCuYd: 0.2 })],
  }), rates);
  assert.equal(asbestos.needsSiteVisit, true);

  const propane = trashTakeoff(obs({
    items: [item({ count: 3 }), item({ name: 'propane tank', volumeLowCuYd: 0.2, volumeHighCuYd: 0.2 })],
  }), rates);
  assert.equal(propane.needsSiteVisit, false, 'a tank we simply will not take is not a reason to drive out');
});

test('a fridge and a mattress are their own lines, never folded into volume', () => {
  const t = trashTakeoff(obs({
    items: [item(), item({ name: 'refrigerator', materialClass: 'appliance' }),
      item({ name: 'queen mattress', count: 2, materialClass: 'mattress' })],
  }), rates);

  const charges = t.lines.filter((l: any) => l.kind === 'surcharge');
  assert.equal(charges.length, 2);
  assert.equal(charges.find((l: any) => /Refrigerant/.test(l.label))?.cost, 45);
  assert.equal(charges.find((l: any) => /Mattress/.test(l.label))?.cost, 70, 'two mattresses at 35');
});

test('the same fridge named as an item and again as a hazard is one fridge', () => {
  const t = trashTakeoff(obs({
    items: [item({ name: 'old refrigerator', materialClass: 'appliance' })],
    hazards: ['refrigerator — has freon'],
  }), rates);
  const charges = t.lines.filter((l: any) => l.kind === 'surcharge');
  assert.equal(charges.length, 1);
  assert.equal(charges[0].cost, 45);
});

/* ── access conditions ───────────────────────────────────────────────────── */

test('stairs, distance and an occupied room each cost time, and each says so', () => {
  const flat = conditionMultiplier({});
  assert.equal(flat.factor, 1);
  assert.equal(flat.reasons.length, 0);

  const hard = conditionMultiplier({ stairFlights: 2, carryDistanceFt: 150, occupied: true });
  assert.ok(hard.factor > 1.5, `expected a real penalty, got ${hard.factor}`);
  assert.equal(hard.reasons.length, 3);
  assert.ok(hard.reasons.some((r) => /stairs/.test(r)));
  assert.ok(hard.reasons.some((r) => /carry/.test(r)));
  assert.ok(hard.reasons.some((r) => /occupied/.test(r)));
});

test('a lift is cheaper than the stairs it replaces', () => {
  const stairs = conditionMultiplier({ stairFlights: 3 });
  const lift = conditionMultiplier({ stairFlights: 3, lift: true });
  assert.ok(lift.factor < stairs.factor);
  assert.ok(lift.reasons[0].includes('lift'));
});

test('a short carry is free', () => {
  assert.equal(conditionMultiplier({ carryDistanceFt: 40 }).factor, 1);
});

test('the conditions reach the labour line and are named on it', () => {
  const t = trashTakeoff(obs({ items: [item({ count: 4 })], access: { stairFlights: 1 } }), rates);
  const labour = lineOf(t, 'labour');
  assert.ok(/stairs/.test(labour.label), 'the customer cannot see why the labour costs more');
  assert.equal(t.conditions.factor, 1.15);
});

/* ── demolition ──────────────────────────────────────────────────────────── */

test('a strip-out is priced as labour AND as the debris it creates', () => {
  const t = trashTakeoff({
    items: [],
    demo: [{ description: 'kitchen strip-out', areaSqFt: 300, structural: false }],
  }, rates);

  const demo = lineOf(t, 'demolition');
  assert.ok(demo, 'no demolition labour');
  assert.equal(demo.quantity, 10.5, '300 sq ft at 0.035 crew hours each');
  assert.ok(demo.quantity > DEMO_MINIMUM_CREW_HOURS, 'this one is above the half-day minimum');
  assert.equal(t.volumeCuYd.likely, 10, '300 sq ft at a cubic yard per 30');
  assert.ok(t.loads >= 1, 'the debris never got a truck');
  assert.equal(demo.assumed, true, 'the debris yield is a rule of thumb and must say so');
});

test('a bathroom gut is priced per room, not per square foot', () => {
  const t = trashTakeoff({
    items: [],
    demo: [{ description: 'two bathrooms to the studs', bathrooms: 2, structural: false }],
  }, rates);
  assert.equal(lineOf(t, 'demolition').quantity, 2 * BATHROOM_GUT_CREW_HOURS);
});

test('structural demolition always needs a visit and widens the top', () => {
  const plain = trashTakeoff({
    items: [], demo: [{ description: 'wall out', areaSqFt: 400, structural: false }],
  }, rates);
  const structural = trashTakeoff({
    items: [], demo: [{ description: 'wall out', areaSqFt: 400, structural: true }],
  }, rates);

  assert.equal(plain.needsSiteVisit, false);
  assert.equal(structural.needsSiteVisit, true);
  assert.ok(structural.siteVisitReasons.some((r) => /holding up/.test(r)));
  assert.ok(structural.cost.high > plain.cost.high, `structural high ${structural.cost.high} vs ${plain.cost.high}`);
  assert.ok(structural.notes.some((n) => /engineering sign-off/.test(n)));
  assert.equal(STRUCTURAL_HIGH_FACTOR > 1, true);
});

test('a pre-1978 building has to be ruled out before anybody demolishes', () => {
  const t = trashTakeoff({
    items: [], demo: [{ description: 'plaster off', areaSqFt: 200, structural: false, preSeventyEight: true }],
  }, rates);
  assert.equal(t.needsSiteVisit, true);
  assert.ok(t.siteVisitReasons.some((r) => /1978/.test(r)));
});

/* ── the whole job ───────────────────────────────────────────────────────── */

test('a two-storey estate cleanout with a mattress and a fridge', () => {
  const t = trashTakeoff({
    items: [
      item({ name: 'bedroom furniture', count: 3, volumeLowCuYd: 2, volumeHighCuYd: 3 }),
      item({ name: 'boxes and bags', count: 20, volumeLowCuYd: 0.2, volumeHighCuYd: 0.3 }),
      item({ name: 'refrigerator', materialClass: 'appliance', volumeLowCuYd: 1, volumeHighCuYd: 1.2 }),
      item({ name: 'queen mattress', count: 2, materialClass: 'mattress', volumeLowCuYd: 1, volumeHighCuYd: 1.2 }),
    ],
    access: { storey: 2, stairFlights: 1, carryDistanceFt: 80, occupied: false },
    unseen: [{ what: 'the attic was not filmed', estimatedVolumeCuYd: 4 }],
  }, rates);

  assert.ok(t.cost.likely > rates.minimum);
  assert.equal(sum(t), t.cost.likely);
  assert.ok(t.loads >= 1);
  assert.ok(t.tons > 0);
  assert.equal(t.lines.filter((l: any) => l.kind === 'surcharge').length, 2);
  assert.ok(t.notes.some((n) => /could not be seen/.test(n)));
  // Every line traces back to something a human can check.
  for (const line of t.lines) {
    assert.ok(line.from.length > 0, `${line.label} does not say where it came from`);
    assert.ok(['standard', 'your-rate', 'catalogue', 'estimated'].includes(line.source));
  }
});

test('concrete fills a truck by weight while household junk fills it by volume', () => {
  const concrete = trashTakeoff(obs({
    items: [item({ name: 'broken patio', materialClass: 'concrete-masonry', count: 1, volumeLowCuYd: 4, volumeHighCuYd: 4 })],
  }), rates);
  const household = trashTakeoff(obs({
    items: [item({ count: 1, volumeLowCuYd: 4, volumeHighCuYd: 4 })],
  }), rates);

  const tipOf = (t: any) => t.lines.filter((l: any) => l.kind === 'disposal').reduce((s: number, l: any) => s + l.cost, 0);
  assert.ok(concrete.tons > household.tons * 3, 'the same volume of concrete is not heavier');
  assert.ok(tipOf(concrete) > tipOf(household), 'concrete tipped cheaper than sofas');
});

test('the reader declining is a reason to look, not a reason to fail', () => {
  const t = trashTakeoff({ items: [item()], unsure: true, why: 'the video is too dark to count anything' }, rates);
  assert.equal(t.needsSiteVisit, true);
  assert.ok(t.siteVisitReasons.some((r) => /too dark/.test(r)));
  assert.ok(t.cost.likely > 0, 'the customer still gets a number');
});

/* ── rates ───────────────────────────────────────────────────────────────── */

test('standard rates stay standard until somebody actually overrides one', () => {
  assert.equal(resolveTrashRates(null).source, 'standard');
  assert.equal(resolveTrashRates({}).source, 'standard');
  assert.equal(resolveTrashRates({ laborPerHour: 40 }).source, 'standard', 'the standard figure is not our rate');
  assert.equal(resolveTrashRates({ laborPerHour: 55 }).source, 'your-rate');
  assert.equal(resolveTrashRates({ laborPerHour: 55 }).laborPerHour, 55);
  assert.equal(resolveTrashRates({ disposalPerTon: { wood: 80 } }).source, 'your-rate');
});

test('a junk reading that is pure nonsense does not throw', () => {
  const t = trashTakeoff({ items: [{ name: null, count: -4, materialClass: 'nope', volumeLowCuYd: 'x', volumeHighCuYd: null } as any] }, rates);
  assert.ok(Number.isFinite(t.cost.likely));
  assert.ok(t.cost.likely >= 0);
});

/* ── Eric's own prices, once he sets them ────────────────────────────────── */

test("a surcharge Eric has set beats the published figure, and says it is his", () => {
  const obs = { items: [item({ name: 'queen mattress', count: 2, materialClass: 'mattress' as const })] };

  const published = trashTakeoff(obs, rates);
  const mine = trashTakeoff(obs, { ...rates, surcharges: { mattress: 60 } });

  const lineOfKind = (t: any) => t.lines.find((l: any) => l.kind === 'surcharge');
  assert.equal(lineOfKind(published).unitCost, 35);
  assert.equal(lineOfKind(published).source, 'standard');

  assert.equal(lineOfKind(mine).unitCost, 60);
  assert.equal(lineOfKind(mine).cost, 120, 'two mattresses at his rate');
  assert.equal(lineOfKind(mine).source, 'your-rate', "his own price still reported as standard");
  assert.ok(mine.cost.likely > published.cost.likely);
});

test("a surcharge set to zero is honoured — some tips take mattresses free", () => {
  const t = trashTakeoff(
    { items: [item({ name: 'queen mattress', materialClass: 'mattress' as const })] },
    { ...rates, surcharges: { mattress: 0 } },
  );
  const line = t.lines.find((l: any) => l.kind === 'surcharge');
  assert.equal(line.unitCost, 0);
  assert.equal(line.source, 'your-rate');
});

test("a surcharge saved as nonsense falls back to the published figure", () => {
  for (const bad of [{ mattress: 'free' }, { mattress: -10 }, { mattress: NaN }]) {
    const saved = resolveTrashRates({ surcharges: bad });
    const t = trashTakeoff(
      { items: [item({ name: 'queen mattress', materialClass: 'mattress' as const })] },
      saved,
    );
    assert.equal(t.lines.find((l: any) => l.kind === 'surcharge').unitCost, 35);
  }
});

test("setting only a surcharge is still setting a rate", () => {
  assert.equal(resolveTrashRates({ surcharges: { tyre: 25 } }).source, 'your-rate');
  assert.equal(resolveTrashRates({ surcharges: {} }).source, 'standard');
});

/* ── "everything but the bed" ────────────────────────────────────────────── */

test("an item the customer asked us to leave is not priced, and is listed", () => {
  const all = trashTakeoff(obs({ items: [item({ count: 3 }), item({ name: 'bed', count: 1 })] }), rates);
  const less = trashTakeoff(obs({
    items: [item({ count: 3 }), item({ name: 'bed', count: 1, include: false, excludeReason: 'everything but the bed' })],
  }), rates);

  assert.ok(less.cost.likely < all.cost.likely, 'leaving the bed did not make it cheaper');
  assert.equal(less.excluded.length, 1);
  assert.equal(less.excluded[0].name, 'bed');
  assert.equal(less.excluded[0].reason, 'everything but the bed');
  assert.equal(sum(less), less.cost.likely, 'the lines still add up with something left out');
});

test("excluded volume is gone from the range, not just from the list", () => {
  const less = trashTakeoff(obs({
    items: [item({ count: 1, volumeLowCuYd: 2, volumeHighCuYd: 2 }),
      item({ name: 'bed', volumeLowCuYd: 4, volumeHighCuYd: 4, include: false })],
  }), rates);
  assert.equal(less.volumeCuYd.likely, 2, 'the bed is still in the volume');
  assert.equal(less.volumeCuYd.high, 2);
});

test("an excluded item carries no surcharge and is not refused on our behalf", () => {
  const kept = trashTakeoff(obs({ items: [item({ name: 'queen mattress', materialClass: 'mattress' })] }), rates);
  const left = trashTakeoff(obs({
    items: [item({ name: 'queen mattress', materialClass: 'mattress', include: false })],
  }), rates);

  assert.equal(kept.lines.filter((l: any) => l.kind === 'surcharge').length, 1);
  assert.equal(left.lines.filter((l: any) => l.kind === 'surcharge').length, 0, 'charged for a mattress we are not taking');
  assert.equal(left.excluded.length, 1);
  assert.equal(left.refused.length, 0, 'leaving something is not the same as refusing it');
});

test("something dangerous that was also excluded is simply left — no double listing", () => {
  const t = trashTakeoff(obs({
    items: [item(), item({ name: 'propane tank', include: false, excludeReason: 'only the stuff on the right' })],
  }), rates);
  assert.equal(t.excluded.length, 1);
  assert.equal(t.refused.length, 0, 'it is already out of the job; refusing it too says it twice');
});

test("include defaults to taking it — silence is never an exclusion", () => {
  const t = trashTakeoff(obs({ items: [item({ count: 2 }), item({ name: 'bed' })] }), rates);
  assert.equal(t.excluded.length, 0);
  assert.ok(t.cost.likely > 0);
});

test("a job where everything is excluded prices nothing, and says why", () => {
  const t = trashTakeoff(obs({ items: [item({ include: false, excludeReason: 'leave all of it' })] }), rates);
  assert.equal(t.cost.likely, 0);
  assert.equal(t.excluded.length, 1);
  assert.ok(t.notes.some((n) => /asked us to leave/.test(n)));
});
