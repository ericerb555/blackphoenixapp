/**
 * The rental and property portals: landlords, tenants, condo and property
 * managers, leases, tenant screening and conditions reports.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * 4,107 lines and 89 routes, the largest single block in `index.tsx` and
 * about a fifth of what was left of it. It is one domain rather than a
 * convenient slice: a landlord owns properties, a tenant occupies one, a
 * screening decides whether they may, a lease records that they do, and a
 * conditions report is how the two of them disagree about its state. The
 * routes were already interleaved in that order because they were written
 * together.
 *
 * It could not move until `intakeActor`, `notifyRecipient`,
 * `persistWorkRequest`, `stripeKeyFor`, `deliverPortalInvite`, `money`,
 * `stripBase64` and `appUrl` all became importable. Each of those was its own
 * commit, and each was blocking this one. See `tasks/phoenix-ai-audit.md`.
 *
 * WHAT THE MOVE CHANGED
 *
 * Nothing. `scripts/indexSplit.mjs --range` reported two symbols escaping the
 * block — `landlordActor` and `propertyManagerActor`, wanted by three routes
 * that stayed behind — and they are exported for those callers rather than
 * duplicated. Every handler body is unchanged, and the served paths were
 * diffed against the previous commit.
 *
 * AUTHORISATION IS PER HANDLER, AS IT WAS
 *
 * Deliberately not swept behind one `requireStaff`. These routes serve four
 * different kinds of non-staff account — landlord, tenant, condo manager,
 * property manager — and each handler already establishes which of them is
 * asking, usually through `landlordActor` or `propertyManagerActor`, and what
 * they may see. A blanket guard would be wrong in both directions here.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { intakeActor, intakeIsAdmin } from "./identity.ts";
import { stripBase64, isUrl } from "./payloadLimits.ts";
import { APP_URL, appUrl, money, toE164, resolveCompanyName } from "./serverPrimitives.ts";
import { REPLY_TO_EMAIL, NOTIFICATION_FROM_EMAIL } from "./emailIdentity.ts";
import { notifyRecipient, pushInAppNotification, loadNotifPrefs } from "./notifications.ts";
import {
  workRequestActor, ownsWorkRequest, readWorkRequests, persistWorkRequest,
} from "./workRequests.ts";
import { deliverPortalInvite, INVITE_TEMPLATE_KEY } from "./portalInvite.ts";
import { stripeKeyFor } from "./stripeAccounts.ts";
import {
  isLandlord, isPropertyManager, assignedToManager,
  managerAccessAnswersLandlord,
  subPortalPlan, overrideIsUsable, TENANT_SUBPORTAL_QUOTA,
  type SubPortalPlan,
} from "./rentalAccess.ts";
import { auditEntry, auditKey, auditMonthPrefix } from "./screeningAudit.ts";
import { providerFor, DEFAULT_PROVIDER } from "./screeningProvider.ts";
import { isStaffRequest } from "./requireStaff.ts";
import { PLAN_KEY } from "./property-inspections.tsx";
import {
  type ConditionsReportRecord, type ReportStatus, applyTransition, buildReport,
  isFullyPriced, reportRefusal, reportView, tenantCopy, transitionRefusal,
  workRequestScope,
} from "./conditionsReport.ts";
import { areasFromQuote, pricingRefusal } from "./reportPricing.ts";
import {
  SCREENING_CONSENT_TEXT, screeningLinkExpiry, screeningLinkState, submissionRefusal,
} from "./screeningLink.ts";
import {
  SCREENING_MIN_RETENTION_DAYS, SCREENING_PURPOSES, SCREENING_PURPOSE_CERTIFICATION,
  SCREENING_PURPOSE_LABELS, SCREENING_STATES, type ScreeningState,
  adverseActionNotice, adverseActionRefusal, applicantView, auditEventFor,
  consentRefusal, consentRefusalMessage, inviteLapsed, isTerminal, landlordView,
  ownsOrder, purgeRefusal, purposeRefusal, purposeRefusalMessage, reportReadable,
  transition,
} from "./screeningOrder.ts";
import {
  SCREENING_MAX_PRICE_CENTS, chargeFor, chargeRefusalMessage, marginOf,
  refundDue, staleUndecided,
} from "./screeningPricing.ts";

export const rentalRouter = new Hono();

/** Service-role client, built on first use. Same shape as `identity.ts`. */
let cachedClient: any = null;
function client() {
  if (!cachedClient) {
    cachedClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cachedClient;
}
/**
 * Named `supabase` so the 31 call sites below read exactly as they did in
 * `index.tsx`. A getter rather than a module-level client, so a cold start
 * that never touches these routes never builds one.
 */
const supabase = new Proxy({} as any, {
  get: (_t, prop) => (client() as any)[prop],
});

// Property managers have a scoped operations queue.  Unlike the legacy
// property-management routes, this route requires a signed-in portal user and
// only returns requests explicitly assigned to that manager.
//
// The reads live here; the decision lives in `rentalAccess.ts`, where it is
// checked by `tests/rentalAccess.test.ts` without a server.
export async function propertyManagerActor(c: any) {
  const user = await intakeActor(c);
  if (!user?.email) return { user: null, admin: false, manager: false };
  const admin = await intakeIsAdmin(user);
  if (admin) return { user, admin: true, manager: true };
  const email = String(user.email).toLowerCase();
  // Deliberately not the `:landlord` key — see the asymmetry note in rentalAccess.ts.
  const managerAccess = await kv.get(`portal_access:${email}:property_manager`) as any;
  const manager = isPropertyManager({
    metadataRole: user.app_metadata?.role || user.app_metadata?.accountType,
    managerAccess,
  });
  return { user, admin: false, manager };
}

// A manager can always operate requests their own authenticated account created.
// Tenant/owner requests additionally require an explicit manager assignment, and
// the two managers' assignment fields are one table in `rentalAccess.ts`.
const assignedToPropertyManager = (record: any, user: any) =>
  ownsWorkRequest(record, user) || assignedToManager(record, user, 'property');

const assignedToCondoManager = (record: any, user: any) =>
  ownsWorkRequest(record, user) || assignedToManager(record, user, 'condo');

function condoUnitsKey(email: string) { return `condo_manager_units:${String(email).toLowerCase()}`; }

rentalRouter.get('/make-server-3eae23a6/condo-manager/units', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view association units.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    return c.json({ success: true, units: ((await kv.get(condoUnitsKey(actor.user.email))) as any[] || []).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load association units.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/condo-manager/units', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a unit.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    const body = stripBase64(await c.req.json()); const number = String(body.number || '').trim(); const owner = String(body.owner || '').trim(); const status = ['occupied', 'vacant'].includes(String(body.status || 'occupied')) ? String(body.status) : 'occupied'; const dues = ['current', 'overdue', 'n/a'].includes(String(body.dues || 'n/a')) ? String(body.dues) : 'n/a';
    if (!number) return c.json({ success: false, error: 'Unit number is required.' }, 400);
    if (status === 'occupied' && !owner) return c.json({ success: false, error: 'An owner is required for an occupied unit.' }, 400);
    const key = condoUnitsKey(actor.user.email); const existing = (await kv.get(key) as any[]) || [];
    if (existing.some((unit: any) => String(unit.number).toLowerCase() === number.toLowerCase())) return c.json({ success: false, error: 'This unit already exists in your association roster.' }, 409);
    const now = new Date().toISOString(); const unit = { id: `condo_unit_${crypto.randomUUID()}`, number, owner: status === 'vacant' ? 'Vacant' : owner, status, dues: status === 'vacant' ? 'n/a' : dues, condoManagerEmail: actor.user.email, condoManagerUserId: actor.user.id, createdAt: now, updatedAt: now };
    await kv.set(key, [unit, ...existing]); return c.json({ success: true, unit }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add unit.' }, 500); }
});

rentalRouter.get('/make-server-3eae23a6/condo-manager/work-requests', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view condo work requests.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    const records = await readWorkRequests();
    return c.json({ success: true, workRequests: (actor.admin ? records : records.filter((record: any) => assignedToCondoManager(record, actor.user))).map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load condo work requests.' }, 500); }
});

rentalRouter.patch('/make-server-3eae23a6/condo-manager/work-requests/:id/decision', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in before making a decision.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active condo-manager portal is required.' }, 403);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!actor.admin && !assignedToCondoManager(record, actor.user)) return c.json({ success: false, error: 'This request is not assigned to your condo-management account.' }, 403);
    const body = await c.req.json(); const decision = String(body.decision || '').toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return c.json({ success: false, error: 'Decision must be approved or rejected.' }, 400);
    const now = new Date().toISOString(); const updated = { ...record, status: decision, approvalHistory: [...(Array.isArray(record.approvalHistory) ? record.approvalHistory : []), { status: decision, note: String(body.note || '').slice(0, 2000), actorEmail: actor.user.email, decidedAt: now }], lastDecisionBy: actor.user.email, lastDecisionAt: now, updated_at: now };
    await persistWorkRequest(updated);
    return c.json({ success: true, workRequest: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update condo work request.' }, 500); }
});

export async function landlordActor(c: any) {
  const user = await intakeActor(c);
  if (!user?.email) return { user: null, admin: false, landlord: false };
  const admin = await intakeIsAdmin(user);
  if (admin) return { user, admin: true, landlord: true };
  const email = String(user.email).toLowerCase();
  // Earlier landlord applications used the property_manager intake type. Keep
  // those approved accounts working while allowing the explicit landlord role.
  //
  // The second read is skipped only when the manager record is ACTIVE, because
  // that already settles the question. It used to be skipped whenever the
  // manager record merely EXISTED, which meant a leftover `pending` one — from
  // precisely the old intake path this compatibility is for — hid an active
  // landlord record and returned 403 on the person's own building. See
  // `managerAccessAnswersLandlord`.
  const managerAccess = await kv.get(`portal_access:${email}:property_manager`) as any;
  const landlordAccess = managerAccessAnswersLandlord(managerAccess)
    ? null
    : await kv.get(`portal_access:${email}:landlord`) as any;
  const landlord = isLandlord({
    metadataRole: user.app_metadata?.role || user.app_metadata?.accountType,
    managerAccess,
    landlordAccess,
  });
  return { user, admin: false, landlord };
}

// Tier 1 Landlord = 25, Tier 2 Condo Manager = 50, Tier 3 Property Manager = 100.
// Re-exported because three routes left behind in `index.tsx` import it from here.
export { TENANT_SUBPORTAL_QUOTA };

// Resolves a landlord's active plan tier and the tenant sub-portal quota it grants.
// The reads are here, the ordering of authority is in `rentalAccess.ts`. A usable
// override settles the answer without the `subscription:` prefix scan, and an
// unreadable store falls back to Tier 1 rather than to nothing.
async function landlordSubPortalPlan(actor: any): Promise<SubPortalPlan> {
  if (actor?.admin) return subPortalPlan({ admin: true });
  const email = String(actor?.user?.email || '').toLowerCase();
  if (!email) return subPortalPlan({});

  const override = await kv.get(`landlord_subportal_quota:${email}`) as any;
  if (overrideIsUsable(override)) return subPortalPlan({ email, override });

  let subscriptions: any[] = [];
  try {
    subscriptions = (await kv.getByPrefix('subscription:')) as any[] || [];
  } catch (_error) { /* an unreadable store is Tier 1, not no tier */ }
  return subPortalPlan({ email, subscriptions });
}

/**
 * POST /landlord/plan-item/quote — ask us to price one line of a maintenance plan.
 *
 * P6 of `tasks/property-inspections.md`, and the one point where a landlord's
 * private plan touches our business.
 *
 * WHY THIS IS A BUTTON AND NOT AUTOMATIC
 *
 * A maintenance plan drafted from an inspection is the landlord's own thinking
 * about their building. Turning every line of it into a work request would be
 * us deciding how somebody else spends their money, and it would fill the
 * pipeline with work nobody has agreed to. So the plan stays theirs, and each
 * line is sent to us only when they press the button on that line.
 *
 * WHY IT LIVES HERE RATHER THAN WITH THE OTHER INSPECTION ROUTES
 *
 * `persistWorkRequest` is defined in this file, and it is the one way a work
 * request is written — it maintains the index, the legacy list, and since J2 it
 * resolves the job the request belongs to. Reaching for the key-value store
 * directly from the inspections router would be a second way to create a work
 * request, and the second way is always the one that forgets something.
 */
rentalRouter.post('/make-server-3eae23a6/landlord/plan-item/quote', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in first.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);

    const email = String(actor.user.email).toLowerCase();
    const body = await c.req.json().catch(() => ({}));
    const inspectionId = String(body?.inspectionId || '').trim();
    const index = Number(body?.itemIndex);
    if (!inspectionId || !Number.isInteger(index) || index < 0) {
      return c.json({ success: false, error: 'Which line of which plan?' }, 400);
    }

    const plan = await kv.get(PLAN_KEY(email, inspectionId)) as any;
    const item = plan?.items?.[index];
    if (!item) return c.json({ success: false, error: 'No such line in that plan.' }, 404);

    /**
     * Asking twice does not raise a second request.
     *
     * The failure this prevents is not an untidy list — it is two crews being
     * sent to look at one roof, which is a real cost and an awkward phone call.
     */
    if (item.workRequestId) {
      return c.json({
        success: false,
        error: 'That line has already been sent to us. It is in your Maintenance tab.',
        workRequestId: item.workRequestId,
      }, 409);
    }

    const inspection = await kv.get(`inspection:${email}:${inspectionId}`) as any;
    const now = new Date().toISOString();

    /**
     * The description carries what the inspection actually found.
     *
     * Whoever prices this has not walked the building, and "Roof & Gutters" on
     * its own tells them nothing. The condition, the note the inspector wrote
     * and the reason it matters are what make a quote possible without a second
     * visit.
     */
    const observed = (inspection?.areas || []).find((a: any) => a.name === item.area);
    const description = [
      item.work,
      item.why ? `Why it matters: ${item.why}` : '',
      observed?.condition ? `Recorded condition: ${observed.condition}` : '',
      observed?.notes ? `Inspector's note: ${observed.notes}` : '',
      observed?.media?.length ? `${observed.media.length} photo/video on file for this area.` : '',
      `From the inspection of ${String(inspection?.completedAt || '').slice(0, 10) || 'this property'}.`,
    ].filter(Boolean).join('\n');

    const title = `${item.area}: ${String(item.work).slice(0, 120)}`;
    const record = {
      id: `wr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      title, project_name: title, description,
      // The plan's own urgency, mapped onto the scale the pipeline uses.
      priority: item.urgency === 'urgent' ? 'high' : item.urgency === 'this year' ? 'medium' : 'low',
      category: 'maintenance',
      unit: '',
      address: inspection?.propertyAddress || plan.propertyName || '',
      client_email: email, clientEmail: email,
      client_name: String(actor.user.user_metadata?.full_name || actor.user.user_metadata?.name || ''),
      user_id: actor.user.id,
      landlordEmail: email,
      type: 'landlord',
      source: 'property-inspection',
      // Where it came from, so a question about this job can be traced back to
      // the photographs that prompted it.
      inspectionId,
      planItemIndex: index,
      propertyId: plan.propertyId || null,
      status: 'pending',
      attachments: [],
      created_at: now, updated_at: now,
    };

    // The one way a work request is written. Since J2 this also resolves the
    // job it belongs to, so a quote raised here lands on the same job as
    // everything else about this property's work.
    await persistWorkRequest(record);

    // Stamp the line so the plan shows it has been sent and cannot send again.
    plan.items[index] = { ...item, workRequestId: record.id, quotedAt: now };
    plan.updatedAt = now;
    await kv.set(PLAN_KEY(email, inspectionId), plan);

    console.log(`[Inspections] ${email} asked for a quote on ${item.area} — ${record.id}`);
    return c.json({
      success: true,
      workRequestId: record.id,
      jobId: (record as any).jobId || null,
      note: 'Sent. It is in your Maintenance tab, and we will come back with a price.',
    }, 201);
  } catch (error: any) {
    console.error('[Inspections] quote request failed:', error?.message || error);
    return c.json({ success: false, error: error?.message || 'Could not send that for a quote.' }, 500);
  }
});


rentalRouter.get('/make-server-3eae23a6/landlord/work-requests', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view maintenance requests.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const records = await readWorkRequests();
    const scoped = actor.admin ? records : records.filter((record: any) => ownsWorkRequest(record, actor.user) || String(record.landlordEmail || '').toLowerCase() === String(actor.user.email).toLowerCase() || String(record.ownerEmail || '').toLowerCase() === String(actor.user.email).toLowerCase());
    return c.json({ success: true, workRequests: scoped.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load maintenance requests.' }, 500); }
});

rentalRouter.patch('/make-server-3eae23a6/landlord/work-requests/:id/decision', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in before making a decision.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Maintenance request not found.' }, 404);
    const owns = ownsWorkRequest(record, actor.user) || String(record.landlordEmail || '').toLowerCase() === String(actor.user.email).toLowerCase() || String(record.ownerEmail || '').toLowerCase() === String(actor.user.email).toLowerCase();
    if (!actor.admin && !owns) return c.json({ success: false, error: 'This request is not assigned to your landlord account.' }, 403);
    const body = await c.req.json(); const decision = String(body.decision || '').toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return c.json({ success: false, error: 'Decision must be approved or rejected.' }, 400);
    const now = new Date().toISOString();
    const updated = { ...record, status: decision, approvalHistory: [...(Array.isArray(record.approvalHistory) ? record.approvalHistory : []), { status: decision, note: String(body.note || '').slice(0, 2000), actorEmail: actor.user.email, decidedAt: now }], lastDecisionBy: actor.user.email, lastDecisionAt: now, updated_at: now };
    await persistWorkRequest(updated);
    return c.json({ success: true, workRequest: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update maintenance request.' }, 500); }
});

function landlordTenantsKey(email: string) { return `landlord_tenants:${String(email).toLowerCase()}`; }

rentalRouter.get('/make-server-3eae23a6/landlord/tenants', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view tenants.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const tenants = ((await kv.get(landlordTenantsKey(actor.user.email))) as any[] || []).map(stripBase64);
    const plan = await landlordSubPortalPlan(actor);
    return c.json({
      success: true,
      tenants,
      quota: { planId: plan.planId, limit: plan.quota, used: tenants.length, remaining: Math.max(0, plan.quota - tenants.length) },
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load tenants.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/landlord/tenants', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a tenant.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const body = stripBase64(await c.req.json()); const name = String(body.name || '').trim(); const unit = String(body.unit || '').trim(); const rent = Number(body.rent);
    const tenantEmail = String(body.email || '').trim().toLowerCase();
    const status = ['current', 'late', 'pending'].includes(String(body.status || 'current')) ? String(body.status) : 'current';
    if (!name) return c.json({ success: false, error: 'Tenant name is required.' }, 400);
    if (tenantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) return c.json({ success: false, error: 'Enter a valid tenant email.' }, 400);
    if (!unit) return c.json({ success: false, error: 'Unit is required.' }, 400);
    if (!Number.isFinite(rent) || rent < 0) return c.json({ success: false, error: 'Monthly rent must be zero or greater.' }, 400);
    const key = landlordTenantsKey(actor.user.email); const existing = (await kv.get(key) as any[]) || [];
    const plan = await landlordSubPortalPlan(actor);
    if (existing.length >= plan.quota) {
      return c.json({
        success: false,
        error: `Your ${plan.planId} plan includes ${plan.quota} tenant sub-portals and all are in use. Upgrade your plan to add more tenants.`,
        quota: { planId: plan.planId, limit: plan.quota, used: existing.length, remaining: 0 },
      }, 403);
    }
    const now = new Date().toISOString(); const tenant = { id: `tenant_${crypto.randomUUID()}`, name, email: tenantEmail, unit, rent: Math.round(rent * 100) / 100, status, landlordEmail: actor.user.email, landlordUserId: actor.user.id, createdAt: now, updatedAt: now };
    await kv.set(key, [tenant, ...existing]);
    // Map the tenant's email to their landlord so work requests submitted from the
    // tenant portal route back to this landlord's Maintenance tab.
    if (tenantEmail) await kv.set(`tenant_landlord:${tenantEmail}`, { landlordEmail: String(actor.user.email).toLowerCase(), landlordUserId: actor.user.id, tenantName: name, unit, updatedAt: now });
    return c.json({ success: true, tenant, quota: { planId: plan.planId, limit: plan.quota, used: existing.length + 1, remaining: Math.max(0, plan.quota - existing.length - 1) } }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add tenant.' }, 500); }
});

// Provision (or refresh) a tenant's login so they can reach their sub-portal.
// Creates a Supabase auth user with the tenant role, confirms the email (no mail
// server configured), and returns a temporary password for the landlord to share.
/**
 * Remove a tenant from a landlord’s portal.
 *
 * WHY THE LANDLORD AND NOT US
 *
 * A tenant is invited by their landlord rather than by Black Phoenix, because
 * the landlord is the party that holds the relationship. Ending it is the same
 * decision in reverse, so it belongs to the same person.
 *
 * SCOPE COMES FROM THE KEY, NOT FROM THE REQUEST
 *
 * The roster is stored under the signed-in landlord’s own address, so a
 * landlord can only ever look at, and therefore only ever remove from, their
 * own list. There is no tenant id that could reach somebody else’s tenant.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not delete the person’s Black Phoenix account. Removing a tenant is
 * a landlord ending a tenancy; closing an account is a decision for an owner
 * or administrator, and conflating the two would let any landlord shut down
 * somebody who is also a customer somewhere else.
 */
rentalRouter.delete('/make-server-3eae23a6/landlord/tenants/:id', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to remove a tenant.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);

    const id = String(c.req.param('id') || '');
    const key = landlordTenantsKey(actor.user.email);
    const tenants = ((await kv.get(key)) as any[]) || [];
    const tenant = tenants.find((t: any) => String(t?.id) === id);
    if (!tenant) return c.json({ success: false, error: 'That tenant is not on your roster.' }, 404);

    await kv.set(key, tenants.filter((t: any) => String(t?.id) !== id));

    /**
     * Clear the routing, but only if it still points here.
     *
     * `tenant_landlord:` is what sends a tenant’s work requests to the right
     * landlord. Leaving it behind would route their requests to a landlord who
     * no longer has them. Clearing it blindly would be worse: if they have
     * since moved to another landlord, that mapping belongs to somebody else
     * now and deleting it would break a live tenancy.
     */
    const tenantEmail = String(tenant.email || '').trim().toLowerCase();
    if (tenantEmail) {
      const mapping = (await kv.get(`tenant_landlord:${tenantEmail}`)) as any;
      if (String(mapping?.landlordEmail || '').toLowerCase() === String(actor.user.email).toLowerCase()) {
        await kv.del(`tenant_landlord:${tenantEmail}`);
      }
    }

    console.log(`[landlord] ${actor.user.email} removed tenant ${tenantEmail || id}`);
    return c.json({ success: true, removed: { id, email: tenantEmail || null, name: tenant.name || null } });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to remove that tenant.' }, 500); }
});
rentalRouter.post('/make-server-3eae23a6/landlord/tenants/:id/invite', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before inviting a tenant.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const key = landlordTenantsKey(actor.user.email);
    const roster = (await kv.get(key) as any[]) || [];
    const idx = roster.findIndex((t: any) => t.id === c.req.param('id'));
    if (idx < 0) return c.json({ success: false, error: 'Tenant not found on your roster.' }, 404);
    const tenant = roster[idx];
    const tenantEmail = String(tenant.email || '').trim().toLowerCase();
    if (!tenantEmail) return c.json({ success: false, error: 'Add an email to this tenant before inviting them.' }, 400);

    // Reuse an existing account when the tenant already signed up.
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const already = (existingList?.users || []).find((u: any) => String(u.email || '').toLowerCase() === tenantEmail);
    const tempPassword = `Tenant-${crypto.randomUUID().slice(0, 8)}`;
    let created = false;
    if (!already) {
      const { error } = await supabase.auth.admin.createUser({
        email: tenantEmail,
        password: tempPassword,
        // The role goes in app_metadata because that is the bag the browser
        // cannot write and therefore the only one authority is read from.
        // user_metadata keeps the display copy for anything cosmetic.
        app_metadata: { role: 'tenant' },
        user_metadata: { name: tenant.name, full_name: tenant.name, role: 'tenant', accountType: 'tenant', unit: tenant.unit, landlordEmail: String(actor.user.email).toLowerCase() },
        // Confirm immediately since no email server is configured for this project.
        email_confirm: true,
      });
      if (error) return c.json({ success: false, error: `Unable to create the tenant login: ${error.message}` }, 502);
      created = true;
    }
    const now = new Date().toISOString();
    // Keep the tenant→landlord mapping current for work-request routing.
    await kv.set(`tenant_landlord:${tenantEmail}`, { landlordEmail: String(actor.user.email).toLowerCase(), landlordUserId: actor.user.id, tenantName: tenant.name, unit: tenant.unit, updatedAt: now });
    // Send the same branded invite every other portal type gets, rather than
    // handing the landlord a temporary password to relay by hand. The tenant
    // label and blurb have existed in portal-invite-email.tsx all along and were
    // simply never called — this was the one portal a person could not be
    // properly invited into.
    //
    // Safe to run after the createUser above: ensureAuthUser() inside this only
    // writes metadata when it creates the account, so the tenant's role, unit
    // and landlordEmail set above are not overwritten on a resend.
    let invitationSent = false;
    let inviteNotice = '';
    try {
      const delivery = await deliverPortalInvite({
        name: tenant.name || 'Tenant',
        email: tenantEmail,
        phone: String(tenant.phone || ''),
        portalType: 'tenant',
        grantFullAccess: true,
        trialMonths: 0,
        sendEmail: true,
        sendSms: false,
        wantQr: false,
      });
      invitationSent = delivery.invitationSent;
      inviteNotice = delivery.inviteNotice || '';
    } catch (mailError: any) {
      inviteNotice = mailError?.message || 'The invite email could not be sent.';
    }

    roster[idx] = { ...tenant, invited: true, invitedAt: now, hasAccount: true, updatedAt: now };
    await kv.set(key, roster);
    return c.json({
      success: true,
      tenant: roster[idx],
      created,
      invitationSent,
      inviteNotice,
      // The temp password is now a fallback, not the delivery mechanism. It is
      // returned only when the account was newly made AND the email did not go —
      // otherwise the landlord is handed a credential they have no reason to see.
      tempPassword: created && !invitationSent ? tempPassword : null,
      alreadyHadAccount: !created,
    });
  } catch (error: any) { console.log('Tenant invite error:', error); return c.json({ success: false, error: error.message || 'Unable to invite the tenant.' }, 500); }
});

function landlordPortfolioKey(email: string) { return `landlord_portfolio:${String(email).toLowerCase()}`; }

const PROPERTY_MEDIA_BUCKET = 'make-57095a78-property-media';
async function ensurePropertyMediaBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((item: any) => item.name === PROPERTY_MEDIA_BUCKET)) {
    const created = await supabase.storage.createBucket(PROPERTY_MEDIA_BUCKET, { public: false });
    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) throw created.error;
  }
}

// Regenerate fresh signed URLs for a property's stored media (private bucket).
async function signPropertyMedia(property: any) {
  const media = Array.isArray(property?.media) ? property.media : [];
  if (media.length === 0) return property;
  const signed = await Promise.all(media.map(async (m: any) => {
    if (!m?.path) return m;
    try {
      const { data } = await supabase.storage.from(m.bucket || PROPERTY_MEDIA_BUCKET).createSignedUrl(m.path, 60 * 60 * 24 * 7);
      return { ...m, url: data?.signedUrl || '' };
    } catch { return { ...m, url: '' }; }
  }));
  return { ...property, media: signed };
}

// ── Public parcel records (Regrid) — GIS + plot plans ───────────────────────
// Looks a property up in the official Regrid parcel database and returns both
// the parcel facts (zoning, acreage, assessed value, owner of record, lat/lon)
// and the raw parcel boundary geometry (GeoJSON) used to render the plot plan.
// Best-effort: returns a clear error if the key is missing or nothing matches.
async function fetchParcelRecord(address: string): Promise<{ parcel: any; geometry: any } | null> {
  const token = Deno.env.get('REGRID_API_KEY');
  if (!token || !address.trim()) return null;
  const url = `https://app.regrid.com/api/v2/parcels/address?query=${encodeURIComponent(address)}&limit=1&token=${encodeURIComponent(token)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err: any) {
    console.log(`[regrid] lookup failed for "${address}": ${err?.message || err}`);
    return null;
  } finally { clearTimeout(timeout); }
  if (!res.ok) { console.log(`[regrid] lookup for "${address}" returned ${res.status}`); return null; }
  const data = await res.json().catch(() => null);
  const feature = data?.parcels?.features?.[0] || data?.features?.[0];
  if (!feature) return null;
  const f = feature.properties?.fields || feature.properties || {};
  const num = (v: any) => (v === null || v === undefined || v === '' ? undefined : Number(v));
  const parcel = {
    parcelNumber: f.parcelnumb || f.parcelnumb_no_formatting,
    owner: f.owner,
    address: f.address || [f.saddno, f.saddstr].filter(Boolean).join(' ') || undefined,
    city: f.scity || f.city,
    county: f.county,
    state: f.state2 || f.state,
    zip: f.szip || f.zip,
    zoning: f.zoning,
    zoningDescription: f.zoning_description,
    zoningType: f.zoning_type,
    landUse: f.usedesc || f.lbcs_activity_desc,
    acreage: num(f.ll_gisacre ?? f.gisacre),
    buildingSqft: num(f.ll_bldg_footprint_sqft),
    yearBuilt: f.yearbuilt,
    landValue: num(f.landval),
    improvementValue: num(f.improvval),
    parcelValue: num(f.parval),
    lat: num(f.lat),
    lon: num(f.lon),
    source: 'regrid',
    sourceLabel: 'Regrid parcel record',
    fetchedAt: new Date().toISOString(),
  };
  return { parcel, geometry: feature.geometry || null };
}


// Generic address → parcel lookup. Read-only public data; reused by the condo
// portal and the owner-side document views (which don't go through landlordActor).
rentalRouter.post('/make-server-3eae23a6/property-records/lookup', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const address = String(body.address || '').trim();
    if (!address) return c.json({ success: false, error: 'An address is required to look up public records.' }, 400);
    if (!Deno.env.get('REGRID_API_KEY')) return c.json({ success: false, error: 'The parcel data source (Regrid) is not configured for this account.' }, 501);
    const result = await fetchParcelRecord(address);
    if (!result) return c.json({ success: false, error: `No public parcel record was found for "${address}". Double-check the street address, city, and state.` }, 404);
    return c.json({ success: true, parcel: result.parcel, geometry: result.geometry });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Parcel lookup failed.' }, 500); }
});

// Refresh a landlord property from public records: fills blank fields, and stores
// the parcel facts + boundary geometry on the property for the GIS/plot-plan view.
rentalRouter.post('/make-server-3eae23a6/landlord/properties/:id/enrich', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to refresh property records.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    if (!Deno.env.get('REGRID_API_KEY')) return c.json({ success: false, error: 'The parcel data source (Regrid) is not configured for this account.' }, 501);
    const key = landlordPortfolioKey(actor.user.email);
    const portfolio = (await kv.get(key) as any[]) || [];
    const idx = portfolio.findIndex((p: any) => String(p.id) === String(c.req.param('id')));
    if (idx === -1) return c.json({ success: false, error: 'Property not found.' }, 404);
    const property = portfolio[idx];
    const result = await fetchParcelRecord(String(property.address || ''));
    if (!result) return c.json({ success: false, error: `No public parcel record was found for "${property.address}".` }, 404);
    const p = result.parcel;
    const blank = (v: any) => v === null || v === undefined || v === '';
    const updated = {
      ...property,
      yearBuilt: blank(property.yearBuilt) && p.yearBuilt ? Number(p.yearBuilt) : property.yearBuilt,
      squareFootage: blank(property.squareFootage) && p.buildingSqft ? p.buildingSqft : property.squareFootage,
      lotSize: blank(property.lotSize) && p.acreage ? `${p.acreage} acres` : property.lotSize,
      currentValue: blank(property.currentValue) && p.parcelValue ? p.parcelValue : property.currentValue,
      parcel: p,
      parcelGeometry: result.geometry,
      recordsUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    portfolio[idx] = updated;
    await kv.set(key, portfolio);
    const signed = await signPropertyMedia(updated);
    return c.json({ success: true, property: signed, parcel: p });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to refresh property records.' }, 500); }
});

rentalRouter.get('/make-server-3eae23a6/landlord/properties', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your properties.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const saved = (await kv.get(landlordPortfolioKey(email)) as any[]) || [];
    const legacy = (await kv.get('properties') as any[]) || [];
    const compatible = legacy.filter((property: any) => String(property.landlordEmail || property.ownerEmail || '').toLowerCase() === email || (actor.user?.id && String(property.landlordUserId || property.ownerUserId || '') === String(actor.user.id)));
    const seen = new Set(saved.map((property: any) => String(property.id)));
    const merged = [...saved, ...compatible.filter((property: any) => !seen.has(String(property.id)))].map(stripBase64);
    const withMedia = await Promise.all(merged.map((p: any) => signPropertyMedia(p)));
    return c.json({ success: true, properties: withMedia });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load landlord properties.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/landlord/properties', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a property.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();

    // Accept either JSON (legacy) or multipart form-data (with photos/videos).
    const contentType = String(c.req.header('content-type') || '');
    let body: any = {};
    let files: File[] = [];
    if (contentType.includes('multipart/form-data')) {
      const parsed = await c.req.parseBody();
      body = parsed;
      files = Object.keys(parsed).filter(k => k.startsWith('media_')).map(k => parsed[k]).filter((f): f is File => f instanceof File);
    } else {
      body = stripBase64(await c.req.json());
    }

    const str = (v: any, max = 2000) => String(v ?? '').trim().slice(0, max);
    const numOrNull = (v: any) => { const n = Number(v); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null; };

    const name = str(body.name, 200); const address = str(body.address, 300);
    const suppliedUnits = Number(body.units); const suppliedVacancies = Number(body.vacancies || 0);
    if (!name) return c.json({ success: false, error: 'Property name is required.' }, 400);
    if (!address) return c.json({ success: false, error: 'Property address is required.' }, 400);
    if (!Number.isFinite(suppliedUnits) || suppliedUnits < 1) return c.json({ success: false, error: 'Enter at least one unit.' }, 400);
    if (!Number.isFinite(suppliedVacancies) || suppliedVacancies < 0) return c.json({ success: false, error: 'Vacancies must be zero or greater.' }, 400);
    const units = Math.floor(suppliedUnits); const vacancies = Math.min(units, Math.floor(suppliedVacancies));

    // Upload any attached photos/videos to a private bucket (best-effort).
    const media: any[] = [];
    try {
      if (files.length) {
        await ensurePropertyMediaBucket();
        for (const file of files.slice(0, 12)) {
          if (file.size > 100 * 1024 * 1024) continue; // 100MB cap (covers short videos)
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'media';
          const path = `${email}/${crypto.randomUUID()}-${safeName}`;
          const upload = await supabase.storage.from(PROPERTY_MEDIA_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
          if (!upload.error) media.push({ name: file.name, bucket: PROPERTY_MEDIA_BUCKET, path, contentType: file.type || '', kind: (file.type || '').startsWith('video') ? 'video' : 'image' });
        }
      }
    } catch (mediaErr: any) { console.log('Property media upload skipped:', mediaErr?.message || mediaErr); }

    const now = new Date().toISOString();
    const property = {
      id: `landlord_property_${crypto.randomUUID()}`,
      name, address, units, vacancies,
      propertyType: str(body.propertyType, 60),
      yearBuilt: numOrNull(body.yearBuilt),
      squareFootage: numOrNull(body.squareFootage),
      bedrooms: numOrNull(body.bedrooms),
      bathrooms: numOrNull(body.bathrooms),
      lotSize: str(body.lotSize, 60),
      parkingSpaces: numOrNull(body.parkingSpaces),
      heatingType: str(body.heatingType, 60),
      monthlyRent: numOrNull(body.monthlyRent),
      purchasePrice: numOrNull(body.purchasePrice),
      currentValue: numOrNull(body.currentValue),
      amenities: str(body.amenities, 1000),
      conditionNotes: str(body.conditionNotes, 4000),
      media,
      aiCondition: null,
      ownerEmail: actor.user.email, landlordEmail: actor.user.email, landlordUserId: actor.user.id,
      createdAt: now, updatedAt: now,
    };
    const key = landlordPortfolioKey(actor.user.email); const existing = (await kv.get(key) as any[]) || []; await kv.set(key, [property, ...existing]);
    const signed = await signPropertyMedia(property);
    return c.json({ success: true, property: signed }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add property.' }, 500); }
});

// AI condition assessment — reads the property's photos and returns a structured
// condition report so landlords can track issues without an on-site visit.
rentalRouter.post('/make-server-3eae23a6/landlord/properties/:id/analyze', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to analyze a property.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return c.json({ success: false, error: 'OpenAI is not configured for this account.' }, 500);
    const propertyId = c.req.param('id');
    const key = landlordPortfolioKey(actor.user.email);
    const portfolio = (await kv.get(key) as any[]) || [];
    const idx = portfolio.findIndex((p: any) => String(p.id) === String(propertyId));
    if (idx === -1) return c.json({ success: false, error: 'Property not found.' }, 404);
    const property = portfolio[idx];
    const photos = (Array.isArray(property.media) ? property.media : []).filter((m: any) => m.kind !== 'video');
    if (photos.length === 0) return c.json({ success: false, error: 'Add at least one photo before running an AI condition assessment.' }, 400);

    // Sign the photos so the vision model can fetch them.
    const imageUrls: string[] = [];
    for (const m of photos.slice(0, 6)) {
      try {
        const { data } = await supabase.storage.from(m.bucket || PROPERTY_MEDIA_BUCKET).createSignedUrl(m.path, 60 * 30);
        if (data?.signedUrl) imageUrls.push(data.signedUrl);
      } catch { /* skip */ }
    }
    if (imageUrls.length === 0) return c.json({ success: false, error: 'Could not access property photos for analysis.' }, 500);

    const prompt = `You are a property inspector. Assess the condition of this rental property from the photos. Property: ${property.name}, ${property.address}. Notes from landlord: ${property.conditionNotes || 'none'}. Return STRICT JSON with keys: "overallScore" (1-10 integer), "summary" (2-3 sentences), "issues" (array of {area, severity: "low"|"medium"|"high", description}), "recommendations" (array of strings). No markdown, JSON only.`;
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } })),
      ],
    }];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 900, response_format: { type: 'json_object' } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return c.json({ success: false, error: `AI analysis failed: ${data?.error?.message || res.status}` }, 500);
    let report: any = {};
    try { report = JSON.parse(data.choices?.[0]?.message?.content || '{}'); } catch { report = { summary: data.choices?.[0]?.message?.content || 'No report.' }; }
    const aiCondition = { ...report, analyzedAt: new Date().toISOString(), photoCount: imageUrls.length };
    portfolio[idx] = { ...property, aiCondition, updatedAt: new Date().toISOString() };
    await kv.set(key, portfolio);
    return c.json({ success: true, aiCondition });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to analyze property.' }, 500); }
});

