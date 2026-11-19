/**
 * What a quote save writes back about its own pricing.
 *
 * Eric, 2026-11-19: *"when i save the edits i expect that the tax and profit
 * and everything on the invoice locks unless i change and save it again"*.
 *
 * THE DEFECT, FROM THE LIVE RECORDS
 *
 * `handleSaveQuote` sends a hand-listed set of fields and the server MERGES
 * the body, so a field left off the list is not wiped — it is kept, at
 * whatever it was before. For a figure derived from the lines, surviving is
 * worse than being wiped: it stays as a number that used to be true.
 *
 * `total` is the legacy twin of `totalCost` and was never on the list, so
 * every save moved one and left the other behind:
 *
 *     Jason   Q-2026-0006   totalCost 13,345.11   total 13,359.79
 *     Sarah   Q-2026-0002   totalCost 15,730.56   total 12,666.13
 *
 * Sarah's `total` was still her bare direct cost — $3,064.43 below what her
 * quote charges. `quoteTotalOf` reads `totalCost` first, which is why the
 * screens stayed right; the wrong number was in the record the whole time,
 * and anything reading the raw field got it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingRatesToPersist } from '../src/app/lib/quotePricingToPersist.ts';

/* ── presence decides, because a written zero is a decision ──────────────── */

test('a priced quote records what it was priced with', () => {
  assert.deepEqual(
    pricingRatesToPersist({
      overheadPercent: 0.15, profitPercent: 0.2, contingencyPercent: 0.1,
    }),
    { overheadPercent: 0.15, profitPercent: 0.2, contingencyPercent: 0.1 },
  );
});

test('a deliberate zero is carried through the save, which is what locks it', () => {
  assert.deepEqual(
    pricingRatesToPersist({
      overheadPercent: 0, profitPercent: 0, contingencyPercent: 0,
    }),
    { overheadPercent: 0, profitPercent: 0, contingencyPercent: 0 },
  );
});

/**
 * THE ONE THAT WOULD COST MONEY.
 *
 * Jason carries 3,484.41 above his direct cost with no rate naming it.
 * `asFraction` reads his absent rates as 0, and `customerPricingOf` treats a
 * recorded 0 as "no margin on this job" — so a save that helpfully wrote the
 * normalised rates would lock that margin out, and the next recalculation
 * would drop his quote by exactly that much.
 */
test('a quote that was never priced stays silent, rather than being zeroed', () => {
  assert.deepEqual(pricingRatesToPersist({
    materialsSubtotal: 2943.2, laborSubtotal: 6917.5,
    preTaxTotal: 13345.11, totalCost: 13345.11,
  }), {});
  assert.deepEqual(pricingRatesToPersist({}), {});
  assert.deepEqual(pricingRatesToPersist(null), {});
});

test('a cleared box is an absence, not a decision', () => {
  assert.deepEqual(
    pricingRatesToPersist({ overheadPercent: '', profitPercent: null, contingencyPercent: undefined }),
    {},
  );
});

test('one recorded rate is recorded alone, and does not drag zeros along', () => {
  assert.deepEqual(pricingRatesToPersist({ profitPercent: 0.12 }), { profitPercent: 0.12 });
});

test('a rate that is not a number is not a rate', () => {
  assert.deepEqual(pricingRatesToPersist({ overheadPercent: 'ten per cent' }), {});
});

test('the stored convention is passed through, not rewritten', () => {
  // 10 and 0.10 both mean ten per cent to `asFraction`. Normalising here
  // would be a second, silent edit to a figure nobody touched.
  assert.deepEqual(pricingRatesToPersist({ overheadPercent: 10 }), { overheadPercent: 10 });
});

/* ── and the save actually sends the totals it moves ─────────────────────── */

/**
 * The helper being right proves nothing about whether the save uses it, and
 * the whole defect was in the sending: a figure recomputed on screen and
 * never written, under a server that keeps what it is not told about.
 */
test('handleSaveQuote sends the figures that go stale', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const code = readFileSync(
    join(import.meta.dirname, '..', 'src/app/components/QuoteToContractEditor.tsx'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const figures = code.slice(code.indexOf('const figures = {'), code.indexOf('const figures = {') + 3000);

  for (const field of [
    'total:',              // the legacy twin that was $3,064.43 out on Sarah
    'preTaxTotal:',        // harmless at zero tax, the markup base the moment a rate is set
    'directCost:',
    'overheadAmount:',
    'profitAmount:',
    'contingencyAmount:',
    'pricingRatesToPersist(',
  ]) {
    assert.ok(
      figures.includes(field),
      `the quote save no longer sends ${field} — the server merges, so the old value survives as a number that used to be true`,
    );
  }
});
