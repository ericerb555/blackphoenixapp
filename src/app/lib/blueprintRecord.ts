/**
 * A blueprint becomes the building record.
 *
 * THE DECISION THIS IMPLEMENTS
 *
 * Asked whether a scanned drawing should *become* the building record or only
 * yield quantities for a takeoff, Eric said it should become the record. That
 * settles a lot.
 *
 * A takeoff tool would read a drawing, hand back square footages, and be
 * finished with it — while everything else in the design centre carried on
 * working from a house estimated off photographs. That is the worse system, and
 * obviously so once stated: a drawing carries a scale and a photograph carries
 * a guess. The better source should win.
 *
 * So reading a blueprint produces **geometry** — rooms, walls, positions, in
 * the same shapes the floor plan already uses. A function here that returned a
 * total would have answered the wrong question.
 *
 * WHY IT STILL DOES NOT WIN EVERYTHING
 *
 * A drawing describes the building somebody intended. That is not always the
 * building that got built, and it is very often not the one still standing
 * after forty years of alterations. So a figure measured on site outranks a
 * figure read off a drawing, and when the two disagree the disagreement is
 * shown rather than resolved — the person who walked the job is the one who
 * should decide which is true.
 *
 * The one thing this must never do is quietly undo the walkthrough.
 */
import type { PlanRoom, PlanWall, FloorPlan } from './floorPlanModel';
import { type Provenance, PROVENANCE_RANK, outranks } from './houseModel';

const r1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;

/* ── what a read drawing gives back ───────────────────────────────────── */

export interface BlueprintRoom {
  name: string;
  type?: string;
  lengthFt: number;
  widthFt: number;
  ceilingFt?: number;
  /**
   * Position within the drawing, normalised 0–1 from its top-left.
   *
   * Asked for because the drawing has it. Rooms laid out by size alone are a
   * list of rectangles, not a plan — and the whole point of this decision is
   * that the drawing becomes the record, which means its layout comes too.
   */
  x?: number;
  y?: number;
}

export interface BlueprintRead {
  sheetTitle?: string;
  /** The scale as printed, e.g. '1/4" = 1ft'. Recorded, not trusted blindly. */
  scaleNote?: string;
  /** Overall envelope, used to turn normalised positions into feet. */
  buildingWidthFt?: number;
  buildingDepthFt?: number;
  rooms: BlueprintRoom[];
  notes: string[];
}

export const EMPTY_READ: BlueprintRead = { rooms: [], notes: [] };

/** A tolerant read of whatever the analyser returned. */
export function readBlueprint(raw: any): BlueprintRead {
  const num = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const rooms = (Array.isArray(raw?.rooms) ? raw.rooms : [])
    .map((r: any) => ({
      name: String(r?.name || '').slice(0, 80) || 'Room',
      type: r?.type ? String(r.type).slice(0, 40) : undefined,
      // The analyser has used both `dimensions.length/width` and flat fields.
      lengthFt: num(r?.lengthFt) ?? num(r?.dimensions?.length) ?? 0,
      widthFt: num(r?.widthFt) ?? num(r?.dimensions?.width) ?? 0,
      ceilingFt: num(r?.ceilingFt) ?? num(r?.dimensions?.height),
      x: Number.isFinite(Number(r?.x)) ? Math.min(1, Math.max(0, Number(r.x))) : undefined,
      y: Number.isFinite(Number(r?.y)) ? Math.min(1, Math.max(0, Number(r.y))) : undefined,
    }))
    // A room with no dimensions is not geometry and cannot become a record.
    .filter((r: BlueprintRoom) => r.lengthFt > 0 && r.widthFt > 0);

  return {
    sheetTitle: raw?.sheetTitle ? String(raw.sheetTitle).slice(0, 200) : undefined,
    scaleNote: raw?.scaleNote ? String(raw.scaleNote).slice(0, 100) : undefined,
    buildingWidthFt: num(raw?.buildingWidthFt),
    buildingDepthFt: num(raw?.buildingDepthFt),
    rooms,
    notes: Array.isArray(raw?.notes) ? raw.notes.map(String).slice(0, 20) : [],
  };
}

