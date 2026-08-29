/**
 * A siding job, counted into lines somebody can order and price.
 *
 * WHAT THIS IS AND IS NOT
 *
 * `exteriorTakeoff` produces areas and lengths. This turns those into the lines
 * a supplier's ticket actually has — squares of siding, feet of starter, feet
 * of J-channel, corner posts, wrap — plus the labour those lines imply.
 *
 * It sets **quantities and hours, never prices**. Prices come from the same
 * place every other price in this business comes from: the vendor catalogue for
 * material, and the trade rate for labour. A siding job priced by its own
 * private arithmetic would be the one quote in the system that could disagree
 * with the others, which is exactly the problem `repriceEstimate` was built to
 * end.
 *
 * WHY THE ACCESSORIES ARE NOT AN AFTERTHOUGHT
 *
 * On a vinyl job the accessories are a serious fraction of the material bill and
 * they are what runs out on a Friday afternoon. Starter, J-channel, corner
 * posts, utility trim and wrap are counted from the geometry rather than added
 * as a percentage, because "add fifteen percent for trim" is how a job ends up
 * two corner posts short on a house that happens to have six corners.
 */

import type { ExteriorModel, ExteriorTakeoff, SidingMaterial } from './exteriorModel';
import { exteriorTakeoff } from './exteriorModel';

export interface SidingLine {
  sku: string;
  category: 'Siding' | 'Trim' | 'Weatherproofing' | 'Labour' | 'Disposal';
  description: string;
  qty: number;
  unit: string;
  /** Hours, for labour lines. Left at 0 for material. */
  hours?: number;
  /** Which trade does it, so the right rate is applied. */
  tradeId?: string;
  /** How the quantity was arrived at, shown so it can be checked. */
  basis: string;
}

/**
 * Labour, from the shared task catalogue rather than invented here.
 *
 * These ids match `laborTasks.ts` so that when Eric corrects a productivity
 * figure for his own crew, siding follows the correction like everything else.
 */
const LABOUR_TASK: Record<SidingMaterial, { id: string; hoursPerSqFt: number; minimumHours: number; label: string }> = {
  'vinyl':           { id: 'side-vinyl',         hoursPerSqFt: 0.030, minimumHours: 8, label: 'Vinyl siding' },
  'fibre-cement':    { id: 'side-fiber-cement',  hoursPerSqFt: 0.048, minimumHours: 8, label: 'Fibre cement siding' },
  'wood':            { id: 'side-wood',          hoursPerSqFt: 0.058, minimumHours: 8, label: 'Cedar or wood siding' },
  'engineered-wood': { id: 'side-wood',          hoursPerSqFt: 0.052, minimumHours: 8, label: 'Engineered wood siding' },
};

/**
 * Hours per unit alone prices small work far too low.
 *
 * Patching one gable end is a fraction of a square, and hours-per-square-foot
 * says three hours. It is not three hours: the crew still travels, still sets
 * up, still stages, still cleans up and still goes home. The task catalogue
 * carries a minimum for exactly this reason and it has to be honoured here, or
 * every small job is quoted at a loss.
 */
function atLeast(hours: number, minimum: number): { hours: number; floored: boolean } {
  return hours < minimum ? { hours: minimum, floored: true } : { hours, floored: false };
}

const MATERIAL_LABEL: Record<SidingMaterial, string> = {
  'vinyl': 'Vinyl siding',
  'fibre-cement': 'Fibre cement siding',
  'wood': 'Cedar siding',
  'engineered-wood': 'Engineered wood siding',
};

/** Vinyl uses channel and posts; everything else uses trim boards. */
const usesChannel = (m: SidingMaterial) => m === 'vinyl';

const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface SidingQuoteOptions {
  /** Tearing the old siding off, and the skip it goes in. */
  includeTearOff: boolean;
  /**
   * Staging hours are charged on the wall area that actually needs staging,
   * which the takeoff counts separately. Zero leaves staging off the quote.
   */
  stagingHoursPerSqFt: number;
  /** Tear-off is labour too, and it is not free. */
  tearOffHoursPerSqFt: number;
}

export const DEFAULT_SIDING_OPTIONS: SidingQuoteOptions = {
  includeTearOff: true,
  stagingHoursPerSqFt: 0.006,
  tearOffHoursPerSqFt: 0.010,
};

export interface SidingQuote {
  takeoff: ExteriorTakeoff;
  lines: SidingLine[];
  totalHours: number;
  /** Repeated from the takeoff so a caller holding only the quote still knows. */
  basis: ExteriorTakeoff['basis'];
  note: string;
}

