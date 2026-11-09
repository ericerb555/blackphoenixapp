/**
 * The rules standing between a language model and the company's mail sender.
 *
 * The queue's whole value is one sentence: the thing approved is the thing
 * executed, and only a person can approve it. Everything below is a way
 * that sentence could stop being true.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canApprove, canExecute, canTransition, approverIsIndependent,
  isExpired, expiryFrom, DEFAULT_TTL_MS,
  type ActionRequest, type ActionStatus,
} from '../supabase/functions/server/actionQueueRules.ts';

const STAFF = { email: 'office@example.com', isStaff: true, isOwner: false };
const OWNER = { email: 'eric@example.com', isStaff: true, isOwner: true };
const PORTAL = { email: 'customer@example.com', isStaff: false, isOwner: false };

const NOW = Date.parse('2026-11-09T12:00:00.000Z');
const inHours = (h: number) => new Date(NOW + h * 3600_000).toISOString();

function req(over: Partial<ActionRequest> = {}): ActionRequest {
  return {
    id: 'a1', agent: 'phoenix-chat', requestedBy: 'eric@example.com',
    action: 'mark_alerts_read', params: {}, summary: 'Mark 3 alerts read',
    risk: 'low', status: 'pending',
    createdAt: new Date(NOW).toISOString(), expiresAt: inHours(24),
    ...over,
  };
}

/* ── who may say yes ─────────────────────────────────────────────────────── */

test('a portal customer cannot approve anything', () => {
  for (const risk of ['low', 'medium', 'high'] as const) {
    assert.equal(canApprove(risk, PORTAL).allowed, false, risk);
  }
});

test('staff may approve low and medium', () => {
  assert.equal(canApprove('low', STAFF).allowed, true);
  assert.equal(canApprove('medium', STAFF).allowed, true);
});

test('high risk needs an owner, and says why', () => {
  const refused = canApprove('high', STAFF);
  assert.equal(refused.allowed, false);
  assert.match(refused.reason!, /owner/i);
  assert.equal(canApprove('high', OWNER).allowed, true);
});

/* ── the approver has to be a person ─────────────────────────────────────── */

test('an agent name cannot stand in for an approver', () => {
  // Guards the specific bug of a route passing its own identity through.
  assert.equal(approverIsIndependent(req(), 'phoenix-chat'), false);
});

test('an empty or non-email approver is refused', () => {
  for (const who of ['', '   ', 'system', 'admin']) {
    assert.equal(approverIsIndependent(req(), who), false, JSON.stringify(who));
  }
  assert.equal(approverIsIndependent(req(), 'eric@example.com'), true);
});

/* ── when it may run ─────────────────────────────────────────────────────── */

test('a pending proposal cannot execute', () => {
  const v = canExecute(req({ status: 'pending' }), NOW);
  assert.equal(v.allowed, false);
  assert.match(v.reason!, /not been approved/);
});

test('an approved proposal executes', () => {
  assert.equal(canExecute(req({ status: 'approved' }), NOW).allowed, true);
});

test('nothing runs twice', () => {
  // The expensive mistake: an approval replayed and an email sent again.
  const v = canExecute(req({ status: 'executed' }), NOW);
  assert.equal(v.allowed, false);
  assert.match(v.reason!, /already run/);
});

test('a failed action is not retried blind', () => {
  const v = canExecute(req({ status: 'failed' }), NOW);
  assert.equal(v.allowed, false);
  assert.match(v.reason!, /propose it again/i);
});

test('an approval that has gone stale will not execute', () => {
  // Approved yesterday, expired since. The facts behind it may have moved —
  // two of those invoices may have been paid.
  const v = canExecute(req({ status: 'approved', expiresAt: inHours(-1) }), NOW);
  assert.equal(v.allowed, false);
  assert.match(v.reason!, /expired/);
});

test('an unreadable expiry is treated as expired, not as forever', () => {
  assert.equal(isExpired({ expiresAt: 'not a date' }, NOW), true);
});

test('the default life of a proposal is a day', () => {
  assert.equal(DEFAULT_TTL_MS, 24 * 60 * 60 * 1000);
  assert.equal(expiryFrom(NOW), inHours(24));
});

/* ── the state machine ───────────────────────────────────────────────────── */

test('executed and rejected are terminal', () => {
  for (const from of ['executed', 'rejected', 'failed', 'expired'] as ActionStatus[]) {
    for (const to of ['approved', 'executed', 'pending'] as ActionStatus[]) {
      assert.equal(canTransition(from, to), false, `${from} -> ${to}`);
    }
  }
});

test('the only way to executed is through approved', () => {
  assert.equal(canTransition('pending', 'executed'), false);
  assert.equal(canTransition('approved', 'executed'), true);
});

test('a pending proposal can be approved, rejected or expire', () => {
  assert.equal(canTransition('pending', 'approved'), true);
  assert.equal(canTransition('pending', 'rejected'), true);
  assert.equal(canTransition('pending', 'expired'), true);
});

/* ── properties that live in other files but belong to this guarantee ────── */

test('the database refuses to let params change after proposal', () => {
  // Without this the approval means nothing: approve "email three leads",
  // execute something else, and the audit shows a clean approval either way.
  const sql = readFileSync('supabase/migrations/20261109020000_ai_action_request.sql', 'utf8');
  assert.match(sql, /create trigger ai_action_request_freeze_trg/);
  assert.match(sql, /new\.params is distinct from old\.params/);
  assert.match(sql, /new\.action is distinct from old\.action/);
  assert.match(sql, /new\.summary is distinct from old\.summary/);
});

test('execution re-reads the row rather than trusting the caller', () => {
  const src = readFileSync('supabase/functions/server/actionQueue.ts', 'utf8');
  const fn = src.slice(src.indexOf('export async function approveAndRun'));
  assert.match(fn, /const fresh = await getAction\(id\)/,
    'the params that run must come back out of the database');
  assert.ok(fn.indexOf('const fresh') < fn.indexOf('.run('),
    'the re-read must happen before the handler is called');
});

test('risk comes from the registry, never from the proposal', () => {
  const src = readFileSync('supabase/functions/server/actionQueue.ts', 'utf8');
  assert.match(src, /risk: riskOf\(input\.action\)/,
    'a proposal that set its own risk could route around the owner gate');
});

test('an unknown action is never treated as low risk', () => {
  const src = readFileSync('supabase/functions/server/aiActions.ts', 'utf8');
  assert.match(src, /ACTIONS\[name\]\?\.risk \?\? 'high'/);
});
