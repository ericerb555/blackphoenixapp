/**
 * Walls and ceilings — sheetrock, wall tile, and paint.
 *
 * THE GAP THIS FILLS
 *
 * `flooringModel` takes off floors properly, with materials, layouts and waste.
 * Nothing took off the other five surfaces in a room. That is most of a
 * sheetrock job and nearly all of a bathroom gut, where the wall tile costs more
 * than the floor tile and takes longer to set.
 *
 * WHY IT IS ONE MODEL AND NOT THREE
 *
 * Sheetrock, tile and paint disagree about materials and agree completely about
 * geometry: the same wall area, the same ceiling, the same openings deducted.
 * Three models would be three chances to compute the same square footage
 * differently, and the one that disagreed would be found by a customer.
 *
 * THE DEDUCTIONS ARE THE PART PEOPLE GET WRONG
 *
 * A door is not deducted from sheetrock the way it is from paint. Board is
 * bought in whole sheets and cut round the opening, so the offcut is only
 * sometimes usable — deducting the full opening under-orders. Paint genuinely
 * does not cover the door, so it deducts fully. Tile depends on whether it runs
 * to the ceiling or stops at a wainscot height.
 *
 * Each of those is handled explicitly below rather than by one shared fudge.
 */
import { type TileLayout, LAYOUT_WASTE } from './flooringModel';

const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/* ── the room, as a set of surfaces ───────────────────────────────────── */

export interface Opening {
  id: string;
  label: string;
  widthFt: number;
  heightFt: number;
  /** How many of this size. */
  count?: number;
}

export interface SurfaceRoom {
  id: string;
  name: string;
  widthFt: number;
  depthFt: number;
  ceilingFt: number;
  openings?: Opening[];
}

export function openingArea(openings: Opening[] | undefined): number {
  return round2((openings || []).reduce(
    (n, o) => n + (Number(o.widthFt) || 0) * (Number(o.heightFt) || 0) * (o.count || 1),
    0,
  ));
}

export function perimeterFt(r: SurfaceRoom): number {
  return round2(2 * ((Number(r.widthFt) || 0) + (Number(r.depthFt) || 0)));
}

/** Wall area before anything is deducted. */
export function grossWallArea(r: SurfaceRoom): number {
  return round2(perimeterFt(r) * (Number(r.ceilingFt) || 0));
}

export function ceilingArea(r: SurfaceRoom): number {
  return round2((Number(r.widthFt) || 0) * (Number(r.depthFt) || 0));
}

/* ── sheetrock ────────────────────────────────────────────────────────── */

export interface BoardSize {
  id: string;
  label: string;
  widthFt: number;
  lengthFt: number;
}

export const BOARD_SIZES: BoardSize[] = [
  { id: '4x8', label: "4' × 8'", widthFt: 4, lengthFt: 8 },
  { id: '4x10', label: "4' × 10'", widthFt: 4, lengthFt: 10 },
  { id: '4x12', label: "4' × 12'", widthFt: 4, lengthFt: 12 },
];

export function boardById(id: string): BoardSize {
  return BOARD_SIZES.find(b => b.id === id) || BOARD_SIZES[0];
}

export interface SheetrockTakeoff {
  wallSqFt: number;
  ceilingSqFt: number;
  totalSqFt: number;
  sheets: number;
  /** Linear feet of taped joint, estimated from sheet count. */
  tapeFt: number;
  compoundBuckets: number;
  screwsLb: number;
  cornerBeadFt: number;
  notes: string[];
}

/**
 * Board, and the things nobody remembers to order with it.
 *
 * Openings are deducted at **half** their area, which is the trade convention
 * and is not laziness. Board is bought whole and cut around an opening; some of
 * that offcut is usable and some is not, and deducting the full opening
 * reliably under-orders on a room with several doors. Half is the number that
 * matches what actually gets delivered.
 *
 * A ten per cent waste allowance sits on top for cuts, breakage and the sheet
 * that gets stood on.
 */
