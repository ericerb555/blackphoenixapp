/**
 * Turning work requests into proposed days.
 *
 * The behaviours pinned here are the ones that would be wrong quietly:
 *
 *   - an urgent job takes the contested day, and the flexible one is moved on
 *     rather than both being told the same Tuesday is free
 *   - a promised technician is proposed but never booked automatically
 *   - a window with no free day reports a CLASH, naming what was asked, rather
 *     than reporting the work as unschedulable
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proposeSchedule, summariseProposals } from '../supabase/functions/server/proposeSchedule.ts';

const TODAY = '2026-09-29'; // Tuesday

const tech = (over: Record<string, any> = {}) => ({
  id: 'DAVE', name: 'Dave', trades: ['flooring'],
  workingDays: [1, 2, 3, 4, 5], workingHours: { start: '08:00', end: '16:00' },
  ...over,
});

const req = (over: Record<string, any> = {}) => ({
  id: 'WR-1', title: 'Flooring', trade: 'flooring', hours: 6, timeline: 'asap', ...over,
});

/* ── the ordinary case ───────────────────────────────────────────────────── */

test('one job, one technician, booked on the first workable day', () => {
  const [p] = proposeSchedule([req()], [tech()], [], [], TODAY);
  assert.equal(p.outcome, 'auto');
  assert.equal(p.date, TODAY);
  assert.equal(p.techId, 'DAVE');
  // Not "the only one free" — with a roster of one, nobody else was weighed,
  // and saying so would imply a comparison that never happened.
  assert.match(p.reason, /Dave takes it/i);
});

test('two technicians is a choice, not an automatic booking', () => {
  const [p] = proposeSchedule([req()], [tech(), tech({ id: 'SAM', name: 'Sam' })], [], [], TODAY);
  assert.equal(p.outcome, 'choice');
  assert.equal(p.alternatives.length, 2);
  assert.match(p.reason, /pick one/i);
});

test('the proposal repeats back what the customer asked for', () => {
  const [p] = proposeSchedule([req({ timeline: '3_months' })], [tech()], [], [], TODAY);
  assert.match(p.asked, /three months/i);
});

/* ── leave and call-outs push the day out ────────────────────────────────── */

test('an approved day off moves the proposal to the next workable day', () => {
  const off = [{ employeeId: 'DAVE', from: TODAY, kind: 'time_off' as const, status: 'approved' as const }];
  const [p] = proposeSchedule([req()], [tech()], off, [], TODAY);
  assert.equal(p.date, '2026-09-30', 'the Wednesday');
  assert.equal(p.outcome, 'auto');
});

test('a full day is skipped', () => {
  const booked = [{ employeeId: 'DAVE', date: TODAY, hours: 8, status: 'scheduled' }];
  const [p] = proposeSchedule([req()], [tech()], [], booked, TODAY);
  assert.equal(p.date, '2026-09-30');
});

test('a weekend is skipped without being told to', () => {
  // Friday 2026-10-02 with a one-day window rolls to Monday only if the window
  // allows; here ASAP gives a week, so a Saturday request lands on Monday.
  const off = [
    { employeeId: 'DAVE', from: '2026-09-29', to: '2026-10-02', kind: 'time_off' as const, status: 'approved' as const },
  ];
  const [p] = proposeSchedule([req()], [tech()], off, [], TODAY);
  assert.equal(p.date, '2026-10-05', 'the following Monday, not the Saturday');
});

/* ── urgency decides who gets the contested day ──────────────────────────── */

test('the urgent job takes the day and the flexible one moves on', () => {
  const urgent = req({ id: 'URGENT', timeline: 'asap', hours: 8 });
  const relaxed = req({ id: 'RELAXED', timeline: '6_months', hours: 8 });
  // Deliberately passed relaxed-first, so ordering has to do the work.
  const plan = proposeSchedule([relaxed, urgent], [tech()], [], [], TODAY);
  const byId = Object.fromEntries(plan.map(p => [p.jobId, p]));
  assert.equal(byId.URGENT.date, TODAY);
  assert.notEqual(byId.RELAXED.date, TODAY,
    'both being told Tuesday is free is the failure this ordering prevents');
});

test('a provisional booking is not offered twice', () => {
  const a = req({ id: 'A', hours: 8 });
  const b = req({ id: 'B', hours: 8 });
  const plan = proposeSchedule([a, b], [tech()], [], [], TODAY);
  assert.notEqual(plan[0].date, plan[1].date, 'one technician cannot do two full days at once');
});

/* ── a promised technician ───────────────────────────────────────────────── */

test('a promised technician is proposed but never booked automatically', () => {
  const [p] = proposeSchedule([req({ requestedTechId: 'DAVE' })], [tech()], [], [], TODAY);
  assert.equal(p.outcome, 'choice',
    'committing a job the customer was promised about is a decision somebody makes');
  assert.match(p.reason, /confirm before booking/i);
});

