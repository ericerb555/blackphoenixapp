// Service Provider Lead Generation System
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const serviceProviders = new Hono();

// ============================================================================
// SERVICE CATEGORIES CONFIGURATION
// ============================================================================

export const SERVICE_CATEGORIES = {
  'pest-control': {
    label: 'Pest Control',
    description: 'Extermination, prevention, and pest management',
    icon: 'bug'
  },
  'house-cleaning': {
    label: 'House Cleaning',
    description: 'Residential cleaning services',
    icon: 'sparkles'
  },
  'home-inspection': {
    label: 'Home Inspection',
    description: 'Property inspections and assessments',
    icon: 'clipboard-check'
  },
  'real-estate': {
    label: 'Real Estate Agent',
    description: 'Property buying, selling, and leasing',
    icon: 'home'
  },
  'moving-services': {
    label: 'Moving Services',
    description: 'Residential and commercial moving',
    icon: 'truck'
  },
  'appliance-repair': {
    label: 'Appliance Repair',
    description: 'Repair and maintenance of home appliances',
    icon: 'wrench'
  },
  'locksmith': {
    label: 'Locksmith',
    description: 'Lock installation, repair, and emergency services',
    icon: 'key'
  },
  'security-systems': {
    label: 'Security Systems',
    description: 'Home security and monitoring systems',
    icon: 'shield'
  },
  'solar-installation': {
    label: 'Solar Installation',
    description: 'Solar panel installation and maintenance',
    icon: 'sun'
  },
  'window-treatment': {
    label: 'Window Treatment',
    description: 'Blinds, shades, and curtain installation',
    icon: 'layout-grid'
  },
  'garage-doors': {
    label: 'Garage Door Service',
    description: 'Garage door installation and repair',
    icon: 'garage'
  },
  'junk-removal': {
    label: 'Junk Removal',
    description: 'Debris removal and hauling services',
    icon: 'trash'
  }
};

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  'starter': {
    name: 'Starter',
    price: 99,
    leadsPerMonth: 10,
    features: ['Basic profile', 'Email notifications', 'Standard support', 'Basic analytics'],
    priority: 3
  },
  'professional': {
    name: 'Professional',
    price: 299,
    leadsPerMonth: 40,
    features: ['Featured profile', 'SMS notifications', 'Priority support', 'Advanced analytics', 'Priority lead routing'],
    priority: 2,
    badge: 'Popular'
  },
  'enterprise': {
    name: 'Enterprise',
    price: 699,
    leadsPerMonth: -1, // Unlimited
    features: ['Top placement', 'Instant notifications', '24/7 support', 'Full analytics suite', 'First-in-line routing', 'Dedicated account manager'],
    priority: 1,
    badge: 'Best Value'
  }
};

// ============================================================================
// SERVICE PROVIDER REGISTRATION
// ============================================================================

// POST /service-providers/register
serviceProviders.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const {
      companyName,
      contactName,
      email,
      phone,
      serviceCategories, // Array of category IDs
      serviceAreas, // Array of zip codes or {radius, centerZip}
      businessLicense,
      insuranceInfo,
      subscriptionTier,
      website,
      description
    } = body;

    // Validation
    if (!companyName || !contactName || !email || !phone || !serviceCategories?.length || !subscriptionTier) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (!SUBSCRIPTION_TIERS[subscriptionTier]) {
      return c.json({ error: 'Invalid subscription tier' }, 400);
    }

    // Generate provider ID
    const providerId = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const provider = {
      id: providerId,
      companyName,
      contactName,
      email,
      phone,
      serviceCategories,
      serviceAreas,
      businessLicense,
      insuranceInfo,
      subscriptionTier,
      website,
      description,
      status: 'pending_approval', // pending_approval, active, suspended
      leadsReceived: 0,
      leadsResponded: 0,
      conversionRate: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      subscriptionStartDate: null,
      lastLeadDate: null
    };

    // Store provider
    await kv.set(`service_provider:${providerId}`, provider);

    // Index by email for lookups
    await kv.set(`service_provider_email:${email}`, providerId);

    // Add to pending approvals list
    const pendingList = await kv.get('service_providers:pending') || [];
    pendingList.push(providerId);
    await kv.set('service_providers:pending', pendingList);

    console.log(`✅ Service provider registered: ${companyName} (${providerId})`);

    return c.json({
      success: true,
      providerId,
      message: 'Registration submitted! We will review your application and contact you within 24-48 hours.',
      provider: {
        id: providerId,
        companyName,
        status: 'pending_approval'
      }
    }, 201);

  } catch (error) {
    console.error('❌ Error registering service provider:', error);
    return c.json({ error: 'Failed to register provider', details: error.message }, 500);
  }
});

