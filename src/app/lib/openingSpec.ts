/**
 * A window or door specified well enough to order.
 *
 * WHY THIS IS SEPARATE FROM THE SCHEDULE
 *
 * `openingsModel.ts` counts openings and prices them. That is a quote. This is
 * the specification a supplier needs to actually make and ship the unit, and an
 * incomplete one does not produce a cheap order — it produces the wrong window.
 *
 * THE FIVE THINGS THAT MAKE AN ORDER SCRAP
 *
 * Everything here exists because of one of these, and they are worth stating
 * because they are not obvious from the outside:
 *
 *   handing            a door hung the wrong way round is unusable, not
 *                      inconvenient. It is the commonest bad order there is.
 *   rough opening      the wall is one dimension and the unit ordered is
 *                      another. Carrying one of them is guessing at the other.
 *   tempered glazing   required beside doors, at tubs and stairs, and under a
 *                      low sill. Missed, it fails inspection after fitting.
 *   egress             a bedroom window has a minimum clear opening, which
 *                      rules out some styles at some sizes outright.
 *   frame type         fin, block or retrofit flange decides whether the unit
 *                      fits the opening that actually exists.
 *
 * Residential and commercial share this spine and differ in what hangs off it.
 * Two forms would be two things to keep in step.
 *
 * BUILT TO BE SENT TO A VENDOR, NOT ONLY PRINTED
 *
 * The intention is that vendors arrive with APIs and these specifications are
 * submitted to them directly. That decides how the fields are typed: anything a
 * vendor has to act on is a **coded value** rather than free text, because
 * "Left" and "LH" and "left hand" are one fact typed three ways, and a
 * mapping table can translate a code where it can do nothing with prose.
 *
 * So style, frame type, handing, swing and grid pattern are unions. What stays
 * free text is deliberately the part no two vendors agree on anyway — colour
 * names, product lines, glass packages — and those get resolved per vendor by
 * a lookup, not by hoping the strings match.
 *
 * The practical test applied throughout: could this record be POSTed to a
 * supplier and come back as the right unit? Where the answer is no, the field
 * is a blocking problem rather than a warning.
 */

import type { DimensionSource } from './exteriorModel';

export type Market = 'residential' | 'commercial';

export type OpeningType = 'window' | 'entry-door' | 'patio-door' | 'interior-door' | 'storefront';

export type WindowStyle =
  | 'double-hung' | 'single-hung' | 'casement' | 'awning' | 'slider'
  | 'picture' | 'bay' | 'bow' | 'hopper' | 'garden';

export type DoorSwing = 'inswing' | 'outswing';
export type Handing = 'left' | 'right';

/** How the unit meets the wall. Decides whether it fits at all. */
export type FrameType = 'nailing-fin' | 'block-frame' | 'retrofit-flange';

export type GridPattern = 'none' | 'colonial' | 'prairie' | 'diamond' | 'custom';

export interface OpeningSpec {
  id: string;
  /** W1, D2 — what the schedule, the drawing and the delivery all call it. */
  mark: string;
  location: string;
  quantity: number;
  type: OpeningType;

  /** The hole in the wall. */
  roughWidthIn: number;
  roughHeightIn: number;
  /** What gets ordered. Always smaller than the rough opening. */
  unitWidthIn: number;
  unitHeightIn: number;
  source: DimensionSource;

  // ── windows ────────────────────────────────────────────────────────────
  style?: WindowStyle;
  frameType?: FrameType;
  frameMaterial?: string;
  exteriorColour?: string;
  interiorFinish?: string;
  glassPackage?: string;
  tempered?: boolean;
  /** Bedrooms and basements. Checked against the clear opening below. */
  egressRequired?: boolean;
  grids?: GridPattern;
  gridPattern?: string;
  screens?: boolean;
  /** Aluminium wrap to the exterior trim. Material by the foot plus labour. */
  capping?: boolean;
  extensionJambs?: boolean;
  jambDepthIn?: number;

