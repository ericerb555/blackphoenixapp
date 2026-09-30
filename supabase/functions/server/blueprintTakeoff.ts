/**
 * Turning what was read off a drawing into quantities the catalogue can price.
 *
 * WHAT THIS REPLACES
 *
 * `quote-from-blueprint` multiplied total square footage by numbers typed into
 * the file — 0.5 hours per square foot overall, 0.15 for carpentry, 0.08 for
 * painting. Its own comment said those were neither Black Phoenix's measured
 * rates nor an industry table anybody could cite.
 *
 * The production rates to replace them already existed, on the server, resolved
 * from the published catalogue and the learning loop's corrections. What was
 * missing was the step in between: a drawing gives you rooms and counts, and a
 * task needs a QUANTITY IN ITS OWN UNIT. Wall framing is priced per square foot
 * of WALL, not of floor; trim per linear foot of perimeter; a register each.
 *
 * WHY THE ANALYSIS ALREADY HELD ENOUGH
 *
 * The blueprint analysis carries per-room square footage, perimeter linear feet,
 * ceiling height, and counts of doors, windows, outlets, fixtures and vents. The
 * old code read two of those fields. Almost all of the fidelity here comes from
 * reading the rest rather than from anything clever.
 *
 * THE RULE THIS FOLLOWS: EVIDENCE, NOT COMPLETENESS
 *
 * A task is emitted only where the analysis gives a reason for it. No door
 * count, no door lines. No flooring in the materials list, no flooring labour.
 * A quote that lists every trade because a trade exists is a quote nobody can
 * trust, and padding one is worse than leaving a gap somebody can see.
 *
 * ASSUMPTIONS ARE MARKED, NOT AVOIDED
 *
 * Eric's call, on the missing ceiling height: assume eight feet and mark it,
 * rather than skip the trade. A missing framing line reads as "no framing
 * needed", which is a worse error than a figure somebody can correct. Every
 * line therefore carries `from` — the field it was derived from — and `assumed`,
 * so a wrong number can be traced to a wrong reading rather than to arithmetic.
 */

/** Used where a drawing does not say. Eric's call: assume, and mark it. */
export const DEFAULT_CEILING_HEIGHT_FT = 8;

export interface TakeoffLine {
  taskId: string;
  quantity: number;
  /** Which field of the analysis produced this number, in words. */
  from: string;
  /** True where a missing figure was assumed rather than read. */
  assumed: boolean;
}

export interface Measurements {
  floorAreaSqFt: number;
  /** Perimeter times ceiling height. What framing, board and wall paint take. */
  wallAreaSqFt: number;
  ceilingAreaSqFt: number;
  perimeterLinFt: number;
  roomsRead: number;
  /** True where any room's height was assumed. */
  assumedCeilingHeight: boolean;
  /** True where a perimeter was derived from area rather than read. */
  assumedPerimeter: boolean;
}

export interface Takeoff {
  lines: TakeoffLine[];
  measurements: Measurements;
  /** Things whoever checks the draft should know. */
  notes: string[];
}

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * The measurements every interior task is priced from.
 *
 * Room by room, because a house is not one rectangle: two houses of the same
 * total area have different perimeters, and perimeter is what decides wall area
 * and trim. Summing per room is the difference between a real takeoff and a
 * multiplier.
 */