export function sheetrockTakeoff(
  rooms: SurfaceRoom[],
  opts: { boardId?: string; ceilings?: boolean; wastePct?: number } = {},
): SheetrockTakeoff {
  const board = boardById(opts.boardId || '4x12');
  const doCeilings = opts.ceilings !== false;
  const wastePct = opts.wastePct ?? 10;
  const notes: string[] = [];

  let wall = 0;
  let ceiling = 0;
  let openings = 0;

  for (const r of rooms) {
    wall += grossWallArea(r);
    if (doCeilings) ceiling += ceilingArea(r);
    openings += openingArea(r.openings);
  }

  // See the note above: half, deliberately.
  const deducted = round2(openings / 2);
  const net = Math.max(0, round2(wall - deducted) + round2(ceiling));
  const withWaste = net * (1 + wastePct / 100);

  const sheetSqFt = board.widthFt * board.lengthFt;
  const sheets = Math.ceil(withWaste / sheetSqFt);

  if (openings > 0) {
    notes.push(
      `${round1(openings)} sq ft of openings deducted at half — board is cut around an opening `
      + 'and only some of the offcut comes back, so a full deduction under-orders.',
    );
  }
  if (!doCeilings) notes.push('Ceilings excluded — walls only.');

  return {
    wallSqFt: round1(wall),
    ceilingSqFt: round1(ceiling),
    totalSqFt: round1(net),
    sheets,
    // Roughly one joint per sheet edge that meets another. The trade rule of
    // thumb is 3 linear feet of tape per sheet, which is close enough to buy from.
    tapeFt: Math.ceil(sheets * 3),
    // A 4.5 gallon bucket does about 100 sq ft of finished board across three coats.
    compoundBuckets: Math.max(1, Math.ceil(net / 100)),
    // About a pound of screws per 200 sq ft at 12in centres.
    screwsLb: Math.max(1, Math.ceil(net / 200)),
    // Every opening has two jambs and a head; outside corners get bead.
    cornerBeadFt: Math.ceil(rooms.reduce(
      (n, r) => n + (r.openings || []).reduce(
        (m, o) => m + ((Number(o.heightFt) || 0) * 2 + (Number(o.widthFt) || 0)) * (o.count || 1), 0,
      ), 0,
    )),
    notes,
  };
}

/* ── wall tile ────────────────────────────────────────────────────────── */

export interface WallTileTakeoff {
  /** Area actually being tiled, after height limit and deductions. */
  tiledSqFt: number;
  /** With the layout's waste allowance on top. */
  orderSqFt: number;
  layout: TileLayout;
  wastePct: number;
  thinsetBags: number;
  groutLb: number;
  backerSheets: number;
  /** Linear feet of edge trim or bullnose where tile stops. */
  edgeTrimFt: number;
  notes: string[];
}

/**
 * Tile on the walls.
 *
 * `heightFt` is what makes this different from a floor: tile very often stops
 * partway up — a 48in wainscot, a 72in shower surround — and taking the full
 * wall would order roughly double. When it is not given, the tile runs to the
 * ceiling and that is stated.
 *
 * Waste comes from `flooringModel.LAYOUT_WASTE` rather than a second table.
 * Herringbone wastes fifteen per cent on a wall for the same reason it does on
 * a floor, and two tables would eventually disagree.
 */
export function wallTileTakeoff(
  rooms: SurfaceRoom[],
  opts: {
    heightFt?: number;
    layout?: TileLayout;
    /** Only tile these rooms. Empty or absent means all of them. */
    roomIds?: string[];
    /** Backer board behind the tile — right in a wet area, wrong elsewhere. */
    backer?: boolean;
    extraWastePct?: number;
  } = {},
): WallTileTakeoff {
  const layout = opts.layout || 'straight';
  const notes: string[] = [];
  const chosen = opts.roomIds?.length
    ? rooms.filter(r => opts.roomIds!.includes(r.id))
    : rooms;

  let area = 0;
  let openings = 0;

  for (const r of chosen) {
    const height = opts.heightFt && opts.heightFt > 0
      ? Math.min(opts.heightFt, r.ceilingFt || opts.heightFt)
      : (Number(r.ceilingFt) || 0);
    area += perimeterFt(r) * height;

    // An opening only deducts the part of it that falls below the tile line.
    // A window whose sill is above a 48in wainscot takes nothing off, and
    // deducting it whole would under-order the wall.
    for (const o of (r.openings || [])) {
      const covered = Math.min(Number(o.heightFt) || 0, height);
      openings += Math.max(0, covered) * (Number(o.widthFt) || 0) * (o.count || 1);
    }
  }

  const tiled = Math.max(0, round2(area - openings));
  const wastePct = LAYOUT_WASTE[layout].extraPct + (opts.extraWastePct ?? 10);
  const order = round1(tiled * (1 + wastePct / 100));

  if (opts.heightFt && opts.heightFt > 0) {
    notes.push(`Tile stops at ${opts.heightFt} ft. Only openings below that line are deducted.`);
  } else {
    notes.push('Tile runs full height to the ceiling — say a height if it stops at a wainscot.');
  }
  if (layout !== 'straight') {
    notes.push(`${LAYOUT_WASTE[layout].label} adds ${LAYOUT_WASTE[layout].extraPct}% waste and `
      + `about ${Math.round((LAYOUT_WASTE[layout].hoursFactor - 1) * 100)}% to the labour.`);
  }

  return {
    tiledSqFt: round1(tiled),
    orderSqFt: order,
    layout,
    wastePct,
    // A 50lb bag of thinset does about 60 sq ft with a 1/4in notch.
    thinsetBags: Math.max(1, Math.ceil(tiled / 60)),
    // Roughly 1lb of grout per 12 sq ft on a wall joint.
    groutLb: Math.max(1, Math.ceil(tiled / 12)),
    backerSheets: opts.backer ? Math.max(1, Math.ceil(tiled / 15)) : 0,
    edgeTrimFt: Math.ceil(chosen.reduce((n, r) => n + perimeterFt(r), 0)),
    notes,
  };
}

