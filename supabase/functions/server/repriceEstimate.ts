/**
 * Replacing the model's guesses with the company's real numbers.
 *
 * WHAT THIS FIXES
 *
 * The estimator asks gpt-4o for a full takeoff and then prices it with whatever
 * the model believes things cost. That belief comes from training data: it is
 * not this week's lumber price, it is not Eric's hourly rate, and it is not his
 * markup. The fallback path went as far as inventing a supplier called "Supply
 * House". Quotes built that way look authoritative and are quietly wrong, which
 * is worse than looking uncertain.
 *
 * THE DIVISION OF LABOUR
 *
 * The model is good at the takeoff — what work is involved, what materials it
 * needs, roughly how much of each. It is not a price list. So the model keeps
 * the quantities and this replaces every number we hold a real figure for:
 *
 *   material unit cost  ->  the vendor's published catalogue price
 *   labour hourly rate  ->  the company's rate for that trade
 *   markup, overhead,
 *   profit, tax         ->  the company's pricing settings
 *
 * WHY EVERY LINE CARRIES ITS SOURCE
 *
 * A quote that mixes real prices with estimates and shows neither is a quote
 * nobody can check. Each line comes back marked `catalogue`, `your-rate` or
 * `estimated`, so the person sending it knows which figures are solid and the
 * customer can be told honestly where a number came from.
 */

export interface CatalogItem {
  vendorId?: string;
  vendorName?: string;
  name?: string;
  sku?: string;
  unit?: string;
  price?: number;
  updatedAt?: string;
  isActive?: boolean;
}

export interface LaborRate { id?: string; category?: string; hourlyRate?: number }

export interface PricingSettings {
  materialMarkup?: number;
  materialMarkupByCategory?: Record<string, number>;
  laborMarkup?: number;
  profitMargin?: number;
  overheadPercentage?: number;
  taxRate?: number;
}

/**
 * Where a number came from.
 *
 * `standard` sits deliberately between the company's own figures and the
 * model's guess. A standard trade rate is a real, defensible number — far
 * better than training-data recall — but it is not this company's rate, and a
 * quote that cannot tell those apart is the same dishonesty in a smarter suit.
 */
export type PriceSource = 'catalogue' | 'your-rate' | 'standard' | 'estimated';

/**
 * The model's trade words are not the company's trade ids, and the gap is not
 * cosmetic: an unmapped trade silently falls back to the model's invented rate,
 * which is the whole thing this file exists to stop.
 */
const TRADE_MAP: Record<string, string> = {
  demolition: 'laboring', demo: 'laboring', general: 'laboring', cleanup: 'laboring',
  labor: 'laboring', laborer: 'laboring',
  framing: 'carpentry', carpentry: 'carpentry', carpenter: 'carpentry', trim: 'carpentry',
  electrical: 'electrical', electrician: 'electrical',
  plumbing: 'plumbing', plumber: 'plumbing',
  hvac: 'hvac',
  drywall: 'sheetrock', sheetrock: 'sheetrock', taping: 'sheetrock',
  tile: 'tile', tiling: 'tile',
  flooring: 'flooring', floor: 'flooring',
  paint: 'painting', painting: 'painting', painter: 'painting',
  roofing: 'roofing', roof: 'roofing',
  masonry: 'masonry', concrete: 'masonry',
  siding: 'siding',
};

