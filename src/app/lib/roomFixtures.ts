/**
 * Appliances, fixtures, and the clearances they are required to have.
 *
 * WHY THE CLEARANCES ARE HERE AND NOT IN SOMEBODY'S HEAD
 *
 * A kitchen or a bathroom that does not fit is not a drawing problem, it is a
 * demolition problem — the cabinets are hung, the toilet is set, and the
 * inspector measures fifteen inches from the centreline to the vanity and finds
 * fourteen. These numbers are the ones that get checked, so the layout is
 * checked against them as it is drawn rather than after it is built.
 *
 * Two different kinds of rule live here and they are deliberately labelled:
 *
 *   code         From the IRC. Not negotiable — a layout that breaks one of
 *                these fails inspection.
 *   recommended  NKBA planning guidance. Breaking one produces a kitchen that
 *                works badly rather than one that is refused, so it is reported
 *                as a warning and the builder decides.
 *
 * Conflating the two would be the worst outcome: either code violations get
 * shrugged off as preferences, or sensible compromises get treated as illegal.
 *
 * All dimensions in inches.
 */

export type Severity = 'code' | 'recommended';

export interface FixtureSpec {
  id: string;
  label: string;
  /** Along the wall. */
  widthIn: number;
  /** Out from the wall. */
  depthIn: number;
  room: 'kitchen' | 'bathroom' | 'both';
  /** Sizes this is commonly made in, for the picker. */
  widthsIn?: number[];
  /** Clear floor space required in front of it. */
  clearFrontIn?: number;
  note?: string;
}

export const KITCHEN_FIXTURES: FixtureSpec[] = [
  { id: 'range', label: 'Range', widthIn: 30, depthIn: 25, room: 'kitchen', widthsIn: [24, 30, 36, 48], clearFrontIn: 40,
    note: 'Landing space required both sides — 12in one, 15in the other.' },
  { id: 'cooktop', label: 'Cooktop', widthIn: 30, depthIn: 22, room: 'kitchen', widthsIn: [30, 36, 48], clearFrontIn: 40 },
  { id: 'wall-oven', label: 'Wall oven', widthIn: 30, depthIn: 24, room: 'kitchen', widthsIn: [24, 27, 30], clearFrontIn: 40 },
  { id: 'dishwasher', label: 'Dishwasher', widthIn: 24, depthIn: 24, room: 'kitchen', widthsIn: [18, 24], clearFrontIn: 40,
    note: 'Needs 21in of standing space beside it to load.' },
  { id: 'fridge', label: 'Refrigerator', widthIn: 36, depthIn: 30, room: 'kitchen', widthsIn: [30, 33, 36, 42, 48], clearFrontIn: 40,
    note: 'Allow an air gap; a cabinet tight to the case runs it hot.' },
  { id: 'sink', label: 'Sink', widthIn: 33, depthIn: 22, room: 'kitchen', widthsIn: [24, 30, 33, 36], clearFrontIn: 40,
    note: 'Landing space 24in one side, 18in the other.' },
  { id: 'microwave', label: 'Microwave', widthIn: 30, depthIn: 15, room: 'kitchen', widthsIn: [24, 30, 36] },
];

export const BATHROOM_FIXTURES: FixtureSpec[] = [
  { id: 'toilet', label: 'Toilet', widthIn: 20, depthIn: 28, room: 'bathroom', clearFrontIn: 21,
    note: 'Centreline at least 15in from any wall or fixture; 21in clear in front.' },
  { id: 'lavatory', label: 'Basin', widthIn: 24, depthIn: 21, room: 'bathroom', widthsIn: [18, 24, 30, 36], clearFrontIn: 21 },
  { id: 'vanity', label: 'Vanity', widthIn: 36, depthIn: 21, room: 'bathroom', widthsIn: [24, 30, 36, 42, 48, 60, 72], clearFrontIn: 21 },
  { id: 'tub', label: 'Bath', widthIn: 60, depthIn: 30, room: 'bathroom', widthsIn: [54, 60, 66, 72], clearFrontIn: 21 },
  { id: 'shower', label: 'Shower', widthIn: 36, depthIn: 36, room: 'bathroom', widthsIn: [30, 32, 36, 42, 48, 60], clearFrontIn: 24,
    note: 'Minimum 30in x 30in finished interior, and 24in clear at the opening.' },
  { id: 'bidet', label: 'Bidet', widthIn: 20, depthIn: 28, room: 'bathroom', clearFrontIn: 21 },
];

