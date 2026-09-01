/**
 * The floor plan — rooms as they are, rooms that do not exist yet, and the
 * walls between them.
 *
 * WHY BOTH EXISTING AND PROPOSED
 *
 * Every other trade in the design centre works on a house that already stands.
 * An addition does not: it is new footprint attached to an old building, so the
 * plan has to hold rooms that have been measured and rooms that have only been
 * drawn, side by side, and every tool has to work on either without caring
 * which. A room is a room.
 *
 * WHY WALLS ARE THEIR OWN THING
 *
 * Because of the question customers ask most: can this wall come out. That is
 * the single highest-stakes structural decision in residential work and the gap
 * between the two answers is thousands of dollars — a non-bearing partition is
 * demolition and patching, a bearing wall is temporary shoring, a sized beam,
 * posts carried down and usually new footings under them.
 *
 * So a wall carries its structural state, and it starts as `unknown`. Not
 * `non-bearing`, which would be a cheerful guess with a four-figure error in
 * it; not `bearing`, which would frighten people off jobs that are simple.
 * Unknown, until somebody stands in the room and looks up. That is what the
 * walkthrough is for.
 *
 * A DELIBERATE SIMPLIFICATION
 *
 * Rooms are rectangles. Real houses have bay windows and angled corners, and a
 * general polygon editor is a project in itself. A rectangle plus explicitly
 * placed interior walls covers the work this actually has to do — trace a
 * house, draw an addition, take a wall out — and an irregular room can be
 * described as two rectangles. When that stops being enough it will be obvious,
 * and the areas below are computed rather than assumed so the change will be
 * contained.
 */

export type Existence = 'existing' | 'proposed' | 'removed';

/**
 * Whether a wall is holding anything up.
 *
 * `unknown` is the default and the honest one. It is answered on site, and a
 * render or an estimate produced while it is still unknown says so.
 */
export type Bearing = 'bearing' | 'non-bearing' | 'unknown';

export interface PlanPoint {
  /** Feet from the plan origin. */
  x: number;
  y: number;
}

export interface PlanRoom {
  id: string;
  name: string;
  /** Top-left corner, in feet. */
  x: number;
  y: number;
  widthFt: number;
  depthFt: number;
  ceilingFt: number;
  state: Existence;
}

export interface PlanWall {
  id: string;
  a: PlanPoint;
  b: PlanPoint;
  thicknessIn: number;
  state: Existence;
  bearing: Bearing;
  /** Named so a scope line can point at it: "the wall between kitchen and dining". */
  label?: string;
}

export interface FloorPlan {
  rooms: PlanRoom[];
  walls: PlanWall[];
}

export const BLANK_PLAN: FloorPlan = { rooms: [], walls: [] };

/** Interior partitions are 4½in finished; exterior walls are thicker. */
export const INTERIOR_WALL_IN = 4.5;
export const EXTERIOR_WALL_IN = 6.5;

