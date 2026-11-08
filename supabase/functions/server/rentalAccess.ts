/**
 * Who counts as a landlord, who counts as a manager, and how many tenant
 * sub-portals their plan pays for.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * Same reason as `leadsAccess.ts` and `accountStanding.ts`: the rental routes
 * are about to leave `index.tsx` for a router that imports Hono at the top,
 * and a node test that imports Hono fails before the first assertion. These
 * three decisions are the ones worth pinning before the move, because every
 * one of the ~80 routes in that block opens by asking one of them, and a guard
 * that is wrong by one branch is wrong on every route at once.
 *
 * Nothing here does I/O. The caller reads the key-value store and hands the
 * answers in, so the decision can be checked without a server.
 *
 * THE ASYMMETRY, WHICH IS DELIBERATE AND EASY TO "TIDY" INTO A BUG
 *
 * A landlord is recognised by EITHER the `landlord` portal-access key or the
 * older `property_manager` one — landlord applications used to be filed under
 * the property-manager intake type, and those approved accounts still work.
 * A property manager is recognised by the `property_manager` key ONLY.
 *
 * So manager ⊆ landlord, and not the reverse. Making the pair symmetrical
 * would promote every landlord to the condo-manager queue, which reads other
 * people's buildings. The compatibility direction is the safe one; its mirror
 * is a privilege escalation.
 */

/** A `portal_access:<email>:<kind>` record, as far as this decision cares. */
export type PortalAccess = { status?: unknown } | null | undefined;

/** An actor's claim to a role, assembled by the caller from one or two reads. */
export interface RoleInput {
  /** Already established as staff. Short-circuits every check below. */
  admin?: boolean;
  /** `app_metadata.role` or `app_metadata.accountType`, raw. */
  metadataRole?: unknown;
  /** `portal_access:<email>:property_manager`. */
  managerAccess?: PortalAccess;
  /** `portal_access:<email>:landlord`. Not read for the manager check. */
  landlordAccess?: PortalAccess;
}

/**
 * `app_metadata` roles are written by several different screens and arrive as
 * "Property Manager", "property-manager" and "property_manager". One spelling
 * out, so a comparison can be an equality rather than a guess.
 */
