/**
 * condo-associations — the master condo account, and the sub-portals it issues.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * It started life inside index.tsx next to the landlord equivalent, because it
 * needs deliverPortalInvite and that function is private there. But this is the
 * authorisation surface for a whole class of tenant — who may administer an
 * association, who may appoint a board, who may see the money — and code like
 * that has to be testable on its own. Inside a 128-file server function it was
 * not: the only way to exercise it would have been to copy it into a test
 * harness, which tests the copy rather than the thing that ships.
 *
 * So the invite delivery is injected instead. index.tsx passes its own
 * deliverPortalInvite in; a test passes a stub. Same code either way, and it can
 * be deployed to a branch and driven with real users and real JWTs.
 *
 * THE MODEL: THE ASSOCIATION OWNS ITS RECORDS, ADMINISTRATION IS A GRANT
 *
 * Eric's rule, and it decides the whole shape: the master account may be held
 * by anyone — a board, a management company, a single owner — but **the
 * association has to consent to it**. So the association is the root entity and
 * everything keys to it. Nobody "owns" it; people hold grants on it, and a
 * grant can be withdrawn.
 *
 * That is also how it works in life. An association is a legal entity that
 * hires a management company under an agreement and can end that agreement and
 * hire another. If the manager owned the account, the association's records
 * would leave with them.
 *
 * This is a deliberate departure from the landlord model, which keys its roster
 * to the landlord's own email. That is right there — one landlord owns their
 * properties — and wrong here, because one management company running four
 * associations would put four sets of owners, dues and work requests into a
 * single bucket with no way to separate them afterwards.
 *
 * KV keys:
 *   condo_assoc:{assocId}                the association itself
 *   condo_grant:{assocId}:{email}        one person's access to it, and the
 *                                        consent behind that access
 *   condo_person:{email}                 reverse index, so a member's portal can
 *                                        find the associations they belong to
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

/** What the module needs from its host, so it can be tested without one. */
export interface CondoDeps {
  /** Resolve the signed-in user from the request, or null. */
  intakeActor: (c: any) => Promise<any>;
  /** Does this user hold platform-level authority? */
  intakeIsAdmin: (user: any) => Promise<boolean>;
  /** Send the standard branded portal invitation. */
  deliverPortalInvite: (opts: {
    name: string; email: string; phone: string; portalType: string;
    grantFullAccess: boolean; trialMonths: number;
    sendEmail: boolean; sendSms: boolean; wantQr: boolean;
  }) => Promise<any>;
  /**
   * Sub-portal allowance per plan id, shared with the landlord side.
   *
   * A getter, not the object. The host declares that table thousands of lines
   * below where it mounts this router, and reading a `const` before its
   * declaration is a temporal dead zone error — which esbuild does not catch,
   * so it would have built cleanly and then failed to boot the entire server.
   * Resolving it per request sidesteps the ordering problem completely.
   */
  subPortalQuota: () => Record<string, number>;
}

