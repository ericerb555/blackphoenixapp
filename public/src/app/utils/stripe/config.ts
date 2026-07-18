/**
 * Stripe publishable (client) key.
 *
 * Publishable keys are DESIGNED to be exposed in the browser — they can only
 * create tokens/confirm PaymentIntents, never move money or read account data.
 * The SECRET key stays server-side only (STRIPE_SECRET_KEY env var).
 *
 * To switch to live mode, replace this with your pk_live_... key.
 */
export const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51TqJGnEqRVhsqgR8eFgXBoJ1A1kQ7U03uLLJVuci32QV6OmAzBnxSZlpWOIyzhv3FgHll6xNZBmf3vzg08Yjbk7x00Nnqslvne';
