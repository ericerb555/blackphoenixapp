/**
 * Patios, walkways, granite steps and retaining walls.
 *
 * WHY THIS IS NOT THE FLOORING TOOL
 *
 * A floor is an area and a waste factor. Hardscape looks like that and is not,
 * because almost none of the cost is the thing you can see.
 *
 * Under a patio in New Hampshire there is eight to twelve inches of compacted
 * gravel, and that base is routinely more material by weight and more money
 * than the pavers on top of it. Before the base goes in, the same volume has to
 * come out and go somewhere — excavation and disposal are usually the largest
 * single line on the estimate and the one most often left off entirely.
 *
 * So this works from the hole up: dig depth, base, bedding, then the surface.
 * Getting that order right is what stops an estimate being short by half.
 *
 * THE OTHER THING THAT CATCHES PEOPLE
 *
 * Granite steps are not an area. They are units, sized to the rise, priced each
 * and heavy enough that setting them is a machine and a crew rather than a
 * afternoon. A six foot tread is roughly seven hundred pounds. Estimating them
 * by square footage produces a number that is wrong in both directions at once.
 */

/* ── surfaces ─────────────────────────────────────────────────────────── */

export type SurfaceUse = 'patio' | 'walkway' | 'driveway' | 'landing';

export interface UseSpec {
  id: SurfaceUse;
  label: string;
  /** Compacted base under it, inches. Driveways carry vehicles. */
  baseDepthIn: number;
  note: string;
}

export const USES: UseSpec[] = [
  { id: 'patio', label: 'Patio', baseDepthIn: 8, note: 'Foot traffic. Eight inches of base is the northern standard.' },
  { id: 'walkway', label: 'Walkway', baseDepthIn: 6, note: 'Narrow and light, so it can take a little less base.' },
  { id: 'driveway', label: 'Driveway', baseDepthIn: 12, note: 'Vehicles. Twelve inches, and it wants compacting in lifts.' },
  { id: 'landing', label: 'Landing', baseDepthIn: 8, note: 'At a door, so it must hold its level against frost.' },
];

export type PaverMaterial =
  | 'concrete-paver' | 'clay-brick' | 'bluestone' | 'granite-block'
  | 'patio-block' | 'permeable-paver';

export interface PaverSpec {
  id: PaverMaterial;
  label: string;
  sku: string;
  thicknessIn: number;
  note?: string;
}

export const PAVERS: PaverSpec[] = [
  { id: 'concrete-paver', label: 'Concrete paver', sku: 'hardscape:paver-concrete', thicknessIn: 2.375 },
  { id: 'clay-brick', label: 'Clay brick', sku: 'hardscape:brick-clay', thicknessIn: 2.25 },
  { id: 'bluestone', label: 'Bluestone', sku: 'hardscape:bluestone', thicknessIn: 1.5,
    note: 'Thinner, so it wants a well-compacted base — it will telegraph anything soft underneath.' },
  { id: 'granite-block', label: 'Granite block', sku: 'hardscape:granite-block', thicknessIn: 4 },
  { id: 'patio-block', label: 'Patio block', sku: 'hardscape:patio-block', thicknessIn: 2 },
  { id: 'permeable-paver', label: 'Permeable paver', sku: 'hardscape:paver-permeable', thicknessIn: 3.125,
    note: 'Open-graded stone base instead of processed gravel, and it drains rather than sheds.' },
];

/**
 * Laying patterns, and what each throws away.
 *
 * Waste is cuts, and cuts are geometry: a pattern running at forty-five degrees
 * to the edges of the patio meets every edge on a diagonal and produces two
 * offcuts per course, most of them unusable. A running bond meets the edge
 * square and loses very little.
 */
export const PATTERNS = [
  { id: 'running-bond', label: 'Running bond', wastePct: 5 },
  { id: 'stack-bond', label: 'Stack bond', wastePct: 5 },
  { id: 'basketweave', label: 'Basketweave', wastePct: 6 },
  { id: 'herringbone-90', label: 'Herringbone 90°', wastePct: 8 },
  { id: 'herringbone-45', label: 'Herringbone 45°', wastePct: 14 },
  { id: 'random-ashlar', label: 'Random ashlar', wastePct: 10 },
  { id: 'circle-kit', label: 'Circle kit', wastePct: 15 },
] as const;

export type PatternId = typeof PATTERNS[number]['id'];

export interface Surface {
  id: string;
  name: string;
  use: SurfaceUse;
  material: PaverMaterial;
  pattern: PatternId;
  /** Given as dimensions, or as an area when it is not a rectangle. */
  lengthFt: number;
  widthFt: number;
  areaSqFt?: number;
  /** Edge restraint runs round the open edges, not the ones against a building. */
  perimeterFt?: number;
  /** Depth of bedding sand or stone dust under the units. */
  beddingIn: number;
}

