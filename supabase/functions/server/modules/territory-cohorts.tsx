// Territory-Based Cohort Management API Routes
// Geographic radius-based cohort management with capacity limits
// Territories are centered on company headquarters zip code
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const territoryCohortRouter = new Hono();

const TERRITORY_PREFIX = 'territory_';
const MEMBER_PREFIX = 'member_';
const APPLICATION_PREFIX = 'application_';
const FOUNDER_TRACKING = 'founder_tracking';
const COMPANY_CONFIG_KEY = 'company_configuration';

const CAPACITY_LIMITS = {
  total: 45,
  subcontractorsPerTrade: 4,
  vendors: 5,
  advertisers: 5,
  radius: 40,
  trialMonths: 6,
  founderSlots: 10,
  founderDiscount: 0.30,
};

const SUBSCRIPTION_RATES = {
  subcontractor: 99,
  vendor: 149,
  advertiser: 199,
};

// Get all territories
territoryCohortRouter.get('/territories', async (c) => {
  try {
    const territories = await kv.getByPrefix(TERRITORY_PREFIX);
    
    return c.json({
      success: true,
      territories: territories.map(item => item.value),
      count: territories.length
    });
  } catch (error) {
    console.error('Error fetching territories:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch territories',
      territories: []
    }, 500);
  }
});

// Get single territory with members
territoryCohortRouter.get('/territories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const territory = await kv.get(`${TERRITORY_PREFIX}${id}`);
    
    if (!territory) {
      return c.json({
        success: false,
        error: 'Territory not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      territory
    });
  } catch (error) {
    console.error('Error fetching territory:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch territory' 
    }, 500);
  }
});

// Create new territory
territoryCohortRouter.post('/territories', async (c) => {
  try {
    const territoryData = await c.req.json();
    
    const territoryId = territoryData.id || `TERR-${Date.now()}`;
    
    const territory = {
      ...territoryData,
      id: territoryId,
      radius: territoryData.radius || CAPACITY_LIMITS.radius,
      active: territoryData.active !== undefined ? territoryData.active : true,
      createdDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subcontractorsByTrade: territoryData.subcontractorsByTrade || {},
      vendors: territoryData.vendors || [],
      advertisers: territoryData.advertisers || [],
    };
    
    await kv.set(`${TERRITORY_PREFIX}${territoryId}`, territory);
    
    console.log(`✅ Created territory: ${territory.name} (${territoryId})`);
    
    return c.json({
      success: true,
      territory,
      message: 'Territory created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating territory:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create territory' 
    }, 500);
  }
});

// Update territory
territoryCohortRouter.put('/territories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existing = await kv.get(`${TERRITORY_PREFIX}${id}`);
    if (!existing) {
      return c.json({
        success: false,
        error: 'Territory not found'
      }, 404);
    }
    
    const territory = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
      createdDate: existing.createdDate,
    };
    
    await kv.set(`${TERRITORY_PREFIX}${id}`, territory);
    
    console.log(`✅ Updated territory: ${territory.name} (${id})`);
    
    return c.json({
      success: true,
      territory,
      message: 'Territory updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating territory:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to update territory' 
    }, 500);
  }
});

