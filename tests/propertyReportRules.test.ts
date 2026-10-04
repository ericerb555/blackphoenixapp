/**
 * Whether a generated property report may be sold.
 *
 * WHY THESE ASSERTIONS
 *
 * These three products are different from the other fifteen: an ebook is the
 * same for everybody and can be read before it is listed, while a generated
 * report is different for every buyer and nobody sees it until they have paid.
 * The plan's own words are *"a hollow report at $129 is worse than no
 * product"*, so the gate is the product.
 *
 * Every failure mode is silent and expensive. A threshold accidentally met by
 * an empty property sells a document that tells somebody nothing. A threshold
 * nothing can meet sells nothing and looks like no demand. And a gate that
 * refuses without saying what is missing turns a landlord who is one inspection
 * away from two products into a landlord who leaves.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORTS, reportSpec, canSell, offerFor, emptyEvidence, capitalPlanBasis,
  MIN_DISTINCT_AREAS, type PropertyEvidence,
} from '../supabase/functions/server/propertyReportRules.ts';

/** A property with everything recorded, to subtract from. */
const complete = (over: Partial<PropertyEvidence> = {}): PropertyEvidence => ({
  ...emptyEvidence('prop-1'),
  completedInspections: 1,
  assessedAreas: 14,
  distinctAreas: 12,
  openFindings: 3,
  jobs: 5,
  completedJobs: 4,
  conditionsReports: 1,
  units: 4,
  unitsWithRent: 4,
  yearBuilt: 1992,
  ...over,
});

test('the three reports are the three the plan names, at the prices it names', () => {
  assert.deepEqual(
    REPORTS.map((r) => [r.id, r.priceCents]),
    [['property-health', 7900], ['revenue-opportunity', 9900], ['capital-plan', 12900]],
  );
});

test('an empty property can buy nothing at all', () => {
  // The important direction. A property with no records must never satisfy a
  // threshold by accident — that is the hollow report the plan warns about.
  const offer = offerFor(emptyEvidence('prop-1'));
  assert.equal(offer.length, 3);
  for (const report of offer) {
    assert.equal(report.ok, false, `${report.id} was sellable on an empty property`);
    assert.ok(report.blocker, `${report.id} refused without saying why`);
  }
});

test('a fully recorded property can buy all three', () => {
  // The other direction matters too: a threshold nothing can meet sells nothing
  // and looks exactly like no demand.
  for (const report of offerFor(complete())) {
    assert.equal(report.ok, true, `${report.id} was refused on a complete property: ${report.blocker}`);
    assert.equal(report.blocker, null);
  }
});

test('an unknown report is refused rather than waved through', () => {
  const verdict = canSell('nonsense', complete());
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocker || '', /does not exist/);
  assert.equal(reportSpec('nonsense'), null);
});

// ─── Property Health ─────────────────────────────────────────────────────────

test('property health needs a COMPLETED inspection, not a draft', () => {
  // A draft is somebody halfway through a walk. Counting it would sell a
  // condition report based on a partial look.
  const draftOnly = complete({ completedInspections: 0 });
  const verdict = canSell('property-health', draftOnly);
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocker || '', /completed inspection/);
});

test('property health needs the building covered, not one room', () => {
  const oneRoom = complete({ distinctAreas: MIN_DISTINCT_AREAS - 1 });
  const verdict = canSell('property-health', oneRoom);
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocker || '', new RegExp(`${MIN_DISTINCT_AREAS} areas`));
});

test('distinct areas is what counts, not how many times one was looked at', () => {
  // Twelve looks at one kitchen is not twelve areas, and a report built from
  // that would cover a kitchen while claiming to cover a building.
  const repeated = complete({ assessedAreas: 40, distinctAreas: 2 });
  assert.equal(canSell('property-health', repeated).ok, false);
});

// ─── Revenue Opportunity ─────────────────────────────────────────────────────

test('a revenue report is refused without a rent figure', () => {
  // The product IS the gap between what is charged and what comparable units
  // charge. With no rent recorded there is no gap, only a leaflet.
  const noRent = complete({ unitsWithRent: 0 });
  const verdict = canSell('revenue-opportunity', noRent);
  assert.equal(verdict.ok, false);
  assert.match(verdict.blocker || '', /rent/);
});

