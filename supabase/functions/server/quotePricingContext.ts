/**
 * The company's own prices, gathered once, for whoever is about to estimate.
 *
 * WHY THIS EXISTS
 *
 * There were two ways into the estimator and they did not price the same job
 * the same way.
 *
 *   index.tsx       estimateForWorkRequest — resolved the vendor catalogue, the
 *                   company's labour rates, the saved margins and the measured
 *                   hours from finished jobs, and passed a repricer so the
 *                   company's real prices replaced the model's invented unit
 *                   costs before anything was totalled.
 *
 *   quote-generator POST /auto-generate-quote — called `runEstimator` with no
 *                   repricer and no measured factors at all.
 *
 * The second is the one the Command Center's Start Quote modal used. So a quote
 * started from the Command Center was priced at **the model's guesses**: no
 * catalogue, no company rates, none of the productivity the rate-learning pass
 * measured from real finished jobs. It looked like a detailed estimate and it
 * was a plausible invention.
 *
 * Nobody chose that. `estimateForWorkRequest` lives in `index.tsx` and the
 * route lives in `quote-generator.tsx`, so the route could not reach the good
 * helper and used what was in front of it.
 *
 * WHY THE CONTEXT AND NOT THE WHOLE ESTIMATOR CALL
 *
 * The obvious fix — export `estimateForWorkRequest` and call it from the route
 * — cannot be done: it needs `runEstimator`, which lives in the module that
 * would be importing it, and that is a cycle. What both sides actually need is
 * the same *inputs*, so this module gathers those and nothing else. It imports
 * the key-value store and the pricing defaults; it does not import the
 * estimator, and the estimator may import it.
 *
 * WHAT THE FLAGS ARE FOR
 *
 * `ratesAreStandard` and `settingsAreStandard` say whether the figures used
 * were the company's own or the built-in standard tables. The repricer takes
 * them because the difference matters to whoever reads the quote: a line priced
 * from a published standard is a different claim from one priced from what this
 * company actually charges, and a quote that cannot tell them apart is one
 * somebody has to check by hand.
 */

import * as kv from './kv_store.tsx';
import { resolveLaborRates, resolvePricing } from './pricingDefaults.ts';

export interface QuotePricingContext {
  /** Vendor offers, flattened for the repricer. */
  catalog: any[];
  rates: any[];
  settings: any;
  ratesAreStandard: boolean;
  settingsAreStandard: boolean;
  /**
   * What finished jobs say about how long each trade really takes.
   *
   * Published by the rate-learning pass rather than measured here: pricing one
   * quote must not mean re-measuring every job the company has ever completed.
   * Empty when nothing has been published, in which case the quote is the
   * model's own view of productivity, exactly as before.
   */
  factors: Record<string, any>;
}

/**
 * Gather everything needed to price an estimate with the company's real numbers.
 *
 * Every read is individually tolerant: a missing catalogue, missing rates or
 * missing margins each fall back to the standard tables rather than failing the
 * quote. A quote priced from standards and labelled as such is useful; no quote
 * at all is not.
 */
export async function loadQuotePricingContext(): Promise<QuotePricingContext> {
  const [catalogRaw, ratesRaw, pricingRaw, measured] = await Promise.all([
    kv.getByPrefix('vendor_catalog:').catch(() => []),
    kv.get('labor_rates:global').catch(() => null),
    kv.get('pricing_config:global').catch(() => null),
    kv.get('labor_tasks:trade_factors').catch(() => null),
  ]);

  // Vendor names are joined in so a repriced line can say which supplier the
  // price came from. A price with no provenance is one nobody can check.
  const vendors = ((await kv.getByPrefix('vendor:').catch(() => [])) as any[] || []).filter(Boolean);
  const vendorNames = new Map(vendors.map((v: any) => [String(v?.id || ''), String(v?.name || '')]));

  const catalog = ((catalogRaw as any[]) || []).filter(Boolean).map((i: any) => ({
    offerId: String(i?.id || ''),
    productId: String(i?.productId || ''),
    vendorId: i?.vendorId,
    vendorName: vendorNames.get(String(i?.vendorId)) || '',
    name: i?.name,
    sku: i?.sku,
    unit: i?.unit,
    price: Number(i?.price) || 0,
    updatedAt: i?.updatedAt,
    isActive: i?.isActive,
  }));

  const { rates, usingStandards: ratesAreStandard } = resolveLaborRates(ratesRaw);
  /**
   * `ratesRaw` is passed to `resolvePricing` as well, because the margins the
   * company actually saved live on it. The labour rates screen writes
   * `profitSettings` alongside the rates, and a path that read only
   * `pricing_config:global` used the standard 30% materials markup where 20%
   * was set, no labour markup where 15% was set, and 15% profit where 20% was —
   * while the blueprint path, which does read them, priced the same job
   * differently.
   */
  const { settings, usingStandards: settingsAreStandard } = resolvePricing(pricingRaw, ratesRaw);

  return {
    catalog,
    rates,
    settings,
    ratesAreStandard,
    settingsAreStandard,
    factors: (measured as any)?.factors || {},
  };
}

/** The deps shape `repriceEstimate` takes, from a gathered context. */
export function repricerDeps(ctx: QuotePricingContext) {
  return {
    catalog: ctx.catalog,
    rates: ctx.rates,
    settings: ctx.settings,
    ratesAreStandard: ctx.ratesAreStandard,
    settingsAreStandard: ctx.settingsAreStandard,
  };
}