  // ── doors ──────────────────────────────────────────────────────────────
  handing?: Handing;
  swing?: DoorSwing;
  prehung?: boolean;
  slabOnly?: boolean;
  lockPrep?: string;
  threshold?: string;

  // ── commercial ─────────────────────────────────────────────────────────
  framingSeries?: string;
  framingFinish?: string;
  fireRating?: string;
  panicHardware?: boolean;
  closer?: boolean;
  adaThreshold?: boolean;

  /**
   * Insert into the existing frame, or take the whole thing out.
   *
   * Lives on the specification rather than only on the quote because it decides
   * both: roughly double the labour, and a different unit — a retrofit flange
   * for an insert, a nailing fin for a full frame.
   */
  fit?: 'insert' | 'full-frame';

  // ── ordering ───────────────────────────────────────────────────────────
  supplier?: string;
  productLine?: string;
  /** Typed from the supplier's quote. A window is not bought by type. */
  unitPrice?: number;
  notes?: string;
}

export const WINDOW_STYLES: Array<{ id: WindowStyle; label: string; opensFully: boolean }> = [
  { id: 'double-hung', label: 'Double hung', opensFully: false },
  { id: 'single-hung', label: 'Single hung', opensFully: false },
  { id: 'casement', label: 'Casement', opensFully: true },
  { id: 'awning', label: 'Awning', opensFully: false },
  { id: 'slider', label: 'Slider', opensFully: false },
  { id: 'picture', label: 'Picture (fixed)', opensFully: false },
  { id: 'bay', label: 'Bay', opensFully: false },
  { id: 'bow', label: 'Bow', opensFully: false },
  { id: 'hopper', label: 'Hopper', opensFully: false },
  { id: 'garden', label: 'Garden', opensFully: false },
];

export const isDoor = (t: OpeningType) =>
  t === 'entry-door' || t === 'patio-door' || t === 'interior-door';

/**
 * The clear opening a window actually gives when it is open.
 *
 * Not the unit size. A double-hung only opens half its height, and a slider
 * only half its width, so the same 36 by 60 unit passes egress as a casement
 * and fails it as a double-hung. This is exactly the trap the check exists for.
 *
 * Frame and sash eat roughly two inches each way, which is the allowance used
 * here — deliberately conservative, because being told a window passes when it
 * does not is worse than being told to check.
 */
export function clearOpening(spec: OpeningSpec): { widthIn: number; heightIn: number; sqFt: number } {
  const w = Math.max(0, (Number(spec.unitWidthIn) || 0) - 2);
  const h = Math.max(0, (Number(spec.unitHeightIn) || 0) - 2);
  if (!w || !h) return { widthIn: 0, heightIn: 0, sqFt: 0 };

  let cw = w;
  let ch = h;
  switch (spec.style) {
    case 'double-hung':
    case 'single-hung':
      ch = h / 2;
      break;
    case 'slider':
      cw = w / 2;
      break;
    case 'picture':
    case 'bay':
    case 'bow':
    case 'garden':
      return { widthIn: 0, heightIn: 0, sqFt: 0 }; // does not open at all
    default:
      break; // casement, awning and hopper swing clear
  }
  return {
    widthIn: Math.round(cw * 10) / 10,
    heightIn: Math.round(ch * 10) / 10,
    sqFt: Math.round(((cw * ch) / 144) * 100) / 100,
  };
}

export const clearOpeningSqFt = (spec: OpeningSpec) => clearOpening(spec).sqFt;

/** IRC minimums for an emergency escape opening. */
const EGRESS_MIN_SQFT = 5.7;
const EGRESS_MIN_WIDTH_IN = 20;
const EGRESS_MIN_HEIGHT_IN = 24;

export interface SpecProblem {
  mark: string;
  field: string;
  severity: 'blocking' | 'check';
  message: string;
}

/**
 * What is wrong with this specification.
 *
 * `blocking` means the order should not be placed — the unit would be wrong or
 * would not fit. `check` means a person has to make a judgement, usually about
 * code, and the software should not decide it for them.
 *
 * Nothing here is inferred silently. An opening that cannot be checked is
 * reported as needing a look rather than passed as fine.
 */
