/**
 * Turning what a customer said into days to search.
 *
 * The rule most easily got wrong, and the reason this is tested: "within six
 * months" is the LATEST acceptable date, not the target. A scheduler that aims
 * at the far end of every horizon fills next May and leaves next week empty,
 * and nothing about that looks like a fault from the outside.
 *
 * The second rule: a customer's requested date is a REQUEST. Eric — "they can
 * request but we plan." It pulls the window tight around itself; it does not
 * collapse it to one day, because a window of one day reports an impossible
 * date as unschedulable work, which is the software refusing a job because
 * somebody expressed a preference.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleWindow, daysIn, addDays, moreUrgent,
} from '../supabase/functions/server/scheduleWindow.ts';

const TODAY = '2026-09-29';

/* ── dates move without a timezone ───────────────────────────────────────── */

test('adding days crosses a month end', () => {
  assert.equal(addDays('2026-09-29', 3), '2026-10-02');
});

test('adding days crosses a year end', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
});

test('a daylight-saving change does not shift the day', () => {
  // US clocks go back on 2026-11-01. Noon UTC anchoring means this is exact.
  assert.equal(addDays('2026-10-31', 2), '2026-11-02');
});

test('rubbish is returned unchanged rather than becoming NaN', () => {
  assert.equal(addDays('not-a-date', 3), 'not-a-date');
});

/* ── the horizon is a span, and its far end is a deadline ────────────────── */

test('ASAP looks at the coming week, not at today alone', () => {
  const w = scheduleWindow({ timeline: 'asap' }, TODAY);
  assert.equal(w.earliest, TODAY);
  assert.equal(w.latest, '2026-10-06');
  assert.equal(w.urgency, 100);
});

test('within six months STARTS today and ends in six months', () => {
  const w = scheduleWindow({ timeline: '6_months' }, TODAY);
  assert.equal(w.earliest, TODAY,
    'aiming at the far end fills next May and leaves next week empty');
  assert.equal(w.latest, '2027-03-28');
});

test('a longer horizon is less urgent', () => {
  const asap = scheduleWindow({ timeline: 'asap' }, TODAY);
  const year = scheduleWindow({ timeline: '1_year' }, TODAY);
  assert.ok(asap.urgency > year.urgency);
});

/* ── an unstated horizon ─────────────────────────────────────────────────── */

test('no timeline is neither today nor never', () => {
  const w = scheduleWindow({}, TODAY);
  assert.equal(w.earliest, TODAY);
  assert.equal(w.latest, '2026-12-28', 'the ordinary three-month window');
  assert.ok(w.assumed, 'and it says so');
  assert.match(w.label, /no timeline/i);
});

test('an unstated horizon outranks one the customer called flexible', () => {
  const nothing = scheduleWindow({}, TODAY);
  const flexible = scheduleWindow({ timeline: 'flexible' }, TODAY);
  assert.ok(nothing.urgency > flexible.urgency,
    'somebody who chose flexible said so; somebody who said nothing did not');
});

/* ── a requested date is a request ───────────────────────────────────────── */

test('a requested date pulls the window tight around itself', () => {
  const w = scheduleWindow({ timeline: '6_months', requestedDate: '2026-11-10' }, TODAY);
  assert.equal(w.earliest, '2026-10-27');
  assert.equal(w.latest, '2026-11-24');
});

test('it does NOT collapse the window to that one day', () => {
  const w = scheduleWindow({ timeline: '6_months', requestedDate: '2026-11-10' }, TODAY);
  assert.ok(daysIn(w).length > 1,
    'a one-day window reports an impossible date as unschedulable work');
});

test('a requested date raises urgency without making it top priority', () => {
  const asked = scheduleWindow({ timeline: '6_months', requestedDate: '2026-11-10' }, TODAY);
  const asap = scheduleWindow({ timeline: 'asap' }, TODAY);
  assert.ok(asked.urgency > scheduleWindow({ timeline: '6_months' }, TODAY).urgency);
  assert.ok(asked.urgency < asap.urgency, 'a preference does not outrank an emergency');
});

test('the window says what was asked for, for the proposal to repeat', () => {
  assert.match(scheduleWindow({ requestedDate: '2026-11-10' }, TODAY).label, /2026-11-10/);
});

/* ── hard bounds are facts about the world ───────────────────────────────── */

test('not before a date the customer is away until', () => {
  const w = scheduleWindow({ timeline: 'asap', earliestDate: '2026-10-10' }, TODAY);
  assert.equal(w.earliest, '2026-10-10',
    'being away until the 10th is a fact, not a preference');
});

test('not after a date they need it by', () => {
  const w = scheduleWindow({ timeline: '6_months', latestDate: '2026-10-15' }, TODAY);
  assert.equal(w.latest, '2026-10-15');
});

test('impossible bounds do not produce a backwards window', () => {
  const w = scheduleWindow({ earliestDate: '2026-12-01', latestDate: '2026-10-01' }, TODAY);
  assert.ok(w.latest >= w.earliest, 'a window ending before it starts would search nothing');
});

/* ── walking the days ────────────────────────────────────────────────────── */

test('the days of a window are every day in it, inclusive', () => {
  const days = daysIn({ earliest: '2026-09-29', latest: '2026-10-02', urgency: 0, assumed: false, label: '' });
  assert.deepEqual(days, ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
});

test('a year-long window is capped rather than producing 365 entries', () => {
  const w = scheduleWindow({ timeline: '1_year' }, TODAY);
  assert.equal(daysIn(w).length, 120);
});

/* ── which job gets the contested day ────────────────────────────────────── */

test('the more urgent job comes first', () => {
  const asap = scheduleWindow({ timeline: 'asap' }, TODAY);
  const later = scheduleWindow({ timeline: '6_months' }, TODAY);
  assert.ok(moreUrgent(asap, later) < 0);
});

test('at equal urgency the tighter deadline comes first', () => {
  const soon = scheduleWindow({ timeline: '3_months', latestDate: '2026-10-15' }, TODAY);
  const loose = scheduleWindow({ timeline: '3_months' }, TODAY);
  assert.ok(moreUrgent(soon, loose) < 0,
    'three weeks left is fewer chances than three months, whatever either stated');
});
