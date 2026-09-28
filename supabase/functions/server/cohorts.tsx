// Cohort Management API Routes
// Enterprise-grade cohort pricing and subscription management
//
// `kv.getByPrefix` RETURNS THE VALUES, NOT `{ key, value }` ROWS.
//
// This file read them as rows — `item.value.monthlyRevenue`, and a
// `.map(item => item.value)` that produced an array of `undefined`. Every one
// of those would throw `Cannot read properties of undefined` the moment a
// single cohort existed; the whole module survived only because the table has
// always held zero of them. Thirty-odd occurrences across this file and
// `territory-cohorts.tsx`, all fixed together.
//
// It matters more now than it did: cohorts is becoming the system of record
// for money, so these paths are about to run for real. If a value list ever
// needs its keys, `kv.getKeysByPrefix` exists for that.
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { requireStaffOn } from './requireStaff.ts';
import { priceFor, spotsRemaining, monthlyRevenueOf, cohortFromTier, withoutMoneyFigures } from './cohortPricing.ts';
import { accountStanding, mayDeactivate } from './accountStanding.ts';
import { trustedRole } from './trustedRole.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * The applications people actually submit. The same key the Application
 * Submissions screen reads — there is only one queue, and a second one would
 * let the two screens disagree about who is still waiting.
 */
const APPLICATIONS_KEY = 'applications';

const admin = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/**
 * Who is making this request.
 *
 * `requireStaffOn` has already refused anybody who is not staff, so this is
 * about WHICH member of staff — needed because deactivating an account is a
 * decision with a name on it, and because `mayDeactivate` asks what the
 * actor's role is before allowing it.
 */
async function staffActor(c: any): Promise<any | null> {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const { data, error } = await admin().auth.getUser(token);
    return error ? null : data?.user ?? null;
  } catch {
    return null;
  }
}

const staffEmail = async (c: any): Promise<string> =>
  String((await staffActor(c))?.email || '').toLowerCase() || 'unknown';

/**
 * Every membership, read once.
 *
 * A membership is a `feature_grant` that names a cohort. Revenue and
 * subscriber counts are worked out from these rather than read off the cohort
 * record, because a stored figure is whatever was last written and drifts
 * from what is actually being paid without saying so — which is how a
 * fabricated P&L reached the money screen before.
 *
 * Loaded in one pass and handed to the helpers below, so a page showing ten
 * cohorts does not read every grant ten times.
 */
async function loadMemberships(): Promise<Array<{ cohortId?: string; status?: string; seats?: number }>> {
  const grants = ((await kv.getByPrefix('feature_grant:')) as any[] || []).filter(Boolean);
  return grants.map((g) => ({
    cohortId: g?.cohortId,
    // A grant's Stripe status is what says whether money is moving. An absent
    // one is treated as active, matching how the rest of the server reads it.
    status: g?.lastSubscriptionStatus ?? g?.status ?? 'active',
    seats: Number(g?.seats ?? 1),
  }));
}

/** How many accounts actually hold this cohort, paying. */
const subscribersOf = (
  cohort: any,
  memberships: Array<{ cohortId?: string; status?: string }>,
): number => memberships.filter(
  (m) => String(m?.cohortId ?? '') === String(cohort?.id ?? '')
    && String(m?.status ?? 'active').toLowerCase() === 'active',
).length;

/**
 * A cohort as the screens want it: what it charges, plus what it actually
 * earns and how many hold it — derived, never stored.
 */
const withDerivedFigures = (
  cohort: any,
  memberships: Array<{ cohortId?: string; status?: string; seats?: number }>,
) => ({
  ...cohort,
  monthlyRevenue: monthlyRevenueOf(cohort, memberships),
  activeSubscribers: subscribersOf(cohort, memberships),
  spotsRemaining: spotsRemaining(cohort),
});

export const cohortsRouter = new Hono();

// A cohort is a subscription tier: its price, how many spots are left, what it
// earns, who is behind on payment and whose account gets shut off. That is the
// company's own pricing and revenue, so it is staff-only — every vendor,
// subcontractor and portal customer is signed in, and being signed in is not
// the same as working here.
//
// Scoped to this router's own paths rather than `use("*")`. See the note on
// `requireStaffOn`: a wildcard on a router mounted near the root runs on every
// request the server receives, which once took the whole API staff-only.
cohortsRouter.use('*', requireStaffOn(['/make-server-3eae23a6/cohorts']));

