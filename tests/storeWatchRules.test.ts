/**
 * The watchman, which is the part that was missing.
 *
 * A paid order failed to reach its supplier, the reason was written to a field
 * nobody opens, and it sat for eight weeks. Nothing was looking for the shape
 * of that problem. These tests are that shape, written down.
 *
 * The two failures to guard against are opposite and both fatal: missing a real
 * one, and crying about things that are fine until somebody mutes the alarm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findStuck, clockVerdict, orderIsPaid, WATCH_DEFAULTS,
} from '../supabase/functions/server/storeWatchRules.ts';

const NOW = new Date('2026-10-03T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

const PAID = {
  id: 'BP-1',
  payment_status: 'paid',
  amount_total: 42.5,
  items: [{ id: 'cj_X', sku: 'X', name: 'Thing', qty: 1 }],
  created_at: hoursAgo(1),
  fulfillment_status: 'pending',
};

const kinds = (fs: ReturnType<typeof findStuck>) => fs.map((f) => f.kind);

// ── What counts as paid ─────────────────────────────────────────────────────

test('every spelling of paid is recognised', () => {
  assert.equal(orderIsPaid({ payment_status: 'paid' }), true);
  assert.equal(orderIsPaid({ payment_status: 'gift_card_paid' }), true);
  assert.equal(orderIsPaid({ status: 'paid' }), true);
  assert.equal(orderIsPaid({ payment_status: 'pending' }), false);
  assert.equal(orderIsPaid({}), false);
});

// ── Not crying wolf ─────────────────────────────────────────────────────────

test('a fresh paid order is not a problem yet', () => {
  assert.deepEqual(findStuck({ orders: [PAID], asks: [], now: NOW }), []);
});

test('a test order is never reported', () => {
  // The owner pays with live Stripe to exercise the checkout. A watchman that
  // alarms on his own test payments is one that gets muted, and a muted
  // watchman is how the original eight-week silence happened.
  const old = { ...PAID, created_at: daysAgo(30), is_test: true };
  assert.deepEqual(findStuck({ orders: [old], asks: [], now: NOW }), []);
});

test('an unpaid order is not reported, however old', () => {
  const unpaid = { ...PAID, payment_status: 'pending', created_at: daysAgo(30) };
  assert.deepEqual(findStuck({ orders: [unpaid], asks: [], now: NOW }), []);
});

test('a line with no SKU is not reported as unforwarded', () => {
  // There is nothing a supplier could be asked for, so "not forwarded" is the
  // correct state rather than a fault. This is what the seeded demo orders
  // looked like.
  const noSku = { ...PAID, created_at: daysAgo(3), items: [{ name: 'Pro Tool Kit', qty: 1 }] };
  assert.deepEqual(kinds(findStuck({ orders: [noSku], asks: [], now: NOW })), []);
});

// ── Money taken, nothing happening ──────────────────────────────────────────

test('paid and unforwarded past the threshold is urgent', () => {
  const stuck = { ...PAID, created_at: hoursAgo(WATCH_DEFAULTS.notForwardedHours + 1) };
  const found = findStuck({ orders: [stuck], asks: [], now: NOW });
  assert.deepEqual(kinds(found), ['paid-not-forwarded']);
  assert.equal(found[0].severity, 'urgent');
  assert.equal(found[0].amount, 42.5);
  assert.equal(found[0].key, 'paid-not-forwarded:BP-1');
});

test('the threshold is a boundary, not a suggestion', () => {
  const just = { ...PAID, created_at: hoursAgo(WATCH_DEFAULTS.notForwardedHours - 0.1) };
  assert.deepEqual(kinds(findStuck({ orders: [just], asks: [], now: NOW })), []);
});

test('an order that never resolves itself is urgent', () => {
  const manual = { ...PAID, fulfillment_status: 'manual_required', created_at: daysAgo(2) };
  const found = findStuck({ orders: [manual], asks: [], now: NOW });
  assert.deepEqual(kinds(found), ['manual-required']);
  assert.equal(found[0].severity, 'urgent');
});

test('paying for a product with no file behind it is urgent', () => {
  const order = { ...PAID, items: [{ id: 'eb-landlord-ops', qty: 1 }], created_at: hoursAgo(1) };
  const found = findStuck({
    orders: [order], asks: [], now: NOW,
    undeliverableProductIds: ['eb-landlord-ops'],
  });
  assert.deepEqual(kinds(found), ['sold-undeliverable']);
  assert.equal(found[0].severity, 'urgent');
});

test('a deliverable product raises nothing', () => {
  const order = { ...PAID, items: [{ id: 'eb-landlord-ops', qty: 1 }], created_at: hoursAgo(1) };
  assert.deepEqual(kinds(findStuck({ orders: [order], asks: [], now: NOW, undeliverableProductIds: [] })), []);
});

// ── We know something the customer does not ─────────────────────────────────

test('a tracking number the customer was never told about is reported', () => {
  const order = {
    ...PAID, fulfillment_status: 'forwarded_to_doba',
    tracking_number: 'LP123', tracking_checked_at: hoursAgo(5),
  };
  assert.deepEqual(kinds(findStuck({ orders: [order], asks: [], now: NOW })), ['shipped-not-told']);
});

test('once the customer has been told, it stops being reported', () => {
  const order = {
    ...PAID, fulfillment_status: 'forwarded_to_doba',
    tracking_number: 'LP123', tracking_checked_at: hoursAgo(5), tracking_notified_at: hoursAgo(4),
  };
  assert.deepEqual(kinds(findStuck({ orders: [order], asks: [], now: NOW })), []);
});

test('delivered and never mentioned is reported', () => {
  const order = {
    ...PAID, fulfillment_status: 'delivered',
    tracking_number: 'LP1', tracking_notified_at: daysAgo(3), delivered_at: hoursAgo(6),
  };
  assert.deepEqual(kinds(findStuck({ orders: [order], asks: [], now: NOW })), ['delivered-not-told']);
});

test('a supplier holding an order silently for days is reported', () => {
  const order = {
    ...PAID, fulfillment_status: 'forwarded_to_doba',
    fulfillment_forwarded_at: daysAgo(WATCH_DEFAULTS.noTrackingDays + 1),
  };
  assert.deepEqual(kinds(findStuck({ orders: [order], asks: [], now: NOW })), ['forwarded-no-tracking']);
});

test('a supplier holding an order for a day is not', () => {
  const order = { ...PAID, fulfillment_status: 'forwarded_to_doba', fulfillment_forwarded_at: daysAgo(1) };
  assert.deepEqual(kinds(findStuck({ orders: [order], asks: [], now: NOW })), []);
});

// ── A queue nobody works ────────────────────────────────────────────────────

test('an unanswered question becomes a finding of its own', () => {
  // A queue nobody works is the same failure as a field nobody reads, one step
  // further along.
  const ask = { id: 'catalogue--policy', status: 'open', question: 'What margin should the store protect?', raisedAt: daysAgo(WATCH_DEFAULTS.questionIgnoredDays + 1) };
  const found = findStuck({ orders: [], asks: [ask], now: NOW });
  assert.deepEqual(kinds(found), ['question-ignored']);
  assert.match(found[0].summary, /What margin/);
});

test('a recent question, and an answered one, are left alone', () => {
  const fresh = { id: 'a', status: 'open', question: 'q', raisedAt: hoursAgo(2) };
  const answered = { id: 'b', status: 'answered', question: 'q', raisedAt: daysAgo(40) };
  assert.deepEqual(findStuck({ orders: [], asks: [fresh, answered], now: NOW }), []);
});

// ── Ordering ────────────────────────────────────────────────────────────────

test('urgent first, then oldest — the order to work through them in', () => {
  const urgent = { ...PAID, id: 'BP-URGENT', created_at: hoursAgo(6) };
  const olderButCalmer = {
    ...PAID, id: 'BP-CALM', fulfillment_status: 'forwarded_to_doba',
    fulfillment_forwarded_at: daysAgo(20),
  };
  const found = findStuck({ orders: [olderButCalmer, urgent], asks: [], now: NOW });
  assert.equal(found[0].severity, 'urgent');
  assert.equal(found[0].subject.id, 'BP-URGENT');
});

test('one order can be wrong in more than one way', () => {
  const order = {
    ...PAID, id: 'BP-2', fulfillment_status: 'manual_required', created_at: daysAgo(10),
    tracking_number: 'LP9', tracking_checked_at: daysAgo(1),
  };
  const found = kinds(findStuck({ orders: [order], asks: [], now: NOW }));
  assert.ok(found.includes('manual-required'));
  assert.ok(found.includes('shipped-not-told'));
});

// ── The clock itself ────────────────────────────────────────────────────────

test('never armed is not the same as stopped', () => {
  assert.equal(clockVerdict(null, NOW).verdict, 'never-armed');
  assert.equal(clockVerdict('', NOW).verdict, 'never-armed');
  assert.equal(clockVerdict('nonsense', NOW).verdict, 'never-armed');
});

test('a beating clock is alive, a silent one is stopped', () => {
  assert.equal(clockVerdict(hoursAgo(0.2), NOW).verdict, 'alive');
  assert.equal(clockVerdict(hoursAgo(0.9), NOW).verdict, 'alive');
  assert.equal(clockVerdict(hoursAgo(2), NOW).verdict, 'stopped');
  assert.equal(clockVerdict(daysAgo(3), NOW).verdict, 'stopped');
});

test('the silence threshold leaves room for missed ticks', () => {
  // Fifteen-minute schedule. One missed tick must not raise an alarm, or the
  // alarm is the thing that gets ignored.
  assert.equal(clockVerdict(hoursAgo(0.5), NOW).verdict, 'alive');
  assert.equal(clockVerdict(hoursAgo(0.5), NOW, 20).verdict, 'stopped');
});
