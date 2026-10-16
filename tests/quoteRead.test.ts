/**
 * What a customer is shown about their own quote.
 *
 * THE BUG THESE TESTS EXIST TO PIN
 *
 * `CustomerQuoteApproval.tsx` held a complete fictional job as its initial
 * state — John Smith, a kitchen renovation at 123 Main St Springfield, $10,200
 * of white shaker cabinets, Kashmir White granite, a seven-step kitchen process
 * and a $27,173 total — and merged the real quote over the top of it field by
 * field with `|| prev` on every line. So a quote that did not carry
 * `materials` displayed granite countertops, and `address`, `processSteps`,
 * `taxRate`, `validUntil` and `generatedAt` were not in the merge at all.
 *
 * The rule being pinned here is therefore a NEGATIVE one, and it is the whole
 * point of the file: **a field the record does not carry comes back empty.**
 * Never inherited, never invented, never a plausible default.
 *
 * THE SECOND REASON, WHICH IS WHY THE ALIASES ARE TESTED ONE BY ONE
 *
 * Three shapes of stored quote exist — `normalizeDoc` keeps `items` and has no
 * materials or labour at all, `publishQuote` sends `unitPrice`/`total`, and
 * `quoteMath` uses `qty`/`rate`. The page read only the second, so
 * `item.unitCost.toFixed(2)` on a line carrying `unitPrice` was a TypeError
 * waiting behind the mock. Each alias has a test because each one is a shape
 * that is actually in the store.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readQuote, readMaterial, readLabor, readStep, splitPayment,
  text, figure, list, DEPOSIT_RATE,
} from '../src/app/components/documents/quoteRead.ts';

/* ── nothing is invented ─────────────────────────────────────────────────── */

test('an empty payload produces an empty quote, not a kitchen renovation', () => {
  const q = readQuote({});
  assert.equal(q.projectTitle, '');
  assert.equal(q.projectDescription, '');
  assert.equal(q.address, '');
  assert.equal(q.customerName, '');
  assert.equal(q.customerEmail, '');
  assert.deepEqual(q.materials, []);
  assert.deepEqual(q.labor, []);
  assert.deepEqual(q.processSteps, []);
  assert.equal(q.totalCost, 0);
  assert.equal(q.validUntil, '');
  assert.equal(q.generatedAt, '');
});

test('null and undefined payloads do not throw', () => {
  assert.equal(readQuote(null).totalCost, 0);
  assert.equal(readQuote(undefined).projectTitle, '');
});

test('a quote carrying only labour reports no materials rather than borrowing any', () => {
  const q = readQuote({
    quoteData: { labor: [{ role: 'General Labor', hours: 6, hourlyRate: 40 }] },
  });
  assert.deepEqual(q.materials, []);
  assert.equal(q.materialsSubtotal, 0);
  assert.equal(q.labor.length, 1);
});

/* ── the three shapes that are actually stored ───────────────────────────── */

test('publishQuote shape: unitPrice and total are read', () => {
  const item = readMaterial({ sku: 'LUM-2X4', name: '2x4 stud', quantity: 40, unit: 'each', unitPrice: 4.25, total: 170 }, 0);
  assert.equal(item?.name, '2x4 stud');
  assert.equal(item?.unitCost, 4.25);
  assert.equal(item?.totalCost, 170);
  assert.equal(item?.id, 'LUM-2X4');
});

test('quoteMath shape: qty and rate are read', () => {
  const item = readMaterial({ description: 'Dumpster — 20 yard', qty: 2, rate: 450 }, 0);
  assert.equal(item?.name, 'Dumpster — 20 yard');
  assert.equal(item?.quantity, 2);
  assert.equal(item?.unitCost, 450);
  // Derived, because this shape stores no total.
  assert.equal(item?.totalCost, 900);
});

test('the page own shape: unitCost and totalCost are read', () => {
  const item = readMaterial({ id: 'm1', name: 'Cabinets', quantity: 12, unit: 'units', unitCost: 850, totalCost: 10200 }, 0);
  assert.equal(item?.unitCost, 850);
  assert.equal(item?.totalCost, 10200);
});

test('a stored total wins over one derived from quantity times rate', () => {
  // A sent quote is frozen. If the stored total disagrees with the arithmetic —
  // a discount applied to the line, a rounding, a hand edit — the stored figure
  // is the one the customer was promised.
  const item = readMaterial({ name: 'Disposal', quantity: 3, unitPrice: 100, total: 250 }, 0);
  assert.equal(item?.totalCost, 250);
});

