// AI Bid Routing Engine for Bid Room
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const aiBidRouter = new Hono();

// ============================================================================
// AI ANALYSIS ENGINE
// ============================================================================

/**
 * Analyzes a customer request and determines:
 * - Is it a product need or service need (or both)?
 * - What categories/specialties are required?
 * - What vendors/subcontractors should receive this?
 * - Priority and complexity level
 */
export function analyzeRequest(request: {
  title: string;
  description: string;
  requirements?: string[];
  type?: string;
}) {
  const text = `${request.title} ${request.description} ${request.requirements?.join(' ') || ''}`.toLowerCase();
  
  // Product keywords
  const productKeywords = [
    'buy', 'purchase', 'need', 'supply', 'materials', 'equipment', 'parts',
    'appliance', 'fixture', 'hardware', 'tool', 'product', 'item', 'unit',
    'model', 'brand', 'specifications', 'specs', 'catalog'
  ];

  // Service keywords
  const serviceKeywords = [
    'install', 'repair', 'fix', 'maintenance', 'service', 'replace',
    'upgrade', 'renovate', 'remodel', 'build', 'construct', 'design',
    'inspect', 'assess', 'consult', 'work', 'labor', 'professional'
  ];

  // Category detection patterns
  const categories = {
    electrical: ['electric', 'electrical', 'wiring', 'panel', 'circuit', 'outlet', 'lighting', 'generator', 'solar'],
    plumbing: ['plumb', 'pipe', 'drain', 'water', 'sewer', 'faucet', 'toilet', 'sink', 'heater'],
    hvac: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac unit', 'ventilation', 'duct'],
    carpentry: ['carpenter', 'wood', 'cabinet', 'door', 'window', 'frame', 'trim', 'deck', 'furniture'],
    roofing: ['roof', 'shingle', 'gutter', 'skylight', 'flashing', 'leak'],
    painting: ['paint', 'drywall', 'wall', 'ceiling', 'interior', 'exterior', 'stain', 'finish'],
    flooring: ['floor', 'tile', 'hardwood', 'laminate', 'carpet', 'vinyl', 'grout'],
    masonry: ['brick', 'concrete', 'stone', 'masonry', 'foundation', 'patio', 'walkway'],
    landscaping: ['landscape', 'lawn', 'yard', 'garden', 'tree', 'grass', 'sprinkler', 'irrigation'],
    cleaning: ['clean', 'janitorial', 'maid', 'sanitation', 'pressure wash'],
    'pest-control': ['pest', 'termite', 'rodent', 'insect', 'exterminator', 'bug'],
    'home-inspection': ['inspect', 'assessment', 'evaluation', 'appraisal', 'survey'],
    general: ['general contractor', 'renovation', 'remodel', 'construction', 'handyman']
  };

  // Complexity indicators
  const complexityIndicators = {
    high: ['commercial', 'industrial', 'multi-story', 'licensed', 'certified', 'permit', 'code', 'structural'],
    medium: ['residential', 'upgrade', 'replace', 'extensive', 'multiple'],
    low: ['minor', 'small', 'simple', 'basic', 'quick']
  };

  // Score product vs service
  let productScore = 0;
  let serviceScore = 0;

  productKeywords.forEach(keyword => {
    if (text.includes(keyword)) productScore++;
  });

  serviceKeywords.forEach(keyword => {
    if (text.includes(keyword)) serviceScore++;
  });

  // Detect categories
  const detectedCategories: string[] = [];
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        if (!detectedCategories.includes(category)) {
          detectedCategories.push(category);
        }
      }
    }
  }

  // Detect complexity
  let complexity: 'low' | 'medium' | 'high' = 'medium';
  if (complexityIndicators.high.some(indicator => text.includes(indicator))) {
    complexity = 'high';
  } else if (complexityIndicators.low.some(indicator => text.includes(indicator))) {
    complexity = 'low';
  }

  // Determine need type
  let needType: 'product' | 'service' | 'both';
  if (productScore > serviceScore * 1.5) {
    needType = 'product';
  } else if (serviceScore > productScore * 1.5) {
    needType = 'service';
  } else {
    needType = 'both';
  }

  // Extract budget info if present
  const budgetMatch = text.match(/\$?\d{1,3}(?:,?\d{3})*(?:\.\d{2})?/g);
  let estimatedBudget = null;
  if (budgetMatch) {
    estimatedBudget = budgetMatch.map(m => parseInt(m.replace(/[$,]/g, '')));
  }

  return {
    needType,
    categories: detectedCategories.length > 0 ? detectedCategories : ['general'],
    complexity,
    productScore,
    serviceScore,
    estimatedBudget,
    confidence: Math.min(95, 50 + (detectedCategories.length * 15) + (productScore + serviceScore) * 2)
  };
}

