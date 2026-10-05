/**
 * revenueRules.ts — what the units earn, what comparable units earn, and the gap.
 *
 * The arithmetic behind the Revenue Opportunity Report ($99). Pure: no records,
 * no network.
 *
 * WHAT THE PRODUCT IS, AND WHAT THAT MEANS FOR THE GATE
 *
 * The listing promises *"what your units earn now, what comparable units earn,
 * and where the gap is worth closing"*. The middle clause is the whole product.
 * A revenue report with no market figure in it is a statement of the rent the
 * owner already knows, which is a leaflet — so a market estimate is a
 * requirement rather than a nice-to-have, and `marketIsUsable` is what decides
 * whether there is one worth comparing against.
 *
 * WHY THE RANGE MATTERS MORE THAN THE ESTIMATE
 *
 * The market figure comes from an automated valuation with a low and a high.
 * When that range is wide, the estimate is a weak claim and telling somebody to
 * raise a rent on it would be advice we cannot stand behind. So the width of
 * the range decides how strongly the report speaks, and the report prints the
 * range rather than only the midpoint — `dont-defer-to-engineers` asks for the
 * most accurate figure we can produce, and an honest confidence is part of
 * accuracy.
 *
 * AND A RENT RISE IS NOT FREE MONEY
 *
 * Raising a sitting tenant's rent risks a vacancy, and a month empty costs more
 * than a year of the increase in most New Hampshire rentals. The recommendations
 * therefore say what the increase is worth per year AND what one vacant month
 * costs, because an owner who sees only the first number makes a worse decision
 * than one who sees both.
 */

export interface UnitRent {
  /** Unit label, e.g. "2B". */
  label: string;
  /** Monthly rent in dollars. */
  rent: number;
  /** Absent when the unit is empty. */
  tenant?: string | null;
}

export interface MarketRent {
  /** The estimate, per unit per month. */
  rent: number;
  rangeLow?: number;
  rangeHigh?: number;
  comparableCount?: number;
  /** When it was fetched, so the report can say how fresh it is. */
  fetchedAt?: string | null;
}

/**
 * Is there a market figure worth comparing against?
 *
 * Three ways there is not, and all three must refuse rather than degrade: no
 * estimate at all, an estimate with no range (an unqualified number presented
 * as a market rate is a stronger claim than the data supports), and a range so
 * wide the midpoint means nothing.
 */
export const MAX_USABLE_SPREAD = 0.5;

export function marketIsUsable(market: MarketRent | null | undefined): { ok: boolean; reason?: string } {
  const rent = Number(market?.rent) || 0;
  if (!market || rent <= 0) {
    return { ok: false, reason: 'no market rent estimate is on file for this address' };
  }
  const low = Number(market.rangeLow) || 0;
  const high = Number(market.rangeHigh) || 0;
  if (!(low > 0 && high > low)) {
    return {
      ok: false,
      reason: 'the market estimate on file carries no range, and a figure with no range is a stronger claim than the data supports',
    };
  }
  if ((high - low) / rent > MAX_USABLE_SPREAD) {
    return {
      ok: false,
      reason: `the market estimate ranges from $${Math.round(low)} to $${Math.round(high)}, which is too wide to price a unit against`,
    };
  }
  return { ok: true };
}

export type Confidence = 'firm' | 'fair' | 'soft';

/**
 * How strongly the report may speak, from the width of the range.
 *
 * A 10% spread on a $1,800 rent is $180 either way and a recommendation can
 * lean on it. A 40% spread is $720, which is the difference between a good
 * decision and a vacancy.
 */
export function confidenceOf(market: MarketRent): { level: Confidence; spread: number; note: string } {
  const rent = Number(market.rent) || 0;
  const low = Number(market.rangeLow) || rent;
  const high = Number(market.rangeHigh) || rent;
  const spread = rent > 0 ? (high - low) / rent : 1;

  if (spread <= 0.15) {
    return {
      level: 'firm', spread,
      note: `Comparable rents cluster tightly ($${Math.round(low)}–$${Math.round(high)}), so this estimate is worth acting on.`,
    };
  }
  if (spread <= 0.3) {
    return {
      level: 'fair', spread,
      note: `Comparable rents spread from $${Math.round(low)} to $${Math.round(high)}, so treat the figure as a direction rather than a target.`,
    };
  }
  return {
    level: 'soft', spread,
    note: `Comparable rents spread widely ($${Math.round(low)}–$${Math.round(high)}). The direction is probably right; the exact figure is not something to set a rent from without a local opinion.`,
  };
}

export interface UnitGap {
  label: string;
  rent: number;
  market: number;
  /** Market minus rent. Negative means the unit is let above the market. */
  gapMonthly: number;
  gapAnnual: number;
  /** Where in the market range this rent sits, 0 = at the low end, 1 = high. */
  positionInRange: number | null;
  /** What this report says about this unit, in one sentence. */
  verdict: string;
}

