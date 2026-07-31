/**
 * Property strategy engine
 *
 * Powers the "Partner With Us" flow in the investment area: an investor who
 * already owns a property tells us its numbers and their goal, and we score the
 * realistic exit/holding strategies so both sides know the best move before a
 * partnership call.
 *
 * The engine is deterministic and self-contained (no network) so the intake page
 * can show a live recommendation as the investor types, and the same computed
 * result is stored on the server for the owner's review pipeline.
 *
 * Strategies scored:
 *   - fix-flip        Renovate and resell for a lump-sum profit.
 *   - lease-hold      Hold and rent for ongoing cash flow.
 *   - subdivide-build Split the lot / add units and build.
 *   - repurpose-sell  Change the use (e.g. commercial → residential) and sell.
 *   - sell-asis       Wholesale / quick sale with no rehab.
 */

export type PropertyType = 'single-family' | 'multi-family' | 'commercial' | 'land' | 'mixed-use';
export type Condition = 'excellent' | 'good' | 'fair' | 'poor' | 'tear-down';
export type CurrentUse = 'vacant' | 'rented' | 'owner-occupied' | 'commercial-operating';
export type Zoning = 'yes' | 'no' | 'unsure';
export type Ownership = 'free-clear' | 'mortgaged';
export type Goal = 'fast-profit' | 'passive-income' | 'long-term-growth' | 'unsure';
export type Timeline = 'asap' | '3-6mo' | '6-12mo' | 'flexible';

export type StrategyKey = 'fix-flip' | 'lease-hold' | 'subdivide-build' | 'repurpose-sell' | 'sell-asis';

export interface PropertyInputs {
  propertyType: PropertyType;
  condition: Condition;
  currentUse: CurrentUse;
  lotSizeAcres: number;
  zoningSubdividable: Zoning;
  estimatedValue: number; // current as-is value (dollars)
  afterRepairValue: number; // ARV after renovation (dollars)
  repairCost: number; // estimated rehab cost (dollars)
  monthlyRentPotential: number; // realistic gross monthly rent (dollars)
  ownership: Ownership;
  goal: Goal;
  timeline: Timeline;
}

export interface StrategyScore {
  key: StrategyKey;
  label: string;
  score: number; // 0–100
  reasons: string[];
  projection?: string; // human-readable headline number for this strategy
}

export interface StrategyRecommendation {
  primary: StrategyScore;
  runnerUp?: StrategyScore;
  scores: StrategyScore[]; // all strategies, sorted high → low
  metrics: {
    flipMargin: number; // ARV − value − repairs (dollars)
    flipMarginPct: number; // margin / ARV (%)
    grossYield: number; // annual rent / value (%)
    capRate: number; // NOI (60% of gross) / value (%)
    annualRent: number;
  };
}

