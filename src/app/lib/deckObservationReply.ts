/**
 * Reading back what the model says it saw of an existing deck.
 *
 * Eric: "i want the exisiting framing and footing caught in the auto generate
 * proccess so it can build be a framed deck in my design center".
 *
 * `deckFromObservation` turns counts into a framed deck. This is the gate in
 * front of it, and it exists for distrust: every figure here is a claim by a
 * language model about somebody's house, and the next thing that happens to it
 * is that it becomes framing, a permit packet and a price.
 *
 * THE RULES ARE THE HOUSE RULES, FOR THE SAME REASONS
 *
 * INDICES, NOT IDENTIFIERS. A reading cites the frames it came from by
 * position in the array that was sent. An index outside that range rejects the
 * reading WHOLE rather than being clamped — clamping 9 to 7 produces a
 * confident statement about a frame the model never looked at, carrying the
 * model's own reasoning as justification, and nobody downstream can tell. The
 * same rule as `adDirection` and `beforeAfterPick`, because it is the same
 * hazard.
 *
 * ABSENT IS NOT ZERO. `Number(null)` is 0, and a joist count of 0 read from a
 * reply that never mentioned joists is not "no joists" — it is "nobody
 * counted", and the difference decides whether `needsMeasurement` is set. This
 * is the bug class that has bitten this project repeatedly, so every count
 * here returns null rather than 0 when it was not said.
 *
 * FALSE IS AN ANSWER. `ledgerAttached: false` means the deck is freestanding
 * and must survive; absent means nobody could see and must fall back. A plain
 * `Boolean(x)` collapses the two and bolts a ledger onto a house the deck is
 * not touching.
 *
 * A COUNT HAS TO BE POSSIBLE. Forty risers is not a deck, it is a miscount or
 * a hallucination, and it would frame a deck twenty-four feet in the air. The
 * bounds here are deliberately generous — they are a sanity gate, not a
 * specification — but an impossible count is dropped rather than built.
 *
 * WHAT THIS DOES NOT DO is decide whether the reading is RIGHT. De-duplicating
 * the same deck seen across forty frames is the verify pass's job and the
 * single biggest accuracy lever; this checks shape, not truth. Neither check
 * substitutes for the other.
 */

import type { DeckObservation } from './deckFromObservation.ts';
import type { LumberSize, PostSize, JoistSpacing } from './deckModel.ts';

/** The model would not say. Worth showing a person; nonsense is not. */
export interface DeckObservationRefusal {
  unsure: true;
  why: string;
}

/** A reading, plus the frames it says it came from. */
export interface DeckReadingReply {
  observation: DeckObservation;
  /** Positions in the array of frames that was sent. */
  frames: number[];
}

const LUMBER: LumberSize[] = ['2x6', '2x8', '2x10', '2x12'];
const POSTS: PostSize[] = ['4x4', '6x6'];
const SPACINGS: JoistSpacing[] = [12, 16, 24];

/**
 * Generous ceilings. A deck bigger than any of these is a miscount.
 *
 * 30 risers is a deck eighteen feet up; 200 joists at 16" is a deck 265 feet
 * wide. Nothing here is a design limit — it is the line past which a number
 * stopped being a reading of a photograph.
 */
const BOUNDS: Record<string, [number, number]> = {
  joistCount: [2, 200],
  boardCount: [2, 400],
  riserCount: [1, 30],
  footingCount: [1, 60],
  postCount: [1, 60],
  beamPlies: [1, 4],
};

/**
 * A whole count inside its bounds, or null.
 *
 * Numeric strings are accepted: models emit "12" as often as 12 and the
 * meaning is not in doubt. Throwing away a sound reading over a type quirk
 * punishes a correct answer.
 */
function boundedCount(v: unknown, key: string): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  const [lo, hi] = BOUNDS[key];
  if (n < lo || n > hi) return null;
  return n;
}

