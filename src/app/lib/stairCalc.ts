/**
 * Stair layout, worked the way it is worked on site.
 *
 * Two measurements go in: total rise from the finished landing surface to the
 * finished deck surface, and how much room there is to run out. Everything else
 * is derived.
 *
 * The word "finished" is doing real work in that sentence. Measuring to the top
 * of a joist instead of the decking, or to grade instead of the finished pad,
 * throws every riser out — and the error is discovered after the stringers are
 * cut. The UI says so; this module assumes it has been done properly.
 *
 * Code basis: IRC R311.7 with the deck-specific allowances of R507.10.
 * Prescriptive only — verify against the locally adopted edition.
 */

/** IRC R311.7.5.1 — maximum riser height for residential stairs. */
export const MAX_RISER_IN = 7.75;
/** IRC R311.7.5.2 — minimum tread depth. */
export const MIN_TREAD_IN = 10;
/** IRC R311.7.5.1 — largest and smallest riser must be within this. */
export const MAX_RISER_VARIATION_IN = 0.375;
/** Comfortable target; not a code limit. */
export const COMFORT_RISER_IN = 7;

export interface StairInput {
  /** Finished landing surface to finished deck surface, inches. */
  totalRiseIn: number;
  /** Room available from the deck edge out to the far side of the landing pad. */
  availableRunIn: number;
  treadDepthIn: number;
  /** Thickness of the tread material — matters for the bottom riser cut. */
  treadThicknessIn: number;
  stairWidthIn: number;
}

export const DEFAULT_STAIR: StairInput = {
  totalRiseIn: 0,
  availableRunIn: 0,
  treadDepthIn: 11,
  treadThicknessIn: 1,
  stairWidthIn: 48,
};

export interface StairResult {
  computable: boolean;
  riserCount: number;
  riserHeightIn: number;
  treadCount: number;
  totalRunIn: number;
  stringerLengthIn: number;
  /** What to cut the bottom of the stringer down by. */
  bottomRiserCutIn: number;
  fitsAvailableRun: boolean;
  runShortfallIn: number;
  handrailRequired: boolean;
  landingRequired: boolean;
  stringerCount: number;
  failures: string[];
  cautions: string[];
  /** Alternatives worth seeing when the first answer does not fit. */
  options: { riserCount: number; riserHeightIn: number; totalRunIn: number; fits: boolean }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Feet-and-inches, the way it gets called out on site. */
export function asFeetInches(inches: number): string {
  const total = Math.round(inches * 16) / 16;
  const ft = Math.floor(total / 12);
  const rem = total - ft * 12;
  const whole = Math.floor(rem);
  const frac = rem - whole;
  const sixteenths = Math.round(frac * 16);
  let fracStr = '';
  if (sixteenths > 0) {
    let n = sixteenths, d = 16;
    while (n % 2 === 0 && d > 1) { n /= 2; d /= 2; }
    fracStr = ` ${n}/${d}`;
  }
  return ft > 0 ? `${ft}' ${whole}${fracStr}"` : `${whole}${fracStr}"`;
}

export function calcStairs(input: StairInput): StairResult {
  const { totalRiseIn, availableRunIn, treadDepthIn, treadThicknessIn, stairWidthIn } = input;
  const failures: string[] = [];
  const cautions: string[] = [];

  if (!(totalRiseIn > 0)) {
    return {
      computable: false, riserCount: 0, riserHeightIn: 0, treadCount: 0, totalRunIn: 0,
      stringerLengthIn: 0, bottomRiserCutIn: 0, fitsAvailableRun: false, runShortfallIn: 0,
      handrailRequired: false, landingRequired: false, stringerCount: 0,
      failures: [], cautions: [], options: [],
    };
  }

  // Fewest risers that keep each one at or under the code maximum.
  const minRisers = Math.ceil(totalRiseIn / MAX_RISER_IN);
  // Then look for the count closest to a comfortable 7in.
  const comfortRisers = Math.max(minRisers, Math.round(totalRiseIn / COMFORT_RISER_IN));

  const build = (count: number) => {
    const riser = totalRiseIn / count;
    // The top "tread" is the deck surface itself, so there is one fewer tread
    // than riser. Counting an extra tread is how a set of stairs ends up a
    // tread too long for the pad.
    const treads = count - 1;
    const run = treads * treadDepthIn;
    return { riserCount: count, riserHeightIn: round2(riser), totalRunIn: round2(run), fits: availableRunIn <= 0 || run <= availableRunIn };
  };

  const options: StairResult['options'] = [];
  for (let c = minRisers; c <= minRisers + 3; c++) options.push(build(c));

  // Prefer the comfortable count if it actually fits the space; otherwise take
  // the first option that fits; otherwise fall back to the comfortable one and
  // report the shortfall rather than silently picking something unbuildable.
  const comfort = options.find(o => o.riserCount === comfortRisers);
  const chosen =
    (comfort && comfort.fits ? comfort : options.find(o => o.fits)) ||
    comfort ||
    options[0];

  const riser = chosen.riserHeightIn;
  const treads = chosen.riserCount - 1;
  const totalRun = chosen.totalRunIn;
  const stringer = round2(Math.sqrt(totalRiseIn ** 2 + totalRun ** 2));

  if (riser > MAX_RISER_IN) {
    failures.push(`Riser height ${riser}" exceeds the ${MAX_RISER_IN}" maximum. Add a riser.`);
  }
  if (treadDepthIn < MIN_TREAD_IN) {
    failures.push(`Tread depth ${treadDepthIn}" is below the ${MIN_TREAD_IN}" minimum.`);
  }
  if (availableRunIn > 0 && totalRun > availableRunIn) {
    failures.push(
      `Needs ${asFeetInches(totalRun)} of run but only ${asFeetInches(availableRunIn)} is available. Move the landing pad out, or turn the stairs.`,
    );
  }
  if (stairWidthIn < 36) {
    failures.push('Stairs serving a deck must be at least 36" wide.');
  }

  if (riser < 4) {
    cautions.push(`A ${riser}" riser is very shallow and easy to trip on — consider fewer risers.`);
  }
  // Rule of thumb: 2 risers + 1 tread should land near 25in.
  const blondel = 2 * riser + treadDepthIn;
  if (blondel < 24 || blondel > 26) {
    cautions.push(
      `2×riser + tread = ${round2(blondel)}" — comfortable stairs land between 24" and 26". These will feel ${blondel < 24 ? 'cramped' : 'stretched'}.`,
    );
  }
  if (chosen.riserCount >= 4) {
    cautions.push('Four or more risers means a graspable handrail is required, 34"–38" above the tread nosings.');
  }

  return {
    computable: true,
    riserCount: chosen.riserCount,
    riserHeightIn: riser,
    treadCount: treads,
    totalRunIn: totalRun,
    stringerLengthIn: stringer,
    // The stringer sits on the pad, so the bottom riser is short by one tread
    // thickness unless the stringer is cut down by exactly that. This is the
    // classic error: stringers cut without it give an oversized bottom step,
    // which is both a trip hazard and an inspection failure on riser variation.
    bottomRiserCutIn: round2(treadThicknessIn),
    fitsAvailableRun: availableRunIn <= 0 || totalRun <= availableRunIn,
    runShortfallIn: availableRunIn > 0 ? round2(Math.max(0, totalRun - availableRunIn)) : 0,
    handrailRequired: chosen.riserCount >= 4,
    landingRequired: true,
    // One stringer per 16in of width, minimum three, so treads do not deflect.
    stringerCount: Math.max(3, Math.ceil(stairWidthIn / 16) + 1),
    failures,
    cautions,
    options,
  };
}
