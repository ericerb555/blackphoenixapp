/**
 * unitsCovered — how many units an account's on-call actually covers.
 *
 * WHY THIS EXISTS
 *
 * On-call is priced on three things: the call, the hours worked, and the number
 * of units covered. The first two are per-call and already live on the on-call
 * record. This is the third, and it is the one that decides a recurring
 * subscription — so it has to be a number the server works out, never one the
 * customer types.
 *
 * A four-unit house and a hundred-and-twenty-unit block do not cost the same to
 * cover, and a box somebody fills in themselves is not a count, it is a claim.
 * The platform already records the real figure in three places, so it is read
 * from there.
 *
 *   landlord_portfolio:{email}          properties, each with `units`
 *   property_manager_portfolio:{email}  the same shape, for managers
 *   condo_assoc:{id}                    an association, with `unitCount`
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Guess. An account whose portfolio cannot be read returns zero with a reason,
 * and the caller decides what a zero means. Inventing a floor of one would put
 * a charge on an account with nothing recorded; inventing a larger number would
 * overcharge somebody. Both are worse than saying "nothing recorded".
 */
import * as kv from "./kv_store.tsx";

export interface UnitCount {
  units: number;
  /** Where the number came from, so a bill can be explained. */
  sources: Array<{ kind: string; label: string; units: number }>;
  /** Why it is zero, when it is. */
  reason: string | null;
}

const whole = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Count the units this account covers, across everything it holds.
 *
 * A person can be a landlord and a property manager at once — the schema
 * already expects that, and one email legitimately holds several portals. So
 * every source is read and summed rather than the first one that answers being
 * taken as the whole picture, which would undercharge exactly the largest
 * customers.
 */
export async function unitsCovered(email: string): Promise<UnitCount> {
  const address = String(email || "").trim().toLowerCase();
  if (!address) return { units: 0, sources: [], reason: "no account" };

  const sources: UnitCount["sources"] = [];

  /* landlord and property-manager portfolios share a shape */
  for (const [kind, key] of [
    ["landlord", `landlord_portfolio:${address}`],
    ["property_manager", `property_manager_portfolio:${address}`],
  ] as const) {
    try {
      const rows = ((await kv.get(key)) as any[]) || [];
      for (const property of rows) {
        const units = whole(property?.units);
        if (units > 0) {
          sources.push({
            kind,
            label: String(property?.name || property?.address || "property").slice(0, 120),
            units,
          });
        }
      }
    } catch {
      // A portfolio we cannot read contributes nothing rather than a guess.
    }
  }

  /**
   * Condo associations this person is attached to.
   *
   * `condo_person:{email}` holds the association ids they belong to, which is
   * the only link from an email to a building here. Read one at a time rather
   * than scanning every association on the platform: that scan would grow with
   * the whole customer base to answer a question about one account.
   */
  try {
    const person = (await kv.get(`condo_person:${address}`)) as any;
    const ids: string[] = Array.isArray(person?.associations) ? person.associations : [];
    for (const id of ids.slice(0, 50)) {
      const assoc = (await kv.get(`condo_assoc:${id}`)) as any;
      const units = whole(assoc?.unitCount);
      if (units > 0) {
        sources.push({
          kind: "condo_association",
          label: String(assoc?.name || id).slice(0, 120),
          units,
        });
      }
    }
  } catch {
    // Same: unreadable means uncounted, not assumed.
  }

  const units = sources.reduce((sum, s) => sum + s.units, 0);
  return {
    units,
    sources,
    reason: units > 0 ? null : "no properties or associations with a unit count are recorded",
  };
}

/**
 * The quantity to bill, which is not always the count.
 *
 * Stripe will not accept a quantity of zero on a subscription item, and an
 * account that has bought on-call before recording a single property still owes
 * the minimum — they can ring us tonight. So a floor of one applies once
 * somebody is actually subscribed, and the fact that it was a floor rather than
 * a count is reported so nobody reading the invoice thinks we found one unit.
 */
export function billableQuantity(count: UnitCount): { quantity: number; floored: boolean } {
  if (count.units > 0) return { quantity: count.units, floored: false };
  return { quantity: 1, floored: true };
}