export function createCondoRouter(deps: CondoDeps) {
  const { intakeActor, intakeIsAdmin, deliverPortalInvite } = deps;
  const quotaTable = () => deps.subPortalQuota();
  const condoRouter = new Hono();

type CondoRole =
  | 'board_president'
  | 'board_member'
  | 'property_manager'
  | 'owner'
  | 'resident'
  | 'vendor';

const CONDO_ROLES: CondoRole[] = [
  'board_president', 'board_member', 'property_manager', 'owner', 'resident', 'vendor',
];

/**
 * What each role may do. Written as data rather than scattered `if` statements
 * so there is one place to read the answer and one place to change it.
 *
 * `consent` is deliberately board-president only. Confirming who administers
 * the association, and withdrawing that, is the association speaking — a
 * manager cannot confirm their own appointment, which would make the consent
 * record worthless.
 */
const CONDO_CAPABILITIES: Record<CondoRole, string[]> = {
  board_president:  ['consent', 'members', 'financials', 'operations', 'self'],
  board_member:     ['members', 'financials', 'operations', 'self'],
  property_manager: ['members', 'financials', 'operations', 'self'],
  owner:            ['self'],
  resident:         ['self'],
  vendor:           ['self'],
};

/** Roles a manager may hand out. They cannot appoint a board. */
const MANAGER_GRANTABLE: CondoRole[] = ['owner', 'resident', 'vendor', 'property_manager'];

const CONDO_ASSOC = (id: string) => `condo_assoc:${id}`;
const CONDO_GRANT = (assocId: string, email: string) => `condo_grant:${assocId}:${String(email).toLowerCase()}`;
const CONDO_PERSON = (email: string) => `condo_person:${String(email).toLowerCase()}`;

const condoEmail = (v: unknown) => String(v ?? '').trim().toLowerCase();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function condoGrantsFor(assocId: string) {
  return ((await kv.getByPrefix(`condo_grant:${assocId}:`)) as any[] || []).filter(Boolean);
}

/**
 * The caller's standing on one association.
 *
 * A platform admin is treated as holding every capability, because Black
 * Phoenix supports these accounts. Everyone else gets exactly what their live
 * grant says, and nothing at all without one — an unknown caller is never
 * given the benefit of the doubt.
 */
async function condoStanding(c: any, assocId: string): Promise<{
  user: any; isAdmin: boolean; grant: any; can: (capability: string) => boolean;
}> {
  const user = await intakeActor(c);
  if (!user) return { user: null, isAdmin: false, grant: null, can: () => false };
  const isAdmin = await intakeIsAdmin(user);
  const grant = await kv.get(CONDO_GRANT(assocId, user.email)) as any;
  const live = grant && grant.status === 'active' ? grant : null;
  const can = (capability: string) => {
    if (isAdmin) return true;
    if (!live) return false;
    return (CONDO_CAPABILITIES[live.role as CondoRole] || []).includes(capability);
  };
  return { user, isAdmin, grant: live, can };
}

/**
 * How many sub-portals this account's plan allows.
 *
 * Reads the same `subscription:` records and the same TENANT_SUBPORTAL_QUOTA
 * table the landlord side uses, so the Condo Manager Plan's advertised "up to
 * 50 tenant sub-portals" is the number actually enforced rather than a
 * different one invented here.
 */
async function condoSubPortalPlan(user: any, isAdmin: boolean): Promise<{ planId: string; quota: number }> {
  if (isAdmin) return { planId: 'property-manager', quota: Number.POSITIVE_INFINITY };
  const email = condoEmail(user?.email);
  if (!email) return { planId: 'condo-manager', quota: quotaTable()['condo-manager'] };
  const override = await kv.get(`landlord_subportal_quota:${email}`) as any;
  if (override && Number.isFinite(Number(override.quota))) {
    return { planId: String(override.planId || 'custom'), quota: Number(override.quota) };
  }
  try {
    const subs = (await kv.getByPrefix('subscription:')) as any[] || [];
    const mine = subs.filter((s: any) =>
      condoEmail(s?.ownerEmail || s?.email) === email && String(s?.status || '').toLowerCase() === 'active');
    for (const planId of ['property-manager', 'condo-manager', 'landlord']) {
      if (mine.some((s: any) => String(s?.planId || s?.plan || '').toLowerCase().includes(planId))) {
        return { planId, quota: quotaTable()[planId] };
      }
    }
  } catch (_error) { /* fall through */ }
  return { planId: 'condo-manager', quota: quotaTable()['condo-manager'] };
}

/** Record that this person belongs to this association, for their own portal. */
async function condoIndexPerson(email: string, assocId: string) {
  const key = CONDO_PERSON(email);
  const current = (await kv.get(key)) as any;
  const ids: string[] = Array.isArray(current?.associations) ? current.associations : [];
  if (!ids.includes(assocId)) {
    await kv.set(key, { email: condoEmail(email), associations: [...ids, assocId], updatedAt: new Date().toISOString() });
  }
}

async function condoUnindexPerson(email: string, assocId: string) {
  const key = CONDO_PERSON(email);
  const current = (await kv.get(key)) as any;
  const ids: string[] = Array.isArray(current?.associations) ? current.associations : [];
  await kv.set(key, {
    email: condoEmail(email),
    associations: ids.filter((x) => x !== assocId),
    updatedAt: new Date().toISOString(),
  });
}

// ── Associations ────────────────────────────────────────────────────────────

/** Associations the caller holds a live grant on. Admins see all of them. */
condoRouter.get('/condo/associations', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user) return c.json({ success: false, associations: [], error: 'Sign in to view your associations.' }, 401);
    const isAdmin = await intakeIsAdmin(user);

    const all = ((await kv.getByPrefix('condo_assoc:')) as any[] || []).filter(Boolean);
    let visible = all;
    if (!isAdmin) {
      const index = (await kv.get(CONDO_PERSON(user.email))) as any;
      const ids = new Set<string>(Array.isArray(index?.associations) ? index.associations : []);
      visible = all.filter((a: any) => ids.has(String(a.id)));
    }

    // Each association carries back the caller's own role in it, so the portal
    // never has to guess what to show.
    const withRole = await Promise.all(visible.map(async (a: any) => {
      const grant = await kv.get(CONDO_GRANT(String(a.id), user.email)) as any;
      return {
        ...a,
        myRole: isAdmin ? 'board_president' : String(grant?.role || ''),
        myGrantStatus: isAdmin ? 'active' : String(grant?.status || ''),
      };
    }));

    withRole.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
    return c.json({ success: true, associations: withRole });
  } catch (error: any) {
    return c.json({ success: false, associations: [], error: error?.message || 'Unable to load associations.' }, 500);
  }
});