export function measure(analysis: any): Measurements {
  const rooms: any[] = Array.isArray(analysis?.rooms) ? analysis.rooms : [];
  const out: Measurements = {
    floorAreaSqFt: 0, wallAreaSqFt: 0, ceilingAreaSqFt: 0, perimeterLinFt: 0,
    roomsRead: 0, assumedCeilingHeight: false, assumedPerimeter: false,
  };

  for (const room of rooms) {
    const length = num(room?.dimensions?.length);
    const width = num(room?.dimensions?.width);
    const floor = num(room?.squareFootage) || (length && width ? length * width : 0);
    if (!floor) continue;

    let perimeter = num(room?.perimeterLinearFeet);
    if (!perimeter && length && width) perimeter = 2 * (length + width);
    if (!perimeter) {
      // A square of the same area. Marked, because a real room is not square
      // and this understates a long thin one.
      perimeter = 4 * Math.sqrt(floor);
      out.assumedPerimeter = true;
    }

    let height = num(room?.dimensions?.height);
    if (!height) { height = DEFAULT_CEILING_HEIGHT_FT; out.assumedCeilingHeight = true; }

    out.roomsRead += 1;
    out.floorAreaSqFt += floor;
    out.ceilingAreaSqFt += floor;
    out.perimeterLinFt += perimeter;
    out.wallAreaSqFt += perimeter * height;
  }

  /*
   * No usable rooms, but a total.
   *
   * Everything here is assumed, and saying so matters more than the numbers do:
   * the perimeter of a building cannot be recovered from its area without
   * choosing a shape. A square is the least bad choice, and it understates wall
   * area on any real footprint — which errs toward under-quoting, so the note
   * this produces says to check it.
   */
  if (out.roomsRead === 0) {
    const total = num(analysis?.totalSquareFootage);
    if (total) {
      const width = num(analysis?.buildingWidthFt);
      const depth = num(analysis?.buildingDepthFt);
      const perimeter = width && depth ? 2 * (width + depth) : 4 * Math.sqrt(total);
      out.floorAreaSqFt = total;
      out.ceilingAreaSqFt = total;
      out.perimeterLinFt = perimeter;
      out.wallAreaSqFt = perimeter * DEFAULT_CEILING_HEIGHT_FT;
      out.assumedCeilingHeight = true;
      out.assumedPerimeter = !(width && depth);
    }
  }

  return {
    ...out,
    floorAreaSqFt: round2(out.floorAreaSqFt),
    wallAreaSqFt: round2(out.wallAreaSqFt),
    ceilingAreaSqFt: round2(out.ceilingAreaSqFt),
    perimeterLinFt: round2(out.perimeterLinFt),
  };
}

/** Every material item under a category whose name contains one of these words. */
function itemsUnder(analysis: any, ...words: string[]): any[] {
  const cats: any[] = Array.isArray(analysis?.materials) ? analysis.materials : [];
  return cats
    .filter((c) => {
      const name = String(c?.category || '').toLowerCase();
      return words.some((w) => name.includes(w));
    })
    .flatMap((c) => (Array.isArray(c?.items) ? c.items : []));
}

/** Whether the materials list mentions a category at all, however spelled. */
function hasCategory(analysis: any, ...words: string[]): boolean {
  const cats: any[] = Array.isArray(analysis?.materials) ? analysis.materials : [];
  return cats.some((c) => {
    const name = String(c?.category || '').toLowerCase();
    return words.some((w) => name.includes(w));
  });
}

/**
 * The flooring the materials list actually names, or null to price none.
 *
 * Reading the product rather than defaulting to one: hardwood is three times
 * the labour of a floating floor, so guessing here would be a guess about a
 * significant number rather than a harmless default.
 */
export function flooringTask(analysis: any): { taskId: string; because: string } | null {
  const names = itemsUnder(analysis, 'floor').map((i) => String(i?.name || '').toLowerCase());
  if (names.length === 0) return null;

  const says = (word: string) => names.some((n) => n.includes(word));
  if (says('hardwood') || says('oak')) {
    return { taskId: 'floor-hardwood-nail', because: 'hardwood named in the materials list' };
  }
  if (says('carpet')) {
    return { taskId: 'floor-carpet', because: 'carpet named in the materials list' };
  }
  if (says('tile')) {
    return { taskId: 'tile-floor-standard', because: 'floor tile named in the materials list' };
  }
  return { taskId: 'floor-lvp', because: 'flooring in the materials list, product unstated' };
}

/**
 * Every task the drawing gives a reason to price, with its quantity.
 *
 * Read the gates rather than the arithmetic: each block asks what the analysis
 * ACTUALLY says before emitting anything. That is what keeps this a takeoff
 * rather than a template with numbers in it.
 */
