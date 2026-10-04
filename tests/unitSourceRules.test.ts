/**
 * Which record prices a metered tier — checked against the approved ladders.
 *
 * WHY THESE ASSERTIONS
 *
 * This is the rule that decides a recurring bill, and getting it wrong is
 * expensive in both directions without anything looking broken.
 *
 * Too wide: a landlord who sits on an association board gets that building's
 * units added to their own, and at the property-manager rate of $5.50 a door a
 * single board seat at a hundred-unit block would put $418 a month on a
 * four-unit landlord's invoice.
 *
 * Too narrow: a metered ladder whose audience has no source silently bills
 * every account at its floor, so a four-hundred-door manager pays the
 * twenty-four-door price and the only symptom is revenue that never arrives.
 *
 * The cross-check against AGREED_LADDERS is the point of the file: adding a
 * metered ladder without deciding where its count comes from fails here rather
 * than at the end of a billing month.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIENCE_UNIT_SOURCE, sourceForAudience, meteredAudiences,
  ON_CALL_UNIT_SOURCES, largerOfOverlapping,
} from '../supabase/functions/server/unitSourceRules.ts';
import { AGREED_LADDERS } from '../supabase/functions/server/agreedLadders.ts';

test('every audience is priced from its own source and nobody else’s', () => {
  for (const [audience, kind] of Object.entries(AUDIENCE_UNIT_SOURCE)) {
    if (kind === null) continue;
    assert.equal(
      kind, audience,
      `${audience} is priced from the ${kind} source — a tier must only count what its own account holds`,
    );
  }
});

test('every ladder in the approved table has a decided source', () => {
  for (const ladder of AGREED_LADDERS) {
    assert.ok(
      ladder.audience in AUDIENCE_UNIT_SOURCE,
      `${ladder.audience} has an approved ladder and no entry in the unit-source map`,
    );
  }
});

test('a ladder that meters units has a source, or a stated reason it has none', () => {
  for (const ladder of AGREED_LADDERS) {
    const meters = ladder.rungs.some((r) => (r.perUnitCents || 0) > 0);
    const decision = sourceForAudience(ladder.audience);
    if (!meters) {
      assert.equal(decision.kind, null, `${ladder.audience} is flat but has a unit source`);
      continue;
    }
    if (decision.kind === null) {
      // Allowed, but only loudly: the bill falls back to the floor, and the
      // reason is what tells somebody why the invoice looks small.
      assert.ok(
        (decision.reason || '').length > 20,
        `${ladder.audience} meters units, has no source, and gives no reason why`,
      );
      assert.equal(ladder.audience, 'investor', 'only the investor ladder is knowingly unsourced');
      continue;
    }
    assert.equal(decision.kind, ladder.audience);
  }
});

test('the flat ladders are never metered', () => {
  for (const audience of ['customer', 'vendor', 'subcontractor', 'advertiser']) {
    const decision = sourceForAudience(audience);
    assert.equal(decision.kind, null, `${audience} must not be priced by units`);
    assert.ok(decision.reason, `${audience} should say why it has no source`);
  }
});

test('an audience nobody has decided about is not metered, and says so', () => {
  // Unknown is deliberately distinct from "decided to be flat": the reason
  // names the audience, so a new portal type that starts billing oddly leads
  // straight back here instead of looking like a pricing bug.
  for (const unknown of ['territory_owner', 'tenant', 'employee', '', 'nonsense']) {
    const decision = sourceForAudience(unknown);
    assert.equal(decision.kind, null, `${unknown || '(none)'} must not meter`);
    assert.match(decision.reason || '', /no unit source is defined/);
  }
});

test('the four metered audiences are exactly the ones with a source', () => {
  assert.deepEqual(
    meteredAudiences().sort(),
    ['condo_association', 'condo_manager', 'landlord', 'property_manager'],
  );
});

test('investor is unsourced on purpose, not by omission', () => {
  const decision = sourceForAudience('investor');
  assert.equal(decision.kind, null);
  // Its investment: records are stakes in deals, not buildings — counting them
  // would bill somebody for holding several positions in one property.
  assert.match(decision.reason || '', /records an investor/);
});

// ─── On-call counts everything, without counting anything twice ──────────────

test('on-call counts every source, including the condo-manager roster', () => {
  // Eric, 2026-10-04: "yes count it towards on-call". A tier is priced on what
  // one audience holds; on-call is priced on everything the account is
  // responsible for, because the phone rings for all of it.
  assert.deepEqual(
    [...ON_CALL_UNIT_SOURCES].sort(),
    ['condo_association', 'condo_manager', 'landlord', 'property_manager'],
  );
});

test('every on-call source is a real source, and every real source is counted', () => {
  // A source that exists but is left out of on-call undercharges silently; one
  // named here that no reader implements counts nothing and looks the same.
  for (const kind of ON_CALL_UNIT_SOURCES) {
    assert.ok(
      Object.values(AUDIENCE_UNIT_SOURCE).includes(kind),
      `${kind} is counted for on-call but is not a source any audience uses`,
    );
  }
  assert.equal(ON_CALL_UNIT_SOURCES.length, meteredAudiences().length);
});

test('a manager who is also on the board is not billed for the same units twice', () => {
  // The roster and the associations describe the same buildings. Summing them
  // would roughly double the bill on an invoice that looks entirely normal.
  const { unitsByKind, dropped } = largerOfOverlapping({
    condo_manager: 400,
    condo_association: 120,
    landlord: 4,
  });
  assert.deepEqual(dropped, ['condo_association']);
  assert.equal(unitsByKind.condo_manager, 400);
  assert.equal(unitsByKind.landlord, 4, 'a source that does not overlap is untouched');
  assert.equal(Object.values(unitsByKind).reduce((a, b) => a + b, 0), 404);
});

test('the larger side wins whichever way round it is', () => {
  const { unitsByKind, dropped } = largerOfOverlapping({ condo_manager: 20, condo_association: 300 });
  assert.deepEqual(dropped, ['condo_manager']);
  assert.equal(unitsByKind.condo_association, 300);
});

test('one source alone is never dropped', () => {
  for (const only of [{ condo_manager: 50 }, { condo_association: 50 }, { landlord: 9 }]) {
    const { unitsByKind, dropped } = largerOfOverlapping(only);
    assert.deepEqual(dropped, []);
    assert.deepEqual(unitsByKind, only);
  }
});

test('a zero does not count as an overlapping source', () => {
  // Otherwise an account with a roster recorded but empty would lose the
  // association units it genuinely holds.
  const { unitsByKind, dropped } = largerOfOverlapping({ condo_manager: 0, condo_association: 120 });
  assert.deepEqual(dropped, []);
  assert.equal(unitsByKind.condo_association, 120);
});
