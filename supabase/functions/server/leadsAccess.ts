/**
 * Which lead routes the public may reach, and which belong to the company.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * The same reason as `aiCeiling.ts` and `assistantPrompt.ts`: `leads.tsx`
 * imports Hono at the top, so a node test that imports it fails before the
 * first assertion. This rule decides whether a stranger can read the contact
 * book, which is exactly the kind that should be checked by hand rather than
 * by reading it and feeling confident.
 *
 * It is not a hypothetical worry. The first version of this guard was
 * `requireStaffOn(['/make-server-3eae23a6/leads'])`, which matches a base path
 * *and everything beneath it* — so it would have taken `/leads/capture` along
 * with the rest and quietly closed the storefront's enquiry form to the
 * public. That is a failure nobody reports, because a form that stops
 * submitting looks exactly like a form nobody filled in.
 *
 * THE RULE
 *
 * Default to staff. A path under `/leads` is public only if it is named here,
 * exactly — not by prefix. A route added to `leads.tsx` tomorrow is staff-only
 * until somebody deliberately opens it, which is the right direction of
 * failure for a list of customers' names, emails and phone numbers.
 */

export const LEADS_BASE = '/make-server-3eae23a6/leads';

/**
 * The lead routes a stranger on the storefront is supposed to reach.
 *
 * Only the capture form. It is already listed in the auth wall's
 * `PUBLIC_PREFIXES` as "the public store's enquiry form"; this is the same
 * decision expressed where the router can act on it.
 */
export const PUBLIC_LEAD_PATHS: readonly string[] = [
  `${LEADS_BASE}/capture`,
];

/** True when the path belongs to the leads router at all. */
export function isLeadsPath(path: string): boolean {
  return path === LEADS_BASE || path.startsWith(`${LEADS_BASE}/`);
}

/**
 * True when this request has to prove it comes from somebody who works here.
 *
 * Answers false for paths that are not ours, so the caller can stand aside
 * rather than guarding the whole server — this router is mounted at `/`, and
 * a guard that does not check first would run on every request the server
 * receives.
 */
export function leadPathNeedsStaff(path: string): boolean {
  if (!isLeadsPath(path)) return false;
  return !PUBLIC_LEAD_PATHS.includes(path);
}
