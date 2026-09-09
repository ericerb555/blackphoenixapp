// Cohort Management API Routes
// Enterprise-grade cohort pricing and subscription management
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { requireStaffOn } from './requireStaff.ts';

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
    const cohorts = await kv.getByPrefix(COHORT_PREFIX);
    
    return c.json({
      success: true,
      cohorts: cohorts.map(item => item.value),
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
    
    // Add metadata
    const cohort = {
      ...cohortData,
      id: cohortId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeSubscribers: cohortData.activeSubscribers || 0,
      monthlyRevenue: cohortData.monthlyRevenue || 0,
      churnRate: cohortData.churnRate || 0,
      conversionRate: cohortData.conversionRate || 0,
      averageLTV: cohortData.averageLTV || 0,
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
            ...update,
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
      .map(item => item.value)
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

// Get overdue accounts (for payment tracking)
cohortsRouter.get('/cohorts/overdue', async (c) => {
  try {
    // Mock overdue accounts data - in production this would come from payment processor
    const overdueAccounts = await kv.get('cohorts_overdue_accounts') || [];
    
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

// Get pending applications (for approval management)
cohortsRouter.get('/cohorts/applications', async (c) => {
  try {
    // Mock pending applications - in production this would come from application system
    const applications = await kv.get('cohorts_pending_applications') || [];
    
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

// Approve applications
cohortsRouter.post('/cohorts/applications/approve', async (c) => {
  try {
    const { applicationIds } = await c.req.json();
    
    // In production, this would update the applications in the database
    console.log('Approving applications:', applicationIds);
    
    return c.json({
      success: true,
      approved: applicationIds.length,
      message: `Approved ${applicationIds.length} application(s)`
    });
  } catch (error) {
    console.error('Error approving applications:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to approve applications' 
    }, 500);
  }
});

// Reject applications
cohortsRouter.post('/cohorts/applications/reject', async (c) => {
  try {
    const { applicationIds } = await c.req.json();
    
    // In production, this would update the applications in the database
    console.log('Rejecting applications:', applicationIds);
    
    return c.json({
      success: true,
      rejected: applicationIds.length,
      message: `Rejected ${applicationIds.length} application(s)`
    });
  } catch (error) {
    console.error('Error rejecting applications:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to reject applications' 
    }, 500);
  }
});

// Auto-shutoff for overdue accounts
cohortsRouter.post('/cohorts/accounts/shutoff', async (c) => {
  try {
    const { accountId, reason } = await c.req.json();
    
    // In production, this would disable the account in the database
    console.log('Shutting off account:', accountId, 'Reason:', reason);
    
    return c.json({
      success: true,
      message: 'Account disabled successfully',
      accountId
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

// Health check for cohorts system
cohortsRouter.get('/cohorts/health', async (c) => {
  try {
    const cohorts = await kv.getByPrefix(COHORT_PREFIX);
    const totalRevenue = cohorts.reduce((sum, item) => sum + (item.value.monthlyRevenue || 0), 0);
    const totalSubscribers = cohorts.reduce((sum, item) => sum + (item.value.activeSubscribers || 0), 0);

    return c.json({
      success: true,
      status: 'healthy',
      stats: {
        totalCohorts: cohorts.length,
        totalRevenue,
        totalSubscribers,
        servicePlanCohorts: cohorts.filter(c => c.value.type === 'service_plan').length,
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
      const cohort = item.value;
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
        id: item.value.id,
        name: item.value.name,
        category: item.value.category || item.value.type,
        revenue: item.value.monthlyRevenue || 0,
        subscribers: item.value.activeSubscribers || 0,
        growthRate: item.value.growthRate || 0,
        churnRate: item.value.churnRate || 0
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
      sum + (item.value.monthlyRevenue || 0), 0
    );

    const avgGrowthRate = cohorts.reduce((sum, item) => 
      sum + (item.value.growthRate || 0), 0
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
    
    // Merge updates
    const cohort = {
      ...existing,
      ...updates,
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
    
    // Find applicable tier based on user count
    const currentTier = cohort.pricingTiers?.find(tier => 
      userCount >= tier.minUsers && userCount <= tier.maxUsers
    );
    
    if (!currentTier) {
      return c.json({
        success: true,
        currentPrice: cohort.basePrice,
        tier: null,
        message: 'No tier found, using base price'
      });
    }
    
    // Calculate price with tier multiplier
    let calculatedPrice = cohort.basePrice * currentTier.priceMultiplier;
    
    // Apply scaling strategy if auto-scaling enabled
    if (cohort.autoScaling) {
      switch (cohort.scalingStrategy) {
        case 'linear':
          calculatedPrice *= (1 + (userCount / 100000) * cohort.scalingMultiplier);
          break;
        case 'exponential':
          calculatedPrice *= Math.pow(cohort.scalingMultiplier, userCount / 50000);
          break;
        case 'logarithmic':
          calculatedPrice *= (1 + Math.log10(userCount / 1000) * cohort.scalingMultiplier);
          break;
      }
    }
    
    // Apply floor and ceiling
    calculatedPrice = Math.max(cohort.priceFloor, Math.min(calculatedPrice, cohort.priceCeiling));
    
    // Round to 2 decimals
    calculatedPrice = Math.round(calculatedPrice * 100) / 100;
    
    return c.json({
      success: true,
      currentPrice: calculatedPrice,
      basePrice: cohort.basePrice,
      tier: currentTier,
      scalingApplied: cohort.autoScaling,
      userCount
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
      .map(item => item.value)
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
      item.value.category === category || item.value.type === category
    );

    const totalRevenue = categoryCohorts.reduce((sum, item) => 
      sum + (item.value.monthlyRevenue || 0), 0
    );

    const totalSubscribers = categoryCohorts.reduce((sum, item) => 
      sum + (item.value.activeSubscribers || 0), 0
    );

    const plans = categoryCohorts.map(item => ({
      id: item.value.id,
      name: item.value.name,
      price: item.value.currentPrice || item.value.basePrice || 0,
      subscribers: item.value.activeSubscribers || 0,
      revenue: item.value.monthlyRevenue || 0,
      status: item.value.status,
      tier: item.value.tier
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
// Update subscriber count and recalculate revenue
cohortsRouter.post('/cohorts/:id/update-subscribers', async (c) => {
  try {
    const id = c.req.param('id');
    const { activeSubscribers, foundingMemberCount } = await c.req.json();
    
    const cohort = await kv.get(`${COHORT_PREFIX}${id}`);
    
    if (!cohort) {
      return c.json({
        success: false,
        error: 'Cohort not found'
      }, 404);
    }

    // Calculate revenue based on subscribers and pricing
    const price = cohort.currentPrice || cohort.basePrice || 0;
    const foundingPrice = cohort.foundingPrice || price;
    
    const regularSubscribers = activeSubscribers - (foundingMemberCount || 0);
    const foundingRevenue = (foundingMemberCount || 0) * foundingPrice;
    const regularRevenue = regularSubscribers * price;
    const monthlyRevenue = foundingRevenue + regularRevenue;

    // Update cohort
    const updatedCohort = {
      ...cohort,
      activeSubscribers,
      foundingMemberCount: foundingMemberCount || 0,
      foundingMemberRevenue: foundingRevenue,
      monthlyRevenue,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`${COHORT_PREFIX}${id}`, updatedCohort);

    return c.json({
      success: true,
      cohort: updatedCohort,
      message: 'Subscriber count and revenue updated successfully'
    });
  } catch (error) {
    console.error('Error updating subscribers:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update subscribers' 
    }, 500);
  }
});