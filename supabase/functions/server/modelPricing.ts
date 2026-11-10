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
 * WHAT IS VERIFIED, AS OF 2026-11-08
 *
 * Anthropic's rates come from their published table. OpenAI's text rates were
 * read off `developers.openai.com/api/docs/pricing` on 2026-11-08 and all
 * three matched the values that had been sitting here from recall — which is
 * reassuring about those three and says nothing about any other remembered
 * number.
 *
 * TWO MODELS REMAIN UNVERIFIED, AND THAT IS NOW A FINDING RATHER THAN A GAP.
 *
 * `gpt-image-1` and `dall-e-3` are the two this server actually asks for, and
 * neither appears on OpenAI's pricing page any more. See `RETIRED_IMAGE`
 * below — the question it raises is operational, not arithmetic.
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
  /**
   * US dollars per million CHARACTERS of input. Speech synthesis bills this
   * way, not by token — and the two are not interchangeable: a character
   * price applied to a token count under-reports by roughly four times.
   */
  perMChar?: number;
  /**
   * US dollars per MINUTE of audio. Transcription bills this way.
   *
   * A third billable unit, and the third way to be quietly wrong: minutes
   * through the token path would price a question at a fraction of a
   * fraction of a cent and look entirely plausible doing it.
   */
  perMinute?: number;
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

const OPENAI_SOURCE = "developers.openai.com/api/docs/pricing, read 2026-11-08";
const OPENAI_AS_OF = "2026-11-08";

/**
 * The image models OpenAI currently publishes, which are NOT the ones this
 * server asks for. See `RETIRED_IMAGE` below.
 *
 * They are billed per TOKEN, not per image — a structural change from the
 * dall-e era. The rates here are the IMAGE token rates, which dominate; a
 * request also carries text tokens at a different rate, and separating the
 * two is not worth the complexity for a figure already labelled an estimate.
 */
