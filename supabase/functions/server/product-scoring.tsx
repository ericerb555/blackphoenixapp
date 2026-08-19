/**
 * product-scoring.tsx — Modular, explainable ranking engine for the Hot
 * Products Radar.
 *
 * This is the "scoring" module of the discovery pipeline. It is deliberately
 * self-contained (no cross-module imports) so a revert of a sibling file can
 * never break scoring. It turns raw trend signals + cost + sourcing options
 * into a single 0–100 composite score with a transparent breakdown, plus the
 * profitability / shipping / competition estimates the storefront and exporter
 * need.
 *
 * Composite score = weighted blend of five factors (weights sum to 1.0):
 *   • trendStrength   0.35  how fast it is rising / how strong the demand signal
 *   • profitability   0.25  estimated margin vs. a target margin
 *   • availability    0.15  how many real supplier/source options exist
 *   • shippingSpeed   0.15  faster delivery converts better + fewer refunds
 *   • competition     0.10  inverse of saturation risk (higher = safer)
 *
 * Every sub-score is 0–100 so the breakdown is directly readable in a UI.
 */

// ── tiny local helpers (inlined to avoid cross-file coupling) ───────────────
export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : fallback;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// ── weights (single source of truth; tweak here to retune ranking) ──────────
export const SCORE_WEIGHTS = {
  trendStrength: 0.35,
  profitability: 0.25,
  availability: 0.15,
  shippingSpeed: 0.15,
  competition: 0.10,
} as const;

/**
 * Per-source logistics + trust metadata used to estimate shipping speed and to
 * seed supplier-match fields when a live API doesn't return them. Values are
 * conservative public-knowledge estimates, not live quotes.
 */
export const SUPPLIER_META: Record<string, { label: string; shipDaysMin: number; shipDaysMax: number; defaultRating: number }> = {
  zendrop:        { label: "Zendrop",        shipDaysMin: 5,  shipDaysMax: 12, defaultRating: 4.5 },
  cjdropshipping: { label: "CJdropshipping", shipDaysMin: 7,  shipDaysMax: 15, defaultRating: 4.4 },
  spocket:        { label: "Spocket",        shipDaysMin: 3,  shipDaysMax: 8,  defaultRating: 4.4 },
  aliexpress:     { label: "AliExpress",     shipDaysMin: 10, shipDaysMax: 25, defaultRating: 4.2 },
  alibaba:        { label: "Alibaba",        shipDaysMin: 15, shipDaysMax: 40, defaultRating: 4.3 },
  temu:           { label: "Temu",           shipDaysMin: 7,  shipDaysMax: 14, defaultRating: 4.1 },
  amazon:         { label: "Amazon",         shipDaysMin: 1,  shipDaysMax: 4,  defaultRating: 4.6 },
  walmart:        { label: "Walmart",        shipDaysMin: 2,  shipDaysMax: 6,  defaultRating: 4.4 },
  unknown:        { label: "Unknown",        shipDaysMin: 7,  shipDaysMax: 20, defaultRating: 4.0 },
};

export function supplierShipDays(source: string): { min: number; max: number; mid: number } {
  const meta = SUPPLIER_META[String(source || "").toLowerCase()] || SUPPLIER_META.unknown;
  return { min: meta.shipDaysMin, max: meta.shipDaysMax, mid: Math.round((meta.shipDaysMin + meta.shipDaysMax) / 2) };
}

export interface TrendSignals {
  rating?: number;
  reviews?: number;
  sales?: number;
  price?: number;
  ageDays?: number;
  isTrending?: boolean;
  /** A previous sales reading, if one was recorded, so growth can be real. */
  salesPrevious?: number;
  /** True when the rating is a supplier default rather than a measurement. */
  ratingIsDefault?: boolean;
}

/**
 * Raw "trend strength" (0–100) derived from whatever demand signals a source
 * exposes. We don't have live TikTok telemetry, so we blend: trending-feed
 * membership (strongest), rating, review depth, sales velocity, and freshness.
 */
export function trendStrength(s: TrendSignals): number {
  let score = 0;
  if (s.isTrending) score += 40;                                   // best-seller feed membership
  score += Math.min(20, num(s.rating) * 4);                        // up to 20 at 5★
  score += Math.min(15, Math.log10(num(s.reviews) + 1) * 6);       // review depth, diminishing
  score += Math.min(15, Math.log10(num(s.sales) + 1) * 5);         // sales velocity, diminishing
  const age = num(s.ageDays, 999);
  score += Math.max(0, 10 * (1 - Math.min(age, 60) / 60));         // freshness, decays over 60d
  return clamp(Math.round(score));
}

