/**
 * Rotation Content API Endpoints
 * Handles pending content, approval, rejection, and AI suggestions
 */

import { Hono } from 'npm:hono@4';
import * as rotation from './rotation_models.tsx';

const router = new Hono();

// ============================================================================
// GET PENDING CONTENT
// ============================================================================

router.get('/make-server-824f083c/rotation/pending', async (c) => {
  try {
    const content = await rotation.getPendingContent();
    return c.json({ content });
  } catch (error) {
    console.error('Error fetching pending rotation content:', error);
    return c.json({ error: 'Failed to fetch pending content' }, 500);
  }
});

// ============================================================================
// GET AI SUGGESTION FOR CONTENT
// ============================================================================

router.post('/make-server-824f083c/rotation/ai-suggest', async (c) => {
  try {
    const { content_id } = await c.req.json();
    
    if (!content_id) {
      return c.json({ error: 'content_id is required' }, 400);
    }

    const content = await rotation.getRotationContent(content_id);
    if (!content) {
      return c.json({ error: 'Content not found' }, 404);
    }

    // Call OpenAI to analyze content and suggest tier/weight
    const suggestion = await generateAISuggestion(content);
    
    // Update content with AI score and reasoning
    await rotation.updateRotationContent(content_id, {
      ai_score: suggestion.score,
      ai_reasoning: suggestion.reasoning,
    });

    return c.json({ suggestion });
  } catch (error) {
    console.error('Error generating AI suggestion for rotation content:', error);
    return c.json({ error: 'Failed to generate AI suggestion' }, 500);
  }
});

// ============================================================================
// APPROVE CONTENT
// ============================================================================

router.post('/make-server-824f083c/rotation/approve', async (c) => {
  try {
    const { content_id, tier, weight, ai_suggestion } = await c.req.json();
    
    if (!content_id || !tier || weight === undefined) {
      return c.json({ error: 'content_id, tier, and weight are required' }, 400);
    }

    // TODO: Get admin user info from auth token
    const adminId = 'admin-001'; // Placeholder
    const adminName = 'Admin User'; // Placeholder

    const approved = await rotation.approveContent(
      content_id,
      adminId,
      adminName,
      tier,
      weight,
      ai_suggestion,
      undefined
    );

    if (!approved) {
      return c.json({ error: 'Content not found' }, 404);
    }

    return c.json({ 
      success: true, 
      content: approved,
      message: 'Content approved successfully' 
    });
  } catch (error) {
    console.error('Error approving rotation content:', error);
    return c.json({ error: 'Failed to approve content' }, 500);
  }
});

// ============================================================================
// REJECT CONTENT
// ============================================================================

router.post('/make-server-824f083c/rotation/reject', async (c) => {
  try {
    const { content_id, reason, ai_suggestion } = await c.req.json();
    
    if (!content_id || !reason) {
      return c.json({ error: 'content_id and reason are required' }, 400);
    }

    // TODO: Get admin user info from auth token
    const adminId = 'admin-001'; // Placeholder
    const adminName = 'Admin User'; // Placeholder

    const rejected = await rotation.rejectContent(
      content_id,
      adminId,
      adminName,
      reason,
      ai_suggestion
    );

    if (!rejected) {
      return c.json({ error: 'Content not found' }, 404);
    }

    return c.json({ 
      success: true, 
      content: rejected,
      message: 'Content rejected' 
    });
  } catch (error) {
    console.error('Error rejecting rotation content:', error);
    return c.json({ error: 'Failed to reject content' }, 500);
  }
});

// ============================================================================
// GET ACTIVE CONTENT (FOR ROTATION DISPLAY)
// ============================================================================

router.get('/make-server-824f083c/rotation/active', async (c) => {
  try {
    const content = await rotation.getActiveContent();
    return c.json({ content });
  } catch (error) {
    console.error('Error fetching active rotation content:', error);
    return c.json({ error: 'Failed to fetch active content' }, 500);
  }
});