let seq = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${(++seq).toString(36)}`;

export function blankRoom(name: string, state: Existence = 'existing'): PlanRoom {
  return {
    id: nid('RM'), name: name.trim() || 'Room',
    x: 0, y: 0, widthFt: 12, depthFt: 10, ceilingFt: 8, state,
  };
}

export function blankWall(a: PlanPoint, b: PlanPoint, state: Existence = 'existing'): PlanWall {
  return {
    id: nid('WL'), a, b,
    thicknessIn: INTERIOR_WALL_IN,
    state,
    // Never assumed. See the note at the top of this file.
    bearing: 'unknown',
  };
}

/* ── geometry ─────────────────────────────────────────────────────────── */

export function roomArea(r: PlanRoom): number {
  return Math.max(0, r.widthFt) * Math.max(0, r.depthFt);
}

export function roomPerimeter(r: PlanRoom): number {
  return 2 * (Math.max(0, r.widthFt) + Math.max(0, r.depthFt));
}

export function wallLength(w: PlanWall): number {
  return Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
}

/** Wall face area, for drywall and paint. */
export function wallArea(w: PlanWall, ceilingFt: number): number {
  return wallLength(w) * Math.max(0, ceilingFt);
}

/** Do two rectangles overlap? Touching edges do not count. */
export function roomsOverlap(a: PlanRoom, b: PlanRoom): boolean {
  return a.x < b.x + b.widthFt && b.x < a.x + a.widthFt
    && a.y < b.y + b.depthFt && b.y < a.y + a.depthFt;
}

/* ── what the plan adds up to ─────────────────────────────────────────── */

export interface PlanTotals {
  existingSqFt: number;
  proposedSqFt: number;
  /** What the house becomes: existing plus the addition. */
  finishedSqFt: number;
  roomCount: number;
  wallsRemoved: number;
  /** Removed walls whose structural role nobody has settled. */
  removedUnknown: number;
  /** Removed walls known to be carrying load. */
  removedBearing: number;
  interiorWallFt: number;
}

export function planTotals(plan: FloorPlan): PlanTotals {
  const existing = plan.rooms.filter(r => r.state === 'existing');
  const proposed = plan.rooms.filter(r => r.state === 'proposed');
  const removedWalls = plan.walls.filter(w => w.state === 'removed');

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const existingSqFt = round1(existing.reduce((s, r) => s + roomArea(r), 0));
  const proposedSqFt = round1(proposed.reduce((s, r) => s + roomArea(r), 0));

  return {
    existingSqFt,
    proposedSqFt,
    finishedSqFt: round1(existingSqFt + proposedSqFt),
    roomCount: existing.length + proposed.length,
    wallsRemoved: removedWalls.length,
    removedUnknown: removedWalls.filter(w => w.bearing === 'unknown').length,
    removedBearing: removedWalls.filter(w => w.bearing === 'bearing').length,
    interiorWallFt: round1(
      plan.walls.filter(w => w.state !== 'removed').reduce((s, w) => s + wallLength(w), 0),
    ),
  };
}

/* ── what the plan is trying to tell you ──────────────────────────────── */

export interface PlanFinding {
  severity: 'blocking' | 'structural' | 'worth-checking';
  message: string;
  wallId?: string;
}

/**
 * Read the plan for the things that change a price or a permit.
 *
 * `structural` findings are not errors. Taking a bearing wall out is an
 * ordinary, saleable job — it is simply a different job from taking a partition
 * out, and the difference has to appear before somebody quotes the cheap one.
 */
export function readPlan(plan: FloorPlan): PlanFinding[] {
  const out: PlanFinding[] = [];

  for (const w of plan.walls.filter(x => x.state === 'removed')) {
    const where = w.label ? `The ${w.label}` : 'A wall';
    if (w.bearing === 'unknown') {
      out.push({
        severity: 'structural', wallId: w.id,
        message: `${where} is marked to come out and nobody has said whether it is bearing. `
          + 'Until somebody looks up at the joists, the price for this could be either of two '
          + 'very different numbers.',
      });
    } else if (w.bearing === 'bearing') {
      out.push({
        severity: 'structural', wallId: w.id,
        message: `${where} is bearing. Taking it out needs temporary shoring, a beam sized to `
          + `the ${Math.round(wallLength(w))}ft span, posts carried down, and usually footings `
          + 'under them — plus a framing detail for the architect.',
      });
    }
  }

  const proposed = plan.rooms.filter(r => r.state === 'proposed');
  if (proposed.length) {
    out.push({
      severity: 'worth-checking',
      message: `${proposed.length} proposed room${proposed.length === 1 ? '' : 's'} — an addition `
        + 'means setbacks, lot coverage and height. Worth checking zoning before drawing much more.',
    });
  }

  // Rooms sitting on top of each other are a drawing mistake, and every area
  // computed from them afterwards is wrong.
  const all = plan.rooms;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (roomsOverlap(all[i], all[j])) {
        out.push({
          severity: 'blocking',
          message: `“${all[i].name}” and “${all[j].name}” overlap. Every area taken off this plan `
            + 'will be wrong until they do not.',
        });
      }
    }
  }

  for (const r of plan.rooms) {
    if (roomArea(r) <= 0) {
      out.push({ severity: 'blocking', message: `“${r.name}” has no area — give it a width and a depth.` });
    }
  }

  return out;
}

/**
 * The scope lines a plan implies.
 *
 * Only the structural consequences, because that is what a plan knows. Finishes
 * come from the trade tools, which know what is going on the floor and the
 * walls; the plan only knows what is being taken out and what is being added.
 */
export function planScopeLines(plan: FloorPlan): Array<{
  phase: string; trade: string; description: string; qty: number; unit: string; basis: string;
}> {
  const out: Array<{ phase: string; trade: string; description: string; qty: number; unit: string; basis: string }> = [];

  for (const w of plan.walls.filter(x => x.state === 'removed')) {
    const len = Math.round(wallLength(w) * 10) / 10;
    const where = w.label || 'wall';

    out.push({
      phase: 'demolition', trade: 'laboring',
      description: `Take out ${where}`,
      qty: len, unit: 'lin ft',
      basis: `${len}ft of wall, marked for removal`,
    });

    if (w.bearing === 'bearing' || w.bearing === 'unknown') {
      const provisional = w.bearing === 'unknown' ? ' (provisional — bearing not confirmed)' : '';
      out.push({
        phase: 'framing', trade: 'carpentry',
        description: `Temporary shoring at ${where}${provisional}`,
        qty: 1, unit: 'job',
        basis: 'a load path cannot be interrupted while the beam goes in',
      });
      out.push({
        phase: 'framing', trade: 'carpentry',
        description: `Beam and posts at ${where}${provisional}`,
        qty: len, unit: 'lin ft',
        basis: `${len}ft clear span to carry`,
      });
      out.push({
        phase: 'foundation', trade: 'masonry',
        description: `Footings under new posts at ${where}${provisional}`,
        qty: 2, unit: 'ea',
        basis: 'a point load has to reach the ground',
      });
    }
  }

  for (const r of plan.rooms.filter(x => x.state === 'proposed')) {
    const area = Math.round(roomArea(r) * 10) / 10;
    if (area <= 0) continue;
    out.push({
      phase: 'foundation', trade: 'masonry',
      description: `Foundation for ${r.name}`,
      qty: area, unit: 'sq ft',
      basis: 'new footprint',
    });
    out.push({
      phase: 'framing', trade: 'carpentry',
      description: `Frame ${r.name} — floor, walls and roof`,
      qty: area, unit: 'sq ft',
      basis: 'new footprint',
    });
    out.push({
      phase: 'drywall', trade: 'drywall',
      description: `Sheetrock ${r.name}`,
      qty: Math.round((roomPerimeter(r) * r.ceilingFt + area) * 10) / 10,
      unit: 'sq ft',
      basis: 'walls plus ceiling',
    });
  }

  return out;
}

/** One sentence on whether this plan can be costed yet. */
export function planNote(plan: FloorPlan): string {
  const t = planTotals(plan);
  if (!t.roomCount) return 'Nothing drawn yet.';
  if (t.removedUnknown > 0) {
    return `${t.finishedSqFt} sq ft. ${t.removedUnknown} wall${t.removedUnknown === 1 ? '' : 's'} `
      + 'marked to come out with the bearing question unanswered — the price cannot be firm until it is.';
  }
  if (t.proposedSqFt > 0) {
    return `${t.existingSqFt} sq ft existing plus ${t.proposedSqFt} sq ft proposed — ${t.finishedSqFt} finished.`;
  }
  return `${t.existingSqFt} sq ft across ${t.roomCount} room${t.roomCount === 1 ? '' : 's'}.`;
}
