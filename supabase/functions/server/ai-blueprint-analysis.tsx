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
import { cors } from 'npm:hono@4/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { reserve, refund } from './aiSpend.ts';
import { recordedOpenAIFetch } from "./aiLedger.ts";

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
    const response = await recordedOpenAIFetch({ agent: 'blueprint-analysis', operation: 'analyse blueprint sheets' }, 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // gpt-4o REFUSED these outright — "I'm sorry, I can't assist with that."
        // on a 1933 magazine floor plan, in nine output tokens, while
        // gpt-4.1-mini read the same image correctly on the same account and
        // the same key. Measured 2026-11-11, both ways round. A model that
        // declines is worth less than a lighter one that reads, so this is the
        // one that reads. It is also the model /ai/vision already uses, and it
        // is priced in modelPricing.ts so the cost lands on the ledger.
        model: 'gpt-4.1-mini',
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
        temperature: 0.2, // Lower temperature for more precise analysis
        /*
         * JSON MODE, BECAUSE WITHOUT IT THIS ROUTE NEVER WORKED.
         *
         * Measured 2026-11-11. Given a real 1933 residence floor plan, gpt-4o
         * answered "I'm unable to analyze the image directly" in nine output
         * tokens — while `/ai/vision`, on the same account and the same image,
         * read the rooms correctly. The image was arriving: ledger `tokens_in`
         * moved with the picture (1495 blank, 2345 for the plan), so it was
         * being seen and declined, not dropped.
         *
         * The difference between the two routes was this one line. Asked for
         * free text the model can refuse in prose; required to answer as a
         * JSON object it cannot, and it reads the drawing instead.
         *
         * The word "json" has to appear in the messages or OpenAI rejects the
         * request outright with a 400 — the same trap `/ai/vision` hit. The
         * prompt ends "Return ONLY the JSON object", so it is already there,
         * and `createAnalysisPrompt` must keep saying so.
         */
        response_format: { type: 'json_object' },
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Blueprint] OpenAI API error:', error);
      throw new Error('OpenAI API request failed');
    }

    const aiResponse = await response.json();
    /*
     * `refusal` as well as `content`. In JSON mode a model that declines puts
     * its reason in `message.refusal` and leaves `content` null — so reading
     * only `content` turns a stated refusal into an empty string and loses the
     * one sentence that says what went wrong. Found exactly that way on
     * 2026-11-11: switching this route to JSON mode made the diagnostic go
     * blank, which looked like a worse failure and was the same one.
     */
    const message = aiResponse?.choices?.[0]?.message || {};
    const analysisText = message.content || message.refusal || '';

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
      /*
       * REFUSE. This used to answer with `createFallbackAnalysis()`, which
       * returned a 1,500 sq ft "Main Room", 450 linear feet and a $25,000
       * materials line under `success: true` — invented numbers, in the exact
       * shape of a reading, with the only hint buried in one item's `notes`.
       *
       * Proved on 2026-11-11 by sending a 1x1 blank PNG: the model correctly
       * said it could not analyse the image, and this route answered 200 with
       * a 1,500 sq ft house. Those numbers feed a takeoff, which becomes a
       * quote, which becomes a contract and then an invoice, and nothing
       * downstream could tell them from a measurement.
       *
       * 422 instead, with the model's own words. BlueprintImport already
       * handles a non-OK response and says "That drawing could not be read."
       * — which was true all along and is what should have been shown.
       */
      return c.json({
        success: false,
        error: 'That drawing could not be read. Nothing was measured, so no '
          + 'figures are being returned — try a clearer scan or a larger image.',
        modelSaid: String(analysisText || '').slice(0, 400),
      }, 422);
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
8. INCHES ARE PART OF THE DIMENSION. A room marked 12'-6" is 12.5 feet, not
   12. A building 30'-6" deep is 30.5, not 30. Convert every dimension to
   decimal feet and keep the inches — dropping them makes every figure on the
   sheet read low, and the error compounds through areas and quantities.
