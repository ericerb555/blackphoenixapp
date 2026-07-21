/**
 * Plans — persistence, real-time tracking, and cross-system linking.
 *
 * Every plan built by the AI Plan Builder (in a portal OR during an application)
 * is persisted here so it can be:
 *   • tracked in real time inside the owner's portal (polled),
 *   • searched as a record in the admin command center,
 *   • tied to HOURS (an hour allotment + usage log),
 *   • tied to GIFT CARDS (a welcome giveaway issued on creation),
 *   • tied to PROMOTIONS and OFFERS (auto-applied at creation).
 *
 * KV layout:
 *   plan:{id}                 → the full plan record (source of truth)
 *   plan_usage:{id}:{entryId} → individual hour-usage entries for a plan
 *   giftcard:{code}           → gift cards issued by a plan (also embedded in plan)
 *
 * Routes are registered with full "/make-server-57095a78/plans" prefixes and the
 * router is mounted at "/" in index.tsx (same convention as companiesRouter).
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';
import { recordEntitlementEvent } from './entitlements.tsx';

const plansRouter = new Hono();

plansRouter.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const PLAN_PREFIX = 'plan:';
const USAGE_PREFIX = (planId: string) => `plan_usage:${planId}:`;

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function genCode(segments = 4, len = 4) {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: segments }, () =>
    Array.from({ length: len }, () => alpha[Math.floor(Math.random() * alpha.length)]).join(''),
  ).join('-');
}

const AVG_HOURLY = 85; // used to derive an hour allotment from the plan's monthly value

/**
 * Auto-provision the cross-system links for a new plan:
 * hours allotment, a welcome gift card giveaway, and eligible promotions/offers.
 */
function provisionLinks(input: any) {
  const monthlyTotal = Number(input.monthlyTotal) || 0;
  const serviceCount = Array.isArray(input.serviceIds) ? input.serviceIds.length : 0;

  // HOURS — an included monthly allotment derived from plan value + service count.
  const includedHours = Math.max(2, Math.round(monthlyTotal / AVG_HOURLY) + serviceCount);
  const hours = {
    included: includedHours,
    used: 0,
    overageRate: 95,
    bankId: genId('HRS'),
  };

  // GIFT CARD — a welcome giveaway scaled to plan value (min $25, cap $250).
  const giftAmount = Math.min(250, Math.max(25, Math.round(monthlyTotal * 0.1)));
  const giftCard = {
    code: genCode(),
    amount: giftAmount,
    balance: giftAmount,
    reason: 'Welcome giveaway for building a plan',
    issuedAt: new Date().toISOString(),
  };

  // PROMOTIONS — applied automatically at creation.
  const promotions = [
    {
      code: 'NEWPLAN10',
      name: 'New Plan Bonus',
      discount: '10% off first 3 months',
    },
  ];
  if ((input.frequencyId || '') === 'annual') {
    promotions.push({ code: 'ANNUAL28', name: 'Annual Commitment', discount: '28% savings locked in' });
  }

  // OFFERS — perks unlocked by having an active plan.
  const offers = [
    { code: 'PRIORITY', title: 'Priority Scheduling', description: 'Plan members jump the queue for service.' },
    { code: 'REFER50', title: 'Referral Reward', description: 'Give $50, get $50 for every referral.' },
  ];

  return { hours, giftCards: [giftCard], promotions, offers };
}

function searchHaystack(plan: any): string {
  return [
    plan.id,
    plan.planName,
    plan.owner,
    plan.portalType,
    plan.entity,
    plan.status,
    ...(plan.serviceNames || []),
    ...(plan.giftCards || []).map((g: any) => g.code),
    ...(plan.promotions || []).map((p: any) => p.code),
    ...(plan.offers || []).map((o: any) => o.code),
  ].filter(Boolean).join(' ').toLowerCase();
}

// ─── routes ───────────────────────────────────────────────────────────────────

plansRouter.get('/make-server-57095a78/plans/test', (c) =>
  c.json({ success: true, message: 'Plans service running', timestamp: new Date().toISOString() }),
);

/**
 * POST /plans — create & persist a plan, auto-linking hours/gift cards/promos/offers.
 */
plansRouter.post('/make-server-57095a78/plans', async (c) => {
  try {
    const body = await c.req.json();

    const id = genId('PLAN');
    const now = new Date().toISOString();
    const links = provisionLinks(body);

    const plan = {
      id,
      planName: body.planName || 'Custom Maintenance Plan',
      portalType: body.portalType || 'customer',
      entity: body.entity || 'homeowner',
      skillId: body.skillId || 'journeyman',
      frequencyId: body.frequencyId || 'monthly',
      serviceIds: Array.isArray(body.serviceIds) ? body.serviceIds : [],
      serviceNames: Array.isArray(body.serviceNames) ? body.serviceNames : [],
      monthlyTotal: Number(body.monthlyTotal) || 0,
      annualTotal: Number(body.annualTotal) || (Number(body.monthlyTotal) || 0) * 12,
      owner: body.owner || null,
      ownerEmail: body.ownerEmail || null,
      source: body.source || 'portal', // 'portal' | 'application'
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...links,
      rewards: { points: Math.round((Number(body.monthlyTotal) || 0) / 5) },
      history: [{ ts: now, type: 'created', note: 'Plan created via AI builder' }],
    };

    await kv.set(`${PLAN_PREFIX}${id}`, plan);
    // Persist the welcome gift card as a first-class record too.
    for (const g of plan.giftCards) {
      await kv.set(`giftcard:${g.code}`, { ...g, planId: id, owner: plan.owner });
    }

    console.log(`[Plans] Created ${id} for ${plan.owner || 'unknown'} (${plan.portalType}), monthly $${plan.monthlyTotal}`);
    return c.json({ success: true, plan });
  } catch (error: any) {
    console.error('[Plans] Create error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to create plan' }, 500);
  }
});

