/**
 * Cabinets, and the schedule that gets ordered from them.
 *
 * WHY THIS IS BUILT FROM STANDARD SIZES RATHER THAN FREE DIMENSIONS
 *
 * A kitchen is not laid out by drawing rectangles of any width. Cabinets come
 * in fixed nominal widths — 9, 12, 15, 18 and up in three-inch steps — and a
 * run of wall is filled with those plus a filler strip to take up the
 * remainder. Designing in free dimensions produces a drawing that cannot be
 * ordered, which is the failure that matters: the picture looks right, the
 * schedule goes to the supplier, and what arrives does not fit the room.
 *
 * So the model works the way the trade works. You give it a wall length; it
 * returns real cabinets and tells you how much filler it needed.
 *
 * ON THE NOMENCLATURE
 *
 * The codes here are the ones suppliers use — B24 is a 24-inch base, W3030 is a
 * wall cabinet 30 wide by 30 high, SB36 a 36-inch sink base. They are not
 * decoration. A schedule that invents its own codes has to be translated by
 * hand at the counter, and that is where transcription errors enter an order.
 *
 * MEASUREMENTS ARE IN INCHES
 *
 * Everything internal is inches, because cabinets are specified in inches and
 * converting at every boundary is how a 34.5 becomes a 34 or a 35. Feet appear
 * only where a room is described.
 */

export type CabinetFamily = 'base' | 'wall' | 'tall' | 'vanity';

export type CabinetType =
  // base
  | 'base' | 'sink-base' | 'drawer-base' | 'base-blind-corner' | 'base-lazy-susan'
  // wall
  | 'wall' | 'wall-corner' | 'wall-microwave' | 'wall-open'
  // tall
  | 'pantry' | 'oven-cabinet'
  // bathroom
  | 'vanity' | 'vanity-sink' | 'linen';

export interface CabinetSpec {
  type: CabinetType;
  family: CabinetFamily;
  /** Supplier code prefix — B, W, SB, DB, BBC, T, VS. */
  prefix: string;
  label: string;
  defaultDepthIn: number;
  defaultHeightIn: number;
  /** Widths this type is actually made in. */
  widthsIn: number[];
  /** Doors, drawers — drives hardware counts and hanging labour. */
  doors: number;
  drawers: number;
}

/**
 * The standard width ladder. Three-inch steps are the industry grid; anything
 * between them is a filler, not a cabinet.
 */
export const CABINET_WIDTHS = [9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 42, 48];

/** Base cabinets sit at 34.5in so a 1.5in worktop lands the counter at 36in. */
export const BASE_HEIGHT_IN = 34.5;
export const COUNTER_THICKNESS_IN = 1.5;
export const COUNTER_HEIGHT_IN = BASE_HEIGHT_IN + COUNTER_THICKNESS_IN;
export const BASE_DEPTH_IN = 24;
/** Worktop overhangs the box, which is why it is deeper than the cabinet. */
export const COUNTER_DEPTH_IN = 25.5;
export const WALL_DEPTH_IN = 12;
/** Standard gap from worktop to the underside of the wall cabinets. */
export const BACKSPLASH_HEIGHT_IN = 18;
export const TOE_KICK_HEIGHT_IN = 4.5;
/** A filler wider than this should be another cabinet instead. */
export const MAX_FILLER_IN = 6;

