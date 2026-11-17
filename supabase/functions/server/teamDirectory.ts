/**
 * The team, as the server actually sees it — and the one way to change
 * somebody's access after they have been invited.
 *
 * WHY THIS HAD TO BE WRITTEN
 *
 * Eric, 2026-11-16: *"can we make sure i can as a owner or top adim add a new
 * employee threw email i should be able to set up all there access and there
 * platform from one place"*.
 *
 * Inviting worked. Everything after it did not:
 *
 *   - NOTHING LISTED THE TEAM. `listUsers` was called in exactly one place, to
 *     resolve a single address during deactivation. There was no way to see who
 *     held an account, in what role, or whether they had ever signed in.
 *   - NOTHING COULD CHANGE A ROLE. `ensureAuthUser` stamped `app_metadata.role`
 *     at invitation and that was the end of it, for the life of the account.
 *     The invite route's own 409 said "use access control to change their
 *     access" and access control did not exist.
 *   - THE SCREEN THAT CLAIMED TO DO THIS WAS A MOCK. `RoleManagementSystem`,
 *     1350 lines under a header reading "FULLY FUNCTIONAL — real user database,
 *     live permission toggling", made no network call of any kind. It was
 *     seeded with twenty invented people (john@company.com and friends) and
 *     every toggle was React state that died with the tab.
 *
 * WHAT AUTHORITY MEANS HERE
 *
 * The role in `app_metadata` IS the access. It is what `trustedRole`,
 * `isTrustedStaff`, `requireStaff` and about thirty route guards read. So this
 * file writes that bag and only that bag, through the service key, after
 * `mayAssignRole` has approved it — and it reads the target's current role from
 * the directory rather than from the request, because a check that trusts the
 * caller's description of the target is not a check.
 *
 * A NOTE ON `user_permissions`
 *
 * Ten modules read a fine-grained permissions record (`user_permissions:<id>`
 * in KV, and a Postgres table of the same name). Nothing has ever written
 * either one except `/auth/signup`, which always writes "client" — six rows
 * exist project-wide and all six say that. It is not wired up to anything an
 * owner can reach, so this screen deliberately does not pretend to drive it.
 * Roles are what the server enforces; roles are what this changes. Recorded on
 * `tasks/found-not-fixed.md` rather than half-built here.
 */
import * as kv from './kv_store.tsx';
import { trustedRole, STAFF_ROLE_SET } from './trustedRole.ts';
import { mayAssignRole, normalizeRole, ASSIGNABLE_ROLES } from './accountStanding.ts';

const PREFIX = '/make-server-3eae23a6';

/** Who may open the team screen at all. Mirrors the listing rule in `accountAccess`. */
const MAY_MANAGE = new Set([
  'owner', 'platform_owner', 'business_owner', 'master_admin',
  'admin', 'super_admin', 'superadmin', 'management',
]);

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  /** False once somebody has been switched off by hand in `accountAccess`. */
  active: boolean;
  /** Null until they accept the invitation and set a password. */
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  createdAt: string | null;
}

/**
 * Every account the directory holds, paged.
 *
 * `listUsers` returns fifty at a time and this platform is already past that.
 * The cap of fifty pages is a runaway guard, not a limit anybody is expected
 * to reach; it is logged if it ever bites, because a team list that silently
 * stops at ten thousand accounts is worse than one that says so.
 */
async function allAccounts(admin: any): Promise<any[] | null> {
  const perPage = 200;
  const out: any[] = [];
  try {
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return null;
      const users = data?.users || [];
      out.push(...users);
      if (users.length < perPage) return out;
    }
    console.log('[team] stopped at 50 pages of accounts; the listing is incomplete');
    return out;
  } catch {
    return null;
  }
}

function toMember(u: any, deactivated: Set<string>): TeamMember {
  const email = String(u?.email || '').toLowerCase();
  const meta = u?.user_metadata || {};
  return {
    id: String(u?.id || ''),
    email,
    name: String(meta.full_name || meta.name || '').trim(),
    phone: String(meta.phone || u?.phone || '').trim(),
    role: trustedRole(u),
    active: !deactivated.has(email),
    lastSignInAt: u?.last_sign_in_at || null,
    emailConfirmed: !!u?.email_confirmed_at,
    createdAt: u?.created_at || null,
  };
}

