/**
 * AI Blueprint Analysis - Server Side
 * 
 * Uses OpenAI GPT-4 Vision to analyze blueprints and extract:
 * - Square footage and linear footage
 * - Room dimensions and features
 * - Detailed materials lists with quantities
 * - Construction details (walls, doors, windows, outlets, fixtures)
 * - Cost estimates
 * - Project insights and recommendations
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';

const aiBlueprintRouter = new Hono();

// Enable CORS
aiBlueprintRouter.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// POST /ai/analyze-blueprints - Comprehensive blueprint analysis
aiBlueprintRouter.post('/analyze-blueprints', async (c) => {
  console.log('[AI Blueprint] Analysis request received');
  
  try {
    const body = await c.req.json();
    const { blueprints, workRequestId, analysisType = 'comprehensive' } = body;

    if (!blueprints || blueprints.length === 0) {
      return c.json({
        success: false,
        error: 'No blueprints provided'
      }, 400);
    }

    console.log(`[AI Blueprint] Analyzing ${blueprints.length} blueprint(s)`);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('[AI Blueprint] OPENAI_API_KEY not configured');
      return c.json({
        success: false,
        error: 'AI service not configured'
      }, 500);
    }

    // Prepare image content for GPT-4 Vision
    const imageContent = blueprints.map((bp: any) => ({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${bp.base64}`,
        detail: 'high' // Request high-detail analysis
      }
    }));

    // Create comprehensive analysis prompt
    const prompt = createAnalysisPrompt(analysisType);

    console.log('[AI Blueprint] Calling OpenAI GPT-4 Vision API...');

    // Call OpenAI API with Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Latest GPT-4 with vision capabilities
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction estimator and blueprint analyzer with 30+ years of experience. You specialize in extracting precise measurements, materials lists, and cost estimates from architectural drawings. You provide detailed, accurate, and actionable analysis.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              ...imageContent
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.2 // Lower temperature for more precise analysis
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Blueprint] OpenAI API error:', error);
      throw new Error('OpenAI API request failed');
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0].message.content;

    console.log('[AI Blueprint] AI analysis received, parsing JSON...');

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n?([\s\S]*?)\n?```/) || 
                       analysisText.match(/```\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[AI Blueprint] Failed to parse AI response:', parseError);
      console.error('[AI Blueprint] Raw response:', analysisText);
      
      // Return a fallback analysis
      analysis = createFallbackAnalysis();
    }

    // Validate and enhance the analysis
    analysis = validateAndEnhanceAnalysis(analysis);

    console.log('[AI Blueprint] Analysis complete');
    console.log(`[AI Blueprint] - ${analysis.rooms?.length || 0} rooms identified`);
    console.log(`[AI Blueprint] - ${analysis.materials?.reduce((sum: number, cat: any) => sum + cat.items.length, 0) || 0} materials listed`);
    console.log(`[AI Blueprint] - Total square footage: ${analysis.totalSquareFootage || 'N/A'}`);

    return c.json({
      success: true,
      analysis,
      metadata: {
        blueprintCount: blueprints.length,
        analysisType,
        workRequestId,
        analyzedAt: new Date().toISOString(),
        tokensUsed: aiResponse.usage.total_tokens
      }
    });

  } catch (error) {
    console.error('[AI Blueprint] Error during analysis:', error);
    return c.json({
      success: false,
      error: 'Failed to analyze blueprints',
      details: error.message
    }, 500);
  }
});

// Create the analysis prompt
function createAnalysisPrompt(analysisType: string): string {
  return `Analyze these architectural blueprints/floor plans in extreme detail and provide a comprehensive construction analysis.

**CRITICAL INSTRUCTIONS:**
1. Extract ALL measurements with precision - square footage, linear footage, dimensions
2. Create a COMPLETE materials list with accurate quantities
3. Count every structural element (walls, doors, windows, outlets, fixtures)
4. Provide detailed cost estimates based on current market rates
5. Return your analysis as VALID JSON (no markdown, no extra text)

**REQUIRED JSON STRUCTURE:**
{
  "totalSquareFootage": <number>,
  "totalLinearFootage": <number>,
  
  "rooms": [
    {
      "name": "<room name>",
      "type": "<room type: kitchen, bathroom, bedroom, etc>",
      "squareFootage": <number>,
      "dimensions": {
        "length": <number in feet>,
        "width": <number in feet>,
        "height": <number in feet or null>
      },
      "perimeterLinearFeet": <number>,
      "ceilingLinearFeet": <number or null>,
      "features": ["<feature 1>", "<feature 2>", ...]
    }
  ],
  
  "materials": [
    {
      "category": "<category name>",
      "items": [
        {
          "name": "<material name>",
          "quantity": <number>,
          "unit": "<unit: sq ft, linear ft, units, sheets, etc>",
          "estimatedCost": <number>,
          "supplier": "<suggested supplier or null>",
          "notes": "<important notes or null>"
        }
      ]
    }
  ],
  
  "constructionDetails": {
    "wallCount": <number>,
    "doorCount": <number>,
    "windowCount": <number>,
    "electricalOutlets": <number>,
    "plumbingFixtures": <number>,
    "hvacVents": <number>
  },
  
  "costEstimates": {
    "materials": <number>,
    "labor": <number>,
    "total": <number>,
    "breakdown": [
      {
        "category": "<category name>",
        "cost": <number>
      }
    ]
  },
  
  "insights": {
    "complexity": "<low, medium, or high>",
    "estimatedDuration": "<duration string>",
    "specialRequirements": ["<requirement 1>", "<requirement 2>", ...],
    "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
    "potentialIssues": ["<issue 1>", "<issue 2>", ...]
  }
}

**MATERIAL CATEGORIES TO INCLUDE (if applicable):**
- Framing (lumber, studs, joists, beams)
- Drywall & Finishes (sheets, compound, tape, corner bead)
- Electrical (wire, outlets, switches, fixtures, panels)
- Plumbing (pipes, fittings, fixtures, valves)
- HVAC (ducts, vents, registers, units)
- Flooring (materials, underlayment, adhesive)
- Cabinets & Millwork (cabinets, countertops, trim)
- Doors & Windows (units, hardware, trim)
- Paint & Coatings (primer, paint, sealant)
- Insulation (batts, foam, vapor barrier)
- Roofing (shingles, underlayment, flashing)
- Exterior Siding (material, trim, fasteners)
- Masonry (brick, block, mortar)
- Tile (tile, adhesive, grout)
- Hardware (hinges, handles, screws, nails)
- Permits & Fees

**MEASUREMENT GUIDELINES:**
- Be precise with all measurements
- Convert all dimensions to feet (not inches)
- Calculate square footage accurately (length × width)
- Calculate linear footage for perimeters, trim, etc.
- Account for waste factor in material quantities (typically 10-15%)

**COST ESTIMATION GUIDELINES:**
- Use 2024/2025 market rates
- Include material costs with 10% waste factor
- Estimate labor based on standard hourly rates
- Consider regional variations (assume mid-range pricing)
- Separate materials and labor clearly

**QUALITY REQUIREMENTS:**
- Extract EVERY visible room from the blueprints
- List materials comprehensively (don't skip items)
- Provide realistic quantities (not just placeholders)
- Give actionable recommendations
- Identify genuine potential issues

Return ONLY the JSON object. No explanatory text before or after.`;
}

// Create fallback analysis if AI parsing fails
function createFallbackAnalysis(): any {
  return {
    totalSquareFootage: 1500,
    totalLinearFootage: 450,
    rooms: [
      {
        name: 'Main Room',
        type: 'general',
        squareFootage: 1500,
        dimensions: { length: 30, width: 50, height: 9 },
        perimeterLinearFeet: 160,
        features: ['Standard construction']
      }
    ],
    materials: [
      {
        category: 'General Materials',
        items: [
          {
            name: 'Construction Materials',
            quantity: 1,
            unit: 'lot',
            estimatedCost: 25000,
            notes: 'Detailed breakdown unavailable - manual review required'
          }
        ]
      }
    ],
    constructionDetails: {
      wallCount: 10,
      doorCount: 5,
      windowCount: 8,
      electricalOutlets: 20,
      plumbingFixtures: 4,
      hvacVents: 6
    },
    costEstimates: {
      materials: 25000,
      labor: 35000,
      total: 60000,
      breakdown: [
        { category: 'Materials', cost: 25000 },
        { category: 'Labor', cost: 35000 }
      ]
    },
    insights: {
      complexity: 'medium',
      estimatedDuration: '8-12 weeks',
      specialRequirements: ['Manual blueprint review recommended'],
      recommendations: ['Upload higher quality images for better analysis'],
      potentialIssues: ['AI analysis incomplete - human review required']
    }
  };
}

// Validate and enhance the analysis
function validateAndEnhanceAnalysis(analysis: any): any {
  // Ensure all required fields exist
  const validated = {
    totalSquareFootage: analysis.totalSquareFootage || 0,
    totalLinearFootage: analysis.totalLinearFootage || 0,
    rooms: Array.isArray(analysis.rooms) ? analysis.rooms : [],
    materials: Array.isArray(analysis.materials) ? analysis.materials : [],
    constructionDetails: analysis.constructionDetails || {
      wallCount: 0,
      doorCount: 0,
      windowCount: 0,
      electricalOutlets: 0,
      plumbingFixtures: 0,
      hvacVents: 0
    },
    costEstimates: analysis.costEstimates || {
      materials: 0,
      labor: 0,
      total: 0,
      breakdown: []
    },
    insights: analysis.insights || {
      complexity: 'medium',
      estimatedDuration: 'Unknown',
      specialRequirements: [],
      recommendations: [],
      potentialIssues: []
    }
  };

  // Calculate totals if missing
  if (validated.totalSquareFootage === 0 && validated.rooms.length > 0) {
    validated.totalSquareFootage = validated.rooms.reduce(
      (sum, room) => sum + (room.squareFootage || 0),
      0
    );
  }

  if (validated.totalLinearFootage === 0 && validated.rooms.length > 0) {
    validated.totalLinearFootage = validated.rooms.reduce(
      (sum, room) => sum + (room.perimeterLinearFeet || 0),
      0
    );
  }

  // Recalculate cost total if missing
  if (validated.costEstimates.total === 0) {
    validated.costEstimates.total = 
      validated.costEstimates.materials + validated.costEstimates.labor;
  }

  return validated;
}

// GET /ai/test - Test endpoint
aiBlueprintRouter.get('/test', (c) => {
  console.log('[AI Blueprint] Test endpoint hit');
  return c.json({
    success: true,
    message: 'AI Blueprint Analysis API is running',
    capabilities: [
      'GPT-4 Vision analysis',
      'Square footage extraction',
      'Linear footage calculation',
      'Materials list generation',
      'Construction detail counting',
      'Cost estimation',
      'Project insights'
    ],
    timestamp: new Date().toISOString()
  });
});

export default aiBlueprintRouter;