// Update an existing property's tracking fields (and optionally append new media).
rentalRouter.put('/make-server-3eae23a6/landlord/properties/:id', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to edit a property.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const propertyId = c.req.param('id');
    const key = landlordPortfolioKey(actor.user.email);
    const portfolio = (await kv.get(key) as any[]) || [];
    const idx = portfolio.findIndex((p: any) => String(p.id) === String(propertyId));
    if (idx === -1) return c.json({ success: false, error: 'Property not found.' }, 404);
    const existing = portfolio[idx];

    const contentType = String(c.req.header('content-type') || '');
    let body: any = {}; let files: File[] = [];
    if (contentType.includes('multipart/form-data')) {
      const parsed = await c.req.parseBody();
      body = parsed;
      files = Object.keys(parsed).filter(k => k.startsWith('media_')).map(k => parsed[k]).filter((f): f is File => f instanceof File);
    } else { body = stripBase64(await c.req.json()); }

    const str = (v: any, max = 2000) => String(v ?? '').trim().slice(0, max);
    const numOrNull = (v: any) => { const n = Number(v); return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null; };
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    const name = has('name') ? str(body.name, 200) : existing.name;
    const address = has('address') ? str(body.address, 300) : existing.address;
    if (!name) return c.json({ success: false, error: 'Property name is required.' }, 400);
    if (!address) return c.json({ success: false, error: 'Property address is required.' }, 400);
    const units = has('units') ? Math.max(1, Math.floor(Number(body.units) || existing.units || 1)) : existing.units;
    const vacancies = has('vacancies') ? Math.min(units, Math.max(0, Math.floor(Number(body.vacancies) || 0))) : Math.min(units, existing.vacancies || 0);

    // Append any newly uploaded media.
    const media: any[] = Array.isArray(existing.media) ? [...existing.media] : [];
    try {
      if (files.length) {
        await ensurePropertyMediaBucket();
        for (const file of files.slice(0, 12)) {
          if (file.size > 100 * 1024 * 1024) continue;
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'media';
          const path = `${email}/${crypto.randomUUID()}-${safeName}`;
          const upload = await supabase.storage.from(PROPERTY_MEDIA_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
          if (!upload.error) media.push({ name: file.name, bucket: PROPERTY_MEDIA_BUCKET, path, contentType: file.type || '', kind: (file.type || '').startsWith('video') ? 'video' : 'image' });
        }
      }
    } catch (mediaErr: any) { console.log('Property media update skipped:', mediaErr?.message || mediaErr); }

    const updated = {
      ...existing, name, address, units, vacancies,
      propertyType: has('propertyType') ? str(body.propertyType, 60) : existing.propertyType,
      yearBuilt: has('yearBuilt') ? numOrNull(body.yearBuilt) : existing.yearBuilt,
      squareFootage: has('squareFootage') ? numOrNull(body.squareFootage) : existing.squareFootage,
      bedrooms: has('bedrooms') ? numOrNull(body.bedrooms) : existing.bedrooms,
      bathrooms: has('bathrooms') ? numOrNull(body.bathrooms) : existing.bathrooms,
      lotSize: has('lotSize') ? str(body.lotSize, 60) : existing.lotSize,
      parkingSpaces: has('parkingSpaces') ? numOrNull(body.parkingSpaces) : existing.parkingSpaces,
      heatingType: has('heatingType') ? str(body.heatingType, 60) : existing.heatingType,
      monthlyRent: has('monthlyRent') ? numOrNull(body.monthlyRent) : existing.monthlyRent,
      purchasePrice: has('purchasePrice') ? numOrNull(body.purchasePrice) : existing.purchasePrice,
      currentValue: has('currentValue') ? numOrNull(body.currentValue) : existing.currentValue,
      amenities: has('amenities') ? str(body.amenities, 1000) : existing.amenities,
      conditionNotes: has('conditionNotes') ? str(body.conditionNotes, 4000) : existing.conditionNotes,
      media, updatedAt: new Date().toISOString(),
    };
    portfolio[idx] = updated;
    await kv.set(key, portfolio);
    const signed = await signPropertyMedia(updated);
    return c.json({ success: true, property: signed });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update property.' }, 500); }
});

// Delete a property (and clean up its stored media).
rentalRouter.delete('/make-server-3eae23a6/landlord/properties/:id', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to delete a property.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const propertyId = c.req.param('id');
    const key = landlordPortfolioKey(actor.user.email);
    const portfolio = (await kv.get(key) as any[]) || [];
    const target = portfolio.find((p: any) => String(p.id) === String(propertyId));
    if (!target) return c.json({ success: false, error: 'Property not found.' }, 404);
    const paths = (Array.isArray(target.media) ? target.media : []).map((m: any) => m.path).filter(Boolean);
    if (paths.length) { try { await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove(paths); } catch (rmErr: any) { console.log('Property media cleanup skipped:', rmErr?.message || rmErr); } }
    await kv.set(key, portfolio.filter((p: any) => String(p.id) !== String(propertyId)));
    return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete property.' }, 500); }
});

