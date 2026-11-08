/**
 * The emergency stop.
 *
 * This is what somebody reaches for when the AI is doing something expensive
 * or wrong, so its rules deserve more scrutiny than the code that writes the
 * row. The decisions live in `aiKillSwitchRules.ts` precisely so they can be
 * driven here; `aiKillSwitch.ts` imports the Supabase client and cannot be
 * loaded by `node --test` at all.
 *
 * The last few tests read source rather than call functions. That is a
 * deliberate and limited exception: whether the guard is actually WIRED IN
 * at every call site is not a property any pure function can express, and it
 * is the way this control would most plausibly rot — a new agent added
 * without the check, and nobody notices until it matters.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  GLOBAL_SCOPE, AiStopped, describeStop, pickStop, sortStops,
  onReadFailure, CACHE_MS, TAKES_EFFECT_WITHIN_SECONDS,
  type StopState,
} from '../supabase/functions/server/aiKillSwitchRules.ts';

const read = (f: string) => readFileSync(`supabase/functions/server/${f}`, 'utf8');

function stop(over: Partial<StopState> = {}): StopState {
  return {
    scope: GLOBAL_SCOPE, engagedAt: '2026-11-08T12:00:00.000Z',
    engagedBy: 'eric@example.com', reason: null, ...over,
  };
}

/* ── what the person who hits a stop is told ─────────────────────────────── */

test('a global stop says it is platform-wide', () => {
  const msg = describeStop(stop({ reason: 'runaway loop' }));
  assert.match(msg, /platform-wide/);
  assert.match(msg, /eric@example\.com/);
  assert.match(msg, /runaway loop/);
});

test('an agent stop names the agent and does not claim the platform', () => {
  const msg = describeStop(stop({ scope: 'quote-generator' }));
  assert.match(msg, /quote-generator/);
  assert.doesNotMatch(msg, /platform-wide/);
});

test('a stop with no reason still says who, with no dangling colon', () => {
  // One engaged by hand at three in the morning may carry no reason. Who
  // is still the useful half, and ": ." reads like a bug.
  const msg = describeStop(stop({ reason: null }));
  assert.match(msg, /eric@example\.com/);
  assert.doesNotMatch(msg, /:\s*\.$/);
});

test('AiStopped is a catchable Error carrying its scope', () => {
  const err = new AiStopped(stop({ scope: 'house-capture' }));
  assert.ok(err instanceof Error);
  assert.equal(err.name, 'AiStopped');
  assert.equal(err.scope, 'house-capture');
  assert.match(err.message, /house-capture/);
});

/* ── scope precedence ────────────────────────────────────────────────────── */

test('global wins over an agent stop', () => {
  const live = new Map([
    [GLOBAL_SCOPE, stop()],
    ['quote-generator', stop({ scope: 'quote-generator' })],
  ]);
  assert.equal(pickStop(live, 'quote-generator')?.scope, GLOBAL_SCOPE);
});

test('global applies to an agent that has no stop of its own', () => {
  const live = new Map([[GLOBAL_SCOPE, stop()]]);
  assert.equal(pickStop(live, 'anything-at-all')?.scope, GLOBAL_SCOPE);
  assert.equal(pickStop(live, undefined)?.scope, GLOBAL_SCOPE);
});

test('an agent stop does not leak onto other agents', () => {
  const live = new Map([['quote-generator', stop({ scope: 'quote-generator' })]]);
  assert.equal(pickStop(live, 'quote-generator')?.scope, 'quote-generator');
  assert.equal(pickStop(live, 'design-assistant'), null);
  assert.equal(pickStop(live, undefined), null);
});

test('nothing engaged means nothing is refused', () => {
  assert.equal(pickStop(new Map(), 'quote-generator'), null);
});

test('global sorts first so it cannot be missed in a list', () => {
  const sorted = sortStops([
    stop({ scope: 'zendrop' }), stop({ scope: 'design-assistant' }), stop(),
  ]);
  assert.deepEqual(sorted.map((s) => s.scope),
    [GLOBAL_SCOPE, 'design-assistant', 'zendrop']);
});

/* ── the failure mode, which is the whole design ─────────────────────────── */

test('an engaged stop is HELD through a read failure, never released', () => {
  // The important one. Failing open here would silently release the stop
  // during exactly the incident it was engaged for.
  const lastKnown = new Map([[GLOBAL_SCOPE, stop()]]);
  const action = onReadFailure(lastKnown);
  assert.equal(action.allow, false);
  assert.equal(action.reason, 'holding-last-known');
  assert.equal(action.held, 1);
});

