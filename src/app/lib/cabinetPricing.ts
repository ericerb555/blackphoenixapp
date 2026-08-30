/**
 * Pricing a kitchen or a bathroom.
 *
 * BUILT FOR VENDOR PRICES BEFORE THERE ARE ANY
 *
 * Every priceable thing here has a stable SKU, and the SKU is what the existing
 * `/quote/price-lines` route already looks up in the vendor catalogues. So when
 * a cabinet supplier is attached to the app, their prices arrive through the
 * same door siding and flooring already use, and nothing in this file changes.
 * That is the whole reason the fallback below is a fallback rather than the
 * design: it exists to make the tool usable today, and to get out of the way
 * the moment a real price exists.
 *
 * THREE PLACES A PRICE CAN COME FROM, AND THEY ARE NEVER CONFLATED
 *
 *   catalogue  A vendor's price for this exact cabinet code. The real answer.
 *   standard   A per-linear-foot figure for the grade. An industry ballpark,
 *              honest enough to talk to a customer with and not honest enough
 *              to sign a contract on.
 *   estimated  Nothing to go on.
 *
 * A quote that cannot tell these apart is how a ballpark becomes a fixed price
 * by accident. Every line says which it is, and the summary counts them.
 *
 * WHY NOTHING IS SILENTLY DROPPED
 *
 * A line with no price is kept and marked, never excluded. Excluding it makes a
 * total that looks complete and is short by exactly whatever that line costs —
 * the worst of the three available behaviours.
 */
import type { ScheduleLine, CabinetRun, CounterTakeoff } from './cabinetModel';
import { CABINETS, cabinetTotals, counterTakeoff } from './cabinetModel';
import type { QuoteLine, QuoteOptions, QuoteTotals } from './deckQuote';
import { quoteTotals } from './deckQuote';
import type { TradeRates } from './sidingPricing';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Matches the vocabulary the server already uses in repriceEstimate. */
export type PriceSource = 'catalogue' | 'your-rate' | 'standard' | 'estimated';

/**
 * Cabinet grade.
 *
 * The single biggest driver of what a kitchen costs, and the thing customers
 * actually choose between. Stock is what sits in a warehouse; custom is built
 * to the opening.
 */
export type CabinetGrade = 'stock' | 'semi-custom' | 'custom';

export const GRADES: Array<{ id: CabinetGrade; label: string; note: string }> = [
  { id: 'stock', label: 'Stock', note: 'Warehouse sizes, shortest lead time.' },
  { id: 'semi-custom', label: 'Semi-custom', note: 'Stock boxes, chosen finishes and modifications.' },
  { id: 'custom', label: 'Custom', note: 'Built to the opening. No fillers if you do not want them.' },
];

/**
 * Per-linear-foot fallbacks by grade and family, in dollars.
 *
 * Deliberately broad industry figures rather than anyone's actual price list.
 * They are here so a kitchen can be talked about on a first visit, and every
 * line priced from them is marked `standard` so nobody mistakes them for a
 * quote. Wall cabinets are cheaper per foot than base because there is no
 * worktop, no toe kick and less box.
 */
export const GRADE_PER_LINEAR_FT: Record<CabinetGrade, { base: number; wall: number; tall: number; vanity: number }> = {
  'stock':       { base: 165, wall: 120, tall: 300, vanity: 175 },
  'semi-custom': { base: 290, wall: 210, tall: 520, vanity: 300 },
  'custom':      { base: 480, wall: 350, tall: 850, vanity: 500 },
};

export type CounterMaterial =
  | 'laminate' | 'butcher-block' | 'granite' | 'quartz' | 'solid-surface' | 'tile';

export const COUNTER_MATERIALS: Array<{ id: CounterMaterial; label: string; sku: string; perSqFt: number }> = [
  { id: 'laminate',      label: 'Laminate',      sku: 'counter:laminate',      perSqFt: 32 },
  { id: 'butcher-block', label: 'Butcher block', sku: 'counter:butcher-block', perSqFt: 68 },
  { id: 'tile',          label: 'Tile',          sku: 'counter:tile',          perSqFt: 45 },
  { id: 'solid-surface', label: 'Solid surface', sku: 'counter:solid-surface', perSqFt: 82 },
  { id: 'granite',       label: 'Granite',       sku: 'counter:granite',       perSqFt: 95 },
  { id: 'quartz',        label: 'Quartz',        sku: 'counter:quartz',        perSqFt: 110 },
];

/** Cutouts and edge work a fabricator charges separately. */
export const COUNTER_EXTRAS = {
  sinkCutout: { sku: 'counter:sink-cutout', label: 'Sink cutout', price: 150 },
  cooktopCutout: { sku: 'counter:cooktop-cutout', label: 'Hob cutout', price: 175 },
};

/**
 * Install hours.
 *
 * Per box rather than per foot, because hanging a cabinet is the same work
 * whether it is 12 inches or 36. Wall cabinets take longer than base — they are
 * held up while they are levelled and screwed.
 */
