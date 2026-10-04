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
 * The platform already records the real figure, so it is read from there.
 *
 *   landlord_portfolio:{email}          properties, each with `units`
 *   property_manager_portfolio:{email}  the same shape, for managers
 *   condo_assoc:{id}                    an association, with `unitCount`
 *   condo_manager_units:{email}         a managing company's roster, one per unit
 *
 * Four sources, because on-call covers everything the account is responsible
 * for — the phone rings for all of it. Eric added the fourth on 2026-10-04:
 * "yes count it towards on-call". Two of the four can describe the SAME units,
 * which is handled where they are summed.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Guess. An account whose portfolio cannot be read returns zero with a reason,
 * and the caller decides what a zero means. Inventing a floor of one would put
 * a charge on an account with nothing recorded; inventing a larger number would
 * overcharge somebody. Both are worse than saying "nothing recorded".
 */
import * as kv from "./kv_store.tsx";
import { sourceForAudience, largerOfOverlapping } from "./unitSourceRules.ts";

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
 * A landlord or property-manager portfolio: a list of properties, each with
 * its own `units`. The two share a shape, so they share a reader.
 *
 * A portfolio that cannot be read contributes nothing rather than a guess.
 */
async function readPortfolio(kind: string, key: string): Promise<UnitCount["sources"]> {
  const out: UnitCount["sources"] = [];
  try {
    const rows = ((await kv.get(key)) as any[]) || [];
    for (const property of rows) {
      const units = whole(property?.units);
      if (units > 0) {
        out.push({
          kind,
          label: String(property?.name || property?.address || "property").slice(0, 120),
          units,
        });
      }
    }
  } catch {
    // Unreadable means uncounted, not assumed.
  }
  return out;
}

/**
 * Condo associations this person is attached to.
 *
 * `condo_person:{email}` holds the association ids they belong to, which is the
 * only link from an email to a building here. Read one at a time rather than
 * scanning every association on the platform: that scan would grow with the
 * whole customer base to answer a question about one account.
 */
async function readCondoAssociations(address: string): Promise<UnitCount["sources"]> {
  const out: UnitCount["sources"] = [];
  try {
    const person = (await kv.get(`condo_person:${address}`)) as any;
    const ids: string[] = Array.isArray(person?.associations) ? person.associations : [];
    for (const id of ids.slice(0, 50)) {
      const assoc = (await kv.get(`condo_assoc:${id}`)) as any;
      const units = whole(assoc?.unitCount);
      if (units > 0) {
        out.push({ kind: "condo_association", label: String(assoc?.name || id).slice(0, 120), units });
      }
    }
  } catch {
    // Same: unreadable means uncounted, not assumed.
  }
  return out;
}

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

  const found: UnitCount["sources"] = [
    ...(await readPortfolio("landlord", `landlord_portfolio:${address}`)),
    ...(await readPortfolio("property_manager", `property_manager_portfolio:${address}`)),
    ...(await readCondoAssociations(address)),
    // Eric, 2026-10-04, asked directly because it changes what some existing
    // accounts pay: "yes count it towards on-call".
    ...(await readCondoManagerRoster(address)),
  ];

  /**
   * The same units can arrive twice.
   *
   * A condo manager who is also attached to the associations they manage is
   * counted through the roster AND through those associations, and summing both
   * would roughly double their bill on an invoice that looks entirely normal.
   * `largerOfOverlapping` keeps whichever side counts more, so no unit is ever
   * charged for twice — see the note on it, including why the overlap cannot be
   * resolved by matching buildings.
   */
  const byKind: Record<string, number> = {};
  for (const s of found) byKind[s.kind] = (byKind[s.kind] || 0) + s.units;
  const { unitsByKind, dropped } = largerOfOverlapping(byKind);

  const sources = found.filter((s) => !dropped.includes(s.kind));
  const units = Object.values(unitsByKind).reduce((sum, n) => sum + n, 0);
  if (dropped.length) {
    console.log(`[unitsCovered] ${address}: ${dropped.join(", ")} overlapped a larger source and was not counted twice`);
  }

  return {
    units,
    sources,
    reason: units > 0 ? null : "no properties or associations with a unit count are recorded",
  };
}

/**
 * The count that prices ONE AUDIENCE's tier — which is not the same question.
 *
 * `unitsCovered` above sums every source, and that is right for on-call: one
 * person may cover a rental house and sit on an association board, and a call
 * could come from either. A TIER is different. A landlord's plan is priced on
 * the units they own, and adding in units from an association they happen to be
 * a board member of would overcharge them for a building they do not own and
 * cannot sell work on.
 *
 * So this reads only the source that belongs to the audience being priced. The
 * flat ladders — customer, vendor, subcontractor, advertiser — are never metered
 * and return zero, which `tierMonthlyCents` treats as "charge the floor".
 *
 * Investor is the one metered ladder with no source. Its ladder meters
 * properties in a portfolio and nothing in this platform records an investor's
 * properties yet, so it returns zero with a reason and bills at its floor. That
 * is the safe direction to be wrong in, and it is better than counting their
 * `investment:` records, which are stakes rather than properties.
 */
export async function unitsForAudience(email: string, audience: string): Promise<UnitCount> {
  const address = String(email || '').trim().toLowerCase();
  if (!address) return { units: 0, sources: [], reason: 'no account' };

  // The mapping lives in unitSourceRules.ts, which has no kv import and can
  // therefore be tested — see the note there.
  const { kind, reason } = sourceForAudience(audience);
  if (kind === null) return { units: 0, sources: [], reason };

  const sources = kind === 'condo_manager'
    ? await readCondoManagerRoster(address)
    : kind === 'condo_association'
      ? await readCondoAssociations(address)
      : await readPortfolio(kind, `${kind}_portfolio:${address}`);

  const units = sources.reduce((sum, s) => sum + s.units, 0);
  return {
    units,
    sources,
    reason: units > 0 ? null : `nothing with a unit count is recorded for this ${audience.replace(/_/g, ' ')}`,
  };
}

/**
 * A condo manager's roster: `condo_manager_units:{email}`, one record per unit.
 *
 * Counted towards on-call as well as towards the condo-manager tier. It was held
 * back from `unitsCovered` until Eric decided, because adding a source changes
 * what some existing accounts are charged for emergency cover — not a thing to
 * settle by editing a sum. He answered on 2026-10-04: "yes count it towards
 * on-call".
 */
async function readCondoManagerRoster(address: string): Promise<UnitCount['sources']> {
  try {
    const rows = ((await kv.get(`condo_manager_units:${address}`)) as any[]) || [];
    const count = Array.isArray(rows) ? rows.length : 0;
    return count > 0 ? [{ kind: 'condo_manager', label: 'association roster', units: count }] : [];
  } catch {
    return [];
  }
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
