/**
 * Doors and windows, as a schedule and as a quote.
 *
 * WHY A SCHEDULE RATHER THAN A MODEL
 *
 * A deck is one structure with a shape. A window job is a list: eleven
 * openings, each with a type, a size and a place in the house. There is nothing
 * to draw and nothing to frame — the work is counting them accurately, getting
 * the sizes right, and knowing which are a straight insert and which mean
 * opening the wall up.
 *
 * That distinction is the money. An insert drops into the existing frame; a
 * full-frame replacement means trim off, flashing, and making good inside and
 * out. Same window, roughly double the labour, and it is the single thing most
 * often got wrong when quoting these.
 *
 * WHERE THE HOURS COME FROM
 *
 * Seeded figures in the same shape as `laborTasks.ts`, which already carries an
 * interior door at 1.2 hours. They are starting points for Eric to correct
 * against his own crews, not measurements — and they are marked as such
 * wherever they surface.
 */

import type { QuoteLine, QuoteOptions, QuoteTotals } from './deckQuote';
import { quoteTotals } from './deckQuote';
import type { DimensionSource } from './exteriorModel';

export type OpeningKind =
  | 'window'
  | 'entry-door'
  | 'patio-door'
  | 'interior-door';

/** Insert into the existing frame, or take the whole thing out. */
export type FitMethod = 'insert' | 'full-frame';

export interface OpeningRow {
  id: string;
  /** Where it is, in the words somebody would use on site. */
  label: string;
  kind: OpeningKind;
  widthIn: number;
  heightIn: number;
  count: number;
  fit: FitMethod;
  source: DimensionSource;
}

export const OPENING_KINDS: Array<{ id: OpeningKind; label: string; sku: string }> = [
  { id: 'window', label: 'Window', sku: 'opening:window' },
  { id: 'entry-door', label: 'Entry door', sku: 'opening:entry-door' },
  { id: 'patio-door', label: 'Patio / slider', sku: 'opening:patio-door' },
  { id: 'interior-door', label: 'Interior door', sku: 'opening:interior-door' },
];

/**
 * Hours to fit one, before the size adjustment.
 *
 * An insert is the quick case. Full-frame roughly doubles it, because the trim
 * comes off, the opening gets flashed, and both faces need making good.
 */
const FIT_HOURS: Record<OpeningKind, { insert: number; full: number; trade: string }> = {
  'window':         { insert: 1.8, full: 3.6, trade: 'carpentry' },
  'entry-door':     { insert: 3.0, full: 5.0, trade: 'carpentry' },
  'patio-door':     { insert: 4.0, full: 6.5, trade: 'carpentry' },
  // The one figure that already existed, kept rather than re-invented.
  'interior-door':  { insert: 1.2, full: 2.4, trade: 'carpentry' },
};

/**
 * United inches — width plus height.
 *
 * The trade's own measure of how big an opening is, and what suppliers band
 * their prices by. Used here to scale labour: a 96-inch patio slider is not the
 * same hour as a 48-inch bathroom window, and pricing them alike under-quotes
 * the big ones and over-quotes the small.
 */
export function unitedInches(o: OpeningRow): number {
  return (Number(o.widthIn) || 0) + (Number(o.heightIn) || 0);
}

/**
 * How much longer a big opening takes.
 *
 * Anchored at 100 united inches — an ordinary 40 × 60 window — and deliberately
 * gentle: a unit twice the size is heavier and needs two people, not twice the
 * hours. Floored so a small window never prices as trivial, since the travel,
 * the setup and the clean-up do not shrink with it.
 */
export function sizeFactor(ui: number): number {
  if (!(ui > 0)) return 1;
  return Math.max(0.8, Math.min(1.9, 0.55 + (ui / 100) * 0.45));
}

export interface OpeningsTakeoff {
  rows: number;
  units: number;
  byKind: Record<string, number>;
  fullFrame: number;
  /** Trim and flashing follow the perimeter of every opening. */
  perimeterFt: number;
  basis: DimensionSource;
  note: string;
}

