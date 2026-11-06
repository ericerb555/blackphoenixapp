/**
 * Deleting a quote, including the ones it used to refuse.
 *
 * Eric: "i should be able to delete any quote with a fail safe of two
 * confirmations."
 *
 * The two confirmations live in the editor. The part worth testing is the
 * one underneath them: a signed quote, or a quote a contract was built from,
 * can only go if the caller NAMES what it is overriding.
 *
 * THE DISTINCTION THESE TESTS EXIST TO PROTECT is between a confirmation and
 * an acknowledgement. A confirmation asks "are you sure" and people click
 * through it — that is what confirmations are for and why a third one would
 * buy nothing. An acknowledgement makes the caller send back the specific
 * word, and the server checks it. So the test that matters most is the
 * negative one: that a caller which did not say "signed" cannot delete a
 * signed quote, however many times it asks.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSigned,
  contractFor,
  deletionBlockers,
  acknowledgementsFrom,
  unacknowledged,
  deletionTombstone,
} from '../supabase/functions/server/quoteDeletion.ts';

const draft = { id: 'q1', status: 'draft', totalCost: 4000 };
const signed = { ...draft, signature: { signedAt: '2026-11-01T10:00:00.000Z', decision: 'approved' } };
const contracts = [{ id: 'c1', title: 'Kitchen contract', quoteId: 'q1' }];

/* ── what counts as dangerous ────────────────────────────────────────────── */

test('a signed quote is recognised however the signature was recorded', () => {
  assert.equal(isSigned(signed), true);
  assert.equal(isSigned({ signature: { decision: 'approved' } }), true);
  assert.equal(isSigned({ signature: { decision: 'DECLINED' } }), true, 'a decline is a decision too');
  assert.equal(isSigned({ signature: { decision: 'pending' } }), false);
  assert.equal(isSigned(draft), false);
  assert.equal(isSigned(null), false);
});

test('a contract is matched to its quote and to no other', () => {
  assert.equal(contractFor('q1', contracts)?.id, 'c1');
  assert.equal(contractFor('q2', contracts), null);
  assert.equal(contractFor('', contracts), null);
  assert.equal(contractFor('q1', []), null);
  assert.equal(contractFor('q1', null as any), null);
});

test('an ordinary draft blocks nothing — the two clicks are the whole failsafe', () => {
  assert.deepEqual(deletionBlockers(draft, 'q1', []), []);
});

test('signed and contracted are reported together, each by name', () => {
  const blockers = deletionBlockers(signed, 'q1', contracts);
  assert.deepEqual(blockers.map((b) => b.reason), ['signed', 'has_contract']);
  // Each has to say something a person can act on, not just a code.
  for (const b of blockers) assert.ok(b.detail.length > 40, b.reason);
  assert.match(blockers[1].detail, /Kitchen contract/);
});

/* ── the acknowledgement, which is the actual failsafe ───────────────────── */

test('a caller that names nothing cannot delete a signed quote', () => {
  const blockers = deletionBlockers(signed, 'q1', []);
  assert.equal(unacknowledged(blockers, []).length, 1);
  assert.equal(unacknowledged(blockers, new Set()).length, 1);
});

test('naming it lets it through', () => {
  const blockers = deletionBlockers(signed, 'q1', []);
  assert.deepEqual(unacknowledged(blockers, ['signed']), []);
});

/**
 * Half an answer is not an answer. Acknowledging the signature does not
 * also dispose of the contract — each has to be said.
 */
test('each blocker has to be named separately', () => {
  const blockers = deletionBlockers(signed, 'q1', contracts);
  assert.deepEqual(unacknowledged(blockers, ['signed']).map((b) => b.reason), ['has_contract']);
  assert.deepEqual(unacknowledged(blockers, ['has_contract']).map((b) => b.reason), ['signed']);
  assert.deepEqual(unacknowledged(blockers, ['signed', 'has_contract']), []);
});