test('normalizeDoc shape: `items` is read when there is no materials/labor split', () => {
  const q = readQuote({
    quoteData: {
      items: [
        { description: 'Haul away — 4 cu yd', qty: 1, rate: 380 },
        { description: 'Mattress surcharge', qty: 2, rate: 35 },
      ],
    },
  });
  assert.equal(q.materials.length, 2);
  assert.equal(q.materialsSubtotal, 450);
  // And it does NOT claim to be a materials list.
  assert.equal(q.linesAreMaterials, false);
});

test('`items` is not guessed into materials and labour', () => {
  // Deciding from a description that a line is somebody's time is how a
  // customer gets told the wrong thing about their own quote.
  const q = readQuote({
    quoteData: { items: [{ description: 'Two men, three hours', qty: 1, rate: 240 }] },
  });
  assert.equal(q.labor.length, 0);
  assert.equal(q.materials.length, 1);
});

test('a real materials/labour split is reported as one', () => {
  const q = readQuote({
    quoteData: {
      materials: [{ name: 'Tip fee', total: 180 }],
      labor: [{ role: 'General Labor', hours: 5, hourlyRate: 40 }],
    },
  });
  assert.equal(q.linesAreMaterials, true);
  assert.equal(q.materialsSubtotal, 180);
  assert.equal(q.laborSubtotal, 200);
});

/* ── lines with nothing behind them are dropped ──────────────────────────── */

test('a line with no name and no money is not a line', () => {
  assert.equal(readMaterial({}, 0), null);
  assert.equal(readMaterial({ unit: 'each' }, 0), null);
  assert.equal(readLabor({}, 0), null);
});

test('a line with a name but no price survives, priced at zero', () => {
  // An unpriced line must still be VISIBLE: a quote that silently drops the
  // thing somebody asked for is worse than one showing it at nothing.
  const item = readMaterial({ name: 'Permit — to be confirmed' }, 0);
  assert.equal(item?.name, 'Permit — to be confirmed');
  assert.equal(item?.totalCost, 0);
});

test('a zero-priced line survives, because zero is a real answer', () => {
  const item = readMaterial({ name: 'Delivery', total: 0 }, 0);
  assert.equal(item?.totalCost, 0);
  assert.notEqual(item, null);
});

test('a description identical to the name is dropped rather than printed twice', () => {
  const item = readMaterial({ name: 'Tip fee', description: 'Tip fee', total: 90 }, 0);
  assert.equal(item?.description, '');
});

test('ids fall back to the index so React keys stay unique', () => {
  assert.equal(readMaterial({ name: 'A', total: 1 }, 0)?.id, 'm0');
  assert.equal(readMaterial({ name: 'B', total: 1 }, 3)?.id, 'm3');
  assert.equal(readLabor({ role: 'A', total: 1 }, 2)?.id, 'l2');
});

/* ── labour ──────────────────────────────────────────────────────────────── */

test('labour reads hours and rate across the namings', () => {
  assert.equal(readLabor({ role: 'Carpenter', hours: 8, hourlyRate: 65 }, 0)?.totalCost, 520);
  assert.equal(readLabor({ name: 'Carpenter', qty: 8, rate: 65 }, 0)?.totalCost, 520);
  assert.equal(readLabor({ trade: 'Carpenter', quantity: 8, unitPrice: 65 }, 0)?.totalCost, 520);
});

/* ── process steps ───────────────────────────────────────────────────────── */

test('a step with neither a title nor a description is dropped', () => {
  assert.equal(readStep({}, 0), null);
  assert.equal(readStep({ estimatedDuration: '2 days' }, 0), null);
});

test('step numbers fall back to position rather than to zero', () => {
  assert.equal(readStep({ title: 'Load out' }, 0)?.stepNumber, 1);
  assert.equal(readStep({ title: 'Tip run' }, 1)?.stepNumber, 2);
  assert.equal(readStep({ title: 'Sweep', stepNumber: 7 }, 1)?.stepNumber, 7);
});

/* ── totals ──────────────────────────────────────────────────────────────── */

test('subtotals are summed from the lines when the record does not carry them', () => {
  const q = readQuote({
    quoteData: {
      materials: [{ name: 'A', total: 100 }, { name: 'B', total: 250 }],
      labor: [{ role: 'L', total: 400 }],
    },
  });
  assert.equal(q.materialsSubtotal, 350);
  assert.equal(q.laborSubtotal, 400);
  assert.equal(q.totalCost, 750);
});