/* ── into rooms the floor plan understands ───────────────────────────── */

/**
 * Lay the read rooms out in feet.
 *
 * When the drawing gave positions they are used, scaled by the building
 * envelope. When it did not, the rooms are packed left to right in rows — which
 * is honestly wrong as a plan and is reported as such, because a packed layout
 * that looks like a plan is worse than one that obviously needs dragging.
 */
export function planRoomsFrom(read: BlueprintRead): {
  rooms: PlanRoom[];
  positioned: boolean;
} {
  const positioned = read.rooms.length > 0 && read.rooms.every(r => r.x !== undefined && r.y !== undefined);

  const envW = read.buildingWidthFt
    || Math.max(20, read.rooms.reduce((n, r) => n + r.widthFt, 0));
  const envD = read.buildingDepthFt
    || Math.max(20, ...read.rooms.map(r => r.lengthFt));

  if (positioned) {
    return {
      positioned: true,
      rooms: read.rooms.map((r, i) => ({
        id: `bp_${i}_${r.name.toLowerCase().replace(/\W+/g, '-')}`,
        name: r.name,
        x: r1((r.x || 0) * envW),
        y: r1((r.y || 0) * envD),
        widthFt: r1(r.widthFt),
        depthFt: r1(r.lengthFt),
        ceilingFt: r.ceilingFt || 8,
        state: 'existing' as const,
        source: 'drawing' as Provenance,
      })),
    };
  }

  // Packed. Deliberately plain, so nobody mistakes it for the real layout.
  const rooms: PlanRoom[] = [];
  let x = 0;
  let y = 0;
  let rowDepth = 0;
  for (let i = 0; i < read.rooms.length; i++) {
    const r = read.rooms[i];
    if (x > 0 && x + r.widthFt > envW) { x = 0; y += rowDepth; rowDepth = 0; }
    rooms.push({
      id: `bp_${i}_${r.name.toLowerCase().replace(/\W+/g, '-')}`,
      name: r.name,
      x: r1(x),
      y: r1(y),
      widthFt: r1(r.widthFt),
      depthFt: r1(r.lengthFt),
      ceilingFt: r.ceilingFt || 8,
      state: 'existing' as const,
      source: 'drawing' as Provenance,
    });
    x += r.widthFt;
    rowDepth = Math.max(rowDepth, r.lengthFt);
  }
  return { rooms, positioned: false };
}

/* ── merging without undoing anybody's work ──────────────────────────── */

export interface RoomConflict {
  name: string;
  /** What the plan currently says. */
  existing: { widthFt: number; depthFt: number; source: Provenance };
  /** What the drawing says. */
  drawing: { widthFt: number; depthFt: number };
  /** True when the existing figure came from a better source and is kept. */
  keptExisting: boolean;
  message: string;
}

export interface MergeResult {
  plan: FloorPlan;
  added: number;
  updated: number;
  conflicts: RoomConflict[];
  positioned: boolean;
}

const sourceOf = (r: PlanRoom): Provenance =>
  ((r as any).source as Provenance) || 'estimated';

const sameRoom = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Fold a read drawing into the plan.
 *
 * Three cases, and only one of them is an overwrite:
 *
 *   A room the plan does not have — added, sourced `drawing`.
 *   A room the plan has from a weaker source — updated, and the old figure is
 *     reported so the change is visible rather than silent.
 *   A room the plan has from an equal or better source — KEPT. A dimension
 *     somebody measured on site is not replaced by one read off a drawing that
 *     may predate the last renovation.
 *
 * Positions are only written when the drawing actually supplied them. Moving a
 * room somebody has already placed, to a spot that came from a packing loop,
 * would be worse than leaving it.
 */
