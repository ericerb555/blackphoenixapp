/**
 * The approved price ladders, and the metered tier arithmetic under them.
 *
 * WHY THESE ASSERTIONS
 *
 * These are prices. A typo here does not throw, does not fail a build and does
 * not look wrong on a screen — it undercharges every account on that rung until
 * somebody notices by reading an invoice. So the figures Eric approved in
 * `tasks/price-ladders.md` are pinned literally: a change to any of them has to
 * be deliberate enough to edit the expectation too.
 *
 * The arithmetic assertions guard the two ways metering fails silently. A
 * missing `perUnitCents` makes a four-hundred-door manager pay the twenty-four
 * door price, and a floor applied per unit rather than as a minimum makes a
 * two-door landlord pay pennies. Both produce a plausible-looking invoice.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGREED_LADDERS, ladderFor, agreedAudiences } from '../supabase/functions/server/agreedLadders.ts';
import { AUDIENCES, tierMonthlyCents, subscriptionTotalCents, type PlanAddOn } from '../supabase/functions/server/planTier.ts';

/** The table as Eric approved it: audience → [basic, advanced, professional] in dollars. */
const APPROVED_DOLLARS: Record<string, [number, number, number]> = {
  customer: [14, 25, 39],
  // Basic holds at the $49 already being paid rather than dropping to market+10% of $43.
  vendor: [49, 116, 439],
  subcontractor: [54, 153, 301],
  advertiser: [289, 806, 2933],
  landlord: [28, 92, 220],
  property_manager: [72, 199, 335],
  condo_association: [59, 102, 194],
  condo_manager: [315, 450, 675],
  investor: [109, 256, 770],
};

/** audience → [included units, [per-unit rate per rung in dollars]] */
const APPROVED_METERING: Record<string, [number, [number, number, number]]> = {
  landlord: [4, [1.40, 2.20, 3.30]],
  property_manager: [24, [1.35, 3.20, 5.50]],
  condo_association: [24, [1.20, 1.95, 2.75]],
  condo_manager: [100, [1.65, 3.50, 5.50]],
  investor: [4, [12, 25, 45]],
};

const FLAT = ['customer', 'vendor', 'subcontractor', 'advertiser'];

test('every approved ladder is present, once', () => {
  const audiences = agreedAudiences();
  assert.equal(audiences.length, Object.keys(APPROVED_DOLLARS).length);
  assert.equal(new Set(audiences).size, audiences.length, 'an audience appears twice');
  for (const audience of Object.keys(APPROVED_DOLLARS)) {
    assert.ok(ladderFor(audience), `${audience} has no ladder`);
  }
});

test('territory owner and the content centre are deliberately absent', () => {
  // No market comparable exists for either, so there is no agreed figure. If
  // one is added, it should be because Eric gave a number — not because a
  // plausible one got filled in.
  assert.equal(ladderFor('territory_owner'), null);
  assert.equal(ladderFor('content'), null);
});

test('every audience used is one the catalogue knows', () => {
  for (const ladder of AGREED_LADDERS) {
    assert.ok(
      AUDIENCES.includes(ladder.audience),
      `${ladder.audience} is not in AUDIENCES, so a seeded tier could never be read back`,
    );
  }
});

test('the rungs are exactly Basic, Advanced, Professional, in that order', () => {
  for (const ladder of AGREED_LADDERS) {
    assert.deepEqual(
      ladder.rungs.map((r) => r.id), ['basic', 'advanced', 'professional'],
      `${ladder.audience} rung ids`,
    );
    assert.deepEqual(
      ladder.rungs.map((r) => r.name), ['Basic', 'Advanced', 'Professional'],
      `${ladder.audience} rung names`,
    );
  }
});

test('every price matches the approved table', () => {
  for (const ladder of AGREED_LADDERS) {
    const expected = APPROVED_DOLLARS[ladder.audience];
    assert.ok(expected, `${ladder.audience} is not in the approved table`);
    assert.deepEqual(
      ladder.rungs.map((r) => r.priceCents),
      expected.map((d) => Math.round(d * 100)),
      `${ladder.audience} floor prices`,
    );
  }
});

test('prices rise up every ladder, and none is free', () => {
  for (const ladder of AGREED_LADDERS) {
    const prices = ladder.rungs.map((r) => r.priceCents);
    for (const price of prices) assert.ok(price > 0, `${ladder.audience} has a rung at ${price}`);
    assert.ok(prices[1] > prices[0] && prices[2] > prices[1], `${ladder.audience} does not ascend: ${prices}`);
  }
});