export function fixturesFor(room: 'kitchen' | 'bathroom'): FixtureSpec[] {
  return room === 'kitchen' ? KITCHEN_FIXTURES : BATHROOM_FIXTURES;
}

export interface PlacedFixture {
  id: string;
  specId: string;
  label: string;
  widthIn: number;
  depthIn: number;
  /** Which wall run it sits against. */
  runId?: string;
  /** Position along that wall from its left end. */
  offsetIn: number;
}

/* ── the numbers that get checked ────────────────────────────────────────── */

/** IRC: centreline of a toilet to any wall or fixture. */
export const TOILET_CENTRE_CLEAR_IN = 15;
/** IRC: clear space in front of a toilet. */
export const TOILET_FRONT_CLEAR_IN = 21;
/** IRC: a shower's finished interior must be at least this on each side... */
export const SHOWER_MIN_SIDE_IN = 30;
/** ...and enclose at least this area. */
export const SHOWER_MIN_AREA_SQIN = 900;
/** NKBA: walkway through a kitchen. */
export const KITCHEN_WALKWAY_IN = 36;
/** NKBA: working aisle between opposing runs, one cook. */
export const KITCHEN_AISLE_ONE_COOK_IN = 42;
/** NKBA: working aisle, two cooks. */
export const KITCHEN_AISLE_TWO_COOKS_IN = 48;
/** NKBA: standing space beside a dishwasher to load it. */
export const DISHWASHER_STANDING_IN = 21;
/** IRC: intermittent mechanical ventilation for a bathroom, in CFM. */
export const BATH_VENT_CFM = 50;

export interface Finding {
  severity: Severity;
  /** Which rule, so it can be looked up and argued with. */
  rule: string;
  message: string;
}

/**
 * Ventilation required for a bathroom.
 *
 * A window can satisfy the IRC where it opens, but a fan is specified anyway on
 * anything with a shower or a bath: the code minimum keeps the inspector happy
 * and does not keep the moisture out of the framing.
 */
export function bathVentCfm(roomAreaSqFt: number, hasShowerOrTub: boolean): number {
  if (!hasShowerOrTub) return BATH_VENT_CFM;
  // A common sizing rule: one CFM per square foot, floored at the code minimum.
  return Math.max(BATH_VENT_CFM, Math.ceil(roomAreaSqFt));
}

/**
 * Check a bathroom layout against the rules that get measured.
 *
 * Returns findings rather than refusing to draw. A layout that breaks a rule
 * still has to be visible — half the job is showing the customer why the room
 * cannot hold what they asked for.
 */
export function checkBathroom(opts: {
  roomWidthIn: number;
  roomLengthIn: number;
  fixtures: PlacedFixture[];
}): Finding[] {
  const out: Finding[] = [];
  const { fixtures } = opts;

  const toilets = fixtures.filter(f => f.specId === 'toilet');
  for (const t of toilets) {
    const centre = t.offsetIn + t.widthIn / 2;

    // Against the ends of the wall.
    if (centre < TOILET_CENTRE_CLEAR_IN) {
      out.push({ severity: 'code', rule: 'IRC R307.1',
        message: `The toilet centreline is ${Math.round(centre)}in from the wall. It must be at least ${TOILET_CENTRE_CLEAR_IN}in.` });
    }
    const fromFarEnd = opts.roomWidthIn - centre;
    if (fromFarEnd < TOILET_CENTRE_CLEAR_IN) {
      out.push({ severity: 'code', rule: 'IRC R307.1',
        message: `The toilet centreline is ${Math.round(fromFarEnd)}in from the far wall. It must be at least ${TOILET_CENTRE_CLEAR_IN}in.` });
    }

    // Against everything else on the same wall.
    for (const other of fixtures) {
      if (other.id === t.id || other.runId !== t.runId) continue;
      const oc = other.offsetIn + other.widthIn / 2;
      const gap = Math.abs(centre - oc) - other.widthIn / 2;
      if (gap < TOILET_CENTRE_CLEAR_IN) {
        out.push({ severity: 'code', rule: 'IRC R307.1',
          message: `Only ${Math.round(gap)}in from the toilet centreline to the ${other.label.toLowerCase()}. ${TOILET_CENTRE_CLEAR_IN}in is the minimum.` });
      }
    }

    if (opts.roomLengthIn < TOILET_FRONT_CLEAR_IN + 28) {
      out.push({ severity: 'code', rule: 'IRC R307.1',
        message: `The room is too shallow for ${TOILET_FRONT_CLEAR_IN}in of clear space in front of the toilet.` });
    }
  }

  for (const s of fixtures.filter(f => f.specId === 'shower')) {
    if (s.widthIn < SHOWER_MIN_SIDE_IN || s.depthIn < SHOWER_MIN_SIDE_IN) {
      out.push({ severity: 'code', rule: 'IRC P2708.1',
        message: `The shower is ${s.widthIn}in x ${s.depthIn}in. Each side must be at least ${SHOWER_MIN_SIDE_IN}in.` });
    }
    if (s.widthIn * s.depthIn < SHOWER_MIN_AREA_SQIN) {
      out.push({ severity: 'code', rule: 'IRC P2708.1',
        message: `The shower encloses ${s.widthIn * s.depthIn} square inches. ${SHOWER_MIN_AREA_SQIN} is the minimum.` });
    }
  }

  // Everything on one wall has to physically fit on it.
  const byRun = new Map<string, PlacedFixture[]>();
  for (const f of fixtures) {
    const k = f.runId || '_';
    byRun.set(k, [...(byRun.get(k) || []), f]);
  }
  for (const [, list] of byRun) {
    const sorted = [...list].sort((a, b) => a.offsetIn - b.offsetIn);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      if (sorted[i].offsetIn < prev.offsetIn + prev.widthIn - 0.01) {
        out.push({ severity: 'code', rule: 'fit',
          message: `The ${sorted[i].label.toLowerCase()} overlaps the ${prev.label.toLowerCase()}.` });
      }
    }
  }

  return out;
}