export const HOURS = {
  baseBox: 0.9,
  wallBox: 1.2,
  tallBox: 1.5,
  hardwarePiece: 0.15,
  counterTemplate: 2,
  counterInstallPerLinFt: 0.35,
  fixtureSet: 2.5,
};

/** The trade that does each part, so each is charged at its own rate. */
export const TRADE_FOR = {
  cabinets: 'carpentry',
  counters: 'carpentry',
  plumbing: 'plumbing',
  electrical: 'electrical',
};

export interface PricedLine extends QuoteLine {
  source: PriceSource;
}

export interface KitchenQuote {
  lines: PricedLine[];
  totals: QuoteTotals;
  counter: CounterTakeoff;
  /** Lines with no price at all. */
  unpricedCount: number;
  /** Lines resting on a grade ballpark rather than a vendor price. */
  standardCount: number;
  /** True when nothing came from a real catalogue. */
  allBallpark: boolean;
}

export interface KitchenPricingInput {
  schedule: ScheduleLine[];
  runs: CabinetRun[];
  grade: CabinetGrade;
  counterMaterial: CounterMaterial;
  /** SKU → unit price, from `/quote/price-lines`. Vendor catalogue prices. */
  prices: Record<string, number>;
  rates: TradeRates;
  opts: QuoteOptions;
  fullHeightSplash?: boolean;
  cooktops?: number;
  /** Appliances and sanitaryware, when they are ours to supply. */
  fixtures?: Array<{ label: string; sku?: string; price?: number }>;
}

/** The SKU a cabinet code maps to. Vendors publish against these. */
export function cabinetSku(code: string): string {
  return `cab:${code}`;
}

/**
 * Price a kitchen or a bathroom.
 *
 * Cabinets are priced per box from the catalogue where a vendor has published
 * that code, and per linear foot from the grade where they have not. Mixing the
 * two within one quote is fine and is in fact the normal case early on — what
 * matters is that each line says which it was.
 */