test('the metered ladders meter, and the flat ones do not', () => {
  for (const ladder of AGREED_LADDERS) {
    const metering = APPROVED_METERING[ladder.audience];
    if (FLAT.includes(ladder.audience)) {
      assert.ok(!metering, 'test data contradicts itself');
      for (const rung of ladder.rungs) {
        // A flat ladder with a stray per-unit rate would bill a customer for
        // doors they were never told about.
        assert.equal(rung.perUnitCents, undefined, `${ladder.audience}/${rung.id} has a per-unit rate`);
        assert.equal(rung.includedUnits, undefined, `${ladder.audience}/${rung.id} has an included count`);
      }
      assert.equal(ladder.unitNoun, undefined, `${ladder.audience} names a unit but is flat`);
      continue;
    }

    assert.ok(metering, `${ladder.audience} is neither flat nor in the metering table`);
    const [included, rates] = metering;
    assert.ok(ladder.unitNoun, `${ladder.audience} meters units without saying what a unit is`);
    ladder.rungs.forEach((rung, i) => {
      assert.equal(rung.includedUnits, included, `${ladder.audience}/${rung.id} included units`);
      assert.equal(rung.perUnitCents, Math.round(rates[i] * 100), `${ladder.audience}/${rung.id} per-unit rate`);
    });
    assert.ok(rates[1] > rates[0] && rates[2] > rates[1], `${ladder.audience} per-unit rates do not ascend`);
  }
});

test('every ladder records the market figures it came from', () => {
  for (const ladder of AGREED_LADDERS) {
    // The whole basis is "the market average plus ten percent". A price with no
    // recorded market figure cannot be checked by the next person to doubt it.
    assert.ok(
      (ladder.marketBasis || '').length > 40,
      `${ladder.audience} has no usable market basis`,
    );
    assert.match(ladder.marketBasis, /\$/, `${ladder.audience} market basis names no figure`);
  }
});

// ─── The arithmetic ──────────────────────────────────────────────────────────

test('a flat tier ignores the unit count entirely', () => {
  const tier = { priceCents: 2500 };
  assert.equal(tierMonthlyCents(tier, 0), 2500);
  assert.equal(tierMonthlyCents(tier, 400), 2500);
});

test('the floor is a minimum, not a rate — below the included count costs the floor', () => {
  const basic = { priceCents: 7200, includedUnits: 24, perUnitCents: 135 };
  assert.equal(tierMonthlyCents(basic, 0), 7200);
  assert.equal(tierMonthlyCents(basic, 1), 7200);
  assert.equal(tierMonthlyCents(basic, 24), 7200);
});

test('doors above the included count are metered at the rung rate', () => {
  const basic = { priceCents: 7200, includedUnits: 24, perUnitCents: 135 };
  assert.equal(tierMonthlyCents(basic, 25), 7200 + 135);
  assert.equal(tierMonthlyCents(basic, 100), 7200 + 76 * 135);     // $174.60
  assert.equal(tierMonthlyCents(basic, 400), 7200 + 376 * 135);    // $579.60
});

test('the property manager ladder lands where the plan says it does', () => {
  const ladder = ladderFor('property_manager');
  assert.ok(ladder);
  const at = (rung: number, doors: number) => tierMonthlyCents(ladder!.rungs[rung], doors) / 100;
  // tasks/price-ladders.md: "At 400 doors, $580 / $1,402 / $2,403."
  assert.equal(Math.round(at(0, 400)), 580);
  assert.equal(Math.round(at(1, 400)), 1402);
  assert.equal(Math.round(at(2, 400)), 2403);
});

test('a nonsense unit count cannot reduce the bill below the floor', () => {
  const tier = { priceCents: 7200, includedUnits: 24, perUnitCents: 135 };
  for (const units of [-1, -1000, Number.NaN, Number.POSITIVE_INFINITY] as any[]) {
    assert.ok(tierMonthlyCents(tier, units) >= 7200, `${units} produced less than the floor`);
  }
});

test('a per-unit add-on is charged per unit in the subscription total', () => {
  // The bug this pins: subscriptionTotalCents used to add `priceCents`, which
  // for a per-unit add-on is the price of ONE unit — so a hundred-unit
  // association was billed for one.
  const tier = { id: 'basic', audience: 'condo_association', priceCents: 5900, includedUnits: 24, perUnitCents: 120 } as any;
  const onCall: Partial<PlanAddOn> = { id: 'on-call', audience: 'condo_association', priceCents: 400, perUnit: true };
  const total = subscriptionTotalCents(tier, [onCall], 100);
  const tierPart = 5900 + 76 * 120;
  assert.equal(total, tierPart + 100 * 400);
});

test('calling the total the old way, with two arguments, is unchanged', () => {
  const tier = { id: 'basic', audience: 'customer', priceCents: 1400 } as any;
  const flat: Partial<PlanAddOn> = { id: 'content', audience: 'customer', priceCents: 2000 };
  assert.equal(subscriptionTotalCents(tier, [flat]), 3400);
});
