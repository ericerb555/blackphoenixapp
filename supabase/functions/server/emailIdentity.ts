/**
 * Which addresses this company sends from, and where replies go.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * There were three copies of `REPLY_TO_EMAIL` — in `index.tsx`,
 * `email-center.tsx` and `fulfillment.tsx` — each its own `Deno.env.get` with
 * its own hard-coded fallback. They agreed on the day they were written, which
 * is the only day three copies ever agree. Changing where customer replies land
 * meant knowing all three existed, and the one that got missed would be the one
 * nobody reads, because a reply-to that is wrong produces silence rather than an
 * error.
 *
 * Pulled out while splitting the leads routes out of `index.tsx`: a fourth copy
 * was the alternative, and four is not better than three.
 *
 * THE FALLBACKS ARE REAL ADDRESSES, DELIBERATELY
 *
 * An unset secret should degrade to somewhere a human actually looks, not to an
 * empty string that Resend rejects at send time. A refused send is discovered
 * when a customer says they never heard back.
 */

/**
 * Where customer replies go.
 *
 * The verified `send.` subdomain is send-only and is not a real mailbox, so
 * every outbound email has to name a reply-to that is.
 */
export const REPLY_TO_EMAIL = Deno.env.get('REPLY_TO_EMAIL') || 'blackphoenixbuilds@proton.me';

/**
 * The single verified Resend sender.
 *
 * Falls back to Resend's sandbox address only when the secret is unset, which
 * delivers to the account owner and nobody else — safe in development, visible
 * immediately in production.
 */
export const NOTIFICATION_FROM_EMAIL = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'onboarding@resend.dev';
