/**
 * The AI emergency attendant, pinned.
 *
 * WHY THESE ASSERTIONS
 *
 * Every one of them is a failure nobody would see on a screen.
 *
 * A gas leak read as a flood sends a plumber into a building people should be
 * walking out of. A conversation with no cap keeps a tenant answering questions
 * while the water rises. A unit question that cannot be skipped asks itself
 * until the cap is spent and the address never gets asked. A work request
 * built with the caller's email instead of the account's routes the emergency
 * to a rota that does not exist, which looks identical to one that worked.
 *
 * None of this needs a telephone to prove, so none of it is allowed to.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyEmergency, startSession, applySpeech, nextPrompt, readyToDispatch,
  workRequestFrom, greetingFor, safetyWarningFor, summaryOf,
  ATTENDANT_DEFAULTS,
  type AttendantSettings,
} from '../supabase/functions/server/onCallAttendant.ts';

const settings = (over: Partial<AttendantSettings> = {}): AttendantSettings => ({
  ...ATTENDANT_DEFAULTS, enabled: true, ...over,
});

const session = () => startSession({
  id: 'CA1', accountEmail: 'HOA@maple.test', dialled: '+16035550100', from: '+16035550199',
  now: '2026-11-11T03:00:00.000Z',
});

/* ── classification ──────────────────────────────────────────────────────── */

test('a burst pipe is plumbing, not "general"', () => {
  const v = classifyEmergency('there is a burst pipe in the basement');
  assert.equal(v.categoryId, 'plumbing');
  assert.equal(v.trade, 'plumbing');
  assert.equal(v.safetyCritical, false);
});

test('a gas leak wins over a flood mentioned first', () => {
  // The dangerous reading of this sentence is "flood": it appears first. A
  // plumber sent to a building that should be evacuated is the failure.
  const v = classifyEmergency('there is water everywhere and I can smell gas');
  assert.equal(v.safetyCritical, true);
  assert.equal(v.categoryId, 'fire-life-safety');
  // The trade still comes from the ordinary match — it is water work once the
  // building is clear.
  assert.equal(v.trade, 'water damage');
});

test('the longer cue wins, so "burst pipe" beats "pipe"', () => {
  const v = classifyEmergency('a pipe burst upstairs');
  assert.equal(v.matched, 'pipe burst');
});

test('nothing recognised falls to the catch-all and says so', () => {
  const v = classifyEmergency('something is wrong I do not know what');
  assert.equal(v.categoryId, 'general');
  assert.equal(v.confidence, 'none');
  assert.equal(v.trade, '');
});

test('silence classifies as nothing rather than as an emergency category', () => {
  const v = classifyEmergency('   ');
  assert.equal(v.confidence, 'none');
  assert.equal(v.safetyCritical, false);
});

test("an account's own category beats a built-in one", () => {
  const v = classifyEmergency('the pool pump is screaming', [{
    id: 'pool', label: 'Pool plant', trade: 'pool', safetyCritical: false, cues: ['pool pump'],
  }]);
  assert.equal(v.categoryId, 'pool');
  assert.equal(v.trade, 'pool');
});

test('an elevator entrapment is safety-critical', () => {
  assert.equal(classifyEmergency('someone is stuck in the elevator').safetyCritical, true);
});

/* ── the conversation ────────────────────────────────────────────────────── */

test('the first question is what happened, not who is calling', () => {
  assert.equal(nextPrompt(session(), settings()).step, 'opening');
});

test('a number that already knows the building never asks for the address', () => {
  const s = startSession({
    id: 'CA2', accountEmail: 'a@b.test', dialled: '+1', from: '+1',
    propertyId: 'prop_1', address: '14 Maple Court',
  });
  const after = applySpeech(s, 'the lobby is flooding', settings());
  assert.equal(nextPrompt(after, settings()).step, 'unit');
});

test('"skip" ends the unit question instead of asking it again', () => {
  let s = applySpeech(session(), 'no heat at all', settings());
  s = applySpeech({ ...s, step: 'address' }, '14 Maple Court', settings());
  s = applySpeech({ ...s, step: 'unit' }, 'skip', settings());
  assert.notEqual(nextPrompt(s, settings()).step, 'unit');
});

test('the question cap stops the interview and dispatches on what is known', () => {
  let s = applySpeech(session(), 'burst pipe', settings({ maxQuestions: 2 }));
  s = applySpeech({ ...s, step: 'address' }, '14 Maple Court', settings({ maxQuestions: 2 }));
  // Two questions answered, the cap reached: no name, no unit, no callback.
  const prompt = nextPrompt(s, settings({ maxQuestions: 2 }));
  assert.equal(prompt.step, 'dispatching');
  assert.equal(readyToDispatch(s), true);
});

