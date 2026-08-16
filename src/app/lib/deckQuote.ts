/**
 * deckQuote — the bill of materials, and what it costs.
 *
 * TWO HALVES, AND THE DIFFERENCE BETWEEN THEM MATTERS.
 *
 * The QUANTITIES are computed, exactly, from the same members that get drawn.
 * Every joist, every block, every baluster, every footing is counted off the
 * model, so the quote cannot disagree with the framing plan or the permit set.
 * Boards are rounded up to lengths that are actually sold — you cannot buy a
 * 12.4ft joist — and waste is added as a stated percentage rather than hidden
 * in the numbers.
 *
 * The PRICES are not computed. They come from a price book the builder fills
 * in, because a unit price depends on the supplier, the season, the region and
 * the account, and a plausible invented price is the worst possible thing to
 * put in front of a customer: it is specific enough to be believed and wrong
 * enough to lose money on. An unpriced line comes back as unpriced and is
 * counted, so nobody sends a quote that silently omitted the concrete.
 */
import { buildMembers, LUMBER_ACTUAL, type DeckModel } from './deckModel';
import { deckingFinish, railFinish } from './deckFinishes';

/** Lengths lumber is actually sold in, feet. */
const STOCK_LENGTHS = [8, 10, 12, 14, 16, 20];

function purchaseLength(ft: number): number {
  for (const l of STOCK_LENGTHS) if (l >= ft - 0.02) return l;
  // Longer than stock: it will be spliced or specially ordered. Report the true
  // length rather than pretending a 20ft board covers it.
  return Math.ceil(ft);
}

export interface QuoteLine {
  /** Stable key, used by the price book. */
  sku: string;
  category: 'Framing' | 'Decking' | 'Railing' | 'Stairs' | 'Foundation' | 'Hardware' | 'Labour';
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  /** True when no price exists for this line yet. */
  unpriced: boolean;
  /** How the quantity was arrived at, shown so it can be checked. */
  basis?: string;
}

export type PriceBook = Record<string, number>;

/** Waste allowances by category, as a percentage. Stated, never hidden. */
export interface QuoteOptions {
  lumberWastePct: number;
  deckingWastePct: number;
  /** Crew hourly rate. Zero means labour is left off. */
  labourRate: number;
  /** Hours per square foot of deck. Builder's own productivity number. */
  hoursPerSqFt: number;
  marginPct: number;
  taxRatePct: number;
}

