/**
 * What happens to one emergency.
 *
 * WHY THESE ASSERTIONS
 *
 * The order is the product, and every way of getting it wrong is expensive in
 * a different direction. Broadcasting work that somebody holds an exclusive
 * contract for undercuts an agreement the customer signed. Treating a Tuesday
 * morning as an unanswered emergency pages a night engineer during the working
 * day. Ringing a rota that has nobody on it spends twenty-five minutes proving
 * it while a basement fills. And an emergency that reaches nobody at all must
 * never pass as an ordinary outcome.
 *
 * None of those throws. They are all a plausible-looking plan.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, type OnCallConfig } from '../supabase/functions/server/onCallConfig.ts';
import {
  routeEmergency, goesToExchange, escalateAfterMinutes,
} from '../supabase/functions/server/onCallRouting.ts';

const cfg = (over: any = {}): OnCallConfig => normalizeConfig({
  enabled: true,
  hours: { mode: 'always', timezone: 'UTC' },
  extras: { calloutCents: 15000, afterHoursCents: 5000, hourlyCents: 0, minimumHours: 0 },
  contacts: [
    { id: 'a', name: 'Dan', phone: '+16035550101' },
    { id: 'b', name: 'Ray', phone: '+16035550102' },
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

const NIGHT = new Date('2026-09-22T06:00:00Z');

/* ── 1. a contracted vendor wins outright ────────────────────────────────── */

test('an exclusive contract takes the work and stops everything else', () => {
  const plan = routeEmergency(
    cfg({ contractedVendors: [{ trade: 'plumbing', name: 'Ace Plumbing', exclusive: true }] }),
    { trade: 'plumbing', at: NIGHT },
  );
  assert.equal(plan.outcome, 'contracted');
  assert.equal(plan.steps.length, 0, 'the account\'s own rota is not rung');
  assert.deepEqual(plan.next, { platform: false, exchange: false });
  assert.ok(!goesToExchange(plan), 'an agreement the customer signed is not undercut');
  assert.match(plan.reason, /Ace Plumbing/);
});

test('an exclusive contract wins even when the service would have gone to the exchange', () => {
  const plan = routeEmergency(
    cfg({ contractedVendors: [{ trade: 'roofing', name: 'Ace Roofing', exclusive: true }] }),
    { trade: 'roofing', at: NIGHT },
  );
  // 'roofing' falls to the catch-all, which has sendToExchange true.
  assert.equal(plan.outcome, 'contracted');
  assert.ok(!goesToExchange(plan));
});

test('a non-exclusive contract is reported but does not stop the routing', () => {
  const plan = routeEmergency(
    cfg({ contractedVendors: [{ trade: 'plumbing', name: 'Ace', exclusive: false }] }),
    { trade: 'plumbing', at: NIGHT },
  );
  assert.equal(plan.outcome, 'rota', 'they are an option, not a lock');
  assert.equal(plan.contracted.length, 1, 'and they are still named on the plan');
});

/* ── 2. the account's own rota ───────────────────────────────────────────── */

test('the matching service is rung, first step first', () => {
  const plan = routeEmergency(cfg(), { trade: 'plumbing', at: NIGHT });
  assert.equal(plan.outcome, 'rota');
  assert.equal(plan.service?.id, 'plumbing');
  assert.deepEqual(plan.steps.map(s => s.contacts.map(c => c.name)), [['Dan'], ['Ray']]);
  assert.equal(plan.rotaMinutes, 25);
  assert.equal(escalateAfterMinutes(plan), 25);
});

test('an unlisted trade falls to the catch-all rather than escalating', () => {
  const plan = routeEmergency(cfg(), { trade: 'broken window', at: NIGHT });
  assert.equal(plan.outcome, 'rota');
  assert.equal(plan.service?.id, 'general');
});

test('where it goes after the rota is the service\'s choice', () => {
  const viaExchange = routeEmergency(cfg(), { trade: 'broken window', at: NIGHT });
  assert.ok(goesToExchange(viaExchange), 'the catch-all was set to use the exchange');
  const notExchange = routeEmergency(cfg(), { trade: 'plumbing', at: NIGHT });
  assert.ok(!goesToExchange(notExchange), 'the plumbing line was not');
  assert.ok(notExchange.next.platform, 'but it still falls back to us');
});

/* ── the outcome that is not an escalation ───────────────────────────────── */

test('inside the working day is an ordinary request, not an unanswered emergency', () => {
  const c = cfg({
    hours: { mode: 'outside-business-hours', timezone: 'UTC' },
    services: [{
      id: 'g', name: 'General', events: [],
      ladder: [{ contactIds: ['a'], waitMinutes: 10 }], sendToExchange: true,
    }],
  });
  // 12:00 UTC on a Tuesday, squarely inside 08:00–17:00.
  const plan = routeEmergency(c, { trade: 'plumbing', at: new Date('2026-09-22T12:00:00Z') });
  assert.equal(plan.outcome, 'office-hours');
  assert.equal(plan.steps.length, 0, 'nobody is paged during the working day');
  assert.ok(!goesToExchange(plan), 'and it is not thrown to contractors either');
  assert.equal(escalateAfterMinutes(plan), 0);
});

test('the same service at night does page', () => {
  const c = cfg({
    hours: { mode: 'outside-business-hours', timezone: 'UTC' },
    services: [{
      id: 'g', name: 'General', events: [],
      ladder: [{ contactIds: ['a'], waitMinutes: 10 }], sendToExchange: true,
    }],
  });
  assert.equal(routeEmergency(c, { trade: 'plumbing', at: NIGHT }).outcome, 'rota');
});

/* ── 3. escalation, and the case that must never be quiet ────────────────── */

