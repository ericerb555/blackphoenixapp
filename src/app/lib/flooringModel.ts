/**
 * Flooring and floor coverings, room by room.
 *
 * WHY THE MATERIAL DECIDES THE ARITHMETIC
 *
 * Every other trade here works one way: measure it, add waste, price it. Floor
 * coverings do not, and treating them alike is where flooring estimates go
 * wrong. The differences are real rules of the trade, not preferences:
 *
 *   carpet     comes off a roll of a fixed width, so a 13ft room off a 12ft
 *              roll needs a seam and a second drop. Waste is driven by the roll
 *              width against the room, not by a percentage.
 *   tile       waste depends on the layout. A straight lay wastes little; a
 *              diagonal one wastes far more, because every edge tile is a cut.
 *   plank      wastes least of all, but needs an expansion gap, an
 *              underlayment and a transition at every doorway.
 *   hardwood   may be site-finished, which is a second labour operation over
 *              the same area and often more hours than laying it.
 *
 * So a room carries its own material and its own rules, and a job is the sum of
 * rooms rather than one area with one waste factor.
 *
 * WHAT IS COUNTED THAT USUALLY IS NOT
 *
 * Transitions at doorways, taking up what is there now, and getting rid of it.
 * These are small items that are forgotten at quoting time and turn up as a
 * skip and half a day on site.
 */

import type { QuoteLine, QuoteOptions, QuoteTotals } from './deckQuote';
import { quoteTotals } from './deckQuote';
import type { DimensionSource } from './exteriorModel';

export type FloorMaterial =
  | 'carpet' | 'lvp' | 'laminate' | 'hardwood-solid' | 'hardwood-engineered'
  | 'tile' | 'sheet-vinyl';

export type TileLayout = 'straight' | 'diagonal' | 'herringbone';

export interface FloorRoom {
  id: string;
  name: string;
  /** Given as dimensions, or as an area when the room is not a rectangle. */
  lengthFt: number;
  widthFt: number;
  /** Overrides the rectangle when set — an L-shaped room measured on site. */
  areaSqFt?: number;
  material: FloorMaterial;
  /** Tile only. Changes waste more than anything else does. */
  layout?: TileLayout;
  /** Doorways and thresholds out of this room. */
  transitions: number;
  /** Taking up what is there now. */
  removeExisting: boolean;
  /** Levelling or new underlayment under the new floor. */
  underlayment: boolean;
  /** Site-finished hardwood: sanded and coated after laying. */
  siteFinish?: boolean;
  source: DimensionSource;
}

export const FLOOR_MATERIALS: Array<{
  id: FloorMaterial; label: string; sku: string;
  /** Percentage added for offcuts, before any layout adjustment. */
  wastePct: number;
  task: string; hoursPerSqFt: number; trade: string;
  /** Carpet only — the width it comes off the roll. */
  rollWidthFt?: number;
  note: string;
}> = [
  { id: 'carpet', label: 'Carpet', sku: 'floor:carpet', wastePct: 5, task: 'floor-carpet', hoursPerSqFt: 0.020, trade: 'flooring', rollWidthFt: 12,
    note: 'Off a 12ft roll. A room wider than that needs a seam and a second drop.' },
  { id: 'lvp', label: 'LVP / vinyl plank', sku: 'floor:lvp', wastePct: 8, task: 'floor-lvp', hoursPerSqFt: 0.030, trade: 'flooring',
    note: 'Floating. Needs an expansion gap and a transition at every doorway.' },
  { id: 'laminate', label: 'Laminate', sku: 'floor:laminate', wastePct: 8, task: 'floor-lvp', hoursPerSqFt: 0.030, trade: 'flooring',
    note: 'Floating, same as LVP to lay.' },
  { id: 'hardwood-solid', label: 'Hardwood, solid', sku: 'floor:hardwood-solid', wastePct: 12, task: 'floor-hardwood-nail', hoursPerSqFt: 0.048, trade: 'flooring',
    note: 'Nailed down. Higher waste — boards are culled for defects as they are laid.' },
  { id: 'hardwood-engineered', label: 'Hardwood, engineered', sku: 'floor:hardwood-eng', wastePct: 10, task: 'floor-hardwood-nail', hoursPerSqFt: 0.044, trade: 'flooring',
    note: 'More stable than solid, so less culling.' },
  { id: 'tile', label: 'Tile', sku: 'floor:tile', wastePct: 10, task: 'tile-floor-standard', hoursPerSqFt: 0.09, trade: 'tile',
    note: 'Waste depends on the layout more than on the room.' },
  { id: 'sheet-vinyl', label: 'Sheet vinyl', sku: 'floor:sheet-vinyl', wastePct: 15, task: 'floor-lvp', hoursPerSqFt: 0.026, trade: 'flooring', rollWidthFt: 12,
    note: 'Off a roll, and cut to a template. High waste on an awkward room.' },
];