/**
 * Find matching contractors/vendors based on analysis
 */
export async function findMatchingProviders(analysis: any) {
  const providers: any[] = [];

  // Get subcontractors
  const subcontractors = await kv.getByPrefix('subcontractor:');
  
  // Get service providers (from lead gen system)
  const serviceProviders = await kv.getByPrefix('service_provider:');
  
  // Match subcontractors
  for (const sub of subcontractors) {
    if (sub.status === 'active') {
      const matchScore = calculateMatchScore(sub, analysis, 'subcontractor');
      if (matchScore > 30) {
        providers.push({
          id: sub.id,
          name: sub.companyName || sub.name,
          type: 'subcontractor',
          specialties: sub.specialties || sub.serviceCategories || [],
          matchScore,
          rating: sub.rating || 0,
          completedJobs: sub.completedJobs || 0,
          contact: {
            email: sub.email,
            phone: sub.phone
          }
        });
      }
    }
  }

  // Match service providers (for "other services")
  for (const provider of serviceProviders) {
    if (provider.status === 'active') {
      const matchScore = calculateMatchScore(provider, analysis, 'service_provider');
      if (matchScore > 30) {
        providers.push({
          id: provider.id,
          name: provider.companyName,
          type: 'service_provider',
          specialties: provider.serviceCategories || [],
          matchScore,
          rating: provider.rating || 0,
          completedJobs: provider.leadsReceived || 0,
          contact: {
            email: provider.email,
            phone: provider.phone
          },
          subscriptionTier: provider.subscriptionTier
        });
      }
    }
  }

  // Sort by match score (descending) and tier (enterprise first)
  providers.sort((a, b) => {
    // Enterprise tier gets priority
    if (a.subscriptionTier === 'enterprise' && b.subscriptionTier !== 'enterprise') return -1;
    if (b.subscriptionTier === 'enterprise' && a.subscriptionTier !== 'enterprise') return 1;
    
    // Then by match score
    return b.matchScore - a.matchScore;
  });

  return providers;
}

/**
 * Calculate how well a provider matches the request
 */