export const STRATEGY_LABELS: Record<StrategyKey, string> = {
  'fix-flip': 'Fix & Flip',
  'lease-hold': 'Lease & Hold',
  'subdivide-build': 'Subdivide & Build',
  'repurpose-sell': 'Repurpose & Sell',
  'sell-asis': 'Sell As-Is',
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const usd = (n: number) =>
  `$${Math.round(n).toLocaleString('en-US')}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

/**
 * Score every strategy for a property and return a ranked recommendation.
 * Missing/zero numbers degrade gracefully — the engine simply leans on the
 * qualitative inputs (type, condition, goal) when the financials are blank.
 */
export function recommendStrategy(input: PropertyInputs): StrategyRecommendation {
  const value = Math.max(0, Number(input.estimatedValue) || 0);
  const arv = Math.max(0, Number(input.afterRepairValue) || 0);
  const repairs = Math.max(0, Number(input.repairCost) || 0);
  const rent = Math.max(0, Number(input.monthlyRentPotential) || 0);
  const acres = Math.max(0, Number(input.lotSizeAcres) || 0);

  const annualRent = rent * 12;
  const flipMargin = arv > 0 ? arv - value - repairs : 0;
  const flipMarginPct = arv > 0 ? (flipMargin / arv) * 100 : 0;
  const grossYield = value > 0 ? (annualRent / value) * 100 : 0;
  const noi = annualRent * 0.6; // rough 40% operating-expense load
  const capRate = value > 0 ? (noi / value) * 100 : 0;

  // ── Fix & Flip ───────────────────────────────────────────────────────────
  const flip: StrategyScore = { key: 'fix-flip', label: STRATEGY_LABELS['fix-flip'], score: 0, reasons: [] };
  if (arv > 0) {
    if (flipMarginPct >= 25) { flip.score += 50; flip.reasons.push(`Strong ${pct(flipMarginPct)} spread between ARV and all-in cost`); }
    else if (flipMarginPct >= 15) { flip.score += 35; flip.reasons.push(`Healthy ${pct(flipMarginPct)} flip margin`); }
    else if (flipMarginPct >= 8) { flip.score += 18; flip.reasons.push(`Thin ${pct(flipMarginPct)} margin — flip only with tight budget`); }
    else { flip.score += 4; flip.reasons.push('Little to no spread after rehab — flip is risky'); }
  } else {
    flip.score += 12; flip.reasons.push('Add an ARV estimate to sharpen this');
  }
  if (input.condition === 'poor' || input.condition === 'tear-down') { flip.score += 22; flip.reasons.push('Distressed condition is ideal for a value-add rehab'); }
  else if (input.condition === 'fair') { flip.score += 14; flip.reasons.push('Cosmetic-to-moderate rehab potential'); }
  else if (input.condition === 'excellent') { flip.score -= 10; flip.reasons.push('Already renovated — limited forced-appreciation upside'); }
  if (input.goal === 'fast-profit') { flip.score += 20; flip.reasons.push('Matches your fast lump-sum profit goal'); }
  if (input.timeline === 'asap' || input.timeline === '3-6mo') { flip.score += 8; }
  if (input.propertyType === 'land') { flip.score -= 25; flip.reasons.push('Raw land is not a flip candidate'); }
  flip.score = clamp(flip.score);
  if (flipMargin > 0) flip.projection = `~${usd(flipMargin * 0.85)} projected profit (net of holding/selling costs)`;

  // ── Lease & Hold ───────────────────────────────────────────────────────────
  const hold: StrategyScore = { key: 'lease-hold', label: STRATEGY_LABELS['lease-hold'], score: 0, reasons: [] };
  if (annualRent > 0) {
    if (capRate >= 8) { hold.score += 50; hold.reasons.push(`Excellent ${pct(capRate)} cap rate for cash flow`); }
    else if (capRate >= 6) { hold.score += 38; hold.reasons.push(`Solid ${pct(capRate)} cap rate`); }
    else if (capRate >= 4) { hold.score += 22; hold.reasons.push(`Modest ${pct(capRate)} cap rate — appreciation play`); }
    else { hold.score += 6; hold.reasons.push(`Low ${pct(capRate)} cap rate — weak cash flow`); }
  } else {
    hold.score += 10; hold.reasons.push('Add a monthly rent estimate to sharpen this');
  }
  if (input.currentUse === 'rented') { hold.score += 16; hold.reasons.push('Already tenanted — income from day one'); }
  if (input.condition === 'good' || input.condition === 'excellent') { hold.score += 12; hold.reasons.push('Rent-ready condition'); }
  if (input.propertyType === 'multi-family') { hold.score += 12; hold.reasons.push('Multi-family stacks multiple income streams'); }
  if (input.goal === 'passive-income') { hold.score += 22; hold.reasons.push('Matches your passive-income goal'); }
  else if (input.goal === 'long-term-growth') { hold.score += 12; hold.reasons.push('Supports long-term appreciation + equity'); }
  if (input.propertyType === 'land') { hold.score -= 30; }
  hold.score = clamp(hold.score);
  if (noi > 0) hold.projection = `~${usd(noi)}/yr net operating income${input.ownership === 'free-clear' ? ' (owned free & clear)' : ''}`;

  // ── Subdivide & Build ────────────────────────────────────────────────────
  const build: StrategyScore = { key: 'subdivide-build', label: STRATEGY_LABELS['subdivide-build'], score: 0, reasons: [] };
  if (acres >= 1) { build.score += 35; build.reasons.push(`${acres} acres leaves room for multiple parcels/units`); }
  else if (acres >= 0.5) { build.score += 20; build.reasons.push(`${acres} acres may support a lot split or ADU`); }
  else if (acres >= 0.25) { build.score += 10; build.reasons.push('Tight lot — an ADU may be feasible'); }
  else if (acres > 0) { build.score += 2; build.reasons.push('Small lot limits subdivision'); }
  if (input.zoningSubdividable === 'yes') { build.score += 32; build.reasons.push('Zoning already allows subdivision'); }
  else if (input.zoningSubdividable === 'unsure') { build.score += 10; build.reasons.push('Zoning needs verification — upside if it allows a split'); }
  else { build.score -= 20; build.reasons.push('Zoning does not allow subdivision'); }
  if (input.propertyType === 'land') { build.score += 22; build.reasons.push('Vacant land is a natural build/subdivide candidate'); }
  else if (input.propertyType === 'single-family') { build.score += 8; }
  if (input.goal === 'long-term-growth') { build.score += 10; }
  build.score = clamp(build.score);
  if (acres >= 0.25 && input.zoningSubdividable !== 'no') {
    const lots = Math.max(2, Math.floor(acres / 0.25));
    build.projection = `Potential for ~${lots} lots/units at buildout`;
  }

  // ── Repurpose & Sell ───────────────────────────────────────────────────────
  const repurpose: StrategyScore = { key: 'repurpose-sell', label: STRATEGY_LABELS['repurpose-sell'], score: 0, reasons: [] };
  if (input.propertyType === 'commercial' || input.propertyType === 'mixed-use') { repurpose.score += 32; repurpose.reasons.push('Commercial/mixed-use is prime for a change of use'); }
  if (input.currentUse === 'vacant') { repurpose.score += 16; repurpose.reasons.push('Vacant — no tenants to relocate'); }
  else if (input.currentUse === 'commercial-operating') { repurpose.score += 10; }
  if (input.condition === 'fair' || input.condition === 'poor') { repurpose.score += 12; repurpose.reasons.push('Underused building — repositioning upside'); }
  if (input.zoningSubdividable === 'unsure' || input.zoningSubdividable === 'yes') { repurpose.score += 8; repurpose.reasons.push('Zoning flexibility supports a use change'); }
  if (input.goal === 'fast-profit' || input.goal === 'long-term-growth') { repurpose.score += 10; }
  if (input.propertyType === 'land') { repurpose.score -= 20; }
  repurpose.score = clamp(repurpose.score);
  if (arv > value && value > 0) repurpose.projection = `~${usd(arv - value)} value uplift from repositioning`;

  // ── Sell As-Is (wholesale / quick exit) ───────────────────────────────────
  const asis: StrategyScore = { key: 'sell-asis', label: STRATEGY_LABELS['sell-asis'], score: 0, reasons: [] };
  if (input.timeline === 'asap') { asis.score += 30; asis.reasons.push('Fastest path to liquidity'); }
  if (input.ownership === 'free-clear') { asis.score += 14; asis.reasons.push('Owned free & clear — clean, quick close'); }
  if (arv > 0 && flipMarginPct < 8) { asis.score += 22; asis.reasons.push('Rehab margin too thin to justify a flip'); }
  if (input.goal === 'fast-profit') { asis.score += 14; }
  if (input.condition === 'tear-down') { asis.score += 10; asis.reasons.push('Sell to a builder rather than rehab'); }
  if (input.goal === 'passive-income') { asis.score -= 15; }
  asis.score = clamp(asis.score);
  if (value > 0) asis.projection = `~${usd(value)} quick-sale value with minimal effort`;

  const scores = [flip, hold, build, repurpose, asis].sort((a, b) => b.score - a.score);

  return {
    primary: scores[0],
    runnerUp: scores[1],
    scores,
    metrics: {
      flipMargin,
      flipMarginPct: Number(flipMarginPct.toFixed(1)),
      grossYield: Number(grossYield.toFixed(1)),
      capRate: Number(capRate.toFixed(1)),
      annualRent,
    },
  };
}