/**
 * Create an association.
 *
 * Consent is recorded whichever direction the relationship started from, which
 * is what Eric asked for. A board creating its own association has consented by
 * definition. A management company creating one has not — it is marked
 * `awaiting_board`, and stays that way, visibly, until a board president
 * confirms. The manager can still work in the meantime, because in the real
 * world they were hired before any software was involved; what they cannot do
 * is pretend the association agreed.
 */
condoRouter.post('/condo/associations', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user) return c.json({ success: false, error: 'Sign in to create an association.' }, 401);
    const isAdmin = await intakeIsAdmin(user);

    const body = await c.req.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 160);
    if (!name) return c.json({ success: false, error: 'Give the association a name.' }, 400);

    const claimed = String(body.myRole || 'board_president');
    if (!['board_president', 'property_manager'].includes(claimed)) {
      return c.json({ success: false, error: 'You can set this up as the board president or as the property manager.' }, 400);
    }

    const now = new Date().toISOString();
    const id = String(body.id || `assoc_${crypto.randomUUID()}`);
    const selfConsented = claimed === 'board_president';

    const association = {
      id,
      name,
      address: String(body.address || '').slice(0, 300),
      unitCount: Number.isFinite(Number(body.unitCount)) ? Number(body.unitCount) : 0,
      buildings: Number.isFinite(Number(body.buildings)) ? Number(body.buildings) : 0,
      createdBy: condoEmail(user.email),
      createdByRole: claimed,
      // 'self' — the association set itself up, so consent is inherent.
      // 'awaiting_board' — somebody else set it up and the board has not yet
      // confirmed that they administer it.
      consentStatus: selfConsented ? 'self' : 'awaiting_board',
      consentConfirmedBy: selfConsented ? condoEmail(user.email) : null,
      consentConfirmedAt: selfConsented ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    await kv.set(CONDO_ASSOC(id), association);

    const grant = {
      associationId: id,
      email: condoEmail(user.email),
      name: String(user.user_metadata?.full_name || user.email || '').slice(0, 160),
      unit: '',
      role: claimed,
      status: 'active',
      invited: true,
      // Who granted this, and whether the association itself has confirmed it.
      grantedBy: condoEmail(user.email),
      grantedByRole: claimed,
      associationConfirmed: selfConsented,
      createdAt: now,
      updatedAt: now,
    };
    await kv.set(CONDO_GRANT(id, user.email), grant);
    await condoIndexPerson(user.email, id);

    return c.json({ success: true, association: { ...association, myRole: claimed, myGrantStatus: 'active' } }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to create the association.' }, 500);
  }
});

