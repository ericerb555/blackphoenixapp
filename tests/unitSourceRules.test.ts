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
