/**
 * An advertiser trying to spend more money has to reach a human.
 *
 * Three C1 handlers — "the whole handler is a message, nothing happens" — sat
 * on the one path in the app where a customer asks to pay MORE:
 *
 *   "Switch to this"       toast.info(`Your account manager will move you to
 *                          ${p.name}. Nothing has been charged.`)
 *   "Upgrade to Premium"   toast.info('View subscription plans to upgrade')   ×2
 *
 * The first is the worst thing of its kind in the bucket: a sentence about a
 * person who was never told. No record, no alert, no email. An advertiser
 * clicked it, read that it was in hand, and waited. The only person who could
 * notice is the customer waiting to be upgraded, and they have no way to.
 *
 * The other two are advice printed by a button, with the tab they describe one
 * click away and no indication of which one it meant.
 *
 * Asserted against the source because there is no server change to exercise:
 * `POST /plan-quote-request` already stored the request and notified staff
 * (verified live — `signup` notifications are logged as sent as recently as
 * 2026-11-21T02:15Z). The bug was that nothing called it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const TABS = 'src/app/components/portals/AdvertiserTabs.tsx';
const ADVERTISER = 'src/app/components/portals/AdvertiserPortalView.tsx';
const VENDOR = 'src/app/components/portals/VendorPortalView.tsx';
const tabs = readFileSync(TABS, 'utf8');
const advertiser = readFileSync(ADVERTISER, 'utf8');
const vendor = readFileSync(VENDOR, 'utf8');

/** `requestPlanSwitch`, from its declaration to the end of the function. */
function requestPlanSwitch(): string {
  const start = tabs.indexOf('const requestPlanSwitch =');
  assert.ok(start >= 0, `${TABS} no longer declares requestPlanSwitch`);
  const after = tabs.indexOf('\n  };', start);
  return tabs.slice(start, after === -1 ? start + 4000 : after);
}

test('NOBODY IS TOLD AN ACCOUNT MANAGER WILL ACT unless one is actually told', () => {
  // The phrase survives in the comment that explains why it went, so what is
  // asserted is that no line of CODE still says it.
  const live = tabs.split('\n').filter((line) =>
    line.includes('Your account manager will move you to') && !/^\s*(\*|\/\/|\/\*)/.test(line));
  assert.deepEqual(live, [],
    'the promise about a person who was never notified must not be in code');
});

test('the switch reaches the route that records it and notifies staff', () => {
  const body = requestPlanSwitch();
  assert.match(body, /\/plan-quote-request/, 'it must post to the route that already does this job');
  assert.match(body, /method: 'POST'/);
  assert.match(body, /audience: 'advertiser'/, 'the portal has to be named, or the lead is unroutable');
  assert.match(body, /addOnId: `advertiser-plan:\$\{plan\.tier\}`/,
    'which plan they want is the whole content of the request');
});

test('the note says where they are coming FROM and what it costs', () => {
  // Whoever picks this up needs the move, not just the destination.
  const body = requestPlanSwitch();
  assert.match(body, /note:/);
  assert.match(body, /plan\.name/);
  assert.match(body, /current\?\.name \|\| subscriptionTier/, 'the plan they are on now');
  assert.match(body, /plan\.regularPrice/, 'and the price of the one they want');
});

test('A 4XX IS NOT READ AS SUCCESS, and neither is { success: false }', () => {
  // fetch does not reject on 4xx, and this route answers 200 with
  // `{ success: false }` on a handled error — so both have to be checked, or
  // the fix reproduces the bug it is fixing.
  const body = requestPlanSwitch();
  assert.match(body, /!res\.ok \|\| json\?\.success === false/);
  assert.match(body, /toast\.error/, 'a failure must be said out loud');
});

test('a signed-out session is refused before the request, not after', () => {
  const body = requestPlanSwitch();
  assert.match(body, /if \(!session\?\.access_token\)/);
  assert.ok(
    body.indexOf('access_token') < body.indexOf('fetch('),
    'check the session before posting',
  );
});

test('the billing tab is actually given the session it posts with', () => {
  // The tab did not destructure `session` at all — it had nothing to post
  // with, which is part of why it never posted.
  assert.match(
    tabs,
    /export function AdvertiserBillingTab\(\{ session,/,
    'AdvertiserBillingTab must take the session',
  );
});

test('the button cannot be double-sent, and says what it did', () => {
  assert.match(tabs, /disabled=\{isCurrent \|\| switching === p\.tier \|\| asked\[p\.tier\]\}/);
  assert.match(tabs, /Asked — we will be in touch/, 'the asked state has to be visible');
  assert.match(tabs, /Sending…/);
});

test('BOTH "Upgrade to Premium" BUTTONS OPEN THE PLANS TAB', () => {
  // They used to print advice. `plan-builder` is the tab labelled
  // "Plans & Add-ons" in both portals.
  for (const [name, src] of [['advertiser', advertiser], ['vendor', vendor]] as const) {
    assert.ok(
      !src.includes("toast.info('View subscription plans to upgrade')"),
      `${name}: the advice toast must be gone`,
    );
    assert.match(src, /onClick=\{\(\) => setActiveTab\('plan-builder'\)\}/,
      `${name}: Upgrade to Premium must open the plans tab`);
  }
});

test('and that tab exists in both portals, by that id', () => {
  // A navigation to a tab id that is not in the list would render nothing,
  // which is bucket B's failure rather than C1's.
  for (const [name, src] of [['advertiser', advertiser], ['vendor', vendor]] as const) {
    assert.match(src, /\{ id: 'plan-builder', label: 'Plans & Add-ons'/, `${name}: tab must be listed`);
    assert.match(src, /activeTab === 'plan-builder'/, `${name}: and must render something`);
  }
});