// ============================================================================
// WEIGHTED CONTENT SELECTION WITH GEOGRAPHIC FILTERING
// ============================================================================

router.post('/make-server-824f083c/rotation/select', async (c) => {
  try {
    const { 
      user_zip_code, 
      user_city, 
      content_type, 
      service_category,
      count = 1 
    } = await c.req.json();

    // Get all active content
    const activeContent = await rotation.getActiveContent();

    if (activeContent.length === 0) {
      return c.json({ selected: [] });
    }

    // Filter by geographic zones if provided
    let eligibleContent = activeContent;
    
    if (user_zip_code || user_city) {
      eligibleContent = activeContent.filter(content => {
        if (content.geographic_zones.length === 0) return true; // No restrictions
        
        // Check if user's location matches any geographic zone
        return content.geographic_zones.some(zone => {
          if (user_zip_code && zone === user_zip_code) return true;
          if (user_city && zone.toLowerCase().includes(user_city.toLowerCase())) return true;
          return false;
        });
      });
    }

    // Filter by content type if provided
    if (content_type) {
      eligibleContent = eligibleContent.filter(c => c.content_type === content_type);
    }

    // Filter by service category if provided
    if (service_category) {
      eligibleContent = eligibleContent.filter(c => 
        c.service_category.toLowerCase() === service_category.toLowerCase()
      );
    }

    if (eligibleContent.length === 0) {
      return c.json({ selected: [] });
    }

    // Apply weighted random selection
    const selected = weightedRandomSelection(eligibleContent, count);

    return c.json({ selected });
  } catch (error) {
    console.error('Error selecting rotation content:', error);
    return c.json({ error: 'Failed to select content' }, 500);
  }
});

// ============================================================================
// WEIGHTED ROTATION FOR SPECIFIC ZONES
// ============================================================================

router.post('/make-server-824f083c/rotation/zone-rotation', async (c) => {
  try {
    const { zones, content_type, limit = 5 } = await c.req.json();

    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return c.json({ error: 'zones array is required' }, 400);
    }

    const activeContent = await rotation.getActiveContent();

    // Filter content that serves any of the requested zones
    const eligibleContent = activeContent.filter(content => {
      if (content.geographic_zones.length === 0) return true;
      return content.geographic_zones.some(zone => zones.includes(zone));
    });

    // Filter by content type if provided
    let filteredContent = eligibleContent;
    if (content_type) {
      filteredContent = eligibleContent.filter(c => c.content_type === content_type);
    }

    // Select multiple items with weighted distribution
    const selected = weightedRandomSelection(filteredContent, limit);

    return c.json({ 
      selected,
      total_eligible: filteredContent.length,
      zones_searched: zones,
    });
  } catch (error) {
    console.error('Error fetching zone rotation:', error);
    return c.json({ error: 'Failed to fetch rotation' }, 500);
  }
});

// ============================================================================
// RECORD IMPRESSION
// ============================================================================

