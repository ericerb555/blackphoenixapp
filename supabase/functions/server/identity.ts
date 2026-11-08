/**
 * Who is making this request, and do they administer this platform.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * These two functions are the most-used pair on the server — `intakeActor`
 * appears 96 times in `index.tsx` and `intakeIsAdmin` 76 — and until now both
 * lived in the middle of that file, which made them unimportable. Everything
 * that needed them and was not in that file had to get them some other way:
 *
 *   - `condo-associations.tsx` takes them as INJECTED DEPENDENCIES, passed in
 *     through a `deps` object, purely because it could not import them.
 *   - every block still inside `index.tsx` that uses them cannot be lifted out
 *     until they can be imported, which is most of the remaining 500 routes.
 *
 * So this is the unlock for the rest of the `index.tsx` split, not a tidy-up.
 * `tasks/phoenix-ai-audit.md` has the reasoning for splitting that file at all.
 *
 * THIS IS A MOVE, NOT A REWRITE
 *
 * The bodies below are byte-for-byte what they were in `index.tsx`. That is
 * deliberate and worth stating, because this pair decides who may administer
 * the platform: every request that is not public is checked by the auth wall
 * calling `intakeActor`, and every admin-tier request by `intakeIsAdmin`. A
 * refactor that "improved" them while moving them would be impossible to
 * review as either one thing or the other.
 *
 * WHAT IT TRUSTS
 *
 * A bearer token verified against Supabase with the service-role key, and
 * `trustedRole` — which reads `app_metadata` and never `user_metadata`, for
 * the reason set out in that file. Nothing here reads a role the caller can
 * write.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { trustedRole } from "./trustedRole.ts";

/**
 * Created on first use rather than at import.
 *
 * Same shape as `requireStaff.ts`, which is the other module holding a
 * service-role client. Building it at module scope would run on every cold
 * start whether or not a request ever needs it.
 */
let cached: any = null;
function admin() {
  if (!cached) {
    cached = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cached;
}

export const INTAKE_ADMIN_ROLES = new Set(['owner', 'platform_owner', 'business_owner', 'admin', 'master_admin', 'management']);

// Platform owner accounts that are ALWAYS treated as admins, even before any
// company_members / user_permissions rows exist in the database. This mirrors the
// frontend owner allowlist so the owner can provision portals immediately.
/**
 * Who counts as a platform owner.
 *
 * Read from the PLATFORM_OWNER_EMAILS secret, comma separated, so that adding an
 * administrator is a change to a Supabase secret rather than a code change and a
 * deploy. `design-links.tsx` already read the list that way; this is the same
 * source rather than a second one, because two places to answer one question is
 * how they end up disagreeing.
 *
 * The founder's address stays hardcoded as a floor. If the secret is unset,
 * mistyped, or wiped, the platform must not end up with nobody able to
 * administer it — a lockout would need a code deploy to undo, which is exactly
 * the situation this is meant to get away from.
 */
export const PLATFORM_OWNER_EMAILS = new Set<string>([
  'ericerb555@proton.me',
  ...(Deno.env.get('PLATFORM_OWNER_EMAILS') || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
]);

/**
 * Company-side roles that are not admins but still work here — an estimator or
 * a project manager raises purchase orders without administering the platform.
 */
export const STAFF_VIEW_ROLES = new Set<string>([
  'staff', 'employee', 'project_manager', 'estimator', 'office',
  'purchasing', 'operations',
]);

export async function intakeActor(c: any) {
  const raw = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!raw) return null;
  const { data: { user }, error } = await admin().auth.getUser(raw);
  return error || !user ? null : user;
}

export async function intakeIsAdmin(user: any) {
  if (!user?.id) return false;
  if (PLATFORM_OWNER_EMAILS.has(String(user.email || '').toLowerCase())) return true;
  if (INTAKE_ADMIN_ROLES.has(trustedRole(user))) return true;
  try {
    const [permissions, memberships] = await Promise.all([
      admin().from('user_permissions').select('role_name').eq('user_id', user.id),
      admin().from('company_members').select('role').eq('user_id', user.id).eq('is_active', true),
    ]);
    const hasPermissionRole = (permissions.data || []).some((row: any) => INTAKE_ADMIN_ROLES.has(String(row.role_name || '').toLowerCase()));
    const hasCompanyAuthority = (memberships.data || []).some((row: any) => ['owner', 'admin'].includes(String(row.role || '').toLowerCase()));
    return hasPermissionRole || hasCompanyAuthority;
  } catch { return false; }
}

/**
 * The same question as `intakeActor`, answered in one call with "and are they
 * an administrator".
 *
 * Used 112 times — more than any other helper on this server — by every route
 * that reads or writes a quote, invoice, payment, payout or order. It is a
 * two-line composition of the pair above and lived in `index.tsx`, so all 112
 * of those call sites were pinned to that file.
 *
 * Named for the financial routes it grew up in rather than for what it does,
 * which is nothing financial. Left under that name because renaming it is 112
 * edits that change no behaviour and would bury the move it is part of.
 */
export async function financialActor(c: any) {
  const user = await intakeActor(c);
  return { user, admin: await intakeIsAdmin(user) };
}
