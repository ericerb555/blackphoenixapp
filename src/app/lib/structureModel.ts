/**
 * Framed structures with a roof — and the loads that decide whether they stand.
 *
 * WHAT THIS COVERS
 *
 * A lean-to over some coolers, a pavilion, a carport, a porch roof, an
 * overhang, a gazebo and a pergola are the same structure with different
 * switches: posts on footings, beams carrying rafters, a roof plane at some
 * pitch, either hung off a building or standing on its own. Six tools would be
 * the same arithmetic six times, free to disagree.
 *
 * WHY IT IS NOT THE DECK TOOL
 *
 * The deck designer sizes joists and beams for people standing on a flat
 * surface — 40 psf live, 10 dead, and gravity pulling straight down through the
 * span. A roof carries snow, and snow behaves differently in three ways that
 * matter in New Hampshire:
 *
 *   It is heavier. Ground snow in southern NH runs 50–70 psf against a deck's
 *   40, and it does not walk away in the spring the way a crowd does.
 *
 *   It depends on the slope. A steep slippery roof sheds; a shallow one holds
 *   everything that lands on it. That is the Cs factor below, and ignoring it
 *   overstates a steep roof and understates a flat one.
 *
 *   It depends on whether the building is heated. An open cover over coolers is
 *   unheated, so nothing melts off it from underneath. Ct is 1.2 rather than
 *   1.0, which is a twenty percent difference nobody would notice was missing.
 *
 * Using deck numbers for a roof would be wrong in a direction that matters, so
 * this file does the roof arithmetic properly.
 *
 * WHAT IT IS NOT
 *
 * It is not a stamp. It produces real spans, real member sizes and real
 * reactions, computed rather than guessed, so an architect is checking work
 * instead of doing it. Everything it assumes, it states.
 */

/* ── the shape of the thing ───────────────────────────────────────────── */

export type StructureForm =
  /** Single slope, high side against a building. The classic lean-to. */
  | 'lean-to'
  /** Single slope, free-standing on posts both sides. */
  | 'shed'
  /** Two slopes off a ridge. Pavilion, carport, porch. */
  | 'gable'
  /** Near-flat, pitched only enough to drain. */
  | 'flat'
  /** Cantilevered off the wall — no posts at the outer edge. */
  | 'overhang';

export type Support =
  /** Hung off the building on a ledger at the high side. */
  | 'ledger'
  /** Standing on its own posts all round. */
  | 'free'
  /** Ledger one side, posts the other. Most lean-tos. */
  | 'ledger-and-posts';

export type Covering =
  | 'metal-panel' | 'asphalt-shingle' | 'polycarbonate' | 'open-slats' | 'none';

export interface CoveringSpec {
  id: Covering;
  label: string;
  /** Dead load of the covering itself, psf. */
  deadPsf: number;
  /** Slippery surfaces shed snow, which reduces the load they carry. */
  slippery: boolean;
  /** Shallowest pitch it may be laid at, as rise per 12. */
  minPitch: number;
  note?: string;
}

export const COVERINGS: CoveringSpec[] = [
  { id: 'metal-panel', label: 'Metal panel', deadPsf: 1.5, slippery: true, minPitch: 0.5,
    note: 'Sheds snow well, which is why it carries less of it.' },
  { id: 'asphalt-shingle', label: 'Asphalt shingle', deadPsf: 2.5, slippery: false, minPitch: 2,
    note: 'Not permitted below 2:12, and needs a doubled underlayment under 4:12.' },
  { id: 'polycarbonate', label: 'Polycarbonate', deadPsf: 1.0, slippery: true, minPitch: 1,
    note: 'Lets light through. Check the panel span rating against the purlin spacing.' },
  { id: 'open-slats', label: 'Open slats (pergola)', deadPsf: 3.0, slippery: false, minPitch: 0,
    note: 'Carries no snow load — it falls through. The slats are dead load only.' },
  { id: 'none', label: 'Frame only', deadPsf: 0, slippery: false, minPitch: 0 },
];