export function normalizeRole(raw: unknown): string {
  return String(raw ?? '').toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * True when a portal-access record grants the role right now.
 *
 * Exact match, deliberately. The status is written by our own approval code
 * and is always lowercase; accepting `Active` as well would widen an
 * authorisation check to buy nothing, and the direction to be wrong in on a
 * check like this is "too strict".
 */
export function accessIsActive(access: PortalAccess): boolean {
  return access?.status === 'active';
}

/**
 * Can the landlord question be answered from the manager record alone?
 *
 * WHY THIS IS A NAMED RULE AND NOT AN `IF` AT THE CALL SITE
 *
 * Because the `if` at the call site was wrong, in a way that locked real
 * landlords out of their own buildings. `landlordActor` read the
 * property-manager record and then did:
 *
 *     const landlordAccess = managerAccess ? null : await kv.get(...landlord)
 *
 * which short-circuits on the record EXISTING rather than on it granting
 * anything. A landlord who once applied under the old property-manager intake
 * — the exact compatibility case the second read is there to serve — has a
 * `pending` manager record sitting in the way. That record is truthy, so the
 * landlord key was never read, so `isLandlord` was handed a pending manager
 * and a null landlord and quite correctly said no. 403 on their own property.
 *
 * The saved read is still worth having, so it is kept where it is valid:
 * when the manager record is ACTIVE, `isLandlord` returns true on that alone
 * and the second lookup genuinely cannot change the answer. Any other state —
 * pending, rejected, revoked, absent — has to go and look.
 *
 * Nobody loses access from this. An account reaching the landlord portal here
 * is one holding an active landlord record, which is what the data already
 * said before anything was read in the wrong order.
 */
export function managerAccessAnswersLandlord(managerAccess: PortalAccess): boolean {
  return accessIsActive(managerAccess);
}

/** The metadata roles that stand in for an approved manager portal. */
export const MANAGER_ROLES: readonly string[] = ['property_manager', 'condo_manager'];

/** True when this actor may use the landlord routes. */
export function isLandlord(input: RoleInput): boolean {
  if (input.admin) return true;
  if (normalizeRole(input.metadataRole) === 'landlord') return true;
  // Either key. The property-manager one is the compatibility path.
  return accessIsActive(input.managerAccess) || accessIsActive(input.landlordAccess);
}

/** True when this actor may use the property- and condo-manager routes. */
export function isPropertyManager(input: RoleInput): boolean {
  if (input.admin) return true;
  if (MANAGER_ROLES.includes(normalizeRole(input.metadataRole))) return true;
  // Deliberately not `landlordAccess` — see the note at the top of the file.
  return accessIsActive(input.managerAccess);
}

/* ── which requests a manager may touch ──────────────────────────────────── */

/**
 * The record fields that name the manager a request is assigned to.
 *
 * Two managers, one shape. These were two near-identical functions that
 * differed only in these field names, which is the arrangement where a fix
 * lands in one copy and not the other.
 *
 * `assignedManagerUserId` / `assignedManagerEmail` / `managerEmail` are shared
 * by both kinds: they are written by screens that know a manager was assigned
 * without knowing which sort of manager it was.
 */
export const MANAGER_ASSIGNMENT_FIELDS = {
  property: {
    userId: ['propertyManagerUserId', 'property_manager_user_id', 'assignedManagerUserId'],
    email: ['propertyManagerEmail', 'property_manager_email', 'managerEmail', 'assignedManagerEmail'],
  },
  condo: {
    userId: ['condoManagerUserId', 'condo_manager_user_id', 'assignedManagerUserId'],
    email: ['condoManagerEmail', 'condo_manager_email', 'managerEmail', 'assignedManagerEmail'],
  },
} as const;

export type ManagerKind = keyof typeof MANAGER_ASSIGNMENT_FIELDS;

/**
 * True when `record` names this user as its manager of the given kind.
 *
 * This is the ASSIGNMENT half only. The caller keeps the ownership half —
 * `ownsWorkRequest(record, user) || assignedToManager(...)` — because a
 * manager can always operate a request their own account created, and
 * ownership is a wider rule that belongs with the work-request code.
 *
 * The empty-actor guards are carried over from both originals, not added:
 * without them `String(undefined) === String(undefined)` is true on both
 * sides, so an actor with neither id nor email would match every request
 * that names no manager. They were correct before and they stay.
 */
export function assignedToManager(record: any, user: any, kind: ManagerKind): boolean {
  const fields = MANAGER_ASSIGNMENT_FIELDS[kind];
  const id = String(user?.id ?? '');
  const email = String(user?.email ?? '').toLowerCase();
  if (id && fields.userId.some((field) => String(record?.[field] ?? '') === id)) return true;
  if (email && fields.email.some((field) => String(record?.[field] ?? '').toLowerCase() === email)) return true;
  return false;
}

/* ── how many tenant sub-portals the plan pays for ───────────────────────── */

/** Tier 1 Landlord, Tier 2 Condo Manager, Tier 3 Property Manager. */
export const TENANT_SUBPORTAL_QUOTA: Record<string, number> = {
  'landlord': 25,
  'condo-manager': 50,
  'property-manager': 100,
};

/** Richest tier first, so the best plan an account holds is the one that wins. */
export const SUBPORTAL_TIERS: readonly string[] = ['property-manager', 'condo-manager', 'landlord'];

/** The safe minimum. An account we cannot read a plan for is a Tier 1 landlord. */
export const DEFAULT_SUBPORTAL_PLAN = { planId: 'landlord', quota: TENANT_SUBPORTAL_QUOTA['landlord'] };

export interface SubPortalPlanInput {
  admin?: boolean;
  email?: unknown;
  /** `landlord_subportal_quota:<email>`, an admin's explicit override. */
  override?: { planId?: unknown; quota?: unknown } | null;
  /**
   * Every `subscription:` record, unfiltered. Pass `[]` when the read threw —
   * an unreadable store must fall back to the minimum tier, never to none.
   */
  subscriptions?: any[];
}

export interface SubPortalPlan { planId: string; quota: number }

/**
 * True when an override record carries a quota worth honouring.
 *
 * Exposed so the caller can skip the `subscription:` prefix scan when an
 * override already settles the answer — that read is the expensive one, and
 * the original did not perform it either.
 */
export function overrideIsUsable(override: SubPortalPlanInput['override']): boolean {
  return Boolean(override) && Number.isFinite(Number(override?.quota));
}

/**
 * The plan tier an account is on, and the tenant sub-portal quota it grants.
 *
 * Order of authority: admin, then an explicit override, then the best active
 * subscription, then the Tier 1 default. The override exists so support can
 * settle a dispute without editing a subscription, and it is allowed to name a
 * `planId` of its own — a quota that does not correspond to a sold tier is a
 * legitimate thing for an admin to grant.
 */
export function subPortalPlan(input: SubPortalPlanInput): SubPortalPlan {
  if (input.admin) return { planId: 'property-manager', quota: Number.POSITIVE_INFINITY };

  const email = String(input.email ?? '').toLowerCase();
  if (!email) return { ...DEFAULT_SUBPORTAL_PLAN };

  if (overrideIsUsable(input.override)) {
    return { planId: String(input.override?.planId ?? 'custom'), quota: Number(input.override?.quota) };
  }

  const mine = (input.subscriptions ?? []).filter((s: any) =>
    String(s?.ownerEmail ?? s?.email ?? '').toLowerCase() === email &&
    String(s?.status ?? '').toLowerCase() === 'active');

  for (const planId of SUBPORTAL_TIERS) {
    if (mine.some((s: any) => String(s?.planId ?? s?.plan ?? '').toLowerCase().includes(planId))) {
      return { planId, quota: TENANT_SUBPORTAL_QUOTA[planId] };
    }
  }

  return { ...DEFAULT_SUBPORTAL_PLAN };
}
