/**
 * What was seen on site, turned into a deck the design centre can frame.
 *
 * Eric, 2026-11-20: "i want the exisiting framing and footing caught in the
 * auto generate proccess so it can build be a framed deck in my design center
 * and then it should read what the customer is requestiong and prep a new build
 * that i can review and then render".
 *
 * THE MODEL OBSERVES. THIS COMPUTES.
 *
 * The AI is never asked for a width, a span, a joist size in a span table, a
 * footing depth or a dollar. It is asked only for what a camera can actually
 * establish — COUNTS and RELATIONSHIPS: how many risers, how many joists and
 * at what spacing, how many boards across, how many footings, whether the band
 * is bolted to the house. `framingModel` and `deckStructural` then size the
 * deck, and `deckQuote` prices it.
 *
 * WHY COUNTING IS THE WHOLE TRICK
 *
 * A photograph has no scale, and that was my objection. Eric's answer — "the
 * video capture should be able to get pre good measurement" — is right, and
 * this is why: lumber is standard. A tread rise is 7" to 7¾" by code, a deck
 * board faces 5½" with a 3/16" gap, joists sit at 12, 16 or 24 inches on
 * centre. So a count IS a measurement, and video is what makes a count
 * possible — you cannot see the whole deck or the full flight of stairs in one
 * still, and parallax across frames is what separates a joist from a shadow.
 *
 * Every dimension therefore carries HOW it was arrived at and the range it is
 * good to. Nothing here returns a bare number.
 *
 * WHAT IT WILL NOT DO
 *
 * Invent a length. A guessed dimension becomes a framed deck, a permit packet
 * and a price put in front of a customer. This repo has already deleted one
 * service that returned `Math.random()` room sizes; an assumed dimension is
 * flagged `needsMeasurement` and named, so the proposal is reviewable rather
 * than quietly wrong.
 */

/*
 * WHY THE DECK TYPES ARE DECLARED HERE AND NOT IMPORTED
 *
 * This file lives in the server directory, and the server deploys from a
 * FLAT build: `scripts/build-server.mjs` copies the files sitting directly
 * in this folder and nothing else. An import reaching up into
 * `src/app/lib/deckModel.ts` would survive the transpile and then fail to
 * resolve in production — the same trap `checkoutExpectation.ts` is in this
 * folder to avoid.
 *
 * It lives here rather than in the browser bundle because the figures it
 * reads come back from a language model, and validating them in the page
 * would make the browser the courier for numbers that become a price. This
 * codebase has already paid for that mistake once: a customer's browser
 * used to write the generated quote into the pipeline, so "the number the
 * business worked from had passed through the hands of the party with the
 * most reason to change it".
 *
 * The structural unions are duplicated — four lines, checked by the
 * compiler at every call site in both halves — rather than the LOGIC,
 * which has one copy. `DEFAULT_DECK` is injected by the caller for the
 * same reason: it is a value, and a value cannot cross this boundary.
 */
export type LumberSize = '2x6' | '2x8' | '2x10' | '2x12';
export type PostSize = '4x4' | '6x6';
export type JoistSpacing = 12 | 16 | 24;

/** The shape `src/app/lib/deckModel.ts` defines, which this must satisfy. */
export interface DeckModel {
  widthFt: number;
  depthFt: number;
  heightFt: number;
  joistSize: LumberSize;
  joistSpacing: JoistSpacing;
  beamSize: LumberSize;
  beamPlies: number;
  postSize: PostSize;
  postSpacingFt: number;
  ledgerAttached: boolean;
  cantileverFt: number;
  deckingDirection: 'parallel' | 'perpendicular';
  guardrail: boolean;
  stairs: boolean;
  stairWidthFt: number;
  deckingFinish: string;
  railFinish: string;
  innerHandrail: boolean;
}

/** How a figure was arrived at, strongest first. */
export type Basis = 'stated' | 'riser-count' | 'joist-count' | 'board-count' | 'assumed';

export interface Measured {
  /** Feet. The figure to build from. */
  value: number;
  basis: Basis;
  /** The range this is good to, in feet. Both equal `value` when stated. */
  low: number;
  high: number;
  /** Plain words, for the review screen and the written basis. */
  how: string;
}

/**
 * Code minimums and standard stock, which is what makes a count a measurement.
 *
 * The riser range is the code band, not a preference: a flight has to fall in
 * it, so a count of treads bounds the height whatever the builder chose.
 * `deckModel` frames stairs at a flat 7" — that is the forward direction and
 * is left alone; this is the inverse and has to carry the band.
 */
export const RISER_MIN_IN = 7;
export const RISER_MAX_IN = 7.75;
export const RISER_TYPICAL_IN = 7.375;

