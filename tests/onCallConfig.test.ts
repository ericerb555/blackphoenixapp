/**
 * Who turns out, for what, and when.
 *
 * WHY THESE ASSERTIONS
 *
 * Every one of them fails silently in production. A rota switched on with
 * nobody on it throws nothing and looks finished. Business hours answered
 * backwards page the night engineer on a Tuesday morning and leave nobody at
 * two on a Sunday. A contracted vendor missed by a trade-name mismatch sends
 * work somebody has a signed agreement for out to the open market. An
 * emergency in a trade nobody listed matches no service and reaches no one.
 *
 * None of those is an error anywhere. They are discovered by a person standing
 * in a flooded basement, so they are pinned here instead.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConfig, emptyConfig, isOnCallNow, contractedFor, heldByContract,
  ladderWithContacts, ladderMinutes, readiness, calloutCents, minutesOfDay,
  serviceFor, hoursFor, extrasFor, afterTheRota,
  type OnCallConfig,
} from '../supabase/functions/server/onCallConfig.ts';

const base = (over: any = {}): OnCallConfig => normalizeConfig({
  enabled: true,
  hours: { mode: 'always', timezone: 'America/New_York' },
  contacts: [
    { id: 'a', name: 'Dan', phone: '+16035550101', role: 'Plumber' },
    { id: 'b', name: 'Ray', phone: '+16035550102', role: 'Electrician' },
  ],
  services: [
    {
      id: 'plumbing', name: 'Plumbing', events: ['plumbing'],
      ladder: [{ contactIds: ['a'], waitMinutes: 10 }, { contactIds: ['b'], waitMinutes: 15 }],
      sendToExchange: false, enabled: true,
    },
    {
      id: 'general', name: 'Everything else', events: [],
      ladder: [{ contactIds: ['b'], waitMinutes: 20 }],
      sendToExchange: true, enabled: true,
    },
  ],
  ...over,
}, { email: 'l@x.com', audience: 'landlord' });

const svc = (c: OnCallConfig, id: string) => c.services.find(s => s.id === id) || null;

/* ── cleaning what gets stored ───────────────────────────────────────────── */

test('a rung pointing at somebody who was removed is dropped, not kept', () => {
  const c = base({
    contacts: [{ id: 'a', name: 'Dan', phone: '1' }],
    services: [{ id: 's1', name: 'One', events: [], ladder: [{ contactIds: ['a', 'ghost'], waitMinutes: 5 }] }],
  });
  assert.deepEqual(c.services[0].ladder[0].contactIds, ['a'],
    'a rung that rings nobody looks identical on screen to one that works');
});

test('a rung left with nobody on it is removed entirely', () => {
  const c = base({
    contacts: [{ id: 'a', name: 'Dan', phone: '1' }],
    services: [{ id: 's1', name: 'One', events: [], ladder: [{ contactIds: ['ghost'], waitMinutes: 5 }] }],
  });
  assert.equal(c.services[0].ladder.length, 0);
});

test('a zero wait is refused — the whole rota would fire at once', () => {
  const c = base({
    services: [{ id: 's1', name: 'One', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 0 }] }],
  });
  assert.equal(c.services[0].ladder[0].waitMinutes, 5, 'falls back rather than paging everyone simultaneously');
});

test('an absurd wait is capped, because it reads as a rota that works', () => {
  const c = base({
    services: [{ id: 's1', name: 'One', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 6000 }] }],
  });
  assert.equal(c.services[0].ladder[0].waitMinutes, 120);
});

test('a service with no name is dropped rather than stored unnameable', () => {
  const c = base({ services: [{ id: 's1', name: '', events: [], ladder: [] }] });
  assert.equal(c.services.length, 0);
});

test('exclusivity is opt-in, never assumed', () => {
  const c = base({ contractedVendors: [{ trade: 'plumbing', name: 'Ace' }] });
  assert.equal(c.contractedVendors[0].exclusive, false,
    'read as true by default it would quietly stop work reaching the exchange');
});

test('sending to the exchange is opt-in per service', () => {
  const c = base({ services: [{ id: 's1', name: 'One', events: [], ladder: [] }] });
  assert.equal(c.services[0].sendToExchange, false);
});