/* ── paint ────────────────────────────────────────────────────────────── */

export interface PaintTakeoff {
  wallSqFt: number;
  ceilingSqFt: number;
  trimFt: number;
  coats: number;
  wallGallons: number;
  ceilingGallons: number;
  primerGallons: number;
  notes: string[];
}

/**
 * Paint, which deducts openings in full.
 *
 * Unlike board, paint genuinely does not cover a doorway — there is nothing
 * there. So the full opening comes off, which is why this cannot share a
 * deduction rule with sheetrock however similar the geometry looks.
 *
 * 350 sq ft per gallon per coat is the honest figure for a roller on primed
 * board. Manufacturer coverage on the tin assumes a surface nobody has.
 */
export function paintTakeoff(
  rooms: SurfaceRoom[],
  opts: { coats?: number; ceilings?: boolean; primer?: boolean; coveragePerGal?: number } = {},
): PaintTakeoff {
  const coats = Math.max(1, opts.coats ?? 2);
  const doCeilings = opts.ceilings !== false;
  const coverage = opts.coveragePerGal ?? 350;
  const notes: string[] = [];

  let wall = 0;
  let ceiling = 0;
  let openings = 0;
  let trim = 0;

  for (const r of rooms) {
    wall += grossWallArea(r);
    if (doCeilings) ceiling += ceilingArea(r);
    openings += openingArea(r.openings);
    // Base round the room, plus casing round each opening.
    trim += perimeterFt(r)
      + (r.openings || []).reduce(
        (n, o) => n + ((Number(o.heightFt) || 0) * 2 + (Number(o.widthFt) || 0)) * (o.count || 1), 0,
      );
  }

  // In full. See the note above.
  const netWall = Math.max(0, round2(wall - openings));

  if (openings > 0) {
    notes.push(`${round1(openings)} sq ft of openings deducted in full — unlike board, paint does `
      + 'not cover a doorway.');
  }
  notes.push(`${coverage} sq ft per gallon per coat, which is what a roller actually achieves.`);

  return {
    wallSqFt: round1(netWall),
    ceilingSqFt: round1(ceiling),
    trimFt: Math.ceil(trim),
    coats,
    wallGallons: Math.max(1, Math.ceil((netWall * coats) / coverage)),
    ceilingGallons: doCeilings ? Math.max(1, Math.ceil((ceiling * coats) / coverage)) : 0,
    primerGallons: opts.primer ? Math.max(1, Math.ceil(netWall / coverage)) : 0,
    notes,
  };
}

/* ── into the scope ───────────────────────────────────────────────────── */

export interface SurfaceLine {
  phase: string;
  trade: string;
  description: string;
  qty: number;
  unit: string;
  basis: string;
  sku?: string;
}

/**
 * The takeoffs as scope lines.
 *
 * Every line carries its basis, because a quantity in a quote with no working
 * behind it is a number somebody has to either trust or redo. "312 sq ft of
 * wall, 40 deducted, 10% waste" can be argued with; "34 sheets" cannot.
 */
