/**
 * Five more C1 handlers: two that could be made real, three that could not.
 *
 * PropertyAIEnterprise
 *   'Health score recalculated.'   recalculated nothing
 *   'Capital plan exported.'       exported nothing
 *
 * ShopIntelligenceSuite
 *   'Competitor alert set — you\'ll be notified when they post new products'
 *   'Competitor analysis report generated'
 *   '<style> template sent to Creator Studio'
 *
 * The split matters. The property screen holds real saved data — a profile
 * stored through `saveDual` and a ten-year forecast computed from it — so both
 * of those became real. The shop screen already carries a banner saying every
 * figure on it is invented and no analytics source is connected, so its three
 * buttons had nothing to act on and are switched off with the reason instead;
 * "you'll be notified when they post new products" was a promise about a shop
 * that does not exist.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PROPERTY = 'src/app/pages/PropertyAIEnterprise.tsx';
const SHOP = 'src/app/components/ShopIntelligenceSuite.tsx';
const property = readFileSync(PROPERTY, 'utf8');
const shop = readFileSync(SHOP, 'utf8');

/** Lines of code (not comments) containing a phrase. */
function liveLines(src: string, phrase: string): string[] {
  return src.split('\n').filter((line) =>
    line.includes(phrase) && !/^\s*(\*|\/\/|\/\*)/.test(line));
}

function fn(src: string, decl: string, file: string): string {
  const start = src.indexOf(decl);
  assert.ok(start >= 0, `${file} no longer declares ${decl}`);
  const after = src.indexOf('\n  }', start);
  return src.slice(start, after === -1 ? start + 4000 : after);
}

/* ── the health score ───────────────────────────────────────────────────── */

test('RECALCULATE RE-READS THE SAVED PROFILE instead of only saying so', () => {
  const body = fn(property, 'async function recalculateHealthScore', PROPERTY);
  assert.match(body, /await loadDual\('bp_pai_profile'\)/,
    'another device may have edited the profile since this page loaded');
  assert.match(body, /computeHealthScore\(computeHealthFactors\(/,
    'and the factors are date-sensitive, so the score is recomputed');
  assert.match(body, /setProfile\(/, 'the page must show what it just read');
});

test('it reports the number, and says plainly when nothing moved', () => {
  // "unchanged" is the answer a landlord needs before deciding the score is
  // wrong. A bare "recalculated." was indistinguishable from doing nothing,
  // which is exactly what it did.
  const body = fn(property, 'async function recalculateHealthScore', PROPERTY);
  assert.match(body, /Health score unchanged at \$\{after\}/);
  assert.match(body, /\$\{before\} → \$\{after\}/, 'a change must show both numbers');
  assert.match(body, /toast\.error/, 'and a failed reload must say so');
});

/* ── the capital plan ───────────────────────────────────────────────────── */

test('THE CAPITAL PLAN PRODUCES A FILE', () => {
  const body = fn(property, 'function exportCapitalPlan', PROPERTY);
  assert.match(body, /downloadCsv\(datedFilename\('capital-plan'\)/);
  assert.match(body, /capitalPlan/, 'from the forecast on screen');
  assert.match(body, /sort\(\(a, b\) => a\.estimatedYear - b\.estimatedYear\)/,
    'a ten-year plan belongs in year order');
});

test('the export carries the midpoint, which is what the screen totals', () => {
  // Every figure on the capital tab sums (costMin + costMax) / 2. Shipping the
  // range alone would leave a landlord unable to reproduce the number they are
  // taking to a bank.
  const body = fn(property, 'function exportCapitalPlan', PROPERTY);
  assert.match(body, /'Cost midpoint': Math\.round\(\(item\.costMin \+ item\.costMax\) \/ 2\)/);
  assert.match(body, /'Can defer': item\.canDefer \? 'yes' : 'no'/, 'and whether it can wait');
});

test('an empty plan says so rather than downloading an empty file', () => {
  const body = fn(property, 'function exportCapitalPlan', PROPERTY);
  assert.match(body, /if \(!downloadCsv\(/, 'the false return has to be handled');
  assert.match(body, /nothing to export yet/);
});

test('neither old claim survives in code', () => {
  assert.deepEqual(liveLines(property, "toast.success('Health score recalculated.')"), []);
  assert.deepEqual(liveLines(property, "toast.success('Capital plan exported.')"), []);
});

/* ── the invented competitors ───────────────────────────────────────────── */

test('NOTHING CLAIMS AN ALERT WAS SET on a competitor that does not exist', () => {
  assert.deepEqual(liveLines(shop, 'Competitor alert set'), []);
  assert.deepEqual(liveLines(shop, 'Competitor analysis report generated'), []);
  assert.deepEqual(liveLines(shop, 'template sent to Creator Studio'), []);
});

test('all three are switched off with a reason, not quietly removed', () => {
  // The tasks are real and still want doing; the buttons stay visible so they
  // stay discoverable.
  for (const label of ['Watch', 'Analyze', 'Use This Style']) {
    assert.ok(shop.includes(label), `${label} must still be on the screen`);
  }
  // Each one says why, in a title — written across one line or two, so the
  // reasons are matched rather than the formatting.
  const reasons = shop.match(/title="[^"]*(?:has not been built|still to be built)[^"]*"/g) || [];
  assert.ok(reasons.length >= 3,
    `expected three reasons, found ${reasons.length}: ${JSON.stringify(reasons)}`);
  const disabledCount = (shop.match(/\bdisabled\b/g) || []).length;
  assert.ok(disabledCount >= 3, `expected three disabled controls, found ${disabledCount}`);
});

test('and the screen still carries its example-data banner', () => {
  // The three buttons contradicted this banner in the most specific way
  // available. If the banner ever goes, that contradiction is back.
  assert.match(shop, /Example data — no analytics source is connected/);
});