/** Extra waste the layout costs, on top of the material's own. */
export const LAYOUT_WASTE: Record<TileLayout, { extraPct: number; hoursFactor: number; label: string }> = {
  straight: { extraPct: 0, hoursFactor: 1.0, label: 'Straight lay' },
  diagonal: { extraPct: 8, hoursFactor: 1.25, label: 'Diagonal' },
  herringbone: { extraPct: 15, hoursFactor: 1.6, label: 'Herringbone' },
};

const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const roomArea = (r: FloorRoom): number =>
  Number(r.areaSqFt) > 0
    ? round1(Number(r.areaSqFt))
    : round1((Number(r.lengthFt) || 0) * (Number(r.widthFt) || 0));

/**
 * How much carpet a room actually consumes off the roll.
 *
 * Not its area. Carpet is cut in full-width drops, so a 13ft-wide room off a
 * 12ft roll takes two drops — the second is a 1ft strip that costs a whole
 * further length of roll. This is why carpet estimated by area plus ten percent
 * comes up short on wide rooms and only on wide rooms.
 */
export function carpetRollSqFt(r: FloorRoom, rollWidthFt: number): number {
  const l = Number(r.lengthFt) || 0;
  const w = Number(r.widthFt) || 0;
  if (!l || !w) return roomArea(r);
  // Run the roll along the longer dimension: fewer seams and less waste.
  const runFt = Math.max(l, w);
  const acrossFt = Math.min(l, w);
  const drops = Math.max(1, Math.ceil(acrossFt / rollWidthFt));
  return round1(drops * rollWidthFt * runFt);
}

export interface RoomTakeoff {
  id: string;
  name: string;
  material: FloorMaterial;
  areaSqFt: number;
  /** What to buy — area plus waste, or full roll drops for carpet. */
  orderSqFt: number;
  wastePct: number;
  seams: number;
  hours: number;
  source: DimensionSource;
  note: string;
}

export function roomTakeoff(r: FloorRoom): RoomTakeoff {
  const spec = FLOOR_MATERIALS.find(m => m.id === r.material) || FLOOR_MATERIALS[1];
  const area = roomArea(r);

  const layout = r.material === 'tile' ? (r.layout || 'straight') : 'straight';
  const layoutRules = LAYOUT_WASTE[layout];
  const wastePct = spec.wastePct + layoutRules.extraPct;

  let orderSqFt: number;
  let seams = 0;
  let note = '';

  if (spec.rollWidthFt) {
    orderSqFt = carpetRollSqFt(r, spec.rollWidthFt);
    const across = Math.min(Number(r.lengthFt) || 0, Number(r.widthFt) || 0);
    const drops = Math.max(1, Math.ceil(across / spec.rollWidthFt));
    seams = Math.max(0, drops - 1);
    note = seams > 0
      ? `${drops} drops off a ${spec.rollWidthFt}ft roll — ${seams} seam${seams > 1 ? 's' : ''}.`
      : `One drop off a ${spec.rollWidthFt}ft roll, no seam.`;
  } else {
    orderSqFt = round1(area * (1 + wastePct / 100));
    note = `${wastePct}% waste${layoutRules.extraPct ? ` (${layoutRules.label.toLowerCase()})` : ''}.`;
  }

  // Hours run on the area laid, not the area bought — nobody is paid to fit the
  // offcuts.
  let hours = area * spec.hoursPerSqFt * layoutRules.hoursFactor;
  if (r.siteFinish && (r.material === 'hardwood-solid' || r.material === 'hardwood-engineered')) {
    hours += area * 0.036; // sand and finish, from the task catalogue
  }
  if (r.underlayment) hours += area * 0.014;

  return {
    id: r.id, name: r.name || 'Room', material: r.material,
    areaSqFt: area, orderSqFt, wastePct, seams,
    hours: round1(hours), source: r.source, note,
  };
}

export interface FlooringTakeoff {
  rooms: RoomTakeoff[];
  totalAreaSqFt: number;
  byMaterial: Record<string, number>;
  transitions: number;
  removalSqFt: number;
  basis: DimensionSource;
  note: string;
}

const SOURCE_RANK: Record<DimensionSource, number> = { measured: 3, scaled: 2, estimated: 1 };