// ============================================================================
// ADMIN: MANAGE SERVICE PROVIDERS
// ============================================================================

// GET /service-providers/pending
serviceProviders.get('/pending', async (c) => {
  try {
    const pendingIds = await kv.get('service_providers:pending') || [];
    const providers = await Promise.all(
      pendingIds.map(id => kv.get(`service_provider:${id}`))
    );

    return c.json({
      success: true,
      providers: providers.filter(Boolean)
    });

  } catch (error) {
    console.error('❌ Error fetching pending providers:', error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch pending providers',
      providers: []
    }, 500);
  }
});

// GET /service-providers/active
serviceProviders.get('/active', async (c) => {
  try {
    const allProviders = await kv.getByPrefix('service_provider:') || [];
    const activeProviders = allProviders
      .filter(p => p && p.status === 'active')
      .sort((a, b) => {
        // Sort by subscription priority (enterprise first)
        const tierA = SUBSCRIPTION_TIERS[a.subscriptionTier] || SUBSCRIPTION_TIERS['starter'];
        const tierB = SUBSCRIPTION_TIERS[b.subscriptionTier] || SUBSCRIPTION_TIERS['starter'];
        return tierA.priority - tierB.priority;
      });

    return c.json({
      success: true,
      providers: activeProviders
    });

  } catch (error) {
    console.error('❌ Error fetching active providers:', error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch active providers',
      providers: []
    }, 500);
  }
});

// POST /service-providers/:id/approve
serviceProviders.post('/:id/approve', async (c) => {
  try {
    const providerId = c.req.param('id');
    const provider = await kv.get(`service_provider:${providerId}`);

    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    // Update provider status
    provider.status = 'active';
    provider.approvedAt = new Date().toISOString();
    provider.subscriptionStartDate = new Date().toISOString();

    await kv.set(`service_provider:${providerId}`, provider);

    // Remove from pending list
    const pendingList = await kv.get('service_providers:pending') || [];
    const updatedPending = pendingList.filter(id => id !== providerId);
    await kv.set('service_providers:pending', updatedPending);

    // Add to active list
    const activeList = await kv.get('service_providers:active') || [];
    activeList.push(providerId);
    await kv.set('service_providers:active', activeList);

    console.log(`✅ Service provider approved: ${provider.companyName}`);

    return c.json({
      success: true,
      message: 'Provider approved successfully',
      provider
    });

  } catch (error) {
    console.error('❌ Error approving provider:', error);
    return c.json({ error: 'Failed to approve provider' }, 500);
  }
});

// POST /service-providers/:id/reject
serviceProviders.post('/:id/reject', async (c) => {
  try {
    const providerId = c.req.param('id');
    const { reason } = await c.req.json();

    const provider = await kv.get(`service_provider:${providerId}`);
    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    provider.status = 'rejected';
    provider.rejectionReason = reason;
    provider.rejectedAt = new Date().toISOString();

    await kv.set(`service_provider:${providerId}`, provider);

    // Remove from pending list
    const pendingList = await kv.get('service_providers:pending') || [];
    const updatedPending = pendingList.filter(id => id !== providerId);
    await kv.set('service_providers:pending', updatedPending);

    console.log(`❌ Service provider rejected: ${provider.companyName}`);

    return c.json({
      success: true,
      message: 'Provider rejected',
      provider
    });

  } catch (error) {
    console.error('❌ Error rejecting provider:', error);
    return c.json({ error: 'Failed to reject provider' }, 500);
  }
});

// ============================================================================
// OTHER SERVICE REQUESTS (from customers)
// ============================================================================