export function checkSpec(spec: OpeningSpec, market: Market): SpecProblem[] {
  const out: SpecProblem[] = [];
  const mark = spec.mark || '(unmarked)';
  const add = (field: string, severity: SpecProblem['severity'], message: string) =>
    out.push({ mark, field, severity, message });

  if (!spec.mark?.trim()) {
    add('mark', 'blocking', 'No mark. The order, the schedule and the delivery need the same label.');
  }
  if (!(Number(spec.quantity) > 0)) {
    add('quantity', 'blocking', 'No quantity.');
  }

  const ru = Number(spec.roughWidthIn) || 0;
  const rh = Number(spec.roughHeightIn) || 0;
  const uw = Number(spec.unitWidthIn) || 0;
  const uh = Number(spec.unitHeightIn) || 0;

  if (!uw || !uh) {
    add('unitSize', 'blocking', 'No unit size. This is what gets ordered.');
  }
  if (!ru || !rh) {
    add('roughOpening', 'check', 'No rough opening recorded, so nobody can tell whether this unit fits the wall.');
  } else if (uw && uh && (uw > ru || uh > rh)) {
    // Refused rather than warned. A unit larger than its hole is not a judgement.
    add('unitSize', 'blocking',
      `Unit ${uw}×${uh} is larger than the rough opening ${ru}×${rh}.`);
  }

  if (isDoor(spec.type)) {
    // The commonest bad order there is, so it blocks rather than warns.
    if (!spec.handing) add('handing', 'blocking', 'No handing. A door hung the wrong way round cannot be fitted.');
    if (!spec.swing) add('swing', 'blocking', 'No swing direction.');
  } else if (spec.type === 'window') {
    if (!spec.style) add('style', 'blocking', 'No style, so the unit cannot be ordered or its egress checked.');
    if (!spec.frameType && market === 'residential') {
      add('frameType', 'check', 'No frame type. Fin, block or retrofit decides whether it fits the opening that exists.');
    }

    if (spec.egressRequired) {
      // Measured against the CLEAR opening, not the unit. A slider gives half
      // its width and a double-hung half its height, so checking the raw unit
      // size passes windows that fail — which is the whole reason this exists.
      const clear = clearOpening(spec);
      const styleLabel = WINDOW_STYLES.find(s => s.id === spec.style)?.label || 'this style';
      if (clear.sqFt <= 0) {
        add('egress', 'blocking', `${styleLabel} does not open, so it cannot serve as egress.`);
      } else {
        if (clear.sqFt < EGRESS_MIN_SQFT) {
          add('egress', 'blocking',
            `Clear opening is about ${clear.sqFt} sq ft as a ${styleLabel.toLowerCase()}; egress needs ${EGRESS_MIN_SQFT}.`);
        }
        if (clear.widthIn < EGRESS_MIN_WIDTH_IN) {
          add('egress', 'blocking',
            `Clear width is about ${clear.widthIn}in as a ${styleLabel.toLowerCase()}; egress needs ${EGRESS_MIN_WIDTH_IN}in.`);
        }
        if (clear.heightIn < EGRESS_MIN_HEIGHT_IN) {
          add('egress', 'blocking',
            `Clear height is about ${clear.heightIn}in as a ${styleLabel.toLowerCase()}; egress needs ${EGRESS_MIN_HEIGHT_IN}in.`);
        }
      }
    }
  }

  // Left as a prompt rather than a rule. Whether a pane is within the hazardous
  // locations the code lists depends on where it sits, which the form does not
  // know — and quietly deciding it either way would be worse than asking.
  if (!spec.tempered && spec.type !== 'interior-door') {
    add('tempered', 'check',
      'Is this within a hazardous location — beside a door, at a tub or stairs, or under an 18in sill? Those need tempered glass.');
  }

  if (market === 'commercial') {
    if (!spec.framingSeries) add('framingSeries', 'check', 'No framing series recorded.');
    if (isDoor(spec.type) && !spec.adaThreshold) {
      add('adaThreshold', 'check', 'Commercial doors on an accessible route need a compliant threshold.');
    }
  }

  if (!spec.supplier?.trim()) {
    add('supplier', 'check', 'No supplier, so this cannot be grouped onto a purchase order.');
  }

  return out;
}