const OPENAI_IMAGE: Record<string, ModelPrice> = {
  "gpt-image-2.6-sunburst": { inputPerMTok: 8,   outputPerMTok: 30, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-image-2.6-flare":    { inputPerMTok: 8,   outputPerMTok: 30, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-image-2.5-sunburst": { inputPerMTok: 8,   outputPerMTok: 30, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-image-2.5-flare":    { inputPerMTok: 8,   outputPerMTok: 30, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-image-2":            { inputPerMTok: 8,   outputPerMTok: 30, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-image-1.5":          { inputPerMTok: 8,   outputPerMTok: 32, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-image-1-mini":       { inputPerMTok: 2.5, outputPerMTok: 8,  verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "chatgpt-image-latest":   { inputPerMTok: 8,   outputPerMTok: 32, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
};

/**
 * The two image models this server actually asks for, and OpenAI no longer
 * lists.
 *
 * `OPENAI_IMAGE_MODEL` is unset in production, so `house-capture`,
 * `creative-studio`, `marketing-assets`, `marketplace`, `video-studio`,
 * `advertising` and `content-studio` all fall back to `gpt-image-1` and then
 * `dall-e-3`. Neither appears anywhere on OpenAI's current pricing page,
 * which lists `gpt-image-1-mini`, `1.5`, `2`, `2.5` and `2.6` instead.
 *
 * Two possibilities and this file cannot tell them apart: they are legacy
 * models still served at unpublished rates, or they are gone and those
 * routes are failing. The ledger will answer it the moment anybody generates
 * an image — a `refused` row with an HTTP 404 means gone.
 *
 * So these keep `verified: false` and the numbers below are the old per-image
 * prices, retained only so a cost appears at all rather than a blank. They
 * are almost certainly wrong now: the current generation bills per token,
 * not per image.
 */
const RETIRED_IMAGE_SOURCE =
  "NOT on OpenAI's pricing page as of 2026-11-08 — old per-image rate, structure since changed to per-token";

const RETIRED_IMAGE: Record<string, ModelPrice> = {
  "gpt-image-1": { inputPerMTok: 0, outputPerMTok: 0, perCall: 0.19, verified: false, source: RETIRED_IMAGE_SOURCE, asOf: "unknown" },
  "dall-e-3":    { inputPerMTok: 0, outputPerMTok: 0, perCall: 0.04, verified: false, source: RETIRED_IMAGE_SOURCE, asOf: "unknown" },
};

/**
 * OpenAI text models, per million tokens. Verified.
 *
 * Read off OpenAI's published table on 2026-11-08. All three matched the
 * values that were previously in this file from recall, which is reassuring
 * about those three and says nothing about any other number anybody recalls.
 */
const OPENAI: Record<string, ModelPrice> = {
  "gpt-4o":       { inputPerMTok: 2.5,  outputPerMTok: 10,  verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-4o-mini":  { inputPerMTok: 0.15, outputPerMTok: 0.6, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  "gpt-4.1-mini": { inputPerMTok: 0.4,  outputPerMTok: 1.6, verified: true, source: OPENAI_SOURCE, asOf: OPENAI_AS_OF },
  ...OPENAI_IMAGE,
  ...RETIRED_IMAGE,
};

/**
 * Speech. Billed per character, which is why ModelPrice grew perMChar.
 *
 * Read off developers.openai.com/api/docs/pricing on 2026-11-09. tts-1 and
 * tts-1-hd both state their unit plainly. gpt-4o-mini-tts is DELIBERATELY
 * ABSENT: the page shows $12.00 for its audio output without naming the
 * unit, and a price whose unit is a guess is worse than no price — it would
 * appear on the dashboard looking exactly as authoritative as the others.
 */
const OPENAI_TTS_SOURCE = 'developers.openai.com/api/docs/pricing';

const OPENAI_TTS: Record<string, ModelPrice> = {
  'tts-1':    { inputPerMTok: 0, outputPerMTok: 0, perMChar: 15, verified: true, source: OPENAI_TTS_SOURCE, asOf: '2026-11-09' },
  'tts-1-hd': { inputPerMTok: 0, outputPerMTok: 0, perMChar: 30, verified: true, source: OPENAI_TTS_SOURCE, asOf: '2026-11-09' },
};

/**
 * Transcription. Billed per minute of audio.
 *
 * Read off developers.openai.com/api/docs/pricing on 2026-11-10. All three
 * state their unit plainly, which is why all three are here and
 * gpt-4o-mini-tts still is not.
 */
const OPENAI_STT: Record<string, ModelPrice> = {
  'whisper-1':             { inputPerMTok: 0, outputPerMTok: 0, perMinute: 0.006, verified: true, source: OPENAI_TTS_SOURCE, asOf: '2026-11-10' },
  'gpt-4o-transcribe':     { inputPerMTok: 0, outputPerMTok: 0, perMinute: 0.006, verified: true, source: OPENAI_TTS_SOURCE, asOf: '2026-11-10' },
  'gpt-4o-mini-transcribe':{ inputPerMTok: 0, outputPerMTok: 0, perMinute: 0.003, verified: true, source: OPENAI_TTS_SOURCE, asOf: '2026-11-10' },
};

export const MODEL_PRICES: Record<string, ModelPrice> = {
  ...ANTHROPIC, ...OPENAI, ...OPENAI_TTS, ...OPENAI_STT,
};

/**
 * What a piece of transcription cost, in cents.
 *
 * Its own function for the same reason the speech one is: the billable
 * unit differs, and a caller passing the wrong kind of number to a shared
 * estimator produces a confident figure rather than an error.
 */
export function estimateSttCostCents(
  model: unknown, seconds: number | null | undefined,
): CostEstimate | null {
  const price = priceFor(model);
  if (!price?.perMinute) return null;
  const n = Number(seconds);
  if (seconds === null || seconds === undefined || !Number.isFinite(n) || n < 0) return null;
  const dollars = (n / 60) * price.perMinute;
  return { cents: Math.round(dollars * 100 * 10000) / 10000, verified: price.verified };
}

/**
 * What a piece of speech cost, in cents.
 *
 * Separate from estimateCostCents because the billable unit is different,
 * and folding characters into the token path would mean one of the two
 * callers was silently passing the wrong kind of number.
 */
export function estimateTtsCostCents(
  model: unknown, characters: number | null | undefined,
): CostEstimate | null {
  const price = priceFor(model);
  if (!price?.perMChar) return null;
  const n = Number(characters);
  if (characters === null || characters === undefined || !Number.isFinite(n) || n < 0) return null;
  const dollars = (n / 1_000_000) * price.perMChar;
  return { cents: Math.round(dollars * 100 * 10000) / 10000, verified: price.verified };
}

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
