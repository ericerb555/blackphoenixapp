/**
 * Reading a supplier's price list.
 *
 * That file's own header says why it needs tests: everything it does is quietly
 * wrong rather than loudly wrong. A splitter that does not understand quotes
 * files a price as a product name. A price parser that does not strip a currency
 * symbol drops the line. None of it throws — it produces a catalogue that looks
 * imported and is wrong, and the first anybody hears of it is a quote with the
 * wrong price on it.
 *
 * The header-row case is the one measured against a real export shape: an ERP
 * price list opens with a title block and an effective date, and assuming row one
 * is the header rejected every line of a perfectly good file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDelimited, parsePrice, guessMapping, findHeaderRow, buildRows,
} from '../src/app/lib/catalogImport.ts';

/** A price list shaped like the ones suppliers actually send. */
const SUPPLIER_EXPORT = [
  'SMITH BUILDING SUPPLY',
  'Contractor Price List',
  'Effective 09/01/2026',
  '',
  'Item #,Description,UOM,Your Price,Category,Stock',
  'BP-2X4PT-8,"2x4 Pressure Treated, 8ft",EA,$8.74,Lumber,Stocked',
  'BP-OSB-716,"OSB Sheathing 7/16"" 4x8",SHT,"$1,024.50",Sheathing,Stocked',
  'DIMENSIONAL LUMBER',
  'BP-2X6PT-12,2x6 Pressure Treated 12ft,EA,18.20,Lumber,Special order',
].join('\n');

test('a quoted field keeps its comma instead of becoming two columns', () => {
  const grid = parseDelimited(SUPPLIER_EXPORT);
  const row = grid.find((r) => r[0] === 'BP-2X4PT-8')!;
  assert.equal(row[1], '2x4 Pressure Treated, 8ft');
});

test('a doubled quote inside a quoted field is one literal quote', () => {
  const grid = parseDelimited(SUPPLIER_EXPORT);
  const row = grid.find((r) => r[0] === 'BP-OSB-716')!;
  assert.equal(row[1], 'OSB Sheathing 7/16" 4x8');
});

test('prices: currency symbols, thousands separators, European decimals', () => {
  assert.equal(parsePrice('$8.74'), 8.74);
  assert.equal(parsePrice('$1,024.50'), 1024.5);
  assert.equal(parsePrice('1.234,56'), 1234.56, 'whichever separator is last is the decimal point');
  assert.equal(parsePrice('18.20'), 18.2);
});

test('a price that is not a price is null, not zero', () => {
  // Zero would import as "we supply this for nothing".
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('call for pricing'), null);
  assert.equal(parsePrice('(12.00)'), null, 'a parenthesised figure is a credit, not a price');
});

test('the header row is FOUND, not assumed to be the first', () => {
  const grid = parseDelimited(SUPPLIER_EXPORT);
  const at = findHeaderRow(grid);
  assert.equal(grid[at][0], 'Item #', 'the title block above it is not the header');
});

test('headers written the way suppliers write them are recognised', () => {
  const grid = parseDelimited(SUPPLIER_EXPORT);
  const mapping = guessMapping(grid[findHeaderRow(grid)]);
  assert.equal(mapping.sku, 0, '"Item #" is a SKU');
  assert.equal(mapping.name, 1, '"Description" is a name');
  assert.equal(mapping.unit, 2, '"UOM" is a unit');
  assert.equal(mapping.price, 3, '"Your Price" is a price, and beats "Unit" for the unit column');
});

test('the whole file imports, and a section heading is rejected with a reason', () => {
  const grid = parseDelimited(SUPPLIER_EXPORT);
  const at = findHeaderRow(grid);
  const built = buildRows(grid, guessMapping(grid[at]), true, at);

  assert.equal(built.rows.length, 3);
  assert.deepEqual(built.rows.map((r) => r.price), [8.74, 1024.5, 18.2]);
  assert.equal(built.rejected.length, 1, 'DIMENSIONAL LUMBER is a heading, not a product');
  assert.match(built.rejected[0].reason, /name/i, 'and it says why');
});

test('assuming the header is row one refuses the entire file', () => {
  // This is what the behaviour was before findHeaderRow existed. Kept as a test
  // so the difference is a measurement rather than a claim.
  const grid = parseDelimited(SUPPLIER_EXPORT);
  const naive = buildRows(grid, guessMapping(grid[0]), true, 0);
  assert.equal(naive.rows.length, 0);
  assert.ok(naive.rejected.length > 0);
});

test('a rejected row reports the line number the spreadsheet shows', () => {
  const grid = parseDelimited(SUPPLIER_EXPORT);
  const at = findHeaderRow(grid);
  const built = buildRows(grid, guessMapping(grid[at]), true, at);
  // Counting the header, 1-based, so it matches what the supplier sees.
  assert.ok(built.rejected[0].line > at + 1);
});