const SOURCE_RANK: Record<DimensionSource, number> = { measured: 3, scaled: 2, estimated: 1 };
const round1 = (n: number) => Math.round((Number(n) || 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function openingsTakeoff(rows: OpeningRow[]): OpeningsTakeoff {
  const live = (rows || []).filter(r => Number(r.count) > 0 && Number(r.widthIn) > 0 && Number(r.heightIn) > 0);

  const byKind: Record<string, number> = {};
  let units = 0;
  let fullFrame = 0;
  let perimeterIn = 0;

  for (const r of live) {
    const n = Math.max(0, Math.round(Number(r.count) || 0));
    units += n;
    byKind[r.kind] = (byKind[r.kind] || 0) + n;
    if (r.fit === 'full-frame') fullFrame += n;
    perimeterIn += n * 2 * ((Number(r.widthIn) || 0) + (Number(r.heightIn) || 0));
  }

  const worst = live.length
    ? live.reduce<DimensionSource>((w, r) => (SOURCE_RANK[r.source] < SOURCE_RANK[w] ? r.source : w), 'measured')
    : 'estimated';

  return {
    rows: live.length,
    units,
    byKind,
    fullFrame,
    perimeterFt: round1(perimeterIn / 12),
    basis: worst,
    note: !live.length
      ? 'No openings scheduled yet.'
      : worst === 'measured'
        ? 'Every opening was measured. These sizes can be ordered against.'
        : worst === 'scaled'
          ? 'Some sizes were scaled from a photograph rather than measured. Every unit should be measured before it is ordered — a window ordered to the wrong size is scrap.'
          : 'At least one opening is estimated. Nothing here should be ordered until it is measured; a window is made to the size you give.',
  };
}

/**
 * The schedule as quote lines.
 *
 * One material line per kind rather than per opening, because a supplier quotes
 * a run of windows and not eleven separate purchases — and one labour line per
 * kind and fit, because that is the distinction that changes the hours.
 */
export function buildOpeningsQuote(
  rows: OpeningRow[],
  materialPrices: Record<string, number>,
  rates: Record<string, number>,
  opts: QuoteOptions,
): { lines: QuoteLine[]; totals: QuoteTotals; unpricedCount: number; takeoff: OpeningsTakeoff } {
  const takeoff = openingsTakeoff(rows);
  const live = (rows || []).filter(r => Number(r.count) > 0 && Number(r.widthIn) > 0 && Number(r.heightIn) > 0);
  const lines: QuoteLine[] = [];

  for (const kind of OPENING_KINDS) {
    const mine = live.filter(r => r.kind === kind.id);
    if (!mine.length) continue;

    const qty = mine.reduce((n, r) => n + Math.round(Number(r.count) || 0), 0);
    const unitPrice = round2(Number(materialPrices[kind.sku]) || 0);
    const sizes = mine.map(r => `${r.widthIn}×${r.heightIn}`).join(', ');

    lines.push({
      sku: kind.sku,
      category: 'Decking',
      description: `${kind.label}${qty > 1 ? 's' : ''}`,
      qty, unit: 'each', unitPrice, total: round2(qty * unitPrice),
      unpriced: !(unitPrice > 0),
      basis: sizes.length > 60 ? `${mine.length} sizes` : sizes,
    });

    // Labour split by fit, because that is where the hours actually differ.
    for (const fit of ['insert', 'full-frame'] as FitMethod[]) {
      const set = mine.filter(r => r.fit === fit);
      if (!set.length) continue;
      const base = FIT_HOURS[kind.id][fit === 'insert' ? 'insert' : 'full'];
      const hours = round1(set.reduce(
        (n, r) => n + (Math.round(Number(r.count) || 0) * base * sizeFactor(unitedInches(r))), 0,
      ));
      const rate = round2(Number(rates[FIT_HOURS[kind.id].trade]) || 0);
      lines.push({
        sku: `labour:opening-${kind.id}-${fit}`,
        category: 'Labour',
        description: `Fit ${kind.label.toLowerCase()}${set.length > 1 ? 's' : ''} — ${fit === 'insert' ? 'insert' : 'full frame'}`,
        qty: hours, unit: 'hours', unitPrice: rate, total: round2(hours * rate),
        unpriced: !(rate > 0),
        basis: `${set.reduce((n, r) => n + Math.round(Number(r.count) || 0), 0)} at ${base} hr, adjusted for size`,
      });
    }
  }

  if (takeoff.perimeterFt > 0) {
    const unitPrice = round2(Number(materialPrices['opening:trim']) || 0);
    lines.push({
      sku: 'opening:trim',
      category: 'Railing',
      description: 'Exterior trim and flashing to openings',
      qty: takeoff.perimeterFt, unit: 'lin ft', unitPrice,
      total: round2(takeoff.perimeterFt * unitPrice),
      unpriced: !(unitPrice > 0),
      basis: 'perimeter of every opening',
    });
  }

  return {
    lines,
    totals: quoteTotals(lines, opts),
    unpricedCount: lines.filter(l => l.unpriced).length,
    takeoff,
  };
}
