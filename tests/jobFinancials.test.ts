/**
 * How a job is doing, in money.
 *
 * This feeds a panel an owner makes decisions on, so the bar is the same as it
 * is for an invoice: every figure is a sum of records that can be shown, and
 * anything that cannot be counted is absent rather than estimated.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobFinancials, invoicesByJob } from '../src/app/lib/jobFinancials.ts';

test('a quoted job with nothing invoiced owes nothing and is all still to bill', () => {
  const f = jobFinancials(4632.4, []);
  assert.equal(f.quoted, 4632.4);
  assert.equal(f.invoiced, 0);
  assert.equal(f.paid, 0);
  assert.equal(f.outstanding, 0);
  assert.equal(f.toInvoice, 4632.4);
  assert.equal(f.overInvoiced, false);
});

test('one invoice, part paid', () => {
  const f = jobFinancials(4632.4, [
    { project_id: 'j1', total_amount: 4632.4, paid_amount: 1000, balance_due: 3632.4 },
  ]);
  assert.equal(f.invoiced, 4632.4);
  assert.equal(f.paid, 1000);
  assert.equal(f.outstanding, 3632.4);
  assert.equal(f.toInvoice, 0, 'the whole quote has been billed');
});

test('several invoices add up', () => {
  const f = jobFinancials(10000, [
    { total_amount: 3000, paid_amount: 3000, balance_due: 0 },
    { total_amount: 2000, paid_amount: 0, balance_due: 2000 },
  ]);
  assert.equal(f.invoiced, 5000);
  assert.equal(f.paid, 3000);
  assert.equal(f.outstanding, 2000);
  assert.equal(f.toInvoice, 5000);
  assert.equal(f.invoiceCount, 2);
});

test('the invoice’s own balance is trusted over recomputing it', () => {
  // A discount or write-off recorded on the invoice must not be argued with.
  const f = jobFinancials(1000, [{ total_amount: 1000, paid_amount: 200, balance_due: 500 }]);
  assert.equal(f.outstanding, 500, 'not 800');
});

test('with no balance recorded, it falls back to what is left', () => {
  const f = jobFinancials(1000, [{ total_amount: 1000, paid_amount: 200 }]);
  assert.equal(f.outstanding, 800);
});

test('an overpaid invoice does not produce a negative balance in the fallback', () => {
  const f = jobFinancials(1000, [{ total_amount: 1000, paid_amount: 1200 }]);
  assert.equal(f.outstanding, 0);
});

test('billing past the quote is flagged rather than hidden', () => {
  const f = jobFinancials(1000, [{ total_amount: 1500, paid_amount: 0, balance_due: 1500 }]);
  assert.equal(f.overInvoiced, true);
  assert.equal(f.toInvoice, -500, 'the sign says which way it went');
});

test('an unquoted job still reports what has been billed and paid', () => {
  const f = jobFinancials(null, [{ total_amount: 800, paid_amount: 800, balance_due: 0 }]);
  assert.equal(f.quoted, null);
  assert.equal(f.toInvoice, null, 'there is no quote to bill against, so this is not zero');
  assert.equal(f.invoiced, 800);
  assert.equal(f.paid, 800);
  assert.equal(f.overInvoiced, false, 'nothing to be over');
});

test('missing and unreadable figures count as nothing rather than NaN', () => {
  const f = jobFinancials(undefined, [
    { total_amount: null as any, paid_amount: undefined },
    { total_amount: 'not a number' as any },
  ]);
  assert.equal(f.invoiced, 0);
  assert.equal(f.paid, 0);
  assert.equal(f.outstanding, 0);
  assert.equal(Number.isNaN(f.invoiced), false);
});

test('nothing at all is a clean zero', () => {
  const f = jobFinancials(null, null);
  assert.deepEqual(
    { q: f.quoted, i: f.invoiced, p: f.paid, o: f.outstanding, t: f.toInvoice, c: f.invoiceCount },
    { q: null, i: 0, p: 0, o: 0, t: null, c: 0 },
  );
});

/* ── grouping ────────────────────────────────────────────────────────────── */

test('invoices group by the job they were raised against', () => {
  const byJob = invoicesByJob([
    { project_id: 'j1', total_amount: 100 },
    { project_id: 'j1', total_amount: 200 },
    { project_id: 'j2', total_amount: 300 },
  ]);
  assert.equal(byJob.get('j1')!.length, 2);
  assert.equal(byJob.get('j2')!.length, 1);
});

test('an invoice with no job belongs to no job, not to every job', () => {
  const byJob = invoicesByJob([
    { project_id: '', total_amount: 100 },
    { project_id: null, total_amount: 200 },
    { total_amount: 300 },
  ]);
  assert.equal(byJob.size, 0,
    'the two invoices in production carry no project_id; they must not attach themselves to something');
});