/**
 * Check a kitchen against NKBA planning guidance.
 *
 * All `recommended`. None of this fails an inspection; all of it is the
 * difference between a kitchen somebody enjoys and one they put up with.
 */
export function checkKitchen(opts: {
  aisleIn?: number;
  cooks?: 1 | 2;
  fixtures: PlacedFixture[];
  runLengthIn?: number;
}): Finding[] {
  const out: Finding[] = [];
  const cooks = opts.cooks || 1;
  const need = cooks === 2 ? KITCHEN_AISLE_TWO_COOKS_IN : KITCHEN_AISLE_ONE_COOK_IN;

  if (typeof opts.aisleIn === 'number' && opts.aisleIn > 0) {
    if (opts.aisleIn < KITCHEN_WALKWAY_IN) {
      out.push({ severity: 'recommended', rule: 'NKBA 5',
        message: `The aisle is ${opts.aisleIn}in. Below ${KITCHEN_WALKWAY_IN}in it is uncomfortable to walk through, let alone work in.` });
    } else if (opts.aisleIn < need) {
      out.push({ severity: 'recommended', rule: 'NKBA 6',
        message: `The aisle is ${opts.aisleIn}in. ${need}in is recommended for ${cooks === 2 ? 'two cooks' : 'one cook'}.` });
    }
  }

  const range = opts.fixtures.find(f => f.specId === 'range' || f.specId === 'cooktop');
  if (range && typeof opts.runLengthIn === 'number') {
    const leftIn = range.offsetIn;
    const rightIn = opts.runLengthIn - (range.offsetIn + range.widthIn);
    if (Math.max(leftIn, rightIn) < 15 || Math.min(leftIn, rightIn) < 12) {
      out.push({ severity: 'recommended', rule: 'NKBA 21',
        message: `Landing space beside the hob is ${Math.round(leftIn)}in and ${Math.round(rightIn)}in. 15in one side and 12in the other is the guidance — there is nowhere to put a hot pan otherwise.` });
    }
  }

  const dw = opts.fixtures.find(f => f.specId === 'dishwasher');
  const sink = opts.fixtures.find(f => f.specId === 'sink');
  if (dw && sink) {
    const gap = Math.abs((dw.offsetIn + dw.widthIn / 2) - (sink.offsetIn + sink.widthIn / 2));
    if (gap > 36 + sink.widthIn / 2) {
      out.push({ severity: 'recommended', rule: 'NKBA 20',
        message: 'The dishwasher is more than three feet from the sink. Loading it means carrying dripping plates across the kitchen.' });
    }
  }

  return out;
}

/** Findings that would fail an inspection, as opposed to advice. */
export function codeFailures(findings: Finding[]): Finding[] {
  return findings.filter(f => f.severity === 'code');
}