export interface StructureModel {
  form: StructureForm;
  support: Support;
  covering: Covering;
  /** Along the building, or the long side of a free-standing structure. */
  widthFt: number;
  /** Out from the building. For a gable, the full span across both slopes. */
  projectionFt: number;
  /** Underside of the beam at the low side — the headroom you walk under. */
  eaveHeightFt: number;
  /** Rise per 12 of run. 0 is not allowed on anything that must drain. */
  pitch: number;
  /** Centres, inches. */
  rafterSpacingIn: number;
  /** Along the beam, feet. More posts means a smaller beam. */
  postSpacingFt: number;
  postSize: '4x4' | '6x6' | '8x8';
}

export const DEFAULT_STRUCTURE: StructureModel = {
  form: 'lean-to',
  support: 'ledger-and-posts',
  covering: 'metal-panel',
  widthFt: 16,
  projectionFt: 10,
  eaveHeightFt: 8,
  pitch: 2,
  rafterSpacingIn: 24,
  postSpacingFt: 8,
  postSize: '6x6',
};

/* ── snow ─────────────────────────────────────────────────────────────── */

/** Roof slope in degrees, from rise per 12. */
export function pitchDegrees(pitch: number): number {
  return (Math.atan(Math.max(0, pitch) / 12) * 180) / Math.PI;
}

/** True length of a rafter for a given horizontal run. */
export function rafterLengthFt(runFt: number, pitch: number): number {
  return runFt * Math.sqrt(1 + (pitch / 12) ** 2);
}

export interface SnowInput {
  /** From the building department. Southern NH is typically 50–70. */
  groundSnowPsf: number;
  pitch: number;
  slippery: boolean;
  /** An open cover over coolers is unheated; a conditioned porch is not. */
  heated: boolean;
  /** Sheltered by trees or taller buildings, or standing in the open. */
  exposure: 'sheltered' | 'partial' | 'exposed';
}

/**
 * The slope factor, Cs.
 *
 * Snow slides off a steep slippery roof and sits on a shallow one. ASCE 7
 * draws this as a line that starts shedding at 5 degrees for a cold slippery
 * roof and at 30 degrees otherwise, reaching zero at 70. Implemented as that
 * line rather than as a table so it answers for any pitch.
 */
export function slopeFactor(pitch: number, slippery: boolean, heated: boolean): number {
  const deg = pitchDegrees(pitch);
  // An unheated roof is treated as the cold case, which sheds later.
  const start = slippery ? (heated ? 5 : 15) : 30;
  if (deg <= start) return 1;
  if (deg >= 70) return 0;
  return Math.max(0, 1 - (deg - start) / (70 - start));
}

export interface SnowResult {
  /** Flat-roof snow load, psf. */
  flatPsf: number;
  /** Sloped-roof snow load, psf — what the rafters actually carry. */
  slopedPsf: number;
  ce: number;
  ct: number;
  cs: number;
  /** Said out loud, because every one of these is a judgement. */
  assumptions: string[];
}

/**
 * Roof snow, by the ASCE 7 route the IRC points at.
 *
 *   pf = 0.7 · Ce · Ct · Is · pg      flat roof
 *   ps = Cs · pf                       sloped roof
 *
 * Importance factor is held at 1.0. A cover over stock could be argued down to
 * 0.8 as a minor structure, and that argument belongs to whoever signs the
 * drawing rather than to this function — taking it here would quietly shave
 * twenty percent off every member.
 */
export function roofSnow(input: SnowInput): SnowResult {
  const pg = Math.max(0, input.groundSnowPsf);
  const ce = input.exposure === 'exposed' ? 0.9 : input.exposure === 'sheltered' ? 1.2 : 1.0;
  const ct = input.heated ? 1.0 : 1.2;
  const is = 1.0;

  const flat = 0.7 * ce * ct * is * pg;
  const cs = slopeFactor(input.pitch, input.slippery, input.heated);
  const sloped = cs * flat;

  const assumptions = [
    `Ground snow ${pg} psf — confirm with the building department.`,
    `Exposure ${input.exposure} (Ce ${ce}).`,
    input.heated
      ? 'Treated as heated (Ct 1.0).'
      : 'Treated as unheated (Ct 1.2) — nothing melts off an open cover from below.',
    `Slope factor ${cs.toFixed(2)} at ${pitchDegrees(input.pitch).toFixed(0)}°`
      + `${input.slippery ? ' on a slippery covering' : ''}.`,
    'Importance factor 1.0. Reducing it is the engineer\'s call, not ours.',
    // The minimum below is the one people forget on shallow roofs.
    'Minimum roof live load of 20 psf applied where snow works out lighter.',
  ];

  return { flatPsf: round1(flat), slopedPsf: round1(sloped), ce, ct, cs, assumptions };
}

