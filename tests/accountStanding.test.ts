/**
 * Whether somebody can open their portal.
 *
 * This is the most disruptive answer the server gives, and the expensive
 * mistakes are both silent: freezing a customer who has paid, and failing to
 * freeze one who has not. Every branch is asserted here because the alternative
 * is finding out from a locked-out customer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountStanding, mayDeactivate, GRACE_DAYS,
} from '../supabase/functions/server/accountStanding.ts';

const DAY = 24 * 60 * 60 * 1000;

/**
 * One fixed clock for the whole file.
 *
 * Reading the wall clock twice makes "exactly fifteen days ago" land a few
 * milliseconds short of fifteen days, and the boundary case then passes or
 * fails depending on how fast the machine is. The dates here are derived from
 * NOW so the boundary is exact.
 */
const NOW = new Date('2026-09-26T12:00:00.000Z');
const at = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY).toISOString();

/* ── the ordinary case ───────────────────────────────────────────────────── */

test('an account in good standing is not troubled', () => {
  const s = accountStanding({ grant: { lastSubscriptionStatus: 'active' }, role: 'vendor', now: NOW });
  assert.equal(s.state, 'ok');
  assert.equal(s.blocked, false);
});

test('a trialing subscription is good standing, not a debt', () => {
  const s = accountStanding({ grant: { lastSubscriptionStatus: 'trialing' }, role: 'vendor', now: NOW });
  assert.equal(s.state, 'ok');
});

test('an account that has never subscribed is not frozen', () => {
  assert.equal(accountStanding({ role: 'customer', now: NOW }).state, 'ok',
    'never paying is not the same as owing — a free account keeps its portal');
});

/* ── the grace period ────────────────────────────────────────────────────── */

test('a failed payment warns rather than freezing on day one', () => {
  const s = accountStanding({
    grant: { lastSubscriptionStatus: 'past_due', pastDueSince: at(1) },
    role: 'vendor', now: NOW,
  });
  assert.equal(s.state, 'warning');
  assert.equal(s.blocked, false, 'Stripe is still retrying; a card that expired must not cost them the portal');
  assert.match(s.reason, /\d+ days/);
});

test('day fourteen still warns', () => {
  const s = accountStanding({
    grant: { lastSubscriptionStatus: 'past_due', pastDueSince: at(GRACE_DAYS - 1) },
    role: 'vendor', now: NOW,
  });
  assert.equal(s.state, 'warning');
  assert.equal(s.blocked, false);
});

test('day fifteen freezes', () => {
  const s = accountStanding({
    grant: { lastSubscriptionStatus: 'past_due', pastDueSince: at(GRACE_DAYS) },
    role: 'vendor', now: NOW,
  });
  assert.equal(s.state, 'frozen');
  assert.equal(s.blocked, true);
  assert.equal(s.daysPastDue, GRACE_DAYS);
});

test('the grace period is fifteen days, because that was the decision', () => {
  assert.equal(GRACE_DAYS, 15);
});

test('an unpaid subscription counts the same as past due', () => {
  const s = accountStanding({
    grant: { lastSubscriptionStatus: 'unpaid', pastDueSince: at(40) },
    role: 'subcontractor', now: NOW,
  });
  assert.equal(s.state, 'frozen');
});

test('a maintenance plan in arrears freezes too, not only a subscription', () => {
  const s = accountStanding({
    planBilling: { status: 'past_due', lastFailureAt: at(30) },
    role: 'landlord', now: NOW,
  });
  assert.equal(s.state, 'frozen');
});

test('a debt with no start date gets the full grace from now, not a freeze', () => {
  const s = accountStanding({
    grant: { lastSubscriptionStatus: 'past_due' },
    role: 'vendor', now: NOW,
  });
  assert.equal(s.state, 'warning',
    'we know money is owed but not for how long — the generous reading is the right one');
});

/* ── who is never frozen ─────────────────────────────────────────────────── */

for (const role of ['owner', 'platform_owner', 'admin', 'master_admin', 'employee', 'staff']) {
  test(`a ${role} is never frozen over a bill`, () => {
    const s = accountStanding({
      grant: { lastSubscriptionStatus: 'past_due', pastDueSince: at(400) },
      role, now: NOW,
    });
    assert.equal(s.state, 'ok');
    assert.equal(s.blocked, false);
  });
}

/* ── deactivation ────────────────────────────────────────────────────────── */

test('a deactivated account is blocked regardless of payment', () => {
  const s = accountStanding({
    grant: { lastSubscriptionStatus: 'active' },
    deactivation: { active: true, reason: 'Left the company' },
    role: 'vendor', now: NOW,
  });
  assert.equal(s.state, 'deactivated');
  assert.equal(s.blocked, true);
  assert.match(s.reason, /Left the company/);
});

test('deactivation reaches staff, who are exempt from freezing but not from this', () => {
  const s = accountStanding({
    deactivation: { active: true },
    role: 'employee', now: NOW,
  });
  assert.equal(s.state, 'deactivated',
    'an owner may deactivate anyone; the staff exemption is about money, not about people');
});

test('a lifted deactivation stops blocking', () => {
  const s = accountStanding({ deactivation: { active: false }, role: 'vendor', now: NOW });
  assert.equal(s.state, 'ok');
});

/* ── who may deactivate whom ─────────────────────────────────────────────── */

test('an owner may deactivate anyone', () => {
  for (const targetRole of ['vendor', 'employee', 'admin', 'subcontractor', 'investor']) {
    assert.ok(
      mayDeactivate({ role: 'owner', email: 'o@x.com' }, { role: targetRole, email: 't@x.com' }).allowed,
      `owner should be able to deactivate ${targetRole}`,
    );
  }
});

test('an administrator may deactivate employees', () => {
  assert.ok(mayDeactivate({ role: 'admin', email: 'a@x.com' }, { role: 'employee', email: 'e@x.com' }).allowed);
});

test('an administrator may NOT deactivate an owner, another admin, or a paying account', () => {
  for (const targetRole of ['owner', 'platform_owner', 'admin', 'vendor', 'landlord']) {
    const verdict = mayDeactivate({ role: 'admin', email: 'a@x.com' }, { role: targetRole, email: 't@x.com' });
    assert.equal(verdict.allowed, false, `admin must not deactivate ${targetRole}`);
    assert.ok(verdict.reason, 'a refusal has to say why');
  }
});

test('nobody may deactivate themselves', () => {
  const verdict = mayDeactivate({ role: 'owner', email: 'o@x.com' }, { role: 'owner', email: 'O@X.com' });
  assert.equal(verdict.allowed, false,
    'leaving nobody able to undo it is not a state worth allowing — and the check is case-insensitive');
});

test('a portal account cannot deactivate anybody', () => {
  for (const actorRole of ['vendor', 'customer', 'employee', 'subcontractor', '']) {
    assert.equal(
      mayDeactivate({ role: actorRole, email: 'v@x.com' }, { role: 'employee', email: 'e@x.com' }).allowed,
      false,
      `${actorRole || 'no role'} must not be able to deactivate anyone`,
    );
  }
});

test('an unidentifiable actor or target is refused', () => {
  assert.equal(mayDeactivate({ role: 'owner', email: '' }, { role: 'vendor', email: 't@x.com' }).allowed, false);
  assert.equal(mayDeactivate({ role: 'owner', email: 'o@x.com' }, { role: 'vendor', email: '' }).allowed, false);
});
