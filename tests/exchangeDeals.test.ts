/**
 * Deals: who may publish, what counts as live, and which moves are allowed.
 *
 * WHY THESE MATTER MORE THAN MOST
 *
 * Eric's standing rule is that anything a tenant publishes which reaches other
 * people is approved before it goes live. Every way that rule can be broken
 * runs through this file: a deal that reads as live without approval, a
 * business that can approve its own, or one that can edit an approved deal so
 * that what residents see is not what a person reviewed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLive, businessMayMove, staffMayMove, validateDeal, mayPublish,
  phraseState, PUBLISHED_STATE, MAX_RUN_DAYS, TITLE_MAX, BODY_MAX,
} from '../supabase/functions/server/exchangeDeals.ts';

const NOW = new Date('2026-06-15T12:00:00Z');
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

const LIVE_DEAL = {
  state: 'approved',
  starts_at: day(-1),
  ends_at: day(7),
};

// ── nothing is live without approval ────────────────────────────────────────

test('only an approved deal is ever live', () => {
  for (const state of ['draft', 'submitted', 'rejected', 'withdrawn']) {
    assert.equal(isLive({ ...LIVE_DEAL, state }, NOW), false,
      `a ${state} deal must never be live`);
  }
  assert.equal(isLive(LIVE_DEAL, NOW), true);
  assert.equal(PUBLISHED_STATE, 'approved');
});

test('approval is necessary and not sufficient', () => {
  // Approved but not started yet.
  assert.equal(isLive({ state: 'approved', starts_at: day(1), ends_at: day(9) }, NOW), false);
  // Approved but finished.
  assert.equal(isLive({ state: 'approved', starts_at: day(-9), ends_at: day(-1) }, NOW), false);
});

test('a malformed date makes a deal not live, rather than live for ever', () => {
  /*
   * The tempting alternative is to treat a missing end date as "no limit",
   * which publishes something indefinitely because a field was malformed.
   * That is the wrong direction to fail.
   */
  assert.equal(isLive({ state: 'approved', starts_at: day(-1), ends_at: 'soon' }, NOW), false);
  assert.equal(isLive({ state: 'approved', starts_at: null, ends_at: day(7) }, NOW), false);
  assert.equal(isLive({ state: 'approved' }, NOW), false);
  assert.equal(isLive({}, NOW), false);
});

test('the boundaries are inclusive at both ends', () => {
  const exact = { state: 'approved', starts_at: NOW.toISOString(), ends_at: NOW.toISOString() };
  assert.equal(isLive(exact, NOW), true, 'a deal is live on the instant it starts and ends');
});

// ── a business cannot approve its own deal ──────────────────────────────────

test('a business can never move anything to approved', () => {
  for (const from of ['draft', 'submitted', 'approved', 'rejected', 'withdrawn']) {
    assert.equal(businessMayMove(from, 'approved'), false,
      `a business must not approve from ${from}`);
  }
});

test('a business can submit a draft and withdraw its own work', () => {
  assert.ok(businessMayMove('draft', 'submitted'));
  assert.ok(businessMayMove('draft', 'withdrawn'));
  assert.ok(businessMayMove('submitted', 'withdrawn'));
  assert.ok(businessMayMove('approved', 'withdrawn'));
});

test('an approved deal cannot be edited back into review by its owner', () => {
  // Withdraw and submit again is the only route, so what residents see has
  // always been through a review rather than past one.
  assert.equal(businessMayMove('approved', 'submitted'), false);
  assert.equal(businessMayMove('approved', 'draft'), false);
  assert.equal(businessMayMove('rejected', 'submitted'), false);
});

test('staff decide, and can pull an approved deal back down', () => {
  assert.ok(staffMayMove('submitted', 'approved'));
  assert.ok(staffMayMove('submitted', 'rejected'));
  assert.ok(staffMayMove('approved', 'rejected'), 'needed when something turns out to be wrong');
  assert.ok(staffMayMove('rejected', 'approved'));
  // Staff do not reach into somebody's unfinished draft.
  assert.equal(staffMayMove('draft', 'approved'), false);
  assert.equal(staffMayMove('withdrawn', 'approved'), false);
});

