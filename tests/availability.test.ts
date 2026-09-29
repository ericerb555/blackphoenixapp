/**
 * Who can work what, and when.
 *
 * Every rule here fails silently if it is wrong. A scheduler that gets
 * availability subtly wrong does not throw — it produces a day with nobody on
 * it, or sends a crew to a job the person cannot do, and the first person to
 * notice is a customer or a technician standing somewhere.
 *
 * Three of these tests exist because of the specific failure this codebase
 * keeps repeating: the quiet zero. An unfilled roster must not empty the
 * schedule, an unrecorded trade must not silently exclude somebody, and a job
 * of unknown length must not vanish from the day.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayOfWeek, blocksDay, availabilityOn, candidatesFor, mayAutoAssign,
  DEFAULT_WORKING_DAYS, DEFAULT_WORKING_HOURS,
} from '../supabase/functions/server/availability.ts';

// 2026-09-29 is a Tuesday. 2026-10-03 is a Saturday.
const TUE = '2026-09-29';
const SAT = '2026-10-03';

const tech = (over: Record<string, any> = {}) => ({
  id: 'EMP-1', name: 'Dave', trades: ['flooring'],
  workingDays: [1, 2, 3, 4, 5], workingHours: { start: '08:00', end: '16:00' },
  ...over,
});

/* ── dates carry no timezone ─────────────────────────────────────────────── */

test('the day of the week is computed without a Date object', () => {
  assert.equal(dayOfWeek('2026-09-29'), 2, 'Tuesday');
  assert.equal(dayOfWeek('2026-10-03'), 6, 'Saturday');
  assert.equal(dayOfWeek('2026-10-04'), 0, 'Sunday');
});

test('a Date object would have got this wrong west of Greenwich', () => {
  // new Date('2026-09-29').getDay() parses as UTC midnight and reports local,
  // which in New Hampshire is the previous evening — Monday, not Tuesday.
  assert.equal(dayOfWeek('2026-09-29'), 2);
});

test('rubbish is not a date', () => {
  assert.equal(dayOfWeek('not-a-date'), null);
  assert.equal(dayOfWeek('2026-13-01'), null);
  assert.equal(dayOfWeek(''), null);
});

/* ── what stops somebody working ─────────────────────────────────────────── */

test('a call-out bites immediately, with nobody to approve it', () => {
  assert.ok(blocksDay({ employeeId: 'EMP-1', from: TUE, kind: 'call_out' }, TUE),
    'waiting for approval would schedule somebody who has said they are not coming');
});

test('time off bites only once approved', () => {
  const requested = { employeeId: 'EMP-1', from: TUE, kind: 'time_off' as const, status: 'requested' as const };
  assert.ok(!blocksDay(requested, TUE),
    'a request nobody has looked at must not quietly leave a day uncovered');
  assert.ok(blocksDay({ ...requested, status: 'approved' }, TUE));
});

test('declined and cancelled never block', () => {
  for (const status of ['declined', 'cancelled'] as const) {
    assert.ok(!blocksDay({ employeeId: 'EMP-1', from: TUE, kind: 'call_out', status }, TUE));
  }
});

test('a range is inclusive at both ends', () => {
  const off = { employeeId: 'EMP-1', from: '2026-09-28', to: '2026-09-30', kind: 'time_off' as const, status: 'approved' as const };
  assert.ok(blocksDay(off, '2026-09-28'), 'the first day');
  assert.ok(blocksDay(off, '2026-09-30'), 'the last day');
  assert.ok(!blocksDay(off, '2026-10-01'), 'the day after');
});

test('one day off needs no end date', () => {
  const off = { employeeId: 'EMP-1', from: TUE, kind: 'time_off' as const, status: 'approved' as const };
  assert.ok(blocksDay(off, TUE));
  assert.ok(!blocksDay(off, '2026-09-30'));
});

/* ── unknown is not unavailable ──────────────────────────────────────────── */

test('a tech with NO working pattern recorded is still available', () => {
  const a = availabilityOn({ id: 'EMP-1' }, TUE, [], []);
  assert.ok(a.available,
    'an unfilled roster must not silently produce a day with nobody on it');
  assert.equal(a.hoursFree, 9, 'the default 07:00-16:00 day');
  assert.ok(a.assumedPattern, 'and it says the pattern was assumed, not known');
});

test('an assumed pattern is reported in words too', () => {
  assert.match(availabilityOn({ id: 'EMP-1' }, TUE).reason, /assuming/i);
});

test('a recorded pattern is not flagged as assumed', () => {
  const a = availabilityOn(tech(), TUE, [], []);
  assert.ok(a.available);
  assert.equal(a.assumedPattern, false);
  assert.equal(a.hoursFree, 8);
});

test('the defaults are a normal week', () => {
  assert.deepEqual(DEFAULT_WORKING_DAYS, [1, 2, 3, 4, 5]);
  assert.equal(DEFAULT_WORKING_HOURS.start, '07:00');
});

/* ── the ordinary reasons somebody cannot work ───────────────────────────── */

test('not a working day for them', () => {
  const a = availabilityOn(tech(), SAT, [], []);
  assert.ok(!a.available);
  assert.match(a.reason, /working day/);
});

