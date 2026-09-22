/**
 * Who turns out, and when.
 *
 * WHY THESE ASSERTIONS
 *
 * Every one of them fails silently in production. A rota switched on with an
 * empty ladder throws nothing and looks finished. Business hours answered
 * backwards pages the night engineer on a Tuesday morning and leaves nobody at
 * two on a Sunday. A contracted vendor missed by a trade-name mismatch sends
 * work somebody has a signed agreement for out to the open market.
 *
 * None of those is an error anywhere. They are discovered by a person standing
 * in a flooded basement, so they are pinned here instead.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConfig, emptyConfig, isOnCallNow, contractedFor, heldByContract,
  ladderWithContacts, ladderMinutes, readiness, calloutCents, minutesOfDay,
  type OnCallConfig,
} from '../supabase/functions/server/onCallConfig.ts';

const base = (over: any = {}): OnCallConfig => normalizeConfig({
  enabled: true,
  hours: { mode: 'always', timezone: 'America/New_York' },
  contacts: [
    { id: 'a', name: 'Dan', phone: '+16035550101', role: 'Plumber' },
    { id: 'b', name: 'Ray', phone: '+16035550102', role: 'Electrician' },
  ],
  ladder: [
    { contactIds: ['a'], waitMinutes: 10 },
    { contactIds: ['b'], waitMinutes: 15 },
  ],
  ...over,
}, { email: 'l@x.com', audience: 'landlord' });

/* ── cleaning what gets stored ───────────────────────────────────────────── */

test('a rung pointing at somebody who was removed is dropped, not kept', () => {
  const c = base({
    contacts: [{ id: 'a', name: 'Dan', phone: '1' }],
    ladder: [{ contactIds: ['a', 'ghost'], waitMinutes: 5 }],
  });
  assert.deepEqual(c.ladder[0].contactIds, ['a'],
    'a rung that rings nobody looks identical on screen to one that works');
});

test('a rung left with nobody on it is removed entirely', () => {
  const c = base({
    contacts: [{ id: 'a', name: 'Dan', phone: '1' }],
    ladder: [{ contactIds: ['ghost'], waitMinutes: 5 }],
  });
  assert.equal(c.ladder.length, 0);
});

test('a zero wait is refused — the whole ladder would fire at once', () => {
  const c = base({ ladder: [{ contactIds: ['a'], waitMinutes: 0 }] });
  assert.equal(c.ladder[0].waitMinutes, 5, 'falls back rather than paging everyone simultaneously');
});

test('an absurd wait is capped, because it reads as a rota that works', () => {
  const c = base({ ladder: [{ contactIds: ['a'], waitMinutes: 6000 }] });
  assert.equal(c.ladder[0].waitMinutes, 120);
});

test('exclusivity is opt-in, never assumed', () => {
  const c = base({ contractedVendors: [{ trade: 'plumbing', name: 'Ace' }] });
  assert.equal(c.contractedVendors[0].exclusive, false,
    'read as true by default it would quietly stop work reaching the exchange');
});

test('escalation to Black Phoenix is on unless it is switched off', () => {
  assert.equal(base().escalateToPlatform, true);
  assert.equal(base({ escalateToPlatform: false }).escalateToPlatform, false);
});

test('an empty config is usable rather than half-built', () => {
  const c = emptyConfig('a@b.com', 'condo_association');
  assert.equal(c.enabled, false);
  assert.equal(c.contacts.length, 0);
  assert.equal(c.hours.mode, 'always');
});

/* ── when it covers ──────────────────────────────────────────────────────── */

test('a time that cannot be read is null, never a silent midnight', () => {
  assert.equal(minutesOfDay('08:30'), 510);
  assert.equal(minutesOfDay('24:00'), null);
  assert.equal(minutesOfDay('8:30am'), null);
  assert.equal(minutesOfDay(''), null);
});

test('always means always, including the middle of a Tuesday', () => {
  // 2026-09-22 is a Tuesday. 15:00 UTC is 11:00 in New York.
  assert.ok(isOnCallNow(base(), new Date('2026-09-22T15:00:00Z')));
});

test('switched off covers nothing, whatever the hours say', () => {
  assert.ok(!isOnCallNow(base({ enabled: false }), new Date('2026-09-22T06:00:00Z')));
});