test('on-call switched off escalates rather than pretending to ring somebody', () => {
  const plan = routeEmergency(cfg({ enabled: false }), { trade: 'plumbing', at: NIGHT });
  assert.equal(plan.outcome, 'escalate');
  assert.ok(plan.next.platform);
});

test('a rota with nobody reachable escalates at once, not after its minutes', () => {
  const c = cfg({
    contacts: [{ id: 'a', name: 'Dan', phone: '' }],
    services: [{ id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 20 }] }],
  });
  const plan = routeEmergency(c, { trade: 'anything', at: NIGHT });
  assert.equal(plan.outcome, 'escalate');
  assert.equal(escalateAfterMinutes(plan), 0,
    'a basement is filling; it must not spend twenty minutes ringing nothing');
  assert.match(plan.reason, /nobody reachable/);
});

test('no service and no catch-all escalates to us', () => {
  const c = cfg({
    services: [{ id: 'p', name: 'Plumbing', events: ['plumbing'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  const plan = routeEmergency(c, { trade: 'electrical', at: NIGHT });
  assert.equal(plan.outcome, 'escalate');
  assert.ok(plan.next.platform);
});

test('nothing left to try is its own outcome, never a quiet escalation', () => {
  const c = cfg({
    escalateToPlatform: false,
    services: [{ id: 'p', name: 'Plumbing', events: ['plumbing'], ladder: [{ contactIds: ['a'], waitMinutes: 5 }] }],
  });
  const plan = routeEmergency(c, { trade: 'electrical', at: NIGHT });
  assert.equal(plan.outcome, 'nobody');
  assert.match(plan.reason, /reach nobody/);
});

test('switched off with escalation off also reaches nobody, and says so', () => {
  const plan = routeEmergency(
    cfg({ enabled: false, escalateToPlatform: false }),
    { trade: 'plumbing', at: NIGHT },
  );
  assert.equal(plan.outcome, 'nobody');
});

/* ── what it costs, and who answers ──────────────────────────────────────── */

test('the callout is priced from the account\'s own rates', () => {
  const plan = routeEmergency(cfg(), { trade: 'plumbing', at: NIGHT });
  assert.equal(plan.charges.total, 15000 + 5000, 'callout plus out of hours');
});

test('a call inside the working day is not charged the out-of-hours addition', () => {
  const c = cfg({
    hours: { mode: 'outside-business-hours', timezone: 'UTC' },
    services: [{ id: 'g', name: 'General', events: [], ladder: [{ contactIds: ['a'], waitMinutes: 10 }] }],
  });
  const plan = routeEmergency(c, { trade: 'plumbing', at: new Date('2026-09-22T12:00:00Z') });
  assert.equal(plan.charges.total, 15000, 'it is not out of hours, so it is not billed as such');
});

test('whether Black Phoenix answers is carried in, never read off the record', () => {
  assert.equal(routeEmergency(cfg(), { trade: 'plumbing', at: NIGHT }).weAnswer, false);
  assert.equal(
    routeEmergency(cfg(), { trade: 'plumbing', at: NIGHT, weAnswer: true }).weAnswer,
    true,
  );
});

test('every plan explains itself in words', () => {
  for (const trade of ['plumbing', 'broken window', '']) {
    const plan = routeEmergency(cfg(), { trade, at: NIGHT });
    assert.ok(plan.reason.length > 20, `"${trade}" produced no readable reason`);
  }
});

/* ── whose rates apply, which the customer must not decide ───────────────── */

/**
 * The account edits its own on-call record, and that is right for a rota they
 * run themselves — their contractor, their money, their rates. It is exactly
 * wrong when Black Phoenix answers, because then the figures are ours and the
 * person being charged them would be the one editing them. A customer could
 * set our callout to zero from the setup screen.
 */

const OURS = { calloutCents: 12500, afterHoursCents: 0, hourlyCents: 0, minimumHours: 0 };

test('their rates apply to their own rota', () => {
  const plan = routeEmergency(cfg(), { trade: 'plumbing', at: NIGHT, platformRates: OURS });
  assert.equal(plan.charges.chargedBy, 'account');
  assert.equal(plan.charges.total, 15000 + 5000, 'what their contractor charges them');
});

test('our rates apply when we are the ones answering', () => {
  const plan = routeEmergency(cfg(), {
    trade: 'plumbing', at: NIGHT, weAnswer: true, platformRates: OURS,
  });
  assert.equal(plan.charges.chargedBy, 'platform');
  assert.equal(plan.charges.total, 12500, 'ours, not the 15000 on their record');
});

test('a customer cannot zero our callout by editing their own record', () => {
  const zeroed = cfg({ extras: { calloutCents: 0, afterHoursCents: 0, hourlyCents: 0, minimumHours: 0 } });
  const plan = routeEmergency(zeroed, {
    trade: 'plumbing', at: NIGHT, weAnswer: true, platformRates: OURS,
  });
  assert.equal(plan.charges.total, 12500,
    'their zero must not reach a callout we attend');
});

test('our rates are used outright, never merged with theirs', () => {
  // Theirs carries an out-of-hours addition; ours does not. A merge would pick
  // theirs up and let a customer influence our pricing through a side field.
  const plan = routeEmergency(cfg(), {
    trade: 'plumbing', at: NIGHT, weAnswer: true, platformRates: OURS,
  });
  assert.equal(plan.charges.lines.length, 1);
  assert.equal(plan.charges.lines[0].label, 'Callout');
});

test('with no rates supplied, theirs still apply and nothing is free by accident', () => {
  const plan = routeEmergency(cfg(), { trade: 'plumbing', at: NIGHT, weAnswer: true });
  assert.equal(plan.charges.chargedBy, 'account',
    'we answer but nobody told us our own rates — falling back to theirs beats charging nothing');
  assert.equal(plan.charges.total, 20000);
});