const COHORT_PREFIX = 'cohort_';
const COHORT_ANALYTICS_PREFIX = 'cohort_analytics_';

// Get all cohorts
cohortsRouter.get('/cohorts', async (c) => {
  try {
    const [raw, memberships] = await Promise.all([
      kv.getByPrefix(COHORT_PREFIX),
      loadMemberships(),
    ]);
    const cohorts = raw.map((cohort) => withDerivedFigures(cohort, memberships));

    return c.json({
      success: true,
      cohorts,
      count: cohorts.length
    });
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch cohorts',
      cohorts: []
    }, 500);
  }
});


// Create new cohort
cohortsRouter.post('/cohorts', async (c) => {
  try {
    const cohortData = await c.req.json();
    
    // Generate ID if not provided
    const cohortId = cohortData.id || `cohort-${Date.now()}`;
    
    /**
     * MONEY FIGURES ARE NOT ACCEPTED FROM THE REQUEST.
     *
     * This used to take `monthlyRevenue`, `activeSubscribers`, `churnRate`,
     * `conversionRate` and `averageLTV` straight off the body and store them.
     * That is exactly how twelve invented cohorts once put close to a million
     * dollars of monthly revenue onto the company's own P&L screen — the
     * seeding route simply POSTed the figures and they were believed.
     *
     * A cohort now describes what it CHARGES. What it earns is derived from
     * the memberships that point at it, by `monthlyRevenueOf`, and cannot be
     * written by anybody. Stripping them here rather than ignoring them later
     * means there is no field for a fabricated number to live in.
     */
    const describedByCaller = withoutMoneyFigures(cohortData ?? {});

    const cohort: Record<string, any> = {
      ...describedByCaller,
      id: cohortId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to database
    await kv.set(`${COHORT_PREFIX}${cohortId}`, cohort);
    
    console.log(`Created cohort: ${cohort.name} (${cohortId})`);
    
    return c.json({
      success: true,
      cohort,
      message: 'Cohort created successfully'
    });
  } catch (error) {
    console.error('Error creating cohort:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create cohort' 
    }, 500);
  }
});





// Bulk update cohorts (for migrations or mass changes)
cohortsRouter.post('/cohorts/bulk-update', async (c) => {
  try {
    const { updates } = await c.req.json();
    
    const results = [];
    
    for (const update of updates) {
      try {
        const existing = await kv.get(`${COHORT_PREFIX}${update.id}`);
        if (existing) {
          const updated = {
            ...existing,
            ...withoutMoneyFigures(update ?? {}),
            id: update.id,
            updatedAt: new Date().toISOString()
          };
          await kv.set(`${COHORT_PREFIX}${update.id}`, updated);
          results.push({ id: update.id, success: true });
        } else {
          results.push({ id: update.id, success: false, error: 'Not found' });
        }
      } catch (err) {
        results.push({ id: update.id, success: false, error: err.message });
      }
    }
    
    return c.json({
      success: true,
      results,
      updated: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Error bulk updating cohorts:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to bulk update cohorts' 
    }, 500);
  }
});


// Get active cohorts only
cohortsRouter.get('/cohorts/status/active', async (c) => {
  try {
    const allCohorts = await kv.getByPrefix(COHORT_PREFIX);
    
    const active = allCohorts
      .filter(cohort => cohort.status === 'active');
    
    return c.json({
      success: true,
      cohorts: active,
      count: active.length
    });
  } catch (error) {
    console.error('Error fetching active cohorts:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch active cohorts' 
    }, 500);
  }
});

/**
 * Who is behind on payment — derived, not stored.
 *
 * This read one key called `cohorts_overdue_accounts` with a comment saying
 * the real thing would come from the payment processor. It always returned an
 * empty list, so the overdue screen said nobody was behind regardless of who
 * was.
 *
 * The real answer already exists: `accountStanding` decides whether an
 * account is `ok`, `warning`, `frozen` or `deactivated`, from the Stripe
 * status on its grant and Eric's fifteen-day rule. It is the same judgement
 * the portal gate uses, so the overdue list and the locked door can no longer
 * disagree about who is behind — which they would if this had its own idea.
 */
