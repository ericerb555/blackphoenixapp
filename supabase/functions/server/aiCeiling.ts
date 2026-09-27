/**
 * How much model work an account is allowed, and where that number came from.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `aiSpend.ts` reaches the key-value store, which is a `.tsx`, and the test
 * runner strips types from `.ts` only — so a rule living there cannot be
 * checked by hand. This decides what a paying customer may use, which is
 * exactly the kind of rule that should be.
 *
 * THE PRECEDENCE
 *
 *   an override set for this one account
 *   then whatever their paid tier publishes
 *   then the built-in backstop
 *
 * ZERO ON A TIER MEANS UNLIMITED
 *
 * The same convention the tier editor, the vendor tiers and `withinLimit`
 * already use. Read the other way — "zero allowed" — it would lock the dearest
 * plan out of the feature it is paying for, which is the opposite of what the
 * person setting it meant.
 *
 * SILENCE IS NOT A PROMISE
 *
 * A tier that says nothing about model work falls through to the backstop, not
 * to unlimited. Most tiers say nothing today, and reading that as "no ceiling"
 * would hand every subscriber an uncapped bill on the day this shipped.
 *
 * WHERE THIS DIVERGES FROM `withinLimit`, AND WHY
 *
 * `withinLimit` treats a NEGATIVE ceiling as unlimited, on the reasoning that
 * "minus three products" has no other sensible reading. Here it falls to the
 * backstop instead. The tier editor already refuses to save a negative, so the
 * only way one arrives is a write that went round the editor — and the safe
 * answer to a number nobody meant to type is a real cap, not an open account.
 * Withholding a feature is recoverable; a month of uncapped model spend is not.
 */

export type SpendBucket = "render" | "blueprint" | "ai";

/**
 * The limit key each bucket reads off a tier.
 *
 * Named to match what a tier already publishes — `products`, `deals`,
 * `bidQuotesPerMonth` — so a tier's ceilings stay one list rather than a list
 * plus a separate arrangement for model work.
 */
export const TIER_LIMIT_KEY: Record<SpendBucket, string> = {
  ai: "aiCallsPerMonth",
  render: "rendersPerMonth",
  blueprint: "blueprintsPerMonth",
};

export interface CeilingInput {
  /** Set for one account by hand. Zero or absent means unset. */
  override?: number | null;
  /** What the tier publishes for this bucket. Absent means it says nothing. */
  tierLimit?: number | null;
  tierName?: string | null;
  /** The built-in backstop for this bucket. */
  fallback: number;
}

export function pickCeiling(input: CeilingInput): { limit: number; source: string } {
  const override = Number(input.override) || 0;
  if (override > 0) return { limit: override, source: "account override" };

  const raw = input.tierLimit;
  if (raw === undefined || raw === null) {
    return { limit: input.fallback, source: "default" };
  }

  const ceiling = Number(raw);
  if (!Number.isFinite(ceiling) || ceiling < 0) {
    return { limit: input.fallback, source: "default (tier value unreadable)" };
  }

  const name = input.tierName || "tier";
  if (ceiling === 0) return { limit: Number.POSITIVE_INFINITY, source: `${name} (unlimited)` };
  return { limit: ceiling, source: name };
}