test('escalation to Black Phoenix is on unless it is switched off', () => {
  assert.equal(base().escalateToPlatform, true);
  assert.equal(base({ escalateToPlatform: false }).escalateToPlatform, false);
});

test('a record saved with one ladder becomes one catch-all service', () => {
  // The shape this file held before services existed. Losing somebody's rota
  // in a format change is exactly the silent damage to avoid.
  const c = normalizeConfig({
    enabled: true,
    contacts: [{ id: 'a', name: 'Dan', phone: '1' }],
    ladder: [{ contactIds: ['a'], waitMinutes: 8 }],
  }, { email: 'l@x.com', audience: 'landlord' });
  assert.equal(c.services.length, 1);
  assert.deepEqual(c.services[0].events, [], 'it answered everything, so it still does');
  assert.equal(c.services[0].ladder[0].waitMinutes, 8);
});

test('an empty config is usable rather than half-built', () => {
  const c = emptyConfig('a@b.com', 'condo_association');
  assert.equal(c.enabled, false);
  assert.equal(c.services.length, 0);
  assert.equal(c.hours.mode, 'always');
});

/* ── matching an emergency to a service ──────────────────────────────────── */

test('a named service answers its own trade', () => {
  assert.equal(serviceFor(base(), 'plumbing')?.id, 'plumbing');
});

test('the trade is matched loosely, because it is typed by somebody panicking', () => {
  const c = base({
    services: [
      { id: 'p', name: 'Plumbing', events: ['plumbing & heating'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] },
    ],
  });
  assert.equal(serviceFor(c, 'plumbing')?.id, 'p');
  assert.equal(serviceFor(c, 'Plumbing & Heating')?.id, 'p');
});

test('an unlisted trade falls to the catch-all rather than reaching nobody', () => {
  assert.equal(serviceFor(base(), 'roof leak')?.id, 'general');
});

test('with no catch-all, an unlisted trade matches nothing and the caller escalates', () => {
  const c = base({
    services: [{ id: 'p', name: 'Plumbing', events: ['plumbing'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  assert.equal(serviceFor(c, 'electrical'), null, 'answering null beats guessing a rota');
});

test('a switched-off service answers nothing, including as the catch-all', () => {
  const c = base({
    services: [
      { id: 'p', name: 'Plumbing', events: ['plumbing'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] },
      { id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['b'], waitMinutes: 5 }], enabled: false },
    ],
  });
  assert.equal(serviceFor(c, 'plumbing')?.id, 'p');
  assert.equal(serviceFor(c, 'roofing'), null);
});

/* ── a service may differ from the account's defaults ────────────────────── */

test('a service uses the account hours unless it sets its own', () => {
  const c = base({
    hours: { mode: 'outside-business-hours', timezone: 'UTC' },
    services: [
      { id: 'lock', name: 'Lockouts', events: ['lockout'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }],
        hours: { mode: 'always', timezone: 'UTC' } },
      { id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['b'], waitMinutes: 5 }] },
    ],
  });
  assert.equal(hoursFor(c, svc(c, 'lock')).mode, 'always', 'the lockout line runs all night');
  assert.equal(hoursFor(c, svc(c, 'g')).mode, 'outside-business-hours');
});

test('a service uses the account rates unless it sets its own', () => {
  const c = base({
    extras: { calloutCents: 10000, afterHoursCents: 0, hourlyCents: 0, minimumHours: 0 },
    services: [
      { id: 'lift', name: 'Lift entrapment', events: ['lift'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }],
        extras: { calloutCents: 45000, afterHoursCents: 0, hourlyCents: 0, minimumHours: 0 } },
      { id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['b'], waitMinutes: 5 }] },
    ],
  });
  assert.equal(extrasFor(c, svc(c, 'lift')).calloutCents, 45000);
  assert.equal(extrasFor(c, svc(c, 'g')).calloutCents, 10000);
  assert.equal(calloutCents(c, { service: svc(c, 'lift') }).total, 45000);
});

/* ── when it covers ──────────────────────────────────────────────────────── */

test('a time that cannot be read is null, never a silent midnight', () => {
  assert.equal(minutesOfDay('08:30'), 510);
  assert.equal(minutesOfDay('24:00'), null);
  assert.equal(minutesOfDay('8:30am'), null);
  assert.equal(minutesOfDay(''), null);
});