/** Every problem across a schedule, worst first. */
export function checkSchedule(specs: OpeningSpec[], market: Market): SpecProblem[] {
  const all = (specs || []).flatMap(s => checkSpec(s, market));
  return all.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'blocking' ? -1 : 1));
}

export const isOrderable = (specs: OpeningSpec[], market: Market) =>
  !checkSchedule(specs, market).some(p => p.severity === 'blocking');

/**
 * The schedule split into the orders it produces.
 *
 * A purchase order goes to one supplier, so a job taking windows from one house
 * and doors from another is two orders off one schedule. Grouping here rather
 * than at print time means the count of orders is visible while the schedule is
 * still being edited.
 */
export interface SupplierOrder {
  supplier: string;
  lines: OpeningSpec[];
  units: number;
  total: number;
  priced: boolean;
}

/**
 * One opening as a vendor's API would want it.
 *
 * Flat, coded, and carrying the mark so a response can be matched back to the
 * row it came from. Kept here rather than inside whichever integration is
 * written first, so that adding a second vendor means adding a mapping and not
 * a second idea of what an opening is.
 *
 * Dimensions go out in inches with the unit named, because a number without a
 * unit is how a 36 becomes 36 centimetres somewhere downstream.
 */
export function toVendorPayload(spec: OpeningSpec, market: Market) {
  return {
    mark: spec.mark,
    quantity: Math.max(0, Math.round(Number(spec.quantity) || 0)),
    market,
    type: spec.type,
    dimensions: {
      unit: 'in',
      roughWidth: Number(spec.roughWidthIn) || null,
      roughHeight: Number(spec.roughHeightIn) || null,
      width: Number(spec.unitWidthIn) || null,
      height: Number(spec.unitHeightIn) || null,
    },
    window: spec.type === 'window' ? {
      style: spec.style || null,
      frameType: spec.frameType || null,
      frameMaterial: spec.frameMaterial || null,
      grids: spec.grids && spec.grids !== 'none' ? { pattern: spec.grids, layout: spec.gridPattern || null } : null,
      screens: spec.screens ?? null,
      egressRequired: spec.egressRequired ?? false,
    } : null,
    door: isDoor(spec.type) ? {
      handing: spec.handing || null,
      swing: spec.swing || null,
      prehung: spec.prehung ?? null,
      slabOnly: spec.slabOnly ?? null,
      lockPrep: spec.lockPrep || null,
      threshold: spec.threshold || null,
    } : null,
    commercial: market === 'commercial' ? {
      framingSeries: spec.framingSeries || null,
      framingFinish: spec.framingFinish || null,
      fireRating: spec.fireRating || null,
      panicHardware: spec.panicHardware ?? null,
      closer: spec.closer ?? null,
      adaThreshold: spec.adaThreshold ?? null,
    } : null,
    glazing: { package: spec.glassPackage || null, tempered: spec.tempered ?? false },
    finishes: { exterior: spec.exteriorColour || null, interior: spec.interiorFinish || null },
    productLine: spec.productLine || null,
    notes: spec.notes || null,
  };
}

export function groupForOrdering(specs: OpeningSpec[]): SupplierOrder[] {
  const by = new Map<string, OpeningSpec[]>();
  for (const s of specs || []) {
    if (!(Number(s.quantity) > 0)) continue;
    const key = (s.supplier || '').trim() || 'Unassigned';
    by.set(key, [...(by.get(key) || []), s]);
  }
  return [...by.entries()].map(([supplier, lines]) => {
    const units = lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0);
    const total = Math.round(lines.reduce(
      (n, l) => n + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0) * 100) / 100;
    return {
      supplier, lines, units, total,
      priced: lines.every(l => Number(l.unitPrice) > 0),
    };
  }).sort((a, b) => a.supplier.localeCompare(b.supplier));
}
