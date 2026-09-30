/**
 * The trades recorded against an employee.
 *
 * Small enough to look trivial, and it is not: this list decides what work the
 * scheduler offers somebody. `availability.ts` treats an EMPTY list as
 * unrecorded rather than as "none" — a technician with no trades is offered for
 * any work and the proposal carries a caveat — so the difference between a list
 * that was cleared and a list that was never sent is the difference between
 * somebody being offered everything and being offered what they actually do.
 *
 * That is the whole reason these two functions are separate, and why they live
 * in a `.ts` module rather than inline in the route: the test runner strips
 * types from `.ts` and not from `.tsx`, and this is logic worth pinning.
 */

/** The maximum number of trades one person can hold. Twelve exist; this is slack. */
const MAX_TRADES = 40;

/**
 * Trade slugs, as stored: lowercase, deduped, nothing longer than a slug.
 *
 * Deliberately NOT checked against the list of trades we sell. That catalogue
 * lives in the front end (`laborTasks.ts`), and a second copy here would drift
 * the first time a trade is added — leaving the server quietly rejecting a
 * trade the screen was offering. A slug that matches no trade is inert:
 * `candidatesFor` simply never matches it, so the cost of letting one through
 * is nothing, while the cost of wrongly rejecting one is an unschedulable
 * technician.
 */
export function normaliseTrades(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    const slug = String(raw ?? '').trim().toLowerCase();
    // A slug, and only a slug. This value is rendered on the scheduling screens
    // and read back into the proposal reasons, so it must not be able to carry
    // markup, whitespace or a path.
    if (!/^[a-z][a-z0-9_-]{1,31}$/.test(slug)) continue;
    if (!out.includes(slug)) out.push(slug);
    if (out.length >= MAX_TRADES) break;
  }
  return out;
}

/**
 * What was posted, or what was already there.
 *
 * ABSENT IS NOT EMPTY. A screen that does not know about trades posts no
 * `trades` key at all, and there are several of those — the timeclock posts an
 * employee to keep a name current. If absent were read as empty, saving a phone
 * number from an older screen would clear somebody's trades, and clearing them
 * does not narrow what they are offered, it widens it to everything.
 */
export function sanitiseTrades(posted: unknown, existing: unknown): string[] {
  return posted === undefined || posted === null
    ? normaliseTrades(existing)
    : normaliseTrades(posted);
}
