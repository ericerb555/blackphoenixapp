/**
 * Which portals an account may actually open.
 *
 * WHY THIS EXISTS
 *
 * `PortalAccessGuard` asked the server one question — "do you hold a portal?"
 * — and then opened whichever of the ten portal pages the browser had asked
 * for. `canEnterPortal` is true when ANY access row is active, so a
 * vendor-only account that typed `/landlord-portal` got past the gate. The
 * sign-in screen had the matching half right (it compares the chosen portal
 * against the granted set); the render gate did not, and the render gate is
 * the one that runs when somebody navigates straight to a URL.
 *
 * So the question becomes "do you hold THIS portal", and the answer is
 * computed here rather than in the browser, because a check the client
 * computes is a check the client can be told to skip.
 *
 * THE ASYMMETRY IS COPIED, NOT INVENTED
 *
 * `rentalAccess.ts` documents it at length and this file must not drift from
 * it: a landlord is recognised by the `landlord` key OR an active
 * `property_manager` one (landlord applications used to be filed under the
 * property-manager intake type), while a property manager is recognised by
 * the `property_manager` key only. manager ⊆ landlord, never the reverse —
 * the mirror image would promote every landlord into the condo-manager queue,
 * which reads other people's buildings.
 *
 * The manager pages are served by `propertyManagerActor`, which reads the
 * `property_manager` key and accepts the `property_manager` and
 * `condo_manager` metadata roles. An active property-manager row therefore
 * opens the condo-manager pages on the server today, and this file says so
 * rather than being quietly stricter than the thing it is gating.
 *
 * KNOWN MISMATCH, DELIBERATELY NOT "FIXED" HERE
 *
 * A `condo_manager` ACCESS ROW satisfies nothing on the server: the actor
 * reads only the `property_manager` key, so the row grants the page and then
 * every data route behind it answers 403. Widening the server actor is an
 * authorisation change and does not belong in a gate fix. One account holds
 * such a row today (the owner's, who bypasses all of this). Written down in
 * `tasks/found-not-fixed.md`.
 */
import { accessIsActive, normalizeRole, MANAGER_ROLES, type PortalAccess } from './rentalAccess.ts';

/** A `portal_access:<email>:<type>` row, as far as this decision cares. */
export interface AccessRow {
  portalType?: unknown;
  status?: unknown;
}

export interface GrantInput {
  /** Already established as staff. Opens everything, as it does elsewhere. */
  admin?: boolean;
  /** Every `portal_access:<email>:*` row, whatever its status. */
  access?: readonly AccessRow[] | null;
  /** `app_metadata.role` or `app_metadata.accountType`, raw. */
  metadataRole?: unknown;
}

/**
 * Portal types a holder of this type also gets.
 *
 * Only the compatibility direction `rentalAccess.ts` establishes. Adding an
 * entry here widens authorisation for every account holding the key on the
 * left, so each one needs the same kind of justification the rental file
 * gives.
 */
const IMPLIED: Record<string, readonly string[]> = {
  /* Landlord: the historical intake path. Condo-manager: what
     `propertyManagerActor` already accepts on the server. */
  property_manager: ['landlord', 'condo_manager'],
};

/** The metadata roles that stand in for an access row, and what they grant. */
const FROM_METADATA: Record<string, readonly string[]> = {
  landlord: ['landlord'],
  property_manager: ['property_manager', 'landlord', 'condo_manager'],
  condo_manager: ['condo_manager'],
};

/**
 * The portal types this account may open, including implied ones.
 *
 * Active rows only. A pending, revoked or rejected row grants nothing — the
 * direction to be wrong in on a check like this is "too strict", which is the
 * reasoning `accessIsActive` is written with, and this reuses it rather than
 * re-deciding what counts as active.
 */
export function effectivePortalGrants(input: GrantInput): string[] {
  const granted = new Set<string>();

  const add = (type: string) => {
    if (!type) return;
    granted.add(type);
    for (const implied of IMPLIED[type] || []) granted.add(implied);
  };

  for (const row of input.access || []) {
    if (!accessIsActive(row as PortalAccess)) continue;
    add(normalizeRole(row?.portalType));
  }

  for (const type of FROM_METADATA[normalizeRole(input.metadataRole)] || []) add(type);

  return [...granted].sort();
}

/** True when this account may open the given portal type. */
export function mayOpenPortal(input: GrantInput, portalType: unknown): boolean {
  if (input.admin) return true;
  const wanted = normalizeRole(portalType);
  if (!wanted) return false;
  return effectivePortalGrants(input).includes(wanted);
}

/* Re-exported so a caller needing the manager spellings does not import two
   files to answer one question. */
export { MANAGER_ROLES };
