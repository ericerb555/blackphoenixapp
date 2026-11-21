/**
 * Turning what the camera saw into a deck, without inventing a dimension.
 *
 * Eric, 2026-11-20: "i want the exisiting framing and footing caught in the
 * auto generate proccess so it can build be a framed deck in my design center"
 * and, on being told a photograph has no scale: "the video capture should be
 * able to get pre good measurement".
 *
 * He is right, and these pin WHY: lumber is standard, so a count is a
 * measurement. A tread rise is 7"–7¾" by code, a deck board faces 5½" with a
 * 3/16" gap, joists sit at 12/16/24 on centre. The rule these exist to hold is
 * that anything NOT established that way is flagged, never guessed quietly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deckFromObservation, heightFromRisers, spanFromJoists, runFromBoards,
  RISER_MIN_IN, RISER_MAX_IN,
} from '../supabase/functions/server/deckFromObservation.ts';
import { DEFAULT_DECK } from '../src/app/lib/deckModel.ts';
/**
 * The fallback the caller injects. In the app this is `DEFAULT_DECK` from
 * `src/app/lib/deckModel.ts`; the reader lives server-side and cannot reach a
 * value in the browser bundle, so it is passed in.
 *
 * The test below pins it against the real thing, so the duplicated shape
 * cannot drift without something failing.
 */
const build = (o: any) => deckFromObservation(o, DEFAULT_DECK as any);


/* ── a count is a measurement ────────────────────────────────────────────── */

test('four treads put the deck between 2.33 and 2.58 feet', () => {
  const h = heightFromRisers(4);
  assert.equal(h.basis, 'riser-count');
  assert.equal(h.low, Math.round(4 * RISER_MIN_IN / 12 * 100) / 100);
  assert.equal(h.high, Math.round(4 * RISER_MAX_IN / 12 * 100) / 100);
  assert.ok(h.value > h.low - 0.001 && h.value < h.high + 0.001);
  assert.match(h.how, /4 risers/);
});

test('joists at 16 on centre span the width they cover', () => {
  // 13 joists at 16" o.c. is 12 bays — 16 feet.
  const w = spanFromJoists(13, 16);
  assert.equal(w.value, 16);
  assert.equal(w.basis, 'joist-count');
  assert.ok(w.low < 16 && w.high > 16, 'a counted span carries a range');
});

test('boards measure the run they cover, to within a board', () => {
  // 24 boards at 5.5 + 0.1875 = 11.375 ft.
  const d = runFromBoards(24);
  assert.equal(d.value, 11.38);
  assert.equal(d.basis, 'board-count');
  // Tighter than counting joists over a comparable run, which is the claim
  // worth holding — the uncertainty is the gap, not a whole 16" bay.
  const j = spanFromJoists(9, 16);
  assert.ok(j.value > 10 && j.value < 12, 'comparable run');
  assert.ok(d.high - d.low < j.high - j.low,
    `boards (${d.high - d.low}) should beat joists (${j.high - j.low})`);
});

/* ── precedence: measured beats counted beats assumed ────────────────────── */

test('a dimension somebody measured wins over one counted', () => {
  const r = build({
    statedWidthFt: 14, joistCount: 13, joistSpacingInches: 16,
  });
  assert.equal(r.width.value, 14);
  assert.equal(r.width.basis, 'stated');
});

test('counted beats assumed, and does not set needsMeasurement', () => {
  const r = build({
    joistCount: 13, joistSpacingInches: 16,
    boardCount: 24, deckingDirection: 'parallel',
    riserCount: 4,
  });
  assert.equal(r.width.basis, 'joist-count');
  assert.equal(r.depth.basis, 'board-count');
  assert.equal(r.height.basis, 'riser-count');
  assert.equal(r.needsMeasurement, false);
});

test('NOTHING SEEN IS FLAGGED, NOT GUESSED', () => {
  const r = build({});
  assert.equal(r.needsMeasurement, true);
  assert.equal(r.width.basis, 'assumed');
  assert.equal(r.depth.basis, 'assumed');
  assert.equal(r.height.basis, 'assumed');
  // Named, so a person can see what to go and measure.
  assert.ok(r.unknowns.some((u) => /Width/.test(u)));
  assert.ok(r.unknowns.some((u) => /Depth/.test(u)));
  assert.ok(r.unknowns.some((u) => /Height/.test(u)));
  // And it still produces a deck, so the designer has something to open.
  assert.ok(r.deck.widthFt > 0 && r.deck.depthFt > 0);
});

test('an assumed dimension says so in its own words', () => {
  const r = build({});
  assert.match(r.width.how, /NOT established/);
});

/* ── which way the boards run decides which dimension they measure ───────── */

test('boards parallel to the house measure the depth', () => {
  const r = build({ boardCount: 24, deckingDirection: 'parallel' });
  assert.equal(r.depth.basis, 'board-count');
  assert.equal(r.width.basis, 'assumed', 'they say nothing about the width');
});

