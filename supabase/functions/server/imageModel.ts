/**
 * Which image model this server asks for.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * Because the answer was written out seven times and two of the copies were
 * wrong in a way nobody could see.
 *
 * `OPENAI_IMAGE_MODEL` has existed for a while and was honoured by exactly
 * two of the seven routes that generate images — `advertising` and
 * `content-studio`. The other five — `house-capture`, `creative-studio`,
 * `marketing-assets`, `marketplace` and `video-studio` — hardcoded
 * `gpt-image-1` with a fallback to `dall-e-3`. So setting the secret fixed
 * two sevenths of the problem and looked like it had fixed all of it, which
 * is the worst shape a configuration switch can have.
 *
 * WHY THE DEFAULT CHANGED
 *
 * It was `gpt-image-1`, then `dall-e-3`. Neither is on OpenAI's pricing page
 * as of 2026-11-08, and `dall-e-3` is known dead on this account — two
 * separate files carry a comment recording the exact reply, "The model
 * 'dall-e-3' does not exist", discovered the hard way. A default that has
 * been verified not to work is not a default.
 *
 * `gpt-image-1-mini` is the cheapest of the current generation at $2.50 in
 * and $8.00 out per million tokens, and `modelPricing.ts` knows those rates,
 * so a call made through it costs correctly on the ledger from the first
 * one.
 *
 * WHAT THIS DOES NOT CHANGE
 *
 * Sizes and quality flags. Each caller already computes those for the
 * gpt-image family, and the current models take the same shapes. Only the
 * name of the model being asked for moves here.
 */

/**
 * The current generation's cheapest model, used when nothing is configured.
 *
 * Named rather than inlined so that the next time this has to change, the
 * change is one line in one file rather than a hunt through seven.
 */
export const DEFAULT_IMAGE_MODEL = 'gpt-image-1-mini';

/**
 * The image model to ask for.
 *
 * `OPENAI_IMAGE_MODEL` overrides it, which is how it was always meant to
 * work — the variable simply was not read in five of the seven places that
 * needed it.
 */
export function imageModel(): string {
  return (Deno.env.get('OPENAI_IMAGE_MODEL') || '').trim() || DEFAULT_IMAGE_MODEL;
}