router.post('/make-server-824f083c/rotation/impression', async (c) => {
  try {
    const { content_id } = await c.req.json();
    
    if (!content_id) {
      return c.json({ error: 'content_id is required' }, 400);
    }

    await rotation.recordImpression(content_id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error recording impression for rotation content:', error);
    return c.json({ error: 'Failed to record impression' }, 500);
  }
});

// ============================================================================
// RECORD CLICK
// ============================================================================

router.post('/make-server-824f083c/rotation/click', async (c) => {
  try {
    const { content_id } = await c.req.json();
    
    if (!content_id) {
      return c.json({ error: 'content_id is required' }, 400);
    }

    await rotation.recordClick(content_id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error recording click for rotation content:', error);
    return c.json({ error: 'Failed to record click' }, 500);
  }
});

// ============================================================================
// GET CONTENT BY ADVERTISER
// ============================================================================

router.get('/make-server-824f083c/rotation/by-advertiser/:advertiserId', async (c) => {
  try {
    const advertiserId = c.req.param('advertiserId');
    const content = await rotation.getContentByAdvertiser(advertiserId);
    return c.json({ content });
  } catch (error) {
    console.error('Error fetching content by advertiser:', error);
    return c.json({ error: 'Failed to fetch content' }, 500);
  }
});

// ============================================================================
// CREATE NEW ROTATION CONTENT (FOR ADVERTISERS/SUBCONTRACTORS)
// ============================================================================

router.post('/make-server-824f083c/rotation/create', async (c) => {
  try {
    const contentData = await c.req.json();
    
    // Validate required fields
    const required = ['advertiser_id', 'advertiser_type', 'advertiser_name', 'title', 'description', 'service_category'];
    for (const field of required) {
      if (!contentData[field]) {
        return c.json({ error: `${field} is required` }, 400);
      }
    }

    const newContent = await rotation.createRotationContent(contentData);
    return c.json({ 
      success: true, 
      content: newContent,
      message: 'Content submitted for approval' 
    });
  } catch (error) {
    console.error('Error creating rotation content:', error);
    return c.json({ error: 'Failed to create content' }, 500);
  }
});

// ============================================================================
// AI SUGGESTION HELPER
// ============================================================================

async function generateAISuggestion(content: any) {
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIKey) {
    console.warn('OPENAI_API_KEY not found, returning default suggestion');
    return {
      tier: 'basic' as rotation.ContentTier,
      weight: 1,
      score: 50,
      reasoning: 'Default suggestion - OpenAI API key not configured',
    };
  }

  try {
    const prompt = `Analyze this advertising content and suggest an appropriate tier and weight for content rotation.

Content Details:
- Title: ${content.title}
- Description: ${content.description}
- Advertiser: ${content.advertiser_name} (${content.advertiser_type})
- Service Category: ${content.service_category}
- Geographic Zones: ${content.geographic_zones.join(', ')}
- Content Type: ${content.content_type}
${content.image_url ? `- Has Image: Yes` : '- Has Image: No'}
${content.link_url ? `- Has Link: Yes` : '- Has Link: No'}

Tier Options:
- basic: 1x rotation weight (standard rotation)
- premium: 3x rotation weight (increased visibility)
- featured: 5x rotation weight (maximum visibility)

Evaluate based on:
1. Content quality and completeness
2. Professional presentation
3. Value proposition clarity
4. Visual appeal (if image provided)
5. Target audience relevance
6. Service category demand

Return a JSON object with:
{
  "tier": "basic" | "premium" | "featured",
  "weight": 1-10 (numeric),
  "score": 0-100 (quality score),
  "reasoning": "Brief explanation (max 150 words)"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert marketing analyst specializing in content evaluation and rotation strategies. Provide objective, data-driven recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const suggestion = JSON.parse(data.choices[0].message.content);

    // Validate and sanitize response
    const tier = ['basic', 'premium', 'featured'].includes(suggestion.tier)
      ? suggestion.tier
      : 'basic';
    const weight = Math.max(1, Math.min(10, suggestion.weight || 1));
    const score = Math.max(0, Math.min(100, suggestion.score || 50));

    return {
      tier: tier as rotation.ContentTier,
      weight,
      score,
      reasoning: suggestion.reasoning || 'AI analysis complete',
    };
  } catch (error) {
    console.error('Error calling OpenAI API for content suggestion:', error);
    return {
      tier: 'basic' as rotation.ContentTier,
      weight: 1,
      score: 50,
      reasoning: 'AI suggestion unavailable - using default tier',
    };
  }
}

// ============================================================================
// BATCH AI ANALYSIS
// ============================================================================

router.post('/make-server-824f083c/rotation/ai-batch-analyze', async (c) => {
  try {
    const pendingContent = await rotation.getPendingContent();
    
    if (pendingContent.length === 0) {
      return c.json({
        result: {
          total_analyzed: 0,
          avg_quality_score: 0,
          recommendations: [],
          performance_insights: [],
          optimization_tips: [],
        },
      });
    }

    // Analyze each content item
    const analyses = [];
    let totalScore = 0;

    for (const content of pendingContent) {
      const suggestion = await generateDetailedAISuggestion(content);
      analyses.push(suggestion);
      totalScore += suggestion.quality_score;
    }

    const avgScore = totalScore / analyses.length;

    // Generate performance insights
    const performanceInsights = generatePerformanceInsights(analyses);
    const optimizationTips = generateOptimizationTips(analyses);

    return c.json({
      result: {
        total_analyzed: pendingContent.length,
        avg_quality_score: avgScore,
        recommendations: analyses,
        performance_insights: performanceInsights,
        optimization_tips: optimizationTips,
      },
    });
  } catch (error) {
    console.error('Error running batch AI analysis:', error);
    return c.json({ error: 'Failed to run batch analysis' }, 500);
  }
});

// ============================================================================
// PERFORMANCE-BASED OPTIMIZATION
// ============================================================================

router.post('/make-server-824f083c/rotation/ai-optimize-performance', async (c) => {
  try {
    const activeContent = await rotation.getActiveContent();
    
    if (activeContent.length === 0) {
      return c.json({
        result: {
          total_analyzed: 0,
          avg_quality_score: 0,
          recommendations: [],
          performance_insights: ['No active content to optimize'],
          optimization_tips: [],
        },
      });
    }

    // Analyze performance metrics and suggest optimizations
    const analyses = [];
    let totalScore = 0;

    for (const content of activeContent) {
      const impressions = await rotation.getImpressions(content.id);
      const suggestion = await generatePerformanceOptimization(content, impressions);
      analyses.push(suggestion);
      totalScore += suggestion.quality_score;
    }

    const avgScore = totalScore / analyses.length;
    const performanceInsights = generatePerformanceInsights(analyses);
    const optimizationTips = generateOptimizationTips(analyses);

    return c.json({
      result: {
        total_analyzed: activeContent.length,
        avg_quality_score: avgScore,
        recommendations: analyses,
        performance_insights: performanceInsights,
        optimization_tips: optimizationTips,
      },
    });
  } catch (error) {
    console.error('Error running performance optimization:', error);
    return c.json({ error: 'Failed to run optimization' }, 500);
  }
});

// ============================================================================
// APPLY AI SUGGESTION
// ============================================================================

router.post('/make-server-824f083c/rotation/ai-apply-suggestion', async (c) => {
  try {
    const { content_id, tier, weight } = await c.req.json();
    
    if (!content_id || !tier || weight === undefined) {
      return c.json({ error: 'content_id, tier, and weight are required' }, 400);
    }

    const updated = await rotation.updateRotationContent(content_id, {
      tier,
      weight,
    });

    if (!updated) {
      return c.json({ error: 'Content not found' }, 404);
    }

    return c.json({ success: true, content: updated });
  } catch (error) {
    console.error('Error applying AI suggestion:', error);
    return c.json({ error: 'Failed to apply suggestion' }, 500);
  }
});

// ============================================================================
// APPLY ALL SUGGESTIONS
// ============================================================================

router.post('/make-server-824f083c/rotation/ai-apply-all', async (c) => {
  try {
    const { recommendations } = await c.req.json();
    
    if (!recommendations || !Array.isArray(recommendations)) {
      return c.json({ error: 'recommendations array is required' }, 400);
    }

    let successCount = 0;
    const results = [];

    for (const rec of recommendations) {
      try {
        const updated = await rotation.updateRotationContent(rec.content_id, {
          tier: rec.suggested_tier,
          weight: rec.suggested_weight,
        });
        if (updated) {
          successCount++;
          results.push({ content_id: rec.content_id, success: true });
        } else {
          results.push({ content_id: rec.content_id, success: false, error: 'Not found' });
        }
      } catch (error) {
        results.push({ content_id: rec.content_id, success: false, error: error.message });
      }
    }

    return c.json({ 
      success: true, 
      applied: successCount,
      total: recommendations.length,
      results,
    });
  } catch (error) {
    console.error('Error applying all AI suggestions:', error);
    return c.json({ error: 'Failed to apply suggestions' }, 500);
  }
});

// ============================================================================
// DETAILED AI ANALYSIS HELPER
// ============================================================================

async function generateDetailedAISuggestion(content: any) {
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIKey) {
    return {
      content_id: content.id,
      title: content.title,
      current_tier: content.tier,
      current_weight: content.weight,
      suggested_tier: 'basic' as rotation.ContentTier,
      suggested_weight: 1,
      quality_score: 50,
      reasoning: 'OpenAI API key not configured',
      strengths: ['Content submitted'],
      improvements: ['Configure AI for detailed analysis'],
      confidence: 50,
    };
  }

  try {
    const prompt = `Analyze this advertising content in detail and provide comprehensive recommendations.

Content Details:
- Title: ${content.title}
- Description: ${content.description}
- Advertiser: ${content.advertiser_name} (${content.advertiser_type})
- Service Category: ${content.service_category}
- Geographic Zones: ${content.geographic_zones.join(', ')}
- Content Type: ${content.content_type}
- Has Image: ${content.image_url ? 'Yes' : 'No'}
- Has Link: ${content.link_url ? 'Yes' : 'No'}

Provide a detailed analysis with:
1. Suggested tier (basic/premium/featured)
2. Suggested weight (1-10)
3. Quality score (0-100)
4. Detailed reasoning
5. 3-5 strengths
6. 3-5 improvements
7. Confidence level (0-100)

Return JSON:
{
  "suggested_tier": "basic" | "premium" | "featured",
  "suggested_weight": number,
  "quality_score": number,
  "reasoning": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "confidence": number
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyst. Provide detailed, actionable feedback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return {
      content_id: content.id,
      title: content.title,
      current_tier: content.tier,
      current_weight: content.weight,
      suggested_tier: analysis.suggested_tier || 'basic',
      suggested_weight: analysis.suggested_weight || 1,
      quality_score: analysis.quality_score || 50,
      reasoning: analysis.reasoning || 'AI analysis complete',
      strengths: analysis.strengths || [],
      improvements: analysis.improvements || [],
      confidence: analysis.confidence || 75,
    };
  } catch (error) {
    console.error('Error generating detailed AI suggestion:', error);
    return {
      content_id: content.id,
      title: content.title,
      current_tier: content.tier,
      current_weight: content.weight,
      suggested_tier: 'basic' as rotation.ContentTier,
      suggested_weight: 1,
      quality_score: 50,
      reasoning: 'AI analysis unavailable',
      strengths: ['Content submitted'],
      improvements: ['Enable AI for detailed feedback'],
      confidence: 50,
    };
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION HELPER
// ============================================================================

async function generatePerformanceOptimization(content: any, impressions: any) {
  const ctr = impressions.ctr || 0;
  const impressionCount = impressions.impressions_count || 0;
  
  // Calculate performance score
  let performanceScore = 50;
  if (ctr > 0.05) performanceScore += 20; // Good CTR
  if (ctr > 0.1) performanceScore += 10; // Excellent CTR
  if (impressionCount > 100) performanceScore += 10; // Good exposure
  if (impressionCount > 500) performanceScore += 10; // High exposure
  
  performanceScore = Math.min(100, performanceScore);
  
  // Determine suggested tier based on performance
  let suggestedTier: rotation.ContentTier = content.tier;
  let suggestedWeight = content.weight;
  
  if (ctr > 0.08 && impressionCount > 200) {
    suggestedTier = 'featured';
    suggestedWeight = 5;
  } else if (ctr > 0.05 && impressionCount > 100) {
    suggestedTier = 'premium';
    suggestedWeight = 3;
  } else if (ctr < 0.02 && impressionCount > 50) {
    suggestedTier = 'basic';
    suggestedWeight = 1;
  }
  
  const strengths = [];
  const improvements = [];
  
  if (ctr > 0.05) strengths.push('High click-through rate');
  if (impressionCount > 100) strengths.push('Good impression volume');
  if (ctr < 0.02) improvements.push('Optimize content to improve CTR');
  if (impressionCount < 50) improvements.push('Increase rotation weight for more exposure');
  
  return {
    content_id: content.id,
    title: content.title,
    current_tier: content.tier,
    current_weight: content.weight,
    suggested_tier: suggestedTier,
    suggested_weight: suggestedWeight,
    quality_score: performanceScore,
    reasoning: `Based on ${impressionCount} impressions and ${(ctr * 100).toFixed(2)}% CTR`,
    strengths: strengths.length > 0 ? strengths : ['Active content'],
    improvements: improvements.length > 0 ? improvements : ['Continue monitoring performance'],
    confidence: impressionCount > 100 ? 85 : 60,
  };
}

// ============================================================================
// INSIGHTS GENERATORS
// ============================================================================

function generatePerformanceInsights(analyses: any[]): string[] {
  const insights = [];
  const avgScore = analyses.reduce((sum, a) => sum + a.quality_score, 0) / analyses.length;
  
  if (avgScore > 75) {
    insights.push('Overall content quality is excellent - keep up the good work!');
  } else if (avgScore < 50) {
    insights.push('Content quality needs improvement - consider providing guidelines to advertisers');
  }
  
  const highQuality = analyses.filter(a => a.quality_score > 80).length;
  if (highQuality > 0) {
    insights.push(`${highQuality} items have exceptional quality and should be prioritized`);
  }
  
  const lowQuality = analyses.filter(a => a.quality_score < 40).length;
  if (lowQuality > 0) {
    insights.push(`${lowQuality} items need significant improvements before approval`);
  }
  
  return insights.length > 0 ? insights : ['Analysis complete - review recommendations above'];
}

function generateOptimizationTips(analyses: any[]): string[] {
  const tips = [];
  
  const needsImages = analyses.filter(a => 
    a.improvements.some(i => i.toLowerCase().includes('image'))
  ).length;
  
  if (needsImages > 0) {
    tips.push('Consider requiring images for all rotation content to improve engagement');
  }
  
  const needsBetterDesc = analyses.filter(a =>
    a.improvements.some(i => i.toLowerCase().includes('description'))
  ).length;
  
  if (needsBetterDesc > 0) {
    tips.push('Provide templates or examples for compelling descriptions');
  }
  
  tips.push('Monitor performance metrics regularly and adjust weights accordingly');
  tips.push('Consider A/B testing different tiers to optimize rotation strategy');
  
  return tips;
}

// ============================================================================
// WEIGHTED RANDOM SELECTION ALGORITHM
// ============================================================================

function weightedRandomSelection(content: any[], count: number): any[] {
  if (content.length === 0) return [];
  if (content.length <= count) return content;

  // Build weighted pool
  const weightedPool: any[] = [];
  
  content.forEach(item => {
    // Each item appears in the pool (weight) times
    // This creates a probability distribution where higher weights = more likely to be selected
    const weight = item.weight || 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(item);
    }
  });

  // Select items without duplicates
  const selected: any[] = [];
  const selectedIds = new Set<string>();

  while (selected.length < count && selectedIds.size < content.length) {
    // Random selection from weighted pool
    const randomIndex = Math.floor(Math.random() * weightedPool.length);
    const candidate = weightedPool[randomIndex];

    // Only add if not already selected
    if (!selectedIds.has(candidate.id)) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  return selected;
}

// ============================================================================
// CALCULATE DISTANCE (HAVERSINE FORMULA)
// ============================================================================

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default router;