/* ── members ──────────────────────────────────────────────────────────── */

export interface Lumber {
  label: string;
  /** Actual, not nominal. A 2x8 is 1.5 by 7.25. */
  bIn: number;
  dIn: number;
}

export const RAFTER_SIZES: Lumber[] = [
  { label: '2x6', bIn: 1.5, dIn: 5.5 },
  { label: '2x8', bIn: 1.5, dIn: 7.25 },
  { label: '2x10', bIn: 1.5, dIn: 9.25 },
  { label: '2x12', bIn: 1.5, dIn: 11.25 },
];

export const BEAM_SIZES: Lumber[] = [
  { label: '(2) 2x8', bIn: 3.0, dIn: 7.25 },
  { label: '(2) 2x10', bIn: 3.0, dIn: 9.25 },
  { label: '(2) 2x12', bIn: 3.0, dIn: 11.25 },
  { label: '(3) 2x10', bIn: 4.5, dIn: 9.25 },
  { label: '(3) 2x12', bIn: 4.5, dIn: 11.25 },
  { label: '(4) 2x12', bIn: 6.0, dIn: 11.25 },
];

/**
 * SPF No.2, which is what actually turns up on a lumber yard delivery here.
 *
 * Fb is the base bending value before adjustment; the repetitive-member factor
 * is applied to rafters at 24in centres or closer and not to a beam, which
 * stands alone.
 */
const FB_PSI = 875;
const E_PSI = 1_400_000;
const REPETITIVE = 1.15;

/** Section modulus, in³. */
const sectionModulus = (l: Lumber) => (l.bIn * l.dIn ** 2) / 6;
/** Second moment of area, in⁴. */
const inertia = (l: Lumber) => (l.bIn * l.dIn ** 3) / 12;

export interface MemberCheck {
  size: string;
  /** Clear span, feet. */
  spanFt: number;
  /** Uniform load carried, pounds per linear foot. */
  loadPlf: number;
  bendingOk: boolean;
  deflectionOk: boolean;
  /** Worst of the two, as a fraction of allowable. Over 1.0 fails. */
  utilisation: number;
  /** Actual deflection as a denominator: 240 means L/240. */
  deflectionRatio: number;
}

/**
 * Check one simple span.
 *
 * Bending:    M = wL²/8, needs S ≥ M/Fb
 * Deflection: Δ = 5wL⁴/(384EI), limited to L/240 for a roof with no ceiling
 *
 * Simple span rather than continuous, which is the conservative reading and the
 * one that matches how these are usually built — rafters landing on a beam,
 * beams landing on posts.
 */
export function checkMember(
  lumber: Lumber, spanFt: number, loadPlf: number, repetitive: boolean,
): MemberCheck {
  const L = Math.max(0.1, spanFt) * 12; // inches
  const w = Math.max(0, loadPlf) / 12;  // lb per inch
  const fb = FB_PSI * (repetitive ? REPETITIVE : 1);

  const moment = (w * L * L) / 8;                 // lb·in
  const sReq = moment / fb;                       // in³
  const s = sectionModulus(lumber);
  const bendingOk = s >= sReq;

  const deflection = (5 * w * L ** 4) / (384 * E_PSI * inertia(lumber));
  const allowed = L / 240;
  const deflectionOk = deflection <= allowed;

  return {
    size: lumber.label,
    spanFt: round1(spanFt),
    loadPlf: round1(loadPlf),
    bendingOk,
    deflectionOk,
    utilisation: round2(Math.max(sReq / s, deflection / allowed)),
    deflectionRatio: deflection > 0 ? Math.round(L / deflection) : 9999,
  };
}

/** The smallest listed size that passes, or null when none does. */
export function smallestThatWorks(
  sizes: Lumber[], spanFt: number, loadPlf: number, repetitive: boolean,
): MemberCheck | null {
  for (const size of sizes) {
    const check = checkMember(size, spanFt, loadPlf, repetitive);
    if (check.bendingOk && check.deflectionOk) return check;
  }
  return null;
}