// Get all applications
territoryCohortRouter.get('/applications', async (c) => {
  try {
    const applications = await kv.getByPrefix(APPLICATION_PREFIX);
    
    return c.json({
      success: true,
      applications: applications.map(item => item.value),
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

// Get applications by status
territoryCohortRouter.get('/applications/status/:status', async (c) => {
  try {
    const status = c.req.param('status');
    const allApplications = await kv.getByPrefix(APPLICATION_PREFIX);
    
    const filtered = allApplications
      .map(item => item.value)
      .filter(app => app.status === status);
    
    return c.json({
      success: true,
      applications: filtered,
      count: filtered.length,
      status
    });
  } catch (error) {
    console.error('Error fetching applications by status:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch applications' 
    }, 500);
  }
});

// Submit new application
territoryCohortRouter.post('/applications', async (c) => {
  try {
    const applicationData = await c.req.json();
    
    // Find matching territory based on zip code
    const allTerritories = await kv.getByPrefix(TERRITORY_PREFIX);
    const matchingTerritory = allTerritories
      .map(item => item.value)
      .find(t => t.active && calculateDistance(t.zipCode, applicationData.zipCode) <= CAPACITY_LIMITS.radius);
    
    if (!matchingTerritory) {
      return c.json({
        success: false,
        error: 'No active territory found within 40 miles of your location',
        waitlistAvailable: true
      }, 404);
    }
    
    // Check capacity
    const canAdd = await checkCapacity(matchingTerritory, applicationData.type, applicationData.trade);
    
    if (!canAdd.available) {
      return c.json({
        success: false,
        error: canAdd.reason,
        waitlistAvailable: true,
        territory: matchingTerritory.name
      }, 400);
    }
    
    const applicationId = `APP-${Date.now()}`;
    
    const application = {
      ...applicationData,
      id: applicationId,
      territoryId: matchingTerritory.id,
      territoryName: matchingTerritory.name,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      distance: calculateDistance(matchingTerritory.zipCode, applicationData.zipCode),
    };
    
    await kv.set(`${APPLICATION_PREFIX}${applicationId}`, application);
    
    console.log(`📝 New application: ${applicationData.name} (${applicationData.type}) - Territory: ${matchingTerritory.name}`);
    
    return c.json({
      success: true,
      application,
      territory: matchingTerritory,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error('❌ Error submitting application:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to submit application' 
    }, 500);
  }
});

// Approve application
territoryCohortRouter.post('/applications/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const { reviewedBy } = await c.req.json();
    
    const application = await kv.get(`${APPLICATION_PREFIX}${id}`);
    if (!application) {
      return c.json({
        success: false,
        error: 'Application not found'
      }, 404);
    }
    
    // Get territory
    const territory = await kv.get(`${TERRITORY_PREFIX}${application.territoryId}`);
    if (!territory) {
      return c.json({
        success: false,
        error: 'Territory not found'
      }, 404);
    }
    
    // Check capacity again
    const canAdd = await checkCapacity(territory, application.type, application.trade);
    if (!canAdd.available) {
      return c.json({
        success: false,
        error: canAdd.reason
      }, 400);
    }
    
    // Check founder status
    const founderTracking = await kv.get(FOUNDER_TRACKING) || { count: 0, members: [] };
    const isFounder = application.type === 'subcontractor' && founderTracking.count < CAPACITY_LIMITS.founderSlots;
    const founderNumber = isFounder ? founderTracking.count + 1 : null;
    
    // Calculate rates
    const normalRate = SUBSCRIPTION_RATES[application.type];
    const subscriptionRate = isFounder ? normalRate * (1 - CAPACITY_LIMITS.founderDiscount) : normalRate;
    
    // Calculate trial end date
    const joinDate = new Date();
    const trialEndDate = new Date(joinDate);
    trialEndDate.setMonth(trialEndDate.getMonth() + CAPACITY_LIMITS.trialMonths);
    
    // Create member
    const memberId = `MEM-${Date.now()}`;
    const member = {
      id: memberId,
      name: application.name,
      type: application.type,
      trade: application.trade,
      joinDate: joinDate.toISOString(),
      trialEndDate: trialEndDate.toISOString(),
      status: 'trial',
      isFounder,
      founderNumber,
      subscriptionRate,
      normalRate,
      location: {
        address: application.address,
        zipCode: application.zipCode,
        distance: application.distance,
      },
      phone: application.phone,
      email: application.email,
      territoryId: territory.id,
      applicationId: id,
    };
    
    // Add member to territory
    if (member.type === 'subcontractor' && member.trade) {
      if (!territory.subcontractorsByTrade[member.trade]) {
        territory.subcontractorsByTrade[member.trade] = [];
      }
      territory.subcontractorsByTrade[member.trade].push(member);
    } else if (member.type === 'vendor') {
      territory.vendors.push(member);
    } else if (member.type === 'advertiser') {
      territory.advertisers.push(member);
    }
    
    // Update founder tracking
    if (isFounder) {
      founderTracking.count += 1;
      founderTracking.members.push({ memberId, name: member.name, founderNumber });
      await kv.set(FOUNDER_TRACKING, founderTracking);
    }
    
    // Update territory
    territory.updatedAt = new Date().toISOString();
    await kv.set(`${TERRITORY_PREFIX}${territory.id}`, territory);
    
    // Update application status
    application.status = 'approved';
    application.reviewedAt = new Date().toISOString();
    application.reviewedBy = reviewedBy;
    application.memberId = memberId;
    await kv.set(`${APPLICATION_PREFIX}${id}`, application);
    
    // Save member record
    await kv.set(`${MEMBER_PREFIX}${memberId}`, member);
    
    console.log(`✅ Approved application: ${member.name} ${isFounder ? `(FOUNDER #${founderNumber})` : ''}`);
    
    return c.json({
      success: true,
      member,
      application,
      isFounder,
      founderNumber,
      message: `Application approved successfully${isFounder ? ` - Founder Member #${founderNumber}` : ''}`
    });
  } catch (error) {
    console.error('❌ Error approving application:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to approve application' 
    }, 500);
  }
});

// Reject application
territoryCohortRouter.post('/applications/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    const { reviewedBy, reason } = await c.req.json();
    
    const application = await kv.get(`${APPLICATION_PREFIX}${id}`);
    if (!application) {
      return c.json({
        success: false,
        error: 'Application not found'
      }, 404);
    }
    
    application.status = 'rejected';
    application.reviewedAt = new Date().toISOString();
    application.reviewedBy = reviewedBy;
    application.rejectionReason = reason;
    
    await kv.set(`${APPLICATION_PREFIX}${id}`, application);
    
    console.log(`❌ Rejected application: ${application.name} - Reason: ${reason}`);
    
    return c.json({
      success: true,
      application,
      message: 'Application rejected'
    });
  } catch (error) {
    console.error('❌ Error rejecting application:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to reject application' 
    }, 500);
  }
});

// Get all members across all territories
territoryCohortRouter.get('/members', async (c) => {
  try {
    const members = await kv.getByPrefix(MEMBER_PREFIX);
    
    return c.json({
      success: true,
      members: members.map(item => item.value),
      count: members.length
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch members',
      members: []
    }, 500);
  }
});

// Get founder tracking
territoryCohortRouter.get('/founders', async (c) => {
  try {
    const founderTracking = await kv.get(FOUNDER_TRACKING) || { count: 0, members: [] };
    
    return c.json({
      success: true,
      founderTracking,
      remainingSlots: CAPACITY_LIMITS.founderSlots - founderTracking.count
    });
  } catch (error) {
    console.error('Error fetching founder tracking:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch founder tracking' 
    }, 500);
  }
});

