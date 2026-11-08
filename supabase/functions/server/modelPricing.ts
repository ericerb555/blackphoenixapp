/**
 * What a model call costs, and how much to trust that number.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `ai_call_log` has a `cost_cents` column that nothing filled, so the
 * dashboard honestly reported "Cost not yet computed" rather than a confident
 * $0.00. This is what fills it. Separate from `aiLedger.ts` because a price
 * table is data that goes stale on somebody else's schedule, and it should be
 * editable without reading a line of the ledger's logic.
 *
 * EVERY PRICE CARRIES ITS PROVENANCE
 *
 * `source` and `asOf` are not decoration. A pricing table is the easiest
 * thing in a codebase to be quietly wrong about: nothing breaks, no test
 * fails, and the only symptom is a number on a dashboard that is believed.
 * This whole screen spent its life showing invented figures, so a cost that
 * cannot say where it came from has no business replacing an honest blank.
 *
 * ANTHROPIC RATES ARE VERIFIED. OPENAI RATES ARE NOT.
 *
 * The Anthropic rates below come from Anthropic's own published table. The
 * OpenAI ones are from recall and are marked `verified: false`. They are
 * included because most calls on this platform are OpenAI and a cost report
 * covering none of them is useless — but anything priced from an unverified
 * rate is counted separately and labelled, so the figure is never presented
 * as more solid than it is. Check them against openai.com/pricing and flip
 * the flag; that is a two-minute job and this file is the only thing to edit.
 *
 * AN UNKNOWN MODEL COSTS NULL, NOT ZERO
 *
 * A model with no entry returns null and the column stays empty. Zero would
 * say "this was free", which is a specific and wrong claim, and it would be
 * invisible among the genuinely cheap calls.
 */

export interface ModelPrice {
  /** US dollars per million input tokens. */
  inputPerMTok: number;
  /** US dollars per million output tokens. */
  outputPerMTok: number;
  /** Flat dollars per call, for endpoints that do not bill by token. */
  perCall?: number;
  /** True only where the rate was read from the provider's published table. */
  verified: boolean;
  source: string;
  asOf: string;
}

const ANTHROPIC_SOURCE = "Anthropic published pricing, via the bundled claude-api reference";
const ANTHROPIC_AS_OF = "2026-06-24";

/**
 * Anthropic, per million tokens. Verified.
 *
 * Only `claude-opus-5` is actually used by this server today; the rest are
 * here so that changing a model env var does not silently stop costing.
 */