cohortsRouter.get('/cohorts/overdue', async (c) => {
  try {
    const keys = await kv.getKeysByPrefix('feature_grant:');
    const emails = keys.map((k) => k.slice('feature_grant:'.length)).filter(Boolean);

    const overdueAccounts = [];
    for (const email of emails) {
      const [grant, deactivation] = await Promise.all([
        kv.get(`feature_grant:${email}`).catch(() => null),
        kv.get(`account_deactivation:${email}`).catch(() => null),
      ]);
      const standing = accountStanding({
        grant: grant as any,
        deactivation: deactivation as any,
        // The role is what exempts owners, admins and employees from a freeze.
        // It is not known from a grant alone, so nothing is exempted here and
        // the listing reports what is owed rather than who would be cut off.
        role: '',
      });
      if (standing.state === 'ok') continue;

      overdueAccounts.push({
        email,
        state: standing.state,
        reason: standing.reason,
        pastDueSince: (grant as any)?.pastDueSince ?? null,
        cohortId: (grant as any)?.cohortId ?? null,
        subscriptionStatus: (grant as any)?.lastSubscriptionStatus ?? null,
      });
    }

    return c.json({
      success: true,
      overdueAccounts,
      count: overdueAccounts.length
    });
  } catch (error) {
    console.error('Error fetching overdue accounts:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch overdue accounts',
      overdueAccounts: []
    }, 500);
  }
});

/**
 * Applications waiting on a decision — the REAL ones.
 *
 * This read a key called `cohorts_pending_applications` that nothing ever
 * wrote. Meanwhile the applications people actually submit live under
 * `applications`, and are what the Application Submissions screen reviews.
 *
 * So this now reads that store rather than a second one. Two application
 * queues would be worse than none: somebody would approve in one screen and
 * the other would still show it pending.
 */
cohortsRouter.get('/cohorts/applications', async (c) => {
  try {
    const all = ((await kv.get(APPLICATIONS_KEY)) as any[]) || [];
    const applications = all.filter((a) => {
      const status = String(a?.status || '').toLowerCase();
      return status === '' || status === 'new' || status === 'pending' || status === 'reviewed';
    });

    return c.json({
      success: true,
      applications,
      count: applications.length
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch applications',
      applications: []
    }, 500);
  }
});

/**
 * Deciding applications, for real.
 *
 * WHAT THESE DID
 *
 * `console.log('Approving applications:', applicationIds)` and then
 * `success: true, approved: N`. Nothing was written. Somebody approving four
 * applications was told four were approved and four people were granted
 * nothing — and the queue still showed them, because the queue was reading a
 * different empty key.
 *
 * Harmless while the module was unused. Not harmless now that cohorts is the
 * system of record.
 *
 * WHY THIS WRITES TO THE SAME STORE AS THE APPLICATIONS SCREEN
 *
 * Because there is only one set of applications. The Application Submissions
 * screen already decides them, and a second decision path with its own
 * storage would let the two disagree — approved here, still pending there.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not provision the portal, the intake checklist or the provider
 * organisation. `PATCH /applications/:id` does all of that, and duplicating
 * it here would give an application approved from the cohort screen less than
 * one approved from the applications screen — the same word meaning two
 * different things. So this records the decision and says plainly that the
 * full onboarding runs through that route.
 */
