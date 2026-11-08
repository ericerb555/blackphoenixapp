/**
 * Which Stripe account a payment settles into, and the key that reaches it.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * Two businesses bank through this server. Construction services, invoices,
 * subscriptions, maintenance plans and gift cards settle into Black Phoenix
 * Builds; store merchandise settles into TBPCO. Choosing between them is done
 * server-side by workflow and never by anything the browser sends, because
 * the choice decides whose bank account receives the money.
 *
 * It lived in the middle of `index.tsx`, which meant every route that takes a
 * payment was pinned to that file. Moved as a prerequisite for the split; see
 * `tasks/phoenix-ai-audit.md`.
 *
 * THE RULE WORTH KEEPING IN ONE PLACE
 *
 * An account never falls back to the other account's key. A missing key
 * raises, naming the secret to set, and no payment is attempted — because the
 * failure mode of a fallback here is not an error, it is money quietly
 * arriving in the wrong company's account and nobody noticing until a
 * reconciliation.
 *
 * `stripeKeyFor` also refuses when both accounts hold the SAME secret, which
 * is the version of that mistake a fallback cannot catch: both lookups
 * succeed, both appear configured, and everything settles into one account.
 *
 * Self-contained apart from reading secrets. The bodies are unchanged.
 */

export type StripeAccount = 'services' | 'tbpco_ecommerce';

// Separate Stripe accounts are intentionally selected server-side by workflow.
// Services, invoices, subscriptions, maintenance, and gift cards remain on Black
// Phoenix Builds. Store merchandise uses the TBPCO e-commerce account.
//
// STRICT SEPARATION — the two accounts are hard-partitioned and MUST NOT be able
// to settle each other's transactions:
//   • Neither account falls back to the other's key. A missing key is a loud
//     configuration error, never a silent charge into the wrong business.
//   • If both env vars are set to the SAME secret, that is a misconfiguration
//     that would merge the books, so it is rejected outright.
// Construction/services money can therefore only ever reach the Black Phoenix
// Builds account, and store money only ever reaches the TBPCO account.
export const STRIPE_KEY_ENVS: Record<StripeAccount, string[]> = {
  services: ['STRIPE_SECRET_KEY_SERVICES', 'STRIPE_SECRET_KEY'],
  tbpco_ecommerce: ['TBPCO_ECOMMERCE_STRIPE_SECRET_KEY'],
};

export function stripeAccountLabel(account: StripeAccount) {
  return account === 'tbpco_ecommerce' ? 'TBPCO E-commerce' : 'Black Phoenix Builds Services';
}

/**
 * The TEST-mode key, for exercising a paid flow without taking real money.
 *
 * Its own secret, and it NEVER falls back to the live key. That is the entire
 * point: a "test" path that quietly used the live key would charge a real card
 * while everybody involved believed they were rehearsing, which is the single
 * worst outcome available in this file.
 *
 * Only the services account has one. The store has no test flow asking for it.
 */
export const STRIPE_TEST_KEY_ENV = 'STRIPE_SECRET_KEY_TEST';

export function stripeTestKey(): string {
  return (Deno.env.get(STRIPE_TEST_KEY_ENV) || '').trim();
}

/** live | test | unknown, from the key's own prefix. Never returns the key. */
export function stripeKeyMode(key: string): 'live' | 'test' | 'unknown' {
  if (key.startsWith('sk_live') || key.startsWith('rk_live')) return 'live';
  if (key.startsWith('sk_test') || key.startsWith('rk_test')) return 'test';
  return 'unknown';
}

/**
 * Which mode this server sells in right now.
 *
 * Derived from the configured services key rather than from a setting, because
 * a setting and a key can disagree and the key is the one that decides what
 * actually happens to somebody's card.
 */
/**
 * The one account allowed to rehearse a paid flow against test Stripe.
 *
 * Set as STRIPE_TEST_ACCOUNT_EMAIL. Unset means nobody, which is the safe
 * default — the rehearsal path does not exist until somebody is named.
 *
 * It must be an account nobody is relying on. Whoever is named here can be
 * granted a paid plan by a payment that never happened, which is exactly what
 * makes the rehearsal useful and exactly why it must not be a real vendor.
 */
export function stripeTestAccountEmail(): string {
  return (Deno.env.get('STRIPE_TEST_ACCOUNT_EMAIL') || '').trim().toLowerCase();
}

export function isStripeTestAccount(email: string): boolean {
  const nominated = stripeTestAccountEmail();
  return Boolean(nominated) && nominated === String(email || '').trim().toLowerCase();
}

export function activeStripeMode(): 'live' | 'test' {
  const mode = stripeKeyMode(readStripeKey('services').key);
  // An unrecognised prefix is treated as live, because assuming test would be
  // assuming safety about a key we cannot identify.
  return mode === 'test' ? 'test' : 'live';
}

export function readStripeKey(account: StripeAccount) {
  for (const name of STRIPE_KEY_ENVS[account]) {
    const value = (Deno.env.get(name) || '').trim();
    if (value) return { key: value, env: name };
  }
  return { key: '', env: '' };
}

export function stripeKeyFor(account: StripeAccount = 'services') {
  const mine = readStripeKey(account);
  if (!mine.key) {
    const expected = STRIPE_KEY_ENVS[account].join(' or ');
    throw new Error(
      `${stripeAccountLabel(account)} Stripe is not configured. Set ${expected} in the Supabase edge function secrets. ` +
      `This account never falls back to another Stripe account's key, so no payment was attempted.`,
    );
  }
  // Cross-contamination guard: the same secret must not serve both businesses.
  const other: StripeAccount = account === 'services' ? 'tbpco_ecommerce' : 'services';
  const theirs = readStripeKey(other);
  if (theirs.key && theirs.key === mine.key) {
    throw new Error(
      `Stripe account separation error: ${mine.env} and ${theirs.env} hold the same secret key, so ` +
      `${stripeAccountLabel(account)} and ${stripeAccountLabel(other)} would settle into the same Stripe account. ` +
      `Set each to its own account's key. No payment was attempted.`,
    );
  }
  return mine.key;
}
