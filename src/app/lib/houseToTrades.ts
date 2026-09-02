/**
 * The house, translated into what each trade already understands.
 *
 * WHY A BRIDGE RATHER THAN A SHARED TYPE
 *
 * Siding thinks in elevations with gables and a waste factor. Doors and windows
 * think in scheduled units with rough openings and marks. Flooring thinks in
 * rooms with a layout and a transition count. Those are not accidental
 * differences — they are what each trade actually estimates on — and forcing
 * one shape across all three would make every trade carry fields that mean
 * nothing to it.
 *
 * So the house stays the single record of the building, and each trade is
 * handed a translation of it. The house is captured once; the readings are
 * derived. That is the opposite of the alternative, where each trade captures
 * its own walls and four descriptions of one building are free to disagree.
 *
 * ON PROVENANCE
 *
 * The house tracks where each field came from separately, because a wall width
 * can be measured while its sill height is still a guess. The trades carry a
 * single `DimensionSource` per row. Collapsing many into one has to be
 * pessimistic — the reading is only as good as its weakest input — or a
 * measured width would launder an estimated height into looking measured.
 */
import type { House, HouseView, Opening as HouseOpening, Provenance } from './houseModel';
import { activeView } from './houseModel';
import type { Elevation, Opening as SidingOpening, DimensionSource } from './exteriorModel';
import type { OpeningSpec, OpeningType } from './openingSpec';
import type { FloorRoom } from './flooringModel';

/**
 * Collapse the fields a reading depends on into one source, worst-first.
 *
 * `scaled` is the trades' word for what the house calls `photos`: a dimension
 * recovered from an image against something of known size. Same thing, and it
 * matters that it does not silently become `measured`.
 */
export function worstSource(view: HouseView, fields: string[]): DimensionSource {
  let worst: Provenance = 'measured';
  for (const f of fields) {
    const s = view.source[f] || 'estimated';
    if (s === 'estimated') return 'estimated';
    // A blueprint figure and a photo-derived one are both `scaled` to a trade:
    // taken off something at a known scale rather than off the building. The
    // finer distinction between them lives in `Provenance`, where deciding
    // which of two sources wins actually needs it.
    if (s === 'photos' || s === 'drawing') worst = 'photos';
  }
  return worst === 'photos' ? 'scaled' : 'measured';
}

/** Only elevations are walls. A room view is not something you side. */
export function elevationViews(house: House | null | undefined): HouseView[] {
  return (house?.views || []).filter(v => v.kind === 'elevation');
}

export function roomViews(house: House | null | undefined): HouseView[] {
  return (house?.views || []).filter(v => v.kind === 'room');
}

/* ── siding ──────────────────────────────────────────────────────────────── */

/**
 * A garage door is a door as far as siding is concerned — it is a hole in the
 * wall of a certain size, and that is all siding needs to know.
 */
function sidingOpening(o: HouseOpening): SidingOpening {
  return {
    kind: o.kind === 'window' ? 'window' : 'door',
    widthFt: Math.max(0, o.widthFt),
    heightFt: Math.max(0, o.heightFt),
    count: 1,
  };
}

export function elevationsFromHouse(house: House | null | undefined): Elevation[] {
  return elevationViews(house).map(v => ({
    id: v.id,
    label: v.name,
    widthFt: Math.max(0, v.widthFt),
    heightFt: Math.max(0, v.heightFt),
    // Gables are not captured yet. Left undefined rather than guessed at,
    // because inventing a gable rise overstates the area of every cape in the
    // book and the estimator has no way to see it was invented.
    openings: v.openings.map(sidingOpening),
    storeys: Math.max(1, Math.round(v.storeys || 1)),
    source: worstSource(v, ['widthFt', 'heightFt']),
  }));
}

/* ── doors and windows ───────────────────────────────────────────────────── */

function openingType(kind: HouseOpening['kind']): OpeningType {
  if (kind === 'window') return 'window';
  if (kind === 'slider') return 'patio-door';
  if (kind === 'garage') return 'storefront'; // nearest thing the schedule has
  return 'entry-door';
}

/**
 * Marks run W1, W2… and D1, D2… across the whole house rather than restarting
 * per elevation, because a mark has to be unique on the order — two W1s on one
 * job is exactly the mix-up the mark exists to prevent.
 */
export function specsFromHouse(house: House | null | undefined): OpeningSpec[] {
  const out: OpeningSpec[] = [];
  let w = 0, d = 0;

  for (const view of elevationViews(house)) {
    for (const o of view.openings) {
      const type = openingType(o.kind);
      const isWindow = type === 'window';
      const mark = isWindow ? `W${++w}` : `D${++d}`;
      const unitWidthIn = Math.round(Math.max(0, o.widthFt) * 12);
      const unitHeightIn = Math.round(Math.max(0, o.heightFt) * 12);

      out.push({
        id: `${view.id}-${o.id}`,
        mark,
        location: view.name,
        quantity: 1,
        type,
        // The captured size is the hole in the wall, so it is the rough
        // opening. The unit ordered is smaller, and by how much is a supplier
        // question rather than something to invent here — so the two are set
        // equal and flagged by `source` as not yet a measured order.
        roughWidthIn: unitWidthIn,
        roughHeightIn: unitHeightIn,
        unitWidthIn,
        unitHeightIn,
        source: worstSource(view, ['openings']),
        ...(isWindow
          ? { style: 'double-hung' as const, frameType: 'nailing-fin' as const, fit: 'insert' as const,
              grids: 'none' as const, screens: true, tempered: false }
          : {}),
      } as OpeningSpec);
    }
  }

  return out;
}