export function blueprintTakeoff(analysis: any): Takeoff {
  const m = measure(analysis);
  const details = analysis?.constructionDetails || {};
  const lines: TakeoffLine[] = [];
  const notes: string[] = [];

  /** Anything derived from wall area inherits both of its assumptions. */
  const wallsAssumed = m.assumedCeilingHeight || m.assumedPerimeter;

  const add = (taskId: string, quantity: number, from: string, assumed = false) => {
    if (quantity > 0) lines.push({ taskId, quantity: round2(quantity), from, assumed });
  };

  /* ── framing, only where the materials say there is framing ───────────── */
  if (hasCategory(analysis, 'framing', 'lumber')) {
    add('carp-wall-framing', m.wallAreaSqFt,
      'room perimeters times ceiling height', wallsAssumed);
  }

  /* ── board and finish: these surfaces exist wherever the rooms do ──────── */
  add('dry-hang-wall', m.wallAreaSqFt, 'wall area', wallsAssumed);
  add('dry-hang-ceiling', m.ceilingAreaSqFt, 'floor area, which is also the ceiling area');
  add('dry-tape-finish', m.wallAreaSqFt + m.ceilingAreaSqFt, 'walls plus ceilings', wallsAssumed);

  /* ── paint ─────────────────────────────────────────────────────────────── */
  add('paint-walls', m.wallAreaSqFt, 'wall area', wallsAssumed);
  add('paint-ceilings', m.ceilingAreaSqFt, 'floor area, which is also the ceiling area');
  add('paint-trim', m.perimeterLinFt, 'room perimeters', m.assumedPerimeter);

  /* ── trim carpentry ────────────────────────────────────────────────────── */
  add('carp-base-trim', m.perimeterLinFt, 'room perimeters', m.assumedPerimeter);

  /* ── the counted things. No count, no line ─────────────────────────────── */
  add('carp-door-hang', num(details.doorCount), 'door count');
  add('paint-doors', num(details.doorCount), 'door count');
  add('elec-device', num(details.electricalOutlets), 'outlet and switch count');
  add('plumb-rough', num(details.plumbingFixtures), 'plumbing fixture count');
  add('plumb-set-fixture', num(details.plumbingFixtures), 'plumbing fixture count');
  add('hvac-register', num(details.hvacVents), 'HVAC vent count');

  /* ── cabinets, only from a linear-foot quantity somebody measured ──────── */
  const cabinetRun = itemsUnder(analysis, 'cabinet')
    .filter((i) => /lin/i.test(String(i?.unit || '')))
    .reduce((sum: number, i: any) => sum + num(i?.quantity), 0);
  add('carp-cabinets', cabinetRun, 'cabinetry measured in linear feet in the materials list');

  /* ── flooring, only the product the drawing names ──────────────────────── */
  const floor = flooringTask(analysis);
  if (floor) add(floor.taskId, m.floorAreaSqFt, floor.because);

  /* ── protection and the final clean ────────────────────────────────────── */
  add('lab-protection', m.floorAreaSqFt, 'floor area');
  add('lab-cleanup', m.floorAreaSqFt, 'floor area');

  /* ── what whoever checks this draft should be told ─────────────────────── */
  if (m.roomsRead === 0 && m.floorAreaSqFt > 0) {
    notes.push('No room dimensions were read, so every quantity comes from the total square '
      + 'footage alone. The wall areas in particular rest on a guess at the shape of the building.');
  }
  if (m.assumedCeilingHeight) {
    notes.push('Ceiling height was not on the drawing; ' + DEFAULT_CEILING_HEIGHT_FT
      + 'ft assumed. Wall area moves with it, and so do framing, board and wall paint.');
  }
  if (m.assumedPerimeter) {
    notes.push('A perimeter was derived from an area by assuming a square. A long thin room has '
      + 'more wall than that, so this understates rather than overstates.');
  }
  if (!floor) {
    notes.push('No flooring is priced: the materials list does not name any. Add it if this job '
      + 'includes floors.');
  }
  if (lines.length === 0) {
    notes.push('Nothing could be priced from this analysis. It carries no room dimensions, no '
      + 'total square footage and no counts.');
  }

  return { lines, measurements: m, notes };
}