export function buildSidingQuote(
  model: ExteriorModel,
  opts: SidingQuoteOptions = DEFAULT_SIDING_OPTIONS,
): SidingQuote {
  const t = exteriorTakeoff(model);
  const lines: SidingLine[] = [];
  const material = model.material;

  const push = (l: SidingLine) => { if (l.qty > 0) lines.push(l); };

  // ── material ────────────────────────────────────────────────────────────
  push({
    sku: `siding:${material}`,
    category: 'Siding',
    description: MATERIAL_LABEL[material],
    qty: t.squares,
    unit: 'squares',
    basis: `${t.netSqFt} sq ft covered plus ${model.wasteFactorPct}% waste`,
  });

  push({
    sku: 'siding:starter',
    category: 'Trim',
    description: 'Starter strip',
    qty: t.starterFt,
    unit: 'lin ft',
    basis: 'along the bottom of every elevation',
  });

  push({
    sku: usesChannel(material) ? 'siding:j-channel' : 'siding:opening-trim',
    category: 'Trim',
    description: usesChannel(material) ? 'J-channel to windows and doors' : 'Trim boards to windows and doors',
    qty: t.openingTrimFt,
    unit: 'lin ft',
    // Every opening is trimmed, including the small ones that were too small to
    // deduct from the area. Those two rules answer different questions.
    basis: 'perimeter of every opening, including ones too small to deduct',
  });

  push({
    sku: usesChannel(material) ? 'siding:outside-corner-post' : 'siding:corner-board',
    category: 'Trim',
    description: usesChannel(material) ? 'Outside corner posts' : 'Outside corner boards',
    qty: t.outsideCornerFt,
    unit: 'lin ft',
    basis: `${model.outsideCorners} corners at ${model.cornerHeightFt} ft`,
  });

  push({
    sku: usesChannel(material) ? 'siding:inside-corner' : 'siding:inside-corner-board',
    category: 'Trim',
    description: 'Inside corners',
    qty: t.insideCornerFt,
    unit: 'lin ft',
    basis: `${model.insideCorners} corners at ${model.cornerHeightFt} ft`,
  });

  push({
    sku: 'siding:wrap',
    category: 'Weatherproofing',
    description: 'House wrap and flashing',
    qty: t.wrapSqFt,
    unit: 'sq ft',
    basis: 'gross wall area, openings not deducted',
  });

  // ── labour ──────────────────────────────────────────────────────────────
  const task = LABOUR_TASK[material];

  // Hours run on the area actually covered, not the ordered area — nobody is
  // paid to hang the offcuts.
  const hang = atLeast(round1(t.netSqFt * task.hoursPerSqFt), task.minimumHours);
  push({
    sku: `labour:${task.id}`,
    category: 'Labour',
    description: `Hang ${task.label.toLowerCase()}`,
    qty: hang.hours, unit: 'hours', hours: hang.hours, tradeId: 'siding',
    basis: hang.floored
      ? `${t.netSqFt} sq ft at ${task.hoursPerSqFt} hr/sq ft, raised to the ${task.minimumHours} hour minimum`
      : `${t.netSqFt} sq ft at ${task.hoursPerSqFt} hr/sq ft`,
  });

  const trimFt = t.starterFt + t.openingTrimFt + t.outsideCornerFt + t.insideCornerFt;
  // The trim minimum is lower than the hanging one and shares its call-out, so
  // it is only floored when trim is the whole job.
  const trim = atLeast(round1(trimFt * 0.055), t.netSqFt > 0 ? 0 : 6);
  push({
    sku: 'labour:side-trim',
    category: 'Labour',
    description: 'Exterior trim and corners',
    qty: trim.hours, unit: 'hours', hours: trim.hours, tradeId: 'siding',
    basis: trim.floored
      ? `${round1(trimFt)} lin ft at 0.055 hr/ft, raised to the 6 hour minimum`
      : `${round1(trimFt)} lin ft at 0.055 hr/ft`,
  });

  if (t.wrapSqFt > 0) {
    const wrapHours = round1(t.wrapSqFt * 0.008);
    push({
      sku: 'labour:side-wrap',
      category: 'Labour',
      description: 'House wrap and flashing',
      qty: wrapHours, unit: 'hours', hours: wrapHours, tradeId: 'siding',
      basis: `${t.wrapSqFt} sq ft at 0.008 hr/sq ft`,
    });
  }

  if (opts.includeTearOff) {
    const tearHours = round1(t.grossSqFt * opts.tearOffHoursPerSqFt);
    push({
      sku: 'labour:side-tearoff',
      category: 'Labour',
      description: 'Strip the existing siding',
      qty: tearHours, unit: 'hours', hours: tearHours, tradeId: 'laboring',
      basis: `${t.grossSqFt} sq ft at ${opts.tearOffHoursPerSqFt} hr/sq ft`,
    });
    push({
      sku: 'disposal:siding',
      category: 'Disposal',
      description: 'Skip and disposal of the old siding',
      qty: 1, unit: 'each',
      basis: 'one container — check against the area on a large house',
    });
  }

  // Staging is charged only against the walls that need it, which the takeoff
  // counts separately. A ranch with one two-storey gable end should not be
  // priced as though the crew staged the whole house.
  if (t.stagingSqFt > 0 && opts.stagingHoursPerSqFt > 0) {
    const stagingHours = round1(t.stagingSqFt * opts.stagingHoursPerSqFt);
    push({
      sku: 'labour:side-staging',
      category: 'Labour',
      description: 'Staging to the upper storey',
      qty: stagingHours, unit: 'hours', hours: stagingHours, tradeId: 'laboring',
      basis: `${t.stagingSqFt} sq ft of two-storey wall at ${opts.stagingHoursPerSqFt} hr/sq ft`,
    });
  }

  const totalHours = round2(lines.reduce((s, l) => s + (Number(l.hours) || 0), 0));

  return {
    takeoff: t,
    lines,
    totalHours,
    basis: t.basis,
    // The quantity note travels with the quote, because a quote is where
    // somebody is most likely to forget the walls were never measured.
    note: t.note,
  };
}