/**
 * A caller cannot widen its own permission by inventing a reason. This is
 * why the server checks names rather than a boolean — `confirmed: true`
 * would have been satisfied by any client that felt like sending it.
 */
test('a blanket or invented acknowledgement buys nothing', () => {
  const blockers = deletionBlockers(signed, 'q1', contracts);
  for (const attempt of [['*'], ['all'], ['yes'], ['true'], ['SIGNED'], ['']]) {
    assert.equal(unacknowledged(blockers, attempt).length, 2, JSON.stringify(attempt));
  }
});

test('acknowledgements are read from a body or a query string', () => {
  assert.deepEqual([...acknowledgementsFrom({ acknowledge: ['signed'] }, undefined)], ['signed']);
  assert.deepEqual([...acknowledgementsFrom({}, 'signed,has_contract')], ['signed', 'has_contract']);
  // Both at once, de-duplicated, whitespace tolerated.
  assert.deepEqual(
    [...acknowledgementsFrom({ acknowledge: [' signed '] }, 'signed, has_contract')].sort(),
    ['has_contract', 'signed'],
  );
});

test('junk input yields no acknowledgements rather than throwing', () => {
  for (const body of [null, undefined, 'nope', { acknowledge: 'signed' }, { acknowledge: null }]) {
    assert.doesNotThrow(() => acknowledgementsFrom(body as any, undefined));
  }
  assert.equal(acknowledgementsFrom({ acknowledge: 'signed' } as any, undefined).size, 0,
    'a bare string is not a list and must not be read as one');
});

/* ── the record left behind ──────────────────────────────────────────────── */

/**
 * "Who deleted the signed quote, and when?" is a question with a bad answer
 * if nothing wrote it down — and it gets read by a buyer's counsel rather
 * than by us.
 */
test('the tombstone records who, what, and what they accepted', () => {
  const stone = deletionTombstone(
    { ...signed, quoteNumber: 'Q-2026-9', customerEmail: 'a@b.test', customerName: 'A Customer' },
    'q1',
    {
      deletedBy: 'eric@blackphoenixbuilds.com',
      acknowledged: ['signed'],
      blockers: deletionBlockers(signed, 'q1', []),
      now: '2026-11-06T12:00:00.000Z',
    },
  );

  assert.equal(stone.quoteId, 'q1');
  assert.equal(stone.number, 'Q-2026-9');
  assert.equal(stone.customerEmail, 'a@b.test');
  assert.equal(stone.total, 4000);
  assert.equal(stone.signedAt, '2026-11-01T10:00:00.000Z');
  assert.deepEqual(stone.acknowledged, ['signed']);
  assert.deepEqual(stone.blockers, ['signed']);
  assert.equal(stone.deletedBy, 'eric@blackphoenixbuilds.com');
  assert.equal(stone.deletedAt, '2026-11-06T12:00:00.000Z');
});

/** Deleting means deleting. The tombstone is a log line, not a copy. */
test('the tombstone does not keep the document', () => {
  const stone: any = deletionTombstone(
    { ...signed, materials: [{ name: 'Tile', totalCost: 400 }], labor: [{ role: 'Tiler' }], processSteps: [{ title: 'Tiling' }] },
    'q1',
    { deletedBy: 'e@x.test', acknowledged: [], blockers: [] },
  );
  for (const key of ['materials', 'labor', 'processSteps', 'signature', 'additionalCosts']) {
    assert.equal(stone[key], undefined, `${key} should not survive a deletion`);
  }
});

test('the tombstone finds the total wherever the quote kept it', () => {
  const by = (q: any) => deletionTombstone(q, 'q1', { deletedBy: 'e', acknowledged: [], blockers: [] }).total;
  assert.equal(by({ totalCost: 10 }), 10);
  assert.equal(by({ total: 20 }), 20);
  assert.equal(by({ grandTotal: 30 }), 30);
  assert.equal(by({}), 0);
});
