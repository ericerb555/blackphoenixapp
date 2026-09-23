/**
 * What a call is owed when nobody is watching.
 *
 * WHY THESE ASSERTIONS
 *
 * Every action this module returns wakes somebody or broadcasts somebody's
 * emergency to other contractors, and it runs unattended. So the failures are
 * the expensive kind: climbing a rota after a person has already picked up
 * teaches everybody to ignore it; acting on a call from last Tuesday rings a
 * phone at three in the morning about a problem long since fixed; and putting
 * contracted work out to the open market undercuts an agreement the customer
 * signed.
 *
 * None of those throws. Each is a plausible-looking decision made at 3am by
 * something with no person present.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dueAction, escalationGoesToExchange, isStale, STALE_AFTER_HOURS,
} from '../supabase/functions/server/onCallEscalation.ts';

const T0 = new Date('2026-09-23T02:00:00Z');
const at = (mins: number) => new Date(T0.getTime() + mins * 60_000);

const call = (over: any = {}) => ({
  status: 'open',
  createdAt: T0.toISOString(),
  plan: {
    outcome: 'rota',
    steps: [
      { waitMinutes: 10, contacts: [{ id: 'a', name: 'Dan', phone: '+1' }] },
      { waitMinutes: 15, contacts: [{ id: 'b', name: 'Ray', phone: '+1' }] },
    ],
    next: { platform: true, exchange: false },
  },
  paging: { rung: 0, lastPagedAt: T0.toISOString() },
  ...over,
});

/* ── the rota stops when somebody picks up ───────────────────────────────── */

test('an answered call is left alone, whatever the clock says', () => {
  const d = dueAction(call({ status: 'answered' }), at(999));
  assert.equal(d.action, 'none');
  assert.match(d.reason, /already answered/);
});

test('a closed call is left alone', () => {
  assert.equal(dueAction(call({ status: 'closed' }), at(999)).action, 'none');
});

/* ── climbing, but only when it is due ───────────────────────────────────── */

test('nothing happens before the wait has elapsed', () => {
  const d = dueAction(call(), at(9));
  assert.equal(d.action, 'none');
  assert.match(d.reason, /1 min left/);
});

test('the next rung fires once the wait is up', () => {
  const d = dueAction(call(), at(10));
  assert.equal(d.action, 'page-next');
  assert.equal((d as any).rung, 1, 'the second rung, zero-indexed');
});

test('the wait is measured from the last page, not from when the call opened', () => {
  // Rung 1 was paged 10 minutes in; its own 15-minute wait runs from there.
  const c = call({ paging: { rung: 1, lastPagedAt: at(10).toISOString() } });
  assert.equal(dueAction(c, at(20)).action, 'none', 'only 10 of 15 minutes gone');
  assert.equal(dueAction(c, at(25)).action, 'escalate');
});

test('the end of the rota is an escalation, not another page', () => {
  const c = call({ paging: { rung: 1, lastPagedAt: T0.toISOString() } });
  const d = dueAction(c, at(15));
  assert.equal(d.action, 'escalate');
  assert.match(d.reason, /nobody answered/);
});

/* ── the states it must not guess about ──────────────────────────────────── */

test('a rota that was never paged escalates rather than skipping the first person', () => {
  const d = dueAction(call({ paging: undefined }), at(30));
  assert.equal(d.action, 'escalate');
  assert.match(d.reason, /never paged/);
});

test('an outcome that was never a rota is already where it was going', () => {
  for (const outcome of ['contracted', 'office-hours', 'escalate', 'nobody']) {
    const d = dueAction(call({ plan: { outcome, steps: [] } }), at(999));
    assert.equal(d.action, 'none', `${outcome} should not be climbed`);
  }
});

test('a last-paged time that cannot be read does nothing', () => {
  const d = dueAction(call({ paging: { rung: 0, lastPagedAt: 'not a date' } }), at(60));
  assert.equal(d.action, 'none');
});

test('a clock that went backwards waits rather than firing', () => {
  const d = dueAction(call({ paging: { rung: 0, lastPagedAt: at(60).toISOString() } }), at(10));
  assert.equal(d.action, 'none');
  assert.match(d.reason, /in the future/);
});

test('a rota with no steps is nothing to climb', () => {
  assert.equal(dueAction(call({ plan: { outcome: 'rota', steps: [] } }), at(99)).action, 'none');
});

/* ── the exchange decision is read, never re-made ────────────────────────── */

test('escalation uses the exchange only when the service asked for it', () => {
  assert.ok(!escalationGoesToExchange(call()));
  assert.ok(escalationGoesToExchange(call({
    plan: { ...call().plan, next: { platform: true, exchange: true } },
  })));
});

test('contracted work never reaches the exchange, whatever the plan carries', () => {
  const c = call({ plan: { outcome: 'contracted', next: { exchange: true } } });
  assert.ok(!escalationGoesToExchange(c),
    'an agreement the customer signed is not undercut by a scheduler');
});

test('an in-hours request is not broadcast either', () => {
  const c = call({ plan: { outcome: 'office-hours', next: { exchange: true } } });
  assert.ok(!escalationGoesToExchange(c));
});

test('a call already on the exchange is not posted twice', () => {
  const c = call({ bidRequestId: 'abc', plan: { ...call().plan, next: { exchange: true } } });
  assert.ok(!escalationGoesToExchange(c));
});

/* ── and the ceiling that stops a phone ringing about last Tuesday ───────── */

test('a fresh call is not stale', () => {
  assert.ok(!isStale(call(), at(60)));
});

test('a call nobody ever closed stops being acted on', () => {
  assert.ok(isStale(call(), at(STALE_AFTER_HOURS * 60 + 1)),
    'a phone ringing at 3am about a burst pipe from last Tuesday');
});

test('a call with no readable start time is not treated as stale', () => {
  assert.ok(!isStale(call({ createdAt: 'nonsense' }), at(99999)));
});
