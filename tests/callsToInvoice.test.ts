/**
 * Getting a 2am callout onto an invoice, exactly once.
 *
 * Two failures to guard, and they pull in opposite directions. Never billing
 * the call loses money quietly — and quietly is the problem, because nobody
 * notices an invoice that is missing a line. Billing it twice loses something
 * worse: a customer who has been charged twice for one night starts checking
 * every figure on every invoice after it, and they are right to.
 *
 * So the tests come in pairs. What reaches the invoice, and what is refused.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  billableCalls, invoiceLinesFromCalls, invoicedCallIds,
} from '../src/app/lib/callsToInvoice.ts';

/** A closed, priced call: $150 callout plus two hours at $95. */
const priced = (over: Record<string, unknown> = {}) => ({
  id: 'call-1',
  jobId: 'job-7',
  workRequestId: 'wr-3',
  title: 'Burst pipe, basement',
  trade: 'plumbing',
  status: 'closed',
  closedAt: '2026-11-02T04:12:00.000Z',
  charges: {
    lines: [
      { description: 'Emergency callout', quantity: 1, unit_price: 150, line_number: 1 },
      { description: 'Labour (2 hrs, 2hr minimum)', quantity: 2, unit_price: 95, line_number: 2 },
    ],
    totalCents: 34000,
    billedHours: 2,
    chargedBy: 'account',
  },
  ...over,
});

test('a closed, priced call on this job is billable', () => {
  const out = billableCalls([priced()], { jobId: 'job-7' });
  assert.equal(out.billable.length, 1);
  assert.equal(out.billable[0].callId, 'call-1');
  assert.equal(out.totalCents, 34000);
});

test('the work request alone is enough to find it', () => {
  const out = billableCalls([priced()], { workRequestId: 'wr-3' });
  assert.equal(out.billable.length, 1);
});

test('another job\'s call is not on this invoice', () => {
  const out = billableCalls([priced({ jobId: 'job-9' })], { jobId: 'job-7' });
  assert.equal(out.billable.length, 0);
});

/**
 * The one that would put a stranger's emergency on somebody's bill. With
 * nothing to scope to, the answer is nothing — not everything.
 */
test('no job and no work request bills nothing at all', () => {
  const out = billableCalls([priced()], {});
  assert.equal(out.billable.length, 0);
  assert.equal(out.totalCents, 0);
});

test('an open call is not finished work and is not billed', () => {
  const out = billableCalls([priced({ status: 'answered' })], { jobId: 'job-7' });
  assert.equal(out.billable.length, 0);
});

// --- not billing it twice -------------------------------------------------

test('the marker on the call keeps it off a second invoice', () => {
  const call = priced();
  (call.charges as any).invoicedOn = 'INV-1042';
  const out = billableCalls([call], { jobId: 'job-7' });
  assert.equal(out.billable.length, 0);
  assert.equal(out.alreadyInvoiced.length, 1);
  assert.match(out.alreadyInvoiced[0].why, /INV-1042/);
});

/**
 * The durable half. The marker is written by a request made AFTER the invoice
 * is saved, so it can be lost — the browser closes, the network drops. The
 * line on the saved invoice cannot be lost, so it has to be able to veto on
 * its own, with no marker present.
 */
test('a line on an existing invoice vetoes it even with no marker', () => {
  const out = billableCalls([priced()], {
    jobId: 'job-7',
    existingInvoices: [{
      invoice_number: 'INV-1042',
      line_items: [{ description: 'Emergency callout', sourceCallId: 'call-1' }],
    }],
  });
  assert.equal(out.billable.length, 0);
  assert.equal(out.alreadyInvoiced.length, 1);
  assert.match(out.alreadyInvoiced[0].why, /INV-1042/);
});

test('an invoice for a different call does not veto this one', () => {
  const out = billableCalls([priced()], {
    jobId: 'job-7',
    existingInvoices: [{ invoice_number: 'INV-9', line_items: [{ sourceCallId: 'call-99' }] }],
  });
  assert.equal(out.billable.length, 1);
});

test('invoicedCallIds reads both line shapes and survives rubbish', () => {
  const found = invoicedCallIds([
    { id: 'a', line_items: [{ sourceCallId: 'c1' }] },
    { invoiceNumber: 'INV-2', lineItems: [{ sourceCallId: 'c2' }] },
    null,
    'not an invoice',
    { id: 'c', line_items: 'also not lines' },
  ]);
  assert.equal(found.get('c1'), 'a');
  assert.equal(found.get('c2'), 'INV-2');
  assert.equal(found.size, 2);
});