/* ── flooring ────────────────────────────────────────────────────────────── */

/**
 * A room view records one length and a ceiling height, not two floor
 * dimensions, so the second side is not known. The area is left for the
 * estimator rather than squaring the one number we have, which would silently
 * assume every room is square.
 */
export function roomsFromHouse(house: House | null | undefined): FloorRoom[] {
  return roomViews(house).map(v => ({
    id: v.id,
    name: v.name,
    lengthFt: Math.max(0, v.widthFt),
    // The captured second side when there is one. Zero only when nobody has
    // measured it yet, which is honest — squaring the one dimension we have
    // would assume every room is square.
    widthFt: Math.max(0, Number(v.depthFt) || 0),
    material: 'lvp' as const,
    transitions: Math.max(1, v.openings.filter(o => o.kind !== 'window').length),
    removeExisting: true,
  }));
}

/* ── what the panels announce ────────────────────────────────────────────── */

export interface HouseOffer {
  /** How many rows bringing the house in would produce. */
  count: number;
  /** Plain-English summary for the button. */
  summary: string;
}

export function sidingOffer(house: House | null | undefined): HouseOffer | null {
  const walls = elevationViews(house);
  if (!walls.length) return null;
  const openings = walls.reduce((n, v) => n + v.openings.length, 0);
  return {
    count: walls.length,
    summary: `${walls.length} wall${walls.length === 1 ? '' : 's'}`
      + (openings ? ` and ${openings} opening${openings === 1 ? '' : 's'}` : ''),
  };
}

export function openingsOffer(house: House | null | undefined): HouseOffer | null {
  const specs = specsFromHouse(house);
  if (!specs.length) return null;
  const windows = specs.filter(s => s.type === 'window').length;
  const doors = specs.length - windows;
  const parts = [
    windows ? `${windows} window${windows === 1 ? '' : 's'}` : '',
    doors ? `${doors} door${doors === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return { count: specs.length, summary: parts.join(' and ') };
}

export function flooringOffer(house: House | null | undefined): HouseOffer | null {
  const rooms = roomViews(house);
  if (!rooms.length) return null;
  return { count: rooms.length, summary: `${rooms.length} room${rooms.length === 1 ? '' : 's'}` };
}

/* ── structures and hardscape ────────────────────────────────────────────
 *
 * Both attach to the building rather than merely standing near it. A lean-to
 * hangs off a wall, so that wall's length is the structure's width and its door
 * threshold is the height the roof has to clear. A patio against the house has
 * one edge that needs no restraint, because the house is the restraint.
 *
 * Same shape as the other trades: the house is captured once and each trade
 * takes the part of it that it needs.
 */

export function structureOffer(house: House | null | undefined): HouseOffer | null {
  const walls = elevationViews(house);
  if (!walls.length) return null;
  const w = walls[0];
  return {
    count: walls.length,
    summary: `${Math.round(w.widthFt)}ft of ${w.name.toLowerCase()}`
      + (w.sillHeightInches > 0 ? ` with a ${Math.round(w.sillHeightInches)}in threshold` : ''),
  };
}

/**
 * What a structure takes from a wall.
 *
 * The eave has to clear the door it is built over, so the threshold sets a
 * floor under the height rather than being decoration — a lean-to whose beam
 * lands below the top of the slider is one nobody can walk through.
 */
export function structureFromWall(house: House | null | undefined): {
  widthFt: number; minEaveFt: number; wallName: string;
} | null {
  const w = elevationViews(house)[0];
  if (!w) return null;
  // Threshold, plus a door's height above it, plus a little for the header.
  const minEaveFt = Math.max(7, (w.sillHeightInches + 80 + 6) / 12);
  return {
    widthFt: Math.max(0, Math.round(w.widthFt * 10) / 10),
    minEaveFt: Math.round(minEaveFt * 10) / 10,
    wallName: w.name,
  };
}

export function hardscapeOffer(house: House | null | undefined): HouseOffer | null {
  const walls = elevationViews(house);
  if (!walls.length) return null;
  const w = walls[0];
  return { count: 1, summary: `${Math.round(w.widthFt)}ft along ${w.name.toLowerCase()}` };
}

/** The wall a deck attaches to — the active elevation, if there is one. */
export function deckWall(house: House | null | undefined): HouseView | null {
  const v = activeView(house);
  return v && v.kind === 'elevation' ? v : (elevationViews(house)[0] || null);
}