// Get analytics
territoryCohortRouter.get('/analytics', async (c) => {
  try {
    const territories = await kv.getByPrefix(TERRITORY_PREFIX);
    const members = await kv.getByPrefix(MEMBER_PREFIX);
    const applications = await kv.getByPrefix(APPLICATION_PREFIX);
    const founderTracking = await kv.get(FOUNDER_TRACKING) || { count: 0, members: [] };
    
    const membersByType = members.map(item => item.value).reduce((acc, member) => {
      acc[member.type] = (acc[member.type] || 0) + 1;
      return acc;
    }, {});
    
    const applicationsByStatus = applications.map(item => item.value).reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate MRR
    const totalMRR = members.map(item => item.value)
      .filter(m => m.status !== 'expired' && m.status !== 'suspended')
      .reduce((sum, m) => sum + m.subscriptionRate, 0);
    
    return c.json({
      success: true,
      analytics: {
        territories: {
          total: territories.length,
          active: territories.filter(t => t.value.active).length,
        },
        members: {
          total: members.length,
          byType: membersByType,
          byStatus: members.map(item => item.value).reduce((acc, member) => {
            acc[member.status] = (acc[member.status] || 0) + 1;
            return acc;
          }, {}),
        },
        applications: {
          total: applications.length,
          byStatus: applicationsByStatus,
        },
        founders: {
          count: founderTracking.count,
          remaining: CAPACITY_LIMITS.founderSlots - founderTracking.count,
        },
        revenue: {
          monthlyRecurring: totalMRR,
          annualProjected: totalMRR * 12,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    }, 500);
  }
});

// Create territory from company HQ
territoryCohortRouter.post('/territories/from-company-hq', async (c) => {
  try {
    const { radius } = await c.req.json();
    
    // Get company configuration
    const companyConfig = await kv.get(COMPANY_CONFIG_KEY);
    
    if (!companyConfig || !companyConfig.headquarters?.zipCode) {
      return c.json({
        success: false,
        error: 'Company headquarters not configured. Please set your company zip code first.',
        requiresSetup: true
      }, 400);
    }
    
    const hq = companyConfig.headquarters;
    
    // Check if a territory already exists for this HQ
    const existingTerritories = await kv.getByPrefix(TERRITORY_PREFIX);
    const existingHQTerritory = existingTerritories.find(t => 
      t.value.zipCode === hq.zipCode && t.value.isMainTerritory
    );
    
    if (existingHQTerritory) {
      return c.json({
        success: false,
        error: 'A main territory already exists for your company headquarters',
        territory: existingHQTerritory.value
      }, 400);
    }
    
    const territoryId = `TERR-${Date.now()}`;
    const territoryRadius = radius || CAPACITY_LIMITS.radius;
    
    const territory = {
      id: territoryId,
      name: `${companyConfig.name} - Main Territory`,
      zipCode: hq.zipCode,
      city: hq.city,
      state: hq.state,
      address: hq.address,
      radius: territoryRadius,
      isMainTerritory: true,
      active: true,
      createdDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subcontractorsByTrade: {},
      vendors: [],
      advertisers: [],
    };
    
    await kv.set(`${TERRITORY_PREFIX}${territoryId}`, territory);
    
    console.log(`✅ Created main territory from HQ: ${territory.name} - ${hq.city}, ${hq.state} ${hq.zipCode} (${territoryRadius}mi radius)`);
    
    return c.json({
      success: true,
      territory,
      message: 'Main territory created successfully from company headquarters'
    });
  } catch (error) {
    console.error('❌ Error creating territory from HQ:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to create territory from headquarters' 
    }, 500);
  }
});

// Helper functions
function calculateDistance(zipCode1: string, zipCode2: string): number {
  // Mock distance calculation - in production, use a real geolocation API
  // For now, return a random distance between 0-40 miles
  return Math.random() * 40;
}

async function checkCapacity(territory: any, type: string, trade?: string): Promise<{ available: boolean; reason?: string }> {
  // Calculate total members
  const subcontractorCount = Object.values(territory.subcontractorsByTrade)
    .reduce((sum: number, members: any) => sum + members.length, 0);
  const totalMembers = subcontractorCount + territory.vendors.length + territory.advertisers.length;
  
  // Check total capacity
  if (totalMembers >= CAPACITY_LIMITS.total) {
    return { available: false, reason: 'Territory is at full capacity (45 members)' };
  }
  
  // Check type-specific capacity
  if (type === 'subcontractor' && trade) {
    const tradeMembers = territory.subcontractorsByTrade[trade] || [];
    if (tradeMembers.length >= CAPACITY_LIMITS.subcontractorsPerTrade) {
      return { available: false, reason: `${trade} trade is full (4/${CAPACITY_LIMITS.subcontractorsPerTrade} slots)` };
    }
  } else if (type === 'vendor') {
    if (territory.vendors.length >= CAPACITY_LIMITS.vendors) {
      return { available: false, reason: `Vendor slots are full (${CAPACITY_LIMITS.vendors}/${CAPACITY_LIMITS.vendors})` };
    }
  } else if (type === 'advertiser') {
    if (territory.advertisers.length >= CAPACITY_LIMITS.advertisers) {
      return { available: false, reason: `Advertiser slots are full (${CAPACITY_LIMITS.advertisers}/${CAPACITY_LIMITS.advertisers})` };
    }
  }
  
  return { available: true };
}