test('outside business hours does NOT cover the working day', () => {
  const c = base({ hours: { mode: 'outside-business-hours', timezone: 'America/New_York' } });
  // 15:00 UTC = 11:00 Tuesday in New York, squarely inside 08:00–17:00.
  assert.ok(!isOnCallNow(c, new Date('2026-09-22T15:00:00Z')),
    'paging the night engineer on a Tuesday morning is the backwards answer');
});

test('outside business hours covers the night', () => {
  const c = base({ hours: { mode: 'outside-business-hours', timezone: 'America/New_York' } });
  // 06:00 UTC = 02:00 Tuesday in New York.
  assert.ok(isOnCallNow(c, new Date('2026-09-22T06:00:00Z')));
});

test('outside business hours covers the whole weekend', () => {
  const c = base({ hours: { mode: 'outside-business-hours', timezone: 'America/New_York' } });
  // 2026-09-20 is a Sunday; 18:00 UTC is 14:00 there, a working-day hour.
  assert.ok(isOnCallNow(c, new Date('2026-09-20T18:00:00Z')));
});

test('the zone is the account\'s, not the server\'s', () => {
  const ny = base({ hours: { mode: 'outside-business-hours', timezone: 'America/New_York' } });
  const utc = base({ hours: { mode: 'outside-business-hours', timezone: 'UTC' } });
  const noon = new Date('2026-09-22T12:00:00Z'); // 08:00 in New York
  assert.ok(!isOnCallNow(utc, noon), 'midday UTC is inside the UTC working day');
  assert.ok(!isOnCallNow(ny, noon), '08:00 is inside the New York working day too');
  const eight = new Date('2026-09-22T07:00:00Z'); // 03:00 New York, 07:00 UTC
  assert.ok(isOnCallNow(ny, eight), '03:00 is the night in New York');
  assert.ok(isOnCallNow(utc, eight), '07:00 is before the UTC working day');
});

test('custom hours cover only the windows that were set', () => {
  const c = base({
    hours: {
      mode: 'custom', timezone: 'UTC',
      windows: [{ day: 2, from: '22:00', to: '06:00' }],
    },
  });
  assert.ok(isOnCallNow(c, new Date('2026-09-22T23:00:00Z')), 'a window may cross midnight');
  assert.ok(!isOnCallNow(c, new Date('2026-09-22T12:00:00Z')));
});

/* ── contracted vendors, which come before everything ────────────────────── */

test('a contracted trade is matched loosely in both directions', () => {
  const c = base({
    contractedVendors: [{ trade: 'plumbing & heating', name: 'Ace', exclusive: true }],
  });
  assert.equal(contractedFor(c, 'plumbing').length, 1,
    'the trade is typed by somebody who is panicking');
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

/* ── the ladder ──────────────────────────────────────────────────────────── */

test('the ladder resolves to real people, in order', () => {
  const steps = ladderWithContacts(base());
  assert.deepEqual(steps.map(s => s.contacts.map(c => c.name)), [['Dan'], ['Ray']]);
});

test('the whole ladder has a length, which is when escalation is due', () => {
  assert.equal(ladderMinutes(base()), 25);
});

/* ── and the state that looks finished and rings nobody ──────────────────── */

test('on-call switched on with an empty rota is reported, not accepted quietly', () => {
  const r = readiness(base({ ladder: [] }));
  assert.ok(!r.ready);
  assert.match(r.problems.join(' '), /reach no one/);
});

test('somebody on the rota with no phone number is named', () => {
  const c = base({
    contacts: [{ id: 'a', name: 'Dan', phone: '' }],
    ladder: [{ contactIds: ['a'], waitMinutes: 5 }],
  });
  const r = readiness(c);
  assert.ok(!r.ready);
  assert.match(r.problems.join(' '), /Dan/);
});

test('custom hours with no windows never covers anything, and says so', () => {
  const c = base({ hours: { mode: 'custom', timezone: 'UTC', windows: [] } });
  assert.match(readiness(c).problems.join(' '), /never covers/);
});

test('a complete rota is ready', () => {
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
  const { total } = calloutCents(priced(), { hours: 4 });
  assert.equal(total, 15000 + 50000);
});

test('an account that has set no rates charges nothing rather than guessing', () => {
  const { total, lines } = calloutCents(base(), { hours: 3, afterHours: true });
  assert.equal(total, 0);
  assert.equal(lines.length, 0);
});