test('a promised technician who is away is a clash, not a substitution', () => {
  const off = [{ employeeId: 'DAVE', from: TODAY, to: '2026-12-31', kind: 'time_off' as const, status: 'approved' as const }];
  const sam = tech({ id: 'SAM', name: 'Sam' });
  const [p] = proposeSchedule([req({ requestedTechId: 'DAVE' })], [tech(), sam], off, [], TODAY);
  assert.equal(p.outcome, 'none');
  assert.match(p.reason, /asked for/i);
  assert.equal(p.techId, undefined, 'Sam is free, and offering him would break the promise');
});

/* ── when nothing fits ───────────────────────────────────────────────────── */

test('a full window reports a clash and names what was asked', () => {
  const off = [{ employeeId: 'DAVE', from: TODAY, to: '2027-12-31', kind: 'time_off' as const, status: 'approved' as const }];
  const [p] = proposeSchedule([req({ timeline: '1_month' })], [tech()], off, [], TODAY);
  assert.equal(p.outcome, 'none');
  assert.equal(p.date, null);
  assert.match(p.reason, /another window/i, 'the work is fine; the window is full');
  assert.match(p.reason, /within a month/i);
});

test('no technicians at all does not throw', () => {
  const [p] = proposeSchedule([req()], [], [], [], TODAY);
  assert.equal(p.outcome, 'none');
});

test('no requests is an empty plan, not an error', () => {
  assert.deepEqual(proposeSchedule([], [tech()], [], [], TODAY), []);
});

/* ── what the customer ruled out ─────────────────────────────────────────── */

test('a day the customer said does not work is not proposed', () => {
  // Avoid Tuesday, so the ASAP window should land on Wednesday.
  const [p] = proposeSchedule([req({ avoidDays: [2] })], [tech()], [], [], TODAY);
  assert.notEqual(p.date, TODAY, 'they said Tuesdays do not work');
  assert.equal(p.date, '2026-09-30');
});

/* ── the summary ─────────────────────────────────────────────────────────── */

test('the summary counts rather than asking a model to', () => {
  const plan = proposeSchedule(
    [req({ id: 'A' }), req({ id: 'B', requestedTechId: 'DAVE' })],
    [tech()], [], [], TODAY,
  );
  const line = summariseProposals(plan);
  assert.match(line, /need you/);
});

test('nothing waiting says so', () => {
  assert.match(summariseProposals([]), /nothing waiting/i);
});

/* ── one technician means there is no choice to make ─────────────────────── */

/**
 * Eric: "we should make a rule that they all go to the one until multiple
 * techs are added."
 *
 * It follows from auto-for-simple rather than qualifying it: the test is
 * whether a CHOICE was involved, and with one technician the only alternative
 * to booking them is booking nobody. So the caveats stop being gates.
 *
 * The failure this prevents is pure friction — a screen asking somebody to
 * choose between one option, every time, because a trade was never typed in.
 */
const bare = { id: 'SOLO', name: 'Solo' }; // no trades, no working pattern

test('a sole technician is booked even with nothing recorded about them', () => {
  const [p] = proposeSchedule([req({ trade: 'flooring' })], [bare], [], [], TODAY);
  assert.equal(p.outcome, 'auto',
    'asking somebody to choose between one option is friction, not care');
  assert.equal(p.techId, 'SOLO');
});

test('and the caveat still travels with it', () => {
  const [p] = proposeSchedule([req({ trade: 'flooring' })], [bare], [], [], TODAY);
  assert.ok(p.assumed, 'somebody should still know the plan rests on an assumption');
});

test('the wording does not imply others were considered', () => {
  const [p] = proposeSchedule([req({ trade: 'flooring' })], [bare], [], [], TODAY);
  assert.doesNotMatch(p.reason, /only one free/i,
    '"the only one free" implies a comparison that never happened');
});

test('add a second technician and the caveat becomes a question again', () => {
  const second = { id: 'TWO', name: 'Two' };
  const [p] = proposeSchedule([req({ trade: 'flooring' })], [bare, second], [], [], TODAY);
  assert.equal(p.outcome, 'choice', 'now there genuinely is a choice');
});

test('a sole technician on leave is still a clash, not a booking', () => {
  const off = [{ employeeId: 'SOLO', from: TODAY, to: '2027-12-31', kind: 'time_off' as const, status: 'approved' as const }];
  const [p] = proposeSchedule([req({ timeline: 'asap' })], [bare], off, [], TODAY);
  assert.equal(p.outcome, 'none', 'having nobody else does not make somebody available');
});

test('a promised technician still asks, even as the only one on the roster', () => {
  const [p] = proposeSchedule([req({ requestedTechId: 'SOLO' })], [bare], [], [], TODAY);
  assert.equal(p.outcome, 'choice',
    'that is not a question of who, but whether to commit a job already promised');
});