// Turn an AI condition report's issues into maintenance work orders that appear
// in the landlord's Maintenance tab (scoped via landlordEmail).
rentalRouter.post('/make-server-3eae23a6/landlord/properties/:id/create-work-orders', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to create work orders.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const propertyId = c.req.param('id');
    const portfolio = (await kv.get(landlordPortfolioKey(actor.user.email)) as any[]) || [];
    const property = portfolio.find((p: any) => String(p.id) === String(propertyId));
    if (!property) return c.json({ success: false, error: 'Property not found.' }, 404);
    const issues = Array.isArray(property.aiCondition?.issues) ? property.aiCondition.issues : [];
    if (issues.length === 0) return c.json({ success: false, error: 'No AI-detected issues to convert. Run an assessment first.' }, 400);

    const sevToPriority: Record<string, string> = { high: 'urgent', medium: 'high', low: 'low' };
    const created: any[] = [];
    const now = new Date().toISOString();
    for (const iss of issues) {
      const title = `${iss.area || 'Issue'} — ${property.name}`.slice(0, 200);
      const record = {
        id: `wr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
        title, project_name: title,
        description: String(iss.description || '').slice(0, 4000),
        priority: sevToPriority[String(iss.severity || 'low').toLowerCase()] || 'medium',
        category: 'ai-inspection', unit: property.address || '', address: property.address || '',
        client_email: email, clientEmail: email,
        client_name: String(actor.user.user_metadata?.full_name || actor.user.user_metadata?.name || ''),
        user_id: actor.user.id, landlordEmail: email, ownerEmail: email,
        type: 'landlord', source: 'ai-condition-report', propertyId: property.id,
        status: 'pending', attachments: [], created_at: now, updated_at: now,
      };
      await persistWorkRequest(record);
      created.push(record);
    }
    return c.json({ success: true, created: created.length, workRequests: created.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to create work orders.' }, 500); }
});

// Create a single maintenance work request from a unit-turnover checklist.
rentalRouter.post('/make-server-3eae23a6/landlord/turnover-request', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to create a work request.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const body = stripBase64(await c.req.json().catch(() => ({})));
    const items = Array.isArray(body.items) ? body.items.filter((i: any) => i && i.label) : [];
    if (items.length === 0) return c.json({ success: false, error: 'Select at least one turnover item.' }, 400);
    const unit = String(body.unit || '').trim().slice(0, 160);
    const address = String(body.address || '').trim().slice(0, 300);
    const propertyName = String(body.propertyName || '').trim().slice(0, 200);
    const priority = ['low', 'medium', 'high', 'urgent'].includes(String(body.priority)) ? String(body.priority) : 'medium';
    const notes = String(body.notes || '').trim().slice(0, 4000);

    // Group items by category for a readable description.
    const byCat: Record<string, string[]> = {};
    for (const it of items) { const cat = String(it.category || 'General'); (byCat[cat] ||= []).push(String(it.label)); }
    const lines = Object.entries(byCat).map(([cat, labels]) => `${cat}:\n${labels.map(l => `  • ${l}`).join('\n')}`);
    const description = `Unit turnover scope (${items.length} item${items.length === 1 ? '' : 's'}):\n\n${lines.join('\n\n')}${notes ? `\n\nNotes:\n${notes}` : ''}`;
    const titleLoc = unit || propertyName || address || 'Unit';
    const title = `Unit Turnover — ${titleLoc}`.slice(0, 200);
    const now = new Date().toISOString();
    const record = {
      id: `wr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      title, project_name: title, description, priority,
      category: 'turnover', unit: unit || address, address,
      client_email: email, clientEmail: email,
      client_name: String(actor.user.user_metadata?.full_name || actor.user.user_metadata?.name || ''),
      user_id: actor.user.id, landlordEmail: email, ownerEmail: email,
      type: 'landlord', source: 'turnover-checklist',
      propertyId: body.propertyId || '', turnoverItems: items,
      status: 'pending', attachments: [], created_at: now, updated_at: now,
    };
    await persistWorkRequest(record);
    return c.json({ success: true, workRequest: stripBase64(record) }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to create the turnover work request.' }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT WORK REQUESTS — the tenant sub-portal submits maintenance requests here.
// Each request is stamped with the tenant's landlord (resolved from the
// `tenant_landlord:${email}` mapping the landlord created) so it appears in the
// landlord's existing Maintenance tab via `/landlord/work-requests`.
// ─────────────────────────────────────────────────────────────────────────────
rentalRouter.get('/make-server-3eae23a6/tenant/work-requests', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to view your work requests.' }, 401);
    const all = await readWorkRequests();
    const scoped = all.filter((record: any) => ownsWorkRequest(record, user));
    return c.json({ success: true, workRequests: scoped.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load your work requests.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/tenant/work-requests', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in before submitting a request.' }, 401);
    const email = String(user.email).toLowerCase();
    const body = await c.req.parseBody();
    const title = String(body.title || '').trim().slice(0, 200);
    if (!title) return c.json({ success: false, error: 'A request title is required.' }, 400);
    const description = String(body.description || '').trim().slice(0, 4000);
    const priority = ['low', 'medium', 'high', 'urgent'].includes(String(body.priority)) ? String(body.priority) : 'medium';
    const category = String(body.category || 'general').trim().slice(0, 80);
    const unit = String(body.unit || '').trim().slice(0, 160);
    const address = String(body.address || '').trim().slice(0, 300);

    // Resolve the tenant's landlord so the request lands in their Maintenance tab.
    const mapping = await kv.get(`tenant_landlord:${email}`) as any;
    const landlordEmail = mapping?.landlordEmail ? String(mapping.landlordEmail).toLowerCase() : '';

    // Preserve any attached photos/videos in a private bucket (best-effort).
    const attachments: any[] = [];
    try {
      const files = Object.keys(body).filter(k => k.startsWith('attachment_')).map(k => body[k]).filter((f): f is File => f instanceof File);
      if (files.length) {
        const bucket = 'make-57095a78-tenant-media';
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some((item: any) => item.name === bucket)) {
          const created = await supabase.storage.createBucket(bucket, { public: false });
          if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) throw created.error;
        }
        for (const file of files.slice(0, 5)) {
          if (file.size > 25 * 1024 * 1024) continue;
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'attachment';
          const path = `${email}/${crypto.randomUUID()}-${safeName}`;
          const upload = await supabase.storage.from(bucket).upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
          if (!upload.error) attachments.push({ name: file.name, bucket, path, contentType: file.type || '' });
        }
      }
    } catch (attachErr: any) { console.log('Tenant attachment upload skipped:', attachErr?.message || attachErr); }

    const now = new Date().toISOString();
    const record = {
      id: `wr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      title, project_name: title, description, priority, category,
      unit, address, client_email: email, clientEmail: email,
      client_name: String(user.user_metadata?.full_name || user.user_metadata?.name || ''),
      user_id: user.id, landlordEmail, type: 'landlord', source: 'tenant-portal',
      status: 'pending', attachments, created_at: now, updated_at: now,
    };
    await persistWorkRequest(record);
    // Notify the landlord that a new maintenance request came in.
    if (landlordEmail) {
      const who = record.client_name || email;
      notifyRecipient(landlordEmail, 'work_request', {
        subject: `🔧 New work request from ${who}`,
        text: `${who} submitted a maintenance request${unit ? ` for Unit ${unit}` : ''}.\n\nTitle: ${title}\nPriority: ${priority}\n${description ? `\n${description}\n` : ''}\nOpen your Landlord portal to review and dispatch it.`,
        sms: `New work request from ${who}${unit ? ` (Unit ${unit})` : ''}: "${title}" [${priority}]. Review in your portal.`,
      }).catch(() => {});
    }
    return c.json({ success: true, workRequest: stripBase64(record) }, 201);
  } catch (error: any) { console.log('Tenant work request error:', error); return c.json({ success: false, error: error.message || 'Unable to submit your request.' }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// LEASES — landlords build a lease with the AI assistant or upload an existing
// document, then send it straight to a tenant's sub-portal. Leases are keyed to
// the tenant's email so the tenant portal resolves them by the logged-in user.
// ─────────────────────────────────────────────────────────────────────────────
const LEASE_BUCKET = 'make-57095a78-leases';
function leaseKey(id: string) { return `lease:${id}`; }
function landlordLeasesKey(email: string) { return `landlord_leases:${String(email).toLowerCase()}`; }
function tenantLeasesKey(email: string) { return `tenant_leases:${String(email).toLowerCase()}`; }

async function ensureLeaseBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((item: any) => item.name === LEASE_BUCKET)) {
    const created = await supabase.storage.createBucket(LEASE_BUCKET, { public: false });
    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) throw created.error;
  }
}

async function readLeasesFor(indexKey: string) {
  const ids = (await kv.get(indexKey) as string[]) || [];
  if (!ids.length) return [];
  const records = (await kv.mget(ids.map(leaseKey))) as any[] || [];
  return records.filter(Boolean).map((lease: any) => {
    const { storageBucket, storagePath, ...rest } = lease || {};
    return rest;
  });
}

// AI drafting — generate a lease body from structured details.
rentalRouter.post('/make-server-3eae23a6/landlord/leases/draft', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to draft a lease.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const details = await c.req.json().catch(() => ({}));
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return c.json({ success: false, error: 'AI drafting is not configured. Add an OpenAI API key.' }, 500);
    const prompt = `You are a residential lease drafting assistant. Draft a clear, well-structured residential lease agreement using the details below. Use plain, professional language with numbered sections (Parties, Premises, Term, Rent, Security Deposit, Utilities, Pets, Maintenance, Tenant Obligations, Landlord Obligations, Default, Governing Law, Signatures). Leave signature lines. Only output the lease text.\n\nDetails:\n${JSON.stringify(details, null, 2)}`;
    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4.1-mini', temperature: 0.3, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!aiResp.ok) { const errText = await aiResp.text(); console.log('Lease AI draft error:', errText); return c.json({ success: false, error: 'The AI assistant could not draft the lease. Please try again.' }, 502); }
    const aiJson = await aiResp.json();
    const draft = aiJson?.choices?.[0]?.message?.content?.trim() || '';
    if (!draft) return c.json({ success: false, error: 'The AI assistant returned an empty draft. Please try again.' }, 502);
    return c.json({ success: true, draft });
  } catch (error: any) { console.log('Lease draft error:', error); return c.json({ success: false, error: error.message || 'Unable to draft the lease.' }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// MARKET RENT — live area rental rates for a property address. Uses the RentCast
// API (real listing/AVM data) as the primary source and grounds an AI summary in
// those live numbers. Falls back to a pure AI estimate if RentCast is unavailable.
// Results are cached per-address for 7 days and auto-refresh when stale (or when
// the landlord forces a refresh) so the widget stays current without re-billing.
// ─────────────────────────────────────────────────────────────────────────────
const MARKET_RENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function marketRentKey(address: string) { return `market_rent:${address.toLowerCase().replace(/\s+/g, ' ').trim()}`; }

// Query RentCast's long-term rent AVM for a live estimate + range + comparables.
async function fetchRentCast(address: string) {
  const key = Deno.env.get('RENTCAST_API_KEY');
  if (!key) return null;
  try {
    const url = `https://api.rentcast.io/v1/avm/rent/long-term?address=${encodeURIComponent(address)}`;
    const resp = await fetch(url, { headers: { 'X-Api-Key': key, accept: 'application/json' } });
    if (!resp.ok) { console.log('RentCast error:', resp.status, await resp.text().catch(() => '')); return null; }
    const data = await resp.json();
    if (!data || !Number.isFinite(Number(data.rent))) return null;
    return {
      rent: Number(data.rent),
      rentRangeLow: Number(data.rentRangeLow) || undefined,
      rentRangeHigh: Number(data.rentRangeHigh) || undefined,
      comparableCount: Array.isArray(data.comparables) ? data.comparables.length : undefined,
    };
  } catch (error: any) { console.log('RentCast fetch failed:', error?.message || error); return null; }
}

rentalRouter.post('/make-server-3eae23a6/landlord/market-rent', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view market rents.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const address = String(body.address || '').trim();
    const forceRefresh = Boolean(body.forceRefresh);
    if (!address || address.length < 5) return c.json({ success: false, error: 'Enter a full property address.' }, 400);

    const cacheKey = marketRentKey(address);
    const cached = await kv.get(cacheKey) as any;
    if (cached && !forceRefresh && cached.generatedAt && (Date.now() - new Date(cached.generatedAt).getTime()) < MARKET_RENT_TTL_MS) {
      return c.json({ success: true, estimate: cached, cached: true });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return c.json({ success: false, error: 'Market rent estimates are not configured.' }, 500);

    // 1) Pull live data from RentCast (if configured).
    const live = await fetchRentCast(address);

    // 2) Ground the AI response in the live figure when we have it.
    const liveContext = live
      ? `LIVE RENTCAST DATA for this exact address (use as ground truth; build the "typical" rent for the matching unit type around this number): estimated rent $${live.rent}/mo${live.rentRangeLow && live.rentRangeHigh ? `, range $${live.rentRangeLow}–$${live.rentRangeHigh}` : ''}${live.comparableCount ? `, based on ${live.comparableCount} comparable listings` : ''}.`
      : 'No live API data available — use your own market knowledge for a careful estimate.';
    const prompt = `You are a rental market analyst. For the area around "${address}", report CURRENT market rental rates for ${new Date().getFullYear()}.
${liveContext}
Respond ONLY with valid JSON in exactly this shape:
{
  "area": "City, State",
  "currency": "USD",
  "byType": [
    {"type": "Studio", "low": 0, "typical": 0, "high": 0},
    {"type": "1 Bed", "low": 0, "typical": 0, "high": 0},
    {"type": "2 Bed", "low": 0, "typical": 0, "high": 0},
    {"type": "3 Bed", "low": 0, "typical": 0, "high": 0}
  ],
  "pricePerSqFt": 0.0,
  "yoyTrend": "e.g. +3.2% year over year",
  "demand": "Low | Moderate | High",
  "summary": "2-3 sentence summary of the local rental market and what a landlord can realistically charge.",
  "tips": ["short actionable pricing tip", "another tip"]
}
Return realistic monthly rent numbers as integers. Do not include any text outside the JSON.`;
    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4.1-mini', temperature: 0.2, max_tokens: 900, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!aiResp.ok) { const errText = await aiResp.text(); console.log('Market rent AI error:', errText); return c.json({ success: false, error: 'Unable to fetch market rates right now. Please try again.' }, 502); }
    const aiJson = await aiResp.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content || '{}'); }
    catch (_e) { return c.json({ success: false, error: 'The market data was malformed. Please try again.' }, 502); }

    const estimate = {
      ...parsed,
      address,
      source: live ? 'rentcast+ai' : 'ai',
      live: live || null,
      generatedAt: new Date().toISOString(),
    };
    await kv.set(cacheKey, estimate);
    return c.json({ success: true, estimate, cached: false });
  } catch (error: any) { console.log('Market rent error:', error); return c.json({ success: false, error: error.message || 'Unable to fetch market rates.' }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// RENT PAYMENTS via STRIPE CONNECT — each landlord onboards their own connected
// Stripe (Express) account and tenant rent flows directly to them via destination
// charges on the platform account. Payments are recorded for both the tenant's
// history and the landlord's Financials tab (ownerEmail = landlord).
// ─────────────────────────────────────────────────────────────────────────────
const STRIPE_API = 'https://api.stripe.com/v1';
function landlordStripeKey(email: string) { return `landlord_stripe:${String(email).toLowerCase()}`; }
function rentPaymentKey(id: string) { return `payment:${id}`; }
function tenantRentIndexKey(email: string) { return `rent_payments_tenant:${String(email).toLowerCase()}`; }

async function stripeReq(path: string, params?: URLSearchParams, method: 'POST' | 'GET' | 'DELETE' = 'POST', connectedAccount?: string, idempotencyKey?: string) {
  const key = stripeKeyFor('services');
  if (!key) throw new Error('Stripe is not configured on the platform account.');
  const headers: Record<string, string> = { Authorization: `Basic ${btoa(`${key}:`)}` };
  if (method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded';
  // Stripe's own guard against a double charge or a double refund: the same key
  // replays the first result instead of acting again. Optional, and supplied
  // where a retry would move money twice.
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  // When a connected account id is supplied, the request runs AS that account
  // (Stripe Connect "direct charge"). Funds settle directly to the landlord —
  // the platform is never the merchant of record and never holds the money.
  if (connectedAccount) headers['Stripe-Account'] = connectedAccount;
  const resp = await fetch(`${STRIPE_API}/${path}`, {
    method,
    headers,
    body: method === 'POST' && params ? params.toString() : undefined,
  });
  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(payload?.error?.message || 'Stripe request failed.');
  return payload;
}

// Adds ACH (us_bank_account) alongside card to a Checkout params object so
// tenants can pay rent by low-fee bank transfer. Kept in one place so every
// rent flow stays consistent.
function addRentPaymentMethods(params: URLSearchParams, opts?: { includeAch?: boolean }) {
  params.set('payment_method_types[]', 'card');
  if (opts?.includeAch !== false) params.append('payment_method_types[]', 'us_bank_account');
  return params;
}

// Landlord: begin (or resume) Stripe Connect onboarding — returns onboarding URL.
rentalRouter.post('/make-server-3eae23a6/landlord/stripe/connect', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to connect Stripe.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const now = new Date().toISOString();
    let rec = await kv.get(landlordStripeKey(email)) as any;
    if (!rec?.accountId) {
      const acct = await stripeReq('accounts', new URLSearchParams({
        type: 'express', email,
        'capabilities[transfers][requested]': 'true',
        'capabilities[card_payments][requested]': 'true',
        // ACH direct-debit so tenants can pay rent by bank transfer (low fees).
        'capabilities[us_bank_account_ach_payments][requested]': 'true',
        'business_type': 'individual',
      }));
      rec = { accountId: acct.id, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, createdAt: now, updatedAt: now };
      await kv.set(landlordStripeKey(email), rec);
    }
    const appUrl = APP_URL;
    const link = await stripeReq('account_links', new URLSearchParams({
      account: rec.accountId,
      refresh_url: `${appUrl}/landlord-portal?tab=settings&stripe=refresh`,
      return_url: `${appUrl}/landlord-portal?tab=settings&stripe=connected`,
      type: 'account_onboarding',
    }));
    return c.json({ success: true, url: link.url, accountId: rec.accountId });
  } catch (error: any) { console.log('Stripe connect error:', error); return c.json({ success: false, error: error.message || 'Unable to start Stripe onboarding.' }, 500); }
});

// Landlord: current Stripe Connect status (live from Stripe).
rentalRouter.get('/make-server-3eae23a6/landlord/stripe/status', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view Stripe status.' }, 401);
    const email = String(actor.user.email).toLowerCase();
    const rec = await kv.get(landlordStripeKey(email)) as any;
    if (!rec?.accountId) return c.json({ success: true, connected: false, chargesEnabled: false });
    const acct = await stripeReq(`accounts/${rec.accountId}`, undefined, 'GET');
    const updated = { ...rec, chargesEnabled: !!acct.charges_enabled, payoutsEnabled: !!acct.payouts_enabled, detailsSubmitted: !!acct.details_submitted, updatedAt: new Date().toISOString() };
    await kv.set(landlordStripeKey(email), updated);
    return c.json({ success: true, connected: true, chargesEnabled: updated.chargesEnabled, payoutsEnabled: updated.payoutsEnabled, detailsSubmitted: updated.detailsSubmitted });
  } catch (error: any) { console.log('Stripe status error:', error); return c.json({ success: false, error: error.message || 'Unable to check Stripe status.' }, 500); }
});

// Tenant: rent summary — amount due, whether landlord can accept online rent, history.
rentalRouter.get('/make-server-3eae23a6/tenant/rent', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to view rent details.' }, 401);
    const email = String(user.email).toLowerCase();
    const mapping = await kv.get(`tenant_landlord:${email}`) as any;
    const landlordEmail = mapping?.landlordEmail ? String(mapping.landlordEmail).toLowerCase() : '';
    let rent = 0; let unit = String(mapping?.unit || '');
    if (landlordEmail) {
      const roster = (await kv.get(landlordTenantsKey(landlordEmail)) as any[]) || [];
      const me = roster.find((t: any) => String(t.email || '').toLowerCase() === email);
      if (me) { rent = money(me.rent); unit = String(me.unit || unit); }
    }
    let landlordAcceptsOnline = false;
    if (landlordEmail) {
      const rec = await kv.get(landlordStripeKey(landlordEmail)) as any;
      landlordAcceptsOnline = !!rec?.chargesEnabled;
    }
    const ids = (await kv.get(tenantRentIndexKey(email)) as string[]) || [];
    const history = ids.length ? ((await kv.mget(ids.map(rentPaymentKey))) as any[] || []).filter(Boolean) : [];
    return c.json({ success: true, rent, unit, landlordEmail, landlordAcceptsOnline, history });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load rent details.' }, 500); }
});

// Tenant: start a rent payment — destination charge to the landlord's connected account.
rentalRouter.post('/make-server-3eae23a6/tenant/rent/pay', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to pay rent.' }, 401);
    const email = String(user.email).toLowerCase();
    const body = await c.req.json().catch(() => ({}));
    const mapping = await kv.get(`tenant_landlord:${email}`) as any;
    const landlordEmail = mapping?.landlordEmail ? String(mapping.landlordEmail).toLowerCase() : '';
    if (!landlordEmail) return c.json({ success: false, error: 'No landlord is linked to your account yet.' }, 400);

    const roster = (await kv.get(landlordTenantsKey(landlordEmail)) as any[]) || [];
    const me = roster.find((t: any) => String(t.email || '').toLowerCase() === email);
    const amount = money(body.amount ?? me?.rent);
    if (amount <= 0) return c.json({ success: false, error: 'A positive rent amount is required.' }, 400);

    const stripeRec = await kv.get(landlordStripeKey(landlordEmail)) as any;
    if (!stripeRec?.accountId || !stripeRec?.chargesEnabled) {
      return c.json({ success: false, error: 'Your landlord has not finished setting up online rent collection yet.' }, 400);
    }

    const paymentId = crypto.randomUUID();
    const appUrl = APP_URL;
    // Optional platform fee (percent) — set RENT_PLATFORM_FEE_PERCENT to enable.
    const feePercent = Number(Deno.env.get('RENT_PLATFORM_FEE_PERCENT') || '0');
    const applicationFee = feePercent > 0 ? Math.round(amount * 100 * (feePercent / 100)) : 0;

    const params = new URLSearchParams({
      mode: 'payment', customer_email: email,
      success_url: `${appUrl}/tenant-portal?tab=rent&rent_payment=${paymentId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/tenant-portal?tab=rent&rent_cancelled=1`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': `Rent${me?.unit ? ` · Unit ${me.unit}` : ''}`,
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
      'line_items[0][quantity]': '1',
      'metadata[rent_payment_id]': paymentId,
      'metadata[tenant_email]': email,
      'metadata[landlord_email]': landlordEmail,
    });
    addRentPaymentMethods(params, { includeAch: body.method !== 'card' });
    // DIRECT CHARGE: created on the landlord's connected account, so the money
    // settles straight to them. Any platform fee (default 0) is collected via
    // application_fee_amount rather than routing funds through the platform.
    if (applicationFee > 0) params.set('payment_intent_data[application_fee_amount]', String(applicationFee));

    const session = await stripeReq('checkout/sessions', params, 'POST', stripeRec.accountId);
    const now = new Date().toISOString();
    const payment = {
      id: paymentId, type: 'rent', amount, status: 'pending_confirmation',
      customerEmail: email, ownerEmail: landlordEmail, landlordEmail,
      tenantName: me?.name || mapping?.tenantName || '', unit: me?.unit || mapping?.unit || '',
      stripeCheckoutSessionId: session.id, connectedAccountId: stripeRec.accountId,
      createdAt: now, updatedAt: now,
    };
    await kv.set(rentPaymentKey(paymentId), payment);
    const idx = (await kv.get(tenantRentIndexKey(email)) as string[]) || [];
    await kv.set(tenantRentIndexKey(email), [paymentId, ...idx]);
    return c.json({ success: true, paymentId, checkoutUrl: session.url });
  } catch (error: any) { console.log('Rent pay error:', error); return c.json({ success: false, error: error.message || 'Unable to start rent payment.' }, 500); }
});