/** A stated dimension in feet. A deck is not 400 feet long or a quarter-inch. */
function statedFeet(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 200) return null;
  return Math.round(n * 100) / 100;
}

/** True, false, or "nobody said" — which is three answers, not two. */
function tristate(v: unknown): boolean | null {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return null;
}

const oneOf = <T,>(v: unknown, allowed: readonly T[]): T | null =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : null;

/** The frames a reading cites, or null if any is out of range. */
function citedFrames(v: unknown, frameCount: number): number[] | null {
  if (!Array.isArray(v)) return null;
  const out: number[] = [];
  for (const raw of v) {
    if (typeof raw !== 'number' && typeof raw !== 'string') return null;
    const n = Number(raw);
    if (!Number.isInteger(n)) return null;
    // Rejected whole. See the note at the top about clamping.
    if (n < 0 || n >= frameCount) return null;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

/** Short, trimmed lines. A model will happily write an essay here. */
function lines(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const raw of v) {
    const t = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The reading, or null if it cannot be trusted whole.
 *
 * `frameCount` is how many frames were sent. A refusal comes back as its own
 * shape so a caller can tell "the model would not say" from "the model
 * answered nonsense" — the first is worth putting in front of somebody.
 */
export function readDeckObservation(
  raw: unknown,
  frameCount: number,
): DeckReadingReply | DeckObservationRefusal | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (r.unsure === true) {
    return {
      unsure: true,
      why: String(r.why ?? '').trim().slice(0, 240) || 'Not sure enough to say.',
    };
  }

  /*
   * A reading must say where it looked. Without that there is no way to check
   * a claim against a frame, and "the whole video" is not an answer a person
   * can verify.
   */
  const frames = citedFrames(r.frames, frameCount);
  if (frames === null || frames.length === 0) return null;

  const observation: DeckObservation = {
    joistCount: boundedCount(r.joistCount, 'joistCount'),
    joistSpacingInches: oneOf(
      typeof r.joistSpacingInches === 'string' ? Number(r.joistSpacingInches) : r.joistSpacingInches,
      SPACINGS,
    ),
    boardCount: boundedCount(r.boardCount, 'boardCount'),
    deckingDirection: oneOf(r.deckingDirection, ['parallel', 'perpendicular'] as const),
    riserCount: boundedCount(r.riserCount, 'riserCount'),
    footingCount: boundedCount(r.footingCount, 'footingCount'),
    postCount: boundedCount(r.postCount, 'postCount'),

    joistSize: oneOf(r.joistSize, LUMBER),
    beamSize: oneOf(r.beamSize, LUMBER),
    beamPlies: boundedCount(r.beamPlies, 'beamPlies'),
    postSize: oneOf(r.postSize, POSTS),
    ledgerAttached: tristate(r.ledgerAttached),
    guardrail: tristate(r.guardrail),
    stairs: tristate(r.stairs),
    stairWidthFt: statedFeet(r.stairWidthFt),

    /*
     * A dimension the MODEL claims to have measured is not a stated dimension.
     * `statedWidthFt` and friends are for a figure a person put on the record —
     * a tape in a frame, a number the customer typed. They are read here only
     * when the reply marks them as measured, so a model cannot promote its own
     * estimate to the highest-precedence basis in `deckFromObservation`.
     */
    statedWidthFt: r.measuredOnSite === true ? statedFeet(r.widthFt) : null,
    statedDepthFt: r.measuredOnSite === true ? statedFeet(r.depthFt) : null,
    statedHeightFt: r.measuredOnSite === true ? statedFeet(r.heightFt) : null,

    couldNotSee: lines(r.couldNotSee),
  };

  return { observation, frames };
}

/** True when a reply is a reading rather than a refusal. */
export function isDeckReading(
  v: DeckReadingReply | DeckObservationRefusal | null,
): v is DeckReadingReply {
  return Boolean(v) && !('unsure' in (v as object));
}
