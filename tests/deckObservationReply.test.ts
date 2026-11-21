/**
 * Distrusting what the model says it saw of somebody's deck.
 *
 * The next thing that happens to these figures is that they become framing, a
 * permit packet and a price. So the gate is the house gate: indices not
 * identifiers, absent is not zero, false is an answer, and a count has to be
 * physically possible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readDeckObservation, isDeckReading,
} from '../src/app/lib/deckObservationReply.ts';
import { deckFromObservation } from '../src/app/lib/deckFromObservation.ts';

/** A sound reply about a 16x12 deck read off 40 frames of video. */
const good = (over: Record<string, unknown> = {}) => ({
  frames: [0, 4, 11],
  joistCount: 13,
  joistSpacingInches: 16,
  boardCount: 24,
  deckingDirection: 'parallel',
  riserCount: 4,
  footingCount: 3,
  postSize: '6x6',
  joistSize: '2x10',
  ledgerAttached: true,
  guardrail: true,
  couldNotSee: ['The underside of the far corner was never in shot.'],
  ...over,
});

/* ── indices, not identifiers ────────────────────────────────────────────── */

test('a sound reply reads back whole', () => {
  const r = readDeckObservation(good(), 40);
  assert.ok(isDeckReading(r));
  assert.deepEqual(r.frames, [0, 4, 11]);
  assert.equal(r.observation.joistCount, 13);
  assert.equal(r.observation.riserCount, 4);
});

test('a frame index past the end rejects the WHOLE reading', () => {
  // Clamping 40 to 39 would be a confident statement about a frame the model
  // never looked at, with its own reasoning attached.
  assert.equal(readDeckObservation(good({ frames: [0, 40] }), 40), null);
  assert.equal(readDeckObservation(good({ frames: [-1] }), 40), null);
});

test('a reading that cites no frame is not a reading', () => {
  assert.equal(readDeckObservation(good({ frames: [] }), 40), null);
  assert.equal(readDeckObservation(good({ frames: undefined }), 40), null);
  assert.equal(readDeckObservation(good({ frames: 'all of them' }), 40), null);
});

test('repeated frame citations collapse', () => {
  const r = readDeckObservation(good({ frames: [3, 3, 3] }), 40);
  assert.ok(isDeckReading(r));
  assert.deepEqual(r.frames, [3]);
});

/* ── absent is not zero ──────────────────────────────────────────────────── */

test('a count nobody gave is null, not nought', () => {
  const r = readDeckObservation({ frames: [0] }, 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.joistCount, null);
  assert.equal(r.observation.riserCount, null);
  assert.equal(r.observation.footingCount, null);
  // And that is what makes the deck ask to be measured rather than be framed
  // at a confident zero.
  assert.equal(deckFromObservation(r.observation).needsMeasurement, true);
});

