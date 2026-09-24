/**
 * A credit has to survive the journey between the pipeline and the editor.
 *
 * WHY THIS IS TESTED SEPARATELY FROM THE MATHS
 *
 * Because the maths was never the risk here. `convertToWorkRequest` builds a
 * fresh quote object field by field, and anything it does not name is
 * destroyed — the same way `readAddOn` silently dropped size bands and would
 * have taken on-call off sale on the next save.
 *
 * A credit lost on the round trip puts the material back on the bill. The
 * customer is charged for flooring they bought themselves, and the only trace
 * is a total that quietly went up between one opening of the quote and the
 * next. Nothing throws, nothing logs, and the document looks right.
 *
 * This mirrors the conversion rather than importing it — the page pulls in
 * React and cannot be loaded here — so it is a guard on the SHAPE, and it
 * fails the moment the two lists of fields drift apart.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** The fields the pipeline must carry into the editor's quote. */
const CARRIED = [
  'id', 'quoteNumber', 'materials', 'labor', 'processSteps',
  'credits', 'creditsSubtotal',
  'materialsSubtotal', 'laborSubtotal', 'taxRate', 'taxAmount', 'totalCost',
  'generatedAt', 'approvalStatus',
];

function conversionFields(source: string): string[] {
  const start = source.indexOf('const transformedQuote = item.quote ? {');
  if (start < 0) throw new Error('convertToWorkRequest no longer builds transformedQuote');
  const end = source.indexOf('} : undefined;', start);
  const body = source.slice(start, end);
  return [...body.matchAll(/^\s{6}([a-zA-Z]+):/gm)].map(m => m[1]);
}

test('the pipeline carries credits into the quote editor', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync('src/app/pages/UnifiedProjectPipeline.tsx', 'utf8');
  const fields = conversionFields(source);

  for (const field of CARRIED) {
    assert.ok(
      fields.includes(field),
      `convertToWorkRequest drops "${field}" — anything it does not name is lost on the round trip`,
    );
  }
});

test('a materials re-sync does not sweep the credits away with the material lines', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync('src/app/pages/UnifiedProjectPipeline.tsx', 'utf8');
  // The Materials Hub sync rebuilds material lines wholesale. A credit is not
  // a material line and must be written back alongside them.
  const start = source.indexOf('if (parsed.materialsUpdated)');
  assert.ok(start > 0, 'the materials sync block has moved');
  const block = source.slice(start, start + 3000);
  assert.match(block, /credits/,
    'the re-sync must preserve credits — the customer still bought their own flooring');
  assert.match(block, /creditsSubtotal/);
});
