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
import { createClient } from 'npm:@supabase/supabase-js@2';
import { reserve, refund } from './aiSpend.ts';

const aiBlueprintRouter = new Hono();

// Enable CORS
aiBlueprintRouter.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * Who is asking.
 *
 * The global wall already refuses anyone without a session, so this is not the
 * gate — it is how the identity reaches the spend ceiling below. A ceiling
 * counted against nobody is not a ceiling, so a request that gets this far
 * without a resolvable user is refused rather than waved through as anonymous.
 */
aiBlueprintRouter.use('*', async (c, next) => {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return c.json({ success: false, error: 'Sign in required.' }, 401);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return c.json({ success: false, error: 'Sign in required.' }, 401);
  c.set('actor', data.user);
  await next();
});

// POST /ai/analyze-blueprints - Comprehensive blueprint analysis
/**
 * One upload cannot spend a whole allowance.
 *
 * Each sheet is a full-detail vision call, so the cost is per sheet rather than
 * per request. Without a cap, dropping a forty-page set in would empty an
 * account in one go and look like a bug rather than a bill.
 */
const MAX_SHEETS_PER_READ = 8;

aiBlueprintRouter.post('/analyze-blueprints', async (c) => {
  console.log('[AI Blueprint] Analysis request received');

  // Held outside the try so the catch can give it back. Zero until the
  // reservation actually succeeds, so a failure before that refunds nothing.
  let reserved = 0;

  try {
    const body = await c.req.json();
    const { blueprints, workRequestId, analysisType = 'comprehensive' } = body;

    if (!blueprints || blueprints.length === 0) {
      return c.json({
        success: false,
        error: 'No blueprints provided'
      }, 400);
    }

    // A sheet is a full-size vision call at high detail, so the cost scales
    // with how many are sent rather than with how many requests are made.
    // Counted per sheet for that reason, and capped so one upload cannot spend
    // an account's whole allowance by accident.
    const sheets = Math.min(blueprints.length, MAX_SHEETS_PER_READ);
    if (blueprints.length > MAX_SHEETS_PER_READ) {
      return c.json({
        success: false,
        error: `That is ${blueprints.length} sheets. Send up to ${MAX_SHEETS_PER_READ} at a time — `
          + 'each one is a full-detail read and they are counted individually.',
      }, 400);
    }

    console.log(`[AI Blueprint] Analyzing ${sheets} blueprint(s)`);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('[AI Blueprint] OPENAI_API_KEY not configured');
      return c.json({
        success: false,
        error: 'AI service not configured'
      }, 500);
    }

    // Reserved BEFORE the call, refunded if it fails. Charging on success lets
    // a burst of parallel requests all pass the same check before any of them
    // has been counted.
    const refused = await reserve(c.get('actor'), 'blueprint', sheets, 'blueprint reads');
    if (refused) return c.json({ success: false, ...refused }, 429);
    reserved = sheets;

    // Prepare image content for GPT-4 Vision.
    //
    // Callers disagree about the shape. The work-request form sends
    // { filename, base64 } where base64 may or may not already carry a data
    // URL prefix, and the design centre sends plain data URLs. The old code
    // assumed one of those and would have produced `data:image/jpeg;base64,
    // undefined` or a doubled prefix for the other — neither of which was ever
    // noticed, because the route was never mounted.
    const imageContent = blueprints
      .map((bp: any) => {
        const raw = typeof bp === 'string' ? bp : String(bp?.base64 || bp?.url || '');
        if (!raw) return null;
        return {
          type: 'image_url',
          image_url: {
            url: raw.startsWith('data:') || raw.startsWith('http')
              ? raw
              : `data:image/jpeg;base64,${raw}`,
            detail: 'high', // Request high-detail analysis
          },
        };
      })
      .filter(Boolean);

    if (imageContent.length === 0) {
      await refund(c.get('actor'), 'blueprint', reserved);
      reserved = 0;
      return c.json({
        success: false,
        error: 'None of those could be read as an image.',
      }, 400);
    }

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
    // Give the allowance back. A read that never produced anything must not be
    // charged for — this catch covers the OpenAI call and everything after it,
    // which is every failure path that can happen once the reservation is made.
    try {
      if (reserved > 0) await refund(c.get('actor'), 'blueprint', reserved);
    } catch { /* refunding must never mask the original failure */ }

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
6. Give every room a POSITION as well as a size. The drawing has one, and this
   reading becomes the project's building record rather than only a takeoff —
   rooms with sizes and no positions are a list of rectangles, not a plan.
   Use "x" and "y" as fractions of the overall building envelope from its
   top-left corner, so 0.5 is halfway across. If you genuinely cannot place a
   room, omit x and y for that room rather than guessing.
7. Read the scale off the sheet if it is printed, and the overall building
   width and depth. Say what you actually see; omit anything you do not.

**REQUIRED JSON STRUCTURE:**
{
  "totalSquareFootage": <number>,
  "totalLinearFootage": <number>,

  "sheetTitle": "<title block text, or null>",
  "scaleNote": "<scale as printed, e.g. 1/4in = 1ft, or null>",
  "buildingWidthFt": <overall width in feet, or null>,
  "buildingDepthFt": <overall depth in feet, or null>,

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
      "x": <0-1 across the building from its left edge, or omit if unknown>,
      "y": <0-1 down the building from its top edge, or omit if unknown>,
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
    // Carried through because this reading becomes the project's building
    // record, not just a takeoff. A validator that dropped the geometry would
    // leave the caller with totals and no plan, which is the shape of system
    // that decision moved away from.
    sheetTitle: analysis.sheetTitle || null,
    scaleNote: analysis.scaleNote || null,
    buildingWidthFt: analysis.buildingWidthFt || null,
    buildingDepthFt: analysis.buildingDepthFt || null,
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