export function registerTeamRoutes(app: any, adminClient: any) {
  /**
   * The team.
   *
   * Staff only in both directions: only an owner or administrator may read it,
   * and it returns only company-side accounts. The customer, tenant and vendor
   * directories are somebody else's screen — listing every account on the
   * platform here would quietly turn a team page into a customer-data export.
   */
  app.get(`${PREFIX}/team/members`, async (c: any) => {
    const actor = c.get('actor');
    if (!actor?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    const actorRole = trustedRole(actor);
    if (!MAY_MANAGE.has(actorRole)) {
      return c.json({ success: false, error: 'Owner or administrator access is required.' }, 403);
    }

    const accounts = await allAccounts(adminClient);
    if (accounts === null) {
      return c.json({ success: false, error: 'The account directory could not be read.' }, 502);
    }

    const rows = ((await kv.getByPrefix('account_deactivation:')) as any[]) || [];
    const deactivated = new Set(
      rows.filter((r) => r?.active).map((r) => String(r?.email || '').toLowerCase()),
    );

    const members = accounts
      .filter((u: any) => STAFF_ROLE_SET.has(trustedRole(u)))
      .map((u: any) => toMember(u, deactivated))
      .sort((a, b) => a.email.localeCompare(b.email));

    return c.json({
      success: true,
      members,
      /** So the screen can grey out the actor's own row rather than letting them try. */
      actorEmail: String(actor.email).toLowerCase(),
      actorRole,
      assignableRoles: ASSIGNABLE_ROLES,
    });
  });

  /**
   * Change what somebody is.
   *
   * The target's current role comes from the directory, never from the body.
   * `mayAssignRole` then decides, and only after it says yes does anything get
   * written.
   */
  app.post(`${PREFIX}/team/members/role`, async (c: any) => {
    const actor = c.get('actor');
    if (!actor?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);

    const body = await c.req.json().catch(() => ({}));
    const targetEmail = String(body?.email || '').trim().toLowerCase();
    const nextRole = normalizeRole(String(body?.role || ''));
    if (!targetEmail) return c.json({ success: false, error: 'Which account?' }, 400);
    if (!nextRole) return c.json({ success: false, error: 'Which role?' }, 400);

    const accounts = await allAccounts(adminClient);
    if (accounts === null) {
      return c.json({ success: false, error: 'The account directory could not be read.' }, 502);
    }
    const target = accounts.find(
      (u: any) => String(u?.email || '').toLowerCase() === targetEmail,
    );
    /**
     * Refused rather than created.
     *
     * Somebody who has never been invited has no account to re-role, and
     * inventing one here would skip the invitation, the organisation, the
     * feature grant and the email that tells them they exist.
     */
    if (!target) {
      return c.json({
        success: false,
        error: 'No account with that email address. Invite them first.',
      }, 404);
    }

    /*
     * Whether this account is switched off, so the row we hand back says so.
     *
     * Both replies below used `toMember(target, new Set())` — an empty
     * deactivated set, which makes `active` unconditionally true. The screen
     * updates the row from this response, so changing a DEACTIVATED person's
     * role redrew them as an active project manager, and only a reload told
     * the truth. On the one screen whose job is to show who currently holds
     * what, that is the wrong direction to be wrong in.
     *
     * One key rather than the prefix scan the list route does: we know which
     * account this is.
     */
    const standing = await kv.get(`account_deactivation:${targetEmail}`).catch(() => null) as any;
    const deactivated = new Set(standing?.active ? [targetEmail] : []);

    const currentRole = trustedRole(target);

    /*
     * A customer is not promoted from this screen. They are invited.
     *
     * The target is looked up in the whole account directory, while the list
     * route shows staff only — so this is reachable by calling the API with a
     * customer's, tenant's or vendor's address, and for an owner actor
     * `mayAssignRole` says yes, because an owner may assign anything.
     *
     * What that produced was a staff role and nothing else. The invitation
     * writes `portal_access:{email}:{portalType}`, an organisation, a feature
     * grant and an onboarding record; this route writes `app_metadata`. The
     * account would pass every STAFF_ROLE_SET check on the server while
     * holding none of the machinery the staff screens read, which is the same
     * objection the 404 above already makes in its own words — "inventing one
     * here would skip the invitation, the organisation, the feature grant and
     * the email that tells them they exist". An account existing does not
     * change what is being skipped.
     *
     * So it refuses and names the route that does the job properly. A
     * customer who joins the company is invited as staff; the invite path
     * already handles an address it has seen before.
     */
    if (!STAFF_ROLE_SET.has(currentRole)) {
      return c.json({
        success: false,
        error: 'That account is not a team member. Invite them as staff instead — '
          + 'a role on its own would leave them without a portal, an organisation or access to anything.',
      }, 409);
    }
    const verdict = mayAssignRole(
      { role: trustedRole(actor), email: String(actor.email) },
      { role: currentRole, email: targetEmail },
      nextRole,
    );
    if (!verdict.allowed) return c.json({ success: false, error: verdict.reason }, 403);

    if (currentRole === nextRole) {
      return c.json({ success: true, member: toMember(target, deactivated), unchanged: true });
    }

    try {
      /**
       * Both bags, for two different readers.
       *
       * `app_metadata` is the authority and the only one any check reads.
       * `user_metadata` is what the portals display, and leaving a stale role
       * there means somebody promoted to project manager keeps being greeted
       * as an employee by their own dashboard. Supabase merges each bag, so
       * the other keys on them survive.
       */
      await adminClient.auth.admin.updateUserById(target.id, {
        app_metadata: { role: nextRole, accountType: nextRole },
        user_metadata: { ...(target.user_metadata || {}), role: nextRole, accountType: nextRole },
      });
    } catch (error: any) {
      return c.json({ success: false, error: error?.message || 'The role could not be written.' }, 500);
    }

    await kv.set(`team_role_change:${targetEmail}:${Date.now()}`, {
      email: targetEmail,
      from: currentRole,
      to: nextRole,
      by: String(actor.email).toLowerCase(),
      byRole: trustedRole(actor),
      at: new Date().toISOString(),
    });
    console.log(`[team] ${actor.email} changed ${targetEmail}: ${currentRole || 'none'} -> ${nextRole}`);

    return c.json({
      success: true,
      member: { ...toMember(target, deactivated), role: nextRole },
    });
  });

  /**
   * What has been changed, and by whom.
   *
   * A role change is the most consequential thing this screen does and it
   * leaves no trace anywhere else — `app_metadata` keeps no history. Without
   * this, "who made them an administrator?" has no answer.
   */
  app.get(`${PREFIX}/team/role-changes`, async (c: any) => {
    const actor = c.get('actor');
    if (!actor?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);
    if (!MAY_MANAGE.has(trustedRole(actor))) {
      return c.json({ success: false, error: 'Owner or administrator access is required.' }, 403);
    }
    const rows = ((await kv.getByPrefix('team_role_change:')) as any[]) || [];
    rows.sort((a, b) => String(b?.at || '').localeCompare(String(a?.at || '')));
    return c.json({ success: true, changes: rows.slice(0, 200) });
  });
}