// Tenant: confirm a rent payment after returning from Stripe Checkout.
rentalRouter.post('/make-server-3eae23a6/tenant/rent/confirm', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to confirm payment.' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const paymentId = String(body.paymentId || '');
    const payment = await kv.get(rentPaymentKey(paymentId)) as any;
    if (!payment) return c.json({ success: false, error: 'Payment not found.' }, 404);
    if (String(payment.customerEmail || '').toLowerCase() !== String(user.email).toLowerCase()) return c.json({ success: false, error: 'This payment is not yours.' }, 403);
    if (payment.status === 'paid') return c.json({ success: true, payment });
    const session = await stripeReq(`checkout/sessions/${encodeURIComponent(payment.stripeCheckoutSessionId)}`, undefined, 'GET', payment.connectedAccountId || undefined);
    // ACH (bank transfer) settles asynchronously: Stripe reports 'processing'
    // for a few business days before it becomes 'paid'. Surface that state so
    // the tenant sees "processing" instead of a scary failure.
    const paid = session?.payment_status === 'paid' || session?.payment_status === 'no_payment_required';
    const processing = !paid && session?.payment_status === 'processing';
    const nextStatus = paid ? 'paid' : processing ? 'processing' : 'pending_confirmation';
    const updated = { ...payment, status: nextStatus, paidAt: paid ? new Date().toISOString() : payment.paidAt, stripePaymentIntentId: session?.payment_intent || payment.stripePaymentIntentId, updatedAt: new Date().toISOString() };
    await kv.set(rentPaymentKey(paymentId), updated);
    // Notify the landlord when a rent payment clears (only fire once, on first paid).
    if (paid && payment.status !== 'paid' && updated.landlordEmail) {
      const who = updated.tenantName || updated.customerEmail || 'A tenant';
      const amt = `$${Number(updated.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      notifyRecipient(String(updated.landlordEmail), 'payment', {
        subject: `💰 Rent payment received — ${amt}`,
        text: `${who}${updated.unit ? ` (Unit ${updated.unit})` : ''} paid ${amt} in rent.\n\nOpen your Landlord portal to view the payment.`,
        sms: `Rent received: ${amt} from ${who}${updated.unit ? ` (Unit ${updated.unit})` : ''}.`,
      }).catch(() => {});
    }
    return c.json({ success: true, payment: updated });
  } catch (error: any) { console.log('Rent confirm error:', error); return c.json({ success: false, error: error.message || 'Unable to confirm payment.' }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// LANDLORD OPERATIONS — rent collection, recurring auto-pay, dashboard metrics,
// lease renewals, tenant screening / applications, and a document vault. These
// build on the tenant-initiated rent flow above and reuse the same Stripe
// Connect account.
// ─────────────────────────────────────────────────────────────────────────────
function landlordRentIndexKey(email: string) { return `rent_payments_landlord:${String(email).toLowerCase()}`; }
function landlordApplicationsKey(email: string) { return `landlord_applications:${String(email).toLowerCase()}`; }
function landlordScreeningKey(email: string) { return `landlord_screening:${String(email).toLowerCase()}`; }
function screeningTokenKey(token: string) { return `screening_token:${token}`; }
function landlordDocsKey(email: string) { return `landlord_documents:${String(email).toLowerCase()}`; }

// ── The public application link ──────────────────────────────────────────────
//
// The rules themselves — expiry, revocation, the submission caps and the
// consent wording — live in `screeningLink.ts` so they can be tested. What is
// left here is the storage around them.
async function mintScreeningToken(email: string) {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const now = Date.now();
  await kv.set(screeningTokenKey(token), {
    landlordEmail: email,
    createdAt: new Date(now).toISOString(),
    expiresAt: screeningLinkExpiry(now),
    revokedAt: null,
  });
  await kv.set(landlordScreeningKey(email), token);
  return token;
}

// Loads a token and says what state it is in. `meta` comes back even when the
// state is bad, so a caller can revoke an already-expired token or report when
// it lapsed; only `ok` means the link may be used.
async function loadScreeningToken(token: string): Promise<{ state: 'ok' | 'missing' | 'expired' | 'revoked'; meta: any }> {
  const key = screeningTokenKey(String(token || ''));
  const meta = await kv.get(key) as any;
  const state = screeningLinkState(meta);
  if (state === 'missing') return { state: 'missing', meta: null };
  if (state === 'grandfather') {
    // A token minted before expiries existed. Stamped once, on first sight,
    // rather than treated as expired — a live advert must not break because we
    // deployed.
    const patched = { ...meta, expiresAt: screeningLinkExpiry() };
    await kv.set(key, patched);
    return { state: 'ok', meta: patched };
  }
  return { state, meta };
}

// Landlord: charge a tenant rent (or a one-off fee). Creates a pending payment
// and a Stripe Checkout session (destination charge to the landlord's connected
// account), then emails the tenant a secure pay link. `channel` distinguishes an
// online charge from a manually-recorded cash/check payment.
rentalRouter.post('/make-server-3eae23a6/landlord/tenants/:id/charge', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to charge a tenant.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const landlordEmail = String(actor.user.email).toLowerCase();
    const roster = (await kv.get(landlordTenantsKey(landlordEmail)) as any[]) || [];
    const tenant = roster.find((t: any) => t.id === c.req.param('id'));
    if (!tenant) return c.json({ success: false, error: 'Tenant not found on your roster.' }, 404);
    const tenantEmail = String(tenant.email || '').trim().toLowerCase();

    const body = await c.req.json().catch(() => ({}));
    const amount = money(body.amount ?? tenant.rent);
    const lateFee = money(body.lateFee ?? 0);
    const total = Math.round((amount + lateFee) * 100) / 100;
    if (total <= 0) return c.json({ success: false, error: 'A positive charge amount is required.' }, 400);
    const memo = String(body.memo || '').slice(0, 300);
    const dueDate = String(body.dueDate || '').slice(0, 40);
    const chargeType = String(body.chargeType || 'rent'); // rent | fee | deposit
    const recurring = !!body.recurring;

    const stripeRec = await kv.get(landlordStripeKey(landlordEmail)) as any;
    const canCharge = !!stripeRec?.accountId && !!stripeRec?.chargesEnabled;

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const appUrl = APP_URL;
    let checkoutUrl = '';
    let stripeCheckoutSessionId = '';

    if (canCharge && tenantEmail) {
      const feePercent = Number(Deno.env.get('RENT_PLATFORM_FEE_PERCENT') || '0');
      const applicationFee = feePercent > 0 ? Math.round(total * 100 * (feePercent / 100)) : 0;
      const params = new URLSearchParams({
        mode: 'payment', customer_email: tenantEmail,
        success_url: `${appUrl}/tenant-portal?tab=rent&rent_payment=${paymentId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/tenant-portal?tab=rent&rent_cancelled=1`,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `${chargeType === 'rent' ? 'Rent' : chargeType === 'deposit' ? 'Deposit' : 'Charge'}${tenant.unit ? ` · Unit ${tenant.unit}` : ''}${memo ? ` — ${memo}` : ''}`,
        'line_items[0][price_data][unit_amount]': String(Math.round(total * 100)),
        'line_items[0][quantity]': '1',
        'metadata[rent_payment_id]': paymentId,
        'metadata[tenant_email]': tenantEmail,
        'metadata[landlord_email]': landlordEmail,
      });
      // Deposits typically need instant funds, so allow card-only if requested.
      addRentPaymentMethods(params, { includeAch: body.method !== 'card' });
      if (applicationFee > 0) params.set('payment_intent_data[application_fee_amount]', String(applicationFee));
      // Direct charge on the landlord's connected account — funds go to them.
      const session = await stripeReq('checkout/sessions', params, 'POST', stripeRec.accountId);
      checkoutUrl = session.url;
      stripeCheckoutSessionId = session.id;
    }

    const payment: any = {
      id: paymentId, type: 'rent', chargeType, amount: total, baseAmount: amount, lateFee,
      status: 'pending', channel: canCharge && tenantEmail ? 'online' : 'invoice',
      customerEmail: tenantEmail, ownerEmail: landlordEmail, landlordEmail, tenantId: tenant.id,
      tenantName: tenant.name || '', unit: tenant.unit || '', memo, dueDate, recurring,
      stripeCheckoutSessionId,
      connectedAccountId: canCharge ? stripeRec.accountId : '', checkoutUrl,
      createdAt: now, updatedAt: now, createdBy: 'landlord',
    };
    await kv.set(rentPaymentKey(paymentId), payment);
    const lidx = (await kv.get(landlordRentIndexKey(landlordEmail)) as string[]) || [];
    await kv.set(landlordRentIndexKey(landlordEmail), [paymentId, ...lidx]);
    if (tenantEmail) {
      const tidx = (await kv.get(tenantRentIndexKey(tenantEmail)) as string[]) || [];
      await kv.set(tenantRentIndexKey(tenantEmail), [paymentId, ...tidx]);
    }

    // Email the tenant a pay link (or a heads-up if online charging isn't set up).
    if (tenantEmail) {
      const amt = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      if (checkoutUrl) {
        notifyRecipient(tenantEmail, 'payment', {
          subject: `Rent due: ${amt}${tenant.unit ? ` · Unit ${tenant.unit}` : ''}`,
          text: `Your landlord has requested a rent payment of ${amt}${dueDate ? ` due ${dueDate}` : ''}${memo ? `\n\nNote: ${memo}` : ''}.\n\nPay securely here:\n${checkoutUrl}`,
          sms: `Rent due ${amt}${dueDate ? ` by ${dueDate}` : ''}. Pay: ${checkoutUrl}`,
        }).catch(() => {});
      } else {
        notifyRecipient(tenantEmail, 'payment', {
          subject: `Rent due: ${amt}${tenant.unit ? ` · Unit ${tenant.unit}` : ''}`,
          text: `Your landlord has recorded a rent charge of ${amt}${dueDate ? ` due ${dueDate}` : ''}${memo ? `\n\nNote: ${memo}` : ''}. Please arrange payment directly with your landlord.`,
        }).catch(() => {});
      }
    }
    return c.json({ success: true, payment, checkoutUrl, onlineEnabled: canCharge });
  } catch (error: any) { console.log('Landlord charge error:', error); return c.json({ success: false, error: error.message || 'Unable to charge the tenant.' }, 500); }
});

// Landlord: list all rent charges/payments they've issued. Returns newest first.
rentalRouter.get('/make-server-3eae23a6/landlord/rent', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view rent activity.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const ids = (await kv.get(landlordRentIndexKey(email)) as string[]) || [];
    let payments = ids.length ? ((await kv.mget(ids.map(rentPaymentKey))) as any[] || []).filter(Boolean) : [];
    payments.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return c.json({ success: true, payments });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load rent activity.' }, 500); }
});

// Landlord: mark a charge paid manually (cash/check) or reconcile an online one.
rentalRouter.patch('/make-server-3eae23a6/landlord/rent/:id/mark-paid', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to update a payment.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const payment = await kv.get(rentPaymentKey(c.req.param('id'))) as any;
    if (!payment) return c.json({ success: false, error: 'Payment not found.' }, 404);
    if (String(payment.landlordEmail || '').toLowerCase() !== email && !actor.admin) return c.json({ success: false, error: 'This payment is not yours.' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const method = String(body.method || 'cash'); // cash | check | other
    const now = new Date().toISOString();
    const updated = { ...payment, status: 'paid', paidAt: now, updatedAt: now, channel: payment.channel === 'online' ? payment.channel : 'manual', paymentMethod: method };
    await kv.set(rentPaymentKey(payment.id), updated);
    return c.json({ success: true, payment: updated });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update the payment.' }, 500); }
});

// ── Recurring auto-pay (Stripe subscriptions) ────────────────────────────────
// Landlord invites a tenant to enroll; Stripe then charges rent every month.
// Status is reconciled on demand (no webhook required for the prototype).
rentalRouter.post('/make-server-3eae23a6/landlord/tenants/:id/autopay', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to set up auto-pay.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const landlordEmail = String(actor.user.email).toLowerCase();
    const key = landlordTenantsKey(landlordEmail);
    const roster = (await kv.get(key) as any[]) || [];
    const idx = roster.findIndex((t: any) => t.id === c.req.param('id'));
    if (idx < 0) return c.json({ success: false, error: 'Tenant not found on your roster.' }, 404);
    const tenant = roster[idx];
    const tenantEmail = String(tenant.email || '').trim().toLowerCase();
    if (!tenantEmail) return c.json({ success: false, error: 'Add an email to this tenant before enabling auto-pay.' }, 400);

    const stripeRec = await kv.get(landlordStripeKey(landlordEmail)) as any;
    if (!stripeRec?.accountId || !stripeRec?.chargesEnabled) return c.json({ success: false, error: 'Finish connecting Stripe before enabling auto-pay.' }, 400);

    const body = await c.req.json().catch(() => ({}));
    const amount = money(body.amount ?? tenant.rent);
    if (amount <= 0) return c.json({ success: false, error: 'A positive rent amount is required.' }, 400);
    const dayOfMonth = Math.min(28, Math.max(1, Number(body.dayOfMonth) || 1));

    const appUrl = APP_URL;
    const feePercent = Number(Deno.env.get('RENT_PLATFORM_FEE_PERCENT') || '0');
    const params = new URLSearchParams({
      mode: 'subscription', customer_email: tenantEmail,
      success_url: `${appUrl}/tenant-portal?tab=rent&autopay=active&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/tenant-portal?tab=rent&autopay=cancelled`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': `Monthly Rent${tenant.unit ? ` · Unit ${tenant.unit}` : ''}`,
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
      'line_items[0][quantity]': '1',
      'metadata[tenant_email]': tenantEmail, 'metadata[landlord_email]': landlordEmail, 'metadata[autopay]': 'true',
    });
    // Recurring rent can be auto-drafted from a bank account (ACH) or card.
    addRentPaymentMethods(params, { includeAch: body.method !== 'card' });
    if (feePercent > 0) params.set('subscription_data[application_fee_percent]', String(feePercent));
    // Direct-charge subscription on the landlord's connected account.
    const session = await stripeReq('checkout/sessions', params, 'POST', stripeRec.accountId);

    const now = new Date().toISOString();
    roster[idx] = { ...tenant, autopay: { status: 'pending', amount, dayOfMonth, checkoutSessionId: session.id, setupUrl: session.url, subscriptionId: '', updatedAt: now } };
    await kv.set(key, roster);

    notifyRecipient(tenantEmail, 'payment', {
      subject: `Set up automatic rent payments${tenant.unit ? ` · Unit ${tenant.unit}` : ''}`,
      text: `Your landlord invited you to enroll in automatic monthly rent payments of $${money(amount)}.\n\nSet it up securely here (one time):\n${session.url}\n\nYour card will be charged automatically each month.`,
      sms: `Enroll in auto-pay for rent ($${money(amount)}/mo): ${session.url}`,
    }).catch(() => {});

    return c.json({ success: true, setupUrl: session.url, tenant: stripBase64(roster[idx]) });
  } catch (error: any) { console.log('Autopay setup error:', error); return c.json({ success: false, error: error.message || 'Unable to set up auto-pay.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/landlord/tenants/:id/autopay/status', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to check auto-pay.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const key = landlordTenantsKey(actor.user.email);
    const roster = (await kv.get(key) as any[]) || [];
    const idx = roster.findIndex((t: any) => t.id === c.req.param('id'));
    if (idx < 0) return c.json({ success: false, error: 'Tenant not found.' }, 404);
    const ap = roster[idx].autopay;
    if (!ap?.checkoutSessionId) return c.json({ success: true, tenant: stripBase64(roster[idx]) });
    // The subscription lives on the landlord's connected account (direct charge),
    // so every retrieval must be made AS that account.
    const apStripeRec = await kv.get(landlordStripeKey(actor.user.email)) as any;
    const apAccount = apStripeRec?.accountId || undefined;
    const session = await stripeReq(`checkout/sessions/${encodeURIComponent(ap.checkoutSessionId)}`, undefined, 'GET', apAccount);
    let status = ap.status; let subscriptionId = ap.subscriptionId || '';
    if (session?.subscription) {
      subscriptionId = session.subscription;
      const sub = await stripeReq(`subscriptions/${encodeURIComponent(subscriptionId)}`, undefined, 'GET', apAccount);
      status = ['active', 'trialing'].includes(sub?.status) ? 'active' : sub?.status === 'canceled' ? 'canceled' : 'pending';
    }
    roster[idx] = { ...roster[idx], autopay: { ...ap, status, subscriptionId, updatedAt: new Date().toISOString() } };
    await kv.set(key, roster);
    return c.json({ success: true, tenant: stripBase64(roster[idx]) });
  } catch (error: any) { console.log('Autopay status error:', error); return c.json({ success: false, error: error.message || 'Unable to check auto-pay status.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/landlord/tenants/:id/autopay/cancel', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to cancel auto-pay.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const key = landlordTenantsKey(actor.user.email);
    const roster = (await kv.get(key) as any[]) || [];
    const idx = roster.findIndex((t: any) => t.id === c.req.param('id'));
    if (idx < 0) return c.json({ success: false, error: 'Tenant not found.' }, 404);
    const ap = roster[idx].autopay;
    if (ap?.subscriptionId) {
      const cxStripeRec = await kv.get(landlordStripeKey(actor.user.email)) as any;
      try { await stripeReq(`subscriptions/${encodeURIComponent(ap.subscriptionId)}`, undefined, 'DELETE', cxStripeRec?.accountId || undefined); } catch (e) { console.log('Autopay cancel stripe error:', e); }
    }
    roster[idx] = { ...roster[idx], autopay: { ...(ap || {}), status: 'canceled', updatedAt: new Date().toISOString() } };
    await kv.set(key, roster);
    return c.json({ success: true, tenant: stripBase64(roster[idx]) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to cancel auto-pay.' }, 500); }
});

// Landlord: portfolio dashboard metrics — occupancy, rent roll, collected vs
// outstanding (current month), upcoming lease expirations, and rent-due alerts.
rentalRouter.get('/make-server-3eae23a6/landlord/dashboard', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your dashboard.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const tenants = (await kv.get(landlordTenantsKey(email)) as any[]) || [];
    const properties = (await kv.get(landlordPortfolioKey(email)) as any[]) || [];

    const totalUnits = properties.reduce((s: number, p: any) => s + Math.max(1, Number(p.units) || 0), 0) || tenants.length;
    const occupiedUnits = tenants.filter((t: any) => t.status !== 'pending').length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
    const monthlyRentRoll = tenants.reduce((s: number, t: any) => s + (Number(t.rent) || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const rentIds = (await kv.get(landlordRentIndexKey(email)) as string[]) || [];
    const payments = rentIds.length ? ((await kv.mget(rentIds.map(rentPaymentKey))) as any[] || []).filter(Boolean) : [];
    let collectedThisMonth = 0, outstanding = 0;
    for (const p of payments) {
      const created = new Date(p.createdAt || 0).getTime();
      if (p.status === 'paid' && new Date(p.paidAt || p.updatedAt || p.createdAt || 0).getTime() >= monthStart) collectedThisMonth += Number(p.amount) || 0;
      if (p.status !== 'paid' && created >= monthStart - 1000 * 60 * 60 * 24 * 40) outstanding += Number(p.amount) || 0;
    }

    const soon = now.getTime() + 1000 * 60 * 60 * 24 * 90;
    const leaseExpirations = tenants
      .filter((t: any) => t.leaseEnd)
      .map((t: any) => ({ tenantId: t.id, name: t.name, unit: t.unit, leaseEnd: t.leaseEnd, daysLeft: Math.ceil((new Date(t.leaseEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) }))
      .filter((t: any) => Number.isFinite(t.daysLeft) && new Date(t.leaseEnd).getTime() <= soon)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

    const rentDueAlerts = tenants.filter((t: any) => t.status === 'late').map((t: any) => ({ tenantId: t.id, name: t.name, unit: t.unit, rent: t.rent }));

    return c.json({
      success: true,
      metrics: {
        totalProperties: properties.length, totalUnits, occupiedUnits, vacantUnits, occupancyRate,
        totalTenants: tenants.length, monthlyRentRoll, collectedThisMonth, outstanding,
        leaseExpirations, rentDueAlerts,
      },
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load dashboard metrics.' }, 500); }
});

// Landlord: set/update a tenant's lease term dates (for renewal tracking).
rentalRouter.patch('/make-server-3eae23a6/landlord/tenants/:id/lease-terms', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to update lease terms.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const key = landlordTenantsKey(actor.user.email);
    const roster = (await kv.get(key) as any[]) || [];
    const idx = roster.findIndex((t: any) => t.id === c.req.param('id'));
    if (idx < 0) return c.json({ success: false, error: 'Tenant not found on your roster.' }, 404);
    const body = await c.req.json().catch(() => ({}));
    const now = new Date().toISOString();
    roster[idx] = {
      ...roster[idx],
      leaseStart: body.leaseStart ? String(body.leaseStart).slice(0, 40) : roster[idx].leaseStart || '',
      leaseEnd: body.leaseEnd ? String(body.leaseEnd).slice(0, 40) : roster[idx].leaseEnd || '',
      leaseTerm: body.leaseTerm ? String(body.leaseTerm).slice(0, 60) : roster[idx].leaseTerm || '',
      updatedAt: now,
    };
    await kv.set(key, roster);
    return c.json({ success: true, tenant: stripBase64(roster[idx]) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update lease terms.' }, 500); }
});

// Landlord: send a renewal offer to a tenant (email/SMS + records the offer).
rentalRouter.post('/make-server-3eae23a6/landlord/tenants/:id/renewal-offer', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to send a renewal.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const key = landlordTenantsKey(actor.user.email);
    const roster = (await kv.get(key) as any[]) || [];
    const idx = roster.findIndex((t: any) => t.id === c.req.param('id'));
    if (idx < 0) return c.json({ success: false, error: 'Tenant not found on your roster.' }, 404);
    const tenant = roster[idx];
    const body = await c.req.json().catch(() => ({}));
    const newRent = money(body.newRent ?? tenant.rent);
    const newTerm = String(body.newTerm || '12 months').slice(0, 60);
    const newEnd = String(body.newLeaseEnd || '').slice(0, 40);
    const message = String(body.message || '').slice(0, 1000);
    const now = new Date().toISOString();
    const offer = { newRent, newTerm, newLeaseEnd: newEnd, message, sentAt: now };
    roster[idx] = { ...tenant, renewalOffer: offer, updatedAt: now };
    await kv.set(key, roster);
    const tenantEmail = String(tenant.email || '').trim().toLowerCase();
    if (tenantEmail) {
      notifyRecipient(tenantEmail, 'message', {
        subject: `Lease renewal offer${tenant.unit ? ` · Unit ${tenant.unit}` : ''}`,
        text: `Your landlord has offered to renew your lease.\n\nNew term: ${newTerm}\nNew monthly rent: $${newRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}${newEnd ? `\nNew lease end: ${newEnd}` : ''}${message ? `\n\n${message}` : ''}\n\nPlease reach out to your landlord to accept or discuss.`,
        sms: `Lease renewal offer: ${newTerm} at $${newRent.toLocaleString()}/mo. Contact your landlord to confirm.`,
      }).catch(() => {});
    }
    return c.json({ success: true, tenant: stripBase64(roster[idx]) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to send the renewal offer.' }, 500); }
});

// Landlord: rental-application intake. GET returns applications + a shareable
// public application link; PATCH approves (→ creates a tenant, optionally
// provisioning a portal login in one click) or rejects.
rentalRouter.get('/make-server-3eae23a6/landlord/applications', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view applications.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const stored = await kv.get(landlordScreeningKey(email)) as string | null;

    // A landlord with no link at all gets one. A landlord whose link has expired
    // or been revoked does NOT get a silent replacement: minting one here would
    // undo the revoke they just asked for, on their next page load. They are
    // told the state and press the button.
    let token = stored;
    let link = stored ? await loadScreeningToken(stored) : { state: 'missing' as const, meta: null };
    if (!stored) {
      token = await mintScreeningToken(email);
      link = await loadScreeningToken(token);
    }

    const applications = (await kv.get(landlordApplicationsKey(email)) as any[]) || [];
    const active = link.state === 'ok';
    return c.json({
      success: true,
      applications,
      token: active ? token : '',
      applyUrl: active ? `${appUrl()}/apply?t=${token}` : '',
      link: {
        state: link.state,
        expiresAt: link.meta?.expiresAt || null,
        revokedAt: link.meta?.revokedAt || null,
      },
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load applications.' }, 500); }
});

// Landlord: rotate the public application link. The old token is revoked rather
// than deleted, so a prospect who follows the stale link is told it was replaced
// instead of meeting a dead page, and so the record of what was live when an
// application arrived survives.
rentalRouter.post('/make-server-3eae23a6/landlord/applications/link', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to manage your application link.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const previous = await kv.get(landlordScreeningKey(email)) as string | null;
    if (previous) {
      const old = await kv.get(screeningTokenKey(previous)) as any;
      // Only ever revoke a token that is this landlord's own.
      if (old?.landlordEmail === email && !old.revokedAt) {
        await kv.set(screeningTokenKey(previous), { ...old, revokedAt: new Date().toISOString() });
      }
    }
    const token = await mintScreeningToken(email);
    const link = await loadScreeningToken(token);
    return c.json({
      success: true,
      token,
      applyUrl: `${appUrl()}/apply?t=${token}`,
      link: { state: link.state, expiresAt: link.meta?.expiresAt || null, revokedAt: null },
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to rotate the link.' }, 500); }
});

// Landlord: turn the public application link off without issuing another.
rentalRouter.delete('/make-server-3eae23a6/landlord/applications/link', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to manage your application link.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const current = await kv.get(landlordScreeningKey(email)) as string | null;
    if (!current) return c.json({ success: true, link: { state: 'missing', expiresAt: null, revokedAt: null } });
    const meta = await kv.get(screeningTokenKey(current)) as any;
    if (meta?.landlordEmail !== email) return c.json({ success: false, error: 'That link is not yours.' }, 403);
    const revokedAt = meta.revokedAt || new Date().toISOString();
    await kv.set(screeningTokenKey(current), { ...meta, revokedAt });
    return c.json({ success: true, link: { state: 'revoked', expiresAt: meta.expiresAt || null, revokedAt } });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to turn off the link.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/landlord/applications', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to add an application.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const body = await c.req.json().catch(() => ({}));
    const app_ = buildApplicationRecord(body, 'landlord');
    if (!app_.name) return c.json({ success: false, error: 'Applicant name is required.' }, 400);
    const key = landlordApplicationsKey(email);
    const existing = (await kv.get(key) as any[]) || [];
    await kv.set(key, [app_, ...existing]);
    return c.json({ success: true, application: app_ }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add the application.' }, 500); }
});

rentalRouter.patch('/make-server-3eae23a6/landlord/applications/:id', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to review applications.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const key = landlordApplicationsKey(email);
    const apps = (await kv.get(key) as any[]) || [];
    const idx = apps.findIndex((a: any) => a.id === c.req.param('id'));
    if (idx < 0) return c.json({ success: false, error: 'Application not found.' }, 404);
    const body = await c.req.json().catch(() => ({}));
    const decision = String(body.decision || '').toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return c.json({ success: false, error: 'Decision must be approved or rejected.' }, 400);
    const now = new Date().toISOString();
    apps[idx] = { ...apps[idx], status: decision, decidedAt: now, decisionNote: String(body.note || '').slice(0, 500), updatedAt: now };
    await kv.set(key, apps);

    // Record the decision against the screening order too, and with it the one
    // fact nobody else can supply: whether the report bore on the decision.
    // The obligation to send an adverse-action notice attaches to a decision
    // made BECAUSE OF a consumer report, so this is the landlord's answer about
    // their own reasoning and is never inferred from the rejection alone.
    let adverseAction: any = null;
    let refundIssued = 0;
    let refundBlocked: string | null = null;
    try {
      const ids = (await kv.get(landlordOrdersKey(email)) as string[]) || [];
      const loaded = await Promise.all(ids.slice(0, 200).map((oid) => kv.get(screeningOrderKey(oid)) as Promise<any>));
      const order = loaded.find((o: any) => ownsOrder(o, email) && o?.applicationId === apps[idx].id);
      if (order) {
        const reportInfluenced = body.reportInfluenced === true;
        const decided = {
          ...order,
          decision,
          decidedAt: now,
          decidedBy: email,
          reportInfluenced,
          updatedAt: now,
        };
        await kv.set(screeningOrderKey(order.id), decided);

        // The statutory refund, issued the moment the rejection is recorded
        // rather than waited for. Thirty days is the outer limit in
        // RSA 540-A:3 VIII, not the target, and the sweep is only a backstop
        // for a decision made while this call was failing.
        try {
          const settled = await settleScreeningRefund(decided);
          if (settled.refundedAt && !order.refundedAt) refundIssued = settled.refundCents || 0;
          if (settled.refundBlocked) refundBlocked = settled.refundBlocked;
        } catch (refundError: any) {
          // Not fatal to the decision, and loud, because money is owed on a
          // statutory clock and the sweep has to pick it up.
          console.log(`[screening] refund failed on ${order.id}: ${refundError?.message || refundError}`);
          refundBlocked = 'error';
        }

        const agency = providerFor(order.provider)?.agency ?? null;
        const refusal = adverseActionRefusal(order, decision, reportInfluenced, agency);
        // Reported, not sent. There is no route that sends this: the wording is
        // a draft awaiting a lawyer, and the landlord is told it is owed rather
        // than having something posted in their name.
        adverseAction = refusal ? { owed: false, reason: refusal } : { owed: true, orderId: order.id };

        // An adverse action is the single most consequential thing done with a
        // consumer report, and the one an audit will ask about by name. Logged
        // when it becomes owed, with what the landlord said about their own
        // reasoning.
        if (!refusal) {
          await auditScreening({
            event: 'adverse_action',
            orderId: order.id,
            landlordEmail: email,
            certifiedBy: email,
            permissiblePurpose: order.permissiblePurpose,
            provider: order.provider,
            providerRef: order.providerRef,
            applicantName: order.applicantName,
            applicantEmail: order.applicantEmail,
            propertyState: order.propertyState,
            note: 'Declined; the landlord recorded the report as a factor.',
          });
        }
      }
    } catch (e: any) {
      // A decision must not fail because the screening record could not be
      // updated — the tenancy decision is the landlord's and has been made.
      console.log(`[screening] could not attach decision to order: ${e?.message || e}`);
    }

    let tenant = null; let invite: any = null;
    if (decision === 'approved') {
      const a = apps[idx];
      const roster = (await kv.get(landlordTenantsKey(email)) as any[]) || [];
      const plan = await landlordSubPortalPlan(actor);
      if (roster.length >= plan.quota) {
        return c.json({ success: true, application: a, tenant: null, warning: `Application approved, but your ${plan.planId} plan tenant limit (${plan.quota}) is reached — free a slot to add them as a tenant.` });
      }
      const tenantEmail = String(a.email || '').trim().toLowerCase();
      tenant = { id: `tenant_${crypto.randomUUID()}`, name: a.name, email: tenantEmail, unit: String(body.unit || a.desiredUnit || '').trim(), rent: money(body.rent ?? a.desiredRent ?? 0), status: 'pending', landlordEmail: email, landlordUserId: actor.user.id, fromApplication: a.id, createdAt: now, updatedAt: now };

      // 1-click Approve & Invite: optionally provision a tenant portal login now.
      if (body.invite && tenantEmail) {
        try {
          const { data: existingList } = await supabase.auth.admin.listUsers();
          const already = (existingList?.users || []).find((u: any) => String(u.email || '').toLowerCase() === tenantEmail);
          if (!already) {
            const tempPassword = `Tenant-${crypto.randomUUID().slice(0, 8)}`;
            const { error: cErr } = await supabase.auth.admin.createUser({
              email: tenantEmail, password: tempPassword,
              app_metadata: { role: 'tenant' },
              user_metadata: { name: a.name, full_name: a.name, role: 'tenant', accountType: 'tenant', unit: tenant.unit, landlordEmail: email },
              email_confirm: true, // no mail server configured — confirm immediately
            });
            if (cErr) { invite = { created: false, error: cErr.message }; }
            else { invite = { created: true, tempPassword }; (tenant as any).invited = true; (tenant as any).invitedAt = now; (tenant as any).hasAccount = true; }
          } else {
            invite = { created: false, alreadyHadAccount: true }; (tenant as any).invited = true; (tenant as any).hasAccount = true;
          }
          // Approve-and-invite is a second door into the tenant portal and had
          // the same gap as the roster invite: an account was made and nobody
          // was told. Same branded email, same fallback.
          if (!invite?.error) {
            try {
              const delivery = await deliverPortalInvite({
                name: a.name || 'Tenant', email: tenantEmail, phone: String(a.phone || ''),
                portalType: 'tenant', grantFullAccess: true, trialMonths: 0,
                sendEmail: true, sendSms: false, wantQr: false,
              });
              invite = { ...invite, invitationSent: delivery.invitationSent, inviteNotice: delivery.inviteNotice || '' };
              // Only surface the credential when the email did not arrive.
              if (delivery.invitationSent) invite.tempPassword = null;
            } catch (mailError: any) {
              invite = { ...invite, invitationSent: false, inviteNotice: mailError?.message || 'The invite email could not be sent.' };
            }
          }
          await kv.set(`tenant_landlord:${tenantEmail}`, { landlordEmail: email, landlordUserId: actor.user.id, tenantName: a.name, unit: tenant.unit, updatedAt: now });
        } catch (e: any) { invite = { created: false, error: e?.message || 'Invite failed' }; }
      } else if (tenantEmail) {
        await kv.set(`tenant_landlord:${tenantEmail}`, { landlordEmail: email, landlordUserId: actor.user.id, tenantName: a.name, unit: tenant.unit, updatedAt: now });
      }

      await kv.set(landlordTenantsKey(email), [tenant, ...roster]);
    }
    return c.json({
      success: true, application: apps[idx], tenant, invite, adverseAction,
      refund: refundIssued > 0
        ? { issued: true, cents: refundIssued }
        : (refundBlocked ? { issued: false, blocked: refundBlocked } : { issued: false }),
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update the application.' }, 500); }
});

// Public: a prospect submits a rental application via a landlord's shared link.
rentalRouter.get('/make-server-3eae23a6/screening/:token', async (c) => {
  try {
    const { state, meta } = await loadScreeningToken(c.req.param('token'));
    if (state === 'revoked') return c.json({ success: false, error: 'This application link has been turned off by the landlord. Please ask them for a current link.' }, 410);
    if (state === 'expired') return c.json({ success: false, error: 'This application link has expired. Please ask the landlord for a current link.' }, 410);
    if (state !== 'ok') return c.json({ success: false, error: 'This application link is invalid or has expired.' }, 404);
    // The form renders this wording and the record stores it, so the consent we
    // keep is provably the consent that was shown.
    return c.json({ success: true, landlordEmail: meta.landlordEmail, consentText: SCREENING_CONSENT_TEXT });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load the application form.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/screening/:token/apply', async (c) => {
  try {
    const { state, meta } = await loadScreeningToken(c.req.param('token'));
    if (state === 'revoked') return c.json({ success: false, error: 'This application link has been turned off by the landlord. Please ask them for a current link.' }, 410);
    if (state === 'expired') return c.json({ success: false, error: 'This application link has expired. Please ask the landlord for a current link.' }, 410);
    if (state !== 'ok') return c.json({ success: false, error: 'This application link is invalid or has expired.' }, 404);
    const landlordEmail = String(meta.landlordEmail).toLowerCase();
    const body = await c.req.json().catch(() => ({}));
    const app_ = buildApplicationRecord(body, 'public', SCREENING_CONSENT_TEXT);
    if (!app_.name) return c.json({ success: false, error: 'Please enter your full name.' }, 400);
    if (!app_.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app_.email)) return c.json({ success: false, error: 'Please enter a valid email address.' }, 400);
    const key = landlordApplicationsKey(landlordEmail);
    const existing = (await kv.get(key) as any[]) || [];

    const refused = submissionRefusal(existing);
    if (refused) {
      console.log(`Screening link ${refused.window} cap reached for ${landlordEmail}`);
      return c.json({ success: false, error: 'Too many applications have been submitted through this link recently. Please try again later or contact the landlord directly.' }, 429);
    }

    await kv.set(key, [app_, ...existing]);
    notifyRecipient(landlordEmail, 'landlord_form', {
      subject: `New rental application — ${app_.name}`,
      text: `${app_.name} submitted a rental application.\n\nEmail: ${app_.email}\nPhone: ${app_.phone || '—'}\nDesired move-in: ${app_.moveIn || '—'}\nMonthly income: ${app_.income ? `$${Number(app_.income).toLocaleString()}` : '—'}\n\nReview it in your Landlord portal → Applications.`,
      sms: `New rental application from ${app_.name}. Review it in your Landlord portal.`,
    }).catch(() => {});
    return c.json({ success: true, message: 'Your application has been submitted.' }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to submit your application.' }, 500); }
});

// `consentText` is passed by the caller, never read from the body: the applicant
// agrees to what the server showed them, and a record carrying wording the
// submitter chose would prove nothing at all. A manually-entered application
// passes none, because nobody consented to anything in that case.
function buildApplicationRecord(body: any, source: string, consentText = '') {
  const now = new Date().toISOString();
  const consented = !!body.consentBackground;
  return {
    id: `app_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    name: String(body.name || '').trim().slice(0, 200),
    email: String(body.email || '').trim().toLowerCase().slice(0, 200),
    phone: String(body.phone || '').trim().slice(0, 40),
    currentAddress: String(body.currentAddress || '').trim().slice(0, 300),
    employer: String(body.employer || '').trim().slice(0, 200),
    income: Number(body.income) || 0,
    creditScore: String(body.creditScore || '').trim().slice(0, 20),
    householdSize: Number(body.householdSize) || 0,
    pets: String(body.pets || '').trim().slice(0, 200),
    moveIn: String(body.moveIn || '').trim().slice(0, 40),
    desiredUnit: String(body.desiredUnit || '').trim().slice(0, 160),
    desiredRent: Number(body.desiredRent) || 0,
    notes: String(body.notes || '').trim().slice(0, 2000),
    consentBackground: consented,
    consentAt: consented ? now : null,
    consentText: consented ? consentText : '',
    // The applicant's own guess at their credit score. Named so that nothing
    // downstream, and nobody reading the record, mistakes it for a report.
    creditScoreSelfReported: true,
    status: 'pending', source, createdAt: now, updatedAt: now,
  };
}

// ── Screening orders ─────────────────────────────────────────────────────────
//
// Ordering a credit, eviction and criminal report on a rental applicant. The
// rules are in `screeningOrder.ts` and the agency is behind the interface in
// `screeningProvider.ts`; what is here is storage, authorisation and delivery.
//
// There is no live provider yet, so orders are created against `manual`, which
// issues no invitation and produces no report. That is the point: the flow, the
// state machine and the ownership checks can be exercised before any agreement
// exists, and a provider that is not `live` is refused a report link so nobody
// is ever shown something that resembles a screening report and is not one.
function screeningOrderKey(id: string) { return `screening_order:${id}`; }
function landlordOrdersKey(email: string) { return `screening_orders_landlord:${String(email).toLowerCase()}`; }
function screeningInviteKey(token: string) { return `screening_invite:${token}`; }
function screeningDisclosureKey(token: string) { return `screening_disclosure:${token}`; }

/**
 * What an applicant in New Hampshire must be shown before a penny is taken.
 *
 * `RSA 540-A:3 VIII` names two facts: the amount, and whether a satisfactory
 * criminal background and credit check is required. The second is the
 * landlord's own letting policy rather than anything this software knows, so it
 * is captured per order when the screening is ordered.
 *
 * The refund sentence is here because it is the other half of the same statute
 * and the applicant is the person it protects. Telling them the fee is
 * refundable above cost if they are not offered the unit is not marketing; it
 * is what the law obliges the landlord to do, and an applicant who does not
 * know it cannot ask for it.
 *
 * Owned by the server and stored with the order, for the third time in this
 * system and the same reason as the applicant's consent and the landlord's
 * purpose certification: what was shown has to be what was kept.
 */
function screeningDisclosure(amountCents: number, requiresSatisfactoryCheck: boolean) {
  const amount = `$${(amountCents / 100).toFixed(2)}`;
  return {
    amountCents,
    requiresSatisfactoryCheck,
    statements: [
      `The screening fee is ${amount}, payable before the background and credit check is run.`,
      requiresSatisfactoryCheck
        ? 'A satisfactory criminal background check and credit check are required for this tenancy.'
        : 'A satisfactory criminal background check and credit check are not a requirement for this tenancy.',
      'The fee covers the cost of the documented background and credit checks and reasonable administrative costs.',
      'If you are not offered the unit, any amount beyond those documented costs is returned to you within 30 days.',
    ],
  };
}

// Moves an order's status through the machine, or refuses. Centralised so no
// route can write a status directly — a handler that assigns `order.status = x`
// has bypassed the one rule that keeps a finished report from being walked
// backwards by a late webhook.
async function advanceOrder(order: any, to: ScreeningState, patch: Record<string, unknown> = {}) {
  const verdict = transition(order.status as ScreeningState, to);
  if (verdict === 'refused') return { ok: false as const, order };
  const now = new Date().toISOString();
  const next = {
    ...order,
    ...patch,
    status: verdict === 'noop' ? order.status : to,
    updatedAt: now,
    ...(to === 'invited' && verdict === 'ok' ? { invitedAt: now } : {}),
    ...(to === 'complete' && verdict === 'ok' ? { completedAt: now } : {}),
  };
  await kv.set(screeningOrderKey(order.id), next);

  // One place records the outcome, because one place makes the move. A route
  // that advanced an order without logging it would be a gap nobody could see.
  const event = verdict === 'ok' ? auditEventFor(to) : null;
  if (event) {
    await auditScreening({
      event,
      orderId: next.id,
      landlordEmail: next.landlordEmail,
      certifiedBy: next.certifiedBy,
      permissiblePurpose: next.permissiblePurpose,
      provider: next.provider,
      providerRef: next.providerRef,
      applicantName: next.applicantName,
      applicantEmail: next.applicantEmail,
      propertyState: next.propertyState,
      note: event === 'failed' ? next.failureReason : null,
    });
  }

  return { ok: true as const, order: next, noop: verdict === 'noop' };
}

const SCREENING_PRICING_KEY = 'screening_pricing';

/**
 * Write one audit entry. Never throws into the caller.
 *
 * A failed audit write must not fail the thing it was describing: refusing to
 * complete a screening because a log row would not save is the wrong trade,
 * and the order record still carries the purpose and certifier as a second
 * source. It is logged loudly instead, because a silent gap in an audit trail
 * is the one thing an audit trail cannot survive.
 */
async function auditScreening(input: Parameters<typeof auditEntry>[0]) {
  try {
    const record = auditEntry(input, crypto.randomUUID());
    await kv.set(auditKey(record), record);
  } catch (e: any) {
    console.log(`[screening] AUDIT WRITE FAILED for order ${input?.orderId} (${input?.event}): ${e?.message || e}`);
  }
}

// How long an applicant-paid screening may sit undecided before the landlord is
// told. Two weeks: long enough that it is not chasing an ordinary decision,
// short enough to leave over a fortnight of the thirty-day refund window.
const SCREENING_STALE_DAYS = 14;

/**
 * Ask the provider for an invitation and hand it to the applicant.
 *
 * One implementation, used by the free path and by the webhook once a payment
 * clears. It was inline in the order route until there were two ways to reach
 * it, and two copies of "create the provider order, mint the token, move to
 * invited, email them" is two places for the token to be minted differently.
 */
async function inviteForOrder(order: any): Promise<{ ok: boolean; order: any }> {
  const provider = providerFor(order.provider);
  if (!provider) {
    const failed = await advanceOrder(order, 'failed', { failureReason: 'No screening provider is configured.' });
    return { ok: false, order: failed.order };
  }
  try {
    const created = await provider.createOrder({
      orderId: order.id,
      applicantName: String(order.applicantName || ''),
      applicantEmail: String(order.applicantEmail || ''),
      returnUrl: `${appUrl()}/apply`,
    });
    // The applicant's own token. 128 bits, bound to this one order, and the
    // only thing that reveals it to them.
    const inviteToken = crypto.randomUUID().replace(/-/g, '');
    await kv.set(screeningInviteKey(inviteToken), { orderId: order.id, createdAt: new Date().toISOString() });
    const moved = await advanceOrder(order, 'invited', {
      providerRef: created.providerRef,
      inviteExpiresAt: created.inviteExpiresAt ?? null,
      inviteToken,
    });

    // Only tell the applicant when there is somewhere real to send them. The
    // manual provider returns no invitation URL, and an email asking somebody
    // to verify their identity at nowhere is worse than silence.
    const to = String(order.applicantEmail || '').trim().toLowerCase();
    if (to && created.inviteUrl) {
      notifyRecipient(to, 'form_completed', {
        subject: 'Complete your tenant screening',
        text: `Your rental application is moving forward. To continue, verify your identity with our screening partner:\n\n${created.inviteUrl}\n\nYou agreed to this check when you applied${order.consentAt ? ` on ${new Date(order.consentAt).toLocaleDateString()}` : ''}.`,
        sms: 'Your rental application needs one more step: verify your identity to complete your tenant screening.',
      }).catch(() => {});
    }
    return { ok: true, order: moved.order };
  } catch (providerError: any) {
    const failed = await advanceOrder(order, 'failed', { failureReason: String(providerError?.message || 'The screening provider refused the order.').slice(0, 300) });
    return { ok: false, order: failed.order };
  }
}

/**
 * A Stripe Checkout session for a screening fee.
 *
 * On the PLATFORM account, with no connected account and no
 * `application_fee_amount`: this is Black Phoenix selling its own service, so
 * there is nothing to split. That is the opposite of the rent flow above, where
 * the money is the landlord's and we take a fee out of it.
 *
 * The amount comes from the server's own settings. Nothing about the price is
 * read from the request, because a browser that can name its own price is a
 * browser that will.
 *
 * `screening_order_id` in the metadata is what lets the webhook recognise its
 * own event — the same routing-by-metadata the store and the plan tiers use,
 * rather than guessing from the event type.
 */
async function createScreeningCheckout(order: any, decision: { payer: string | null; amountCents: number }) {
  const base = appUrl();
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${base}/landlord-portal?screening=paid`);
  params.set('cancel_url', `${base}/landlord-portal?screening=cancelled`);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][unit_amount]', String(decision.amountCents));
  params.set('line_items[0][price_data][product_data][name]', 'Tenant screening report');
  params.set('line_items[0][price_data][product_data][description]', `Credit, eviction and criminal report for ${order.applicantName || 'an applicant'}`);
  params.set('metadata[screening_order_id]', String(order.id));
  params.set('payment_intent_data[metadata][screening_order_id]', String(order.id));
  // Who is being asked to pay decides which address the receipt goes to, and
  // nothing else about the charge.
  const payerEmail = decision.payer === 'applicant'
    ? String(order.applicantEmail || '')
    : String(order.landlordEmail || '');
  if (payerEmail) params.set('customer_email', payerEmail);

  const session = await stripeReq('checkout/sessions', params, 'POST');
  if (!session?.id || !session?.url) throw new Error('Stripe did not return a checkout session.');
  return { id: String(session.id), url: String(session.url) };
}

/**
 * Issue the refund New Hampshire obliges, if one is owed.
 *
 * Returns the order, changed or not. Deliberately quiet when nothing is owed:
 * most orders owe nothing, and a caller should be able to say "settle this
 * order" after any decision without first working out whether a statute
 * applies.
 *
 * `retainedAdminCents` comes from the settings, defaulting to zero — the
 * conservative reading of "reasonable administrative costs", which refunds the
 * whole markup. See `screeningPricing.ts`.
 *
 * IDEMPOTENT IN TWO PLACES, BECAUSE THIS MOVES MONEY
 *
 * `refundDue` returns nothing once `refundedAt` is set, and the Stripe call
 * carries an idempotency key derived from the order id. So a decision recorded
 * twice, or a sweep that overlaps the decision route, cannot refund twice —
 * neither on our side nor on Stripe's.
 */
async function settleScreeningRefund(order: any): Promise<any> {
  const pricing = await kv.get(SCREENING_PRICING_KEY) as any;
  const owed = refundDue(order, Number(pricing?.retainedAdminCents ?? 0));
  if (owed <= 0) return order;

  const intent = String(order.stripePaymentIntentId || '');
  if (!intent) {
    // Owed, and we cannot pay it. Loud, because the deadline is statutory and
    // somebody has to issue this by hand.
    console.log(`[screening] REFUND OWED BUT NO PAYMENT INTENT on ${order.id}: ${owed} cents`);
    const flagged = { ...order, refundOwedCents: owed, refundBlocked: 'no_payment_intent', updatedAt: new Date().toISOString() };
    await kv.set(screeningOrderKey(order.id), flagged);
    return flagged;
  }

  const params = new URLSearchParams();
  params.set('payment_intent', intent);
  params.set('amount', String(owed));
  params.set('reason', 'requested_by_customer');
  params.set('metadata[screening_order_id]', String(order.id));
  params.set('metadata[basis]', 'RSA 540-A:3 VIII');

  const refund = await stripeReq('refunds', params, 'POST', undefined, `screening-refund-${order.id}`);
  const now = new Date().toISOString();
  const settled = {
    ...order,
    refundedAt: now,
    refundCents: owed,
    refundId: String(refund?.id || '') || null,
    refundOwedCents: null,
    refundBlocked: null,
    updatedAt: now,
  };
  await kv.set(screeningOrderKey(order.id), settled);

  const to = String(order.applicantEmail || '').trim().toLowerCase();
  if (to) {
    notifyRecipient(to, 'payment', {
      subject: 'Your screening fee has been partly refunded',
      text: `You were not offered the unit you applied for, so the part of your screening fee above the documented cost of the background and credit checks has been refunded: $${(owed / 100).toFixed(2)}.\n\nIt will appear on the card you paid with, usually within a few business days.`,
      sms: `A $${(owed / 100).toFixed(2)} refund of your screening fee is on its way back to your card.`,
    }).catch(() => {});
  }
  console.log(`[screening] refunded ${owed} cents on ${order.id} (RSA 540-A:3 VIII)`);
  return settled;
}

// Landlord: order a screening for one of their own applications.
rentalRouter.post('/make-server-3eae23a6/landlord/applications/:id/screening', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to order a screening.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();

    // Two separate promises by two separate people, checked separately: the
    // landlord certifies why they are pulling the report, and the applicant
    // authorised it. Neither can stand in for the other, and the law wants both.
    const body = await c.req.json().catch(() => ({}));
    const purposeProblem = purposeRefusal(body.permissiblePurpose, body.certified);
    if (purposeProblem) {
      return c.json({ success: false, error: purposeRefusalMessage(purposeProblem), reason: purposeProblem }, 400);
    }

    const apps = (await kv.get(landlordApplicationsKey(email)) as any[]) || [];
    const application = apps.find((a: any) => a?.id === c.req.param('id'));

    // The consent gate. Phase 0 recorded the wording and the date; this is the
    // moment that record earns its keep, and an application that predates it is
    // refused rather than screened on the strength of a bare boolean.
    const refusal = consentRefusal(application);
    if (refusal) {
      return c.json({ success: false, error: consentRefusalMessage(refusal), reason: refusal }, refusal === 'no_application' ? 404 : 409);
    }

    // One live order per application. Re-ordering a screening somebody is part
    // way through would charge twice and confuse the applicant about which
    // invitation is real.
    const existingIds = (await kv.get(landlordOrdersKey(email)) as string[]) || [];
    const existing = await Promise.all(existingIds.slice(0, 200).map((id) => kv.get(screeningOrderKey(id)) as Promise<any>));
    const live = existing.find((o: any) => o?.applicationId === application.id && o?.status && !isTerminal(o.status));
    if (live) return c.json({ success: true, order: landlordView(live), existing: true });

    const provider = providerFor(DEFAULT_PROVIDER);
    if (!provider) return c.json({ success: false, error: 'No screening provider is configured.' }, 503);

    /**
     * A landlord may not order a screening that cannot produce a report.
     *
     * The `manual` provider exists so this flow can be exercised before any
     * agency agreement, and that is still useful — but only to staff. For
     * anybody else an order against it is a promise the system cannot keep:
     * the status reaches `invited` and stays there, and before this guard they
     * would also have been charged for it.
     *
     * Staff are allowed through so the flow stays testable end to end, and
     * `chargeFor` refuses to charge a non-live provider regardless of who is
     * asking — so even a staff test cannot take money for nothing.
     */
    if (!provider.live && !actor.admin) {
      return c.json({
        success: false,
        error: 'Tenant screening is not available yet — no screening agency is connected, so no report could be produced. Nothing has been charged.',
        reason: 'provider_not_live',
      }, 503);
    }

    const id = `scr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    let order: any = {
      id,
      landlordEmail: email,
      applicationId: application.id,
      applicantName: application.name || null,
      applicantEmail: application.email || null,
      provider: provider.name,
      providerRef: null,
      status: 'created' as ScreeningState,
      createdAt: now,
      updatedAt: now,
      // The fee arrives in phase 2, with the price read from the plan catalogue
      // and the payer decided per state. Until then nothing is due, which is why
      // the order goes straight to `invited` below rather than through `paid`.
      priceCents: null,
      costCents: null,
      consentAt: application.consentAt,
      consentText: application.consentText,
      // Who said why, and the words they agreed to. Stored from the server's own
      // constant and the verified session, never from the request: a
      // certification whose wording or signatory the caller supplied would prove
      // nothing about what anybody actually certified.
      permissiblePurpose: String(body.permissiblePurpose),
      certifiedBy: email,
      certifiedAt: now,
      certificationText: SCREENING_PURPOSE_CERTIFICATION,
    };
    await kv.set(screeningOrderKey(id), order);
    await kv.set(landlordOrdersKey(email), [id, ...existingIds].slice(0, 500));

    // The audit entry is written when the report is REQUESTED, not when it
    // arrives. A pull that was asked for and failed is still a pull somebody
    // made against an applicant, and it is the one an audit most wants to see.
    await auditScreening({
      event: 'requested',
      orderId: id,
      landlordEmail: email,
      certifiedBy: email,
      permissiblePurpose: String(body.permissiblePurpose),
      provider: provider.name,
      applicantName: application.name,
      applicantEmail: application.email,
      propertyState: body.propertyState,
    });

    // Is there a fee, and whose? The price comes from the server's own settings
    // and never from the request; the state decides the payer. An unpriced
    // system — which is the state of it until somebody publishes a figure —
    // falls through to inviting at no charge, exactly as it did before money
    // existed here.
    const pricing = await kv.get(SCREENING_PRICING_KEY) as any;
    // `provider.live` is passed, not assumed: no money is taken for a report
    // that cannot be produced, whoever is asking.
    const decision = chargeFor(pricing, body.propertyState, provider.live);

    if (decision.charge) {
      try {
        order = {
          ...order,
          priceCents: decision.amountCents,
          costCents: decision.costCents,
          payer: decision.payer,
          propertyState: String(body.propertyState || '').trim().toUpperCase() || null,
          updatedAt: new Date().toISOString(),
        };

        /**
         * An applicant is SENT to the payment. They are not redirected through
         * the landlord's browser.
         *
         * This route used to build the checkout here and hand its URL back to
         * whoever called — which, for an applicant-paid fee, is the landlord.
         * They would have been the one typing a card number for a fee somebody
         * else owes. Nobody hit it because applicant-paid was unreachable
         * without a property state, but New Hampshire is the first state where
         * it is both lawful and wanted.
         *
         * No Stripe session is created yet, and that is the statute rather than
         * tidiness: `RSA 540-A:3 VIII` requires the amount and the
         * satisfactory-check requirement to be disclosed in writing *prior to
         * collecting any fee*. The session comes into existence when the
         * applicant has seen the disclosure, and not before.
         */
        if (decision.payer === 'applicant') {
          // The disclosure has to state whether a satisfactory check is
          // required, and that is the landlord's letting policy rather than
          // anything this software can work out. An absent answer is not a
          // "no": refuse rather than disclose something nobody said.
          if (body.requiresSatisfactoryCheck !== true && body.requiresSatisfactoryCheck !== false) {
            return c.json({
              success: false,
              error: 'Before an applicant can be charged, say whether a satisfactory background and credit check is required for this tenancy. It has to be disclosed to them in writing before any fee is taken.',
              reason: 'satisfactory_check_unanswered',
            }, 400);
          }
          const disclosureToken = crypto.randomUUID().replace(/-/g, '');
          order = { ...order, disclosureToken, requiresSatisfactoryCheck: body.requiresSatisfactoryCheck === true };
          await kv.set(screeningOrderKey(id), order);
          await kv.set(screeningDisclosureKey(disclosureToken), { orderId: id, createdAt: new Date().toISOString() });

          const to = String(order.applicantEmail || '').trim().toLowerCase();
          const payUrl = `${appUrl()}/screening-fee?t=${disclosureToken}`;
          if (to) {
            notifyRecipient(to, 'form_completed', {
              subject: 'One step to continue your rental application',
              text: `Your rental application is moving forward.\n\nBefore the background and credit check can be run, there is a screening fee of $${(decision.amountCents / 100).toFixed(2)}. You will see exactly what it covers before paying anything:\n\n${payUrl}\n\nIf you are not offered the unit, any amount above the documented cost of the checks is returned to you.`,
              sms: `Your rental application needs a screening fee of $${(decision.amountCents / 100).toFixed(2)} to continue. Check your email for the link.`,
            }).catch(() => {});
          }
          return c.json({
            success: true,
            order: landlordView(order),
            payment: { payer: 'applicant', amountCents: decision.amountCents, notified: !!to, applicantEmail: to || null },
          }, 201);
        }

        // Landlord-paid is unchanged: they are the payer, so handing them the
        // checkout is correct.
        const checkout = await createScreeningCheckout(order, decision);
        order = { ...order, stripeCheckoutSessionId: checkout.id, updatedAt: new Date().toISOString() };
        await kv.set(screeningOrderKey(id), order);
        // The order stays `created`. It becomes `paid` only when Stripe tells
        // the webhook so — never on a browser coming back from a redirect,
        // which proves nothing about whether a card was charged.
        return c.json({
          success: true,
          order: landlordView(order),
          payment: { payer: decision.payer, amountCents: decision.amountCents, checkoutUrl: checkout.url },
        }, 201);
      } catch (payError: any) {
        const failed = await advanceOrder(order, 'failed', { failureReason: String(payError?.message || 'The payment could not be started.').slice(0, 300) });
        return c.json({ success: false, error: 'The screening could not be started because the payment could not be set up. Nothing has been charged.', order: landlordView(failed.order) }, 502);
      }
    }

    const invited = await inviteForOrder(order);
    if (!invited.ok) {
      return c.json({ success: false, error: 'The screening could not be started. Nothing has been charged.', order: landlordView(invited.order) }, 502);
    }

    return c.json({
      success: true,
      order: landlordView(invited.order),
      charge: { charged: false, reason: decision.reason, notice: decision.reason ? chargeRefusalMessage(decision.reason) : null },
    }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to order the screening.' }, 500); }
});

// Landlord: their own screening orders, newest first.
rentalRouter.get('/make-server-3eae23a6/landlord/screening', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view screenings.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const ids = (await kv.get(landlordOrdersKey(email)) as string[]) || [];
    const loaded = await Promise.all(ids.slice(0, 200).map((id) => kv.get(screeningOrderKey(id)) as Promise<any>));
    // Filtered through the record's own owner field, not trusted from the index.
    const orders = loaded.filter((o: any) => ownsOrder(o, email)).map((o: any) => landlordView(o));
    // The purposes and the certification wording come from here so the portal
    // renders exactly what the order will record — the same reason the
    // applicant's consent wording is served rather than hard-coded in the form.
    return c.json({
      success: true,
      orders,
      purposes: SCREENING_PURPOSES.map((id) => ({ id, label: SCREENING_PURPOSE_LABELS[id] })),
      certification: SCREENING_PURPOSE_CERTIFICATION,
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load screenings.' }, 500); }
});

// Landlord: one order, with a link to the report if there is one to give.
rentalRouter.get('/make-server-3eae23a6/landlord/screening/:id', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view this screening.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const order = await kv.get(screeningOrderKey(c.req.param('id'))) as any;
    // 404 rather than 403 for somebody else's order: a 403 confirms the id
    // exists, which is a slow way of enumerating other landlords' screenings.
    if (!ownsOrder(order, email)) return c.json({ success: false, error: 'Screening not found.' }, 404);

    const provider = providerFor(order.provider);
    let reportUrl: string | null = null;
    let reportNotice: string | null = null;
    if (reportReadable(order)) {
      if (!provider?.live) {
        reportNotice = 'This screening was created against the test provider, so there is no report to show.';
      } else {
        // Fetched per request and never stored. A saved report URL is a saved
        // report, readable by anybody who finds the string.
        reportUrl = await provider.reportUrl(String(order.providerRef)).catch(() => null);
        if (!reportUrl) reportNotice = 'The report is complete but the provider did not return a link. Try again shortly.';
      }
    }
    return c.json({ success: true, order: landlordView(order), reportUrl, reportNotice });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load the screening.' }, 500); }
});

/**
 * The screening payment webhook — the ONLY thing that may mark an order paid.
 *
 * WHY NOT ON THE REDIRECT BACK
 *
 * Because a browser arriving at a success URL proves nothing. It can be typed,
 * shared, or reached by cancelling and editing the address. The only statement
 * that a card was charged comes from Stripe, so that is the only thing allowed
 * to move an order to `paid`.
 *
 * HOW IT GETS HERE, AND WHY THE PATH IS EXEMPT FROM THE AUTH WALL
 *
 * Stripe cannot send a Supabase JWT, so signature verification happens in the
 * separate `stripe-webhooks` function, which runs with `verify_jwt = false`.
 * That function forwards the original bytes here, the way it already forwards
 * store events. **Verified against production on 2026-10-03:** a POST to
 * `/store/webhook` carrying the publishable key answers 401 "Sign in
 * required.", so a forwarded event cannot cross the wall unless its exact path
 * is listed. This one is.
 *
 * KNOWING THE PATH BUYS NOTHING
 *
 * The route re-verifies the session directly with Stripe before it acts — the
 * same defence in depth the store webhook uses — and then matches the session
 * id against the one stored on the order when the checkout was created. A
 * forged body cannot make Stripe say a payment succeeded, and a replayed real
 * body is idempotent: `created → paid` happens once, and the second delivery
 * finds the order already past it and reports a duplicate.
 */
rentalRouter.post('/make-server-3eae23a6/screening/webhook', async (c) => {
  try {
    const raw = await c.req.text();
    let event: any;
    try { event = JSON.parse(raw); } catch { return c.json({ received: false, error: 'Invalid payload.' }, 400); }
    if (event?.type !== 'checkout.session.completed' && event?.type !== 'checkout.session.async_payment_succeeded') {
      return c.json({ received: true, ignored: event?.type || 'unknown' });
    }
    const session = event?.data?.object || {};
    const orderId = String(session?.metadata?.screening_order_id || '');
    if (!orderId) return c.json({ received: true, ignored: 'no screening_order_id metadata' });

    const order = await kv.get(screeningOrderKey(orderId)) as any;
    if (!order) return c.json({ received: true, error: 'Screening order not found.' });

    // Re-verified with Stripe rather than trusted from the body.
    const verified = await stripeReq(`checkout/sessions/${encodeURIComponent(String(session.id || order.stripeCheckoutSessionId))}`, undefined, 'GET');
    if (!verified?.id || verified.id !== order.stripeCheckoutSessionId) {
      return c.json({ received: true, error: 'This session does not belong to that screening order.' });
    }
    if (verified.payment_status !== 'paid') {
      return c.json({ received: true, error: 'Stripe has not confirmed this payment.' });
    }

    const paid = await advanceOrder(order, 'paid', {
      paidAt: new Date().toISOString(),
      // Kept because a refund is issued against the payment intent, not the
      // session. Without it the statutory refund would have nothing to target.
      stripePaymentIntentId: String(verified.payment_intent || '') || null,
      // What Stripe says was actually taken, alongside what we meant to charge.
      // They should agree; if they ever do not, the record shows both.
      amountPaidCents: Number(verified.amount_total ?? 0) || null,
    });
    if (!paid.ok) return c.json({ received: true, error: `A ${order.status} screening cannot become paid.` });
    if (paid.noop) return c.json({ received: true, duplicate: true, orderId });

    // Payment taken, so now ask the provider for the invitation. A failure here
    // leaves the order `failed` with the money taken, which is the honest
    // record — and the refund is a decision for a person, not something a
    // webhook should do on its own.
    const invited = await inviteForOrder(paid.order);
    return c.json({ received: true, orderId, invited: invited.ok });
  } catch (error: any) {
    console.log('screening/webhook error:', error);
    // 500 so Stripe retries. Swallowing this would drop a real payment.
    return c.json({ received: false, error: error.message || 'Webhook processing failed.' }, 500);
  }
});

// Landlord: the draft adverse-action notice for a declined application.
//
// A draft, and nothing here sends it. The wording has not been through a lawyer
// and the agency block comes from the provider, so with no live provider this
// route refuses — correctly, since a notice naming no agency cannot tell
// somebody where their file is, which is the only thing it is for.
rentalRouter.get('/make-server-3eae23a6/landlord/screening/:id/adverse-action', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view this notice.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const order = await kv.get(screeningOrderKey(c.req.param('id'))) as any;
    if (!ownsOrder(order, email)) return c.json({ success: false, error: 'Screening not found.' }, 404);

    const agency = providerFor(order.provider)?.agency ?? null;
    const refusal = adverseActionRefusal(order, String(order.decision || ''), order.reportInfluenced, agency);
    if (refusal) {
      const why: Record<string, string> = {
        not_declined: 'No notice is owed: this application was not declined.',
        no_screening: 'No notice is owed: there is no completed screening report for this application.',
        report_not_used: 'No notice is owed: the report was not recorded as a factor in this decision.',
        agency_unknown: 'A notice is owed, but it cannot be produced yet: the screening agency that furnished the report is not known. A notice must name the agency so the applicant can obtain and dispute their file.',
      };
      return c.json({ success: false, error: why[refusal], reason: refusal }, 409);
    }

    return c.json({
      success: true,
      notice: adverseActionNotice({
        applicantName: String(order.applicantName || 'Applicant'),
        applicantEmail: order.applicantEmail ?? null,
        decidedAt: String(order.decidedAt || order.updatedAt || ''),
        agency: agency!,
      }),
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to produce the notice.' }, 500); }
});

// Applicant: the fee disclosure. Read before anything is charged, by a person
// with no account, addressed by their own token.
rentalRouter.get('/make-server-3eae23a6/screening/fee/:token', async (c) => {
  try {
    const rec = await kv.get(screeningDisclosureKey(c.req.param('token'))) as any;
    if (!rec?.orderId) return c.json({ success: false, error: 'This payment link is invalid or has expired.' }, 404);
    const order = await kv.get(screeningOrderKey(rec.orderId)) as any;
    if (!order) return c.json({ success: false, error: 'This payment link is invalid or has expired.' }, 404);
    if (order.paidAt) return c.json({ success: true, alreadyPaid: true, order: applicantView(order) });
    if (isTerminal(order.status)) return c.json({ success: false, error: 'This screening is no longer open.' }, 409);
    return c.json({
      success: true,
      applicantName: order.applicantName || null,
      disclosure: screeningDisclosure(Number(order.priceCents || 0), order.requiresSatisfactoryCheck === true),
    });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load the fee details.' }, 500); }
});

/**
 * Applicant: they have read the disclosure, so now a checkout may exist.
 *
 * The ordering is the compliance. "Prior to collecting any fee" means the
 * Stripe session is created HERE, after the disclosure has been shown and
 * acknowledged, rather than at order time with a disclosure shown beside it.
 * There is no path to a payment page that does not pass through this route, so
 * there is no path to a charge without a record of what was disclosed.
 */
rentalRouter.post('/make-server-3eae23a6/screening/fee/:token/accept', async (c) => {
  try {
    const rec = await kv.get(screeningDisclosureKey(c.req.param('token'))) as any;
    if (!rec?.orderId) return c.json({ success: false, error: 'This payment link is invalid or has expired.' }, 404);
    const order = await kv.get(screeningOrderKey(rec.orderId)) as any;
    if (!order) return c.json({ success: false, error: 'This payment link is invalid or has expired.' }, 404);
    if (order.paidAt) return c.json({ success: true, alreadyPaid: true });
    if (isTerminal(order.status)) return c.json({ success: false, error: 'This screening is no longer open.' }, 409);
    if (String(order.payer || '') !== 'applicant') return c.json({ success: false, error: 'This screening is not paid by the applicant.' }, 409);

    const amountCents = Number(order.priceCents || 0);
    if (!(amountCents > 0)) return c.json({ success: false, error: 'This screening has no fee to pay.' }, 409);

    const disclosure = screeningDisclosure(amountCents, order.requiresSatisfactoryCheck === true);
    const checkout = await createScreeningCheckout(order, { payer: 'applicant', amountCents });
    const now = new Date().toISOString();
    await kv.set(screeningOrderKey(order.id), {
      ...order,
      stripeCheckoutSessionId: checkout.id,
      disclosedAt: now,
      disclosedAmountCents: amountCents,
      disclosureText: disclosure.statements.join(' '),
      updatedAt: now,
    });
    return c.json({ success: true, checkoutUrl: checkout.url });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to start the payment.' }, 500); }
});

// Applicant: what is happening with the screening they consented to. Addressed
// by their own invitation token; reveals the order and nothing around it.
rentalRouter.get('/make-server-3eae23a6/screening/order/:token', async (c) => {
  try {
    const invite = await kv.get(screeningInviteKey(c.req.param('token'))) as any;
    if (!invite?.orderId) return c.json({ success: false, error: 'This screening link is invalid or has expired.' }, 404);
    const order = await kv.get(screeningOrderKey(invite.orderId)) as any;
    if (!order) return c.json({ success: false, error: 'This screening link is invalid or has expired.' }, 404);
    return c.json({ success: true, order: applicantView(order) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load the screening.' }, 500); }
});

// Applicant: they have started identity verification with the provider.
rentalRouter.post('/make-server-3eae23a6/screening/order/:token/begin', async (c) => {
  try {
    const invite = await kv.get(screeningInviteKey(c.req.param('token'))) as any;
    if (!invite?.orderId) return c.json({ success: false, error: 'This screening link is invalid or has expired.' }, 404);
    const order = await kv.get(screeningOrderKey(invite.orderId)) as any;
    if (!order) return c.json({ success: false, error: 'This screening link is invalid or has expired.' }, 404);
    const moved = await advanceOrder(order, 'verifying');
    if (!moved.ok) return c.json({ success: false, error: 'This screening can no longer be started.', order: applicantView(order) }, 409);
    return c.json({ success: true, order: applicantView(moved.order) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to start the screening.' }, 500); }
});

/**
 * Staff: read and set the screening fee.
 *
 * Staff-only in both directions, because this decides what members of the
 * public are charged. It starts empty and an empty price charges nobody, so the
 * dangerous direction is somebody setting a figure, not somebody failing to.
 */
rentalRouter.get('/make-server-3eae23a6/staff/screening/pricing', async (c) => {
  try {
    if (!(await isStaffRequest(c))) return c.json({ success: false, error: 'Staff access is required.' }, 403);
    const pricing = (await kv.get(SCREENING_PRICING_KEY) as any) || null;
    return c.json({ success: true, pricing, maxPriceCents: SCREENING_MAX_PRICE_CENTS });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load the screening fee.' }, 500); }
});

rentalRouter.put('/make-server-3eae23a6/staff/screening/pricing', async (c) => {
  try {
    if (!(await isStaffRequest(c))) return c.json({ success: false, error: 'Staff access is required.' }, 403);
    const body = await c.req.json().catch(() => ({}));

    const priceCents = Math.round(Number(body.priceCents ?? 0));
    const costCents = Math.round(Number(body.costCents ?? 0));
    if (!Number.isFinite(priceCents) || priceCents < 0) return c.json({ success: false, error: 'The fee must be a positive number of cents, or zero to charge nothing.' }, 400);
    if (priceCents > SCREENING_MAX_PRICE_CENTS) return c.json({ success: false, error: `The fee cannot exceed $${(SCREENING_MAX_PRICE_CENTS / 100).toFixed(2)}. Check the decimal point.` }, 400);
    if (!Number.isFinite(costCents) || costCents < 0) return c.json({ success: false, error: 'The agency cost must be a positive number of cents, or zero if not known.' }, 400);

    // Only the two payers, and only two-letter state codes. An unrecognised
    // payer is dropped rather than stored, so a typo cannot leave a state
    // configured with something `payerFor` will not honour.
    const payerByState: Record<string, string> = {};
    const offered = body.payerByState && typeof body.payerByState === 'object' ? body.payerByState : {};
    for (const [rawState, rawPayer] of Object.entries(offered)) {
      const state = String(rawState).trim().toUpperCase();
      const payer = String(rawPayer).trim().toLowerCase();
      if (!/^[A-Z]{2}$/.test(state)) continue;
      if (payer !== 'landlord' && payer !== 'applicant') continue;
      payerByState[state] = payer;
    }

    // What may be retained from a refunded fee as "reasonable administrative
    // costs" under RSA 540-A:3 VIII. Zero is the conservative reading and the
    // default; raising it is a legal judgement somebody has taken advice on,
    // not a pricing decision, which is why it has no UI and sits here.
    const retainedAdminCents = Math.round(Number(body.retainedAdminCents ?? 0));
    if (!Number.isFinite(retainedAdminCents) || retainedAdminCents < 0) return c.json({ success: false, error: 'Retained administrative costs must be zero or a positive number of cents.' }, 400);
    if (retainedAdminCents > priceCents) return c.json({ success: false, error: 'Retained administrative costs cannot exceed the fee itself.' }, 400);

    const defaultPayer = String(body.defaultPayer || '').toLowerCase() === 'applicant' ? 'applicant' : 'landlord';
    const pricing = {
      priceCents,
      costCents,
      retainedAdminCents,
      defaultPayer,
      payerByState,
      enabled: body.enabled !== false,
      updatedAt: new Date().toISOString(),
      updatedBy: String((c.get('actor') as any)?.email || 'staff'),
    };
    await kv.set(SCREENING_PRICING_KEY, pricing);
    return c.json({ success: true, pricing });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to save the screening fee.' }, 500); }
});

/**
 * Staff: every consumer report requested in a month.
 *
 * This is the route that answers an audit, which is why it reads by month
 * rather than paging everything: the question is always "show me the pulls in
 * this period". Staff only, and it returns metadata — who pulled, under what
 * purpose, about whom — and never a report, because none is stored.
 *
 * It survives the retention purge on purpose. The purge deletes finished
 * orders; these entries are a separate prefix with their own life, so a
 * year-old audit question is still answerable after the orders behind it are
 * long gone.
 */
rentalRouter.get('/make-server-3eae23a6/staff/screening/audit', async (c) => {
  try {
    if (!(await isStaffRequest(c))) return c.json({ success: false, error: 'Staff access is required.' }, 403);
    const month = String(c.req.query('month') || '').trim() || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month) && month !== 'unknown') {
      return c.json({ success: false, error: 'Month must be in the form YYYY-MM.' }, 400);
    }
    const rows = await kv.getByPrefix(auditMonthPrefix(month));
    const entries = rows
      .map((r: any) => r?.value)
      .filter(Boolean)
      .sort((a: any, b: any) => String(b.at).localeCompare(String(a.at)));
    const byEvent: Record<string, number> = {};
    for (const e of entries) byEvent[String(e.event)] = (byEvent[String(e.event)] || 0) + 1;
    return c.json({ success: true, month, count: entries.length, byEvent, entries });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to read the audit log.' }, 500); }
});

/**
 * Staff: what screening has earned.
 *
 * Counts only orders that were actually paid, so work deliberately given away
 * does not appear as a loss. Wiring this figure into the revenue dashboards is
 * deliberately not done here — that is a UI decision about where it belongs,
 * and this route is the number those screens would read.
 */
rentalRouter.get('/make-server-3eae23a6/staff/screening/revenue', async (c) => {
  try {
    if (!(await isStaffRequest(c))) return c.json({ success: false, error: 'Staff access is required.' }, 403);
    const rows = await kv.getByPrefix('screening_order:');
    const orders = rows.map((r: any) => r?.value).filter(Boolean);
    const byStatus: Record<string, number> = {};
    for (const o of orders) byStatus[String(o.status)] = (byStatus[String(o.status)] || 0) + 1;
    return c.json({ success: true, totalOrders: orders.length, byStatus, ...marginOf(orders) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to summarise screening revenue.' }, 500); }
});

// Staff only: move a `manual` order along, so the flow can be tested before a
// provider exists. Staff rather than landlord on purpose — a landlord able to
// advance their own order to `complete` could manufacture the appearance of a
// screening report, and somebody would act on it.
rentalRouter.post('/make-server-3eae23a6/staff/screening/:id/advance', async (c) => {
  try {
    if (!(await isStaffRequest(c))) return c.json({ success: false, error: 'Staff access is required.' }, 403);
    const order = await kv.get(screeningOrderKey(c.req.param('id'))) as any;
    if (!order) return c.json({ success: false, error: 'Screening not found.' }, 404);
    const provider = providerFor(order.provider);
    if (provider?.live) return c.json({ success: false, error: 'A live provider decides its own order statuses; they cannot be set by hand.' }, 409);
    const body = await c.req.json().catch(() => ({}));
    const to = String(body.to || '') as ScreeningState;
    if (!SCREENING_STATES.includes(to)) return c.json({ success: false, error: `Unknown status. One of: ${SCREENING_STATES.join(', ')}.` }, 400);
    const moved = await advanceOrder(order, to, to === 'failed' ? { failureReason: 'Advanced by staff for testing.' } : {});
    if (!moved.ok) return c.json({ success: false, error: `A ${order.status} screening cannot become ${to}.` }, 409);
    return c.json({ success: true, order: landlordView(moved.order) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to advance the screening.' }, 500); }
});

/**
 * The invitation expiry sweep, for the database scheduler.
 *
 * WHY A SWEEP AND NOT A CHECK ON READ
 *
 * Because an order nobody opens still has to stop being live. Expiring lazily
 * would mean a landlord's list showed `invited` for an invitation that died
 * three weeks ago, and phase 2's refunds would be decided by who happened to
 * load a page.
 *
 * AUTHENTICATED BY A SHARED SECRET, FOLLOWING THE TWO SWEEPS THAT CAME BEFORE
 *
 * Read from `private_cron_config` so it can be rotated without a deploy, then
 * the environment, and refusing outright when neither yields a value. An unset
 * secret must never mean "no check required".
 *
 * WHAT IT IS ALLOWED TO DO
 *
 * Move `invited` to `expired`, and nothing else. It cannot complete an order,
 * cannot read a report, and touches no money. Every move goes through the same
 * `advanceOrder` as every other, so the sweep cannot do something a route
 * could not — in particular it cannot expire a `complete` order, which is the
 * midnight-tick accident this design exists to prevent.
 *
 * It is also idempotent: a second run finds nothing left to do, because the
 * first run moved those orders out of `invited`. Safe to retry, safe to run
 * twice if a schedule overlaps.
 */
rentalRouter.post('/make-server-3eae23a6/cron/screening/expire-invitations', async (c) => {
  let secret = '';
  try {
    const { data } = await supabase
      .from('private_cron_config')
      .select('value')
      .eq('key', 'screening_cron_secret')
      .maybeSingle();
    secret = String(data?.value || '');
  } catch {
    // Fall through to the environment. A database blip must not turn a machine
    // endpoint into an open one — the check below still refuses with neither.
  }
  if (!secret) secret = Deno.env.get('SCREENING_CRON_SECRET') || '';

  const offered = c.req.header('X-Screening-Cron-Secret') || '';
  if (!secret || offered !== secret) {
    return c.json({ success: false, error: 'Unauthorized.' }, 401);
  }

  try {
    // Every order, from the orders themselves rather than per landlord: the
    // sweep must reach an order whose landlord's index has drifted, and an
    // order that no index points at is exactly the kind that would otherwise
    // sit in `invited` for ever.
    const rows = await kv.getByPrefix('screening_order:');
    const now = Date.now();
    let expired = 0;
    let refused = 0;
    for (const row of rows) {
      const order = (row as any)?.value;
      if (!inviteLapsed(order, now)) continue;
      const moved = await advanceOrder(order, 'expired');
      if (moved.ok) expired += 1; else refused += 1;
    }

    /**
     * The retention purge, in the same sweep.
     *
     * One job rather than a second clock entry, because it is the same
     * question asked of the same records on the same schedule. It reads its
     * window from `SCREENING_RETENTION_DAYS` — an edge-function secret, not a
     * stored setting and not a route — on purpose: this is the only
     * irreversible thing in the screening system, and a destructive policy
     * should not be editable from any staff session that happens to be signed
     * in. Changing it takes dashboard access.
     *
     * UNSET MEANS NOTHING IS PURGED. Deploying this file must not silently
     * begin destroying records, so there is no built-in default window and a
     * figure below the floor in `screeningOrder.ts` is treated as unset.
     */
    const retentionDays = Number(Deno.env.get('SCREENING_RETENTION_DAYS') || 0);
    let purged = 0;
    let kept = 0;
    if (retentionDays >= SCREENING_MIN_RETENTION_DAYS) {
      for (const row of rows) {
        const order = (row as any)?.value;
        if (!order?.id) continue;
        if (purgeRefusal(order, retentionDays, now)) { kept += 1; continue; }
        // The applicant's invitation token goes with it. Leaving it behind
        // would be a key to a record that no longer exists.
        if (order.inviteToken) await kv.del(screeningInviteKey(String(order.inviteToken))).catch(() => {});
        await kv.del(screeningOrderKey(String(order.id)));
        purged += 1;
      }
    }

    /**
     * The refund backstop, and the stale-application report.
     *
     * The refund normally happens the instant a rejection is recorded. This
     * pass exists for the decision that was recorded while Stripe or this
     * server was having a bad minute — the thirty-day clock in
     * RSA 540-A:3 VIII runs from when the fee was received, not from when we
     * noticed, so a missed call must not become a missed deadline.
     */
    const orders = rows.map((r: any) => r?.value).filter((o: any) => o?.id);
    let refunded = 0;
    let refundsOwed = 0;
    for (const order of orders) {
      try {
        const settled = await settleScreeningRefund(order);
        if (settled.refundedAt && !order.refundedAt) refunded += 1;
        if (settled.refundBlocked) refundsOwed += 1;
      } catch (refundError: any) {
        refundsOwed += 1;
        console.log(`[screening] sweep refund failed on ${order.id}: ${refundError?.message || refundError}`);
      }
    }

    // An undecided application is NOT a rejection, so nothing is refunded on
    // one. It is reported instead: the landlord has taken somebody's money and
    // not answered them, and only they can resolve it. Told once per order, so
    // an hourly job does not become hourly nagging.
    const stale = staleUndecided(orders, SCREENING_STALE_DAYS, now);
    let reported = 0;
    for (const order of stale) {
      if (order.staleNoticeSentAt) continue;
      await kv.set(screeningOrderKey(order.id), { ...order, staleNoticeSentAt: new Date().toISOString() });
      const to = String(order.landlordEmail || '').trim().toLowerCase();
      if (to) {
        notifyRecipient(to, 'message', {
          subject: `An applicant paid for screening ${SCREENING_STALE_DAYS} days ago and has had no answer`,
          text: `${order.applicantName || 'An applicant'} paid the screening fee for their application and no decision has been recorded.\n\nIf you are not renting the unit to them, the part of their fee above the documented cost of the checks has to be returned within 30 days of when they paid it — the clock started then, not today. Recording the decision in your portal issues that refund automatically.`,
          sms: `An applicant paid for screening ${SCREENING_STALE_DAYS} days ago with no decision recorded. A refund deadline may be running.`,
        }).catch(() => {});
      }
      reported += 1;
    }

    if (expired || refused || purged || refunded || refundsOwed || reported) {
      console.log(`[screening] sweep: ${expired} expired, ${refused} refused, ${purged} purged, ${kept} kept, ${refunded} refunded, ${refundsOwed} refunds stuck, ${reported} stale reported, of ${rows.length} orders`);
    }
    return c.json({
      success: true,
      scanned: rows.length,
      expired,
      refused,
      purged,
      refunded,
      refundsStuck: refundsOwed,
      staleReported: reported,
      retention: retentionDays >= SCREENING_MIN_RETENTION_DAYS ? { days: retentionDays, kept } : { configured: false },
    });
  } catch (error: any) {
    console.log(`[screening] expiry sweep error: ${error}`);
    return c.json({ success: false, error: error.message || 'The expiry sweep failed.' }, 500);
  }
});

// ── Document vault ───────────────────────────────────────────────────────────
const LANDLORD_DOCS_BUCKET = 'make-57095a78-landlord-docs';
async function ensureLandlordDocsBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b: any) => b.name === LANDLORD_DOCS_BUCKET)) {
    const created = await supabase.storage.createBucket(LANDLORD_DOCS_BUCKET, { public: false });
    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) throw created.error;
  }
}

rentalRouter.get('/make-server-3eae23a6/landlord/documents', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view documents.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const docs = (await kv.get(landlordDocsKey(email)) as any[]) || [];
    const signed = await Promise.all(docs.map(async (d: any) => {
      if (!d.path) return d;
      try {
        const { data } = await supabase.storage.from(LANDLORD_DOCS_BUCKET).createSignedUrl(d.path, 60 * 60 * 24 * 7);
        return { ...d, url: data?.signedUrl || '' };
      } catch { return { ...d, url: '' }; }
    }));
    return c.json({ success: true, documents: signed });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load documents.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/landlord/documents', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to upload documents.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) return c.json({ success: false, error: 'A file is required.' }, 400);
    if (file.size > 25 * 1024 * 1024) return c.json({ success: false, error: 'Documents must be 25MB or smaller.' }, 400);
    await ensureLandlordDocsBucket();
    const id = `doc_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'document';
    const path = `${email}/${id}-${safeName}`;
    const upload = await supabase.storage.from(LANDLORD_DOCS_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upload.error) throw upload.error;
    const now = new Date().toISOString();
    const doc = {
      id, name: String(body.name || file.name).slice(0, 200), fileName: file.name,
      category: String(body.category || 'General').slice(0, 60),
      relatedTo: String(body.relatedTo || '').slice(0, 200),
      size: file.size, contentType: file.type || 'application/octet-stream', path, createdAt: now,
    };
    const key = landlordDocsKey(email);
    const existing = (await kv.get(key) as any[]) || [];
    await kv.set(key, [doc, ...existing]);
    const { data: signed } = await supabase.storage.from(LANDLORD_DOCS_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
    return c.json({ success: true, document: { ...doc, url: signed?.signedUrl || '' } }, 201);
  } catch (error: any) { console.log('Document upload error:', error); return c.json({ success: false, error: error.message || 'Unable to upload the document.' }, 500); }
});

rentalRouter.delete('/make-server-3eae23a6/landlord/documents/:id', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to delete documents.' }, 401);
    if (!actor.landlord) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const key = landlordDocsKey(email);
    const docs = (await kv.get(key) as any[]) || [];
    const doc = docs.find((d: any) => d.id === c.req.param('id'));
    if (!doc) return c.json({ success: false, error: 'Document not found.' }, 404);
    if (doc.path) { try { await supabase.storage.from(LANDLORD_DOCS_BUCKET).remove([doc.path]); } catch { /* best effort */ } }
    await kv.set(key, docs.filter((d: any) => d.id !== doc.id));
    return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete the document.' }, 500); }
});

// ── Generic portal document vault ────────────────────────────────────────────
// Available to any authenticated user across every portal. Documents are scoped
// to the signed-in user's email so each account only sees its own files.
const PORTAL_DOCS_BUCKET = 'make-57095a78-portal-docs';
function portalDocsKey(email: string) { return `portal_documents:${String(email).toLowerCase()}`; }
async function ensurePortalDocsBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b: any) => b.name === PORTAL_DOCS_BUCKET)) {
    const created = await supabase.storage.createBucket(PORTAL_DOCS_BUCKET, { public: false });
    if (created.error && !String(created.error.message || '').toLowerCase().includes('already exists')) throw created.error;
  }
}

rentalRouter.get('/make-server-3eae23a6/portal/documents', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to view documents.' }, 401);
    const email = String(user.email).toLowerCase();
    const docs = (await kv.get(portalDocsKey(email)) as any[]) || [];
    const signed = await Promise.all(docs.map(async (d: any) => {
      if (!d.path) return d;
      try {
        const { data } = await supabase.storage.from(PORTAL_DOCS_BUCKET).createSignedUrl(d.path, 60 * 60 * 24 * 7);
        return { ...d, url: data?.signedUrl || '' };
      } catch { return { ...d, url: '' }; }
    }));
    return c.json({ success: true, documents: signed });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load documents.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/portal/documents', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to upload documents.' }, 401);
    const email = String(user.email).toLowerCase();
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) return c.json({ success: false, error: 'A file is required.' }, 400);
    if (file.size > 25 * 1024 * 1024) return c.json({ success: false, error: 'Documents must be 25MB or smaller.' }, 400);
    await ensurePortalDocsBucket();
    const id = `doc_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'document';
    const path = `${email}/${id}-${safeName}`;
    const upload = await supabase.storage.from(PORTAL_DOCS_BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upload.error) throw upload.error;
    const now = new Date().toISOString();
    const doc = {
      id, name: String(body.name || file.name).slice(0, 200), fileName: file.name,
      category: String(body.category || 'General').slice(0, 60),
      relatedTo: String(body.relatedTo || '').slice(0, 200),
      size: file.size, contentType: file.type || 'application/octet-stream', path, createdAt: now,
    };
    const key = portalDocsKey(email);
    const existing = (await kv.get(key) as any[]) || [];
    await kv.set(key, [doc, ...existing]);
    const { data: signed } = await supabase.storage.from(PORTAL_DOCS_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
    return c.json({ success: true, document: { ...doc, url: signed?.signedUrl || '' } }, 201);
  } catch (error: any) { console.log('Portal document upload error:', error); return c.json({ success: false, error: error.message || 'Unable to upload the document.' }, 500); }
});

rentalRouter.delete('/make-server-3eae23a6/portal/documents/:id', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to delete documents.' }, 401);
    const email = String(user.email).toLowerCase();
    const key = portalDocsKey(email);
    const docs = (await kv.get(key) as any[]) || [];
    const doc = docs.find((d: any) => d.id === c.req.param('id'));
    if (!doc) return c.json({ success: false, error: 'Document not found.' }, 404);
    if (doc.path) { try { await supabase.storage.from(PORTAL_DOCS_BUCKET).remove([doc.path]); } catch { /* best effort */ } }
    await kv.set(key, docs.filter((d: any) => d.id !== doc.id));
    return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete the document.' }, 500); }
});

// Regenerate a single section of an existing draft with an optional instruction.
// Returns the full revised lease with only the targeted section rewritten.
rentalRouter.post('/make-server-3eae23a6/landlord/leases/regenerate-section', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to edit a lease.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const leaseText = String(body.leaseText || '').trim();
    const section = String(body.section || '').trim();
    const instruction = String(body.instruction || '').trim();
    if (!leaseText) return c.json({ success: false, error: 'Generate a lease draft first.' }, 400);
    if (!section) return c.json({ success: false, error: 'Choose a section to regenerate.' }, 400);
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return c.json({ success: false, error: 'AI editing is not configured.' }, 500);
    const prompt = `You are editing a residential lease. Below is the full lease. Rewrite ONLY the "${section}" section${instruction ? ` according to this instruction: "${instruction}"` : ' to be clearer and more complete'}. Keep every other section exactly as-is, preserve the numbering and overall structure, and return the COMPLETE lease text with the revision applied. Do not add commentary.\n\nLEASE:\n${leaseText}`;
    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4.1-mini', temperature: 0.3, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!aiResp.ok) { const errText = await aiResp.text(); console.log('Lease regenerate error:', errText); return c.json({ success: false, error: 'The AI assistant could not revise the section. Please try again.' }, 502); }
    const aiJson = await aiResp.json();
    const draft = aiJson?.choices?.[0]?.message?.content?.trim() || '';
    if (!draft) return c.json({ success: false, error: 'The AI assistant returned an empty result. Please try again.' }, 502);
    return c.json({ success: true, draft });
  } catch (error: any) { console.log('Lease regenerate error:', error); return c.json({ success: false, error: error.message || 'Unable to revise the section.' }, 500); }
});

rentalRouter.get('/make-server-3eae23a6/landlord/leases', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your leases.' }, 401);
    const leases = await readLeasesFor(landlordLeasesKey(actor.user.email));
    return c.json({ success: true, leases });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load leases.' }, 500); }
});

// Create/send a lease (AI-generated body text OR an uploaded file) to a tenant.
rentalRouter.post('/make-server-3eae23a6/landlord/leases', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to send a lease.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const landlordEmail = String(actor.user.email).toLowerCase();
    const body = await c.req.parseBody();
    const tenantEmail = String(body.tenantEmail || '').trim().toLowerCase();
    if (!tenantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) return c.json({ success: false, error: 'A valid tenant email is required to send the lease.' }, 400);
    const tenantName = String(body.tenantName || '').trim().slice(0, 200);
    const title = String(body.title || 'Lease Agreement').trim().slice(0, 200);
    const propertyAddress = String(body.propertyAddress || '').trim().slice(0, 300);
    const unit = String(body.unit || '').trim().slice(0, 160);
    const bodyText = String(body.bodyText || '').trim();
    const source = String(body.source || (bodyText ? 'ai' : 'upload'));
    const id = `lease_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    let storageBucket = ''; let storagePath = ''; let fileName = '';
    const file = body.file;
    if (file instanceof File) {
      if (file.size > 15 * 1024 * 1024) return c.json({ success: false, error: 'The lease file must be 15MB or smaller.' }, 400);
      await ensureLeaseBucket();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'lease';
      storagePath = `${landlordEmail}/${id}-${safeName}`;
      const upload = await supabase.storage.from(LEASE_BUCKET).upload(storagePath, await file.arrayBuffer(), { contentType: file.type || 'application/octet-stream', upsert: false });
      if (upload.error) throw upload.error;
      storageBucket = LEASE_BUCKET; fileName = file.name;
    }

    if (!bodyText && !storagePath) return c.json({ success: false, error: 'Provide lease text or upload a document.' }, 400);

    const record = {
      id, title, tenantEmail, tenantName, landlordEmail, landlordUserId: actor.user.id,
      propertyAddress, unit, bodyText, source, fileName, storageBucket, storagePath,
      status: 'sent', signature: '', signedAt: '', createdAt: now, updatedAt: now,
    };
    await kv.set(leaseKey(id), record);
    const landlordIndex = (await kv.get(landlordLeasesKey(landlordEmail)) as string[]) || [];
    await kv.set(landlordLeasesKey(landlordEmail), [id, ...landlordIndex]);
    const tenantIndex = (await kv.get(tenantLeasesKey(tenantEmail)) as string[]) || [];
    await kv.set(tenantLeasesKey(tenantEmail), [id, ...tenantIndex]);

    const { storageBucket: _b, storagePath: _p, ...safe } = record;
    return c.json({ success: true, lease: safe }, 201);
  } catch (error: any) { console.log('Lease send error:', error); return c.json({ success: false, error: error.message || 'Unable to send the lease.' }, 500); }
});

// Signed download link — accessible to the admin, owning landlord, or tenant.
rentalRouter.get('/make-server-3eae23a6/leases/:id/download', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to download this lease.' }, 401);
    const id = c.req.param('id');
    const lease = await kv.get(leaseKey(id)) as any;
    if (!lease) return c.json({ success: false, error: 'Lease not found.' }, 404);
    const email = String(user.email).toLowerCase();
    const allowed = (await intakeIsAdmin(user)) || email === String(lease.landlordEmail || '').toLowerCase() || email === String(lease.tenantEmail || '').toLowerCase();
    if (!allowed) return c.json({ success: false, error: 'You do not have access to this lease.' }, 403);
    if (!lease.storagePath) return c.json({ success: false, error: 'This lease has no uploaded document.' }, 404);
    const { data, error } = await supabase.storage.from(lease.storageBucket || LEASE_BUCKET).createSignedUrl(lease.storagePath, 300);
    if (error) throw error;
    return c.json({ success: true, url: data.signedUrl, fileName: lease.fileName || 'lease' });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to download the lease.' }, 500); }
});

rentalRouter.get('/make-server-3eae23a6/tenant/leases', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to view your leases.' }, 401);
    const leases = await readLeasesFor(tenantLeasesKey(user.email));
    return c.json({ success: true, leases });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load your leases.' }, 500); }
});

rentalRouter.patch('/make-server-3eae23a6/tenant/leases/:id/sign', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to sign this lease.' }, 401);
    const id = c.req.param('id');
    const lease = await kv.get(leaseKey(id)) as any;
    if (!lease) return c.json({ success: false, error: 'Lease not found.' }, 404);
    if (String(user.email).toLowerCase() !== String(lease.tenantEmail || '').toLowerCase()) return c.json({ success: false, error: 'This lease was not sent to you.' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const signature = String(body.signature || '').trim().slice(0, 200);
    if (!signature) return c.json({ success: false, error: 'Type your full legal name to sign.' }, 400);
    const now = new Date().toISOString();
    const updated = { ...lease, signature, signedAt: now, status: 'signed', updatedAt: now };
    await kv.set(leaseKey(id), updated);
    // Notify the landlord that the tenant signed.
    if (lease.landlordEmail) {
      const who = lease.tenantName || signature || String(user.email);
      notifyRecipient(String(lease.landlordEmail), 'lease_signed', {
        subject: `✍️ ${who} signed the lease`,
        text: `${who} just signed the lease "${lease.title || 'Lease'}".\n\nSigned as: ${signature}\nDate: ${new Date(now).toLocaleString()}\n\nOpen your Landlord portal to view the signed document.`,
        sms: `${who} signed the lease "${lease.title || 'Lease'}". View it in your portal.`,
      }).catch(() => {});
    }
    const { storageBucket: _b, storagePath: _p, ...safe } = updated;
    return c.json({ success: true, lease: safe });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to sign the lease.' }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// LANDLORD FORMS — move-in / move-out condition checklists and pet deposit forms.
// A landlord builds a form and sends it to a tenant's sub-portal, where the
// tenant reviews, completes, and signs it. Records are keyed like leases.
// ─────────────────────────────────────────────────────────────────────────────
function formKey(id: string) { return `landlord_form:${id}`; }
function landlordFormsKey(email: string) { return `landlord_forms:${String(email).toLowerCase()}`; }
function tenantFormsKey(email: string) { return `tenant_forms:${String(email).toLowerCase()}`; }
const FORM_TYPES = ['move-in', 'move-out', 'pet-deposit'];

async function readFormsFor(indexKey: string) {
  const ids = (await kv.get(indexKey) as string[]) || [];
  if (!ids.length) return [];
  const records = (await kv.mget(ids.map(formKey))) as any[] || [];
  return records.filter(Boolean);
}

rentalRouter.get('/make-server-3eae23a6/landlord/forms', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your forms.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const forms = await readFormsFor(landlordFormsKey(actor.user.email));
    return c.json({ success: true, forms: forms.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load forms.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/landlord/forms', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to create a form.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const landlordEmail = String(actor.user.email).toLowerCase();
    const body = stripBase64(await c.req.json().catch(() => ({})));
    const type = String(body.type || '').trim();
    if (!FORM_TYPES.includes(type)) return c.json({ success: false, error: 'Unknown form type.' }, 400);
    const tenantEmail = String(body.tenantEmail || '').trim().toLowerCase();
    if (!tenantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) return c.json({ success: false, error: 'A valid tenant email is required to send the form.' }, 400);
    const defaultTitle = type === 'pet-deposit' ? 'Pet Deposit Agreement' : type === 'move-out' ? 'Move-Out Inspection Checklist' : 'Move-In Inspection Checklist';
    const title = String(body.title || defaultTitle).trim().slice(0, 200);
    const now = new Date().toISOString();
    const id = `form_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const record = {
      id, type, title,
      tenantEmail, tenantName: String(body.tenantName || '').trim().slice(0, 200),
      propertyAddress: String(body.propertyAddress || '').trim().slice(0, 300),
      unit: String(body.unit || '').trim().slice(0, 160),
      data: body.data && typeof body.data === 'object' ? body.data : {},
      landlordEmail, landlordUserId: actor.user.id,
      status: 'sent', tenantResponses: {}, signature: '', completedAt: '',
      createdAt: now, updatedAt: now,
    };
    await kv.set(formKey(id), record);
    const li = (await kv.get(landlordFormsKey(landlordEmail)) as string[]) || [];
    await kv.set(landlordFormsKey(landlordEmail), [id, ...li]);
    const ti = (await kv.get(tenantFormsKey(tenantEmail)) as string[]) || [];
    await kv.set(tenantFormsKey(tenantEmail), [id, ...ti]);
    notifyRecipient(tenantEmail, 'landlord_form', {
      subject: `📋 New form to complete: ${title}`,
      text: `Your landlord sent you a "${title}" to review and complete.\n\nOpen your tenant portal to fill it out and sign.`,
      sms: `New form from your landlord: "${title}". Complete it in your tenant portal.`,
    }).catch(() => {});
    return c.json({ success: true, form: stripBase64(record) }, 201);
  } catch (error: any) { console.log('Form create error:', error); return c.json({ success: false, error: error.message || 'Unable to create the form.' }, 500); }
});

rentalRouter.delete('/make-server-3eae23a6/landlord/forms/:id', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to delete a form.' }, 401);
    const id = c.req.param('id');
    const form = await kv.get(formKey(id)) as any;
    if (!form) return c.json({ success: false, error: 'Form not found.' }, 404);
    const email = String(actor.user.email).toLowerCase();
    if (!actor.admin && email !== String(form.landlordEmail || '').toLowerCase()) return c.json({ success: false, error: 'This form is not on your account.' }, 403);
    await kv.del(formKey(id));
    await kv.set(landlordFormsKey(form.landlordEmail), ((await kv.get(landlordFormsKey(form.landlordEmail)) as string[]) || []).filter(x => x !== id));
    if (form.tenantEmail) await kv.set(tenantFormsKey(form.tenantEmail), ((await kv.get(tenantFormsKey(form.tenantEmail)) as string[]) || []).filter(x => x !== id));
    return c.json({ success: true });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to delete the form.' }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONDITIONS REPORTS — what changed between a tenant moving in and moving out,
// what of it is chargeable, and what that does to the deposit.
//
// KEYED BY LANDLORD, WHICH IS THE ISOLATION
//
// `conditions_report:{landlordEmail}:{id}` means one prefix read returns
// everything a landlord owns and no request can reach across to somebody else's
// tenancy. Isolation by construction rather than by a filter somebody has to
// remember — the same choice `property-inspections.tsx` made, for the same
// reason.
//
// A TENANT'S INDEX ONLY EVER HOLDS SHARED REPORTS
//
// Tenants cannot be served by that prefix, so they have an index of their own.
// It is written when a report is SHARED and never at any other point, so there
// is no moment at which a tenant's index names a report they are not entitled
// to read. The read still checks the status, but the index is not the thing
// standing between them and it.
//
// NOTHING ABOUT MONEY IS ACCEPTED FROM A CLIENT
//
// Not the deductions, not the total, not what is returned. Those are derived on
// every read by `reportView`. A landlord may post overrides and a deposit
// figure; only staff may post costs, because the cost is our quote.
// ─────────────────────────────────────────────────────────────────────────────
function reportKey(landlordEmail: string, id: string) {
  return `conditions_report:${String(landlordEmail).toLowerCase()}:${id}`;
}
function reportPrefix(landlordEmail: string) {
  return `conditions_report:${String(landlordEmail).toLowerCase()}:`;
}
function tenantReportsKey(tenantEmail: string) {
  return `tenant_conditions_reports:${String(tenantEmail).toLowerCase()}`;
}

/** The two checklists a report was built from. Absent move-in is legitimate. */
async function reportForms(record: ConditionsReportRecord) {
  const [moveIn, moveOut] = await Promise.all([
    record.moveInFormId ? kv.get(formKey(record.moveInFormId)) : Promise.resolve(null),
    record.moveOutFormId ? kv.get(formKey(record.moveOutFormId)) : Promise.resolve(null),
  ]);
  return { moveIn: (moveIn as any) || null, moveOut: (moveOut as any) || null };
}

/** A report plus its derived findings and arithmetic, ready to serve. */
async function readReportView(record: ConditionsReportRecord) {
  const { moveIn, moveOut } = await reportForms(record);
  return reportView(record, moveIn, moveOut);
}

/**
 * The report a landlord is asking about, or a reason they cannot have it.
 *
 * Staff may read any report, because they are the ones pricing it. Everybody
 * else gets their own or a 403 — never a filtered answer.
 */
async function reportFor(c: any, id: string): Promise<
  { record: ConditionsReportRecord } | { error: string; code: 401 | 403 | 404 }
> {
  const actor = await landlordActor(c);
  if (!actor.user?.email) return { error: 'Sign in to view this report.', code: 401 };
  const email = String(actor.user.email).toLowerCase();

  const own = await kv.get(reportKey(email, id)) as ConditionsReportRecord | null;
  if (own) return { record: own };

  if (actor.admin) {
    // Staff price these, so they can reach one without owning it. Found by
    // scanning rather than guessing the owner, and still only by exact id.
    const all = (await kv.getByPrefix('conditions_report:')) as ConditionsReportRecord[];
    const found = (all || []).find((r) => r?.id === id);
    if (found) return { record: found };
    return { error: 'Report not found.', code: 404 };
  }
  return { error: 'That report is not on your account.', code: 403 };
}

rentalRouter.get('/make-server-3eae23a6/landlord/conditions-reports', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your reports.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const records = (await kv.getByPrefix(reportPrefix(email))) as ConditionsReportRecord[];
    const views = await Promise.all((records || []).filter(Boolean).map(readReportView));
    views.sort((a, b) => String(b.record.createdAt).localeCompare(String(a.record.createdAt)));
    return c.json({ success: true, reports: views });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || 'Unable to load your reports.' }, 500);
  }
});

rentalRouter.post('/make-server-3eae23a6/landlord/conditions-reports', async (c) => {
  try {
    const actor = await landlordActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to create a report.' }, 401);
    if (!actor.landlord && !actor.admin) return c.json({ success: false, error: 'An active landlord portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();

    const body = await c.req.json().catch(() => ({}));
    const moveOutId = String(body.moveOutFormId || '').trim();
    const moveInId = String(body.moveInFormId || '').trim();
    if (!moveOutId) return c.json({ success: false, error: 'A completed move-out checklist is required.' }, 400);

    const [moveOut, moveIn] = await Promise.all([
      kv.get(formKey(moveOutId)),
      moveInId ? kv.get(formKey(moveInId)) : Promise.resolve(null),
    ]) as any[];

    /*
     * Ownership of BOTH checklists is checked before anything is read off them.
     * A report is built from somebody's tenancy records, so being able to name
     * a form id must not be enough to compare two of them.
     */
    for (const [form, what] of [[moveOut, 'move-out'], [moveIn, 'move-in']] as const) {
      if (!form) continue;
      if (!actor.admin && String(form.landlordEmail || '').toLowerCase() !== email) {
        return c.json({ success: false, error: `That ${what} checklist is not on your account.` }, 403);
      }
    }
    if (!moveOut) return c.json({ success: false, error: 'Move-out checklist not found.' }, 404);

    const refusal = reportRefusal(moveIn, moveOut);
    if (refusal) return c.json({ success: false, error: refusal }, 400);

    const ownerEmail = String(moveOut.landlordEmail || email).toLowerCase();
    const existing = (await kv.getByPrefix(reportPrefix(ownerEmail))) as ConditionsReportRecord[];
    const already = (existing || []).find((r) => r?.moveOutFormId === moveOutId);
    if (already) {
      // One report per departure. A second one would be a second statement about
      // the same deposit, and nobody could say which was the real one.
      return c.json({
        success: false,
        error: 'There is already a conditions report for that move-out checklist.',
        reportId: already.id,
      }, 409);
    }

    const record = buildReport({
      id: `CR-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      landlordEmail: ownerEmail,
      landlordUserId: actor.user.id,
      moveInForm: moveIn,
      moveOutForm: moveOut,
      depositRaw: body.depositRaw,
    });

    await kv.set(reportKey(ownerEmail, record.id), record);
    return c.json({ success: true, report: await readReportView(record) }, 201);
  } catch (error: any) {
    console.log('Conditions report create error:', error);
    return c.json({ success: false, error: error.message || 'Unable to create the report.' }, 500);
  }
});

rentalRouter.get('/make-server-3eae23a6/landlord/conditions-reports/:id', async (c) => {
  try {
    const found = await reportFor(c, c.req.param('id'));
    if ('error' in found) return c.json({ success: false, error: found.error }, found.code);
    return c.json({ success: true, report: await readReportView(found.record) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || 'Unable to load the report.' }, 500);
  }
});

/**
 * What a landlord may change: the wear-or-damage call per area, and the deposit
 * figure where the lease field was not a number.
 *
 * They may NOT set a cost. Black Phoenix prices the damage, and a figure the
 * landlord typed would undercut the only reason the number is worth having.
 */
rentalRouter.patch('/make-server-3eae23a6/landlord/conditions-reports/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const found = await reportFor(c, id);
    if ('error' in found) return c.json({ success: false, error: found.error }, found.code);
    const actor = await landlordActor(c);
    const who = String(actor.user?.email || '').toLowerCase();
    const record = found.record;
    const body = await c.req.json().catch(() => ({}));
    const now = new Date().toISOString();

    let next: ConditionsReportRecord = { ...record, updatedAt: now };

    if (Array.isArray(body.overrides)) {
      if (record.frozenDiff) {
        return c.json({
          success: false,
          error: 'The findings on this report were frozen when it was sent. Reopen it first if they need changing.',
        }, 409);
      }
      next.overrides = body.overrides
        .filter((o: any) => o && String(o.area || '').trim())
        .filter((o: any) => o.classification === 'wear' || o.classification === 'damage')
        .slice(0, 100)
        .map((o: any) => ({
          area: String(o.area).trim().slice(0, 160),
          classification: o.classification,
          // Who decided is recorded from the SESSION, never from the body — the
          // report says a person made this call and it has to be the real one.
          by: who,
          at: now,
          reason: o.reason ? String(o.reason).trim().slice(0, 500) : undefined,
        }));
    }

    if (body.depositOverride !== undefined) {
      next.depositOverride = String(body.depositOverride || '').trim().slice(0, 40);
    }

    if (body.status !== undefined) {
      const to = String(body.status) as ReportStatus;
      const forms = await reportForms(next);
      const view = reportView(next, forms.moveIn, forms.moveOut);
      const refusal = transitionRefusal(next, to, view);
      if (refusal) return c.json({ success: false, error: refusal }, 409);
      next = applyTransition(next, to, view, now);

      /*
       * Sending it to be priced puts it on the pipeline as a work request.
       *
       * ONE request for the whole report: a turnover is one visit, one crew and
       * one quote, and three work requests for three damaged areas would put
       * three jobs on the pipeline for a single departure.
       *
       * `persistWorkRequest` is the only way a work request is written — it
       * maintains the index, the legacy list, and resolves the job the request
       * belongs to, so this lands on the same job as everything else about this
       * address. Reaching for the store directly would be a second way to create
       * one, and the second way is always the one that forgets something.
       *
       * Guarded on `workRequestId` rather than on the status, because a reopened
       * and re-sent report must not raise a second job for the same damage —
       * which is two crews turning up to one flat.
       */
      if (to === 'sent') {
        const scope = workRequestScope(view);
        const wr: any = {
          id: `wr_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
          title: scope.title, project_name: scope.title,
          description: scope.description,
          priority: scope.priority,
          category: 'maintenance',
          serviceType: 'Make good after tenancy',
          unit: next.unit || '',
          address: next.propertyAddress || '',
          client_email: next.landlordEmail, clientEmail: next.landlordEmail,
          client_name: next.landlordEmail,
          user_id: next.landlordUserId || actor.user?.id || null,
          landlordEmail: next.landlordEmail,
          type: 'landlord',
          source: 'conditions-report',
          // Traceable both ways: a question about this job reaches the report and
          // the two checklists with the photographs on them.
          conditionsReportId: next.id,
          moveInFormId: next.moveInFormId,
          moveOutFormId: next.moveOutFormId,
          status: 'pending',
          attachments: [],
          created_at: now, updated_at: now,
        };
        if (next.workRequestId) {
          /*
           * Re-sent after being reopened: the SAME job, with its scope brought
           * up to date.
           *
           * Raising a second request would be two crews at one flat. Leaving the
           * first one alone would be worse in a quieter way — somebody would
           * quote against findings the landlord has since corrected, and the
           * figure would land on a deposit statement that no longer matches it.
           */
          const existing = await kv.get(`wr:${next.workRequestId}`) as any;
          if (existing) {
            await persistWorkRequest({
              ...existing,
              title: scope.title, project_name: scope.title,
              description: scope.description,
              updated_at: now,
              rescopedAt: now,
            });
          } else {
            // The request was deleted out from under the report. Raise a fresh
            // one rather than leaving the report pointing at nothing.
            await persistWorkRequest(wr);
            next.workRequestId = wr.id;
            next.jobId = wr.jobId || undefined;
          }
        } else {
          await persistWorkRequest(wr);
          next.workRequestId = wr.id;
          next.jobId = wr.jobId || undefined;
        }

        notifyRecipient(Deno.env.get('REPLY_TO_EMAIL') || 'blackphoenixbuilds@proton.me', 'conditions_report_sent', {
          subject: `🧾 Conditions report to price — ${next.propertyAddress || 'a tenancy'}`,
          text: `${next.landlordEmail} has sent a conditions report for pricing.

`
            + `${scope.title}

${scope.description}`,
          sms: `Conditions report to price: ${next.propertyAddress || 'a tenancy'}.`,
        }).catch(() => {});
      }

      if (to === 'shared' && next.tenantEmail) {
        const index = (await kv.get(tenantReportsKey(next.tenantEmail)) as string[]) || [];
        const key = reportKey(next.landlordEmail, next.id);
        if (!index.includes(key)) {
          await kv.set(tenantReportsKey(next.tenantEmail), [key, ...index]);
        }
        notifyRecipient(next.tenantEmail, 'conditions_report', {
          subject: '📋 Your property conditions report',
          text: 'Your landlord has shared the conditions report for '
            + `${next.propertyAddress || 'your tenancy'}${next.unit ? `, ${next.unit}` : ''}.\n\n`
            + 'It compares the condition recorded when you moved in against the move-out '
            + 'inspection, and shows any deductions from your security deposit.\n\n'
            + 'Open your tenant portal to read it.',
          sms: 'Your landlord shared your property conditions report. Read it in your tenant portal.',
        }).catch(() => {});
      }
    }

    await kv.set(reportKey(next.landlordEmail, next.id), next);
    return c.json({ success: true, report: await readReportView(next) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || 'Unable to update the report.' }, 500);
  }
});

/**
 * The costs, which only Black Phoenix may set.
 *
 * This is the write that turns a documented report into a settlement, and it is
 * staff-only for the reason the whole flow exists: a quoted figure is evidence
 * and a landlord's own figure is an assertion. A report becomes `priced` by
 * itself once every chargeable area has one, because the pricing arrives from
 * our side and the landlord should not have to notice.
 */
rentalRouter.patch('/make-server-3eae23a6/landlord/conditions-reports/:id/costs', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to price a report.' }, 401);
    if (!await intakeIsAdmin(user)) {
      return c.json({ success: false, error: 'Only Black Phoenix staff can put a cost on a conditions report.' }, 403);
    }
    const id = c.req.param('id');
    const all = (await kv.getByPrefix('conditions_report:')) as ConditionsReportRecord[];
    const record = (all || []).find((r) => r?.id === id);
    if (!record) return c.json({ success: false, error: 'Report not found.' }, 404);

    const body = await c.req.json().catch(() => ({}));
    if (!Array.isArray(body.costs)) return c.json({ success: false, error: 'Costs are required.' }, 400);

    const now = new Date().toISOString();
    let next: ConditionsReportRecord = {
      ...record,
      costs: body.costs
        .filter((x: any) => x && String(x.area || '').trim())
        .slice(0, 100)
        .map((x: any) => {
          // Absent stays absent. A missing cost must not become zero here, or
          // the settlement would read as ready with a damaged area priced at
          // nothing — see the note in `depositMath.ts`.
          const absent = x.cost === null || x.cost === undefined || x.cost === '';
          const cost = absent ? null : Number(x.cost);
          return {
            area: String(x.area).trim().slice(0, 160),
            cost: cost !== null && Number.isFinite(cost) && cost >= 0 ? Math.round(cost * 100) / 100 : null,
            quoteId: x.quoteId ? String(x.quoteId).slice(0, 80) : undefined,
          };
        }),
      updatedAt: now,
    };

    const forms = await reportForms(next);
    const view = reportView(next, forms.moveIn, forms.moveOut);
    if (next.status === 'sent' && isFullyPriced(view)) {
      next = applyTransition(next, 'priced', view, now);
      notifyRecipient(next.landlordEmail, 'conditions_report_priced', {
        subject: '💵 Your conditions report has been priced',
        text: `The damage on the conditions report for ${next.propertyAddress || 'your property'}`
          + ' has been priced. Open your Landlord portal to review it and, if you are ready, '
          + 'share it with your tenant.',
        sms: 'Your conditions report has been priced. Review it in your Landlord portal.',
      }).catch(() => {});
    }

    await kv.set(reportKey(next.landlordEmail, next.id), next);
    return c.json({ success: true, report: await readReportView(next) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || 'Unable to price the report.' }, 500);
  }
});

/**
 * Price a conditions report from a quote.
 *
 * The figure on a deposit statement should be one Black Phoenix quoted, not one
 * somebody typed — that is the whole reason the report goes out for pricing. This
 * reads the quote, groups its lines onto the report's damaged areas and writes
 * the result, so each deduction can name the quote behind it.
 *
 * Staff only, and the quote must be the one raised against THIS report's job. A
 * quote from another job pricing this report would be a figure from one person's
 * work taking money off another person's deposit.
 */
rentalRouter.post('/make-server-3eae23a6/landlord/conditions-reports/:id/price-from-quote', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to price a report.' }, 401);
    if (!await intakeIsAdmin(user)) {
      return c.json({ success: false, error: 'Only Black Phoenix staff can price a conditions report.' }, 403);
    }

    const id = c.req.param('id');
    const all = (await kv.getByPrefix('conditions_report:')) as ConditionsReportRecord[];
    const record = (all || []).find((r) => r?.id === id);
    if (!record) return c.json({ success: false, error: 'Report not found.' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const quoteId = String(body?.quoteId || '').trim();
    if (!quoteId) return c.json({ success: false, error: 'Which quote?' }, 400);

    const quote = await kv.get(`quote:${quoteId}`) as any;
    const refusal = pricingRefusal(quote, record);
    if (refusal) return c.json({ success: false, error: refusal }, quote ? 409 : 404);

    /*
     * The chargeable areas come from the report's OWN findings, never from the
     * request. That is what stops a quote introducing a deduction for an area
     * the comparison never found damage in.
     */
    const forms = await reportForms(record);
    const before = reportView(record, forms.moveIn, forms.moveOut);
    const chargeable = before.diff.lines.filter((l) => l.chargeable).map((l) => l.area);

    const assignment: Record<string, string> = {};
    if (body?.assignment && typeof body.assignment === 'object') {
      for (const [lineId, area] of Object.entries(body.assignment)) {
        assignment[String(lineId).slice(0, 80)] = String(area).slice(0, 160);
      }
    }

    const priced = areasFromQuote(quote, chargeable, assignment);

    const now = new Date().toISOString();
    let next: ConditionsReportRecord = { ...record, costs: priced.costs, updatedAt: now };

    const after = reportView(next, forms.moveIn, forms.moveOut);
    if (next.status === 'sent' && isFullyPriced(after)) {
      next = applyTransition(next, 'priced', after, now);
      notifyRecipient(next.landlordEmail, 'conditions_report_priced', {
        subject: '💵 Your conditions report has been priced',
        text: `The damage on the conditions report for ${next.propertyAddress || 'your property'}`
          + ` has been priced against quote ${priced.quoteId}. Open your Landlord portal to `
          + 'review it and, when you are ready, give it to your tenant.',
        sms: 'Your conditions report has been priced. Review it in your Landlord portal.',
      }).catch(() => {});
    }

    await kv.set(reportKey(next.landlordEmail, next.id), next);

    return c.json({
      success: true,
      report: await readReportView(next),
      // Said out loud rather than swallowed: a line nobody assigned is a figure
      // that did not reach the statement, and an area still unpriced is why the
      // arithmetic is refusing to total.
      unassigned: priced.unassigned,
      stillUnpriced: priced.stillUnpriced,
    });
  } catch (error: any) {
    console.log('Conditions report pricing error:', error);
    return c.json({ success: false, error: error.message || 'Unable to price the report.' }, 500);
  }
});

rentalRouter.delete('/make-server-3eae23a6/landlord/conditions-reports/:id', async (c) => {
  try {
    const found = await reportFor(c, c.req.param('id'));
    if ('error' in found) return c.json({ success: false, error: found.error }, found.code);
    const record = found.record;
    if (record.status === 'shared') {
      return c.json({
        success: false,
        error: 'This report has been given to the tenant. Deleting it would remove a statement '
          + 'somebody is relying on.',
      }, 409);
    }
    await kv.del(reportKey(record.landlordEmail, record.id));
    if (record.tenantEmail) {
      const key = reportKey(record.landlordEmail, record.id);
      const index = (await kv.get(tenantReportsKey(record.tenantEmail)) as string[]) || [];
      await kv.set(tenantReportsKey(record.tenantEmail), index.filter((k) => k !== key));
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || 'Unable to delete the report.' }, 500);
  }
});