export const BEDDING_IN = 1;

/* ── granite steps ────────────────────────────────────────────────────── */

export interface GraniteStep {
  id: string;
  /** Along the face. */
  lengthFt: number;
  /** Front to back. */
  depthIn: number;
  /** The rise it makes. */
  riseIn: number;
  quantity: number;
  finish: 'thermal' | 'split' | 'polished';
}

/** Granite runs about 168 pounds per cubic foot. */
export const GRANITE_PCF = 168;

export function stepWeightLb(s: GraniteStep): number {
  const cuFt = s.lengthFt * (s.depthIn / 12) * (s.riseIn / 12);
  return Math.round(cuFt * GRANITE_PCF);
}

/**
 * Whether it can be set by hand.
 *
 * Two people manage a couple of hundred pounds on flat ground. Past that it is
 * a machine, and that changes the day rather than the material — which is why
 * it is reported rather than left for somebody to discover on site.
 */
export function needsMachine(s: GraniteStep): boolean {
  return stepWeightLb(s) > 400;
}

/* ── retaining walls ──────────────────────────────────────────────────── */

export interface RetainingWall {
  id: string;
  lengthFt: number;
  /** Exposed height above finished grade. */
  heightFt: number;
  /** Face area of one block, and how tall a course is. */
  blockLengthIn: number;
  blockHeightIn: number;
  hasCap: boolean;
}

/** Above this, a wall wants engineering and usually a permit. */
export const WALL_ENGINEER_HEIGHT_FT = 4;

/* ── the takeoff ──────────────────────────────────────────────────────── */

/** Compacted crushed gravel, tons per cubic yard. */
export const GRAVEL_TONS_PER_CY = 1.4;
/** Bedding sand or stone dust. */
export const SAND_TONS_PER_CY = 1.35;
/**
 * Base is placed in lifts and compacts. Order by the finished depth and you
 * come up short, so an allowance goes on the order rather than being discovered
 * halfway through.
 */
export const COMPACTION_ALLOWANCE_PCT = 20;
/** Excavated material bulks up once it is dug, so the trucking is larger. */
export const BULKING_PCT = 25;
/** A 50 lb bag of polymeric sand, over standard joints. */
export const POLY_SAND_SQFT_PER_BAG = 80;

export function surfaceArea(s: Surface): number {
  if (typeof s.areaSqFt === 'number' && s.areaSqFt > 0) return s.areaSqFt;
  return Math.max(0, s.lengthFt) * Math.max(0, s.widthFt);
}

export function surfacePerimeter(s: Surface): number {
  if (typeof s.perimeterFt === 'number' && s.perimeterFt > 0) return s.perimeterFt;
  return 2 * (Math.max(0, s.lengthFt) + Math.max(0, s.widthFt));
}

export interface HardscapeTakeoff {
  /** Laid area, before waste. */
  areaSqFt: number;
  /** What to order, after the pattern's cuts. */
  paversToOrderSqFt: number;
  wastePct: number;
  /** How deep the hole is: base + bedding + the unit itself. */
  digDepthIn: number;
  excavationCuYd: number;
  /** What leaves the site, after it bulks up. */
  disposalCuYd: number;
  baseCuYd: number;
  baseTons: number;
  beddingCuYd: number;
  beddingTons: number;
  edgeRestraintFt: number;
  polySandBags: number;
  /** Granite, separately, because it is units rather than area. */
  stepCount: number;
  stepWeightLb: number;
  machineNeeded: boolean;
  wallFaceSqFt: number;
  wallBlocks: number;
  wallCapFt: number;
  notes: string[];
}