/** A nominal 2x6 deck board faces 5½", laid with a 3/16" gap. */
export const BOARD_FACE_IN = 5.5;
export const BOARD_GAP_IN = 0.1875;

export interface DeckObservation {
  /* ── counts, which is what a camera can honestly give ──────────────────── */
  /** Joists counted across the deck. */
  joistCount?: number | null;
  /** Measured on site or read off the visible spacing. */
  joistSpacingInches?: JoistSpacing | null;
  /** Deck boards counted across the run. */
  boardCount?: number | null;
  /** Which way the boards run relative to the house wall. */
  deckingDirection?: 'parallel' | 'perpendicular' | null;
  /** Treads counted on the flight. */
  riserCount?: number | null;
  footingCount?: number | null;
  postCount?: number | null;

  /* ── what the framing is, where it is visible ──────────────────────────── */
  joistSize?: LumberSize | null;
  beamSize?: LumberSize | null;
  beamPlies?: number | null;
  postSize?: PostSize | null;
  /** Bolted to the house, or standing on its own posts. */
  ledgerAttached?: boolean | null;
  guardrail?: boolean | null;
  stairs?: boolean | null;
  stairWidthFt?: number | null;

  /* ── anything anybody actually measured ────────────────────────────────── */
  statedWidthFt?: number | null;
  statedDepthFt?: number | null;
  statedHeightFt?: number | null;

  /** Straight from the model: what it could not see. Never discarded. */
  couldNotSee?: string[] | null;
}

export interface DeckReading {
  /** Ready for `buildMembers`, `deckStructural` and `DeckViewer3D`. */
  deck: DeckModel;
  width: Measured;
  depth: Measured;
  height: Measured;
  /**
   * True when any of the three dimensions is an assumption. Nothing priced
   * from this goes to a customer while it is true.
   */
  needsMeasurement: boolean;
  /** What to put in front of Eric before he sends anything. */
  unknowns: string[];
}

const ft = (n: number) => Math.round(n * 100) / 100;

