/**
 * The writing that goes with the number.
 *
 * A paragraph saying "prices may vary" protects nobody. What is pinned here is
 * that the writing is SPECIFIC to the job it describes:
 *
 *   - a refused item is named in what is not included, with what to do instead
 *   - what could not be seen is always said, even when nothing was hidden
 *   - every trigger that could move the price carries the figure it moves by
 *   - the customer's attestation names the two things that actually go wrong
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateBasis, ATTESTATION, PHOTO_ESTIMATE_TERMS } from '../supabase/functions/server/estimateBasis.ts';
import { trashTakeoff } from '../supabase/functions/server/trashTakeoff.ts';
import { STANDARD_TRASH_RATES } from '../supabase/functions/server/trashRates.ts';

const rates = STANDARD_TRASH_RATES;
const item = (over: Record<string, any> = {}) => ({
  name: 'sofa', count: 1, materialClass: 'mixed-household' as const,
  volumeLowCuYd: 2, volumeHighCuYd: 3, seenIn: [0], confidence: 'high' as const,
  ...over,
});
const basisFor = (obs: any) => estimateBasis(trashTakeoff(obs, rates), rates);

test('what we saw names the volume, the trucks and every surcharge', () => {
  const b = basisFor({
    items: [item({ count: 4 }), item({ name: 'queen mattress', count: 2, materialClass: 'mattress' })],
  });
  assert.ok(b.whatWeSaw.some((s) => /cubic yards in total/.test(s)));
  assert.ok(b.whatWeSaw.some((s) => /truck/.test(s)));
  assert.ok(b.whatWeSaw.some((s) => /Mattress/.test(s) && /\$35 each/.test(s)));
});

test('access that was allowed for is stated; access that was assumed is flagged as an assumption', () => {
  const hard = basisFor({ items: [item({ count: 3 })], access: { stairFlights: 2 } });
  assert.ok(hard.whatWeSaw.some((s) => /stairs/.test(s)));

  const flat = basisFor({ items: [item({ count: 3 })] });
  assert.ok(flat.whatWeAssumed.some((s) => /ground-floor/.test(s)),
    'a job priced as easy access never said it had assumed easy access');
});

test('what could not be seen is said even when nothing was hidden', () => {
  const clean = basisFor({ items: [item()] });
  assert.ok(clean.whatWeCouldNotSee.length > 0);
  assert.ok(clean.whatWeCouldNotSee.some((s) => /front of a pile/.test(s)));
});

test('hidden volume is named with its figure and said to raise only the top', () => {
  const b = basisFor({
    items: [item({ count: 3 })],
    unseen: [{ what: 'behind the stack', estimatedVolumeCuYd: 5 }],
  });
  assert.ok(b.whatWeCouldNotSee.some((s) => /5 cubic yards/.test(s)));
  assert.ok(b.whatWeCouldNotSee.some((s) => /never left out/.test(s)));
});

test('a refused item is named in what is not included, with what to do instead', () => {
  const b = basisFor({
    items: [item(), item({ name: 'propane tank', volumeLowCuYd: 0.2, volumeHighCuYd: 0.2 })],
  });
  const line = b.notIncluded.find((s) => /Propane/.test(s));
  assert.ok(line, 'the refused tank is not mentioned anywhere');
  assert.ok(/exchange cage/.test(line!), 'told the customer no without telling them where to go');
});

test('demolition adds the exclusions a photograph cannot rule out', () => {
  const b = basisFor({ items: [], demo: [{ description: 'kitchen', areaSqFt: 200, structural: false }] });
  assert.ok(b.notIncluded.some((s) => /Permits/.test(s)));
  assert.ok(b.notIncluded.some((s) => /live services/i.test(s)));
  assert.ok(b.whatWeAssumed.some((s) => /thirty square feet/.test(s)));
});

test('every trigger that could move the price carries the figure it moves by', () => {
  const b = basisFor({ items: [item({ count: 3 })] });
  assert.ok(b.whatChangesThisPrice.length >= 5);
  for (const t of b.whatChangesThisPrice) {
    assert.ok(t.trigger.length > 10, 'a trigger with no description');
    assert.ok(/\$|%|price|rates/.test(t.rate), `"${t.trigger}" says it changes the price but not by how much`);
  }
  const extra = b.whatChangesThisPrice[0];
  assert.ok(/per extra cubic yard/.test(extra.rate));
  assert.ok(/\$\d+/.test(extra.rate), 'no actual dollar figure for extra volume');
});

test('the extra-volume rate tracks the rate card rather than being typed in', () => {
  const dearer = estimateBasis(
    trashTakeoff({ items: [item({ count: 3 })] }, { ...rates, laborPerHour: 80 }),
    { ...rates, laborPerHour: 80 },
  );
  const standard = basisFor({ items: [item({ count: 3 })] });
  const figure = (b: any) => Number(/\$(\d+) per extra cubic yard/.exec(b.whatChangesThisPrice[0].rate)?.[1]);
  assert.ok(figure(dearer) > figure(standard), 'doubling the labour rate did not change what extra volume costs');
});

test('a refusal is taken off the price, not added to it', () => {
  const b = basisFor({ items: [item(), item({ name: 'asbestos pipe lagging', volumeLowCuYd: 0.2, volumeHighCuYd: 0.2 })] });
  const trigger = b.whatChangesThisPrice.find((t) => /not allowed to carry/.test(t.trigger));
  assert.ok(/taken off the price/.test(trigger!.rate));
});

test('the attestation names the two things that actually go wrong', () => {
  assert.ok(/everything that needs to be taken away/.test(ATTESTATION));
  assert.ok(/access is as I have described/.test(ATTESTATION));
  assert.ok(/before any extra work is done/.test(ATTESTATION));
  assert.equal(basisFor({ items: [item()] }).attestation, ATTESTATION);
});

test('the clause says the customer can decline, and that it cannot reprice what was shown', () => {
  assert.ok(/You can decline/.test(PHOTO_ESTIMATE_TERMS));
  assert.ok(/before we carry on/.test(PHOTO_ESTIMATE_TERMS));
  assert.ok(/nothing here changes the price of what the pictures did show/.test(PHOTO_ESTIMATE_TERMS));
});

test('an empty job still produces a usable basis rather than throwing', () => {
  const b = basisFor({ items: [] });
  assert.ok(Array.isArray(b.whatWeSaw));
  assert.ok(b.whatChangesThisPrice.length > 0);
  assert.equal(b.terms, PHOTO_ESTIMATE_TERMS);
});