export const CABINETS: Record<CabinetType, CabinetSpec> = {
  'base':              { type: 'base', family: 'base', prefix: 'B', label: 'Base', defaultDepthIn: 24, defaultHeightIn: 34.5, widthsIn: CABINET_WIDTHS, doors: 1, drawers: 1 },
  'sink-base':         { type: 'sink-base', family: 'base', prefix: 'SB', label: 'Sink base', defaultDepthIn: 24, defaultHeightIn: 34.5, widthsIn: [24, 27, 30, 33, 36, 42, 48], doors: 2, drawers: 0 },
  'drawer-base':       { type: 'drawer-base', family: 'base', prefix: 'DB', label: 'Drawer base', defaultDepthIn: 24, defaultHeightIn: 34.5, widthsIn: [12, 15, 18, 21, 24, 30, 36], doors: 0, drawers: 3 },
  'base-blind-corner': { type: 'base-blind-corner', family: 'base', prefix: 'BBC', label: 'Blind corner base', defaultDepthIn: 24, defaultHeightIn: 34.5, widthsIn: [36, 42, 48], doors: 1, drawers: 1 },
  'base-lazy-susan':   { type: 'base-lazy-susan', family: 'base', prefix: 'BLS', label: 'Lazy susan base', defaultDepthIn: 24, defaultHeightIn: 34.5, widthsIn: [33, 36], doors: 2, drawers: 0 },
  'wall':              { type: 'wall', family: 'wall', prefix: 'W', label: 'Wall', defaultDepthIn: 12, defaultHeightIn: 30, widthsIn: CABINET_WIDTHS, doors: 1, drawers: 0 },
  'wall-corner':       { type: 'wall-corner', family: 'wall', prefix: 'WDC', label: 'Wall corner', defaultDepthIn: 12, defaultHeightIn: 30, widthsIn: [24], doors: 1, drawers: 0 },
  'wall-microwave':    { type: 'wall-microwave', family: 'wall', prefix: 'WMC', label: 'Microwave cabinet', defaultDepthIn: 15, defaultHeightIn: 18, widthsIn: [30, 33, 36], doors: 1, drawers: 0 },
  'wall-open':         { type: 'wall-open', family: 'wall', prefix: 'WO', label: 'Open shelf', defaultDepthIn: 12, defaultHeightIn: 30, widthsIn: CABINET_WIDTHS, doors: 0, drawers: 0 },
  'pantry':            { type: 'pantry', family: 'tall', prefix: 'T', label: 'Pantry', defaultDepthIn: 24, defaultHeightIn: 90, widthsIn: [18, 24, 30, 33, 36], doors: 2, drawers: 0 },
  'oven-cabinet':      { type: 'oven-cabinet', family: 'tall', prefix: 'OC', label: 'Oven cabinet', defaultDepthIn: 24, defaultHeightIn: 90, widthsIn: [30, 33], doors: 2, drawers: 0 },
  'vanity':            { type: 'vanity', family: 'vanity', prefix: 'V', label: 'Vanity', defaultDepthIn: 21, defaultHeightIn: 34.5, widthsIn: [18, 24, 30, 36, 42, 48, 60], doors: 2, drawers: 0 },
  'vanity-sink':       { type: 'vanity-sink', family: 'vanity', prefix: 'VS', label: 'Vanity sink base', defaultDepthIn: 21, defaultHeightIn: 34.5, widthsIn: [24, 30, 36, 42, 48, 60], doors: 2, drawers: 0 },
  'linen':             { type: 'linen', family: 'tall', prefix: 'LC', label: 'Linen tower', defaultDepthIn: 21, defaultHeightIn: 84, widthsIn: [12, 15, 18, 24], doors: 1, drawers: 2 },
};

export interface Cabinet {
  id: string;
  type: CabinetType;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  /** Position along the run from its left end, in inches. */
  offsetIn: number;
  /** Which way the door swings. Matters against a wall or an appliance. */
  hinge?: 'left' | 'right' | 'pair';
  note?: string;
}

/** One straight length of wall, with cabinets along it. */
export interface CabinetRun {
  id: string;
  label: string;
  /** The wall this run occupies, in inches. */
  lengthIn: number;
  family: CabinetFamily;
  cabinets: Cabinet[];
  /** Left over after the cabinets — taken up with filler strips. */
  fillerIn: number;
}

