/**
 * A thing we cannot carry is explained once, however many of it there are.
 *
 * SEEN ON THE CUSTOMER'S OWN PAGE.
 *
 * The junk portal for `est_1795137240769_1tzs30` printed the hazardous-waste
 * paragraph in full, then printed it again. A fresh estimate of the same
 * garage printed it SIX times — six items matched the "liquids" rule, and
 * each one pushed its own copy of the same prose.
 *
 * `trashTakeoff` has two places that add a refusal. The hazard loop dedupes
 * by rule id and says why: *"a fridge described once as an item and again in
 * the hazard list is one fridge."* The item loop above it pushed
 * unconditionally. The intent was already written down; one half did not
 * honour it.
 *
 * The names are joined rather than dropped, because `why` is per-rule prose
 * that says nothing about WHICH things are the problem, and the crew turning
 * up needs to know that.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trashTakeoff, type Observations } from '../supabase/functions/server/trashTakeoff.ts';
import { STANDARD_TRASH_RATES } from '../supabase/functions/server/trashRates.ts';

const rates = STANDARD_TRASH_RATES;

const item = (over: Record<string, any> = {}) => ({
  name: 'sofa', count: 1, materialClass: 'mixed-household' as const,
  volumeLowCuYd: 2, volumeHighCuYd: 3, seenIn: [0], confidence: 'high' as const,
  ...over,
});

const obs = (over: Partial<Observations> = {}): Observations => ({ items: [item()], ...over });

/* ── one entry per rule ─────────────────────────────────────────────────── */

test('six tins of the same banned stuff explain themselves once', () => {
  const t = trashTakeoff(obs({
    items: [
      item({ name: 'paint thinner' }),
      item({ name: 'paint thinner' }),
      item({ name: 'solvent' }),
      item({ name: 'motor oil' }),
      item({ name: 'antifreeze' }),
      item({ name: 'paint thinner' }),
    ],
  }), rates);

  const liquids = t.refused.filter((r: any) => r.id === 'liquids');
  assert.equal(
    liquids.length, 1,
    `the liquids refusal appears ${liquids.length} times; the customer reads the `
    + 'same paragraph once per matching item',
  );
});

test('the names of everything that triggered it are kept', () => {
  const t = trashTakeoff(obs({
    items: [item({ name: 'paint thinner' }), item({ name: 'motor oil' })],
  }), rates);

  const liquids = t.refused.find((r: any) => r.id === 'liquids');
  assert.ok(liquids, 'the refusal is gone entirely');
  assert.match(liquids!.named, /paint thinner/);
  assert.match(liquids!.named, /motor oil/, 'the second item was dropped rather than joined');
});

test('the same name twice is named once', () => {
  const t = trashTakeoff(obs({
    items: [item({ name: 'paint thinner' }), item({ name: 'paint thinner' })],
  }), rates);

  const liquids = t.refused.find((r: any) => r.id === 'liquids');
  assert.equal(liquids!.named, 'paint thinner');
});

test('two different rules are still two refusals', () => {
  const t = trashTakeoff(obs({
    items: [item({ name: 'paint thinner' }), item({ name: 'asbestos tiles' })],
  }), rates);

  const ids = new Set(t.refused.map((r: any) => r.id));
  assert.ok(ids.size >= 2, 'collapsing by rule must not collapse different rules together');
});

/**
 * AND THE SITE-VISIT REASON DOES NOT REPEAT EITHER.
 *
 * Asbestos adds one. It sat inside the push that was running per item, so the
 * same sentence could arrive several times — and it renders as a bullet list
 * on the portal, where three identical bullets read as three problems.
 */
test('asbestos asks for a visit once, not once per tile', () => {
  const t = trashTakeoff(obs({
    items: [
      item({ name: 'asbestos tiles' }),
      item({ name: 'asbestos insulation' }),
      item({ name: 'asbestos pipe wrap' }),
    ],
  }), rates);

  const asbestosReasons = t.siteVisitReasons.filter((r: string) => /asbestos/i.test(r));
  assert.equal(
    asbestosReasons.length, 1,
    `"${asbestosReasons[0]}" appears ${asbestosReasons.length} times`,
  );
});

/* ── and nothing that was working stopped ───────────────────────────────── */

test('an ordinary load still refuses nothing', () => {
  const t = trashTakeoff(obs({ items: [item({ name: 'sofa' }), item({ name: 'mattress' })] }), rates);
  assert.equal(t.refused.filter((r: any) => r.id === 'liquids').length, 0);
});

test('a hazard named only in the observations is still caught', () => {
  const t = trashTakeoff(obs({ items: [item()], hazards: ['paint thinner'] } as any), rates);
  assert.equal(t.refused.filter((r: any) => r.id === 'liquids').length, 1);
});

/**
 * The item loop and the hazard loop must not each add one.
 *
 * This is the case the hazard loop's own comment was written for, and it
 * still has to hold now that the item loop dedupes too.
 */
test('named as an item AND in the hazards is one refusal', () => {
  const t = trashTakeoff(obs({
    items: [item({ name: 'paint thinner' })],
    hazards: ['paint thinner'],
  } as any), rates);

  assert.equal(t.refused.filter((r: any) => r.id === 'liquids').length, 1);
});