export function surfaceScopeLines(opts: {
  sheetrock?: SheetrockTakeoff;
  tile?: WallTileTakeoff;
  paint?: PaintTakeoff;
}): SurfaceLine[] {
  const lines: SurfaceLine[] = [];
  const { sheetrock, tile, paint } = opts;

  if (sheetrock && sheetrock.sheets > 0) {
    lines.push(
      { phase: 'drywall', trade: 'drywall', description: 'Hang sheetrock', qty: sheetrock.sheets, unit: 'sheets',
        basis: `${sheetrock.totalSqFt} sq ft net`, sku: 'drywall:board' },
      { phase: 'drywall', trade: 'drywall', description: 'Tape and finish', qty: sheetrock.totalSqFt, unit: 'sf',
        basis: 'three coats over the hung board' },
      { phase: 'drywall', trade: 'drywall', description: 'Joint compound', qty: sheetrock.compoundBuckets, unit: 'buckets',
        basis: 'one bucket per 100 sq ft over three coats', sku: 'drywall:compound' },
      { phase: 'drywall', trade: 'drywall', description: 'Joint tape', qty: sheetrock.tapeFt, unit: 'lf',
        basis: 'about 3 ft per sheet', sku: 'drywall:tape' },
      { phase: 'drywall', trade: 'drywall', description: 'Drywall screws', qty: sheetrock.screwsLb, unit: 'lb',
        basis: '1 lb per 200 sq ft at 12in centres', sku: 'drywall:screws' },
    );
    if (sheetrock.cornerBeadFt > 0) {
      lines.push({ phase: 'drywall', trade: 'drywall', description: 'Corner bead', qty: sheetrock.cornerBeadFt, unit: 'lf',
        basis: 'jambs and heads at every opening', sku: 'drywall:bead' });
    }
  }

  if (tile && tile.orderSqFt > 0) {
    lines.push(
      { phase: 'tile', trade: 'tile', description: 'Set wall tile', qty: tile.orderSqFt, unit: 'sf',
        basis: `${tile.tiledSqFt} sq ft tiled, ${tile.wastePct}% waste for ${LAYOUT_WASTE[tile.layout].label.toLowerCase()}`,
        sku: 'tile:wall' },
      { phase: 'tile', trade: 'tile', description: 'Thinset', qty: tile.thinsetBags, unit: 'bags',
        basis: 'one 50 lb bag per 60 sq ft', sku: 'tile:thinset' },
      { phase: 'tile', trade: 'tile', description: 'Grout', qty: tile.groutLb, unit: 'lb',
        basis: '1 lb per 12 sq ft of wall joint', sku: 'tile:grout' },
    );
    if (tile.backerSheets > 0) {
      lines.push({ phase: 'tile', trade: 'tile', description: 'Cement backer board', qty: tile.backerSheets, unit: 'sheets',
        basis: 'wet area — board behind the tile', sku: 'tile:backer' });
    }
    if (tile.edgeTrimFt > 0) {
      lines.push({ phase: 'tile', trade: 'tile', description: 'Edge trim or bullnose', qty: tile.edgeTrimFt, unit: 'lf',
        basis: 'where the tile stops', sku: 'tile:trim' });
    }
  }

  if (paint && paint.wallGallons > 0) {
    lines.push(
      { phase: 'paint', trade: 'paint', description: `Paint walls, ${paint.coats} coats`, qty: paint.wallGallons, unit: 'gal',
        basis: `${paint.wallSqFt} sq ft net at 350 sq ft per gallon per coat`, sku: 'paint:wall' },
    );
    if (paint.ceilingGallons > 0) {
      lines.push({ phase: 'paint', trade: 'paint', description: 'Paint ceilings', qty: paint.ceilingGallons, unit: 'gal',
        basis: `${paint.ceilingSqFt} sq ft`, sku: 'paint:ceiling' });
    }
    if (paint.primerGallons > 0) {
      lines.push({ phase: 'paint', trade: 'paint', description: 'Primer', qty: paint.primerGallons, unit: 'gal',
        basis: 'one coat over new board', sku: 'paint:primer' });
    }
  }

  return lines;
}

/** One sentence on what these rooms add up to. */
export function surfaceNote(rooms: SurfaceRoom[]): string {
  if (!rooms.length) return 'No rooms to take off. Draw them on the floor plan first.';
  const wall = rooms.reduce((n, r) => n + grossWallArea(r), 0);
  const ceil = rooms.reduce((n, r) => n + ceilingArea(r), 0);
  const openings = rooms.reduce((n, r) => n + openingArea(r.openings), 0);
  const missing = rooms.filter(r => !(r.ceilingFt > 0));
  const head = `${rooms.length} room${rooms.length === 1 ? '' : 's'}: `
    + `${round1(wall)} sq ft of wall, ${round1(ceil)} of ceiling, `
    + `${round1(openings)} of openings.`;
  return missing.length
    ? `${head} ${missing.length} room${missing.length === 1 ? ' has' : 's have'} no ceiling height, `
      + 'so their walls count as nothing — set it before quoting.'
    : head;
}
