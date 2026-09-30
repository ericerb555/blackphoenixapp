/**
 * Getting the company's own rates into a blueprint quote.
 *
 * WHY THIS IS NOT JUST A KEY CHANGE
 *
 * `quote-from-blueprint` read its rates from `labor_rates_config` and its
 * markups from `profit_settings`. Neither key has ever existed. Every other
 * quoting path reads `labor_rates:global`, which is where the rates screen
 * actually saves — so the blueprint quoter silently used the fallback figures
 * typed into its own file, and marked materials up by zero.
 *
 * Pointing it at the right key alone would have changed nothing, which is the
 * part worth knowing. That route looks a rate up by ROLE — "Lead Carpenter",
 * "Electrician", "General Labor" — and the rate card is keyed by TRADE:
 * `carpentry`, `electrical`, `laboring`. Every lookup would still have missed
 * and still fallen through to the typed number, and the bug would have looked
 * fixed.
 *
 * So the roles have to be mapped onto trades, and that is what this is.
 */

import { resolveLaborRates, type StandardRate } from './pricingDefaults.ts';

/**
 * The blueprint quoter's roles, against the trade whose rate they are paid at.
 *
 * `null` means there is no trade on the rate card for that role. Project
 * management is the honest example: it is a real cost and the rate card has no
 * line for it, so it keeps the figure typed into the route and is reported as
 * such rather than being quietly filed under carpentry.
 */
export const ROLE_TRADES: Record<string, string | null> = {
  'Project Manager': null,
  'Lead Carpenter': 'carpentry',
  'Carpenter': 'carpentry',
  'Electrician': 'electrical',
  'Plumber': 'plumbing',
  'Painter': 'painting',
  'General Labor': 'laboring',
};

/** Where a figure came from, so a quote can say rather than imply. */
export type RateSource = 'your-rate' | 'standard' | 'typed';

export interface RoleRate {
  hourlyRate: number;
  source: RateSource;
  /** The trade the rate was taken from, or null where the role has none. */
  tradeId: string | null;
}

/**
 * The hourly rate for one of the blueprint quoter's roles.
 *
 * `usingStandards` comes straight from `resolveLaborRates` and is the only
 * thing that separates "this is Black Phoenix's number" from "this is a
 * defensible table" — the same distinction `pricingDefaults` was written to
 * keep, and worth keeping here because a blueprint quote goes to the office to
 * be checked.
 *
 * A trade the company has HIDDEN from quotes is treated as no rate at all. The
 * toggle says "Hide from quotes" and using the rate anyway would ignore it;
 * falling back and saying so leaves the line visible for somebody to deal with,
 * which is better than dropping work silently off an estimate.
 */
export function rateForRole(
  role: string,
  rates: StandardRate[],
  usingStandards: boolean,
  typedFallback: number,
): RoleRate {
  const fallback = Number.isFinite(Number(typedFallback)) && Number(typedFallback) > 0
    ? Number(typedFallback)
    : 0;
  const tradeId = Object.prototype.hasOwnProperty.call(ROLE_TRADES, role)
    ? ROLE_TRADES[role]
    : undefined;

  if (!tradeId) {
    // Either a role with no trade (Project Manager) or a role nobody mapped.
    return { hourlyRate: fallback, source: 'typed', tradeId: null };
  }

  return rateForTrade(tradeId, rates, usingStandards, fallback);
}

/**
 * The hourly rate for a TRADE, which is what a catalogue task carries.
 *
 * The blueprint quoter prices tasks now rather than roles, and a task names its
 * trade directly — so this is the lookup that actually does the work, and
 * `rateForRole` is the thin shim over it for the one line that is a role and
 * not a task.
 */
export function rateForTrade(
  tradeId: string,
  rates: StandardRate[],
  usingStandards: boolean,
  typedFallback: number,
): RoleRate {
  const fallback = Number.isFinite(Number(typedFallback)) && Number(typedFallback) > 0
    ? Number(typedFallback)
    : 0;
  if (!tradeId) return { hourlyRate: fallback, source: 'typed', tradeId: null };

  const found = (rates || []).find((rate) => rate?.id === tradeId);
  const usable = found && found.visible !== false && Number(found.hourlyRate) > 0;
  if (!usable) return { hourlyRate: fallback, source: 'typed', tradeId };

  return {
    hourlyRate: Number(found!.hourlyRate),
    source: usingStandards ? 'standard' : 'your-rate',
    tradeId,
  };
}

/**
 * The rate card and markups a blueprint quote should price against.
 *
 * One read of one key, because the two halves belong to the same saved record
 * and reading them separately is how they came to disagree.
 */
export function blueprintPricing(stored: any): {
  rates: StandardRate[];
  usingStandards: boolean;
  profitSettings: any;
} {
  const { rates, usingStandards } = resolveLaborRates(stored);
  return { rates, usingStandards, profitSettings: stored?.profitSettings || null };
}