test('the cap can never go below what a dispatch needs', () => {
  let s = applySpeech(session(), 'burst pipe', settings({ maxQuestions: 0 }));
  // maxQuestions 0 is clamped to 2, so the address is still asked for.
  assert.equal(nextPrompt(s, settings({ maxQuestions: 0 })).step, 'address');
});

test('asking for a person is honoured at any point', () => {
  const s = applySpeech(session(), 'can I speak to a person please', settings());
  assert.equal(s.step, 'handoff');
});

test('three unheard turns hand the call to a person rather than looping', () => {
  let s = session();
  for (let i = 0; i < 3; i++) s = applySpeech(s, '', settings());
  assert.equal(s.step, 'handoff');
});

test('one heard turn clears the misheard count', () => {
  let s = applySpeech(session(), '', settings());
  s = applySpeech(s, 'no power anywhere', settings());
  assert.equal(s.misheard, 0);
  assert.notEqual(s.step, 'handoff');
});

test('anything said after the questions are done joins the description', () => {
  let s = applySpeech(session(), 'burst pipe', settings());
  s = applySpeech({ ...s, step: 'done' }, 'the shutoff is behind the boiler', settings());
  assert.match(s.description, /shutoff is behind the boiler/);
});

/* ── what reaches the dispatch chain ─────────────────────────────────────── */

test('nothing is dispatchable without somewhere to send anyone', () => {
  const s = applySpeech(session(), 'burst pipe', settings());
  assert.equal(readyToDispatch(s), false);
});

test('a dispatched session is never dispatched twice', () => {
  let s = applySpeech(session(), 'burst pipe', settings());
  s = applySpeech({ ...s, step: 'address' }, '14 Maple Court', settings());
  assert.equal(readyToDispatch(s), true);
  assert.equal(readyToDispatch({ ...s, dispatched: true }), false);
});

test('the work request routes to the account, not to whoever rang', () => {
  let s = applySpeech(session(), 'burst pipe in the basement', settings());
  s = applySpeech({ ...s, step: 'address' }, '14 Maple Court', settings());
  s = applySpeech({ ...s, step: 'name' }, 'Dana', settings());
  const record = workRequestFrom(s, { id: 'wr_1', now: '2026-11-11T03:05:00.000Z' });

  // isEmergency reads these two; accountForRequest reads ownerEmail first.
  assert.equal(record.priority, 'urgent');
  assert.equal(record.isEmergency, true);
  assert.equal(record.ownerEmail, 'hoa@maple.test');
  assert.equal(record.trade, 'plumbing');
  assert.equal(record.client_name, 'Dana');
  // The caller's own number is the callback, so the rota can ring them back.
  assert.equal(record.client_phone, '+16035550199');
  assert.match(record.description, /Caller: Dana/);
});

test('a skipped unit does not appear as "Unit -" on the job', () => {
  let s = applySpeech(session(), 'lockout', settings());
  s = applySpeech({ ...s, step: 'address' }, '14 Maple Court', settings());
  s = applySpeech({ ...s, step: 'unit' }, 'skip', settings());
  const record = workRequestFrom(s, { id: 'wr_2' });
  assert.equal(record.unit, '');
  assert.equal(record.address, '14 Maple Court');
});

/* ── what the caller hears ───────────────────────────────────────────────── */

test('recording is announced in the greeting when it is on', () => {
  assert.match(greetingFor(settings({ recordCalls: true })), /recorded/i);
  assert.doesNotMatch(greetingFor(settings({ recordCalls: false })), /recorded/i);
});

test('a safety-critical call is told to leave and dial 911', () => {
  const s = applySpeech(session(), 'I can smell gas', settings());
  assert.match(safetyWarningFor(s), /9 1 1/);
  assert.match(safetyWarningFor(s), /Leave the building/i);
});

test('an entrapment is told to stay put, not to leave the building', () => {
  const s = applySpeech(session(), 'my neighbour is stuck in the elevator', settings());
  assert.match(safetyWarningFor(s), /stay inside/i);
});

test('an ordinary call gets no safety warning at all', () => {
  const s = applySpeech(session(), 'the toilet is blocked', settings());
  assert.equal(safetyWarningFor(s), '');
});

test('the summary marks a safety-critical call so a list cannot hide it', () => {
  const s = applySpeech(session(), 'there is smoke in the hallway', settings());
  assert.match(summaryOf(s), /🚨/);
});