/** A positive, finite count. Absent, zero and nonsense are all "not counted". */
function count(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** A positive, finite measurement in feet. */
function feet(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const stated = (value: number, what: string): Measured => ({
  value: ft(value), basis: 'stated', low: ft(value), high: ft(value),
  how: `${what} as measured on site`,
});

const assumed = (value: number, what: string): Measured => ({
  value: ft(value), basis: 'assumed', low: ft(value), high: ft(value),
  how: `${what} NOT established — assumed ${ft(value)} ft and needs measuring`,
});

/**
 * Height from the flight.
 *
 * The strongest thing a camera gives you. Rise is bounded by code at 7" to
 * 7¾", so four treads put the deck between 2.33 ft and 2.58 ft — a quarter of
 * a foot of uncertainty on a figure that otherwise had none.
 */
export function heightFromRisers(risers: number): Measured {
  return {
    value: ft(risers * RISER_TYPICAL_IN / 12),
    basis: 'riser-count',
    low: ft(risers * RISER_MIN_IN / 12),
    high: ft(risers * RISER_MAX_IN / 12),
    how: `${risers} riser${risers === 1 ? '' : 's'} at 7"–7¾" (code band)`,
  };
}

/**
 * The span the joists are spread across, from how many there are.
 *
 * `n` joists at `s` inches on centre cover `(n - 1) * s`. The range carries one
 * spacing either way, because the last bay is whatever is left over and the
 * rim is outside the count.
 */
export function spanFromJoists(joists: number, spacingIn: number): Measured {
  const centre = (joists - 1) * spacingIn / 12;
  return {
    value: ft(centre),
    basis: 'joist-count',
    low: ft(Math.max(0, centre - spacingIn / 24)),
    high: ft(centre + spacingIn / 12),
    how: `${joists} joists at ${spacingIn}" on centre`,
  };
}

/**
 * The run the boards cover, from how many there are.
 *
 * Face plus gap, times the count. Tight to within a board, which on a real
 * deck is the most accurate figure available short of a tape.
 */
export function runFromBoards(boards: number): Measured {
  const each = (BOARD_FACE_IN + BOARD_GAP_IN) / 12;
  return {
    value: ft(boards * each),
    basis: 'board-count',
    low: ft(boards * BOARD_FACE_IN / 12),
    high: ft(boards * (BOARD_FACE_IN + BOARD_GAP_IN * 2) / 12),
    how: `${boards} boards at 5½" plus a 3/16" gap`,
  };
}

/**
 * Everything above, in precedence order, with the deck assembled from it.
 *
 * Precedence is deliberate and is the whole safety argument: a figure somebody
 * measured beats one counted off a video, and a counted one beats an
 * assumption. Only the last of those sets `needsMeasurement`.
 */
export function deckFromObservation(
  o: DeckObservation | null | undefined,
  /**
   * What to fall back to when something was not established. Passed in
   * rather than imported: `DEFAULT_DECK` is a value in the browser bundle
   * and this file cannot reach it — see the note at the top. The browser
   * hands over `DEFAULT_DECK`; the server hands over the same shape.
   */
  fallback: DeckModel,
): DeckReading {
  const obs = o || {};

  const joists = count(obs.joistCount);
  const spacing = ([12, 16, 24] as const).includes(obs.joistSpacingInches as any)
    ? Number(obs.joistSpacingInches) as JoistSpacing
    : null;
  const boards = count(obs.boardCount);
  const risers = count(obs.riserCount);

  /*
   * WHICH WAY THE BOARDS RUN DECIDES WHICH DIMENSION THEY MEASURE.
   *
   * `deckingDirection` is relative to the house wall. Boards parallel to the
   * wall stack out from it, so the count measures DEPTH. Boards perpendicular
   * run out from the wall and stack sideways, so the count measures WIDTH.
   * Getting this backwards swaps the deck's dimensions, which is why it is
   * stated here rather than assumed anywhere.
   */
  const direction = obs.deckingDirection === 'perpendicular' ? 'perpendicular'
    : obs.deckingDirection === 'parallel' ? 'parallel'
    : null;

  const boardsMeasure = direction === 'parallel' ? 'depth'
    : direction === 'perpendicular' ? 'width'
    : null;

  /* ── width: along the house ─────────────────────────────────────────────── */
  const statedW = feet(obs.statedWidthFt);
  const width: Measured = statedW ? stated(statedW, 'Width')
    : (joists && spacing) ? spanFromJoists(joists, spacing)
    : (boards && boardsMeasure === 'width') ? runFromBoards(boards)
    : assumed(fallback.widthFt, 'Width');

  /* ── depth: out from the house ──────────────────────────────────────────── */
  const statedD = feet(obs.statedDepthFt);
  const depth: Measured = statedD ? stated(statedD, 'Depth')
    : (boards && boardsMeasure === 'depth') ? runFromBoards(boards)
    : assumed(fallback.depthFt, 'Depth');

  /* ── height above grade ─────────────────────────────────────────────────── */
  const statedH = feet(obs.statedHeightFt);
  const height: Measured = statedH ? stated(statedH, 'Height')
    : risers ? heightFromRisers(risers)
    : assumed(fallback.heightFt, 'Height above grade');

  /*
   * Post spacing from the footings that are actually there, because the
   * existing deck's posts are a fact rather than a preference. One footing is
   * not a spacing, so it falls back — and a spacing wider than the deck is a
   * miscount, not a 40-foot bay.
   */
  const footings = count(obs.footingCount);
  const postsFromFootings = footings && footings > 1
    ? width.value / (footings - 1)
    : null;
  const postSpacingFt = postsFromFootings && postsFromFootings > 0 && postsFromFootings <= width.value
    ? ft(postsFromFootings)
    : fallback.postSpacingFt;

  const deck: DeckModel = {
    ...fallback,
    widthFt: width.value,
    depthFt: depth.value,
    heightFt: height.value,
    joistSize: obs.joistSize || fallback.joistSize,
    joistSpacing: spacing || fallback.joistSpacing,
    beamSize: obs.beamSize || fallback.beamSize,
    beamPlies: count(obs.beamPlies) || fallback.beamPlies,
    postSize: obs.postSize || fallback.postSize,
    postSpacingFt,
    // `false` is an observation and must survive; absent falls back.
    ledgerAttached: typeof obs.ledgerAttached === 'boolean' ? obs.ledgerAttached : fallback.ledgerAttached,
    guardrail: typeof obs.guardrail === 'boolean' ? obs.guardrail : fallback.guardrail,
    stairs: typeof obs.stairs === 'boolean' ? obs.stairs : (risers ? true : fallback.stairs),
    stairWidthFt: feet(obs.stairWidthFt) || fallback.stairWidthFt,
    deckingDirection: direction || fallback.deckingDirection,
  };

  const unknowns: string[] = [];
  for (const [name, m] of [['Width', width], ['Depth', depth], ['Height', height]] as const) {
    if (m.basis === 'assumed') unknowns.push(`${name} was not established from the site media.`);
  }
  if (!spacing) unknowns.push('Joist spacing was not established — 16" on centre assumed.');
  if (!footings) unknowns.push('Footings were not counted.');
  for (const line of (Array.isArray(obs.couldNotSee) ? obs.couldNotSee : [])) {
    const t = String(line || '').trim();
    if (t) unknowns.push(t);
  }

  return {
    deck,
    width,
    depth,
    height,
    needsMeasurement: [width, depth, height].some((m) => m.basis === 'assumed'),
    unknowns,
  };
}
