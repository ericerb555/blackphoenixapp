/**
 * Comparing roles. NOT deciding who holds one.
 *
 * WHAT THIS USED TO DO, AND WHY IT HAD TO STOP
 *
 * Until 2026-11-17 this file answered "who is the current user?" by reading
 * `localStorage.user_role`, and when that was absent — which was always —
 * it returned `'admin'`:
 *
 *     return storedRole || 'admin'; // Default to admin for development
 *
 * Three things made that worse than it reads. Nothing in `src/` ever called
 * `setCurrentUserRole`, so the fallback was not a fallback, it was the only
 * path. `isAdminOrHigher()` built on it gated the admin UI on the Command
 * Center, Projects and the mobile dashboard. And `App.tsx` deliberately lets
 * anyone open the Command Center, on the stated understanding that
 * "non-elevated users will see limited/demo version" — the limited version
 * being the thing that never happened, because the only check that would have
 * produced it answered `admin` to everybody.
 *
 * A visitor could also simply set `localStorage.user_role = 'owner'`.
 *
 * It was never data exposure: every route behind those panels enforces
 * separately against `app_metadata`, which a browser cannot write. It was a
 * control that reported success while doing nothing, and a map of the admin
 * surface handed to anyone who opened the page.
 *
 * WHERE AUTHORITY COMES FROM NOW
 *
 * `useAuth()`. `AuthContext` already asks `GET /me/permissions`, which answers
 * from `app_metadata` on the server, and already exposes `isAdmin`, `isOwner`
 * and `isMasterAdmin` from that answer. It existed before this file's problem
 * did; nothing needed building, only using.
 *
 * WHAT IS LEFT HERE
 *
 * The hierarchy, as a pure comparison over roles you pass in. It cannot fail
 * open because it cannot decide who you are — that is the whole point of the
 * change. `tests/clientRoleAuthority.test.ts` holds it to that.
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'employee' | 'contractor' | 'customer' | 'guest';

/** Higher number, more privilege. An unknown role sits below every known one. */
const roleHierarchy: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  employee: 40,
  contractor: 30,
  customer: 20,
  guest: 10,
};

/**
 * Rank a role, with an unrecognised one ranked at zero rather than thrown
 * away.
 *
 * Zero and not "guest": a role nobody has heard of should lose to every
 * comparison, including one against the lowest named role. The alternative —
 * treating an unknown string as a known tier — is how a typo becomes a
 * promotion.
 */
export function rankOf(role: string | null | undefined): number {
  const key = String(role || '').toLowerCase().replace(/[\s-]+/g, '_') as UserRole;
  return roleHierarchy[key] ?? 0;
}

/**
 * Does `role` reach `required`?
 *
 * Takes the role explicitly. There is deliberately no overload that looks it
 * up for you: the lookup is where the old bug lived, and a function that
 * cannot find out who you are cannot be wrong about it.
 */
export function roleMeets(role: string | null | undefined, required: UserRole): boolean {
  return rankOf(role) >= roleHierarchy[required];
}