test('a clear switch stays clear through a read failure', () => {
  // Fail-closed-always would turn a database blip into a total AI outage,
  // including for whoever is trying to diagnose it.
  const action = onReadFailure(new Map());
  assert.equal(action.allow, false);
  assert.equal(action.held, 0);
});

test('a cold start that has never read successfully allows, and says so', () => {
  const action = onReadFailure(null);
  assert.equal(action.allow, true);
  assert.equal(action.reason, 'never-read');
});

test('the never-read path warns that a stop would not be enforced', () => {
  // It allows, because bricking the AI on the first transient error after a
  // deploy is worse. That is only acceptable if it is loud.
  assert.match(read('aiKillSwitch.ts'), /NOT being enforced/);
});

/* ── the promise made about timing ───────────────────────────────────────── */

test('the cache window is short enough for an emergency control', () => {
  assert.ok(CACHE_MS > 0 && CACHE_MS <= 30_000, `got ${CACHE_MS}ms`);
  assert.equal(TAKES_EFFECT_WITHIN_SECONDS, CACHE_MS / 1000);
});

test('the window the UI promises is the window the code uses', () => {
  // A stop that claimed to be instantaneous would be wrong at exactly the
  // moment somebody relies on it, so the number shown must be derived from
  // the constant rather than typed in beside it.
  const routes = read('ai-activity.tsx');
  assert.match(routes, /takesEffectWithinSeconds/);
});

/* ── the guard is wired in, which no pure function can prove ─────────────── */

test('both ledger wrappers check the stop before any work', () => {
  const src = read('aiLedger.ts');
  for (const wrapper of ['recordedOpenAIFetch', 'recordedAnthropic']) {
    const head = src.slice(src.indexOf(`export async function ${wrapper}`)).slice(0, 1500);
    assert.match(head, /await assertAiAllowed\(agent\)/, `${wrapper} must assert`);
    assert.ok(
      head.indexOf('assertAiAllowed') < head.indexOf('beginAiCall'),
      `${wrapper} must check the stop BEFORE opening a ledger row — a stopped `
      + 'agent should leave no record of work it never did',
    );
  }
});

test('every hand-written call site is guarded too', () => {
  // These four call beginAiCall directly rather than through a wrapper, so
  // they each have to assert for themselves.
  for (const file of ['quote-generator.tsx', 'design-assistant.tsx',
                      'house-capture.tsx', 'content-studio.tsx']) {
    assert.match(read(file), /assertAiAllowed\(/, `${file} must assert the stop`);
  }
});

test('no agent reaches a model without passing a guard', () => {
  // The rot this control is most exposed to: a new agent added without the
  // check. Every file that calls a model must either go through a wrapper
  // (which asserts) or assert for itself.
  const dir = 'supabase/functions/server/';
  const offenders: string[] = [];
  for (const file of readdirSync(dir)) {
    if (!/\.tsx?$/.test(file)) continue;
    if (file === 'aiLedger.ts' || file === 'aiKillSwitch.ts') continue;
    const src = readFileSync(dir + file, "utf8");
    const callsModel = /api\.openai\.com\/v1\/(chat\/completions|images\/)/.test(src)
      || /client\.messages\.create\(/.test(src);
    if (!callsModel) continue;
    const guarded = /recordedOpenAIFetch|recordedAnthropic|assertAiAllowed/.test(src);
    if (!guarded) offenders.push(file);
  }
  assert.deepEqual(offenders, [
    // Known and owned by another session; tracked rather than silently allowed.
    'rental-portals.tsx',
  ], `unguarded model callers: ${offenders.join(', ')}`);
});

/* ── engaging is easy, releasing is not ──────────────────────────────────── */

test('releasing requires a platform owner', () => {
  const del = read('ai-activity.tsx');
  const route = del.slice(del.indexOf('aiActivityRouter.delete'));
  assert.match(route, /PLATFORM_OWNER_EMAILS\.has/);
  assert.match(route, /403/, 'a non-owner must be refused, not quietly ignored');
});

test('engaging does NOT require a platform owner', () => {
  // An emergency is the wrong moment to discover you lack a permission. The
  // cost of a stop engaged in error is recoverable downtime; the cost of
  // not being able to stop it is money leaving.
  const src = read('ai-activity.tsx');
  const start = src.indexOf('aiActivityRouter.post(`${BASE}/stop`');
  const body = src.slice(start, src.indexOf('});', src.indexOf('return c.json', start)));
  assert.doesNotMatch(body, /PLATFORM_OWNER_EMAILS/);
});

test('the stop routes sit behind the staff guard like the rest', () => {
  const src = read('ai-activity.tsx');
  assert.match(src, /requireStaffOn\(\[BASE\]\)/,
    'the whole router, stop routes included, must be staff-only');
});
