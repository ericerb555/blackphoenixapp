/**
 * What a tenant can be charged for.
 *
 * These are the behaviours that decide whether a deduction survives being
 * challenged, so they are pinned harder than most:
 *
 *   - the SIGNED record governs, and a landlord's differing reading is shown
 *     rather than quietly preferred
 *   - a one-step drop is WEAR and charges nothing until a person says otherwise
 *   - no move-in record means NOTHING is chargeable, rather than being treated
 *     as "it was perfect when they arrived"
 *   - an override can move a line between wear and damage and nothing else
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareConditions, classify, conditionIndex, monthsBetween, CONDITION_SCALE,
} from '../supabase/functions/server/conditionDiff.ts';

const area = (name: string, condition: string, over: Record<string, any> = {}) => ({
  name, condition, notes: '', media: [], ...over,
});

/** A form as stored: the landlord's reading, and what the tenant signed. */
const form = (landlord: any[], signed: any[] | null, completedAt = '2026-01-15T10:00:00.000Z') => ({
  data: { areas: landlord },
  tenantResponses: signed ? { areas: signed } : {},
  completedAt,
});

const lineFor = (diff: any, name: string) => diff.lines.find((l: any) => l.area === name);

/* ── the scale ───────────────────────────────────────────────────────────── */

test('the scale runs best to worst, so a bigger index is a worse area', () => {
  assert.deepEqual(CONDITION_SCALE, ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']);
  assert.equal(conditionIndex('Excellent'), 0);
  assert.equal(conditionIndex('Damaged'), 4);
});

test('case and padding do not decide a charge', () => {
  assert.equal(conditionIndex('  good  '), 1);
  assert.equal(conditionIndex('DAMAGED'), 4);
});

test('a condition that is not on the scale is not guessed at', () => {
  assert.equal(conditionIndex('Knackered'), null);
  assert.equal(conditionIndex(''), null);
  assert.equal(conditionIndex(undefined), null);
});

/* ── wear against damage ─────────────────────────────────────────────────── */

test('one step down is wear, and wear charges nothing', () => {
  const c = classify(1, 2); // Good -> Fair
  assert.equal(c.classification, 'wear');
  assert.equal(c.steps, 1);
});

test('two steps down is damage', () => {
  const c = classify(1, 3); // Good -> Poor
  assert.equal(c.classification, 'damage');
  assert.equal(c.steps, 2);
});

test('anything reaching Damaged is damage, even by one step', () => {
  const c = classify(3, 4); // Poor -> Damaged
  assert.equal(c.classification, 'damage');
  assert.equal(c.steps, 1, 'one step, but the step onto Damaged');
});

test('unchanged and improved produce nothing to charge', () => {
  assert.equal(classify(2, 2).classification, 'unchanged');
  assert.equal(classify(3, 1).classification, 'improved');
  assert.equal(classify(3, 1).steps, -2);
});

test('the wear line says it is not charged, in words that go on the report', () => {
  assert.match(classify(0, 1).why, /not charged/i);
});

/* ── the signed record governs ───────────────────────────────────────────── */

test('the comparison runs on what the tenant signed, not the landlord draft', () => {
  const moveIn = form([area('Kitchen', 'Fair')], [area('Kitchen', 'Poor')]);
  const moveOut = form([area('Kitchen', 'Damaged')], [area('Kitchen', 'Poor')]);
  const line = lineFor(compareConditions(moveIn, moveOut), 'Kitchen');
  // Signed Poor -> signed Poor is unchanged, even though the landlord's own
  // readings would have been Fair -> Damaged, a two-step drop.
  assert.equal(line.classification, 'unchanged');
  assert.equal(line.chargeable, false);
});

test('a differing landlord reading is surfaced rather than discarded', () => {
  const moveIn = form([area('Kitchen', 'Fair')], [area('Kitchen', 'Poor')]);
  const moveOut = form([area('Kitchen', 'Damaged')], [area('Kitchen', 'Poor')]);
  const line = lineFor(compareConditions(moveIn, moveOut), 'Kitchen');
  assert.equal(line.disputed, true);
  assert.equal(line.moveIn.landlordCondition, 'Fair');
  assert.equal(line.moveOut.landlordCondition, 'Damaged');
  assert.match(line.why, /two accounts differ/i);
});

test('an agreed area is not marked as disputed', () => {
  const moveIn = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')]);
  const moveOut = form([area('Kitchen', 'Fair')], [area('Kitchen', 'Fair')]);
  const line = lineFor(compareConditions(moveIn, moveOut), 'Kitchen');
  assert.equal(line.disputed, false);
  assert.equal(line.moveIn.landlordCondition, undefined, 'no point repeating an agreed figure');
});

test('a disputed count appears in the notes, because those are the lines to settle', () => {
  const moveIn = form([area('Kitchen', 'Fair')], [area('Kitchen', 'Good')]);
  const moveOut = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')]);
  const diff = compareConditions(moveIn, moveOut);
  assert.equal(diff.disputedAreas, 1);
  assert.ok(diff.notes.some((n: string) => /different conditions/i.test(n)));
});

test('an unsigned record is used but called out as weaker evidence', () => {
  const moveIn = form([area('Kitchen', 'Good')], null);
  const moveOut = form([area('Kitchen', 'Damaged')], null);
  const diff = compareConditions(moveIn, moveOut);
  assert.equal(lineFor(diff, 'Kitchen').classification, 'damage', 'still comparable');
  assert.equal(lineFor(diff, 'Kitchen').moveIn.signed, false);
  assert.ok(diff.notes.some((n: string) => /never signed/i.test(n)));
});

/* ── no baseline ─────────────────────────────────────────────────────────── */

test('no move-in record at all means nothing is chargeable', () => {
  const moveOut = form([area('Kitchen', 'Damaged')], [area('Kitchen', 'Damaged')]);
  const diff = compareConditions(null, moveOut);
  assert.equal(diff.noBaseline, true);
  assert.equal(diff.chargeableAreas, 0, 'a damaged kitchen with no before is not provable');
  assert.equal(lineFor(diff, 'Kitchen').classification, 'no_baseline');
  assert.ok(diff.notes.some((n: string) => /no completed move-in record/i.test(n)));
});

test('an area missing from the move-in record is not treated as having been perfect', () => {
  const moveIn = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')]);
  const moveOut = form(
    [area('Kitchen', 'Good'), area('Bedroom(s)', 'Damaged')],
    [area('Kitchen', 'Good'), area('Bedroom(s)', 'Damaged')],
  );
  const diff = compareConditions(moveIn, moveOut);
  assert.equal(lineFor(diff, 'Bedroom(s)').classification, 'no_baseline');
  assert.equal(lineFor(diff, 'Bedroom(s)').chargeable, false,
    'assuming Excellent on arrival is how a tenant gets charged for somebody else\'s wear');
});

/* ── the override ────────────────────────────────────────────────────────── */

test('a landlord can escalate wear to damage, and it is recorded as their decision', () => {
  const moveIn = form([area('Flooring', 'Good')], [area('Flooring', 'Good')]);
  const moveOut = form([area('Flooring', 'Fair')], [area('Flooring', 'Fair')]);
  const diff = compareConditions(moveIn, moveOut, [{
    area: 'Flooring', classification: 'damage', by: 'landlord@example.com',
    at: '2026-10-02T00:00:00.000Z', reason: 'Burn mark, not wear',
  }]);
  const line = lineFor(diff, 'Flooring');
  assert.equal(line.classification, 'damage');
  assert.equal(line.chargeable, true);
  assert.match(line.why, /Burn mark/);
  assert.match(line.why, /landlord@example\.com/, 'the report has to say who decided');
});

test('and can de-escalate damage to wear', () => {
  const moveIn = form([area('Flooring', 'Good')], [area('Flooring', 'Good')]);
  const moveOut = form([area('Flooring', 'Damaged')], [area('Flooring', 'Damaged')]);
  const diff = compareConditions(moveIn, moveOut, [{
    area: 'Flooring', classification: 'wear', by: 'landlord@example.com', at: 'x',
  }]);
  assert.equal(lineFor(diff, 'Flooring').chargeable, false);
});

test('an override cannot charge for an area that did not change', () => {
  const moveIn = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')]);
  const moveOut = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')]);
  const diff = compareConditions(moveIn, moveOut, [{
    area: 'Kitchen', classification: 'damage', by: 'landlord@example.com', at: 'x',
  }]);
  assert.equal(lineFor(diff, 'Kitchen').classification, 'unchanged');
  assert.equal(lineFor(diff, 'Kitchen').chargeable, false,
    'otherwise the override is a way to charge for anything at all');
});

test('an override cannot manufacture a baseline that does not exist', () => {
  const moveOut = form([area('Kitchen', 'Damaged')], [area('Kitchen', 'Damaged')]);
  const diff = compareConditions(null, moveOut, [{
    area: 'Kitchen', classification: 'damage', by: 'landlord@example.com', at: 'x',
  }]);
  assert.equal(lineFor(diff, 'Kitchen').chargeable, false);
});

test('an override for an area nobody recorded changes nothing', () => {
  const moveIn = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')]);
  const moveOut = form([area('Kitchen', 'Fair')], [area('Kitchen', 'Fair')]);
  const diff = compareConditions(moveIn, moveOut, [{
    area: 'Attic', classification: 'damage', by: 'x', at: 'x',
  }]);
  assert.equal(diff.lines.length, 1);
  assert.equal(diff.chargeableAreas, 0);
});

/* ── evidence ────────────────────────────────────────────────────────────── */

test('evidence from both accounts travels onto the line', () => {
  const moveIn = form(
    [area('Flooring', 'Good', { media: [{ id: 'LL1', name: 'a.jpg', type: 'image' }] })],
    [area('Flooring', 'Good', { media: [{ id: 'T1', name: 'b.jpg', type: 'image' }] })],
  );
  const moveOut = form([area('Flooring', 'Damaged')], [area('Flooring', 'Damaged')]);
  const line = lineFor(compareConditions(moveIn, moveOut), 'Flooring');
  assert.deepEqual(line.moveIn.media.map((m: any) => m.id), ['T1', 'LL1'],
    "both sides' photographs are evidence and neither supersedes the other");
});

test('the same photograph is not listed twice', () => {
  const shared = [{ id: 'SAME', name: 'a.jpg', type: 'image' }];
  const moveIn = form([area('Flooring', 'Good', { media: shared })], [area('Flooring', 'Good', { media: shared })]);
  const moveOut = form([area('Flooring', 'Poor')], [area('Flooring', 'Poor')]);
  const line = lineFor(compareConditions(moveIn, moveOut), 'Flooring');
  assert.equal(line.moveIn.media.length, 1);
});

/* ── tenancy length ──────────────────────────────────────────────────────── */

test('tenancy length is reported', () => {
  const moveIn = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')], '2024-03-10T00:00:00.000Z');
  const moveOut = form([area('Kitchen', 'Fair')], [area('Kitchen', 'Fair')], '2026-09-28T00:00:00.000Z');
  assert.equal(compareConditions(moveIn, moveOut).tenancyMonths, 30);
});

test('but it does not change the classification', () => {
  const short = compareConditions(
    form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')], '2026-08-01T00:00:00.000Z'),
    form([area('Kitchen', 'Fair')], [area('Kitchen', 'Fair')], '2026-09-01T00:00:00.000Z'),
  );
  const long = compareConditions(
    form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')], '2020-08-01T00:00:00.000Z'),
    form([area('Kitchen', 'Fair')], [area('Kitchen', 'Fair')], '2026-09-01T00:00:00.000Z'),
  );
  assert.equal(lineFor(short, 'Kitchen').classification, 'wear');
  assert.equal(lineFor(long, 'Kitchen').classification, 'wear',
    'one rule plus a stated fact is easier to defend than two rules interacting');
});

test('a month is not counted until the day comes round', () => {
  assert.equal(monthsBetween('2026-01-31', '2026-02-28'), 0);
  assert.equal(monthsBetween('2026-01-01', '2026-02-01'), 1);
  assert.equal(monthsBetween('not a date', '2026-02-01'), null);
});

/* ── the awkward shapes ──────────────────────────────────────────────────── */

test('nothing at all does not throw', () => {
  const diff = compareConditions(null, null);
  assert.deepEqual(diff.lines, []);
  assert.equal(diff.chargeableAreas, 0);
  assert.equal(diff.noBaseline, true);
});

test('an off-scale move-out condition is reported as unreadable, not charged', () => {
  const moveIn = form([area('Kitchen', 'Good')], [area('Kitchen', 'Good')]);
  const moveOut = form([area('Kitchen', 'Knackered')], [area('Kitchen', 'Knackered')]);
  const line = lineFor(compareConditions(moveIn, moveOut), 'Kitchen');
  assert.equal(line.classification, 'unreadable');
  assert.equal(line.chargeable, false);
});

test('a duplicated area name is taken once', () => {
  const moveIn = form([area('Kitchen', 'Good'), area('Kitchen', 'Poor')], null);
  const moveOut = form([area('Kitchen', 'Good')], null);
  assert.equal(compareConditions(moveIn, moveOut).lines.length, 1);
});

test('every chargeable line carries a reason somebody can read', () => {
  const moveIn = form([area('Flooring', 'Excellent')], [area('Flooring', 'Excellent')]);
  const moveOut = form([area('Flooring', 'Damaged')], [area('Flooring', 'Damaged')]);
  const line = lineFor(compareConditions(moveIn, moveOut), 'Flooring');
  assert.equal(line.chargeable, true);
  assert.match(line.why, /Damaged/);
  assert.match(line.why, /Excellent/, 'the before and the after both belong in the sentence');
});
