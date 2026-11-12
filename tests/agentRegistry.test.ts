/**
 * The registry decides what Phoenix believes exists and what he may run.
 *
 * Two different kinds of mistake live here. Getting the reconciliation wrong
 * makes a working agent look dead or a dead one look fine — which is the exact
 * blindness this file was written to end, so it is asserted at its edges
 * rather than in the middle. Getting `delegable` wrong is worse: it is an
 * allowlist, and a route that commits something slipping into it would hand a
 * model the ability to act without anybody approving it. That one is asserted
 * as a property of the whole list, so a future entry cannot quietly join.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENTS, reconcile, findAgent, delegableAgents, type LedgerFact,
} from '../supabase/functions/server/agentRegistry.ts';

const row = (agent: string, outcome = 'ok', started_at = '2026-11-11T12:00:00Z'): LedgerFact =>
  ({ agent, outcome, started_at });

/* ── the allowlist, which is a security boundary ─────────────────────────── */

test('nothing that commits anything is delegable', () => {
  // The line is side effects, not risk. If one of these ever gains a
  // `delegable` block, a model can capture leads and raise quotes unapproved.
  for (const name of ['leads', 'quote-generator', 'ai-guide', 'phoenix-chat']) {
    assert.equal(findAgent(name)?.delegable, undefined, `${name} must not be delegable`);
  }
});

test('an unwired agent is never delegable, because nothing proved it works', () => {
  for (const a of AGENTS) {
    if (a.state === 'unwired') assert.equal(a.delegable, undefined, `${a.agent} is unwired`);
  }
});

test('every delegable agent carries a route and a worked example', () => {
  // The example is the difference between "this agent is broken" and "I sent
  // the wrong body" — a distinction that cost a day before it was written down.
  for (const a of delegableAgents()) {
    assert.ok(a.delegable!.route.startsWith('/'), `${a.agent} route`);
    assert.ok(a.delegable!.input.length > 0, `${a.agent} input`);
    assert.ok(Object.keys(a.delegable!.example).length > 0, `${a.agent} example`);
  }
});

test('agent names are unique, since the ledger joins on them', () => {
  const names = AGENTS.map((a) => a.agent);
  assert.equal(new Set(names).size, names.length);
});

test('findAgent refuses anything not declared, whatever shape it arrives in', () => {
  // The model supplies this string. It must never resolve to a route by accident.
  for (const bad of ['', '  ', 'nope', '../leads', null, undefined, 42, {}]) {
    assert.equal(findAgent(bad as unknown), null, `${JSON.stringify(bad)} must not resolve`);
  }
});

/* ── reconciliation ──────────────────────────────────────────────────────── */

test('an agent with no rows in the window is silent', () => {
  const r = reconcile([row('phoenix-chat')], 168);
  assert.ok(r.silent.includes('social-media'));
  assert.ok(!r.silent.includes('phoenix-chat'));
});

test('an unwired agent is reported as unwired, not as silent', () => {
  // Otherwise unfinished work reads as a fault and gets "fixed" by deletion.
  const r = reconcile([], 168);
  assert.ok(r.unwired.includes('bid-router'));
  assert.ok(!r.silent.includes('bid-router'));
});

test('a ledger label nobody declared surfaces as drift', () => {
  const r = reconcile([row('brand-new-thing')], 168);
  assert.deepEqual(r.undeclared, ['brand-new-thing']);
});

test('failures are counted apart from calls, so a failing agent is not "busy"', () => {
  // marketing-assets' real shape on 2026-11-11: called repeatedly, never once ok.
  const r = reconcile(
    [row('marketing-assets', 'refused'), row('marketing-assets', 'refused')], 168,
  );
  const ma = r.agents.find((a) => a.agent === 'marketing-assets')!;
  assert.equal(ma.calls, 2);
  assert.equal(ma.failures, 2);
  assert.ok(!r.silent.includes('marketing-assets'), 'it ran — it just failed');
});

test('lastUsed is the newest row, not the first one seen', () => {
  const r = reconcile([
    row('permit-ai', 'ok', '2026-11-09T10:00:00Z'),
    row('permit-ai', 'ok', '2026-11-11T10:00:00Z'),
    row('permit-ai', 'ok', '2026-11-10T10:00:00Z'),
  ], 168);
  assert.equal(r.agents.find((a) => a.agent === 'permit-ai')!.lastUsed, '2026-11-11T10:00:00Z');
});

test('rows with no agent name are ignored rather than counted as one', () => {
  const r = reconcile(
    [{ agent: '' }, { agent: '   ' }, { agent: undefined as unknown as string }], 168,
  );
  assert.deepEqual(r.undeclared, []);
  assert.equal(r.agents.every((a) => a.calls === 0), true);
});

test('a row with no timestamp still counts as a call', () => {
  // Silence is the judgement this drives; dropping a call for a missing
  // timestamp would report a working agent as dead.
  const r = reconcile([{ agent: 'permit-ai', outcome: 'ok' }], 168);
  const pa = r.agents.find((a) => a.agent === 'permit-ai')!;
  assert.equal(pa.calls, 1);
  assert.equal(pa.lastUsed, null);
  assert.ok(!r.silent.includes('permit-ai'));
});