test('an explicit zero count is dropped, because a deck has no nought joists', () => {
  const r = readDeckObservation(good({ joistCount: 0, riserCount: 0 }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.joistCount, null);
  assert.equal(r.observation.riserCount, null);
});

/* ── false is an answer ──────────────────────────────────────────────────── */

test('a freestanding deck survives as false, not as absent', () => {
  const r = readDeckObservation(good({ ledgerAttached: false, guardrail: false }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.ledgerAttached, false);
  assert.equal(r.observation.guardrail, false);
  // Which is the difference between a freestanding deck and one bolted to a
  // house it is not touching.
  assert.equal(deckFromObservation(r.observation).deck.ledgerAttached, false);
});

test('not mentioned is null, so the default can take over', () => {
  const r = readDeckObservation({ frames: [0] }, 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.ledgerAttached, null);
  assert.equal(deckFromObservation(r.observation).deck.ledgerAttached, true);
});

/* ── a count has to be possible ──────────────────────────────────────────── */

test('forty risers is a miscount, not a deck', () => {
  const r = readDeckObservation(good({ riserCount: 40 }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.riserCount, null, 'dropped rather than framed 24ft up');
});

test('impossible counts are dropped without losing the sound ones', () => {
  const r = readDeckObservation(good({ joistCount: 5000, footingCount: 900 }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.joistCount, null);
  assert.equal(r.observation.footingCount, null);
  assert.equal(r.observation.boardCount, 24, 'the good figures survive');
});

test('a fractional count is not a count', () => {
  const r = readDeckObservation(good({ joistCount: 12.5 }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.joistCount, null);
});

test('a numeric string is accepted, because models emit them', () => {
  const r = readDeckObservation(good({ joistCount: '13', joistSpacingInches: '16' }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.joistCount, 13);
  assert.equal(r.observation.joistSpacingInches, 16);
});

/* ── enums ───────────────────────────────────────────────────────────────── */

test('an off-table joist spacing is refused', () => {
  const r = readDeckObservation(good({ joistSpacingInches: 19 }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.joistSpacingInches, null);
});

test('an invented lumber size is refused', () => {
  const r = readDeckObservation(good({ joistSize: '2x14', postSize: '8x8' }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.joistSize, null);
  assert.equal(r.observation.postSize, null);
});

test('a decking direction must be one of the two that mean something', () => {
  assert.equal(
    (readDeckObservation(good({ deckingDirection: 'diagonal' }), 40) as any).observation.deckingDirection,
    null,
  );
});

/* ── the model may not promote its own guess ─────────────────────────────── */

test('a model-estimated dimension is NOT a stated one', () => {
  // `stated` is the highest-precedence basis in deckFromObservation. A model
  // that could promote its own estimate into it would outrank a tape measure.
  const r = readDeckObservation(good({ widthFt: 16, depthFt: 12, heightFt: 3 }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.statedWidthFt, null);
  assert.equal(r.observation.statedDepthFt, null);
  // So the width still comes from the joist count, with its range.
  assert.equal(deckFromObservation(r.observation).width.basis, 'joist-count');
});

test('a dimension marked as measured on site is allowed through', () => {
  const r = readDeckObservation(good({ measuredOnSite: true, widthFt: 15.5 }), 40);
  assert.ok(isDeckReading(r));
  assert.equal(r.observation.statedWidthFt, 15.5);
  assert.equal(deckFromObservation(r.observation).width.basis, 'stated');
});

/* ── refusals and rubbish ────────────────────────────────────────────────── */

test('a refusal comes back as a refusal, not as nothing', () => {
  const r = readDeckObservation({ unsure: true, why: 'The deck is under snow.' }, 40);
  assert.ok(r && !isDeckReading(r));
  assert.equal((r as any).why, 'The deck is under snow.');
});

test('a refusal with no reason still says something', () => {
  const r = readDeckObservation({ unsure: true }, 40);
  assert.match((r as any).why, /\w/);
});

test('rubbish is null', () => {
  assert.equal(readDeckObservation(null, 40), null);
  assert.equal(readDeckObservation('a deck', 40), null);
  assert.equal(readDeckObservation(42, 40), null);
  assert.equal(readDeckObservation([], 40), null);
});

test('what it could not see is kept, trimmed and de-duplicated', () => {
  const r = readDeckObservation(good({
    couldNotSee: ['  The   underside  ', 'The underside', '', 'Footing depth'],
  }), 40);
  assert.ok(isDeckReading(r));
  assert.deepEqual(r.observation.couldNotSee, ['The underside', 'Footing depth']);
});

test('the reading feeds straight into a framed deck', () => {
  const r = readDeckObservation(good(), 40);
  assert.ok(isDeckReading(r));
  const built = deckFromObservation(r.observation);
  assert.equal(built.needsMeasurement, false);
  assert.equal(built.width.basis, 'joist-count');
  assert.equal(built.depth.basis, 'board-count');
  assert.equal(built.height.basis, 'riser-count');
  assert.equal(built.deck.widthFt, 16);
  // And what the camera missed is still carried through to the review screen.
  assert.ok(built.unknowns.some((u) => /far corner/.test(u)));
});