const decideApplications = async (
  c: any,
  ids: unknown,
  decision: 'approved' | 'rejected',
) => {
  const wanted = (Array.isArray(ids) ? ids : []).map((id) => String(id ?? '')).filter(Boolean);
  if (wanted.length === 0) {
    return c.json({ success: false, error: 'No applications were named.' }, 400);
  }

  const all = ((await kv.get(APPLICATIONS_KEY)) as any[]) || [];
  const now = new Date().toISOString();
  const actor = await staffEmail(c);

  const changed: string[] = [];
  const missing: string[] = [];

  const updated = all.map((application: any) => {
    if (!wanted.includes(String(application?.id ?? ''))) return application;
    changed.push(String(application.id));
    return {
      ...application,
      status: decision,
      reviewedAt: now,
      reviewedBy: actor,
      updatedAt: now,
    };
  });

  for (const id of wanted) if (!changed.includes(id)) missing.push(id);

  // Written only when something actually changed, so a request naming four ids
  // that do not exist cannot rewrite the whole store for nothing.
  if (changed.length) await kv.set(APPLICATIONS_KEY, updated);

  console.log(`[cohorts] ${actor} ${decision} ${changed.length} application(s)`);

  return c.json({
    success: changed.length > 0,
    [decision === 'approved' ? 'approved' : 'rejected']: changed.length,
    changed,
    // Named rather than silently ignored: an id that matched nothing is the
    // difference between "done" and "you decided about somebody else".
    notFound: missing,
    message: changed.length
      ? `${decision === 'approved' ? 'Approved' : 'Rejected'} ${changed.length} application(s).`
        + (decision === 'approved'
          ? ' Portal access and onboarding are provisioned by the applications route.'
          : '')
      : 'None of those applications exist.',
  }, changed.length ? 200 : 404);
};

cohortsRouter.post('/cohorts/applications/approve', async (c) => {
  try {
    const { applicationIds } = await c.req.json();
    return await decideApplications(c, applicationIds, 'approved');
  } catch (error) {
    console.error('Error approving applications:', error);
    return c.json({
      success: false,
      error: 'Failed to approve applications'
    }, 500);
  }
});

cohortsRouter.post('/cohorts/applications/reject', async (c) => {
  try {
    const { applicationIds } = await c.req.json();
    return await decideApplications(c, applicationIds, 'rejected');
  } catch (error) {
    console.error('Error rejecting applications:', error);
    return c.json({
      success: false,
      error: 'Failed to reject applications'
    }, 500);
  }
});

/**
 * Shutting an account off, for real.
 *
 * WHAT THIS DID
 *
 * Logged the account id and answered "Account disabled successfully". The
 * account kept working. Of the five stubs this was the worst: a non-paying
 * account reported as cut off and still being served is a decision somebody
 * believes they made, and they stop chasing it.
 *
 * ONE MECHANISM, NOT TWO
 *
 * It now writes the SAME `account_deactivation:{email}` record that
 * `/accounts/deactivate` writes, and asks the same `mayDeactivate` who is
 * allowed to do it to whom. A second shut-off with its own storage would mean
 * an account switched off here still looked active to the portal gate, which
 * reads that one key.
 *
 * A DEACTIVATION IS NOT A FREEZE, AND THIS IS THE DEACTIVATION
 *
 * A freeze is automatic, about money, and lifts itself when the account pays.
 * This is the manual one: somebody decided, and paying does not undo it. That
 * is the right tool for a cohort screen — the automatic freeze already
 * happens on its own fifteen days after a payment fails, with no button.
 */
cohortsRouter.post('/cohorts/accounts/shutoff', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const targetEmail = String(body?.email || body?.accountId || '').trim().toLowerCase();
    const reason = String(body?.reason || '').trim();

    if (!targetEmail.includes('@')) {
      return c.json({
        success: false,
        error: 'Which account? An email address is needed, not an id.',
      }, 400);
    }
    if (!reason) {
      return c.json({
        success: false,
        error: 'A reason is required — this is a decision somebody has to answer for later.',
      }, 400);
    }

    const actor = await staffActor(c);
    if (!actor?.email) return c.json({ success: false, error: 'Sign in required.' }, 401);

    const verdict = mayDeactivate(
      { role: trustedRole(actor), email: String(actor.email) },
      // The target's role is not known from a cohort listing, so the check is
      // made against the weakest assumption. An owner may still act; an
      // administrator is refused unless the accounts route confirms the role.
      { role: String(body?.targetRole || ''), email: targetEmail },
    );
    if (!verdict.allowed) return c.json({ success: false, error: verdict.reason }, 403);

    const record = {
      email: targetEmail,
      active: true,
      reason,
      by: String(actor.email).toLowerCase(),
      byRole: trustedRole(actor),
      targetRole: String(body?.targetRole || ''),
      at: new Date().toISOString(),
      via: 'cohorts',
    };
    await kv.set(`account_deactivation:${targetEmail}`, record);
    console.log(`[cohorts] ${actor.email} deactivated ${targetEmail}: ${reason}`);

    return c.json({
      success: true,
      message: 'Account deactivated. Paying will not lift this; it has to be reactivated.',
      deactivation: record,
    });
  } catch (error) {
    console.error('Error shutting off account:', error);
    return c.json({
      success: false,
      error: 'Failed to disable account' 
    }, 500);
  }
});