export function flooringTakeoff(rooms: FloorRoom[]): FlooringTakeoff {
  const live = (rooms || []).filter(r => roomArea(r) > 0);
  const takeoffs = live.map(roomTakeoff);

  const byMaterial: Record<string, number> = {};
  for (const t of takeoffs) byMaterial[t.material] = round1((byMaterial[t.material] || 0) + t.orderSqFt);

  const worst = live.length
    ? live.reduce<DimensionSource>((w, r) => (SOURCE_RANK[r.source] < SOURCE_RANK[w] ? r.source : w), 'measured')
    : 'estimated';

  return {
    rooms: takeoffs,
    totalAreaSqFt: round1(takeoffs.reduce((n, t) => n + t.areaSqFt, 0)),
    byMaterial,
    transitions: live.reduce((n, r) => n + Math.max(0, Math.round(Number(r.transitions) || 0)), 0),
    removalSqFt: round1(live.filter(r => r.removeExisting).reduce((n, r) => n + roomArea(r), 0)),
    basis: worst,
    note: !live.length
      ? 'No rooms measured yet.'
      : worst === 'measured'
        ? 'Every room was measured. These quantities can be ordered against.'
        : worst === 'scaled'
          ? 'Some rooms were scaled rather than measured. Check them before ordering — flooring is bought by the square foot and a short order stops the job.'
          : 'At least one room is estimated. Treat these quantities as a conversation, not an order.',
  };
}

export function buildFlooringQuote(
  rooms: FloorRoom[],
  materialPrices: Record<string, number>,
  rates: Record<string, number>,
  opts: QuoteOptions,
): { lines: QuoteLine[]; totals: QuoteTotals; unpricedCount: number; takeoff: FlooringTakeoff } {
  const takeoff = flooringTakeoff(rooms);
  const lines: QuoteLine[] = [];

  // Material by family, because that is how it is bought — one order of oak,
  // not one per room.
  for (const spec of FLOOR_MATERIALS) {
    const qty = takeoff.byMaterial[spec.id];
    if (!qty) continue;
    const unitPrice = round2(Number(materialPrices[spec.sku]) || 0);
    const where = takeoff.rooms.filter(r => r.material === spec.id).map(r => r.name).join(', ');
    lines.push({
      sku: spec.sku, category: 'Decking', description: spec.label,
      qty, unit: 'sq ft', unitPrice, total: round2(qty * unitPrice),
      unpriced: !(unitPrice > 0),
      basis: where.length > 60 ? `${takeoff.rooms.filter(r => r.material === spec.id).length} rooms` : where,
    });
  }

  // Labour by trade, so tile is charged at the tile rate and the rest at the
  // flooring rate rather than everything at one blended number.
  const hoursByTrade: Record<string, number> = {};
  for (const t of takeoff.rooms) {
    const spec = FLOOR_MATERIALS.find(m => m.id === t.material)!;
    hoursByTrade[spec.trade] = round1((hoursByTrade[spec.trade] || 0) + t.hours);
  }
  for (const [trade, hours] of Object.entries(hoursByTrade)) {
    const rate = round2(Number(rates[trade]) || 0);
    lines.push({
      sku: `labour:floor-${trade}`, category: 'Labour',
      description: `Lay flooring — ${trade}`,
      qty: hours, unit: 'hours', unitPrice: rate, total: round2(hours * rate),
      unpriced: !(rate > 0),
      basis: 'area laid, not area bought',
    });
  }

  if (takeoff.transitions > 0) {
    const unitPrice = round2(Number(materialPrices['floor:transition']) || 0);
    lines.push({
      sku: 'floor:transition', category: 'Railing', description: 'Transitions and thresholds',
      qty: takeoff.transitions, unit: 'each', unitPrice, total: round2(takeoff.transitions * unitPrice),
      unpriced: !(unitPrice > 0), basis: 'one per doorway',
    });
  }

  if (takeoff.removalSqFt > 0) {
    const rate = round2(Number(rates['laboring']) || 0);
    const hours = round1(takeoff.removalSqFt * 0.012);
    lines.push({
      sku: 'labour:floor-removal', category: 'Labour',
      description: 'Take up the existing floor',
      qty: hours, unit: 'hours', unitPrice: rate, total: round2(hours * rate),
      unpriced: !(rate > 0), basis: `${takeoff.removalSqFt} sq ft at 0.012 hr/sq ft`,
    });
    lines.push({
      sku: 'disposal:flooring', category: 'Hardware', description: 'Skip and disposal',
      qty: 1, unit: 'each', unitPrice: round2(Number(materialPrices['disposal:flooring']) || 0),
      total: round2(Number(materialPrices['disposal:flooring']) || 0),
      unpriced: !(Number(materialPrices['disposal:flooring']) > 0),
      basis: 'one container',
    });
  }

  return {
    lines, totals: quoteTotals(lines, opts),
    unpricedCount: lines.filter(l => l.unpriced).length,
    takeoff,
  };
}