export function computeHardscape(
  surfaces: Surface[], steps: GraniteStep[], walls: RetainingWall[],
): HardscapeTakeoff {
  const notes: string[] = [];
  let areaSqFt = 0, orderSqFt = 0, excavationCuFt = 0;
  let baseCuFt = 0, beddingCuFt = 0, edgeFt = 0;
  let wastePctWeighted = 0;

  for (const s of surfaces) {
    const area = surfaceArea(s);
    if (area <= 0) continue;
    const use = USES.find(u => u.id === s.use) || USES[0];
    const paver = PAVERS.find(p => p.id === s.material) || PAVERS[0];
    const pattern = PATTERNS.find(p => p.id === s.pattern) || PATTERNS[0];

    areaSqFt += area;
    orderSqFt += area * (1 + pattern.wastePct / 100);
    wastePctWeighted += pattern.wastePct * area;

    const bedding = Math.max(0, s.beddingIn || BEDDING_IN);
    const dig = use.baseDepthIn + bedding + paver.thicknessIn;

    excavationCuFt += area * (dig / 12);
    baseCuFt += area * (use.baseDepthIn / 12);
    beddingCuFt += area * (bedding / 12);
    edgeFt += surfacePerimeter(s);

    if (s.material === 'permeable-paver') {
      notes.push(
        `${s.name}: permeable pavers want open-graded stone rather than processed gravel, `
        + 'and the base doubles as the reservoir — check the depth against the rainfall it has to hold.',
      );
    }
    if (s.use === 'driveway' && paver.thicknessIn < 2.75) {
      notes.push(
        `${s.name}: ${paver.label} at ${paver.thicknessIn}in is thin for a driveway. `
        + 'Vehicles want at least 2¾in.',
      );
    }
  }

  const stepCount = steps.reduce((n, s) => n + Math.max(0, s.quantity), 0);
  const stepWeight = steps.reduce((n, s) => n + stepWeightLb(s) * Math.max(0, s.quantity), 0);
  const machine = steps.some(needsMachine);
  if (machine) {
    const heaviest = steps.reduce((a, b) => (stepWeightLb(a) > stepWeightLb(b) ? a : b));
    notes.push(
      `The heaviest step is about ${stepWeightLb(heaviest)} lb. That is a machine and a`
      + ' crew, not two people — allow for the equipment and the access to get it in.',
    );
  }

  let wallFace = 0, wallBlocks = 0, wallCap = 0;
  for (const w of walls) {
    const face = Math.max(0, w.lengthFt) * Math.max(0, w.heightFt);
    wallFace += face;
    const perBlock = (Math.max(1, w.blockLengthIn) / 12) * (Math.max(1, w.blockHeightIn) / 12);
    wallBlocks += Math.ceil(face / perBlock);
    if (w.hasCap) wallCap += w.lengthFt;

    // A buried first course is standard practice and easy to leave out.
    notes.push(
      `${w.heightFt}ft wall: bury the first course and allow six inches of base under it, `
      + 'plus drainage stone and a pipe behind.',
    );
    if (w.heightFt > WALL_ENGINEER_HEIGHT_FT) {
      notes.push(
        `A ${w.heightFt}ft wall is over the ${WALL_ENGINEER_HEIGHT_FT}ft mark — that normally `
        + 'needs an engineer and a permit, and often geogrid back into the bank.',
      );
    }
  }

  const cuYd = (cuFt: number) => Math.round((cuFt / 27) * 100) / 100;
  const baseCy = cuYd(baseCuFt * (1 + COMPACTION_ALLOWANCE_PCT / 100));
  const beddingCy = cuYd(beddingCuFt);

  if (areaSqFt > 0) {
    notes.push(
      `Base ordered with ${COMPACTION_ALLOWANCE_PCT}% on top, because it is placed in lifts and`
      + ' compacts down. Order the finished depth and you come up short.',
    );
    notes.push(
      `Spoil bulks about ${BULKING_PCT}% once it is dug, so the trucking is larger than the hole.`,
    );
  }

  return {
    areaSqFt: round1(areaSqFt),
    // Rounded before it is ceilinged. 300 square feet at fourteen percent is
    // 342, but in floating point it comes out a hair over and ceilings to 343 —
    // an extra square foot ordered on every job, quietly, forever.
    paversToOrderSqFt: Math.ceil(round2(orderSqFt)),
    wastePct: areaSqFt > 0 ? round1(wastePctWeighted / areaSqFt) : 0,
    digDepthIn: surfaces.length
      ? round1(excavationCuFt * 12 / Math.max(1, areaSqFt))
      : 0,
    excavationCuYd: cuYd(excavationCuFt),
    disposalCuYd: cuYd(excavationCuFt * (1 + BULKING_PCT / 100)),
    baseCuYd: baseCy,
    baseTons: round1(baseCy * GRAVEL_TONS_PER_CY),
    beddingCuYd: beddingCy,
    beddingTons: round1(beddingCy * SAND_TONS_PER_CY),
    edgeRestraintFt: Math.ceil(edgeFt),
    polySandBags: Math.ceil(areaSqFt / POLY_SAND_SQFT_PER_BAG),
    stepCount,
    stepWeightLb: Math.round(stepWeight),
    machineNeeded: machine,
    wallFaceSqFt: round1(wallFace),
    wallBlocks,
    wallCapFt: Math.ceil(wallCap),
    notes,
  };
}

const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