test('an unknown state grants nothing to anybody', () => {
  assert.equal(businessMayMove('banana', 'approved'), false);
  assert.equal(staffMayMove('banana', 'approved'), false);
  assert.equal(businessMayMove(null, 'submitted'), false);
  assert.equal(staffMayMove(undefined, 'approved'), false);
});

// ── who may publish at all ──────────────────────────────────────────────────

test('an unclaimed listing can never publish', () => {
  const verdict = mayPublish({ claimed: false });
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /claimed/i);
  // Not a truthy string, not "yes" — only a real boolean true opens this.
  assert.equal(mayPublish({ claimed: 'true' as never }).allowed, false);
  assert.equal(mayPublish({}).allowed, false);
});

test('a claimed listing may publish, and the plan is the hook for pricing', () => {
  /*
   * Eric chose deals free with a claimed listing now, priced into the plan
   * catalogue later. The point of asking rather than returning true is that
   * when that day comes, the answer comes from the catalogue and nothing else
   * on the publish path changes.
   */
  assert.equal(mayPublish({ claimed: true }).allowed, true);
  assert.equal(mayPublish({ claimed: true, dealsIncludedInPlan: true }).allowed, true);
  const paid = mayPublish({ claimed: true, dealsIncludedInPlan: false });
  assert.equal(paid.allowed, false);
  assert.match(paid.reason, /plan/i);
});

// ── what a deal is allowed to say ───────────────────────────────────────────

test('a good deal passes with nothing to say', () => {
  assert.deepEqual(validateDeal({
    title: 'Ten percent off boots',
    body: 'For anyone who found us on the Exchange.',
    startsAt: day(0), endsAt: day(14),
  }, NOW), []);
});

test('a deal has to say what it is', () => {
  const problems = validateDeal({ title: '', body: '', startsAt: day(0), endsAt: day(1) }, NOW);
  assert.equal(problems.length, 2);
  assert.ok(problems.every((p) => /\.$/.test(p)), 'problems read as sentences');
});

test('the dates have to make sense', () => {
  assert.match(validateDeal({ title: 'Deal', body: 'Body', startsAt: day(5), endsAt: day(1) }, NOW).join(' '),
    /end after it starts/i);
  assert.match(validateDeal({ title: 'Deal', body: 'Body', startsAt: day(-9), endsAt: day(-2) }, NOW).join(' '),
    /already finished/i);
  assert.match(validateDeal({ title: 'Deal', body: 'Body', startsAt: 'whenever', endsAt: day(2) }, NOW).join(' '),
    /not a date/i);
});

test('a deal cannot run for ever without being looked at again', () => {
  const tooLong = validateDeal({
    title: 'Deal', body: 'Body', startsAt: day(0), endsAt: day(MAX_RUN_DAYS + 1),
  }, NOW);
  assert.match(tooLong.join(' '), new RegExp(`${MAX_RUN_DAYS} days`));
  // Exactly the maximum is fine.
  assert.deepEqual(validateDeal({
    title: 'Deal', body: 'Body', startsAt: day(0), endsAt: day(MAX_RUN_DAYS),
  }, NOW), []);
});

test('the limits match the ones the database enforces', () => {
  assert.deepEqual(
    validateDeal({ title: 'x'.repeat(TITLE_MAX), body: 'y'.repeat(BODY_MAX), startsAt: day(0), endsAt: day(1) }, NOW),
    [],
  );
  // The counterpart field is kept valid so each case reports exactly one
  // problem — "ok" is two characters and would trip the body minimum too.
  const overLongTitle = validateDeal(
    { title: 'x'.repeat(TITLE_MAX + 1), body: 'A real description.', startsAt: day(0), endsAt: day(1) }, NOW);
  assert.deepEqual(overLongTitle.length, 1, overLongTitle.join(' | '));
  assert.match(overLongTitle[0], /title/i);

  const overLongBody = validateDeal(
    { title: 'A real title', body: 'y'.repeat(BODY_MAX + 1), startsAt: day(0), endsAt: day(1) }, NOW);
  assert.deepEqual(overLongBody.length, 1, overLongBody.join(' | '));
  assert.match(overLongBody[0], /description/i);
});

test('a state reads as words, never as the enum label', () => {
  assert.equal(phraseState('submitted'), 'Waiting for review');
  assert.equal(phraseState('rejected'), 'Not approved');
  assert.equal(phraseState('nonsense'), 'Unknown');
});