export function priceKitchen(input: KitchenPricingInput): KitchenQuote {
  const { schedule, runs, grade, prices, rates, opts } = input;
  const lines: PricedLine[] = [];
  const perFt = GRADE_PER_LINEAR_FT[grade];

  // ── cabinets, one line per schedule row ──
  for (const row of schedule) {
    const sku = cabinetSku(row.code);
    const catalogue = Number(prices[sku]) || 0;
    const family = CABINETS[row.type].family;
    const widthFt = row.widthIn / 12;

    const fallback = round2(widthFt * (perFt[family] ?? perFt.base));
    const unitPrice = catalogue > 0 ? round2(catalogue) : fallback;
    const source: PriceSource = catalogue > 0 ? 'catalogue'
      : fallback > 0 ? 'standard' : 'estimated';

    lines.push({
      sku,
      category: 'Hardware',
      description: `${row.mark} · ${row.code} ${row.label} ${row.widthIn}×${row.heightIn}×${row.depthIn}in`,
      qty: row.quantity,
      unit: 'ea',
      unitPrice,
      total: round2(row.quantity * unitPrice),
      unpriced: !(unitPrice > 0),
      basis: catalogue > 0
        ? 'vendor catalogue'
        : `${grade} grade at $${perFt[family] ?? perFt.base}/lin ft`,
      source,
    });
  }

  // ── worktop ──
  const counter = counterTakeoff(runs, {
    fullHeightSplash: input.fullHeightSplash,
    cooktops: input.cooktops,
  });
  const mat = COUNTER_MATERIALS.find(m => m.id === input.counterMaterial) || COUNTER_MATERIALS[0];
  const counterCatalogue = Number(prices[mat.sku]) || 0;
  const counterUnit = counterCatalogue > 0 ? round2(counterCatalogue) : mat.perSqFt;

  if (counter.sqFt > 0) {
    lines.push({
      sku: mat.sku, category: 'Decking',
      description: `${mat.label} worktop`,
      qty: counter.sqFt, unit: 'sq ft',
      unitPrice: counterUnit,
      total: round2(counter.sqFt * counterUnit),
      unpriced: !(counterUnit > 0),
      basis: `${counter.linearFt} linear feet at 25.5in deep`,
      source: counterCatalogue > 0 ? 'catalogue' : 'standard',
    });
  }

  for (const [count, extra] of [
    [counter.sinkCutouts, COUNTER_EXTRAS.sinkCutout],
    [counter.cooktopCutouts, COUNTER_EXTRAS.cooktopCutout],
  ] as const) {
    if (count > 0) {
      const cat = Number(prices[extra.sku]) || 0;
      const unit = cat > 0 ? round2(cat) : extra.price;
      lines.push({
        sku: extra.sku, category: 'Decking', description: extra.label,
        qty: count, unit: 'ea', unitPrice: unit, total: round2(count * unit),
        unpriced: !(unit > 0), basis: 'fabricator charge',
        source: cat > 0 ? 'catalogue' : 'standard',
      });
    }
  }

  // ── appliances and sanitaryware, only when we supply them ──
  for (const f of input.fixtures || []) {
    const sku = f.sku || `fixture:${f.label.toLowerCase().replace(/\s+/g, '-')}`;
    const cat = Number(prices[sku]) || 0;
    const unit = cat > 0 ? round2(cat) : round2(Number(f.price) || 0);
    lines.push({
      sku, category: 'Hardware', description: f.label,
      qty: 1, unit: 'ea', unitPrice: unit, total: unit,
      unpriced: !(unit > 0),
      basis: cat > 0 ? 'vendor catalogue' : (unit > 0 ? 'allowance' : 'not priced'),
      source: cat > 0 ? 'catalogue' : (unit > 0 ? 'your-rate' : 'estimated'),
    });
  }

  // ── labour, each part at the rate of the trade that does it ──
  const t = cabinetTotals(runs);
  const carpentry = Number(rates[TRADE_FOR.cabinets]) || 0;

  const hangHours = round2(
    (t.baseLinearFt > 0 || t.wallLinearFt > 0 || t.tallLinearFt > 0)
      ? runs.reduce((sum, run) => sum + run.cabinets.reduce((h, c) => {
          const fam = CABINETS[c.type].family;
          return h + (fam === 'wall' ? HOURS.wallBox : fam === 'tall' ? HOURS.tallBox : HOURS.baseBox);
        }, 0), 0)
      : 0,
  );
  const hardwareHours = round2(t.hardware * HOURS.hardwarePiece);
  const counterHours = counter.linearFt > 0
    ? round2(HOURS.counterTemplate + counter.linearFt * HOURS.counterInstallPerLinFt)
    : 0;

  const labourRows: Array<[string, string, number]> = [
    ['labour:cabinet-hang', `Hanging ${t.boxes} cabinet${t.boxes === 1 ? '' : 's'}`, hangHours],
    ['labour:hardware', `Fitting ${t.hardware} handles and hinges`, hardwareHours],
    ['labour:counter', 'Templating and setting the worktop', counterHours],
  ];

  for (const [sku, description, hours] of labourRows) {
    if (hours <= 0) continue;
    lines.push({
      sku, category: 'Labour', description,
      qty: hours, unit: 'hr',
      unitPrice: round2(carpentry),
      total: round2(hours * carpentry),
      unpriced: !(carpentry > 0),
      basis: carpentry > 0 ? 'your carpentry rate' : 'no carpentry rate set',
      source: carpentry > 0 ? 'your-rate' : 'estimated',
    });
  }

  const totals = quoteTotals(lines, opts);
  const unpricedCount = lines.filter(l => l.unpriced).length;
  const standardCount = lines.filter(l => l.source === 'standard').length;

  return {
    lines, totals, counter, unpricedCount, standardCount,
    allBallpark: lines.length > 0 && !lines.some(l => l.source === 'catalogue'),
  };
}

/**
 * Every SKU this quote wants a price for.
 *
 * Handed to `/quote/price-lines` so the vendor catalogues are asked about
 * exactly the cabinets in this kitchen, rather than the whole catalogue being
 * pulled down to find six of them.
 */
export function skusToPrice(schedule: ScheduleLine[], material: CounterMaterial): Array<{ sku: string; description: string }> {
  const out = schedule.map(row => ({
    sku: cabinetSku(row.code),
    description: `${row.code} ${row.label} ${row.widthIn}×${row.heightIn}in`,
  }));
  const mat = COUNTER_MATERIALS.find(m => m.id === material) || COUNTER_MATERIALS[0];
  out.push({ sku: mat.sku, description: `${mat.label} worktop` });
  out.push({ sku: COUNTER_EXTRAS.sinkCutout.sku, description: COUNTER_EXTRAS.sinkCutout.label });
  out.push({ sku: COUNTER_EXTRAS.cooktopCutout.sku, description: COUNTER_EXTRAS.cooktopCutout.label });
  return out;
}

/** One honest sentence about how much of this quote is real. */
export function confidenceNote(q: KitchenQuote): string {
  if (!q.lines.length) return 'Nothing to price yet.';
  if (q.unpricedCount > 0) {
    return `${q.unpricedCount} line${q.unpricedCount === 1 ? '' : 's'} have no price at all — the total is short by whatever they cost.`;
  }
  if (q.allBallpark) {
    return 'Every figure is an industry ballpark for the grade. Good enough to discuss, not to sign.';
  }
  if (q.standardCount > 0) {
    return `${q.standardCount} line${q.standardCount === 1 ? ' rests' : 's rest'} on a grade ballpark rather than a vendor price.`;
  }
  return 'Every line came from a vendor catalogue or your own rates.';
}