// --- the states that must not vanish --------------------------------------

/**
 * The close route prices on a best-effort basis on purpose: an emergency that
 * is over must be closable at midnight even if the rate card will not load.
 * That makes "closed and unpriced" a state the system creates by design, and
 * the calls in it are exactly the ones that hit a problem. Dropping them
 * silently would mean the troubled calls are the ones nobody ever bills.
 */
test('a closed call that was never priced is surfaced, not dropped', () => {
  const out = billableCalls([priced({ charges: null })], { jobId: 'job-7' });
  assert.equal(out.billable.length, 0);
  assert.equal(out.needsPricing.length, 1);
  assert.equal(out.needsPricing[0].callId, 'call-1');
  assert.match(out.needsPricing[0].why, /priced/i);
});

test('a call the account charges nothing for is free, not missing', () => {
  const out = billableCalls([priced({ charges: { lines: [], totalCents: 0 } })], { jobId: 'job-7' });
  assert.equal(out.billable.length, 0);
  assert.equal(out.needsPricing.length, 0, 'an empty price list is a decision, not a failure');
  assert.equal(out.nothingToBill.length, 1);
});

test('a zero-value line never becomes a $0.00 row', () => {
  const out = billableCalls([priced({
    charges: { lines: [{ description: 'Callout', quantity: 1, unit_price: 0 }], totalCents: 0 },
  })], { jobId: 'job-7' });
  assert.equal(out.billable.length, 0);
  assert.equal(out.nothingToBill.length, 1);
});

// --- what lands on the invoice --------------------------------------------

test('lines are renumbered from where the invoice left off', () => {
  const out = billableCalls([priced()], { jobId: 'job-7' });
  const lines = invoiceLinesFromCalls(out.billable, 4);
  assert.deepEqual(lines.map((l) => l.line_number), [4, 5]);
});

test('every line names the call it came from, permanently', () => {
  const out = billableCalls([priced()], { jobId: 'job-7' });
  const lines = invoiceLinesFromCalls(out.billable, 1);
  assert.ok(lines.every((l) => l.sourceCallId === 'call-1'));
});

/**
 * Three callouts on one invoice reading "Emergency callout" three times is an
 * invoice that gets queried. The date and the call are what separate them.
 */
test('a description carries the call and the night it happened', () => {
  const out = billableCalls([priced()], { jobId: 'job-7' });
  const [first] = invoiceLinesFromCalls(out.billable, 1);
  assert.match(first.description, /Emergency callout/);
  assert.match(first.description, /Burst pipe, basement/);
  assert.match(first.description, /2026/);
});

test('two calls produce one continuous run of numbers, oldest first', () => {
  const later = priced({ id: 'call-2', closedAt: '2026-11-09T03:00:00.000Z', title: 'No heat' });
  const out = billableCalls([later, priced()], { jobId: 'job-7' });
  assert.deepEqual(out.billable.map((b) => b.callId), ['call-1', 'call-2']);
  const lines = invoiceLinesFromCalls(out.billable, 1);
  assert.deepEqual(lines.map((l) => l.line_number), [1, 2, 3, 4]);
  assert.equal(out.totalCents, 68000);
});

test('an unreadable closed-at does not put a bad date on the invoice', () => {
  const out = billableCalls([priced({ closedAt: 'not a date' })], { jobId: 'job-7' });
  const [first] = invoiceLinesFromCalls(out.billable, 1);
  assert.doesNotMatch(first.description, /Invalid/i);
});

test('the amounts survive the trip unchanged', () => {
  const out = billableCalls([priced()], { jobId: 'job-7' });
  const lines = invoiceLinesFromCalls(out.billable, 1);
  const total = lines.reduce((n, l) => n + l.quantity * l.unit_price, 0);
  assert.equal(total, 340);
  assert.equal(out.totalCents, 34000);
});

test('nothing in, nothing out', () => {
  const out = billableCalls(null, { jobId: 'job-7' });
  assert.equal(out.billable.length, 0);
  assert.deepEqual(invoiceLinesFromCalls(null, 1), []);
});