// Seeding is refused, and the reason is worth keeping.
//
// This route used to write twelve invented cohorts straight into production —
// "Vendor Starter" with 1,247 subscribers and $61,103 a month, "Home Service
// Essentials" with 847 and $126,203, close to a million dollars of monthly
// revenue in total. None of it happened. The Revenue & Monetization Hub reads
// exactly these fields, so one call to this route would have put a fabricated
// P&L on the company's own money screen, indistinguishable from a real one and
// refreshing every sixty seconds to look live.
//
// Cohorts are created by staff through POST /cohorts, which is the real path.
// The old fixture is in git history if the price list in it is ever wanted as
// a starting point — but it should be retyped as a decision, not restored as
// data.
cohortsRouter.post('/cohorts/initialize', (c) =>
  c.json({
    success: false,
    error: 'Seeding is not available. Create cohorts through POST /cohorts.',
  }, 410));

/**
 * Bring the existing plan tiers across as cohorts.
 *
 * NOT THE SEEDING ROUTE ABOVE, AND THE DIFFERENCE IS THE WHOLE POINT
 *
 * That one invented twelve cohorts with a million dollars of revenue nobody
 * had earned. This one reads the six tiers that already exist, carries their
 * real prices and their real Stripe price ids, and **writes no revenue, no
 * subscriber count, no churn and no LTV at all** — not even zero, so nothing
 * reporting money can pick up a figure that came from a migration rather than
 * from somebody paying.
 *
 * IDEMPOTENT, AND IT SAYS WHAT IT WOULD DO BEFORE IT DOES IT
 *
 * `POST` with no body reports what WOULD be created and changes nothing.
 * `{ "confirm": true }` writes. A migration of the company's pricing should
 * be readable before it is run, and re-runnable without doubling anything:
 * each cohort's id is derived from its tier, so a second run updates rather
 * than duplicates.
 *
 * Existing cohorts are never overwritten. If somebody has edited one since
 * the last run, that edit is theirs and this leaves it alone.
 */
cohortsRouter.post('/cohorts/migrate-tiers', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const confirm = body?.confirm === true;

    const tiers = ((await kv.getByPrefix('plan_tier:')) as any[] || []).filter(Boolean);
    if (tiers.length === 0) {
      return c.json({ success: false, error: 'There are no plan tiers to migrate.' }, 404);
    }

    const planned: any[] = [];
    const skipped: any[] = [];

    for (const tier of tiers) {
      const cohort = cohortFromTier(tier);
      const existing = await kv.get(`${COHORT_PREFIX}${cohort.id}`);
      if (existing) {
        skipped.push({ id: cohort.id, name: cohort.name, why: 'already exists' });
        continue;
      }
      planned.push(cohort);
    }

    if (!confirm) {
      return c.json({
        success: true,
        dryRun: true,
        wouldCreate: planned.map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice })),
        skipped,
        message: `${planned.length} cohort(s) would be created from ${tiers.length} tier(s). `
          + 'No revenue or subscriber figures are carried across. Send { "confirm": true } to apply.',
      });
    }

    for (const cohort of planned) await kv.set(`${COHORT_PREFIX}${cohort.id}`, cohort);
    const actor = await staffEmail(c);
    console.log(`[cohorts] ${actor} migrated ${planned.length} tier(s) to cohorts`);

    return c.json({
      success: true,
      created: planned.length,
      cohorts: planned.map((p) => ({ id: p.id, name: p.name, basePrice: p.basePrice })),
      skipped,
      message: `Created ${planned.length} cohort(s) from existing tiers. `
        + 'Revenue and subscriber counts are derived from memberships, not seeded.',
    });
  } catch (error) {
    console.error('Error migrating tiers to cohorts:', error);
    return c.json({ success: false, error: 'Failed to migrate tiers' }, 500);
  }
});

