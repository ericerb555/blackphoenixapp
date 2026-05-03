// Cohort Management API Routes
// Enterprise-grade cohort pricing and subscription management
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const cohortsRouter = new Hono();

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

// Initialize system with default cohorts (for demo/testing)
cohortsRouter.post('/cohorts/initialize', async (c) => {
  try {
    const defaultCohorts = [
      {
        id: 'cohort-001',
        name: 'Vendor Starter',
        description: 'Perfect for individual contractors and small vendors',
        type: 'subscription',
        category: 'general_vendor',
        status: 'active',
        basePrice: 49,
        currentPrice: 49,
        billingPeriod: 'monthly',
        currency: 'USD',
        maxSpots: 1500,
        spotsUsed: 1247,
        spotsRemaining: 253,
        scarcityLevel: 'filling',
        autoCloseWhenFull: true,
        waitlistEnabled: false,
        waitlistCount: 0,
        activeSubscribers: 1247,
        monthlyRevenue: 61103,
        churnRate: 3.2,
        conversionRate: 12.5,
        pendingApprovals: 5,
        autoApprove: true,
        paidUpCount: 1100,
        overdueCount: 147,
        autoShutoffEnabled: true,
        createdAt: '2026-01-15T08:00:00Z',
        color: '#10b981',
        isPopular: true,
      },
      {
        id: 'cohort-002',
        name: 'Vendor Professional',
        description: 'For growing businesses with multiple team members',
        type: 'subscription',
        category: 'service_provider',
        status: 'active',
        basePrice: 149,
        currentPrice: 149,
        billingPeriod: 'monthly',
        currency: 'USD',
        maxSpots: 1000,
        spotsUsed: 584,
        spotsRemaining: 416,
        scarcityLevel: 'open',
        autoCloseWhenFull: false,
        waitlistEnabled: true,
        waitlistCount: 20,
        activeSubscribers: 584,
        monthlyRevenue: 87016,
        churnRate: 2.1,
        conversionRate: 18.3,
        pendingApprovals: 0,
        autoApprove: true,
        paidUpCount: 500,
        overdueCount: 84,
        autoShutoffEnabled: true,
        createdAt: '2026-01-15T08:00:00Z',
        color: '#3b82f6',
        isPopular: true,
      },
      {
        id: 'cohort-003',
        name: 'Advertising Premium',
        description: 'Premium advertising placements with maximum visibility',
        type: 'advertising',
        category: 'advertiser',
        status: 'active',
        basePrice: 999,
        currentPrice: 1298,
        billingPeriod: 'monthly',
        currency: 'USD',
        maxSpots: 500,
        spotsUsed: 342,
        spotsRemaining: 158,
        scarcityLevel: 'limited',
        autoCloseWhenFull: true,
        waitlistEnabled: true,
        waitlistCount: 50,
        activeSubscribers: 342,
        monthlyRevenue: 444155,
        churnRate: 1.8,
        conversionRate: 8.5,
        pendingApprovals: 10,
        autoApprove: false,
        paidUpCount: 300,
        overdueCount: 42,
        autoShutoffEnabled: false,
        createdAt: '2026-01-18T08:00:00Z',
        color: '#ea580c',
        isPopular: false,
      },
      {
        id: 'cohort-004',
        name: 'Trade Contractor Elite',
        description: 'Specialized for plumbers, electricians, HVAC professionals',
        type: 'subscription',
        category: 'trade_contractor',
        status: 'active',
        basePrice: 199,
        currentPrice: 199,
        billingPeriod: 'monthly',
        currency: 'USD',
        maxSpots: 300,
        spotsUsed: 289,
        spotsRemaining: 11,
        scarcityLevel: 'waitlist',
        autoCloseWhenFull: true,
        waitlistEnabled: true,
        waitlistCount: 120,
        activeSubscribers: 289,
        monthlyRevenue: 57511,
        churnRate: 0.9,
        conversionRate: 28.5,
        pendingApprovals: 15,
        autoApprove: false,
        paidUpCount: 289,
        overdueCount: 0,
        autoShutoffEnabled: true,
        createdAt: '2026-02-01T08:00:00Z',
        color: '#8b5cf6',
        isPopular: true,
      },
      {
        id: 'cohort-005',
        name: 'Maintenance Plans Pro',
        description: 'Annual maintenance subscriptions for service providers',
        type: 'subscription',
        category: 'maintenance_plan',
        status: 'active',
        basePrice: 299,
        currentPrice: 349,
        billingPeriod: 'yearly',
        currency: 'USD',
        maxSpots: 2000,
        spotsUsed: 856,
        spotsRemaining: 1144,
        scarcityLevel: 'open',
        autoCloseWhenFull: false,
        waitlistEnabled: false,
        waitlistCount: 0,
        activeSubscribers: 856,
        monthlyRevenue: 24878,
        churnRate: 4.5,
        conversionRate: 15.2,
        pendingApprovals: 22,
        autoApprove: true,
        paidUpCount: 720,
        overdueCount: 136,
        autoShutoffEnabled: true,
        createdAt: '2026-01-20T08:00:00Z',
        color: '#f59e0b',
        isPopular: false,
      },
      {
        id: 'cohort-006',
        name: 'eCommerce Storefront',
        description: 'Full storefront with payment processing and shipping',
        type: 'ecommerce',
        category: 'ecommerce',
        status: 'active',
        basePrice: 399,
        currentPrice: 399,
        billingPeriod: 'monthly',
        currency: 'USD',
        maxSpots: 500,
        spotsUsed: 142,
        spotsRemaining: 358,
        scarcityLevel: 'open',
        autoCloseWhenFull: false,
        waitlistEnabled: true,
        waitlistCount: 5,
        activeSubscribers: 142,
        monthlyRevenue: 56658,
        churnRate: 5.8,
        conversionRate: 9.3,
        pendingApprovals: 3,
        autoApprove: false,
        paidUpCount: 130,
        overdueCount: 12,
        autoShutoffEnabled: true,
        createdAt: '2026-02-10T08:00:00Z',
        color: '#06b6d4',
        isPopular: false,
      },
      {
        id: 'cohort-007',
        name: 'Home Service Essentials',
        description: '4 hours/month of home services - perfect for homeowners',
        type: 'service_plan',
        category: 'residential_service',
        status: 'active',
        basePrice: 149,
        currentPrice: 149,
        billingPeriod: 'monthly',
        currency: 'USD',
        maxSpots: 1200,
        spotsUsed: 847,
        spotsRemaining: 353,
        scarcityLevel: 'filling',
        autoCloseWhenFull: false,
        waitlistEnabled: true,
        waitlistCount: 34,
        activeSubscribers: 847,
        monthlyRevenue: 126203,
        churnRate: 2.8,
        conversionRate: 22.4,
        pendingApprovals: 18,
        autoApprove: true,
        paidUpCount: 789,
        overdueCount: 58,
        autoShutoffEnabled: true,
        hoursIncluded: 4,
        rolloverLimit: 2,
        rolloverPolicy: 'limited',
        emergencyCallsIncluded: 1,
        materialDiscount: 10,
        serviceTypes: ['plumbing', 'electrical', 'hvac', 'general'],
        responseTime: '48hr',
        priorityLevel: 'standard',
        createdAt: '2026-01-10T08:00:00Z',
        color: '#22c55e',
        isPopular: true,
      },
      {
        id: 'cohort-008',
        name: 'Premium Property Care',
        description: '8 hours/month with priority response - residential & commercial',
        type: 'service_plan',
        category: 'commercial_service',
        status: 'active',
        basePrice: 299,
        currentPrice: 299,
        billingPeriod: 'monthly',
        currency: 'USD',
        maxSpots: 500,
        spotsUsed: 412,
        spotsRemaining: 88,
        scarcityLevel: 'limited',
        autoCloseWhenFull: true,
        waitlistEnabled: true,
        waitlistCount: 67,
        activeSubscribers: 412,
        monthlyRevenue: 123188,
        churnRate: 1.4,
        conversionRate: 31.2,
        pendingApprovals: 12,
        autoApprove: false,
        paidUpCount: 405,
        overdueCount: 7,
        autoShutoffEnabled: true,
        hoursIncluded: 8,
        rolloverLimit: 4,
        rolloverPolicy: 'limited',
        emergencyCallsIncluded: 2,
        materialDiscount: 15,
        serviceTypes: ['plumbing', 'electrical', 'hvac', 'general', 'carpentry'],
        responseTime: '24hr',
        priorityLevel: 'priority',
        createdAt: '2026-01-12T08:00:00Z',
        color: '#a855f7',
        isPopular: true,
      },
    ];

    // Save all cohorts to database
    const results = [];
    for (const cohort of defaultCohorts) {
      await kv.set(`${COHORT_PREFIX}${cohort.id}`, cohort);
      results.push(cohort.id);
      console.log(`[Cohorts] Initialized: ${cohort.name}`);
    }

    console.log('[Cohorts] System initialized with', results.length, 'cohorts');

    return c.json({
      success: true,
      message: `Initialized ${results.length} cohorts`,
      cohortIds: results
    });
  } catch (error) {
    console.error('Error initializing cohorts:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to initialize cohorts' 
    }, 500);
  }
});

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