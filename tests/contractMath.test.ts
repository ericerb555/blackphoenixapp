/**
 * What a contract says about itself.
 *
 * The reading that matters most is signed-or-not, because it decides whether
 * the app treats an agreement as binding and whether it offers somebody a
 * signing button. It has to agree with the SERVER's reading: the signing route
 * refuses when `signedAt` is set or the status is active/signed/completed, so a
 * document that called such a contract unsigned would offer a button the server
 * then rejects — a dead end with no explanation.
 *
 * Everything is read defensively on purpose. The create route stores whatever
 * body it is sent, with no schema, and there were ZERO contracts in production
 * when this was written — so there is no real record to generalise from and
 * every field has to survive being absent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSigned, signerName, signerEmail, signedDate, signatureMethodLabel,
  contractParty, contractAmount, contractBody, contractTitle, contractReference,
} from '../src/app/components/documents/contractMath.ts';

/* ── signed or not ───────────────────────────────────────────────────────── */

test('a signedAt makes it signed', () => {
  assert.ok(isSigned({ signedAt: '2026-09-28T00:00:00Z' }));
});

test('the statuses the server treats as signed are treated as signed here', () => {
  for (const status of ['active', 'signed', 'completed', 'ACTIVE', 'Signed']) {
    assert.ok(isSigned({ status }), `${status} means in force`);
  }
});

test('a pending contract is not signed', () => {
  assert.ok(!isSigned({ status: 'pending_signature' }));
  assert.ok(!isSigned({}), 'no status and no date is not a signature');
});

/* ── who signed ──────────────────────────────────────────────────────────── */

test('the signer comes from the signature block, falling back to the flat field', () => {
  assert.equal(signerName({ signature: { name: 'Jane Smith' } }), 'Jane Smith');
  assert.equal(signerName({ signatureName: 'Jane Smith' }), 'Jane Smith');
  assert.equal(signerName({}), '');
});

test('the signer email and date read from either shape', () => {
  assert.equal(signerEmail({ signature: { signerEmail: 'a@b.com' } }), 'a@b.com');
  assert.equal(signerEmail({ signedBy: 'a@b.com' }), 'a@b.com');
  assert.equal(signedDate({ signature: { acceptedTermsAt: 'x' } }), 'x');
  assert.equal(signedDate({ signedAt: 'y' }), 'y');
});

test('how it was signed is stated in words, not left as a code', () => {
  assert.match(signatureMethodLabel({ signature: { method: 'portal_typed_name' } }), /typed name/i,
    'a typed name is a real signature but a particular kind, and the reader should see which');
  assert.equal(signatureMethodLabel({}), '', 'nothing recorded means nothing claimed');
});

/* ── the amount ──────────────────────────────────────────────────────────── */

test('no amount is null, not zero', () => {
  assert.equal(contractAmount({}), null);
  assert.equal(contractAmount({ amount: '' }), null);
  assert.equal(contractAmount({ amount: undefined }), null,
    'printing $0.00 for an unrecorded amount tells the customer something untrue');
});

test('an amount of zero is kept, because zero is a real figure', () => {
  assert.equal(contractAmount({ amount: 0 }), 0);
});

test('a numeric string is an amount', () => {
  assert.equal(contractAmount({ amount: '1250.50' }), 1250.5);
});

test('rubbish is not an amount', () => {
  assert.equal(contractAmount({ amount: 'lots' as any }), null);
});

/* ── the rest, read defensively ──────────────────────────────────────────── */

test('the body reads from terms, scope or description', () => {
  assert.equal(contractBody({ terms: 'T' }), 'T');
  assert.equal(contractBody({ scope: 'S' }), 'S');
  assert.equal(contractBody({ description: 'D' }), 'D');
  assert.equal(contractBody({}), '', 'an empty body is surfaced, not invented');
});

test('the party reads either spelling of the customer', () => {
  assert.deepEqual(contractParty({ customerName: 'A', customerEmail: 'a@b.com', customerAddress: 'X' }),
    { name: 'A', email: 'a@b.com', address: 'X' });
  assert.deepEqual(contractParty({ clientName: 'B', clientEmail: 'b@c.com', clientAddress: 'Y' }),
    { name: 'B', email: 'b@c.com', address: 'Y' });
});

test('an untitled contract still has a title', () => {
  assert.equal(contractTitle({}), 'Service Contract');
  assert.equal(contractTitle({ title: 'Deck Build' }), 'Deck Build');
});

test('the reference falls back to the id', () => {
  assert.equal(contractReference({ id: 'c-1' }), 'c-1');
  assert.equal(contractReference({ number: 'C-001', id: 'c-1' }), 'C-001');
  assert.equal(contractReference({}), '');
});

test('an entirely empty contract does not throw anywhere', () => {
  const empty = {};
  assert.doesNotThrow(() => {
    isSigned(empty); signerName(empty); signerEmail(empty); signedDate(empty);
    signatureMethodLabel(empty); contractParty(empty); contractAmount(empty);
    contractBody(empty); contractTitle(empty); contractReference(empty);
  }, 'the create route stores whatever it is sent, so absent is the normal case');
});
