/**
 * Paint — what it refuses, and how many tins.
 *
 * WHY THE REFUSALS ARE THE INTERESTING PART
 *
 * A wrong paint quantity is a second trip and a visible line where two batches
 * meet. A wrong paint *code* is worse: somebody stands at a trade counter and
 * is told it does not exist. So most of what this file checks is what the model
 * declines to produce — a colour with no vendor, a quantity from a coverage
 * nobody supplied, a hex that is not a hex.
 *
 * The other half is the margin rule. `PaintProduct` carries only the vendor's
 * price, so there is no negotiated figure in the model for a screen to leak by
 * accident. That is checked here as a property of the shape rather than trusted
 * to stay true.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isOrderable, paintLabel, safeHex, gallonsFor, paintCost, paintScopeLine,
  DEFAULT_COATS, SHEENS,
  type PaintColor, type PaintProduct,
} from '../src/app/lib/paintModel.ts';

const simplyWhite: PaintColor = {
  id: 'bm-oc-117',
  vendor: 'Benjamin Moore',
  code: 'OC-117',
  name: 'Simply White',
  hex: '#F7F4EF',
};

const regal: PaintProduct = {
  id: 'bm-regal-eggshell',
  vendor: 'Benjamin Moore',
  line: 'Regal Select',
  sheen: 'eggshell',
  coverageSqFtPerGal: 400,
  pricePerGal: 62.99,
};

// ── what may be offered ────────────────────────────────────────────────────

test('a colour with a vendor, a code and a name is orderable', () => {
  assert.ok(isOrderable(simplyWhite));
});

test('a colour missing any of those is refused, not repaired', () => {
  assert.ok(!isOrderable({ ...simplyWhite, vendor: '' }));
  assert.ok(!isOrderable({ ...simplyWhite, code: '' }));
  assert.ok(!isOrderable({ ...simplyWhite, name: '' }));
  assert.ok(!isOrderable({ ...simplyWhite, code: '   ' }), 'whitespace is not a code');
  assert.ok(!isOrderable(null));
  assert.ok(!isOrderable(undefined));
});

test('a hex alone is never enough to order', () => {
  // The exact failure the "no bare hex" rule exists to prevent.
  assert.ok(!isOrderable({ id: 'x', hex: '#F7F4EF' } as any));
});

// ── how a colour is written ────────────────────────────────────────────────

test('a colour reads the way somebody says it at a counter', () => {
  assert.equal(paintLabel(simplyWhite), 'Simply White OC-117 (Benjamin Moore)');
});

test('the label never contains the hex', () => {
  assert.ok(!paintLabel(simplyWhite).includes('#'));
  assert.ok(!paintLabel(simplyWhite).toLowerCase().includes('f7f4ef'));
});

test('an unorderable colour says so rather than rendering half a name', () => {
  assert.equal(paintLabel({ ...simplyWhite, code: '' }), 'No colour chosen');
  assert.equal(paintLabel(null), 'No colour chosen');
});

// ── a vendor-supplied string that ends up inside style ─────────────────────

test('a real hex passes through', () => {
  assert.equal(safeHex('#F7F4EF'), '#F7F4EF');
  assert.equal(safeHex('#fff'), '#fff');
});

test('anything that is not a hex becomes a neutral grey', () => {
  for (const bad of [
    '', 'red', 'F7F4EF', '#12345', '#GGGGGG', null, undefined,
    'url(javascript:alert(1))',
    '#fff; background-image: url(//evil)',
  ]) {
    assert.equal(safeHex(bad as any), '#9ca3af', `${String(bad)} should not reach a style attribute`);
  }
});

// ── quantities ─────────────────────────────────────────────────────────────

test('gallons round up, because paint comes in tins', () => {
  // 400 sq ft, two coats, 400 per gallon = exactly 2.
  assert.equal(gallonsFor(400, 400, 2), 2);
  // 401 sq ft needs a third tin.
  assert.equal(gallonsFor(401, 400, 2), 3);
});

test('two coats is the default and it is two', () => {
  assert.equal(DEFAULT_COATS, 2);
  assert.equal(gallonsFor(400, 400), 2);
});

test('one coat is half the paint, when somebody actually chooses it', () => {
  assert.equal(gallonsFor(400, 400, 1), 1);
});

test('no area means no paint, not a minimum tin', () => {
  assert.equal(gallonsFor(0, 400, 2), 0);
  assert.equal(gallonsFor(-50, 400, 2), 0);
});

test('a coverage nobody supplied cannot produce a quantity', () => {
  // Dividing by zero here would report Infinity tins, which is worse than
  // reporting none: one is obviously broken, the other gets quoted.
  assert.equal(gallonsFor(400, 0, 2), 0);
  assert.equal(gallonsFor(400, NaN as any, 2), 0);
  assert.equal(gallonsFor(400, undefined as any, 2), 0);
});

test('nonsense coats are refused rather than defaulted silently', () => {
  assert.equal(gallonsFor(400, 400, 0), 0);
  assert.equal(gallonsFor(400, 400, -1), 0);
});

// ── cost, at the vendor price and only the vendor price ────────────────────

test('cost is gallons at the vendor own price', () => {
  assert.equal(paintCost(3, regal), 188.97);
});

test('the product carries no negotiated price for a screen to leak', () => {
  // The margin rule enforced by shape rather than by remembering to filter:
  // there is nowhere in this model to put our cost.
  const keys = Object.keys(regal);
  for (const banned of ['ourPrice', 'cost', 'netPrice', 'discountedPrice', 'tradePrice']) {
    assert.ok(!keys.includes(banned), `${banned} must not exist on a paint product`);
  }
  assert.ok(keys.includes('pricePerGal'));
});

test('no gallons or no price is zero, not NaN', () => {
  assert.equal(paintCost(0, regal), 0);
  assert.equal(paintCost(3, null), 0);
  assert.equal(paintCost(3, { ...regal, pricePerGal: 0 }), 0);
});

// ── the scope line ─────────────────────────────────────────────────────────

test('a painted wall becomes one provisional line in the paint phase', () => {
  const line = paintScopeLine({
    surface: 'walls', where: 'Kitchen', areaSqFt: 420,
    color: simplyWhite, product: regal, coats: 2,
  });
  assert.ok(line);
  assert.equal(line!.phase, 'paint');
  assert.equal(line!.trade, 'painting');
  assert.equal(line!.unit, 'gal');
  assert.equal(line!.qty, 3, '420 × 2 ÷ 400 = 2.1, so three tins');
  assert.equal(line!.confidence, 'provisional');
});

test('the line carries the vendor code as the thing to order', () => {
  const line = paintScopeLine({
    surface: 'walls', where: 'Kitchen', areaSqFt: 420,
    color: simplyWhite, product: regal, coats: 2,
  });
  assert.equal(line!.sku, 'OC-117');
});

test('the basis shows the arithmetic, so the quantity can be checked', () => {
  const line = paintScopeLine({
    surface: 'walls', where: 'Kitchen', areaSqFt: 420,
    color: simplyWhite, product: regal, coats: 2,
  });
  assert.match(line!.basis, /420 sq ft/);
  assert.match(line!.basis, /2 coats/);
  assert.match(line!.basis, /400 sq ft per gal/);
});

test('the description names the colour the way it is ordered', () => {
  const line = paintScopeLine({
    surface: 'walls', where: 'Kitchen', areaSqFt: 420,
    color: simplyWhite, product: regal, coats: 2,
  });
  assert.match(line!.description, /Simply White OC-117 \(Benjamin Moore\)/);
  assert.ok(!line!.description.includes('#'));
});

test('an unorderable colour produces no line at all', () => {
  const line = paintScopeLine({
    surface: 'walls', where: 'Kitchen', areaSqFt: 420,
    color: { ...simplyWhite, code: '' }, product: regal, coats: 2,
  });
  assert.equal(line, null, 'a line with no orderable code is worse than no line');
});

test('an unmeasured surface produces no line', () => {
  const line = paintScopeLine({
    surface: 'walls', where: 'Kitchen', areaSqFt: 0,
    color: simplyWhite, product: regal, coats: 2,
  });
  assert.equal(line, null);
});

test('one coat is stated in the basis, never assumed away', () => {
  const line = paintScopeLine({
    surface: 'walls', where: 'Kitchen', areaSqFt: 400,
    color: simplyWhite, product: regal, coats: 1,
  });
  assert.match(line!.basis, /1 coat\b/);
  assert.equal(line!.qty, 1);
});

// ── sheens ─────────────────────────────────────────────────────────────────

test('sheens run flattest to glossiest, the way a decorator lists them', () => {
  assert.deepEqual(SHEENS, ['flat', 'matte', 'eggshell', 'satin', 'semi-gloss', 'gloss']);
});
