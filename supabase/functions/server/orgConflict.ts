/**
 * Reading what Postgres meant when it refused to create an organisation.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `provider-orgs.tsx` cannot be loaded by the test runner — Node strips types
 * from `.ts` and not from `.tsx` — so the decision that matters lives here,
 * where it can be checked by hand.
 *
 * WHAT THE DECISION IS
 *
 * Two unique constraints can refuse the same insert and they mean opposite
 * things:
 *
 *   organizations_type_email_uniq   this company already exists. Adopt it.
 *   organizations_slug_key          a DIFFERENT company already took the name.
 *                                   Retry with a suffixed slug.
 *
 * Confusing the two is expensive in both directions. Treating a slug clash as a
 * duplicate would merge two genuinely different firms — putting one company's
 * people inside the other's, reading their sealed bids. Treating an email
 * duplicate as a slug clash is what actually happened: the retry gave the
 * second insert a new slug and one vendor ended up with two organisations 160
 * milliseconds apart.
 *
 * So the constraint is named explicitly rather than inferred from the error
 * code, which both refusals share.
 */

/** Postgres reports every unique violation under this code. */
export const UNIQUE_VIOLATION = '23505';

/** The constraint that means "this company is already here". */
export const EMAIL_CONSTRAINT = 'organizations_type_email_uniq';

/**
 * Whether an insert was refused because the organisation already exists.
 *
 * Deliberately narrow: anything that is not unmistakably the email constraint
 * returns false, so an unrecognised failure falls through to the retry and then
 * to a reported error rather than silently adopting some other organisation.
 */
export function isDuplicateEmail(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  if (String(e.code ?? '') !== UNIQUE_VIOLATION) return false;
  return String(e.message ?? '').toLowerCase().includes(EMAIL_CONSTRAINT);
}
