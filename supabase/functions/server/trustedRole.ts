/**
 * The one place that answers "what role does this account actually hold?"
 *
 * WHY THIS EXISTS
 *
 * A Supabase account carries two metadata bags, and they are not equally
 * trustworthy:
 *
 *   app_metadata   written only with the service-role key — only by this server
 *   user_metadata  written by the signed-in person, from the browser, with
 *                  `supabase.auth.updateUser({ data: { ... } })`
 *
 * Eleven authority checks across this server used to read `user_metadata` when
 * deciding what somebody was allowed to do. That let any signed-in customer,
 * vendor, tenant or subcontractor open the browser console, name themselves an
 * administrator, and be believed on the very next request. It was not a
 * theoretical capability either — the landlord portal already calls
 * `updateUser` to change a display name, so the path was open and in use.
 *
 * The rule now is simple and absolute: authority is read from `app_metadata`
 * and nowhere else. A person can still write whatever they like into their own
 * `user_metadata`; it just no longer decides anything.
 *
 * A role is deliberately NOT read from `user_metadata` even as a fallback. A
 * fallback is what made this exploitable: the moment an unwritable source is
 * allowed to defer to a writable one, the writable one is the security
 * boundary. Accounts that predate this were back-filled so their real role sits
 * in `app_metadata`, and every account-creation path now writes both bags.
 */
export function trustedRole(user: any): string {
  return String(user?.app_metadata?.role || user?.app_metadata?.accountType || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** Roles that mean "works for the company", as opposed to a portal guest. */
export const STAFF_ROLE_SET = new Set([
  'owner', 'platform_owner', 'business_owner', 'admin', 'master_admin',
  'super_admin', 'superadmin', 'management', 'staff', 'employee',
  'project_manager', 'estimator', 'office',
]);

/** True when the account holds a company-side role in the trustworthy bag. */
export function isTrustedStaff(user: any): boolean {
  return STAFF_ROLE_SET.has(trustedRole(user));
}