test('boards perpendicular to the house measure the width', () => {
  const r = build({ boardCount: 24, deckingDirection: 'perpendicular' });
  assert.equal(r.width.basis, 'board-count');
  assert.equal(r.depth.basis, 'assumed');
});

test('boards with no stated direction measure nothing', () => {
  // Getting this backwards swaps the deck's dimensions, so an unknown
  // direction must not be treated as a default.
  const r = build({ boardCount: 24 });
  assert.equal(r.width.basis, 'assumed');
  assert.equal(r.depth.basis, 'assumed');
});

/* ── the framing that was actually there ─────────────────────────────────── */

test('a freestanding deck stays freestanding', () => {
  // `false` is an observation. Falling back to the default here would bolt a
  // ledger onto a house the deck is not touching.
  const r = build({ ledgerAttached: false });
  assert.equal(r.deck.ledgerAttached, false);
});

test('no guardrail seen is not the same as not looked', () => {
  assert.equal(build({ guardrail: false }).deck.guardrail, false);
  assert.equal(build({}).deck.guardrail, true, 'absent falls back');
});

test('the framing sizes that were visible are carried', () => {
  const r = build({
    joistSize: '2x8', beamSize: '2x12', beamPlies: 3, postSize: '4x4',
    joistSpacingInches: 24,
  });
  assert.equal(r.deck.joistSize, '2x8');
  assert.equal(r.deck.beamSize, '2x12');
  assert.equal(r.deck.beamPlies, 3);
  assert.equal(r.deck.postSize, '4x4');
  assert.equal(r.deck.joistSpacing, 24);
});

test('footings set the post spacing, because they are what is there', () => {
  // 16 ft wide on 3 footings is two 8 ft bays.
  const r = build({
    joistCount: 13, joistSpacingInches: 16, footingCount: 3,
  });
  assert.equal(r.deck.widthFt, 16);
  assert.equal(r.deck.postSpacingFt, 8);
});

test('one footing is not a spacing', () => {
  const r = build({ joistCount: 13, joistSpacingInches: 16, footingCount: 1 });
  assert.equal(r.deck.postSpacingFt, 6, 'falls back rather than dividing by zero');
});

test('counted risers mean there are stairs', () => {
  assert.equal(build({ riserCount: 5 }).deck.stairs, true);
});

/* ── rubbish in does not become a deck ───────────────────────────────────── */

test('nonsense counts are ignored rather than framed', () => {
  const r = build({
    joistCount: 0, riserCount: -3, boardCount: Number('abc') as any,
    joistSpacingInches: 19 as any,
  });
  assert.equal(r.needsMeasurement, true);
  assert.equal(r.deck.joistSpacing, 16, 'an off-table spacing is not honoured');
  assert.ok(r.deck.heightFt > 0);
});

test('a null observation still returns a usable deck', () => {
  const r = build(null);
  assert.equal(r.needsMeasurement, true);
  assert.ok(r.deck.widthFt > 0);
});

test('what the camera could not see is never discarded', () => {
  const r = build({
    statedWidthFt: 16, statedDepthFt: 12, statedHeightFt: 3,
    joistSpacingInches: 16, footingCount: 3,
    couldNotSee: ['The underside of the deck was not visible from any angle.'],
  });
  assert.equal(r.needsMeasurement, false);
  assert.ok(r.unknowns.some((u) => /underside/.test(u)),
    'a clean measurement does not excuse dropping what was hidden');
});

test('the injected fallback is the deck the app actually defaults to', () => {
  // The server copy of `DeckModel` is a duplicate of the browser one — four
  // lines of unions, so that the LOGIC has a single copy and no import has
  // to cross the flat-build boundary. This is what stops the duplicate
  // drifting: every field the reader falls back to is checked against the
  // real `DEFAULT_DECK`.
  const r = build({});
  assert.equal(r.deck.widthFt, DEFAULT_DECK.widthFt);
  assert.equal(r.deck.depthFt, DEFAULT_DECK.depthFt);
  assert.equal(r.deck.heightFt, DEFAULT_DECK.heightFt);
  assert.equal(r.deck.joistSize, DEFAULT_DECK.joistSize);
  assert.equal(r.deck.joistSpacing, DEFAULT_DECK.joistSpacing);
  assert.equal(r.deck.beamSize, DEFAULT_DECK.beamSize);
  assert.equal(r.deck.beamPlies, DEFAULT_DECK.beamPlies);
  assert.equal(r.deck.postSize, DEFAULT_DECK.postSize);
  assert.equal(r.deck.cantileverFt, DEFAULT_DECK.cantileverFt);
  assert.equal(r.deck.deckingFinish, DEFAULT_DECK.deckingFinish);
  assert.equal(r.deck.railFinish, DEFAULT_DECK.railFinish);
  assert.equal(r.deck.innerHandrail, DEFAULT_DECK.innerHandrail);
  // And every key the model defines is present on what comes back.
  for (const k of Object.keys(DEFAULT_DECK)) {
    assert.ok(k in r.deck, `the reading dropped ${k}`);
  }
});