export function mapTrade(raw: unknown): string | null {
  const key = String(raw ?? '').trim().toLowerCase();
  if (!key) return null;
  if (TRADE_MAP[key]) return TRADE_MAP[key];
  // "Licensed Electrician" and "Tile Setter" should still find their trade.
  for (const [word, trade] of Object.entries(TRADE_MAP)) {
    if (key.includes(word)) return trade;
  }
  return null;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Find the catalogue line a material refers to.
 *
 * An exact SKU wins outright. Otherwise every significant word of the catalogue
 * item's name must appear in the material — deliberately strict, because a
 * loose match here does not produce a slightly-off quote, it produces a quote
 * priced from the wrong product. A miss is fine; it is simply marked estimated.
 */
export function matchCatalogItem(
  material: { name?: string; description?: string; sku?: string },
  catalog: CatalogItem[],
): CatalogItem | null {
  const active = catalog.filter(c => c?.isActive !== false && Number(c?.price) > 0);
  if (!active.length) return null;

  const sku = String(material?.sku ?? '').trim().toLowerCase();
  if (sku) {
    const bySku = active.find(c => String(c.sku ?? '').trim().toLowerCase() === sku);
    if (bySku) return bySku;
  }

  const haystack = norm(`${material?.name ?? ''} ${material?.description ?? ''}`);
  if (!haystack) return null;

  let best: CatalogItem | null = null;
  let bestScore = 0;

  for (const item of active) {
    const words = norm(item.name).split(' ').filter(w => w.length > 2);
    if (!words.length) continue;
    const hits = words.filter(w => haystack.includes(w)).length;
    // Every significant word must be present, and a single-word catalogue name
    // like "Screws" is too weak to price a line from on its own.
    if (hits !== words.length || words.length < 2) continue;
    if (words.length > bestScore) { bestScore = words.length; best = item; }
  }
  return best;
}

export interface RepricedMaterial {
  unitCost: number;
  source: PriceSource;
  vendor: string;
  priceAsOf: string | null;
  /** What the model had guessed, kept so the difference can be shown. */
  modelUnitCost: number;
}

export function repriceMaterial(
  material: any,
  catalog: CatalogItem[],
  settings: PricingSettings,
): RepricedMaterial {
  const modelUnitCost = round2(Number(material?.unitCost) || 0);
  const hit = matchCatalogItem(material, catalog);

  const category = String(material?.category ?? '').trim();
  const markupPct = Number(
    settings?.materialMarkupByCategory?.[category] ?? settings?.materialMarkup ?? 0,
  ) || 0;
  const withMarkup = (cost: number) => round2(cost * (1 + markupPct / 100));

  if (hit) {
    return {
      unitCost: withMarkup(Number(hit.price) || 0),
      source: 'catalogue',
      vendor: String(hit.vendorName || material?.vendor || ''),
      priceAsOf: hit.updatedAt || null,
      modelUnitCost,
    };
  }

  // No catalogue match. The model's number is the only one available, so it is
  // kept and marked — but the company's markup still applies, because that part
  // is a real business rule regardless of where the base cost came from.
  return {
    unitCost: withMarkup(modelUnitCost),
    source: 'estimated',
    vendor: String(material?.vendor || ''),
    priceAsOf: null,
    modelUnitCost,
  };
}

export interface RepricedLabor {
  hourlyRate: number;
  source: PriceSource;
  tradeId: string | null;
  modelHourlyRate: number;
}

export function repriceLabor(
  line: any,
  rates: LaborRate[],
  settings: PricingSettings,
  /** True when `rates` are the standard table rather than the company's saved ones. */
  ratesAreStandard = false,
): RepricedLabor {
  const modelRate = round2(Number(line?.hourlyRate) || 0);
  const tradeId = mapTrade(line?.trade) || mapTrade(line?.role);

  const found = tradeId
    ? rates.find(r => String(r.id ?? '').toLowerCase() === tradeId)
    : undefined;

  const laborMarkup = Number(settings?.laborMarkup ?? 0) || 0;
  const apply = (rate: number) => round2(rate * (1 + laborMarkup / 100));

  if (found && Number(found.hourlyRate) > 0) {
    return {
      hourlyRate: apply(Number(found.hourlyRate)),
      source: ratesAreStandard ? 'standard' : 'your-rate',
      tradeId,
      modelHourlyRate: modelRate,
    };
  }
  return { hourlyRate: apply(modelRate), source: 'estimated', tradeId, modelHourlyRate: modelRate };
}

export interface RepriceSummary {
  materialsPriced: number;
  materialsFromCatalogue: number;
  laborPriced: number;
  laborAtYourRates: number;
  laborAtStandardRates: number;
  /**
   * 0–1. How much of the money rests on a real figure rather than the model's
   * recollection — catalogue prices, the company's rates, or standard rates.
   */
  confidence: number;
  /**
   * 0–1. How much rests on THIS COMPANY's figures specifically. Reported apart
   * from confidence because "defensible" and "ours" are different claims, and
   * collapsing them would let a quote priced entirely from a standard table
   * read as though Eric had set every number himself.
   */
  onYourFigures: number;
  /**
   * True when the markup, overhead, margin and tax applied here are the standard
   * ones rather than the company's. Reported because those percentages move
   * every line in the quote, so a screen showing only where the *base* costs
   * came from would still be hiding whose business rules set the final price.
   */
  settingsAreStandard: boolean;
  /** Plain sentence for the screen, so nobody has to interpret a ratio. */
  note: string;
}

/**
 * Reprice a whole estimate in place-safe fashion, returning a new object.
 *
 * Percentages come from settings when set. A configured zero is respected —
 * `?? ` rather than `||`, because a company that genuinely charges no
 * contingency must not have the model's guess put back.
 */
export function repriceEstimate(
  estimate: any,
  deps: {
    catalog: CatalogItem[];
    rates: LaborRate[];
    settings: PricingSettings;
    /** True when rates/settings are the standard tables, not the company's own. */
    ratesAreStandard?: boolean;
    settingsAreStandard?: boolean;
  },
): { estimate: any; summary: RepriceSummary } {
  const { catalog = [], rates = [], settings = {}, ratesAreStandard = false, settingsAreStandard = false } = deps || ({} as any);

  const materials = (Array.isArray(estimate?.materials) ? estimate.materials : []).map((m: any) => {
    const priced = repriceMaterial(m, catalog, settings);
    const quantity = Number(m?.quantity) || 0;
    const waste = Number(m?.wasteFactor) || 0;
    const purchasedQty = round2(quantity * (1 + waste));
    return {
      ...m,
      unitCost: priced.unitCost,
      totalCost: round2(purchasedQty * priced.unitCost),
      vendor: priced.vendor || m?.vendor || '',
      priceSource: priced.source,
      priceAsOf: priced.priceAsOf,
      modelUnitCost: priced.modelUnitCost,
    };
  });

  const labor = (Array.isArray(estimate?.labor) ? estimate.labor : []).map((l: any) => {
    const priced = repriceLabor(l, rates, settings, ratesAreStandard);
    const hours = Number(l?.hours) || 0;
    return {
      ...l,
      hourlyRate: priced.hourlyRate,
      totalCost: round2(hours * priced.hourlyRate),
      rateSource: priced.source,
      tradeId: priced.tradeId,
      modelHourlyRate: priced.modelHourlyRate,
      // Hours remain the model's takeoff — we hold rates, not this job's
      // quantities, and pretending otherwise would be the same mistake in
      // reverse.
      hoursSource: 'estimated' as PriceSource,
    };
  });

  const repriced = {
    ...estimate,
    materials,
    labor,
    overheadPercent: Number(settings?.overheadPercentage ?? estimate?.overheadPercent ?? 0) || 0,
    profitPercent: Number(settings?.profitMargin ?? estimate?.profitPercent ?? 0) || 0,
    taxRatePercent: Number(settings?.taxRate ?? estimate?.taxRatePercent ?? 0) || 0,
  };

  const materialMoney = materials.reduce((s: number, m: any) => s + (Number(m.totalCost) || 0), 0);
  const catalogueMoney = materials
    .filter((m: any) => m.priceSource === 'catalogue')
    .reduce((s: number, m: any) => s + (Number(m.totalCost) || 0), 0);
  const laborMoney = labor.reduce((s: number, l: any) => s + (Number(l.totalCost) || 0), 0);
  const moneyWhere = (src: PriceSource) => labor
    .filter((l: any) => l.rateSource === src)
    .reduce((s: number, l: any) => s + (Number(l.totalCost) || 0), 0);
  const yourRateMoney = moneyWhere('your-rate');
  const standardRateMoney = moneyWhere('standard');

  const total = materialMoney + laborMoney;
  // Weighted by money, not by line count: ten cheap screws priced from the
  // catalogue should not make a quote look solid when the cabinetry is a guess.
  const confidence = total > 0
    ? round2((catalogueMoney + yourRateMoney + standardRateMoney) / total)
    : 0;
  const onYourFigures = total > 0 ? round2((catalogueMoney + yourRateMoney) / total) : 0;

  const fromCatalogue = materials.filter((m: any) => m.priceSource === 'catalogue').length;
  const atYourRates = labor.filter((l: any) => l.rateSource === 'your-rate').length;
  const atStandard = labor.filter((l: any) => l.rateSource === 'standard').length;

  const pc = (n: number) => Math.round(n * 100);
  // Whether any of this quote leans on the standard table. Branching on this
  // before branching on the amount matters: a real quote usually lands in the
  // middle band, so wording the standards caveat only into the high band would
  // mean the sentence that keeps standard rates from reading as Eric's own
  // figures is the one that almost never appears.
  const leansOnStandards = confidence - onYourFigures > 0.005;
  const remainder = confidence < 0.8 ? ' The rest is estimated.' : '';

  // Written so it never overclaims. A quote priced from the standard table is
  // defensible and should say exactly that, rather than borrowing the authority
  // of figures Eric has actually set.
  let note: string;
  if (total <= 0) {
    note = 'Nothing priced yet.';
  } else if (confidence < 0.3) {
    note = `Only ${pc(confidence)}% is priced from real figures — most of this quote is estimated. It should be reviewed before it goes to a customer.`;
  } else if (!leansOnStandards) {
    note = confidence >= 0.8
      ? `${pc(confidence)}% of this quote is priced from your own catalogue and rates.`
      : `${pc(confidence)}% is priced from your own catalogue and rates.${remainder} Add vendor prices to raise it.`;
  } else if (onYourFigures > 0) {
    note = `${pc(confidence)}% is priced from real figures — ${pc(onYourFigures)}% your own, the rest standard trade rates.${remainder} Saving your own rates makes more of it yours.`;
  } else {
    note = `${pc(confidence)}% is priced from standard trade rates, not the model's guesses — but none of it is your own figures yet.${remainder} Save your rates and vendor prices to make this quote yours.`;
  }

  const summary: RepriceSummary = {
    materialsPriced: materials.length,
    materialsFromCatalogue: fromCatalogue,
    laborPriced: labor.length,
    laborAtYourRates: atYourRates,
    laborAtStandardRates: atStandard,
    confidence,
    onYourFigures,
    settingsAreStandard,
    note,
  };

  return { estimate: repriced, summary };
}
