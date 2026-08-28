/**
 * Standard figures, used until the company saves its own.
 *
 * WHY THESE EXIST ON THE SERVER
 *
 * The rate table and the markups had defaults in the browser only. Nothing was
 * ever saved, so the server saw an empty list and the repricer had nothing to
 * substitute — every labour line came back marked `estimated`, priced by the
 * model, which is exactly what the repricing was built to stop. A quote landed
 * at near-zero confidence not because anything was wrong but because the
 * defaults could not reach the place that does the pricing.
 *
 * So the same figures live here. A quote is defensible from day one, and the
 * moment Eric saves his own they take over completely.
 *
 * THEY ARE LABELLED, NOT DISGUISED
 *
 * A price from a standard table is a real, defensible number and far better
 * than a model's recollection — but it is not this company's number, and a
 * quote that cannot tell the difference is the same dishonesty in a smarter
 * suit. Anything priced from here comes back marked `standard`, distinct from
 * `your-rate`, and the summary reports the two separately.
 */

export interface StandardRate { id: string; category: string; hourlyRate: number }

/**
 * Trade rates for southern New Hampshire and northern Massachusetts.
 *
 * These mirror the defaults that have always been shown in the rates screen, so
 * nothing changes underfoot — they simply now exist where quoting can see them.
 */
export const STANDARD_LABOR_RATES: StandardRate[] = [
  { id: 'carpentry', category: 'Carpentry', hourlyRate: 65 },
  { id: 'painting', category: 'Painting', hourlyRate: 50 },
  { id: 'electrical', category: 'Electrical', hourlyRate: 95 },
  { id: 'plumbing', category: 'Plumbing', hourlyRate: 105 },
  { id: 'laboring', category: 'General Labor', hourlyRate: 40 },
  { id: 'sheetrock', category: 'Drywall & Taping', hourlyRate: 55 },
  { id: 'siding', category: 'Siding', hourlyRate: 60 },
  { id: 'roofing', category: 'Roofing', hourlyRate: 70 },
  { id: 'tile', category: 'Tile Installation', hourlyRate: 70 },
  { id: 'flooring', category: 'Flooring', hourlyRate: 55 },
  { id: 'masonry', category: 'Masonry', hourlyRate: 75 },
  { id: 'hvac', category: 'HVAC', hourlyRate: 95 },
];

/**
 * Markups, margin and overhead.
 *
 * Ordinary residential renovation numbers. Overhead and profit are separate on
 * purpose: a business that folds its overhead into its profit margin cannot
 * tell a bad month from a busy one.
 */
export const STANDARD_PRICING = {
  materialMarkup: 30,
  materialMarkupByCategory: {
    Cabinetry: 35,
    Countertops: 40,
    Appliances: 15,
    Fixtures: 35,
    Lumber: 25,
    Drywall: 25,
    Electrical: 30,
    Plumbing: 30,
    Flooring: 30,
    Tile: 35,
    Roofing: 25,
    Consumables: 40,
  } as Record<string, number>,
  laborMarkup: 0,
  profitMargin: 15,
  overheadPercentage: 10,
  // Zero on purpose: New Hampshire has no sales tax, and a wrong tax line is
  // worse than none. A job in Massachusetts needs this set deliberately.
  taxRate: 0,
  allowDiscounts: true,
  maxDiscountPercentage: 10,
};

/**
 * Whatever the company saved, or the standards.
 *
 * `usingStandards` is returned rather than inferred by the caller, because the
 * whole point is that a quote can say which it used.
 */
export function resolveLaborRates(saved: any): { rates: StandardRate[]; usingStandards: boolean } {
  const list = Array.isArray(saved?.laborRates) ? saved.laborRates : [];
  const usable = list.filter((r: any) => r && r.id && Number(r.hourlyRate) > 0);
  if (usable.length) return { rates: usable, usingStandards: false };
  return { rates: STANDARD_LABOR_RATES, usingStandards: true };
}

export function resolvePricing(saved: any): { settings: typeof STANDARD_PRICING; usingStandards: boolean } {
  const config = saved?.config;
  // An object with nothing in it is not a decision — it is an empty record, and
  // treating it as one would price every job at zero markup.
  if (config && typeof config === 'object' && Object.keys(config).length > 0) {
    return {
      settings: {
        ...STANDARD_PRICING,
        ...config,
        materialMarkupByCategory: {
          ...STANDARD_PRICING.materialMarkupByCategory,
          ...(config.materialMarkupByCategory || {}),
        },
      },
      usingStandards: false,
    };
  }
  return { settings: STANDARD_PRICING, usingStandards: true };
}