let seq = 0;
const nextId = (p: string) => `${p}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** The supplier code for a cabinet: B24, W3030, SB36, T2490. */
export function cabinetCode(type: CabinetType, widthIn: number, heightIn?: number): string {
  const spec = CABINETS[type];
  const w = Math.round(widthIn);
  if (spec.family === 'wall' || spec.family === 'tall') {
    const h = Math.round(heightIn ?? spec.defaultHeightIn);
    return `${spec.prefix}${w}${h}`;
  }
  return `${spec.prefix}${w}`;
}

/** Nearest real width at or below what is asked for. Null if none fits. */
export function largestWidthUpTo(type: CabinetType, availableIn: number): number | null {
  const widths = CABINETS[type].widthsIn.filter(w => w <= availableIn);
  return widths.length ? Math.max(...widths) : null;
}

export interface FillOptions {
  /** Inches already taken by an appliance, an opening, or a run of worktop. */
  reservedIn?: number;
  /** Put a sink base in, and roughly where along the run it should land. */
  sink?: { widthIn: number; atIn?: number };
  /** Ranges and dishwashers are gaps in the cabinetry, not cabinets. */
  appliances?: Array<{ label: string; widthIn: number; atIn?: number }>;
  /** Cabinet height for a wall run — 30, 36 or 42 to the ceiling. */
  heightIn?: number;
}

/**
 * Fill a wall with real cabinets.
 *
 * Largest-first, which is how the trade does it: fewer, wider boxes cost less
 * per inch than many narrow ones and give fewer gaps to trim. Whatever is left
 * under the smallest cabinet becomes filler, and if that filler comes out wider
 * than `MAX_FILLER_IN` the caller is told — a seven-inch filler is a sign the
 * layout wants another cabinet rather than a very wide scribe.
 */
export function fillRun(
  label: string,
  lengthIn: number,
  family: CabinetFamily,
  opts: FillOptions = {},
): CabinetRun {
  const run: CabinetRun = {
    id: nextId('RUN'), label, lengthIn: Math.max(0, lengthIn), family, cabinets: [], fillerIn: 0,
  };

  const heightIn = opts.heightIn
    ?? (family === 'wall' ? 30 : family === 'tall' ? 90 : CABINETS[family === 'vanity' ? 'vanity' : 'base'].defaultHeightIn);
  const depthIn = family === 'wall' ? WALL_DEPTH_IN
    : family === 'vanity' ? CABINETS.vanity.defaultDepthIn
    : BASE_DEPTH_IN;

  // Fixed things first — they own their position, and cabinets fill around them.
  const fixed: Array<{ widthIn: number; atIn: number; kind: 'sink' | 'appliance'; label?: string }> = [];
  if (opts.sink && family !== 'wall') {
    fixed.push({ widthIn: opts.sink.widthIn, atIn: opts.sink.atIn ?? Math.max(0, (run.lengthIn - opts.sink.widthIn) / 2), kind: 'sink' });
  }
  for (const a of opts.appliances || []) {
    fixed.push({ widthIn: a.widthIn, atIn: a.atIn ?? 0, kind: 'appliance', label: a.label });
  }
  fixed.sort((a, b) => a.atIn - b.atIn);

  const sinkType: CabinetType = family === 'vanity' ? 'vanity-sink' : 'sink-base';
  const plainType: CabinetType = family === 'wall' ? 'wall'
    : family === 'tall' ? 'pantry'
    : family === 'vanity' ? 'vanity' : 'base';

  let cursor = 0;
  const usable = Math.max(0, run.lengthIn - (opts.reservedIn || 0));

  const fillGap = (from: number, to: number) => {
    let at = from;
    while (to - at >= Math.min(...CABINETS[plainType].widthsIn)) {
      const w = largestWidthUpTo(plainType, to - at);
      if (!w) break;
      run.cabinets.push({
        id: nextId('CAB'), type: plainType, widthIn: w, heightIn, depthIn, offsetIn: at,
      });
      at += w;
    }
    return to - at; // leftover
  };

  let leftover = 0;
  for (const f of fixed) {
    if (f.atIn > cursor) leftover += fillGap(cursor, Math.min(f.atIn, usable));
    if (f.kind === 'sink') {
      const w = largestWidthUpTo(sinkType, f.widthIn) ?? CABINETS[sinkType].widthsIn[0];
      run.cabinets.push({
        id: nextId('CAB'), type: sinkType, widthIn: w, heightIn, depthIn,
        offsetIn: f.atIn, hinge: 'pair', note: 'sink',
      });
      cursor = f.atIn + w;
    } else {
      // An appliance is a hole. Nothing is ordered for it; the run simply skips.
      cursor = f.atIn + f.widthIn;
    }
  }
  if (cursor < usable) leftover += fillGap(cursor, usable);

  run.fillerIn = Math.round(Math.max(0, leftover) * 100) / 100;
  return run;
}

/* ── the schedule ──────────────────────────────────────────────────────────
 *
 * Identical cabinets are collapsed into one line with a quantity, because a
 * supplier order lists "6 × B24", not six lines each saying B24. The mark is
 * what the drawing, the schedule and the delivery all call the same box.
 */

export interface ScheduleLine {
  mark: string;
  code: string;
  type: CabinetType;
  label: string;
  widthIn: number;
  heightIn: number;
  depthIn: number;
  quantity: number;
  doors: number;
  drawers: number;
  /** Which runs it appears in — so a line can be found on the drawing. */
  locations: string[];
}

export function buildSchedule(runs: CabinetRun[]): ScheduleLine[] {
  const byCode = new Map<string, ScheduleLine>();

  for (const run of runs) {
    for (const cab of run.cabinets) {
      const code = cabinetCode(cab.type, cab.widthIn, cab.heightIn);
      const key = `${code}|${cab.depthIn}`;
      const spec = CABINETS[cab.type];
      const existing = byCode.get(key);
      if (existing) {
        existing.quantity += 1;
        if (!existing.locations.includes(run.label)) existing.locations.push(run.label);
      } else {
        byCode.set(key, {
          mark: '', code, type: cab.type, label: spec.label,
          widthIn: cab.widthIn, heightIn: cab.heightIn, depthIn: cab.depthIn,
          quantity: 1, doors: spec.doors, drawers: spec.drawers,
          locations: [run.label],
        });
      }
    }
  }

  // Marks assigned after grouping, in a stable order, so the same layout always
  // produces the same schedule — a mark that moves between revisions is worse
  // than no mark at all.
  const order: CabinetFamily[] = ['base', 'vanity', 'wall', 'tall'];
  const lines = [...byCode.values()].sort((a, b) => {
    const fa = order.indexOf(CABINETS[a.type].family);
    const fb = order.indexOf(CABINETS[b.type].family);
    if (fa !== fb) return fa - fb;
    return a.code.localeCompare(b.code);
  });

  const counters: Record<string, number> = {};
  for (const line of lines) {
    const f = CABINETS[line.type].family;
    const letter = f === 'base' ? 'B' : f === 'wall' ? 'W' : f === 'vanity' ? 'V' : 'T';
    counters[letter] = (counters[letter] || 0) + 1;
    line.mark = `${letter}${counters[letter]}`;
  }
  return lines;
}

export interface CabinetTotals {
  boxes: number;
  doors: number;
  drawers: number;
  /** Handles and knobs — one per door, one per drawer. */
  hardware: number;
  baseLinearFt: number;
  wallLinearFt: number;
  tallLinearFt: number;
  fillerIn: number;
}

export function cabinetTotals(runs: CabinetRun[]): CabinetTotals {
  const t: CabinetTotals = {
    boxes: 0, doors: 0, drawers: 0, hardware: 0,
    baseLinearFt: 0, wallLinearFt: 0, tallLinearFt: 0, fillerIn: 0,
  };
  for (const run of runs) {
    t.fillerIn += run.fillerIn;
    for (const cab of run.cabinets) {
      const spec = CABINETS[cab.type];
      t.boxes += 1;
      t.doors += spec.doors;
      t.drawers += spec.drawers;
      const ft = cab.widthIn / 12;
      if (spec.family === 'wall') t.wallLinearFt += ft;
      else if (spec.family === 'tall') t.tallLinearFt += ft;
      else t.baseLinearFt += ft;
    }
  }
  t.hardware = t.doors + t.drawers;
  t.baseLinearFt = Math.round(t.baseLinearFt * 100) / 100;
  t.wallLinearFt = Math.round(t.wallLinearFt * 100) / 100;
  t.tallLinearFt = Math.round(t.tallLinearFt * 100) / 100;
  t.fillerIn = Math.round(t.fillerIn * 100) / 100;
  return t;
}

/* ── worktops ───────────────────────────────────────────────────────────── */

export interface CounterTakeoff {
  /** What a fabricator is given. */
  linearFt: number;
  sqFt: number;
  /** Backsplash at the standard 18in gap, unless told otherwise. */
  backsplashSqFt: number;
  /** Every run end and every corner is an exposed edge to profile. */
  edgeLinearFt: number;
  sinkCutouts: number;
  cooktopCutouts: number;
}

/**
 * Worktop from the base runs.
 *
 * Deliberately measured off the cabinets rather than entered by hand: a worktop
 * that disagrees with the cabinets under it is a remake, and remakes on stone
 * are expensive enough to be worth designing out.
 */
export function counterTakeoff(runs: CabinetRun[], opts: {
  backsplashHeightIn?: number;
  fullHeightSplash?: boolean;
  cooktops?: number;
} = {}): CounterTakeoff {
  const tops = runs.filter(r => r.family === 'base' || r.family === 'vanity');
  let linearIn = 0;
  let sinkCutouts = 0;
  let edgeIn = 0;

  for (const run of tops) {
    const runIn = run.cabinets.reduce((s, c) => s + c.widthIn, 0) + run.fillerIn;
    linearIn += runIn;
    // Front edge plus the two ends. A run that butts a wall at both ends still
    // gets its front profiled, which is the length that dominates.
    edgeIn += runIn + COUNTER_DEPTH_IN * 2;
    sinkCutouts += run.cabinets.filter(c => c.type === 'sink-base' || c.type === 'vanity-sink').length;
  }

  const splashH = opts.fullHeightSplash
    ? BACKSPLASH_HEIGHT_IN
    : (opts.backsplashHeightIn ?? 4);

  return {
    linearFt: Math.round((linearIn / 12) * 100) / 100,
    sqFt: Math.round(((linearIn * COUNTER_DEPTH_IN) / 144) * 100) / 100,
    backsplashSqFt: Math.round(((linearIn * splashH) / 144) * 100) / 100,
    edgeLinearFt: Math.round((edgeIn / 12) * 100) / 100,
    sinkCutouts,
    cooktopCutouts: Math.max(0, opts.cooktops || 0),
  };
}

/** Wall cabinets need a gap above the worktop; this is what is left for them. */
export function wallCabinetHeadroomIn(ceilingHeightIn: number, wallCabHeightIn: number): number {
  return ceilingHeightIn - COUNTER_HEIGHT_IN - BACKSPLASH_HEIGHT_IN - wallCabHeightIn;
}

/**
 * Does this wall cabinet height fit under the ceiling?
 *
 * A 42in wall cabinet in an 8ft kitchen does not, and finding that out on site
 * is a return. Reported rather than silently corrected, because the fix might
 * be a shorter cabinet or it might be losing the crown.
 */
export function wallCabinetFits(ceilingHeightIn: number, wallCabHeightIn: number): boolean {
  return wallCabinetHeadroomIn(ceilingHeightIn, wallCabHeightIn) >= 0;
}
