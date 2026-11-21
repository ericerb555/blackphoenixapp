/**
 * What the deck surveyor is actually asked.
 *
 * A prompt is a request, not a guarantee — `deckObservationReply.ts` is the
 * check. But the request still has to be right, and these are the parts of it
 * that decide whether the answer is a reading or a guess:
 *
 *   · it must ask for COUNTS, never for feet, because a dimension the model
 *     invents becomes a framed deck and a price
 *   · it must say a missing field is a real answer, or the model fills gaps
 *   · it must state the frame-index rule, since the gate rejects anything else
 *   · the verify pass must say count each thing once, which is the single
 *     biggest accuracy lever when the frames are a walk round one deck
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deckReadingSystem, deckVerifySystem, MAX_FRAMES,
} from '../supabase/functions/server/deckReading.ts';

/**
 * Collapsed, because these prompts are WRAPPED PROSE.
 *
 * `three footings into nine` sits across a line break in the source, so a
 * naive regex misses a sentence that is present and correct. Matching the
 * collapsed text asserts what the model is told, not how the file is laid
 * out — and keeps the prompt free to be re-wrapped.
 */
const flat = (s: string) => s.replace(/\s+/g, ' ');

const read = flat(deckReadingSystem(12));
const verify = flat(deckVerifySystem(12));

test('it asks for counts and forbids dimensions', () => {
  for (const p of [read, verify]) {
    assert.match(p, /COUNTS AND RELATIONSHIPS/);
    assert.match(p, /Do not estimate any dimension/i);
    assert.match(p, /Do not give a span/i);
  }
});

test('it says why a guessed dimension matters, not just that it is banned', () => {
  // A rule with its reason attached survives being summarised; a bare
  // prohibition is the first thing a model trades away under pressure.
  assert.match(read, /framed deck, a permit packet and a number put in front of a customer/);
});

test('an omitted field is declared to be a real answer', () => {
  // Without this the model fills the gaps, and `deckFromObservation` can no
  // longer tell "not counted" from "counted and zero" — which is the whole
  // basis of needsMeasurement.
  assert.match(read, /LEAVE A FIELD OUT RATHER THAN GUESS/);
  assert.match(read, /never read as zero/i);
});

test('the frame-index rule is stated, with the actual range', () => {
  for (const [p, label] of [[read, 'reading'], [verify, 'verify']] as const) {
    assert.match(p, /numbers between 0 and 11/, `${label} must give the real range`);
    assert.match(p, /Never (write )?a filename, a URL or an id/, `${label} must forbid identifiers`);
  }
  // The range tracks the count rather than being hardcoded.
  assert.match(flat(deckReadingSystem(3)), /between 0 and 2/);
});

test('one frame is not pluralised', () => {
  assert.match(flat(deckReadingSystem(1)), /The 1 frame are|The 1 frame is|The 1 frame /);
  assert.doesNotMatch(flat(deckReadingSystem(1)), /The 1 frames/);
});

test('the decking direction is explained, because backwards swaps the deck', () => {
  assert.match(read, /PARALLEL to the house wall/);
  assert.match(read, /PERPENDICULAR/);
  assert.match(read, /If you are not certain which, leave it out/);
  assert.match(verify, /CHECK THE DECKING DIRECTION HARDEST/);
});

test('the verify pass is told to count each thing once', () => {
  assert.match(verify, /COUNT EACH THING ONCE/);
  // With the concrete consequence, which is what makes it a checkable
  // instruction rather than an attitude.
  assert.match(verify, /three footings into nine/);
});

test('the verify pass omits on disagreement rather than averaging', () => {
  assert.match(verify, /DISAGREEMENT MEANS LEAVE IT OUT/);
  assert.match(verify, /no averaging/i);
});

test('both passes keep what could not be seen', () => {
  assert.match(read, /couldNotSee/);
  assert.match(verify, /RE-STATE WHAT IS HIDDEN/);
  assert.match(read, /not discarded/);
});

test('a refusal has an exact shape the parser can read', () => {
  assert.match(read, /\{"unsure": true, "why": "\.\.\."\}/);
});

test('only a visible tape or written dimension may be called measured', () => {
  // `measuredOnSite` promotes a figure to the highest-precedence basis in
  // deckFromObservation, above anything counted. It must not be the model's
  // own estimate wearing a better label.
  assert.match(read, /measuredOnSite\s+true ONLY if a tape measure or a written dimension is/);
});

test('the frame cap is shared with the other reader', () => {
  assert.equal(MAX_FRAMES, 12);
});