/**
 * Growth, when growth is actually known. Null when it is not.
 *
 * This used to return a number every time:
 *
 *   (isTrending ? 120 : 20) + log10(sales + reviews) * 60 + rating * 8
 *
 * which is arithmetic on a boolean and a review count, rendered in the
 * interface as "▲ 180%" — indistinguishable from a measurement. The comment
 * above it described it as "a Kalodata-style rising-fast indicator", and that
 * was the problem exactly: it imitated the output of a data source nothing here
 * is connected to.
 *
 * A number that looks measured and is not will eventually steer a buying
 * decision, and buying decisions cost money in stock and ad spend. So this now
 * reports growth only when two observations of the same product exist to
 * compare, and otherwise says it does not know.
 *
 * `null` is the honest answer, and callers must render it as "no data" rather
 * than as zero — zero growth is itself a claim.
 */
export function growthPct(s: TrendSignals): number | null {
  const now = num(s.sales, NaN);
  const before = num((s as any).salesPrevious, NaN);
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/**
 * Which of the five factors had real data behind them.
 *
 * The score is a weighted blend, and a blend does not say which of its parts
 * were guesses. With only CJ connected, `isTrending` is always false (that flag
 * comes from Zendrop's trending feed) and rating arrives as a constant, so
 * trend strength contributes almost nothing real and the ranking is driven by
 * margin. That is a legitimate way to rank products — it is just not what the
 * word "trending" promises, and the interface should be able to say so.
 */
export function signalQuality(s: TrendSignals): {
  score: number; have: string[]; missing: string[]; basis: string;
} {
  const have: string[] = [];
  const missing: string[] = [];
  (num(s.sales) > 0 ? have : missing).push("sales");
  (num(s.reviews) > 0 ? have : missing).push("reviews");
  (s.isTrending === true ? have : missing).push("trend feed");
  (num(s.rating) > 0 && !(s as any).ratingIsDefault ? have : missing).push("rating");

  const score = Math.round((have.length / 4) * 100);
  const basis = have.length === 0
    ? "Ranked on price and margin only — no demand data is connected."
    : `Ranked on ${have.join(", ")}${missing.length ? ` (no ${missing.join(", ")})` : ""}.`;
  return { score, have, missing, basis };
}

export interface ScoreInput {
  cost: number;                 // unit cost from the supplier
  retail?: number;              // known/suggested retail; if absent we derive it
  targetMarginPct?: number;     // desired margin (default 60%)
  signals: TrendSignals;        // demand signals
  source: string;               // primary supplier key (zendrop, cjdropshipping, …)
  availableSourceCount?: number; // how many sourcing channels exist for it
  connectedSourceCount?: number; // how many of those are API-connected
}

export interface ScoreResult {
  finalScore: number;
  breakdown: {
    trendStrength: number;
    profitability: number;
    availability: number;
    shippingSpeed: number;
    competition: number;
  };
  retail: number;
  profit: number;
  marginPct: number;
  shippingDays: number;
  /** Null when no two observations exist to compare. Never render as zero. */
  growthPct: number | null;
  signalQuality: { score: number; have: string[]; missing: string[]; basis: string };
  competitionRisk: "low" | "medium" | "high";
}

/**
 * Score a single product across all five factors and return the composite plus
 * a full breakdown and the derived economics (retail / profit / margin).
 */
export function scoreProduct(input: ScoreInput): ScoreResult {
  const cost = Math.max(0, num(input.cost));
  const targetMargin = input.targetMarginPct != null ? input.targetMarginPct : 60;

  // Retail: use a provided price, else price up to hit the target margin.
  const retail = input.retail && input.retail > cost
    ? input.retail
    : +(cost > 0 ? cost / (1 - Math.min(0.9, targetMargin / 100)) : 0).toFixed(2);
  const profit = +(retail - cost).toFixed(2);
  const marginPct = retail > 0 ? Math.round((profit / retail) * 100) : 0;

  // 1) Trend strength.
  const trend = trendStrength(input.signals);

  // 2) Profitability — margin vs. target, scaled so hitting target ≈ 100.
  const profitability = clamp(Math.round((marginPct / Math.max(1, targetMargin)) * 100));

  // 3) Availability — more real sourcing options = more resilient supply.
  const available = num(input.availableSourceCount, 1);
  const connected = num(input.connectedSourceCount, 0);
  const availability = clamp(Math.round(Math.min(100, available * 12 + connected * 20)));

  // 4) Shipping speed — faster mid-estimate scores higher (2d→100, 30d→~10).
  const ship = supplierShipDays(input.source);
  const shippingSpeed = clamp(Math.round(100 - (ship.mid - 2) * (90 / 28)));

  // 5) Competition risk (inverted → higher score = safer). Very cheap +
  //    ultra-high review counts imply saturation; a fresh mid-price item with
  //    moderate proof is the sweet spot.
  const reviews = num(input.signals.reviews);
  const price = num(input.signals.price, cost);
  let saturation = 0;
  if (reviews > 5000) saturation += 45;
  else if (reviews > 1000) saturation += 25;
  else if (reviews > 200) saturation += 10;
  if (price > 0 && price < 5) saturation += 25;   // race-to-the-bottom pricing
  if (marginPct < 25) saturation += 20;           // thin margins = price wars
  const competition = clamp(100 - saturation);
  const competitionRisk = saturation >= 55 ? "high" : saturation >= 30 ? "medium" : "low";

  const finalScore = clamp(
    Math.round(
      trend * SCORE_WEIGHTS.trendStrength +
        profitability * SCORE_WEIGHTS.profitability +
        availability * SCORE_WEIGHTS.availability +
        shippingSpeed * SCORE_WEIGHTS.shippingSpeed +
        competition * SCORE_WEIGHTS.competition,
    ),
  );

  return {
    finalScore,
    breakdown: { trendStrength: trend, profitability, availability, shippingSpeed, competition },
    retail,
    profit,
    marginPct,
    shippingDays: ship.mid,
    // Null unless two observations exist to compare. Render as "no data", never
    // as zero — zero growth is a claim of its own.
    growthPct: growthPct(input.signals),
    // Travels with every score so a screen can say what the ranking rests on
    // instead of implying it rests on demand.
    signalQuality: signalQuality(input.signals),
    competitionRisk,
  };
}

// ── Filtering ───────────────────────────────────────────────────────────────
export interface ProductFilters {
  category?: string;        // case-insensitive substring match
  minScore?: number;        // minimum composite score
  minPrice?: number;        // retail price floor
  maxPrice?: number;        // retail price ceiling
  minMarginPct?: number;    // minimum profit margin %
  maxShippingDays?: number; // shipping speed cap
  region?: string;          // shipping region hint (kept as metadata/passthrough)
  excludeHighCompetition?: boolean; // drop oversaturated products
}

export interface ScoredProduct {
  finalScore: number;
  category: string;
  retail: number;
  marginPct: number;
  shippingDays: number;
  competitionRisk: "low" | "medium" | "high";
  [k: string]: unknown;
}

/**
 * Apply the storefront filters to a scored list. Pure + side-effect free so it
 * can run server-side on discover and client-side on a dashboard.
 */
export function applyFilters<T extends ScoredProduct>(products: T[], f: ProductFilters = {}): T[] {
  const cat = (f.category || "").trim().toLowerCase();
  return products.filter((p) => {
    if (cat && !String(p.category || "").toLowerCase().includes(cat)) return false;
    if (f.minScore != null && p.finalScore < f.minScore) return false;
    if (f.minPrice != null && p.retail < f.minPrice) return false;
    if (f.maxPrice != null && p.retail > f.maxPrice) return false;
    if (f.minMarginPct != null && p.marginPct < f.minMarginPct) return false;
    if (f.maxShippingDays != null && p.shippingDays > f.maxShippingDays) return false;
    if (f.excludeHighCompetition && p.competitionRisk === "high") return false;
    return true;
  });
}

/** Parse filter values off a Hono query string (all optional). */
export function parseFilterQuery(q: (k: string) => string | undefined): ProductFilters {
  const n = (k: string) => {
    const v = q(k);
    return v == null || v === "" ? undefined : num(v);
  };
  return {
    category: q("category") || undefined,
    minScore: n("minScore"),
    minPrice: n("minPrice"),
    maxPrice: n("maxPrice"),
    minMarginPct: n("minMargin"),
    maxShippingDays: n("maxShipDays"),
    region: q("region") || undefined,
    excludeHighCompetition: q("excludeSaturated") === "true",
  };
}
