/**
 * The six-month trial — counted, chased, and never mistaken for revenue.
 *
 * WHY THESE ASSERTIONS
 *
 * A TRIAL IS WORTH NOTHING, AND MUST KEEP BEING WORTH NOTHING. The whole
 * launch is trials, so the temptation to let them show up in a revenue figure
 * — even as "potential" — is real, and it is the same failure as a fabricated
 * P&L arrived at politely. `monthlyCents` is pinned at zero here so that a
 * change to it is a deliberate act with a failing test attached.
 *
 * A TRIAL CARRIES NO TIER. Stamping one on would make an account look as
 * though it had chosen a rung it has not chosen, and would change what it is
 * served. A grant that HAS a tier is a customer and must stop being chased as
 * a trialist.
 *
 * MONTH ARITHMETIC IS WHERE THIS QUIETLY BREAKS. A trial started on 31 August
 * must end on 28 February, not roll into March. The bug would only ever
 * appear on month ends and would give a handful of businesses a longer trial
 * than everyone else.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonths,
  trialEndFor,
  daysRemaining,
  trialState,
  checkpointDue,
  trialRoster,
  summariseTrials,
  TRIAL_MONTHS,
  TRIAL_MONTHLY_CENTS,
  TRIAL_COHORT_ID,
  CHECKPOINT_MONTHS,
  type TrialGrant,
} from '../supabase/functions/server/exchangeTrials.ts';

const NOW = new Date('2026-10-02T12:00:00.000Z');

const grant = (over: Partial<TrialGrant> = {}): TrialGrant => ({
  email: 'shop@example.com',
  status: 'active',
  trialStart: '2026-09-01T00:00:00.000Z',
  trialEnd: '2027-03-01T00:00:00.000Z',
  ...over,
});

// ── the shape of the offer ───────────────────────────────────────────────────

test('six months, at nothing', () => {
  assert.equal(TRIAL_MONTHS, 6);
  assert.equal(TRIAL_MONTHLY_CENTS, 0);
});

test('checkpoints land before the decision, not on it', () => {
  // Nothing at month six: by then they have already made their mind up.
  assert.deepEqual([...CHECKPOINT_MONTHS], [1, 3, 5]);
});

// ── month arithmetic ─────────────────────────────────────────────────────────

test('a trial started on the 31st does not roll into the next month', () => {
  assert.equal(addMonths('2026-08-31T00:00:00.000Z', 6), '2027-02-28T00:00:00.000Z');
  assert.equal(addMonths('2026-01-31T00:00:00.000Z', 1), '2026-02-28T00:00:00.000Z');
});

test('leap years are handled by clamping, not by luck', () => {
  assert.equal(addMonths('2027-12-31T00:00:00.000Z', 2), '2028-02-29T00:00:00.000Z');
});

test('ordinary months are exact, and the time of day survives', () => {
  assert.equal(addMonths('2026-09-01T13:45:30.000Z', 6), '2027-03-01T13:45:30.000Z');
});

test('a junk start date yields nothing rather than a wrong date', () => {
  assert.equal(addMonths('not a date', 6), null);
  assert.equal(trialEndFor(''), null);
});

test('days remaining is floored and never negative', () => {
  assert.equal(daysRemaining('2026-10-12T12:00:00.000Z', NOW), 10);
  assert.equal(daysRemaining('2026-10-02T23:00:00.000Z', NOW), 0);
  assert.equal(daysRemaining('2026-01-01T00:00:00.000Z', NOW), 0, 'already over is zero, not minus');
  assert.equal(daysRemaining(null, NOW), 0);
});

// ── state ────────────────────────────────────────────────────────────────────

test('a running trial is running', () => {
  assert.equal(trialState(grant(), NOW), 'running');
});

test('a finished trial is expired', () => {
  assert.equal(trialState(grant({ trialEnd: '2026-09-30T00:00:00.000Z' }), NOW), 'expired');
});

test('a grant that names a tier is a customer, not a trialist', () => {
  // Chasing them with "your trial ends soon" would be wrong and annoying.
  assert.equal(trialState(grant({ tierId: 'tier-active' }), NOW), 'converted');
});

test('a revoked grant is revoked whatever its dates say', () => {
  assert.equal(trialState(grant({ status: 'revoked' }), NOW), 'revoked');
  assert.equal(trialState(grant({ status: 'suspended' }), NOW), 'revoked');
});

test('a grant with no trial fields is not a broken trial', () => {
  // An open-ended comped or staff account. It is simply not a trial.
  assert.equal(trialState(grant({ trialStart: '', trialEnd: '' }), NOW), 'none');
  assert.equal(trialState(null, NOW), 'none');
});

test('a missing end date is derived from the start rather than failing', () => {
  assert.equal(trialState(grant({ trialEnd: '' }), NOW), 'running');
});

// ── checkpoints ──────────────────────────────────────────────────────────────

test('the month-one checkpoint comes due a month in', () => {
  const g = grant({ trialStart: '2026-09-01T00:00:00.000Z', checkpointsSent: [] });
  assert.equal(checkpointDue(g, new Date('2026-09-20T00:00:00.000Z')), null, 'not yet');
  assert.equal(checkpointDue(g, new Date('2026-10-02T00:00:00.000Z')), 1);
});

test('a trial nobody contacted for four months gets one message, not three', () => {
  const g = grant({ trialStart: '2026-05-01T00:00:00.000Z', checkpointsSent: [] });
  assert.equal(checkpointDue(g, new Date('2026-09-15T00:00:00.000Z')), 3,
    'the latest one owed, not a backlog dumped at once');
});

test('a checkpoint already sent is not sent again', () => {
  const g = grant({ trialStart: '2026-09-01T00:00:00.000Z', checkpointsSent: [1] });
  assert.equal(checkpointDue(g, new Date('2026-10-02T00:00:00.000Z')), null);
});

test('the last checkpoint is five months, never six', () => {
  const g = grant({ trialStart: '2026-01-01T00:00:00.000Z', checkpointsSent: [1, 3] });
  assert.equal(checkpointDue(g, new Date('2026-07-01T00:00:00.000Z')), 5);
  const done = grant({ trialStart: '2026-01-01T00:00:00.000Z', checkpointsSent: [1, 3, 5] });
  assert.equal(checkpointDue(done, new Date('2026-07-01T00:00:00.000Z')), null);
});

// ── the roster ───────────────────────────────────────────────────────────────

test('the roster is soonest to expire first, which is working order', () => {
  const out = trialRoster([
    grant({ email: 'late@x.com',  trialEnd: '2027-03-01T00:00:00.000Z' }),
    grant({ email: 'soon@x.com',  trialEnd: '2026-10-09T00:00:00.000Z' }),
    grant({ email: 'mid@x.com',   trialEnd: '2026-12-01T00:00:00.000Z' }),
  ], NOW);
  assert.deepEqual(out.map((t) => t.email), ['soon@x.com', 'mid@x.com', 'late@x.com']);
  // Noon on the 2nd to midnight on the 9th is six whole days, floored.
  assert.equal(out[0].daysLeft, 6);
});

test('every trial on the roster is worth zero and sits in the trial bucket', () => {
  const out = trialRoster([grant()], NOW);
  assert.equal(out[0].monthlyCents, 0);
  assert.equal(out[0].cohortId, TRIAL_COHORT_ID);
  assert.notEqual(out[0].cohortId, 'cohort-tier-', 'a bucket, never a tier');
});

test('only running trials are on the roster', () => {
  const out = trialRoster([
    grant({ email: 'running@x.com' }),
    grant({ email: 'done@x.com', trialEnd: '2026-01-01T00:00:00.000Z' }),
    grant({ email: 'paying@x.com', tierId: 'tier-2' }),
    grant({ email: 'revoked@x.com', status: 'revoked' }),
    null,
  ], NOW);
  assert.deepEqual(out.map((t) => t.email), ['running@x.com']);
});

// ── the summary a cohort screen should show ──────────────────────────────────

test('trials are counted separately and honestly', () => {
  const summary = summariseTrials([
    grant({ email: 'a@x.com' }),
    grant({ email: 'b@x.com', trialEnd: '2026-10-20T00:00:00.000Z' }), // ending soon
    grant({ email: 'c@x.com', trialEnd: '2026-01-01T00:00:00.000Z' }), // expired
    grant({ email: 'd@x.com', tierId: 'tier-1' }),                     // converted
    grant({ email: 'e@x.com', status: 'revoked' }),                    // neither
  ], NOW);

  assert.equal(summary.running, 2);
  assert.equal(summary.endingSoon, 1);
  assert.equal(summary.expired, 1);
  assert.equal(summary.converted, 1);
  assert.equal(summary.monthlyCents, 0, 'a trial is never revenue');
});

test('an empty platform summarises to zeroes rather than throwing', () => {
  const summary = summariseTrials([], NOW);
  assert.equal(summary.running, 0);
  assert.equal(summary.monthlyCents, 0);
  assert.equal(summariseTrials(null as any, NOW).running, 0);
});

test('checkpoints due are counted so the list has a length before it is worked', () => {
  const summary = summariseTrials([
    grant({ trialStart: '2026-09-01T00:00:00.000Z', checkpointsSent: [] }),
    grant({ trialStart: '2026-09-01T00:00:00.000Z', checkpointsSent: [1] }),
  ], NOW);
  assert.equal(summary.checkpointsDue, 1);
});