// Health check for cohorts system
cohortsRouter.get('/cohorts/health', async (c) => {
  try {
    const cohorts = await kv.getByPrefix(COHORT_PREFIX);
    const memberships = await loadMemberships();
    const totalRevenue = cohorts.reduce((sum, item) => sum + monthlyRevenueOf(item, memberships), 0);
    const totalSubscribers = cohorts.reduce((sum, item) => sum + subscribersOf(item, memberships), 0);

    return c.json({
      success: true,
      status: 'healthy',
      stats: {
        totalCohorts: cohorts.length,
        totalRevenue,
        totalSubscribers,
        servicePlanCohorts: cohorts.filter(c => c.type === 'service_plan').length,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking cohorts health:', error);
    return c.json({ 
      success: false, 
      error: 'Health check failed' 
    }, 500);
  }
});

// Revenue Analytics - Get comprehensive revenue data
cohortsRouter.get('/cohorts/revenue/analytics', async (c) => {
  try {
    const cohorts = await kv.getByPrefix(COHORT_PREFIX);
    
    // Calculate revenue by category
    const revenueByCategory = {
      customer: 0,
      construction: 0,
      'property-management': 0,
      vendor: 0,
      subcontractor: 0,
      advertiser: 0,
      service_plan: 0,
      other: 0
    };

    const revenueByTier = {
      starter: 0,
      professional: 0,
      enterprise: 0
    };

    let totalMRR = 0;
    let totalARR = 0;
    let totalActiveSubscribers = 0;
    let totalFoundingMembers = 0;
    let foundingMemberRevenue = 0;
    let regularRevenue = 0;

    cohorts.forEach(item => {
      const cohort = item;
      const revenue = cohort.monthlyRevenue || 0;
      const subscribers = cohort.activeSubscribers || 0;
      
      totalMRR += revenue;
      totalActiveSubscribers += subscribers;

      // Category breakdown
      const category = cohort.category || cohort.type || 'other';
      if (revenueByCategory.hasOwnProperty(category)) {
        revenueByCategory[category] += revenue;
      } else {
        revenueByCategory.other += revenue;
      }

      // Tier breakdown (if available)
      if (cohort.tier && revenueByTier.hasOwnProperty(cohort.tier)) {
        revenueByTier[cohort.tier] += revenue;
      }

      // Founding member tracking
      if (cohort.foundingMemberCount) {
        totalFoundingMembers += cohort.foundingMemberCount;
        foundingMemberRevenue += cohort.foundingMemberRevenue || 0;
      }
    });

    totalARR = totalMRR * 12;
    regularRevenue = totalMRR - foundingMemberRevenue;

    // Calculate growth metrics
    const averageRevenuePerSubscriber = totalActiveSubscribers > 0 
      ? totalMRR / totalActiveSubscribers 
      : 0;

    // Top performing cohorts
    const topCohorts = cohorts
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || item.type,
        revenue: item.monthlyRevenue || 0,
        subscribers: item.activeSubscribers || 0,
        growthRate: item.growthRate || 0,
        churnRate: item.churnRate || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return c.json({
      success: true,
      analytics: {
        overview: {
          totalMRR,
          totalARR,
          totalActiveSubscribers,
          totalCohorts: cohorts.length,
          averageRevenuePerSubscriber,
          totalFoundingMembers,
          foundingMemberRevenue,
          regularRevenue
        },
        revenueByCategory,
        revenueByTier,
        topCohorts,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch revenue analytics' 
    }, 500);
  }
});



// Get revenue trends over time
cohortsRouter.get('/cohorts/revenue/trends', async (c) => {
  try {
    // In a real implementation, this would query historical data
    // For now, we'll return current snapshot with projected trends
    const cohorts = await kv.getByPrefix(COHORT_PREFIX);
    
    const currentMRR = cohorts.reduce((sum, item) => 
      sum + (item.monthlyRevenue || 0), 0
    );

    const avgGrowthRate = cohorts.reduce((sum, item) => 
      sum + (item.growthRate || 0), 0
    ) / cohorts.length;

    // Project next 6 months
    const projections = [];
    let projectedMRR = currentMRR;
    
    for (let i = 0; i < 6; i++) {
      projectedMRR *= (1 + avgGrowthRate / 100);
      projections.push({
        month: i + 1,
        projectedMRR: Math.round(projectedMRR),
        projectedARR: Math.round(projectedMRR * 12)
      });
    }

    return c.json({
      success: true,
      trends: {
        currentMRR,
        currentARR: currentMRR * 12,
        averageGrowthRate: avgGrowthRate,
        projections
      }
    });
  } catch (error) {
    console.error('Error fetching revenue trends:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch revenue trends' 
    }, 500);
  }
});


// ---------------------------------------------------------------------------
// Parameterised routes, registered last, and that is not a style choice.
//
// Hono resolves by REGISTRATION ORDER, not by specificity. While `/cohorts/:id`
// was declared near the top of this file it swallowed `/cohorts/health`,
// `/cohorts/overdue` and `/cohorts/applications` — each answered "Cohort not
// found" for an id of "health" — and `/cohorts/:id/analytics` swallowed
// `/cohorts/revenue/analytics` with an id of "revenue". Three of those four are
// called by the Revenue & Monetization Hub, so the screen would have stayed
// empty and looked like a data problem rather than a routing one.
//
// So: a route with a literal path goes above this line, a route with a
// `:param` in it goes below. Adding a parameterised one above is how the bug
// comes back, and it comes back silently.
// ---------------------------------------------------------------------------

// Get single cohort by ID
cohortsRouter.get('/cohorts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const cohort = await kv.get(`${COHORT_PREFIX}${id}`);
    
    if (!cohort) {
      return c.json({
        success: false,
        error: 'Cohort not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      cohort
    });
  } catch (error) {
    console.error('Error fetching cohort:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch cohort' 
    }, 500);
  }
});
// Update cohort
cohortsRouter.put('/cohorts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    // Get existing cohort
    const existing = await kv.get(`${COHORT_PREFIX}${id}`);
    if (!existing) {
      return c.json({
        success: false,
        error: 'Cohort not found'
      }, 404);
    }
    
    // Merge updates. The money figures are stripped here for the same reason
    // they are on create: what a cohort earns is derived from its memberships,
    // and an edit must not be a second door onto the P&L screen.
    const cohort = {
      ...existing,
      ...withoutMoneyFigures(updates ?? {}),
      id, // Preserve ID
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt, // Preserve creation date
    };
    
    // Save updated cohort
    await kv.set(`${COHORT_PREFIX}${id}`, cohort);
    
    console.log(`Updated cohort: ${cohort.name} (${id})`);
    
    return c.json({
      success: true,
      cohort,
      message: 'Cohort updated successfully'
    });
  } catch (error) {
    console.error('Error updating cohort:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update cohort' 
    }, 500);
  }
});
// Delete cohort
cohortsRouter.delete('/cohorts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Check if cohort exists
    const cohort = await kv.get(`${COHORT_PREFIX}${id}`);
    if (!cohort) {
      return c.json({
        success: false,
        error: 'Cohort not found'
      }, 404);
    }
    
    // Delete cohort
    await kv.del(`${COHORT_PREFIX}${id}`);
    
    console.log(`Deleted cohort: ${id}`);
    
    return c.json({
      success: true,
      message: 'Cohort deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cohort:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to delete cohort' 
    }, 500);
  }
});
// Get cohort analytics
cohortsRouter.get('/cohorts/:id/analytics', async (c) => {
  try {
    const id = c.req.param('id');
    const period = c.req.query('period') || '30d';
    
    const analytics = await kv.get(`${COHORT_ANALYTICS_PREFIX}${id}_${period}`);
    
    if (!analytics) {
      // Return mock analytics if not found
      return c.json({
        success: true,
        analytics: {
          cohortId: id,
          period,
          metrics: {
            revenue: 0,
            subscribers: 0,
            churn: 0,
            mrr: 0,
            arr: 0,
            ltv: 0,
            cac: 0,
          },
          trends: []
        }
      });
    }
    
    return c.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching cohort analytics:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    }, 500);
  }
});
// Calculate dynamic pricing based on platform metrics
cohortsRouter.post('/cohorts/:id/calculate-price', async (c) => {
  try {
    const id = c.req.param('id');
    const { userCount, activeSubscribers } = await c.req.json();
    
    const cohort = await kv.get(`${COHORT_PREFIX}${id}`);
    
    if (!cohort) {
      return c.json({
        success: false,
        error: 'Cohort not found'
      }, 404);
    }
    
    /**
     * The arithmetic moved to `cohortPricing.ts` so it could be tested — see
     * the note there for the three faults it was carrying, each of which
     * produced a wrong price rather than an error. The answer shape is
     * unchanged for existing callers.
     */
    const { price, band, scalingApplied, clampedBy } = priceFor(cohort, userCount);

    return c.json({
      success: true,
      currentPrice: price,
      basePrice: cohort.basePrice,
      tier: band,
      scalingApplied,
      clampedBy,
      spotsRemaining: spotsRemaining(cohort),
      userCount,
      ...(band ? {} : { message: 'No tier found, using base price' }),
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to calculate price' 
    }, 500);
  }
});
// Get cohorts by type
cohortsRouter.get('/cohorts/type/:type', async (c) => {
  try {
    const type = c.req.param('type');
    const allCohorts = await kv.getByPrefix(COHORT_PREFIX);
    
    const filtered = allCohorts
      .filter(cohort => cohort.type === type);
    
    return c.json({
      success: true,
      cohorts: filtered,
      type,
      count: filtered.length
    });
  } catch (error) {
    console.error('Error fetching cohorts by type:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch cohorts' 
    }, 500);
  }
});
// Revenue Analytics - Get category-specific breakdown
cohortsRouter.get('/cohorts/revenue/category/:category', async (c) => {
  try {
    const category = c.req.param('category');
    const cohorts = await kv.getByPrefix(COHORT_PREFIX);
    
    const categoryCohorts = cohorts.filter(item => 
      item.category === category || item.type === category
    );

    const totalRevenue = categoryCohorts.reduce((sum, item) => 
      sum + (item.monthlyRevenue || 0), 0
    );

    const totalSubscribers = categoryCohorts.reduce((sum, item) => 
      sum + (item.activeSubscribers || 0), 0
    );

    const plans = categoryCohorts.map(item => ({
      id: item.id,
      name: item.name,
      price: item.currentPrice || item.basePrice || 0,
      subscribers: item.activeSubscribers || 0,
      revenue: item.monthlyRevenue || 0,
      status: item.status,
      tier: item.tier
    }));

    return c.json({
      success: true,
      category,
      data: {
        totalRevenue,
        totalSubscribers,
        planCount: categoryCohorts.length,
        averagePrice: plans.length > 0 ? totalRevenue / totalSubscribers : 0,
        plans
      }
    });
  } catch (error) {
    console.error('Error fetching category revenue:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch category revenue' 
    }, 500);
  }
});

/**
 * Retired. This route WAS the fabrication engine.
 *
 * It took an `activeSubscribers` count from the caller, multiplied it by the
 * cohort's price, and stored the product as `monthlyRevenue` on the record
 * that the company's P&L screen reads. In other words: tell the server how
 * many subscribers you have, and it will write the revenue down and believe
 * it forever. Nothing reconciled that figure against anybody actually paying.
 *
 * Both numbers are now derived on read from the `feature_grant` records that
 * point at the cohort — `monthlyRevenueOf` and `subscribersOf` — so there is
 * nothing left for this route to do that would not be a lie.
 *
 * It is answered rather than deleted so that a caller still pointed at it
 * gets a reason instead of a 404 that looks like a deployment problem. Its
 * only client, `updateCohortSubscribers` in `revenueService.ts`, is removed
 * in the same change; nothing in the app called that.
 */
cohortsRouter.post('/cohorts/:id/update-subscribers', (c) =>
  c.json({
    success: false,
    error:
      'Subscriber counts and revenue are derived from memberships and cannot be set. '
      + 'Attach a feature_grant to the cohort instead.',
  }, 410));