9. If you cannot actually READ a room's dimensions, set its squareFootage and
   its length and width to null. Do not estimate them from how big the room
   looks on the page. A null says "somebody must measure this", which is true
   and useful; a guess is indistinguishable from a reading and is not. Name
   the room anyway — knowing a laundry exists is worth having even with no
   size against it.
10. If the sheet prints a total floor area, report that number as
   totalSquareFootage. A printed area is the architect's own figure and beats
   anything derived from adding rooms up.

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
      "squareFootage": <number, or null if the dimensions cannot be read>,
      "dimensions": {
        "length": <number in decimal feet, inches included, or null>,
        "width": <number in decimal feet, inches included, or null>,
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

/**
 * createFallbackAnalysis() was here, and it is deliberately gone.
 *
 * It returned a 1,500 sq ft house, 450 linear feet and a $25,000 materials
 * estimate whenever the reply would not parse — under success: true, shaped
 * exactly like a measurement, on the path into a quote.
 *
 * If a future change wants a default again: a reading that did not happen has
 * no numbers. The honest answer is the 422 at the parse site.
 */

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

  /*
   * How many rooms came back with no size, and what that does to the total.
   *
   * The model is now told to answer null rather than estimate a room it cannot
   * read, which is the honest answer — but it makes the fallback below
   * dangerous. Adding up rooms when some of them are null produces a confident
   * number that is quietly short by however much was unreadable, which is the
   * same failure as the invented 1,500 sq ft, arrived at from the other
   * direction. So the shortfall is declared rather than absorbed.
   */
  /*
   * Area is arithmetic, so it is done here rather than trusted.
   *
   * Measured 2026-11-11: a room came back as 88 sq ft carrying its own
   * dimensions of 11 x 8.5, which is 93.5. The dimensions were read correctly
   * off the sheet and the multiplication was not — the model had rounded 8'6"
   * to 8 for the area while reporting the right figure beside it. Multiplying
   * two numbers is the one part of this a computer should never delegate.
   *
   * Only when both sides are present. A room the model declined to measure
   * stays null; this corrects arithmetic, it does not fill gaps.
   */
  for (const room of validated.rooms as any[]) {
    const l = Number(room?.dimensions?.length);
    const w = Number(room?.dimensions?.width);
    if (Number.isFinite(l) && Number.isFinite(w) && l > 0 && w > 0) {
      room.squareFootage = Math.round(l * w * 10) / 10;
    }
  }

  const unmeasured = validated.rooms.filter(
    (room: any) => room?.squareFootage === null || room?.squareFootage === undefined,
  ).length;
  (validated as any).unmeasuredRooms = unmeasured;
  (validated as any).totalIsPartial = false;

  // Calculate totals if missing
  if (validated.totalSquareFootage === 0 && validated.rooms.length > 0) {
    validated.totalSquareFootage = validated.rooms.reduce(
      (sum: number, room: any) => sum + (room.squareFootage || 0),
      0
    );
    if (unmeasured > 0) {
      (validated as any).totalIsPartial = true;
      (validated as any).totalNote = `Added up from the rooms, and ${unmeasured} of them `
        + 'could not be measured — so this total is a floor, not the floor area.';
    }
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

/**
 * POST /ai/measure-rooms — a second look at the rooms the sheet read missed.
 *
 * WHAT IT IS FOR
 *
 * Measured 2026-11-11: the whole-sheet read is good on gross area, perimeter
 * and large rooms, and unreliable on small ones — a bathroom printed
 * 7'9" x 7' came back 7 x 3. The lettering on a small room is a few pixels
 * tall once a whole sheet has been scaled to what the model actually looks at,
 * so no prompt fixes it. More pixels do.
 *
 * The client cuts the sheet into overlapping tiles and posts them here; this
 * reads the dimension text off them. The cutting is in the browser because
 * this runtime has no image decoder and decoding multi-megapixel JPEGs in an
 * edge function to crop them would be a poor trade — see
 * `src/app/lib/blueprintSecondPass.ts`.
 *
 * IT ONLY READS. The merge is the client's, and it is deliberately
 * conservative: a tile never overwrites a large room the sheet read got right.
 *
 * COST. One vision call per request carrying every tile, metered per tile
 * against the same `blueprint` allowance as the first read, because that is
 * what it costs. Four tiles doubles the price of reading a sheet, which is why
 * the client only asks when there are rooms worth asking about.
 */
const MAX_TILES = 6;

aiBlueprintRouter.post('/measure-rooms', async (c) => {
  let reserved = 0;
  try {
    const body = await c.req.json().catch(() => ({}));
    const tiles = (Array.isArray(body?.tiles) ? body.tiles : [])
      .map((t: unknown) => String(t || ''))
      .filter((t: string) => t.startsWith('data:'));
    const wanted = (Array.isArray(body?.rooms) ? body.rooms : [])
      .map((r: unknown) => String(r || '').trim())
      .filter(Boolean)
      .slice(0, 40);

    if (!tiles.length) {
      return c.json({ success: false, error: 'No tiles to read.' }, 400);
    }
    if (tiles.length > MAX_TILES) {
      return c.json({
        success: false,
        error: `That is ${tiles.length} tiles. Send up to ${MAX_TILES} — each one is a read.`,
      }, 400);
    }
    if (!wanted.length) {
      // Nothing to look for means nothing to spend. Refusing here rather than
      // reading four tiles and discarding the answer.
      return c.json({ success: true, readings: [], note: 'No rooms were asked about.' });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) return c.json({ success: false, error: 'AI service not configured' }, 500);

    const refused = await reserve(c.get('actor'), 'blueprint', tiles.length, 'blueprint reads');
    if (refused) return c.json({ success: false, ...refused }, 429);
    reserved = tiles.length;

    const prompt = `These images are overlapping tiles cut from one architectural floor plan, at full resolution.

Find the printed dimension text for each of these rooms and read it exactly:
${wanted.map((r: string) => `- ${r}`).join('\n')}

Rules:
- Read what is PRINTED on the drawing. Do not estimate from how big a room looks.
- Inches count: 7'-9" is 7.75 feet, 8'6" is 8.5. Never round to whole feet.
- The same room may appear on more than one tile. Read it once.
- If a room's dimensions are not legible on any tile, return null for both
  numbers. A null is a useful answer; a guess is not.
- Ignore any room not on the list.

Return json of this shape and nothing else:
{"readings":[{"name":"<room as listed above>","lengthFt":<number or null>,"widthFt":<number or null>}]}`;

    const response = await recordedOpenAIFetch(
      { agent: 'blueprint-analysis', operation: 'second pass on small rooms' },
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...tiles.map((t: string) => ({
                type: 'image_url', image_url: { url: t, detail: 'high' },
              })),
            ],
          }],
          max_tokens: 1500,
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
      },
    );

    if (!response.ok) {
      await refund(c.get('actor'), 'blueprint', reserved);
      reserved = 0;
      return c.json({ success: false, error: 'The tiles could not be read.' }, 502);
    }

    const data = await response.json();
    const msg = data?.choices?.[0]?.message || {};
    const text = msg.content || msg.refusal || '';
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }

    if (!parsed) {
      // No fabricated fallback here either. Same rule as the first pass.
      return c.json({
        success: false,
        error: 'The tiles could not be read.',
        modelSaid: String(text).slice(0, 300),
      }, 422);
    }

    const num = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const readings = (Array.isArray(parsed?.readings) ? parsed.readings : [])
      .map((r: any) => ({
        name: String(r?.name ?? '').trim(),
        lengthFt: num(r?.lengthFt),
        widthFt: num(r?.widthFt),
      }))
      .filter((r: any) => r.name);

    return c.json({ success: true, readings, tilesRead: tiles.length });
  } catch (error: any) {
    if (reserved) await refund(c.get('actor'), 'blueprint', reserved).catch(() => {});
    console.log('[AI Blueprint] measure-rooms error:', error?.message || error);
    return c.json({ success: false, error: 'The tiles could not be read.' }, 500);
  }
});

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