test('a revenue report is refused with no units recorded', () => {
  const noUnits = complete({ units: 0, unitsWithRent: 0 });
  assert.match(canSell('revenue-opportunity', noUnits).blocker || '', /unit/);
});

test('one unit with a rent is enough — a single-let landlord is still a customer', () => {
  const single = complete({ units: 1, unitsWithRent: 1 });
  assert.equal(canSell('revenue-opportunity', single).ok, true);
});

test('a revenue report does not need an inspection', () => {
  // Rent and condition are different questions, and requiring a walk-through
  // before answering a rent question would refuse a sale for no reason.
  const noInspection = complete({ completedInspections: 0, distinctAreas: 0, assessedAreas: 0 });
  assert.equal(canSell('revenue-opportunity', noInspection).ok, true);
});

// ─── The 10-Year Capital Plan, which is the one that invites over-claiming ───

test('the capital plan needs the build year AND an inspection, not either', () => {
  const noYear = complete({ yearBuilt: null });
  assert.equal(canSell('capital-plan', noYear).ok, false);
  assert.match(canSell('capital-plan', noYear).blocker || '', /year the building was built/);

  const noLook = complete({ completedInspections: 0 });
  assert.equal(canSell('capital-plan', noLook).ok, false);
  assert.match(canSell('capital-plan', noLook).blocker || '', /completed inspection/);
});

test('age alone would be a table of averages, so it is not enough', () => {
  // With age and no inspection the plan applies to any house of that vintage.
  // That is not worth $129 and is not what the listing promises.
  const ageOnly = { ...emptyEvidence('prop-1'), yearBuilt: 1992 };
  assert.equal(canSell('capital-plan', ageOnly).ok, false);
});

test('the capital plan says its lives are estimated, and from what', () => {
  // Nothing on this platform records when a roof went on. A report that does
  // not distinguish "typical for its age" from "seen" is inventing precision.
  const basis = capitalPlanBasis(complete());
  assert.equal(basis.estimatedFromAge, true);
  assert.equal(basis.confirmedByInspection, 12);
  assert.match(basis.caveat, /age/);
  assert.match(basis.caveat, /12 areas/);
  // And it must tell the owner how to improve it, not merely hedge.
  assert.match(basis.caveat, /tell us the year/);
});

// ─── The refusal has to be useful ────────────────────────────────────────────

test('every requirement says what is needed AND what exists', () => {
  // A gate that only refuses loses the landlord who is one inspection away
  // from two products.
  for (const report of offerFor(emptyEvidence('prop-1'))) {
    assert.ok(report.requirements.length > 0, `${report.id} has no requirements`);
    for (const req of report.requirements) {
      assert.ok(req.need.length > 15, `${report.id}: "${req.need}" does not say what is needed`);
      assert.ok(req.have.length > 2, `${report.id}: a requirement does not say what exists`);
    }
  }
});

test('the blocker is the FIRST unmet requirement, so a button can name one thing', () => {
  const nothing = emptyEvidence('prop-1');
  assert.match(canSell('property-health', nothing).blocker || '', /one completed inspection/);
  // With the inspection done, the blocker moves on rather than vanishing.
  const inspected = { ...nothing, completedInspections: 1, distinctAreas: 3 };
  assert.match(canSell('property-health', inspected).blocker || '', /areas assessed/);
});

test('a met requirement still reports what exists, for the report itself to quote', () => {
  const verdict = canSell('capital-plan', complete());
  assert.equal(verdict.ok, true);
  assert.ok(verdict.requirements.every((r) => r.met));
  assert.ok(verdict.requirements.some((r) => /built 1992/.test(r.have)));
});

test('a nonsense count cannot talk its way past a threshold', () => {
  for (const bad of [-5, Number.NaN, 0] as any[]) {
    const broken = complete({ distinctAreas: bad, completedInspections: bad });
    assert.equal(canSell('property-health', broken).ok, false, `${bad} passed the gate`);
  }
});