/** Update the association's own details. Anyone with members authority may. */
condoRouter.put('/condo/associations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const standing = await condoStanding(c, id);
    if (!standing.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!standing.can('members')) return c.json({ success: false, error: 'You do not have permission to change this association.' }, 403);

    const existing = await kv.get(CONDO_ASSOC(id)) as any;
    if (!existing) return c.json({ success: false, error: 'Association not found.' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const updated = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim().slice(0, 160) || existing.name : existing.name,
      address: body.address !== undefined ? String(body.address).slice(0, 300) : existing.address,
      unitCount: Number.isFinite(Number(body.unitCount)) ? Number(body.unitCount) : existing.unitCount,
      buildings: Number.isFinite(Number(body.buildings)) ? Number(body.buildings) : existing.buildings,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(CONDO_ASSOC(id), updated);
    return c.json({ success: true, association: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to update the association.' }, 500);
  }
});

// ── Consent ─────────────────────────────────────────────────────────────────

/**
 * The association confirming — or withdrawing — somebody's authority over it.
 *
 * Board president only. This is the association speaking, so a manager
 * confirming their own appointment would make the record meaningless, and a
 * manager revoking the board would be a coup.
 */
condoRouter.post('/condo/associations/:id/consent', async (c) => {
  try {
    const id = c.req.param('id');
    const standing = await condoStanding(c, id);
    if (!standing.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!standing.can('consent')) {
      return c.json({ success: false, error: 'Only the board president can confirm or withdraw who administers this association.' }, 403);
    }

    const association = await kv.get(CONDO_ASSOC(id)) as any;
    if (!association) return c.json({ success: false, error: 'Association not found.' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const target = condoEmail(body.email);
    const decision = String(body.decision || '').toLowerCase();
    if (!isEmail(target)) return c.json({ success: false, error: 'Whose authority is being decided?' }, 400);
    if (!['confirm', 'withdraw'].includes(decision)) {
      return c.json({ success: false, error: 'Decision must be confirm or withdraw.' }, 400);
    }

    const grant = await kv.get(CONDO_GRANT(id, target)) as any;
    if (!grant) return c.json({ success: false, error: 'That person holds no grant on this association.' }, 404);

    const now = new Date().toISOString();
    const updated = {
      ...grant,
      associationConfirmed: decision === 'confirm',
      status: decision === 'withdraw' ? 'revoked' : grant.status,
      consentDecidedBy: condoEmail(standing.user.email),
      consentDecidedAt: now,
      consentNote: String(body.note || '').slice(0, 1000),
      updatedAt: now,
    };
    await kv.set(CONDO_GRANT(id, target), updated);
    if (decision === 'withdraw') await condoUnindexPerson(target, id);

    // Once the board has confirmed anybody, the association is no longer
    // waiting on it.
    if (decision === 'confirm' && association.consentStatus === 'awaiting_board') {
      await kv.set(CONDO_ASSOC(id), {
        ...association,
        consentStatus: 'confirmed',
        consentConfirmedBy: condoEmail(standing.user.email),
        consentConfirmedAt: now,
        updatedAt: now,
      });
    }

    return c.json({ success: true, grant: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to record the decision.' }, 500);
  }
});

// ── Members ─────────────────────────────────────────────────────────────────

/** Everyone with a grant on this association, plus what the plan allows. */
condoRouter.get('/condo/associations/:id/members', async (c) => {
  try {
    const id = c.req.param('id');
    const standing = await condoStanding(c, id);
    if (!standing.user) return c.json({ success: false, members: [], error: 'Sign in first.' }, 401);
    if (!standing.can('members')) {
      return c.json({ success: false, members: [], error: 'You do not have permission to view this roster.' }, 403);
    }

    const members = (await condoGrantsFor(id))
      .filter((g: any) => g.status !== 'revoked')
      .sort((a: any, b: any) => String(a.name || a.email).localeCompare(String(b.name || b.email)));

    const association = await kv.get(CONDO_ASSOC(id)) as any;
    const plan = await condoSubPortalPlan(standing.user, standing.isAdmin);
    // Board seats are governance, not sub-portals, so they do not consume the
    // plan's allowance. What the plan sells is portals for the people below.
    const consuming = members.filter((m: any) => ['owner', 'resident', 'vendor'].includes(String(m.role))).length;

    return c.json({
      success: true,
      members,
      association: association || null,
      quota: {
        planId: plan.planId,
        limit: Number.isFinite(plan.quota) ? plan.quota : null,
        used: consuming,
        remaining: Number.isFinite(plan.quota) ? Math.max(0, plan.quota - consuming) : null,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, members: [], error: error?.message || 'Unable to load the roster.' }, 500);
  }
});

/** Add somebody to the association. Does not give them a login — invite does. */
condoRouter.post('/condo/associations/:id/members', async (c) => {
  try {
    const id = c.req.param('id');
    const standing = await condoStanding(c, id);
    if (!standing.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!standing.can('members')) return c.json({ success: false, error: 'You do not have permission to add members.' }, 403);

    const association = await kv.get(CONDO_ASSOC(id)) as any;
    if (!association) return c.json({ success: false, error: 'Association not found.' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const email = condoEmail(body.email);
    const name = String(body.name || '').trim().slice(0, 160);
    const role = String(body.role || '') as CondoRole;

    if (!name) return c.json({ success: false, error: 'A name is required.' }, 400);
    if (!isEmail(email)) return c.json({ success: false, error: 'Enter a valid email address.' }, 400);
    if (!CONDO_ROLES.includes(role)) return c.json({ success: false, error: 'Choose a role for this person.' }, 400);

    // A manager may staff the association but not appoint its board. Only the
    // board can decide who the board is.
    const actorRole = standing.isAdmin ? 'board_president' : String(standing.grant?.role || '');
    if (actorRole === 'property_manager' && !MANAGER_GRANTABLE.includes(role)) {
      return c.json({ success: false, error: 'Only the board can appoint board members.' }, 403);
    }

    /**
     * A vendor must already exist as a vendor.
     *
     * An association granting a vendor access is granting access to *this
     * association's work* for a company that already has a portal, a catalogue
     * and purchase orders. Creating a second vendor identity here would fork
     * the vendor registry — this codebase already carries a `supplier:` /
     * `vendor:` split that has cost real time, and a third would be worse.
     */
    if (role === 'vendor') {
      const vendors = ((await kv.getByPrefix('vendor:')) as any[] || []).filter(Boolean);
      const match = vendors.find((v: any) =>
        [v?.email, v?.contactEmail, v?.ownerEmail].some((e: any) => condoEmail(e) === email && email));
      if (!match) {
        return c.json({
          success: false,
          error: `${email} is not a registered vendor yet. Vendors keep one account across the whole platform — they need to be set up as a vendor first, then you can give them access here.`,
        }, 400);
      }
    }

    const existing = await kv.get(CONDO_GRANT(id, email)) as any;
    if (existing && existing.status === 'active') {
      return c.json({ success: false, error: `${email} is already on this association.` }, 409);
    }

    // Quota applies to the sub-portals the plan sells, not to board seats.
    if (['owner', 'resident', 'vendor'].includes(role)) {
      const members = (await condoGrantsFor(id)).filter((g: any) => g.status !== 'revoked');
      const consuming = members.filter((m: any) => ['owner', 'resident', 'vendor'].includes(String(m.role))).length;
      const plan = await condoSubPortalPlan(standing.user, standing.isAdmin);
      if (consuming >= plan.quota) {
        return c.json({
          success: false,
          error: `Your ${plan.planId} plan includes ${plan.quota} sub-portals and all are in use. Upgrade the plan to add more.`,
          quota: { planId: plan.planId, limit: plan.quota, used: consuming, remaining: 0 },
        }, 403);
      }
    }

    const now = new Date().toISOString();
    const grant = {
      associationId: id,
      email,
      name,
      unit: String(body.unit || '').trim().slice(0, 40),
      role,
      status: 'active',
      invited: false,
      grantedBy: condoEmail(standing.user.email),
      grantedByRole: actorRole,
      // A grant made by the board is the association speaking. One made by a
      // manager is not, and says so until the board confirms it.
      associationConfirmed: ['board_president', 'board_member'].includes(actorRole),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await kv.set(CONDO_GRANT(id, email), grant);
    await condoIndexPerson(email, id);

    return c.json({ success: true, member: grant }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to add the member.' }, 500);
  }
});

/** Change somebody's role, or remove them. */
condoRouter.patch('/condo/associations/:id/members/:email', async (c) => {
  try {
    const id = c.req.param('id');
    const target = condoEmail(c.req.param('email'));
    const standing = await condoStanding(c, id);
    if (!standing.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!standing.can('members')) return c.json({ success: false, error: 'You do not have permission to change this roster.' }, 403);

    const grant = await kv.get(CONDO_GRANT(id, target)) as any;
    if (!grant) return c.json({ success: false, error: 'That person is not on this association.' }, 404);

    const actorRole = standing.isAdmin ? 'board_president' : String(standing.grant?.role || '');
    // Removing or demoting a board member is the board's business alone.
    if (actorRole === 'property_manager' && ['board_president', 'board_member'].includes(String(grant.role))) {
      return c.json({ success: false, error: 'Only the board can change board membership.' }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const now = new Date().toISOString();
    const nextRole = body.role !== undefined ? String(body.role) as CondoRole : grant.role;
    if (body.role !== undefined && !CONDO_ROLES.includes(nextRole)) {
      return c.json({ success: false, error: 'That is not a role on this association.' }, 400);
    }
    if (actorRole === 'property_manager' && body.role !== undefined && !MANAGER_GRANTABLE.includes(nextRole)) {
      return c.json({ success: false, error: 'Only the board can appoint board members.' }, 403);
    }

    const removing = body.status === 'revoked';
    // The last board president cannot be removed, or the association would have
    // nobody able to consent to anything ever again.
    if ((removing || (body.role !== undefined && nextRole !== 'board_president')) && grant.role === 'board_president') {
      const presidents = (await condoGrantsFor(id))
        .filter((g: any) => g.status === 'active' && g.role === 'board_president');
      if (presidents.length <= 1) {
        return c.json({ success: false, error: 'This is the only board president. Appoint another before changing this one.' }, 409);
      }
    }

    const updated = {
      ...grant,
      role: nextRole,
      unit: body.unit !== undefined ? String(body.unit).trim().slice(0, 40) : grant.unit,
      name: body.name !== undefined ? String(body.name).trim().slice(0, 160) || grant.name : grant.name,
      status: removing ? 'revoked' : grant.status,
      updatedAt: now,
    };
    await kv.set(CONDO_GRANT(id, target), updated);
    if (removing) await condoUnindexPerson(target, id);

    return c.json({ success: true, member: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to update the member.' }, 500);
  }
});

/**
 * Give a member their login.
 *
 * Uses the same deliverPortalInvite every other portal type goes through, so a
 * condo owner gets the same branded email a tenant or a vendor does rather than
 * a second invitation mechanism that drifts from the first.
 */
condoRouter.post('/condo/associations/:id/members/:email/invite', async (c) => {
  try {
    const id = c.req.param('id');
    const target = condoEmail(c.req.param('email'));
    const standing = await condoStanding(c, id);
    if (!standing.user) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!standing.can('members')) return c.json({ success: false, error: 'You do not have permission to invite people.' }, 403);

    const association = await kv.get(CONDO_ASSOC(id)) as any;
    if (!association) return c.json({ success: false, error: 'Association not found.' }, 404);

    const grant = await kv.get(CONDO_GRANT(id, target)) as any;
    if (!grant || grant.status !== 'active') {
      return c.json({ success: false, error: 'Add this person to the association before inviting them.' }, 404);
    }

    // Which portal they land in. A board member or manager runs the
    // association, so they get the association portal; an owner, resident or
    // vendor gets the portal that already fits what they are.
    const portalType =
      grant.role === 'vendor' ? 'vendor'
      : grant.role === 'property_manager' ? 'condo_manager'
      : ['board_president', 'board_member'].includes(String(grant.role)) ? 'condo_association'
      : 'condo_association';

    const delivery = await deliverPortalInvite({
      name: String(grant.name || 'Member'),
      email: target,
      phone: String(grant.phone || ''),
      portalType,
      grantFullAccess: true,
      trialMonths: 0,
      sendEmail: true,
      sendSms: false,
      wantQr: false,
    });

    const now = new Date().toISOString();
    await kv.set(CONDO_GRANT(id, target), { ...grant, invited: true, invitedAt: now, updatedAt: now });
    await condoIndexPerson(target, id);

    return c.json({
      success: true,
      member: { ...grant, invited: true, invitedAt: now },
      invitationSent: Boolean((delivery as any)?.invitationSent),
      inviteNotice: String((delivery as any)?.inviteNotice || ''),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || 'Unable to send the invitation.' }, 500);
  }
});

/**
 * What the signed-in person is, on the associations they belong to.
 *
 * The condo association portal calls this instead of deciding for itself. The
 * role used to come out of localStorage, which meant anybody could award
 * themselves the board view; now it comes from the grant, which only the
 * association can issue.
 */
condoRouter.get('/condo/my-standing', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user) return c.json({ success: false, standing: null, error: 'Sign in first.' }, 401);
    const isAdmin = await intakeIsAdmin(user);

    const index = (await kv.get(CONDO_PERSON(user.email))) as any;
    const ids: string[] = Array.isArray(index?.associations) ? index.associations : [];

    const memberships = [];
    for (const id of ids) {
      const grant = await kv.get(CONDO_GRANT(id, user.email)) as any;
      if (!grant || grant.status !== 'active') continue;
      const association = await kv.get(CONDO_ASSOC(id)) as any;
      if (!association) continue;
      memberships.push({
        associationId: id,
        associationName: String(association.name || ''),
        role: String(grant.role || ''),
        unit: String(grant.unit || ''),
        associationConfirmed: Boolean(grant.associationConfirmed),
        consentStatus: String(association.consentStatus || ''),
        capabilities: CONDO_CAPABILITIES[grant.role as CondoRole] || [],
      });
    }

    return c.json({
      success: true,
      standing: {
        email: condoEmail(user.email),
        // Platform staff support these accounts, so they see them whole. This
        // is the one path that does not require a grant, and it requires real
        // platform authority rather than anything the browser can set.
        isPlatformAdmin: isAdmin,
        memberships,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, standing: null, error: error?.message || 'Unable to load your standing.' }, 500);
  }
});

  return condoRouter;
}

export default createCondoRouter;
