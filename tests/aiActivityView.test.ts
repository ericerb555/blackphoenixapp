/**
 * What the AI diagnostics screen is allowed to claim.
 *
 * This page spent its whole life rendering hardcoded arrays: five invented
 * activity entries, eight invented alerts, a supervisor that reported saving
 * $1,247 a week. Wiring it to the ledger only helps if the mapping between
 * "what the ledger counted" and "what the screen says" stays honest, and that
 * mapping is the thing a future change is most likely to quietly soften.
 *
 * So the rules that could start lying again are pinned here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activityStatus, activityType, agentLabel, toActivity,
  agentStatus, errorRatePercent, formatCost, toSystem, deriveAlerts,
  type AgentRollup, type LedgerCall, type ActivitySummary,
} from '../src/app/lib/aiActivity.ts';

function rollup(over: Partial<AgentRollup> = {}): AgentRollup {
  return {
    agent: 'quote-generator', lastSeen: '2026-11-08T12:00:00.000Z',
    total: 0, ok: 0, refused: 0, errors: 0, running: 0, abandoned: 0,
    estimatedCostCents: 0, tokensIn: 0, tokensOut: 0,
    actionsTaken: 0, medianDurationMs: null,
    ...over,
  };
}

function call(over: Partial<LedgerCall> = {}): LedgerCall {
  return {
    id: 'c1', started_at: '2026-11-08T12:00:00.000Z',
    agent: 'quote-generator', outcome: 'ok', ...over,
  };
}

/* ── an agent nobody used is not a healthy agent ─────────────────────────── */

test('no calls is OFFLINE, not healthy', () => {
  // The single most important rule here. A green tick for a capability that
  // has not run is exactly the reassurance this page used to manufacture.
  assert.equal(agentStatus(rollup({ total: 0 })), 'offline');
});

test('all succeeding is healthy', () => {
  assert.equal(agentStatus(rollup({ total: 10, ok: 10 })), 'healthy');
});

test('a fifth failing is degraded, half failing is critical', () => {
  assert.equal(agentStatus(rollup({ total: 10, ok: 8, errors: 2 })), 'degraded');
  assert.equal(agentStatus(rollup({ total: 10, ok: 5, errors: 5 })), 'critical');
});

test('one abandoned call is critical regardless of how well the rest went', () => {
  // A handler that died without recording an outcome outranks a good average.
  assert.equal(agentStatus(rollup({ total: 100, ok: 99, abandoned: 1 })), 'critical');
});

test('an error rate on zero calls is zero, not NaN', () => {
  assert.equal(errorRatePercent(rollup({ total: 0 })), 0);
});

/* ── the system card ─────────────────────────────────────────────────────── */

test('a system carries counted figures and nothing invented', () => {
  const s = toSystem(rollup({
    total: 20, ok: 18, errors: 2, tokensIn: 1000, tokensOut: 500,
    medianDurationMs: 420, estimatedCostCents: 250,
  }));
  assert.equal(s.apiCalls, 20);
  assert.equal(s.uptime, 90);        // success rate, labelled as such in the UI
  assert.equal(s.errorRate, 10);
  assert.equal(s.tokensUsed, 1500);
  assert.equal(s.responseTime, 420);
  assert.equal(s.cost, 2.5);
});

test('fields with no source stay empty rather than plausible', () => {
  // The mock gave every agent a version, an available upgrade and a feature
  // list. An agent is a function; it has none of those.
  const s = toSystem(rollup({ total: 5, ok: 5 }));
  assert.deepEqual(s.features, []);
  assert.equal(s.version, '');
});

test('a missing median duration is zero, not null, so the UI can render it', () => {
  assert.equal(toSystem(rollup({ total: 1, ok: 1 })).responseTime, 0);
});

test('an unknown agent still gets a card', () => {
  const s = toSystem(rollup({ agent: 'some-new-thing', total: 1, ok: 1 }));
  assert.equal(s.name, 'Some New Thing');
  assert.equal(s.category, 'automation');
});

/* ── activity rows ───────────────────────────────────────────────────────── */

test('an abandoned call reads as a failure, never as pending', () => {
  assert.equal(activityStatus('abandoned'), 'failure');
  assert.equal(activityType('abandoned'), 'error');
});

test('a refusal is an alert, not an error', () => {
  // Hitting a spend ceiling is the limit working, not the agent breaking.
  assert.equal(activityType('refused'), 'alert');
  assert.equal(activityStatus('refused'), 'failure');
});

test('details never falls back to something cheerful', () => {
  const d = toActivity(call({ outcome: 'error', summary: null, error: null, state: 'error' })).details;
  assert.match(d, /error/i);
  assert.doesNotMatch(d, /success|completed|ok\b/i);
});

test('the caller summary wins, then the error, then the bare state', () => {
  assert.equal(toActivity(call({ summary: 'drafted 14 lines' })).details, 'drafted 14 lines');
  assert.equal(toActivity(call({ error: 'rate limited', state: 'error' })).details, 'rate limited');
  assert.equal(
    toActivity(call({ state: 'abandoned' })).details,
    'Started and never finished',
  );
});

test('an unattributed call does not invent a user', () => {
  assert.equal(toActivity(call({ actor_email: null })).user, undefined);
});

test('an agent with no name is labelled, not blank', () => {
  assert.equal(agentLabel(''), 'Unattributed');
});

/* ── derived alerts ──────────────────────────────────────────────────────── */

function summary(agents: AgentRollup[]): ActivitySummary {
  return {
    windowHours: 24, truncated: false,
    summary: rollup(), agents, concerns: [], costIsEstimate: true,
  };
}

test('a healthy window raises no alerts', () => {
  assert.deepEqual(deriveAlerts(summary([rollup({ total: 50, ok: 50 })])), []);
});

test('abandoned work is always an alert', () => {
  const a = deriveAlerts(summary([rollup({ total: 10, ok: 9, abandoned: 1 })]));
  assert.equal(a.length, 1);
  assert.equal(a[0].severity, 'critical');
  assert.match(a[0].title, /never finished/);
});

test('a single failure on a quiet agent is not an alert', () => {
  // Without the floor, one error out of one call is a screaming dashboard.
  assert.deepEqual(deriveAlerts(summary([rollup({ total: 1, errors: 1 })])), []);
});

test('a fifth failing is a warning, half failing is critical', () => {
  const warn = deriveAlerts(summary([rollup({ total: 10, ok: 8, errors: 2 })]));
  assert.equal(warn[0].severity, 'warning');
  const crit = deriveAlerts(summary([rollup({ total: 10, ok: 5, errors: 5 })]));
  assert.equal(crit[0].severity, 'critical');
});

test('nothing derived ever claims it can resolve itself', () => {
  // The mock set autoResolvable on half its alerts. Nothing here can act.
  const all = deriveAlerts(summary([
    rollup({ agent: 'a', total: 10, ok: 5, errors: 5 }),
    rollup({ agent: 'b', total: 10, ok: 9, abandoned: 1 }),
  ]));
  assert.equal(all.length, 2);
  for (const alert of all) {
    assert.equal(alert.autoResolvable, false);
    assert.equal(alert.resolved, false);
  }
});

/* ── cost is an estimate, and zero means unknown ─────────────────────────── */

test('cost formats small amounts without rounding them to nothing', () => {
  assert.equal(formatCost(0), '$0.00');
  assert.equal(formatCost(0.4), '<$0.01');
  assert.equal(formatCost(250), '$2.50');
});
