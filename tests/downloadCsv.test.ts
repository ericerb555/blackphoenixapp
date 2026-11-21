/**
 * The export buttons on the three portals now produce a file.
 *
 * They were `toast.success('Downloading report...')` and nothing else — the
 * audit's C1 bucket, "the whole handler is a message". The charts beside them
 * hold real server data (ad impressions, purchase orders, paid distributions),
 * so the only missing piece was the download.
 *
 * What is tested here is the CSV itself, because a wrong export is worse than
 * no export: these files go into somebody's own books. A quote that is not
 * escaped silently shifts every column after it, an internal ordering key that
 * leaks ends up in a customer's spreadsheet, and an empty file handed over as
 * "your report" is the original lie with extra steps.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, datedFilename } from '../src/app/lib/downloadCsv.ts';

test('a header row, then one row per record, in the order asked for', () => {
  const csv = toCsv(
    [{ month: 'Jan', revenue: 1200, orders: 3 }, { month: 'Feb', revenue: 800, orders: 1 }],
    ['month', 'revenue', 'orders'],
  );
  assert.equal(csv, [
    '"month","revenue","orders"',
    '"Jan","1200","3"',
    '"Feb","800","1"',
  ].join('\r\n'));
});

test('A COLUMN NOT ASKED FOR DOES NOT SHIP', () => {
  // The vendor rows carry `sort` — "2026-03" — purely to order the months.
  // It is an internal field and has no business in a vendor's download.
  const csv = toCsv([{ month: 'Mar', revenue: 10, orders: 1, sort: '2026-03' }], ['month', 'revenue', 'orders']);
  assert.ok(!csv.includes('sort'), csv);
  assert.ok(!csv.includes('2026-03'), csv);
});

test('a quote in a value is escaped, not left to shift every later column', () => {
  const csv = toCsv([{ name: 'The 6" slab job' }], ['name']);
  assert.equal(csv, '"name"\r\n"The 6"" slab job"');
});

test('a comma and a newline survive inside one cell', () => {
  const csv = toCsv([{ note: 'Salem, NH\nsecond line' }], ['note']);
  assert.equal(csv.split('\r\n')[0], '"note"');
  assert.ok(csv.includes('"Salem, NH\nsecond line"'), csv);
});

test('A LEADING = IS NEUTERED — a spreadsheet would run it', () => {
  // A cell opening with =, +, - or @ is a formula to Excel and Sheets. The
  // values here come from names a customer typed.
  for (const dangerous of ['=1+1', '+SUM(A1)', '-2+3', '@foo', '=cmd|calc']) {
    const csv = toCsv([{ v: dangerous }], ['v']);
    assert.ok(csv.includes(`"'${dangerous}"`), `${dangerous} was not prefixed: ${csv}`);
  }
});

test('a negative number is still neutered, and still readable', () => {
  // -500 opens with a minus, so it gets the prefix too. A row of refunds
  // reading '-500 is odd but correct; a row that executes is not.
  assert.equal(toCsv([{ v: -500 }], ['v']), '"v"\r\n"\'-500"');
});

test('a missing or null field is an empty cell, not the word undefined', () => {
  const csv = toCsv([{ month: 'Jan' }, { month: 'Feb', value: null }], ['month', 'value']);
  assert.equal(csv, '"month","value"\r\n"Jan",""\r\n"Feb",""');
});

test('zero is a value and is written as one', () => {
  // `0` is falsy, and an export that drops it turns a month with no revenue
  // into a month with no data.
  assert.equal(toCsv([{ revenue: 0 }], ['revenue']), '"revenue"\r\n"0"');
});

test('with no columns given, every key that appears is a column', () => {
  const csv = toCsv([{ a: 1 }, { a: 2, b: 3 }]);
  assert.equal(csv.split('\r\n')[0], '"a","b"');
});

test('the filename carries the date, so two exports do not collide', () => {
  const name = datedFilename('revenue-trends');
  assert.match(name, /^revenue-trends-\d{4}-\d{2}-\d{2}\.csv$/, name);
});