export function mergeIntoPlan(plan: FloorPlan, read: BlueprintRead): MergeResult {
  const { rooms: incoming, positioned } = planRoomsFrom(read);
  const conflicts: RoomConflict[] = [];
  let added = 0;
  let updated = 0;

  const next: PlanRoom[] = [...plan.rooms];

  for (const inc of incoming) {
    const at = next.findIndex(r => sameRoom(r.name, inc.name));
    if (at < 0) {
      next.push(inc);
      added++;
      continue;
    }

    const existing = next[at];
    const existingSource = sourceOf(existing);
    const differs = Math.abs(existing.widthFt - inc.widthFt) > 0.05
      || Math.abs(existing.depthFt - inc.depthFt) > 0.05;

    if (!differs) continue;

    if (outranks(existingSource, 'drawing')) {
      conflicts.push({
        name: existing.name,
        existing: { widthFt: existing.widthFt, depthFt: existing.depthFt, source: existingSource },
        drawing: { widthFt: inc.widthFt, depthFt: inc.depthFt },
        keptExisting: true,
        message: `${existing.name}: the drawing says ${inc.widthFt} × ${inc.depthFt} ft and the `
          + `plan says ${existing.widthFt} × ${existing.depthFt} ft, ${existingSource} on site. `
          + 'Kept what was measured — a drawing can predate the last renovation.',
      });
      continue;
    }

    conflicts.push({
      name: existing.name,
      existing: { widthFt: existing.widthFt, depthFt: existing.depthFt, source: existingSource },
      drawing: { widthFt: inc.widthFt, depthFt: inc.depthFt },
      keptExisting: false,
      message: `${existing.name}: updated from ${existing.widthFt} × ${existing.depthFt} ft `
        + `(${existingSource}) to ${inc.widthFt} × ${inc.depthFt} ft from the drawing.`,
    });

    next[at] = {
      ...existing,
      widthFt: inc.widthFt,
      depthFt: inc.depthFt,
      ceilingFt: inc.ceilingFt || existing.ceilingFt,
      // Only when the drawing actually knew where things were.
      ...(positioned ? { x: inc.x, y: inc.y } : {}),
      source: 'drawing' as Provenance,
    } as PlanRoom;
    updated++;
  }

  return { plan: { ...plan, rooms: next }, added, updated, conflicts, positioned };
}

/** One sentence on what folding this drawing in would do. */
export function mergeNote(result: MergeResult): string {
  const parts: string[] = [];
  if (result.added) parts.push(`${result.added} room${result.added === 1 ? '' : 's'} added`);
  if (result.updated) parts.push(`${result.updated} updated from the drawing`);

  const kept = result.conflicts.filter(c => c.keptExisting).length;
  if (kept) parts.push(`${kept} left alone because what is on site was measured`);

  if (!parts.length) return 'Nothing to change — the plan already matches this drawing.';

  const head = parts.join(', ') + '.';
  return result.positioned
    ? `${head} The drawing carried positions, so the layout came with it.`
    : `${head} The drawing gave no positions, so the rooms are packed in rows rather than `
      + 'laid out — drag them into place before anybody reads this as a plan.';
}

/** What is not trustworthy about this read, before it becomes the record. */
export function readWarnings(read: BlueprintRead): string[] {
  const out: string[] = [];
  if (!read.rooms.length) {
    out.push('No rooms with usable dimensions were read. A room with no size cannot become geometry.');
    return out;
  }
  if (!read.scaleNote) {
    out.push('No scale was read off the sheet. The dimensions may be stated rather than scaled, '
      + 'which is fine — but nothing here confirms them.');
  }
  const noCeiling = read.rooms.filter(r => !r.ceilingFt).length;
  if (noCeiling) {
    out.push(`${noCeiling} room${noCeiling === 1 ? ' has' : 's have'} no ceiling height on the sheet; `
      + '8 ft assumed. Wall areas and every surface takeoff depend on it.');
  }
  const unplaced = read.rooms.filter(r => r.x === undefined || r.y === undefined).length;
  if (unplaced && unplaced < read.rooms.length) {
    out.push(`${unplaced} of ${read.rooms.length} rooms came back without a position, so all of `
      + 'them are packed rather than laid out.');
  }
  return out;
}