/* ── the whole structure ──────────────────────────────────────────────── */

export interface StructureResult {
  snow: SnowResult;
  /** Total downward load on the roof plane, psf. */
  totalPsf: number;
  rafter: MemberCheck | null;
  rafterSpanFt: number;
  beam: MemberCheck | null;
  beamSpanFt: number;
  /** Load arriving at one post, pounds. */
  postLoadLb: number;
  posts: number;
  /** Things that are wrong, or worth knowing before building. */
  warnings: string[];
}

export function computeStructure(
  m: StructureModel, groundSnowPsf: number,
  opts: { heated?: boolean; exposure?: SnowInput['exposure'] } = {},
): StructureResult {
  const covering = COVERINGS.find(c => c.id === m.covering) || COVERINGS[0];
  const warnings: string[] = [];

  const heated = opts.heated ?? false;
  const snow = roofSnow({
    groundSnowPsf, pitch: m.pitch, slippery: covering.slippery,
    heated, exposure: opts.exposure ?? 'partial',
  });

  // Slats let snow through, so they carry their own weight and nothing else.
  const snowPsf = m.covering === 'open-slats' ? 0 : Math.max(snow.slopedPsf, 20);
  const framingPsf = 4;
  const totalPsf = snowPsf + covering.deadPsf + framingPsf;

  if (m.pitch < covering.minPitch) {
    warnings.push(
      `${covering.label} needs at least ${covering.minPitch}:12 and this is ${m.pitch}:12.`,
    );
  }
  if (m.pitch === 0 && m.covering !== 'open-slats') {
    warnings.push('A dead-flat roof does not drain. Give it at least a quarter inch per foot.');
  }

  // A gable spans half the width to the ridge; everything else spans the lot.
  const rafterRunFt = m.form === 'gable' ? m.projectionFt / 2 : m.projectionFt;
  const rafterSpanFt = rafterLengthFt(rafterRunFt, m.pitch);
  const rafterTribFt = m.rafterSpacingIn / 12;
  const rafter = smallestThatWorks(RAFTER_SIZES, rafterSpanFt, totalPsf * rafterTribFt, true);
  if (!rafter) {
    warnings.push(
      `No rafter up to 2x12 spans ${rafterSpanFt.toFixed(1)}ft at ${m.rafterSpacingIn}in centres `
      + `under ${Math.round(totalPsf)} psf. Close the spacing, add a mid-span beam, or use engineered joists.`,
    );
  }

  // The beam carries half the rafter run either side of it.
  const beamTribFt = m.form === 'overhang' ? rafterRunFt : rafterRunFt / 2;
  const beamSpanFt = m.postSpacingFt;
  const beam = m.form === 'overhang' || m.support === 'ledger'
    ? null
    : smallestThatWorks(BEAM_SIZES, beamSpanFt, totalPsf * beamTribFt, false);
  if (!beam && m.form !== 'overhang' && m.support !== 'ledger') {
    warnings.push(
      `No beam up to (4) 2x12 spans ${beamSpanFt}ft under this load. Bring the posts closer together.`,
    );
  }

  const posts = m.form === 'overhang' || m.support === 'ledger'
    ? 0
    : Math.max(2, Math.ceil(m.widthFt / Math.max(1, m.postSpacingFt)) + 1);
  const postLoadLb = posts > 0
    ? Math.round(totalPsf * beamTribFt * m.postSpacingFt)
    : 0;

  if (m.form === 'overhang' && m.projectionFt > 4) {
    warnings.push(
      `A ${m.projectionFt}ft cantilever off the wall is a lot. Past about four feet this wants `
      + 'posts or a knee brace, and the wall framing needs checking for the uplift at the back.',
    );
  }
  if (m.postSize === '4x4' && postLoadLb > 4000) {
    warnings.push(`${postLoadLb} lb on a 4x4 is too much. Use 6x6.`);
  }
  if (m.form === 'lean-to' && m.support === 'free') {
    warnings.push('A lean-to by definition leans on something. Either give it a ledger or call it a shed roof.');
  }

  return {
    snow, totalPsf: round1(totalPsf),
    rafter, rafterSpanFt: round1(rafterSpanFt),
    beam, beamSpanFt: round1(beamSpanFt),
    postLoadLb, posts, warnings,
  };
}

const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
