/**
 * What the approver sees before they tap.
 *
 * The queue used to show one line, written by the model, about itself. These
 * tests exist because the queue is about to hold emails to customers and
 * invoices for real money, and the two properties that matter cannot be seen
 * by reading the component: that the parameters are actually rendered, and
 * that model-authored HTML is never treated as markup.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainText, labelFor, detailLines } from '../src/app/lib/actionDetails.ts';

/* ── html is text, never markup ──────────────────────────────────────── */

test('tags are stripped and paragraphs keep their breaks', () => {
  const out = plainText('<p>Hello Jane,</p><p>Your quote is ready.</p>');
  assert.equal(out, 'Hello Jane,\nYour quote is ready.');
});

test('a script in a model-written body is removed, not shown and not run', () => {
  // It can never execute — this is text in a <pre> — but showing its source
  // would bury the message the approver is trying to read.
  const out = plainText('<p>Hi</p><script>alert(1)</script><p>Bye</p>');
  assert.equal(out, 'Hi\nBye');
  assert.ok(!out.includes('alert'));
});

test('entities are decoded, because a customer name is not &amp;', () => {
  assert.equal(plainText('<p>Smith &amp; Sons &lt;here&gt;</p>'), 'Smith & Sons <here>');
  assert.equal(plainText('<p>It&#39;s ready</p>'), "It's ready");
});

test('list items read as a list', () => {
  assert.equal(plainText('<ul><li>Framing</li><li>Drywall</li></ul>'), '• Framing\n• Drywall');
});

test('empty and non-string bodies are empty, not "undefined"', () => {
  assert.equal(plainText(undefined), '');
  assert.equal(plainText(null), '');
  assert.equal(plainText(''), '');
});

/* ── labels ──────────────────────────────────────────────────────────── */

test('camelCase keys become words a person reads', () => {
  assert.equal(labelFor('leadEmail'), 'Lead email');
  assert.equal(labelFor('work_request_id'), 'Work request id');
  assert.equal(labelFor('total'), 'Total');
});

/* ── the lines themselves ────────────────────────────────────────────── */

test('every parameter is shown, in the order the action documents them', () => {
  const lines = detailLines({ to: 'jane@example.com', subject: 'Your quote', html: '<p>Ready</p>' });
  assert.deepEqual(lines.map((l) => l.label), ['To', 'Subject', 'Html']);
  assert.equal(lines[2].value, 'Ready');
  assert.equal(lines[2].block, true, 'a body gets its own block');
});

test('line items are one per line, so the arithmetic can be checked by eye', () => {
  const lines = detailLines({
    lineItems: [
      { description: 'Framing', quantity: 2, unit_price: 150 },
      { description: 'Drywall', quantity: 1, unit_price: 400 },
    ],
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].label, 'Line items (2)');
  assert.equal(lines[0].value.split('\n').length, 2);
  assert.ok(lines[0].value.includes('Quantity: 2'));
  assert.ok(lines[0].value.includes('Unit price: 150'));
});

test('a number stays a number and false is not hidden', () => {
  const lines = detailLines({ total: 4250.5, issue: false });
  assert.equal(lines[0].value, '4250.5');
  assert.equal(lines[1].value, 'false');
});

test('empty, null and missing parameters are left out rather than shown as dashes', () => {
  const lines = detailLines({ note: '', quoteId: null, total: 10 });
  assert.deepEqual(lines.map((l) => l.label), ['Total']);
});

test('params that are not an object yield nothing instead of throwing', () => {
  assert.deepEqual(detailLines(null), []);
  assert.deepEqual(detailLines('nope'), []);
  assert.deepEqual(detailLines([1, 2]), []);
});