export const DEFAULT_QUOTE_OPTIONS: QuoteOptions = {
  lumberWastePct: 10,
  deckingWastePct: 10,
  labourRate: 0,
  hoursPerSqFt: 0,
  marginPct: 0,
  taxRatePct: 0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Group members into purchasable lines.
 *
 * Lumber is grouped by size AND by the stock length it will be bought in,
 * because that is how it is ordered and how it is priced — thirteen 2x10s at
 * 12ft is a line on a supplier's ticket in a way that "146 linear feet" is not.
 */
export function buildQuoteLines(
  m: DeckModel,
  prices: PriceBook,
  opts: QuoteOptions,
): { lines: QuoteLine[]; unpricedCount: number } {
  const members = buildMembers(m);
  const lines: QuoteLine[] = [];
  const price = (sku: string) => Number(prices[sku]) || 0;

  const push = (
    sku: string, category: QuoteLine['category'], description: string,
    qty: number, unit: string, basis?: string,
  ) => {
    if (qty <= 0) return;
    const unitPrice = price(sku);
    lines.push({
      sku, category, description,
      qty: Math.round(qty * 100) / 100,
      unit, unitPrice,
      total: round2(qty * unitPrice),
      unpriced: unitPrice <= 0,
      basis,
    });
  };

  const waste = (n: number, pct: number) => Math.ceil(n * (1 + pct / 100));

  /* ── Framing lumber, grouped by size and stock length ── */
  const lumber = new Map<string, { size: string; len: number; count: number }>();
  const addLumber = (size: string, lengthFt: number, count = 1) => {
    const len = purchaseLength(lengthFt);
    const key = `${size}@${len}`;
    const hit = lumber.get(key);
    if (hit) hit.count += count;
    else lumber.set(key, { size, len, count });
  };

  for (const mem of members) {
    const [sx, sy, sz] = mem.size;
    const long = Math.max(sx, sy, sz);
    switch (mem.kind) {
      case 'joist': addLumber(m.joistSize, long); break;
      case 'rim': case 'ledger': addLumber(m.joistSize, long); break;
      case 'blocking': addLumber(m.joistSize, Math.max(1, long)); break;
      case 'beam': {
        // A built-up beam is N separate plies, each bought as its own board.
        for (let i = 0; i < m.beamPlies; i++) addLumber(m.beamSize, long);
        break;
      }
      case 'post': addLumber(m.postSize, Math.max(4, long + 1)); break;
      default: break;
    }
  }

  for (const { size, len, count } of [...lumber.values()].sort((a, b) => a.size.localeCompare(b.size) || a.len - b.len)) {
    const withWaste = waste(count, opts.lumberWastePct);
    push(
      `lumber:${size}:${len}`, 'Framing',
      `${size} pressure treated — ${len}ft`,
      withWaste, 'each',
      `${count} required plus ${opts.lumberWastePct}% waste`,
    );
  }

  /* ── Decking ── */
  const fin = deckingFinish(m.deckingFinish);
  const deckBoards = members.filter(x => x.kind === 'decking');
  if (deckBoards.length) {
    const boardLen = purchaseLength(Math.max(...deckBoards.map(b => Math.max(b.size[0], b.size[2]))));
    const count = waste(deckBoards.length, opts.deckingWastePct);
    push(
      `decking:${m.deckingFinish}:${boardLen}`, 'Decking',
      `${fin.family} decking, ${fin.label} — ${boardLen}ft`,
      count, 'each',
      `${deckBoards.length} boards plus ${opts.deckingWastePct}% waste`,
    );
    push(
      `hidden-fastener:${m.deckingFinish}`, 'Hardware',
      'Deck fasteners / hidden clips',
      Math.ceil(m.widthFt * m.depthFt), 'sq ft', 'By deck area',
    );
  }

  /* ── Railing, counted as the parts it is built from ── */
  const rf = railFinish(m.railFinish);
  const rails = members.filter(x => x.kind === 'rail');
  if (rails.length) {
    const posts = rails.filter(x => x.part === 'frame' && x.id.includes('post')).length
      + rails.filter(x => x.id.includes('newel')).length;
    const infill = rails.filter(x => x.part === 'infill').length;
    const runs = rails.filter(x => x.part === 'frame' && !x.id.includes('post') && !x.id.includes('newel'));
    const railFt = runs.reduce((n, r) => n + Math.max(r.size[0], r.size[2]), 0);

    push(`rail:post:${m.railFinish}`, 'Railing', `Railing post — ${rf.label}`, posts, 'each');
    push(`rail:run:${m.railFinish}`, 'Railing', `Top and bottom rail — ${rf.label}`,
      Math.ceil(railFt), 'lin ft', 'Total of every rail run');
    push(
      `rail:infill:${m.railFinish}`, 'Railing',
      rf.infill === 'cable' ? 'Cable run and fittings'
        : rf.infill === 'glass' ? 'Glass panel'
        : `Baluster — ${rf.label}`,
      infill, 'each',
    );
    if (m.innerHandrail) {
      push(`rail:handrail:${m.railFinish}`, 'Railing', 'Graspable handrail and brackets', 2, 'run');
    }
  }

  /* ── Stairs ── */
  const treads = members.filter(x => x.kind === 'stair' && !x.id.startsWith('stringer'));
  const stringers = members.filter(x => x.id.startsWith('stringer'));
  if (treads.length) {
    push(`stair:tread:${m.deckingFinish}`, 'Stairs', `Stair tread — ${fin.label}`,
      waste(treads.length, opts.deckingWastePct), 'each', `${treads.length} treads plus waste`);
    push('stair:stringer', 'Stairs', '2x12 cut stringer', stringers.length, 'each');
    push('stair:connector', 'Stairs', 'Stringer connectors', stringers.length, 'each');
  }

  /* ── Foundation ── */
  const footings = members.filter(x => x.kind === 'footing' && x.id.startsWith('footing'));
  if (footings.length) {
    // Concrete by volume of the footings actually drawn, converted to yards.
    const cuFt = footings.reduce((n, f) => n + f.size[0] * f.size[1] * f.size[2], 0);
    const yards = Math.ceil((cuFt / 27) * 10) / 10;
    push('foundation:tube', 'Foundation', 'Concrete form tube', footings.length, 'each');
    push('foundation:concrete', 'Foundation', 'Concrete', yards, 'cu yd',
      `${Math.round(cuFt)} cu ft of footings`);
    push('foundation:postbase', 'Hardware', 'Standoff post base and anchor', footings.length, 'each');
  }

  /* ── Hardware that follows from the framing ── */
  const joists = members.filter(x => x.kind === 'joist').length;
  if (joists) {
    push('hardware:hanger', 'Hardware', 'Joist hanger', joists * (m.ledgerAttached ? 2 : 1), 'each',
      m.ledgerAttached ? 'Both ends of every joist' : 'One end of every joist');
  }
  if (m.ledgerAttached) {
    push('hardware:ledger-fastener', 'Hardware', '½in ledger fastener',
      Math.ceil((m.widthFt * 12) / 11) * 2, 'each', 'Two staggered rows');
    push('hardware:flashing', 'Hardware', 'Ledger flashing', Math.ceil(m.widthFt), 'lin ft');
  }
  push('hardware:postcap', 'Hardware', 'Post-to-beam connector',
    members.filter(x => x.kind === 'post').length, 'each');

  /* ── Labour ── */
  const area = m.widthFt * m.depthFt;
  if (opts.labourRate > 0 && opts.hoursPerSqFt > 0) {
    const hours = Math.ceil(area * opts.hoursPerSqFt);
    push('labour:build', 'Labour', 'Build labour', hours, 'hr',
      `${area} sq ft at ${opts.hoursPerSqFt} hr/sq ft`);
    // Priced from the rate rather than the book, so the rate field drives it.
    const line = lines[lines.length - 1];
    if (line?.sku === 'labour:build') {
      line.unitPrice = opts.labourRate;
      line.total = round2(hours * opts.labourRate);
      line.unpriced = false;
    }
  }

  return { lines, unpricedCount: lines.filter(l => l.unpriced).length };
}

export interface QuoteTotals {
  materials: number;
  labour: number;
  subtotal: number;
  margin: number;
  tax: number;
  total: number;
}

/**
 * Totals.
 *
 * Tax lands on materials only, which is how it works in most states for a
 * construction contract, and margin is applied before tax rather than after —
 * applying it after would understate what is actually owed.
 */
export function quoteTotals(lines: QuoteLine[], opts: QuoteOptions): QuoteTotals {
  const materials = round2(lines.filter(l => l.category !== 'Labour').reduce((n, l) => n + l.total, 0));
  const labour = round2(lines.filter(l => l.category === 'Labour').reduce((n, l) => n + l.total, 0));
  const subtotal = round2(materials + labour);
  const margin = round2(subtotal * (opts.marginPct / 100));
  const tax = round2((materials + materials * (opts.marginPct / 100)) * (opts.taxRatePct / 100));
  return { materials, labour, subtotal, margin, tax, total: round2(subtotal + margin + tax) };
}
