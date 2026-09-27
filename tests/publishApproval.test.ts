/**
 * Whether something a tenant published may be shown to other people yet.
 *
 * This decides what strangers see on nineteen surfaces, so the tests lean on
 * the two rules that are easy to get wrong in a way nobody notices:
 *
 *   - editing an approved item sends it back for review, or approval means
 *     nothing: submit something inoffensive, wait for the tick, then rewrite
 *     the headline and the link to anything you like
 *   - a record written before approval existed stays visible, because turning
 *     every live advertisement off on deploy takes a paying advertiser's
 *     campaign down without telling them
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialApproval, visibleChange, approvalAfterSave, isPublishable, decide,
} from '../supabase/functions/server/publishApproval.ts';

/* ── what a new record starts as ─────────────────────────────────────────── */

test('a tenant queues for review', () => {
  assert.equal(initialApproval(false), 'pending');
});

test('staff publishing on the company’s own behalf do not queue', () => {
  assert.equal(initialApproval(true), 'approved');
});

/* ── the rule that gives approval its teeth ──────────────────────────────── */

const approvedAd = {
  approval: 'approved',
  title: 'Next-day flooring, delivered',
  content: 'Stocked in Manchester.',
  linkUrl: 'https://example.com/flooring',
  isActive: true,
};

test('rewriting an approved advertisement sends it back for review', () => {
  const after = approvalAfterSave(approvedAd, { ...approvedAd, title: 'Something else entirely' }, false);
  assert.equal(after, 'pending',
    'otherwise: submit something inoffensive, wait for the tick, then rewrite it');
});

test('changing where an approved advertisement points sends it back', () => {
  const after = approvalAfterSave(approvedAd, { linkUrl: 'https://elsewhere.example.com' }, false);
  assert.equal(after, 'pending');
});

test('switching an approved advertisement off and on is not new content', () => {
  assert.equal(approvalAfterSave(approvedAd, { isActive: false }, false), 'approved');
  assert.equal(approvalAfterSave(approvedAd, { isActive: true }, false), 'approved',
    'queueing this would make the review list so noisy nobody reads it');
});

test('a save that changes nothing visible keeps its approval', () => {
  assert.equal(approvalAfterSave(approvedAd, { ...approvedAd }, false), 'approved');
});

test('a field the save does not mention is not treated as cleared', () => {
  assert.equal(approvalAfterSave(approvedAd, { isActive: true }, false), 'approved',
    'an absent field is unchanged, not emptied');
});

test('an author fixing what they were refused for may ask again', () => {
  const rejected = { ...approvedAd, approval: 'rejected' };
  assert.equal(approvalAfterSave(rejected, { ...rejected, title: 'Reworded' }, false), 'pending',
    'without this they would need somebody to reopen it for them');
});

test('a rejected item left alone stays rejected', () => {
  const rejected = { ...approvedAd, approval: 'rejected' };
  assert.equal(approvalAfterSave(rejected, { isActive: true }, false), 'rejected');
});

test('an administrator editing anything approves it', () => {
  assert.equal(approvalAfterSave(approvedAd, { title: 'Owner rewrote this' }, true), 'approved');
});

/* ── what counts as a visible change ─────────────────────────────────────── */

test('the fields a reader actually sees are the ones that matter', () => {
  assert.equal(visibleChange({ title: 'a' }, { title: 'b' }), true);
  assert.equal(visibleChange({ promoCode: 'X10' }, { promoCode: 'X50' }), true);
  assert.equal(visibleChange({ discountValue: '10' }, { discountValue: '80' }), true);
});

test('which portals an offer is aimed at is a visible change', () => {
  assert.equal(
    visibleChange({ targetPortals: ['customer'] }, { targetPortals: ['customer', 'tenant'] }),
    true,
    'widening the audience is exactly the change worth reviewing');
});

test('the same list in the same order is not a change', () => {
  assert.equal(visibleChange({ targetPortals: ['customer'] }, { targetPortals: ['customer'] }), false);
});

test('bookkeeping is not a visible change', () => {
  assert.equal(visibleChange({ title: 'a', updatedAt: '1' }, { title: 'a', updatedAt: '2' }), false,
    'otherwise every save would queue for review');
});

test('whitespace either side of a value is not a change', () => {
  assert.equal(visibleChange({ title: 'Flooring' }, { title: '  Flooring  ' }), false);
});

test('nothing to compare against is not a change', () => {
  assert.equal(visibleChange(null, { title: 'a' }), false);
});

/* ── what may be shown ───────────────────────────────────────────────────── */

test('approved and switched on is shown', () => {
  assert.equal(isPublishable({ approval: 'approved', isActive: true }), true);
});

test('pending is not shown however switched on it is', () => {
  assert.equal(isPublishable({ approval: 'pending', isActive: true }), false);
});

test('rejected is not shown', () => {
  assert.equal(isPublishable({ approval: 'rejected', isActive: true }), false);
});

test('approved but switched off by its author is not shown', () => {
  assert.equal(isPublishable({ approval: 'approved', isActive: false }), false,
    'approval is not a promise to keep showing something');
});

test('both spellings of switched-off are honoured', () => {
  assert.equal(isPublishable({ approval: 'approved', active: false }), false,
    'advertising writes isActive and deals write active');
});

test('a record from before approval existed stays visible', () => {
  assert.equal(isPublishable({ isActive: true }), true,
    'taking every live campaign down on deploy would cost a paying advertiser their run');
  assert.equal(isPublishable({ approval: null, active: true }), true);
});

test('nothing at all is not publishable', () => {
  assert.equal(isPublishable(null), false);
  assert.equal(isPublishable(undefined), false);
});

/* ── the decision itself ─────────────────────────────────────────────────── */

test('an administrator’s decision is read from either spelling', () => {
  assert.equal(decide('approve'), 'approved');
  assert.equal(decide('approved'), 'approved');
  assert.equal(decide('reject'), 'rejected');
  assert.equal(decide('REJECTED'), 'rejected');
});

test('anything else is not a decision', () => {
  assert.equal(decide('maybe'), null);
  assert.equal(decide(''), null);
  assert.equal(decide(undefined), null);
  assert.equal(decide('pending'), null,
    'there is no route that sets something back to pending by hand');
});