/**
 * How many months empty a rise has to survive to be worth taking.
 *
 * The honest counterweight to every "you could charge more". If closing a $75
 * gap takes two vacant months to achieve, it costs more than it earns for over
 * two years.
 */
export function monthsToRecoverVacancy(gapMonthly: number, rent: number): number | null {
  if (gapMonthly <= 0 || rent <= 0) return null;
  return Math.ceil(rent / gapMonthly);
}

export function gapFor(unit: UnitRent, market: MarketRent): UnitGap {
  const rent = Math.max(0, Number(unit.rent) || 0);
  const estimate = Math.max(0, Number(market.rent) || 0);
  const low = Number(market.rangeLow) || estimate;
  const high = Number(market.rangeHigh) || estimate;
  const gapMonthly = Math.round(estimate - rent);

  const positionInRange = high > low ? Math.max(0, Math.min(1, (rent - low) / (high - low))) : null;

  let verdict: string;
  if (gapMonthly <= 0) {
    verdict = `Let at $${rent}, which is at or above the $${Math.round(estimate)} estimate. Nothing to chase here, and worth knowing.`;
  } else if (positionInRange !== null && positionInRange >= 0.5) {
    verdict = `Let at $${rent}, inside the upper half of the comparable range. The $${gapMonthly} gap to the midpoint is real but modest.`;
  } else if (gapMonthly < 50) {
    verdict = `Let at $${rent}, about $${gapMonthly} under the estimate — close enough that a rise is not worth unsettling a sitting tenant for.`;
  } else {
    verdict = `Let at $${rent} against a $${Math.round(estimate)} estimate, a gap of $${gapMonthly} a month. This is the one worth looking at.`;
  }

  return {
    label: unit.label,
    rent,
    market: Math.round(estimate),
    gapMonthly,
    gapAnnual: gapMonthly * 12,
    positionInRange,
    verdict,
  };
}

export interface RevenueAnalysis {
  units: UnitGap[];
  /** Units let below the estimate. */
  below: UnitGap[];
  monthlyRentNow: number;
  monthlyRentAtMarket: number;
  gapMonthly: number;
  gapAnnual: number;
  confidence: Confidence;
  confidenceNote: string;
  /** Empty units, which are a bigger number than any rent gap. */
  vacantCount: number;
  vacancyCostMonthly: number;
  /** Ordered, each a sentence. */
  recommendations: string[];
}

export function analyseRevenue(units: UnitRent[], market: MarketRent, totalUnits?: number): RevenueAnalysis {
  const let_ = units.filter((u) => Number(u.rent) > 0);
  const gaps = let_.map((u) => gapFor(u, market));
  const below = gaps.filter((g) => g.gapMonthly > 0).sort((a, b) => b.gapMonthly - a.gapMonthly);

  const monthlyRentNow = gaps.reduce((sum, g) => sum + g.rent, 0);
  const monthlyRentAtMarket = gaps.reduce((sum, g) => sum + Math.max(g.rent, g.market), 0);
  const { level, note } = confidenceOf(market);

  /**
   * An empty unit is worth more than every rent gap put together, which is why
   * it is counted separately and leads the recommendations.
   */
  const counted = Math.max(let_.length, Math.floor(Number(totalUnits) || 0));
  const vacantCount = Math.max(0, counted - let_.length);
  const vacancyCostMonthly = vacantCount * Math.round(Number(market.rent) || 0);

  const recommendations: string[] = [];
  if (vacantCount > 0) {
    recommendations.push(
      `Fill the ${vacantCount === 1 ? 'empty unit' : `${vacantCount} empty units`} first. At the $${Math.round(Number(market.rent) || 0)} estimate that is $${vacancyCostMonthly.toLocaleString('en-US')} a month not being earned, which is worth more than every rent gap below put together.`,
    );
  }
  for (const gap of below.slice(0, 5)) {
    if (gap.gapMonthly < 50) continue;
    const months = monthsToRecoverVacancy(gap.gapMonthly, gap.rent);
    recommendations.push(
      `Unit ${gap.label}: $${gap.gapMonthly} a month under the estimate, $${gap.gapAnnual.toLocaleString('en-US')} a year. `
      + (months ? `One vacant month costs $${gap.rent.toLocaleString('en-US')}, so it takes ${months} ${months === 1 ? 'month' : 'months'} of the increase to pay for a tenant leaving over it — raise it at renewal, not mid-tenancy.` : ''),
    );
  }
  if (!recommendations.length) {
    recommendations.push(
      'Every let unit is at or near the comparable rent and nothing is empty. There is no rent action worth taking here, which is a finding rather than an absence of one.',
    );
  }

  return {
    units: gaps,
    below,
    monthlyRentNow,
    monthlyRentAtMarket,
    gapMonthly: monthlyRentAtMarket - monthlyRentNow,
    gapAnnual: (monthlyRentAtMarket - monthlyRentNow) * 12,
    confidence: level,
    confidenceNote: note,
    vacantCount,
    vacancyCostMonthly,
    recommendations,
  };
}