const ANTHROPIC: Record<string, ModelPrice> = {
  "claude-opus-5":    { inputPerMTok: 5,  outputPerMTok: 25, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-opus-4-8":  { inputPerMTok: 5,  outputPerMTok: 25, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-opus-4-7":  { inputPerMTok: 5,  outputPerMTok: 25, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-opus-4-6":  { inputPerMTok: 5,  outputPerMTok: 25, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-sonnet-5":  { inputPerMTok: 2,  outputPerMTok: 10, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-sonnet-4-6":{ inputPerMTok: 3,  outputPerMTok: 15, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-haiku-4-5": { inputPerMTok: 1,  outputPerMTok: 5,  verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-fable-5-1": { inputPerMTok: 10, outputPerMTok: 50, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
  "claude-fable-5":   { inputPerMTok: 10, outputPerMTok: 50, verified: true, source: ANTHROPIC_SOURCE, asOf: ANTHROPIC_AS_OF },
};

const OPENAI_SOURCE = "UNVERIFIED — from recall, not read off openai.com/pricing";

/**
 * OpenAI, per million tokens. NOT verified — see the header.
 *
 * The image models bill per image rather than per token, so they carry
 * `perCall` and zero token rates. `gpt-image-1` is the expensive one and is
 * the reason `aiSpend` has a separate `render` ceiling at all.
 */
const OPENAI: Record<string, ModelPrice> = {
  "gpt-4o":        { inputPerMTok: 2.5,  outputPerMTok: 10,  verified: false, source: OPENAI_SOURCE, asOf: "unknown" },
  "gpt-4o-mini":   { inputPerMTok: 0.15, outputPerMTok: 0.6, verified: false, source: OPENAI_SOURCE, asOf: "unknown" },
  "gpt-4.1-mini":  { inputPerMTok: 0.4,  outputPerMTok: 1.6, verified: false, source: OPENAI_SOURCE, asOf: "unknown" },
  "gpt-image-1":   { inputPerMTok: 0, outputPerMTok: 0, perCall: 0.19, verified: false, source: OPENAI_SOURCE, asOf: "unknown" },
  "dall-e-3":      { inputPerMTok: 0, outputPerMTok: 0, perCall: 0.04, verified: false, source: OPENAI_SOURCE, asOf: "unknown" },
};

export const MODEL_PRICES: Record<string, ModelPrice> = { ...ANTHROPIC, ...OPENAI };

/**
 * The price for a model id, or null when we do not know one.
 *
 * Matches the longest known prefix, because providers append dated suffixes
 * — `gpt-4o-2026-01-01` is still `gpt-4o`. Longest-first so `gpt-4o-mini`
 * is never swallowed by `gpt-4o`, which would price it at seventeen times
 * its real rate and do it silently.
 */
export function priceFor(model: unknown): ModelPrice | null {
  const id = String(model || "").trim().toLowerCase();
  if (!id) return null;
  if (MODEL_PRICES[id]) return MODEL_PRICES[id];

  const keys = Object.keys(MODEL_PRICES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (id.startsWith(key)) return MODEL_PRICES[key];
  }
  return null;
}

export interface CostEstimate {
  cents: number;
  /** False when the rate behind this figure has not been checked. */
  verified: boolean;
}

/**
 * What one call cost, in cents, or null when it cannot be said.
 *
 * Null rather than zero for an unknown model, and null rather than zero when
 * a token-priced model reports no tokens — "we were not told" and "it was
 * free" are different, and only one of them is true.
 *
 * A per-call model (an image) is priced even with no token counts, because
 * for those the call itself is the billable unit.
 */
export function estimateCostCents(
  model: unknown, tokensIn?: number | null, tokensOut?: number | null,
): CostEstimate | null {
  const price = priceFor(model);
  if (!price) return null;

  if (price.perCall) {
    return { cents: Math.round(price.perCall * 100 * 10000) / 10000, verified: price.verified };
  }

  /**
   * `null` is checked before `Number()`, not after.
   *
   * `Number(null)` is 0, which is finite and non-negative, so a naive
   * `Number.isFinite(Number(tokensIn))` treats "the provider told us
   * nothing" as "zero tokens" and prices the call at exactly free. That is
   * the one claim this function exists to avoid making, and it is invisible
   * — a column full of honest 0.0000 entries among genuinely cheap calls.
   * `Number(undefined)` is NaN and would have been caught; `null` would not.
   */
  const present = (v: unknown): v is number =>
    v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0;

  const haveIn = present(tokensIn);
  const haveOut = present(tokensOut);
  if (!haveIn && !haveOut) return null;

  const inTok = Number(tokensIn);
  const outTok = Number(tokensOut);

  const dollars =
    ((haveIn ? inTok : 0) / 1_000_000) * price.inputPerMTok +
    ((haveOut ? outTok : 0) / 1_000_000) * price.outputPerMTok;

  // Four decimal places of a cent, matching numeric(12,4) in the table. A
  // gpt-4o-mini call can genuinely cost a thousandth of a cent, and rounding
  // that to zero would make the cheap models look free rather than cheap.
  return { cents: Math.round(dollars * 100 * 10000) / 10000, verified: price.verified };
}

/** The models priced from a rate nobody has checked. Shown in the UI. */
export function unverifiedModels(): string[] {
  return Object.entries(MODEL_PRICES)
    .filter(([, p]) => !p.verified)
    .map(([id]) => id)
    .sort();
}