export function calculateMatchScore(provider: any, analysis: any, providerType: string): number {
  let score = 0;

  const providerCategories = (provider.specialties || provider.serviceCategories || [])
    .map((s: string) => s.toLowerCase().replace(/\s+/g, '-'));

  // Category match (most important)
  for (const category of analysis.categories) {
    if (providerCategories.some((pc: string) => 
      pc.includes(category) || category.includes(pc)
    )) {
      score += 40;
    }
  }

  // Experience bonus
  const jobs = provider.completedJobs || provider.leadsReceived || 0;
  if (jobs > 100) score += 20;
  else if (jobs > 50) score += 15;
  else if (jobs > 20) score += 10;
  else if (jobs > 5) score += 5;

  // Rating bonus
  const rating = provider.rating || 0;
  if (rating >= 4.8) score += 15;
  else if (rating >= 4.5) score += 10;
  else if (rating >= 4.0) score += 5;

  // Complexity match
  if (analysis.complexity === 'high') {
    if (provider.certifications?.length > 0 || jobs > 50) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

// ============================================================================
// API ROUTES
// ============================================================================

// POST /ai-analyze - Analyze a request and suggest routing
aiBidRouter.post('/ai-analyze', async (c) => {
  try {
    let requestBody;
    try {
      requestBody = await c.req.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error in /ai-analyze:', jsonError);
      return c.json({ 
        error: 'Invalid JSON in request body', 
        details: jsonError.message 
      }, 400);
    }

    const { title, description, requirements, type } = requestBody;

    if (!title || !description) {
      return c.json({ error: 'Title and description required' }, 400);
    }

    // Perform AI analysis
    const analysis = analyzeRequest({ title, description, requirements, type });

    // Find matching providers
    const matchingProviders = await findMatchingProviders(analysis);

    console.log(`🤖 AI Analysis: ${analysis.needType} | Categories: ${analysis.categories.join(', ')} | ${matchingProviders.length} matches`);

    return c.json({
      success: true,
      analysis: {
        ...analysis,
        summary: generateSummary(analysis, matchingProviders)
      },
      matchingProviders: matchingProviders.slice(0, 10), // Top 10 matches
      recommendedAction: determineRecommendedAction(analysis, matchingProviders)
    });

  } catch (error) {
    console.error('❌ Error in AI analysis:', error);
    return c.json({ error: 'Analysis failed', details: error.message }, 500);
  }
});

// POST /ai-route - Analyze and auto-route a request
aiBidRouter.post('/ai-route', async (c) => {
  try {
    let requestBody;
    try {
      requestBody = await c.req.json();
    } catch (jsonError) {
      console.error('❌ JSON parsing error in /ai-route:', jsonError);
      return c.json({ 
        error: 'Invalid JSON in request body', 
        details: jsonError.message 
      }, 400);
    }

    const { requestId, title, description, requirements, type, autoSend, budget, customerInfo } = requestBody;

    // Perform analysis
    const analysis = analyzeRequest({ title, description, requirements, type });
    const matchingProviders = await findMatchingProviders(analysis);

    // Create bid opportunity
    const opportunity = {
      id: requestId,
      title,
      description,
      requirements: requirements || [],
      type: type || 'quote',
      status: 'open',
      createdAt: new Date().toISOString(),
      analysis,
      matchedProviders: matchingProviders.slice(0, 10),
      budget: budget || null,
      customerInfo: customerInfo || null,
      responses: {},
      bidCount: 0,
      declinedProviders: []
    };

    await kv.set(`bid_opportunity:${requestId}`, opportunity);

    // Store analysis result
    const analysisRecord = {
      requestId,
      timestamp: new Date().toISOString(),
      analysis,
      matchingProviders: matchingProviders.slice(0, 10),
      autoRouted: autoSend === true
    };

    await kv.set(`ai_analysis:${requestId}`, analysisRecord);

    // If auto-send is enabled, notify providers
    if (autoSend && matchingProviders.length > 0) {
      const notificationPromises = matchingProviders.slice(0, 5).map(async (provider) => {
        // In production, this would send actual notifications
        console.log(`📧 Notifying ${provider.name} (${provider.type}) about ${title}`);
        
        // Update provider's lead count
        const providerKey = provider.type === 'subcontractor' 
          ? `subcontractor:${provider.id}`
          : `service_provider:${provider.id}`;
        
        const providerData = await kv.get(providerKey);
        if (providerData) {
          providerData.leadsReceived = (providerData.leadsReceived || 0) + 1;
          providerData.lastLeadDate = new Date().toISOString();
          await kv.set(providerKey, providerData);
        }
      });

      await Promise.all(notificationPromises);
    }

    return c.json({
      success: true,
      message: autoSend 
        ? `Request analyzed and routed to ${Math.min(5, matchingProviders.length)} providers`
        : 'Request analyzed successfully',
      analysis,
      opportunityId: requestId,
      providersNotified: autoSend ? Math.min(5, matchingProviders.length) : 0,
      topMatches: matchingProviders.slice(0, 5)
    });

  } catch (error) {
    console.error('❌ Error in AI routing:', error);
    return c.json({ error: 'Routing failed', details: error.message }, 500);
  }
});

// GET /ai-analysis/:requestId - Get stored analysis
aiBidRouter.get('/ai-analysis/:requestId', async (c) => {
  try {
    const requestId = c.req.param('requestId');
    const analysis = await kv.get(`ai_analysis:${requestId}`);

    if (!analysis) {
      return c.json({ error: 'Analysis not found' }, 404);
    }

    return c.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('❌ Error fetching analysis:', error);
    return c.json({ error: 'Failed to fetch analysis' }, 500);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateSummary(analysis: any, providers: any[]): string {
  const needTypeText = analysis.needType === 'both' 
    ? 'both product and service'
    : analysis.needType === 'product'
    ? 'primarily product-focused'
    : 'service-focused';

  const categoryText = analysis.categories.length > 1
    ? `multiple categories: ${analysis.categories.join(', ')}`
    : `${analysis.categories[0]} category`;

  return `This appears to be a ${needTypeText} request in ${categoryText}. ` +
    `Complexity level: ${analysis.complexity}. ` +
    `Found ${providers.length} matching providers.`;
}

export function determineRecommendedAction(analysis: any, providers: any[]): string {
  if (providers.length === 0) {
    return 'no_matches';
  } else if (providers.length === 1) {
    return 'direct_assign';
  } else if (analysis.complexity === 'high' || providers.length > 5) {
    return 'send_to_bid_room';
  } else {
    return 'select_top_3';
  }
}

export default aiBidRouter;