// POST /other-service-requests - Create new other service request
serviceProviders.post('/other-service-requests', async (c) => {
  try {
    const body = await c.req.json();
    const {
      serviceCategory,
      description,
      preferredDate,
      urgency,
      budget,
      address,
      contactName,
      contactEmail,
      contactPhone,
      customerId
    } = body;

    // Validation
    if (!serviceCategory || !description || !contactName || !contactEmail) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate request ID
    const requestId = `OSR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const request = {
      id: requestId,
      serviceCategory,
      description,
      preferredDate,
      urgency: urgency || 'normal',
      budget,
      address,
      contactName,
      contactEmail,
      contactPhone,
      customerId: customerId || 'guest',
      status: 'pending_review', // pending_review, assigned, in_bid_room, completed, cancelled
      createdAt: new Date().toISOString(),
      assignedProviderId: null,
      assignedProviderName: null,
      assignedAt: null,
      sentToBidRoomAt: null,
      eligibleProviders: [],
      notes: []
    };

    // Store request
    await kv.set(`other_service_request:${requestId}`, request);

    // Add to pending queue for admin review
    const pendingQueue = await kv.get('other_service_requests:pending') || [];
    pendingQueue.push(requestId);
    await kv.set('other_service_requests:pending', pendingQueue);

    console.log(`✅ Other service request created: ${requestId} - ${serviceCategory}`);

    return c.json({
      success: true,
      requestId,
      message: 'Request submitted successfully',
      request: {
        id: requestId,
        status: 'pending_review'
      }
    }, 201);

  } catch (error) {
    console.error('❌ Error creating other service request:', error);
    return c.json({ error: 'Failed to create request', details: error.message }, 500);
  }
});

// GET /other-service-requests
serviceProviders.get('/other-service-requests', async (c) => {
  try {
    const requests = await kv.getByPrefix('other_service_request:') || [];
    
    // Sort by date, newest first
    if (requests.length > 0) {
      requests.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
    }

    return c.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error('❌ Error fetching other service requests:', error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch requests',
      requests: []
    }, 500);
  }
});

// POST /other-service-requests/:id/assign
serviceProviders.post('/other-service-requests/:id/assign', async (c) => {
  try {
    const requestId = c.req.param('id');
    const { providerId } = await c.req.json();

    const request = await kv.get(`other_service_request:${requestId}`);
    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    const provider = await kv.get(`service_provider:${providerId}`);
    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    // Update request
    request.status = 'assigned';
    request.assignedProviderId = providerId;
    request.assignedProviderName = provider.companyName;
    request.assignedAt = new Date().toISOString();

    await kv.set(`other_service_request:${requestId}`, request);

    // Update provider stats
    provider.leadsReceived += 1;
    provider.lastLeadDate = new Date().toISOString();
    await kv.set(`service_provider:${providerId}`, provider);

    console.log(`✅ Request ${requestId} assigned to ${provider.companyName}`);

    return c.json({
      success: true,
      message: 'Request assigned successfully',
      request
    });

  } catch (error) {
    console.error('❌ Error assigning request:', error);
    return c.json({ error: 'Failed to assign request' }, 500);
  }
});

// POST /other-service-requests/:id/send-to-bid-room
serviceProviders.post('/other-service-requests/:id/send-to-bid-room', async (c) => {
  try {
    const requestId = c.req.param('id');

    const request = await kv.get(`other_service_request:${requestId}`);
    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    // Get matching providers
    const allProviders = await kv.getByPrefix('service_provider:');
    const matchingProviders = allProviders.filter(p => 
      p.status === 'active' && 
      p.serviceCategories.includes(request.serviceCategory)
    );

    // Update request
    request.status = 'in_bid_room';
    request.sentToBidRoomAt = new Date().toISOString();
    request.eligibleProviders = matchingProviders.map(p => p.id);

    await kv.set(`other_service_request:${requestId}`, request);

    // Notify providers (update their lead counts)
    for (const provider of matchingProviders) {
      provider.leadsReceived += 1;
      provider.lastLeadDate = new Date().toISOString();
      await kv.set(`service_provider:${provider.id}`, provider);
    }

    console.log(`✅ Request ${requestId} sent to bid room for ${matchingProviders.length} providers`);

    return c.json({
      success: true,
      message: `Request sent to bid room for ${matchingProviders.length} providers`,
      request,
      providersNotified: matchingProviders.length
    });

  } catch (error) {
    console.error('❌ Error sending to bid room:', error);
    return c.json({ error: 'Failed to send to bid room' }, 500);
  }
});

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

// GET /analytics/revenue
serviceProviders.get('/analytics/revenue', async (c) => {
  try {
    const allProviders = await kv.getByPrefix('service_provider:');
    const activeProviders = allProviders.filter(p => p.status === 'active');

    // Calculate MRR by tier
    const revenueByTier = {};
    let totalMRR = 0;

    activeProviders.forEach(provider => {
      const tier = provider.subscriptionTier;
      const price = SUBSCRIPTION_TIERS[tier].price;

      if (!revenueByTier[tier]) {
        revenueByTier[tier] = { count: 0, revenue: 0 };
      }

      revenueByTier[tier].count += 1;
      revenueByTier[tier].revenue += price;
      totalMRR += price;
    });

    // Lead volume by category
    const requests = await kv.getByPrefix('other_service_request:');
    const leadsByCategory = {};

    requests.forEach(req => {
      const cat = req.serviceCategory;
      leadsByCategory[cat] = (leadsByCategory[cat] || 0) + 1;
    });

    return c.json({
      success: true,
      analytics: {
        totalMRR,
        activeProviders: activeProviders.length,
        revenueByTier,
        totalLeads: requests.length,
        leadsByCategory,
        averageRevenuePerProvider: activeProviders.length > 0 ? totalMRR / activeProviders.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

export default serviceProviders;