test('off the roster', () => {
  assert.ok(!availabilityOn(tech({ active: false }), TUE).available);
});

test('already fully booked', () => {
  const bookings = [{ employeeId: 'EMP-1', date: TUE, hours: 8, status: 'scheduled' }];
  const a = availabilityOn(tech(), TUE, [], bookings);
  assert.ok(!a.available);
  assert.match(a.reason, /fully booked/);
});

test('partly booked leaves the remainder', () => {
  const bookings = [{ employeeId: 'EMP-1', date: TUE, hours: 3, status: 'scheduled' }];
  assert.equal(availabilityOn(tech(), TUE, [], bookings).hoursFree, 5);
});

test('a cancelled booking does not hold their time', () => {
  const bookings = [{ employeeId: 'EMP-1', date: TUE, hours: 8, status: 'cancelled' }];
  assert.equal(availabilityOn(tech(), TUE, [], bookings).hoursFree, 8);
});

test("somebody else's booking does not fill this day", () => {
  const bookings = [{ employeeId: 'EMP-2', date: TUE, hours: 8, status: 'scheduled' }];
  assert.equal(availabilityOn(tech(), TUE, [], bookings).hoursFree, 8);
});

/* ── the trade, and its three states ─────────────────────────────────────── */

test('a job naming no trade may be taken by anybody', () => {
  const list = candidatesFor([tech({ trades: ['roofing'] })], TUE, {}, [], []);
  assert.equal(list.length, 1);
  assert.equal(list[0].unverifiedTrade, false);
});

test('a recorded trade must match', () => {
  const list = candidatesFor([tech({ trades: ['roofing'] })], TUE, { trade: 'flooring' }, [], []);
  assert.equal(list.length, 0, 'a roofer is not offered a flooring job');
});

test('an UNRECORDED trade is offered but flagged', () => {
  const list = candidatesFor([tech({ trades: [] })], TUE, { trade: 'flooring' }, [], []);
  assert.equal(list.length, 1,
    'excluding them would empty the schedule for a roster nobody has filled in');
  assert.ok(list[0].unverifiedTrade,
    'and the flag is what stops it being booked without somebody looking');
});

/* ── who gets offered, and in what order ─────────────────────────────────── */

test('somebody on approved leave is not a candidate', () => {
  const off = [{ employeeId: 'EMP-1', from: TUE, kind: 'time_off' as const, status: 'approved' as const }];
  assert.equal(candidatesFor([tech()], TUE, { trade: 'flooring' }, off, []).length, 0);
});

test('a job longer than the day that is left is not offered', () => {
  const bookings = [{ employeeId: 'EMP-1', date: TUE, hours: 6, status: 'scheduled' }];
  assert.equal(candidatesFor([tech()], TUE, { trade: 'flooring', hours: 4 }, [], bookings).length, 0,
    'two hours free does not fit a four hour job');
});

test('a job of UNKNOWN length is still offered', () => {
  const list = candidatesFor([tech()], TUE, { trade: 'flooring' }, [], []);
  assert.equal(list.length, 1,
    'an unmeasured job is a gap in what we know, not a reason to leave the day empty');
});

test('certain candidates are ranked above assumed ones', () => {
  const known = tech({ id: 'SURE' });
  const guessed = { id: 'GUESS' };
  const list = candidatesFor([guessed, known], TUE, {}, [], []);
  assert.equal(list[0].tech.id, 'SURE', 'the one we actually know about comes first');
});

test('the fullest day that still fits is preferred, keeping whole days free', () => {
  const busy = tech({ id: 'BUSY' });
  const empty = tech({ id: 'EMPTY' });
  const bookings = [{ employeeId: 'BUSY', date: TUE, hours: 5, status: 'scheduled' }];
  const list = candidatesFor([empty, busy], TUE, { trade: 'flooring', hours: 2 }, [], bookings);
  assert.equal(list[0].tech.id, 'BUSY',
    'filling a part-day leaves the clear day for a job that needs one');
});

/* ── what may be done without asking ─────────────────────────────────────── */

test('exactly one certain candidate may be booked automatically', () => {
  const list = candidatesFor([tech()], TUE, { trade: 'flooring', hours: 4 }, [], []);
  assert.ok(mayAutoAssign(list));
});

test('two candidates is a CHOICE, so it asks', () => {
  const list = candidatesFor([tech({ id: 'A' }), tech({ id: 'B' })], TUE, { trade: 'flooring' }, [], []);
  assert.equal(list.length, 2);
  assert.ok(!mayAutoAssign(list),
    'Eric\'s rule is auto for the simple and ask for the hard, and two people is a choice');
});

test('nobody available is not an automatic anything', () => {
  assert.ok(!mayAutoAssign([]));
});

test('one candidate resting on an ASSUMPTION still asks', () => {
  const list = candidatesFor([{ id: 'GUESS' }], TUE, {}, [], []);
  assert.equal(list.length, 1);
  assert.ok(!mayAutoAssign(list),
    'somebody should see the schedule is resting on a guess before a customer is promised');
});

test('one candidate with an unverified trade still asks', () => {
  const list = candidatesFor([tech({ trades: [] })], TUE, { trade: 'flooring' }, [], []);
  assert.equal(list.length, 1);
  assert.ok(!mayAutoAssign(list));
});