/**
 * What a tenant can read: the reports their landlord chose to share, in full.
 *
 * The status is checked as well as the index, so a report reopened or unshared
 * stops being readable even if the index has not caught up. Two gates rather
 * than one, because this is somebody else's money being accounted for.
 */
rentalRouter.get('/make-server-3eae23a6/tenant/conditions-reports', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to view your reports.' }, 401);
    const email = String(user.email).toLowerCase();
    const keys = (await kv.get(tenantReportsKey(email)) as string[]) || [];
    if (!keys.length) return c.json({ success: true, reports: [] });

    const records = ((await kv.mget(keys)) as ConditionsReportRecord[] || []).filter(Boolean);
    const mine = records.filter((r) => String(r.tenantEmail || '').toLowerCase() === email
      && r.status === 'shared');
    const views = await Promise.all(mine.map(readReportView));
    views.sort((a, b) => String(b.record.sharedAt || '').localeCompare(String(a.record.sharedAt || '')));
    return c.json({ success: true, reports: views.map(tenantCopy) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || 'Unable to load your reports.' }, 500);
  }
});

rentalRouter.get('/make-server-3eae23a6/tenant/forms', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to view your forms.' }, 401);
    const forms = await readFormsFor(tenantFormsKey(user.email));
    return c.json({ success: true, forms: forms.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load your forms.' }, 500); }
});

rentalRouter.patch('/make-server-3eae23a6/tenant/forms/:id/complete', async (c) => {
  try {
    const user = await intakeActor(c);
    if (!user?.email) return c.json({ success: false, error: 'Sign in to complete this form.' }, 401);
    const id = c.req.param('id');
    const form = await kv.get(formKey(id)) as any;
    if (!form) return c.json({ success: false, error: 'Form not found.' }, 404);
    if (String(user.email).toLowerCase() !== String(form.tenantEmail || '').toLowerCase()) return c.json({ success: false, error: 'This form was not sent to you.' }, 403);
    const body = stripBase64(await c.req.json().catch(() => ({})));
    const signature = String(body.signature || '').trim().slice(0, 200);
    if (!signature) return c.json({ success: false, error: 'Type your full legal name to sign.' }, 400);
    const now = new Date().toISOString();
    const updated = { ...form, tenantResponses: body.tenantResponses && typeof body.tenantResponses === 'object' ? body.tenantResponses : form.tenantResponses, signature, status: 'completed', completedAt: now, updatedAt: now };
    await kv.set(formKey(id), updated);
    if (form.landlordEmail) {
      const who = form.tenantName || signature || String(user.email);
      notifyRecipient(String(form.landlordEmail), 'form_completed', {
        subject: `✅ ${who} completed "${form.title}"`,
        text: `${who} completed and signed the form "${form.title}".\n\nSigned as: ${signature}\nDate: ${new Date(now).toLocaleString()}\n\nOpen your Landlord portal to review it.`,
        sms: `${who} completed the form "${form.title}". Review it in your portal.`,
      }).catch(() => {});
    }
    return c.json({ success: true, form: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to complete the form.' }, 500); }
});

function propertyPortfolioKey(email: string) { return `property_manager_portfolio:${String(email).toLowerCase()}`; }

rentalRouter.get('/make-server-3eae23a6/property-manager/properties', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in to view your property portfolio.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const email = String(actor.user.email).toLowerCase();
    const saved = (await kv.get(propertyPortfolioKey(email)) as any[]) || [];
    // Read compatible legacy records only when they are already explicitly assigned;
    // do not expose the old shared collection to a portal user.
    const legacy = (await kv.get('properties') as any[]) || [];
    const compatible = legacy.filter((property: any) => assignedToPropertyManager(property, actor.user));
    const seen = new Set(saved.map((property: any) => String(property.id)));
    const properties = [...saved, ...compatible.filter((property: any) => !seen.has(String(property.id)))];
    return c.json({ success: true, properties: properties.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load properties.' }, 500); }
});

rentalRouter.post('/make-server-3eae23a6/property-manager/properties', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user?.email) return c.json({ success: false, error: 'Sign in before adding a property.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const body = stripBase64(await c.req.json());
    const name = String(body.name || '').trim();
    const address = String(body.address || '').trim();
    const suppliedUnits = Number(body.units);
    const suppliedOccupied = Number(body.occupied || 0);
    if (!name) return c.json({ success: false, error: 'Property name is required.' }, 400);
    if (!address) return c.json({ success: false, error: 'Property address is required.' }, 400);
    if (!Number.isFinite(suppliedUnits) || suppliedUnits < 1) return c.json({ success: false, error: 'Enter at least one unit.' }, 400);
    if (!Number.isFinite(suppliedOccupied) || suppliedOccupied < 0) return c.json({ success: false, error: 'Occupied units must be zero or greater.' }, 400);
    const units = Math.floor(suppliedUnits);
    const occupied = Math.min(units, Math.floor(suppliedOccupied));
    const now = new Date().toISOString();
    const property = { id: `property_${crypto.randomUUID()}`, name, address, units, occupied, ownerEmail: actor.user.email, propertyManagerEmail: actor.user.email, propertyManagerUserId: actor.user.id, createdAt: now, updatedAt: now };
    const key = propertyPortfolioKey(actor.user.email);
    const existing = (await kv.get(key) as any[]) || [];
    await kv.set(key, [property, ...existing]);
    return c.json({ success: true, property }, 201);
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to add property.' }, 500); }
});

rentalRouter.get('/make-server-3eae23a6/property-manager/work-requests', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in to view property work requests.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const requests = await readWorkRequests();
    const scoped = actor.admin ? requests : requests.filter((record: any) => assignedToPropertyManager(record, actor.user));
    return c.json({ success: true, workRequests: scoped.map(stripBase64) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to load property work requests.' }, 500); }
});

rentalRouter.patch('/make-server-3eae23a6/property-manager/work-requests/:id/decision', async (c) => {
  try {
    const actor = await propertyManagerActor(c);
    if (!actor.user) return c.json({ success: false, error: 'Sign in before making a decision.' }, 401);
    if (!actor.manager) return c.json({ success: false, error: 'An active property-manager portal is required.' }, 403);
    const record = await kv.get(`wr:${c.req.param('id')}`) as any;
    if (!record) return c.json({ success: false, error: 'Work request not found.' }, 404);
    if (!actor.admin && !assignedToPropertyManager(record, actor.user)) return c.json({ success: false, error: 'This request is not assigned to your property-management account.' }, 403);
    const body = await c.req.json();
    const decision = String(body.decision || '').toLowerCase();
    if (!['approved', 'rejected'].includes(decision)) return c.json({ success: false, error: 'Decision must be approved or rejected.' }, 400);
    const now = new Date().toISOString();
    const history = Array.isArray(record.approvalHistory) ? record.approvalHistory : [];
    const updated = {
      ...record,
      status: decision,
      approvalHistory: [...history, { status: decision, note: String(body.note || '').slice(0, 2000), actorEmail: actor.user.email, decidedAt: now }],
      lastDecisionBy: actor.user.email,
      lastDecisionAt: now,
      updated_at: now,
    };
    await persistWorkRequest(updated);
    return c.json({ success: true, workRequest: stripBase64(updated) });
  } catch (error: any) { return c.json({ success: false, error: error.message || 'Unable to update work request.' }, 500); }
});