test('switched off covers nothing, whatever the hours say', () => {
  assert.ok(!isOnCallNow(base({ enabled: false }), null, new Date('2026-09-22T06:00:00Z')));
});

test('outside business hours does NOT cover the working day', () => {
  const c = base({
    hours: { mode: 'outside-business-hours', timezone: 'America/New_York' },
    services: [{ id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  // 15:00 UTC = 11:00 Tuesday in New York, squarely inside 08:00–17:00.
  assert.ok(!isOnCallNow(c, svc(c, 'g'), new Date('2026-09-22T15:00:00Z')),
    'paging the night engineer on a Tuesday morning is the backwards answer');
});

test('outside business hours covers the night', () => {
  const c = base({
    hours: { mode: 'outside-business-hours', timezone: 'America/New_York' },
    services: [{ id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  assert.ok(isOnCallNow(c, svc(c, 'g'), new Date('2026-09-22T06:00:00Z')));
});

test('outside business hours covers the whole weekend', () => {
  const c = base({
    hours: { mode: 'outside-business-hours', timezone: 'America/New_York' },
    services: [{ id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  // 2026-09-20 is a Sunday; 18:00 UTC is 14:00 there, a working-day hour.
  assert.ok(isOnCallNow(c, svc(c, 'g'), new Date('2026-09-20T18:00:00Z')));
});

test('the zone is the account\'s, not the server\'s', () => {
  const make = (tz: string) => base({
    hours: { mode: 'outside-business-hours', timezone: tz },
    services: [{ id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  const ny = make('America/New_York');
  const utc = make('UTC');
  const eight = new Date('2026-09-22T07:00:00Z'); // 03:00 New York, 07:00 UTC
  assert.ok(isOnCallNow(ny, svc(ny, 'g'), eight), '03:00 is the night in New York');
  assert.ok(isOnCallNow(utc, svc(utc, 'g'), eight), '07:00 is before the UTC working day');
  const noon = new Date('2026-09-22T12:00:00Z'); // 08:00 New York
  assert.ok(!isOnCallNow(utc, svc(utc, 'g'), noon));
  assert.ok(!isOnCallNow(ny, svc(ny, 'g'), noon));
});

test('custom hours cover only the windows that were set', () => {
  const c = base({
    services: [{
      id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }],
      hours: { mode: 'custom', timezone: 'UTC', windows: [{ day: 2, from: '22:00', to: '06:00' }] },
    }],
  });
  assert.ok(isOnCallNow(c, svc(c, 'g'), new Date('2026-09-22T23:00:00Z')), 'a window may cross midnight');
  assert.ok(!isOnCallNow(c, svc(c, 'g'), new Date('2026-09-22T12:00:00Z')));
});

test('with no service named, the account is covered if any service is', () => {
  const c = base({
    hours: { mode: 'outside-business-hours', timezone: 'UTC' },
    services: [
      { id: 'day', name: 'Day', events: ['x'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] },
      { id: 'lock', name: 'Lockouts', events: ['lockout'], ladder: [{ contactIds: ['b'], waitMinutes: 5 }],
        hours: { mode: 'always', timezone: 'UTC' } },
    ],
  });
  // Midday UTC: the default-hours service is off duty, the always-on one is not.
  assert.ok(isOnCallNow(c, null, new Date('2026-09-22T12:00:00Z')));
});

/* ── contracted vendors, which come before everything ────────────────────── */

test('a contracted trade is matched loosely in both directions', () => {
  const c = base({ contractedVendors: [{ trade: 'plumbing & heating', name: 'Ace', exclusive: true }] });
  assert.equal(contractedFor(c, 'plumbing').length, 1);
  assert.equal(contractedFor(c, 'Plumbing & Heating').length, 1);
  assert.equal(contractedFor(c, 'electrical').length, 0);
});

test('an exclusive contract stops the job reaching the open exchange', () => {
  const c = base({ contractedVendors: [{ trade: 'roofing', name: 'Ace', exclusive: true }] });
  assert.ok(heldByContract(c, 'roofing'));
});

test('a non-exclusive contract does not hold the job back', () => {
  const c = base({ contractedVendors: [{ trade: 'roofing', name: 'Ace', exclusive: false }] });
  assert.equal(contractedFor(c, 'roofing').length, 1, 'they are still contracted');
  assert.ok(!heldByContract(c, 'roofing'), 'but the exchange is not closed off');
});

test('no trade at all matches nobody rather than everybody', () => {
  const c = base({ contractedVendors: [{ trade: 'roofing', name: 'Ace', exclusive: true }] });
  assert.equal(contractedFor(c, '').length, 0);
});

/* ── the rota, and where a call goes after it ────────────────────────────── */

test('a service rota resolves to real people, in order', () => {
  const c = base();
  const steps = ladderWithContacts(c, svc(c, 'plumbing'));
  assert.deepEqual(steps.map(s => s.contacts.map(x => x.name)), [['Dan'], ['Ray']]);
});

test('each service has its own length, which is when escalation is due', () => {
  const c = base();
  assert.equal(ladderMinutes(svc(c, 'plumbing')), 25);
  assert.equal(ladderMinutes(svc(c, 'general')), 20);
});

test('where a call goes next is per service for the exchange, per account for us', () => {
  const c = base();
  assert.deepEqual(afterTheRota(c, svc(c, 'plumbing')), { exchange: false, platform: true });
  assert.deepEqual(afterTheRota(c, svc(c, 'general')), { exchange: true, platform: true });
});

test('an account that has turned escalation off keeps its exchange choice', () => {
  const c = base({ escalateToPlatform: false });
  assert.deepEqual(afterTheRota(c, svc(c, 'general')), { exchange: true, platform: false });
});

/* ── and the state that looks finished and rings nobody ──────────────────── */

test('on-call switched on with no services at all is reported', () => {
  const r = readiness(base({ services: [] }));
  assert.ok(!r.ready);
  assert.match(r.problems.join(' '), /reach no one/);
});

test('a service with an empty rota is named, not lost among the others', () => {
  const c = base({
    services: [
      { id: 'p', name: 'Plumbing', events: ['plumbing'], ladder: [] },
      { id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] },
    ],
  });
  const r = readiness(c);
  assert.ok(!r.ready);
  assert.match(r.problems.join(' '), /Plumbing/);
});

test('somebody on a rota with no phone number is named', () => {
  const c = base({
    contacts: [{ id: 'a', name: 'Dan', phone: '' }],
    services: [{ id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  assert.match(readiness(c).problems.join(' '), /Dan/);
});

test('specific hours with no windows never covers anything, and says so', () => {
  const c = base({
    services: [{
      id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 5 }],
      hours: { mode: 'custom', timezone: 'UTC', windows: [] },
    }],
  });
  assert.match(readiness(c).problems.join(' '), /never covers/);
});

test('named services only, with escalation off, leaves an unlisted trade nowhere', () => {
  const c = base({
    escalateToPlatform: false,
    services: [{ id: 'p', name: 'Plumbing', events: ['plumbing'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  const r = readiness(c);
  assert.ok(!r.ready);
  assert.match(r.problems.join(' '), /any other trade would reach nobody/);
});

test('named services only is fine while escalation is on', () => {
  const c = base({
    services: [{ id: 'p', name: 'Plumbing', events: ['plumbing'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  assert.ok(readiness(c).ready, 'it lands with us, which is survivable');
});

test('a complete setup is ready', () => {
  assert.ok(readiness(base()).ready);
});

/* ── what a callout costs ────────────────────────────────────────────────── */

const priced = () => base({
  extras: { calloutCents: 15000, afterHoursCents: 10000, hourlyCents: 12500, minimumHours: 2 },
});

test('a callout in hours is the callout plus the minimum labour', () => {
  const { total, lines } = calloutCents(priced(), { hours: 0.5 });
  assert.equal(total, 15000 + 25000, 'the minimum is two hours, not the half hour worked');
  assert.equal(lines.length, 2);
});

test('out of hours is added to the callout, not substituted for it', () => {
  const { total } = calloutCents(priced(), { hours: 2, afterHours: true });
  assert.equal(total, 15000 + 10000 + 25000,
    'turning out at 2am is the callout plus the inconvenience');
});

test('hours above the minimum are billed as worked', () => {
  assert.equal(calloutCents(priced(), { hours: 4 }).total, 15000 + 50000);
});

test('an account that has set no rates charges nothing rather than guessing', () => {
  const { total, lines } = calloutCents(base(), { hours: 3, afterHours: true });
  assert.equal(total, 0);
  assert.equal(lines.length, 0);
});
