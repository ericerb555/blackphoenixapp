/**
 * What a bid-router answer is allowed to say about a provider.
 *
 * WHY THIS IS A FUNCTION WITH A TEST RATHER THAN A `delete` IN THE ROUTE
 *
 * `loadBidProviders` in `index.tsx` reads four kv prefixes and puts each
 * provider's email address on every row, because `/bid-router/ai-route` needs
 * somewhere to send the invitation. The send happens on the server, so no
 * caller of either route has ever needed the address — but `ai-analyze`
 * returned the rows exactly as loaded, and production holds eight `vendor:`
 * records with an email on all eight. Any signed-in account could post a job
 * description and read our vendor roster as a contact list.
 *
 * The route is staff-only now, which is the actual fix. This is the second
 * line: a gate is one line that somebody can move, reorder, or copy into a new
 * route without it, and the thing worth keeping true is "the address does not
 * leave the server", not "the address does not leave the server while line one
 * still says staff". A rule with a test outlives the person who knew it.
 *
 * It is deliberately NOT a general-purpose sanitiser. It names the one field
 * that must never go out and leaves everything else alone, so adding a field to
 * a provider row does not silently start hiding it.
 */

/** A provider row as `loadBidProviders` builds it. Only `email` matters here. */
export type BidProviderRow = { email?: unknown; [key: string]: unknown };

/**
 * The same rows with every contact address removed.
 *
 * `email` is dropped rather than blanked: a key that is present and empty
 * invites a caller to treat it as "this provider has no email", which is a
 * different and false claim. Absent means we did not say.
 */
export function withholdProviderContact<T extends BidProviderRow>(
  providers: readonly T[] | null | undefined,
): Array<Omit<T, "email">> {
  if (!Array.isArray(providers)) return [];
  return providers.map((row) => {
    if (!row || typeof row !== "object") return row as Omit<T, "email">;
    const { email: _withheld, ...rest } = row;
    return rest as Omit<T, "email">;
  });
}

/**
 * Whether a payload is safe to send to a caller.
 *
 * Exported for the test, and for anybody who wants to assert it at the edge of
 * a new route rather than trusting that they remembered.
 */
export function carriesProviderContact(payload: unknown): boolean {
  if (Array.isArray(payload)) return payload.some(carriesProviderContact);
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Record<string, unknown>;
  if ("email" in row || "contactEmail" in row) return true;
  return Object.values(row).some(carriesProviderContact);
}