test('a stored total wins over the sum of the lines', () => {
  const q = readQuote({
    quoteData: { materials: [{ name: 'A', total: 100 }], total: 999 },
  });
  assert.equal(q.totalCost, 999);
});

test('a stored subtotal of zero is honoured rather than recomputed', () => {
  // `figure` returns 0 for a stored zero and null only for something
  // unreadable, which is the distinction the old `||` chain could not make:
  // `qd.materialsSubtotal || prev.materialsSubtotal` turned a real zero into
  // the mock's $18,475.
  const q = readQuote({
    quoteData: { materials: [{ name: 'A', total: 100 }], materialsSubtotal: 0, total: 0 },
  });
  assert.equal(q.materialsSubtotal, 0);
  assert.equal(q.totalCost, 0);
});

test('subtotals are read from a `subtotals` object too', () => {
  const q = readQuote({
    quoteData: { subtotals: { materials: 500, labor: 300, tax: 64 } },
  });
  assert.equal(q.materialsSubtotal, 500);
  assert.equal(q.laborSubtotal, 300);
  assert.equal(q.taxAmount, 64);
  assert.equal(q.totalCost, 864);
});

/* ── the envelope wins on contact details ────────────────────────────────── */

test('the server-resolved client details outrank what the quote record remembers', () => {
  const q = readQuote({
    clientName: 'Real Customer',
    clientEmail: 'real@example.com',
    quoteData: { customerName: 'Stale Name', customerEmail: 'stale@example.com' },
  });
  assert.equal(q.customerName, 'Real Customer');
  assert.equal(q.customerEmail, 'real@example.com');
});

test('the record is used where the envelope is silent', () => {
  const q = readQuote({ quoteData: { clientPhone: '603-555-0100' } });
  assert.equal(q.customerPhone, '603-555-0100');
});

/* ── status ──────────────────────────────────────────────────────────────── */

test('an approved quote reports approved rather than pending', () => {
  // Pinned because the page hardcoded 'pending', so a customer following their
  // link a second time was shown the sign-and-approve screen again.
  assert.equal(readQuote({ quoteData: { status: 'approved' } }).approvalStatus, 'approved');
  assert.equal(readQuote({ quoteData: { status: 'rejected' } }).approvalStatus, 'rejected');
});

test('every other status is pending, including absent', () => {
  for (const status of ['draft', 'sent', 'viewed', 'paid', '', undefined]) {
    assert.equal(readQuote({ quoteData: { status } }).approvalStatus, 'pending');
  }
});

/* ── the deposit split ───────────────────────────────────────────────────── */

test('deposit and balance add back to the total', () => {
  for (const total of [0, 1, 99, 380, 1234.56, 27173, 1_000_000]) {
    const { deposit, balance } = splitPayment(total);
    assert.equal(deposit + balance, total > 0 ? total : 0,
      `deposit and balance must reconstruct ${total}`);
  }
});

test('the deposit is the stated rate of the total it is given', () => {
  assert.equal(splitPayment(1000).deposit, 300);
  assert.equal(DEPOSIT_RATE, 0.30);
});

test('an unreadable or negative total produces no payment demand', () => {
  // The direction a mistake must fail in: asking somebody for a deposit on a
  // figure nobody can read is worse than asking for nothing and being queried.
  for (const bad of [NaN, -500, null, undefined, 'lots']) {
    assert.deepEqual(splitPayment(bad as any), { deposit: 0, balance: 0 });
  }
});

/* ── the readers underneath ──────────────────────────────────────────────── */

test('text takes the first non-empty candidate and trims', () => {
  assert.equal(text('', '  ', 'found', 'later'), 'found');
  assert.equal(text(null, undefined, '  padded  '), 'padded');
  assert.equal(text(), '');
  assert.equal(text(0), '0');
});

test('figure distinguishes zero from unreadable', () => {
  assert.equal(figure(0), 0);
  assert.equal(figure('', null, 5), 5);
  assert.equal(figure('12.5'), 12.5);
  assert.equal(figure('not a number'), null);
  assert.equal(figure(), null);
});

test('list takes the first non-empty array and never returns a non-array', () => {
  assert.deepEqual(list(null, [], [1, 2]), [1, 2]);
  assert.deepEqual(list('not an array', { length: 3 }), []);
  assert.deepEqual(list(), []);
});
