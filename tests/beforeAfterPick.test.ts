/**
 * Letting a model choose which photograph is the before.
 *
 * The expensive failure is not a bad pick — a person sees a bad pick and
 * changes it. It is a pick of something nobody chose: an index the model
 * invented, quietly clamped into range, presented with the model's own
 * reasoning printed underneath as though it had considered that photograph.
 * That reads exactly like a good answer.
 *
 * So the rule under test is blunt: an answer that is not a valid index into
 * the array that was actually sent is thrown away whole.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  candidatesFor, guessPair, readPick, isApplicable, MAX_CANDIDATES,
} from '../src/app/lib/beforeAfterPick.ts';

const at = (iso: string, id = iso) => ({ id, createdAt: iso });

/* ── the free answer ─────────────────────────────────────────────────────── */

test('earliest is the before and latest is the after', () => {
  const pick = guessPair([
    at('2026-03-02T10:00:00Z', 'mid'),
    at('2026-03-01T09:00:00Z', 'first'),
    at('2026-03-09T17:00:00Z', 'last'),
  ]);
  assert.equal(pick?.before, 1);
  assert.equal(pick?.after, 2);
  assert.equal(pick?.unsure, false);
});

test('one photograph is not a pair', () => {
  assert.equal(guessPair([at('2026-03-01T09:00:00Z')]), null);
  assert.equal(guessPair([]), null);
  assert.equal(guessPair(null), null);
});

/** Nothing distinguishes them, so there is no ordering to propose. */
test('photos all taken at the same moment give no pair', () => {
  const same = '2026-03-01T09:00:00Z';
  assert.equal(guessPair([at(same, 'a'), at(same, 'b')]), null);
});

/**
 * Undated photographs still get a proposal, flagged unsure — position is the
 * only ordering there is, and saying so is better than refusing.
 */
test('with no dates it falls back to position and admits it', () => {
  const pick = guessPair([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  assert.equal(pick?.before, 0);
  assert.equal(pick?.after, 2);
  assert.equal(pick?.unsure, true);
  assert.match(pick!.why, /no date/i);
});

/* ── what gets sent ──────────────────────────────────────────────────────── */

test('candidates come back oldest first', () => {
  const out = candidatesFor([
    at('2026-03-05T00:00:00Z', 'c'),
    at('2026-03-01T00:00:00Z', 'a'),
    at('2026-03-03T00:00:00Z', 'b'),
  ]);
  assert.deepEqual(out.map((p) => p.id), ['a', 'b', 'c']);
});

/**
 * Every image sent is billed, and the middle of a job is neither a before nor
 * an after — so the cap keeps both ends rather than the first N.
 */
test('a long job is capped, keeping both ends', () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    at(`2026-03-${String(i + 1).padStart(2, '0')}T00:00:00Z`, `p${i}`));
  const out = candidatesFor(many, 8);
  assert.equal(out.length, 8);
  assert.equal(out[0].id, 'p0', 'the earliest must survive');
  assert.equal(out[out.length - 1].id, 'p29', 'the latest must survive');
});

test('undated photos are kept, not sorted into nonsense', () => {
  const out = candidatesFor([{ id: 'x' }, at('2026-03-01T00:00:00Z', 'a')]);
  assert.deepEqual(out.map((p) => p.id), ['a', 'x']);
});

test('the default cap is the documented one', () => {
  assert.equal(candidatesFor(Array.from({ length: 50 }, (_, i) => at(`2026-03-01T00:00:0${i % 10}Z`, `p${i}`))).length, MAX_CANDIDATES);
});

/* ── reading the model ───────────────────────────────────────────────────── */

test('a clean answer is taken', () => {
  const pick = readPick({ before: 0, after: 3, why: 'Stripped studs, then tiled.' }, 4);
  assert.deepEqual([pick?.before, pick?.after], [0, 3]);
  assert.equal(pick?.unsure, false);
  assert.ok(isApplicable(pick));
});

test('a JSON string is accepted, since that is what a model returns', () => {
  const pick = readPick('{"before":1,"after":2,"why":"ok"}', 3);
  assert.deepEqual([pick?.before, pick?.after], [1, 2]);
});

/**
 * THE ONE THAT MATTERS. Clamping 9 to 7 would present a confident pick of a
 * photograph the model never saw, explained in the model's own words.
 */
test('an index outside the range sent is rejected, never clamped', () => {
  assert.equal(readPick({ before: 0, after: 9, why: 'x' }, 8), null);
  assert.equal(readPick({ before: -1, after: 2, why: 'x' }, 8), null);
});

test('one photograph cannot be both', () => {
  assert.equal(readPick({ before: 2, after: 2, why: 'x' }, 5), null);
});

test('a fractional index is not a photograph', () => {
  assert.equal(readPick({ before: 1.5, after: 2, why: 'x' }, 5), null);
});

test('nothing usable in means nothing out', () => {
  assert.equal(readPick(null, 5), null);
  assert.equal(readPick('not json', 5), null);
  assert.equal(readPick([0, 1], 5), null);
  assert.equal(readPick({ why: 'no indices' }, 5), null);
});

test('a pick cannot be read against fewer than two photographs', () => {
  assert.equal(readPick({ before: 0, after: 1, why: 'x' }, 1), null);
});

/**
 * Declining is a result worth keeping and not worth applying. The reason is
 * shown; the slots are left alone.
 */
test('an unsure model is kept as a reason, with no pair', () => {
  const pick = readPick({ unsure: true, why: 'These look like two different rooms.' }, 6);
  assert.equal(pick?.unsure, true);
  assert.match(pick!.why, /different rooms/);
  assert.equal(isApplicable(pick), false);
});

test('unsure wins even when indices are supplied', () => {
  const pick = readPick({ unsure: true, before: 0, after: 1, why: '' }, 4);
  assert.equal(isApplicable(pick), false);
  assert.ok(pick!.why.length > 0, 'a refusal with no words still has to say something');
});

test('a rambling reason is trimmed rather than rendered whole', () => {
  const pick = readPick({ before: 0, after: 1, why: 'y'.repeat(900) }, 2);
  assert.ok(pick!.why.length <= 240);
});
