/**
 * unitSourceRules.ts — which record decides a metered tier's unit count.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * The rule it holds is the one that would produce a wrong bill if it were
 * wrong, and it is a pure decision — so it belongs somewhere it can be tested.
 * `unitsCovered.tsx` reaches `kv_store.tsx`, which node's test runner cannot
 * load, so a rule left in there is a rule nothing checks.
 *
 * THE RULE, AND WHY IT IS NOT "ADD EVERYTHING UP"
 *
 * `unitsCovered` sums every source an email touches, which is right for
 * on-call: one person may own a rental house and sit on an association board,
 * and an emergency could come from either.
 *
 * A TIER is a different question. A landlord's plan is priced on the units they
 * own. Counting units from an association they are merely a board member of
 * would charge them for a building they do not own and cannot sell work on —
 * and at the property-manager rate of $5.50 a door, a board seat at a
 * hundred-unit block would add $418 a month to a four-unit landlord's bill. So
 * each audience is priced from its own source and nothing else.
 */

/** The record kind that counts for each audience, or null when none does. */
export type UnitSourceKind =
  | 'landlord'
  | 'property_manager'
  | 'condo_association'
  | 'condo_manager';

/**
 * Audience → the one source that prices it.
 *
 * `null` means this audience is never metered, and that is a decision rather
 * than an omission — the four flat ladders are flat, and `investor` meters
 * properties in a portfolio that nothing on this platform records yet. An
 * audience missing from this map entirely is treated as unknown by
 * `sourceForAudience`, which is deliberately different from null: an audience
 * nobody has thought about must not quietly start metering, and must not
 * quietly stop either.
 */
export const AUDIENCE_UNIT_SOURCE: Record<string, UnitSourceKind | null> = {
  landlord: 'landlord',
  property_manager: 'property_manager',
  condo_association: 'condo_association',
  condo_manager: 'condo_manager',

  /**
   * Metered in the approved ladder, with no source to meter from.
   *
   * The investor ladder charges per property in the portfolio and this platform
   * has no record of an investor's properties — `investment:` records are
   * stakes, not buildings, and counting those would bill somebody for holding
   * several positions in one deal. So it returns nothing and the tier charges
   * its floor, which is the safe direction to be wrong in.
   */
  investor: null,

  /* Flat ladders. Nothing to count. */
  customer: null,
  vendor: null,
  subcontractor: null,
  advertiser: null,
  content: null,
};

export interface UnitSourceDecision {
  kind: UnitSourceKind | null;
  /** Why there is no source, when there is none. Always set when kind is null. */
  reason: string | null;
}

export function sourceForAudience(audience: string): UnitSourceDecision {
  const key = String(audience || '').trim();
  if (!(key in AUDIENCE_UNIT_SOURCE)) {
    return { kind: null, reason: `no unit source is defined for '${key || '(none)'}'` };
  }
  const kind = AUDIENCE_UNIT_SOURCE[key];
  if (kind === null) {
    return {
      kind: null,
      reason: key === 'investor'
        ? 'nothing on this platform records an investor’s properties yet'
        : 'this plan is not priced by units',
    };
  }
  return { kind, reason: null };
}

/** The audiences that actually have something to count. */
export function meteredAudiences(): string[] {
  return Object.keys(AUDIENCE_UNIT_SOURCE).filter((a) => AUDIENCE_UNIT_SOURCE[a] !== null);
}

/**
 * The sources that decide an ON-CALL price — which is every one of them.
 *
 * On-call is the opposite question to a tier. A tier is priced on what one
 * audience holds; on-call is priced on everything the account is responsible
 * for, because an emergency can come from any of it. One person may own a
 * rental house, sit on an association board and manage a portfolio, and the
 * phone rings for all three.
 *
 * Eric settled the last of these on 2026-10-04, asked directly because adding
 * it changes what existing accounts pay: *"yes count it towards on-call"* — a
 * managing company's roster counts.
 *
 * Here rather than inline in `unitsCovered` so the set that decides a bill can
 * be tested; that file reaches `kv_store.tsx` and the test runner cannot load
 * it.
 */
export const ON_CALL_UNIT_SOURCES: UnitSourceKind[] = [
  'landlord',
  'property_manager',
  'condo_association',
  'condo_manager',
];

/**
 * Sources that can describe the SAME units twice.
 *
 * A condo manager who is also attached to the associations they manage appears
 * through the roster and again through those associations. Summing both would
 * roughly double their on-call bill, and the invoice would look entirely
 * normal — the worst kind of pricing bug.
 *
 * The roster is an aggregate with no association ids in it, so the overlap
 * cannot be resolved by matching buildings. `largerOfOverlapping` takes the
 * larger of the two instead, which never charges for a unit twice and errs
 * towards under-counting rather than over-billing somebody.
 */
export const OVERLAPPING_SOURCES: UnitSourceKind[][] = [
  ['condo_association', 'condo_manager'],
];

/**
 * Collapse an overlapping pair to whichever side counts more units.
 *
 * Takes and returns per-kind totals so it can be tested without any records.
 * Kinds that do not overlap pass through untouched.
 */
export function largerOfOverlapping(
  unitsByKind: Record<string, number>,
): { unitsByKind: Record<string, number>; dropped: string[] } {
  const out: Record<string, number> = { ...unitsByKind };
  const dropped: string[] = [];

  for (const group of OVERLAPPING_SOURCES) {
    const present = group.filter((kind) => Number(out[kind]) > 0);
    if (present.length < 2) continue;
    // Keep the biggest; drop the rest of the group.
    const keep = present.reduce((best, kind) => (out[kind] > out[best] ? kind : best), present[0]);
    for (const kind of present) {
      if (kind === keep) continue;
      delete out[kind];
      dropped.push(kind);
    }
  }
  return { unitsByKind: out, dropped };
}