/**
 * GET /plans — list/search plans.
 * Query: ?search= ?owner= ?portalType= ?status=
 */
plansRouter.get('/make-server-57095a78/plans', async (c) => {
  try {
    const search = (c.req.query('search') || '').trim().toLowerCase();
    const owner = (c.req.query('owner') || '').trim().toLowerCase();
    const portalType = (c.req.query('portalType') || '').trim();
    const status = (c.req.query('status') || '').trim();

    let plans: any[] = (await kv.getByPrefix(PLAN_PREFIX)) || [];

    if (owner) plans = plans.filter(p => (p.owner || '').toLowerCase() === owner);
    if (portalType) plans = plans.filter(p => p.portalType === portalType);
    if (status) plans = plans.filter(p => p.status === status);
    if (search) plans = plans.filter(p => searchHaystack(p).includes(search));

    plans.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return c.json({ success: true, count: plans.length, plans });
  } catch (error: any) {
    console.error('[Plans] List error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to list plans', plans: [] }, 500);
  }
});

/**
 * GET /plans/:id — single plan with its usage log.
 */
plansRouter.get('/make-server-57095a78/plans/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const plan = await kv.get(`${PLAN_PREFIX}${id}`);
    if (!plan) return c.json({ success: false, error: 'Plan not found' }, 404);
    const usage = (await kv.getByPrefix(USAGE_PREFIX(id))) || [];
    usage.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    return c.json({ success: true, plan, usage });
  } catch (error: any) {
    console.error('[Plans] Get error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to get plan' }, 500);
  }
});

/**
 * PATCH /plans/:id — update status / plan fields.
 */
plansRouter.patch('/make-server-57095a78/plans/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const plan = await kv.get(`${PLAN_PREFIX}${id}`);
    if (!plan) return c.json({ success: false, error: 'Plan not found' }, 404);

    const patch = await c.req.json();
    const now = new Date().toISOString();
    const allowed = ['planName', 'status', 'skillId', 'frequencyId', 'monthlyTotal', 'annualTotal', 'serviceIds', 'serviceNames'];
    for (const k of allowed) if (k in patch) (plan as any)[k] = patch[k];
    plan.updatedAt = now;
    plan.history = [...(plan.history || []), { ts: now, type: 'updated', note: patch.note || 'Plan updated' }];

    await kv.set(`${PLAN_PREFIX}${id}`, plan);
    return c.json({ success: true, plan });
  } catch (error: any) {
    console.error('[Plans] Patch error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to update plan' }, 500);
  }
});

/**
 * POST /plans/:id/usage — log hours used (ties the plan to the hours system).
 */
plansRouter.post('/make-server-57095a78/plans/:id/usage', async (c) => {
  try {
    const id = c.req.param('id');
    const plan = await kv.get(`${PLAN_PREFIX}${id}`);
    if (!plan) return c.json({ success: false, error: 'Plan not found' }, 404);

    const body = await c.req.json();
    const hours = Number(body.hours) || 0;
    const now = new Date().toISOString();
    const entry = {
      id: genId('USE'),
      planId: id,
      date: body.date || now,
      description: body.description || 'Service visit',
      hours,
      tech: body.tech || null,
    };
    await kv.set(`${USAGE_PREFIX(id)}${entry.id}`, entry);
    const ledger = await recordEntitlementEvent({
      planId: id, sourceType: 'work_usage', sourceId: entry.id, hoursDelta: -hours,
      note: entry.description, workOrderId: body.workOrderId, timeEntryId: body.timeEntryId,
      contractId: body.contractId, invoiceId: body.invoiceId,
    });

    plan.hours = plan.hours || { included: 0, used: 0, overageRate: 95 };
    plan.hours.used = Number(plan.hours.used || 0) + hours;
    plan.updatedAt = now;
    plan.history = [...(plan.history || []), { ts: now, type: 'usage', note: `${hours}h — ${entry.description}` }];
    await kv.set(`${PLAN_PREFIX}${id}`, plan);

    return c.json({ success: true, entry, hours: plan.hours, entitlement: ledger.balance });
  } catch (error: any) {
    console.error('[Plans] Usage error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to log usage' }, 500);
  }
});

/**
 * DELETE /plans/:id — cancel/remove a plan.
 */
plansRouter.delete('/make-server-57095a78/plans/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`${PLAN_PREFIX}${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Plans] Delete error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to delete plan' }, 500);
  }
});

/**
 * GET /plans-stats — quick aggregate for command-center header cards.
 */
plansRouter.get('/make-server-57095a78/plans-stats', async (c) => {
  try {
    const plans: any[] = (await kv.getByPrefix(PLAN_PREFIX)) || [];
    const active = plans.filter(p => p.status === 'active');
    const mrr = active.reduce((s, p) => s + (Number(p.monthlyTotal) || 0), 0);
    const giftIssued = plans.reduce((s, p) => s + (p.giftCards || []).reduce((g: number, x: any) => g + (Number(x.amount) || 0), 0), 0);
    const hoursIncluded = active.reduce((s, p) => s + (Number(p.hours?.included) || 0), 0);
    const hoursUsed = active.reduce((s, p) => s + (Number(p.hours?.used) || 0), 0);
    return c.json({
      success: true,
      stats: { total: plans.length, active: active.length, mrr, giftIssued, hoursIncluded, hoursUsed },
    });
  } catch (error: any) {
    console.error('[Plans] Stats error:', error);
    return c.json({ success: false, error: error?.message || 'Failed to compute stats' }, 500);
  }
});

export default plansRouter;
