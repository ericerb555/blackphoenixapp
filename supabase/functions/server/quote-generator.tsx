/**
 * AI Quote Generator — Estimator-Grade Engine
 *
 * Produces contractor-quality estimates using a rigorous quantity-takeoff
 * methodology rather than a loose "list some materials" prompt. Key accuracy
 * features (what makes this beat generic quote tools):
 *   - Real quantity takeoff with per-material WASTE FACTORS by material type
 *   - Trade-based labor with crew size + productivity reasoning
 *   - Location-aware labor rates AND sales tax (tax applied to materials only,
 *     which matches most US jurisdictions for construction)
 *   - Explicit soft costs: permits, disposal/dumpster, equipment rental,
 *     mobilization — the line items amateurs forget
 *   - Overhead, profit, and contingency broken out transparently
 *   - Single gpt-4o call in strict JSON mode (cannot fail to parse)
 *   - A structured, deterministic fallback if the model or key is unavailable
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import OpenAI from 'npm:openai@4';

const quoteRouter = new Hono();

quoteRouter.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

// ---------------------------------------------------------------------------
// Estimator engine
// ---------------------------------------------------------------------------

const ESTIMATOR_MODEL = 'gpt-4o';

interface EstimatorInput {
  title?: string;
  serviceType?: string;
  description?: string;
  location?: string;
  estimatedValue?: number;
  extra?: string; // any additional structured context (complexity, blueprint, etc.)
}

// The master system prompt. This encodes the estimating DISCIPLINE, which is
// what drives accuracy — the model is instructed to do a real takeoff, apply
// waste, size crews, and account for the soft costs contractors actually bill.
const SYSTEM_PROMPT = `You are a licensed General Contractor and ASPE-certified professional construction estimator with 25 years of field experience across residential and light-commercial work. You produce bid-quality estimates that a real contractor could hand to a customer.

Follow this methodology every time:
1. QUANTITY TAKEOFF — Derive realistic quantities from the scope. If dimensions aren't given, infer them from the project type and estimated value, and state that assumption. Never invent absurd quantities.
2. WASTE FACTORS — Apply industry-standard waste to each material by type: dimensional lumber ~10%, sheet goods/drywall ~10%, tile ~12%, flooring ~8%, paint ~5%, wire/cable ~5%, concrete ~5%, roofing ~10%, trim ~12%. Express as a decimal (0.10 = 10%).
3. LABOR — Break work into trades (e.g., demolition, framing, electrical, plumbing, HVAC, drywall, tile, paint, cleanup). For each, reason about crew size and productivity to arrive at hours. Use 2026 prevailing wage rates for the given LOCATION (higher in CA/NY/major metros, lower in rural/southern markets). Include a licensed-trade premium where required (electrician, plumber, HVAC).
4. SOFT COSTS — Always consider and include when applicable: building permits & inspection fees, debris disposal / dumpster rental, equipment/tool rental, mobilization & site protection, and testing/commissioning.
5. MARKUPS — Provide overhead, profit, and contingency as percentages appropriate to the project's risk and size (typical: overhead 10%, profit 10%, contingency 5%; raise contingency for demolition-heavy or unknown-condition work).
6. TAX — Provide the local combined SALES TAX rate for the LOCATION as a decimal. It will be applied to MATERIALS only.

Be specific: real product descriptions with sizes/specs, real unit-of-measure, and realistic 2026 prices. Prefer more granular line items over vague lots. Return ONLY the JSON object described by the user — no markdown, no commentary.`;

function buildUserPrompt(input: EstimatorInput): string {
  return `Produce a complete estimate for this project.

PROJECT
- Title: ${input.title || 'N/A'}
- Service Type: ${input.serviceType || 'General Construction'}
- Description: ${input.description || 'N/A'}
- Location: ${input.location || 'Not specified — assume a US average-cost metro'}
- Customer's ballpark budget: ${input.estimatedValue ? `$${Number(input.estimatedValue).toLocaleString()}` : 'not provided'}
${input.extra ? `\nADDITIONAL CONTEXT\n${input.extra}` : ''}

Return a JSON object with EXACTLY this shape (all numbers plain, no strings, no currency symbols):
{
  "projectSummary": "2-3 sentence scope summary written for the customer",
  "regionalNote": "one line on how location affected labor rates and tax",
  "confidence": "high" | "medium" | "low",
  "assumptions": ["key assumptions you made about scope/dimensions"],
  "materials": [
    {
      "name": "short name",
      "description": "specific product with size/spec",
      "category": "e.g. Lumber, Drywall, Electrical, Plumbing, Finishes, Fixtures, Consumables",
      "quantity": number,
      "unit": "each | linear ft | sq ft | sheet | gallon | box | lot",
      "wasteFactor": number,
      "unitCost": number,
      "vendor": "Home Depot | Lowe's | Grainger | Supply House | Local"
    }
  ],
  "labor": [
    {
      "role": "trade / role, e.g. 'Licensed Electrician'",
      "description": "what they do on this job",
      "trade": "demolition | framing | electrical | plumbing | hvac | drywall | tile | flooring | paint | roofing | general | cleanup",
      "crewSize": number,
      "hours": number,
      "hourlyRate": number,
      "productivityNote": "brief basis for the hours"
    }
  ],
  "processSteps": [
    { "step": "phase name", "description": "brief", "estimatedDuration": "e.g. 2-3 days", "trade": "primary trade" }
  ],
  "additionalCosts": [
    { "name": "e.g. Building Permit", "description": "brief", "amount": number, "category": "Permit | Disposal | Equipment | Mobilization | Testing | Other" }
  ],
  "overheadPercent": number,
  "profitPercent": number,
  "contingencyPercent": number,
  "taxRatePercent": number
}

Include 8-25 material line items and 4-10 labor line items for a typical project. Scale detail with project size.`;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Turn the raw model JSON into the shape the frontend editor expects, with all
// totals computed server-side (never trust the model's arithmetic).
function assembleEstimate(raw: any, input: EstimatorInput) {
  const rid = () => crypto.randomUUID();

  const materials = (Array.isArray(raw?.materials) ? raw.materials : []).map((m: any) => {
    const qty = Number(m.quantity) || 0;
    const waste = Math.max(0, Math.min(0.5, Number(m.wasteFactor) || 0));
    const unitCost = Number(m.unitCost) || 0;
    // Waste increases the quantity actually purchased.
    const purchasedQty = qty * (1 + waste);
    const totalCost = round2(purchasedQty * unitCost);
    return {
      id: rid(),
      name: m.name || m.description || 'Material',
      description: m.description || m.name || '',
      category: m.category || 'General',
      quantity: qty,
      wasteFactor: waste,
      unit: m.unit || 'each',
      unitCost: round2(unitCost),
      totalCost,
      supplier: m.vendor || 'Supply House',
      visible: true,
    };
  });

  const labor = (Array.isArray(raw?.labor) ? raw.labor : []).map((l: any) => {
    const hours = Number(l.hours) || 0;
    const rate = Number(l.hourlyRate ?? l.rate) || 0;
    return {
      id: rid(),
      role: l.role || l.description || 'Labor',
      description: l.description || l.role || '',
      trade: l.trade || 'general',
      crewSize: Number(l.crewSize) || 1,
      hours,
      hourlyRate: round2(rate),
      totalCost: round2(hours * rate),
      productivityNote: l.productivityNote || '',
      visible: true,
    };
  });

  const processSteps = (Array.isArray(raw?.processSteps) ? raw.processSteps : []).map((s: any, i: number) => ({
    id: rid(),
    stepNumber: i + 1,
    title: s.step || s.title || `Phase ${i + 1}`,
    description: s.description || '',
    estimatedDuration: s.estimatedDuration || '',
    trade: s.trade || 'general',
  }));

  const additionalCosts = (Array.isArray(raw?.additionalCosts) ? raw.additionalCosts : []).map((a: any) => ({
    id: rid(),
    name: a.name || 'Additional Cost',
    description: a.description || '',
    category: a.category || 'Other',
    amount: round2(Number(a.amount) || 0),
  }));

  const materialsSubtotal = round2(materials.reduce((s: number, m: any) => s + m.totalCost, 0));
  const laborSubtotal = round2(labor.reduce((s: number, l: any) => s + l.totalCost, 0));
  const additionalCostsSubtotal = round2(additionalCosts.reduce((s: number, a: any) => s + a.amount, 0));

  const directCost = round2(materialsSubtotal + laborSubtotal + additionalCostsSubtotal);

  const overheadPercent = Math.max(0, Math.min(0.4, Number(raw?.overheadPercent) || 0.10));
  const profitPercent = Math.max(0, Math.min(0.4, Number(raw?.profitPercent) || 0.10));
  const contingencyPercent = Math.max(0, Math.min(0.4, Number(raw?.contingencyPercent) || 0.05));

  const overheadAmount = round2(directCost * overheadPercent);
  const profitAmount = round2(directCost * profitPercent);
  const contingencyAmount = round2(directCost * contingencyPercent);

  const preTaxTotal = round2(directCost + overheadAmount + profitAmount + contingencyAmount);

  // Sales tax on materials only (accurate for most US construction contracts).
  const taxRate = Math.max(0, Math.min(0.15, Number(raw?.taxRatePercent) || 0.08));
  const taxAmount = round2(materialsSubtotal * taxRate);

  const totalCost = round2(preTaxTotal + taxAmount);

  return {
    materials,
    labor,
    processSteps,
    additionalCosts,
    materialsSubtotal,
    laborSubtotal,
    additionalCostsSubtotal,
    directCost,
    overheadPercent, overheadAmount,
    profitPercent, profitAmount,
    contingencyPercent, contingencyAmount,
    preTaxTotal,
    taxRate,
    taxAmount,
    totalCost,
    projectSummary: raw?.projectSummary || '',
    regionalNote: raw?.regionalNote || '',
    confidence: raw?.confidence || 'medium',
    assumptions: Array.isArray(raw?.assumptions) ? raw.assumptions : [],
  };
}

// Deterministic fallback used only when the model/API is unavailable so the app
// never hands the user an empty quote.
function heuristicEstimate(input: EstimatorInput) {
  const value = Number(input.estimatedValue) || 8000;
  const materialsSubtotal = round2(value * 0.45);
  const laborSubtotal = round2(value * 0.35);
  return assembleEstimate({
    projectSummary: `Preliminary ${input.serviceType || 'construction'} estimate generated offline. Refine line items before sending.`,
    regionalNote: 'Offline estimate — location-based rates not applied.',
    confidence: 'low',
    assumptions: ['Generated without AI access; based on ballpark budget split.'],
    materials: [
      { name: 'Primary materials', description: `${input.serviceType || 'Project'} core materials`, category: 'General', quantity: 1, unit: 'lot', wasteFactor: 0.1, unitCost: materialsSubtotal, vendor: 'Supply House' },
    ],
    labor: [
      { role: 'Skilled Labor', description: `${input.serviceType || 'Project'} installation`, trade: 'general', crewSize: 2, hours: Math.max(16, Math.round(laborSubtotal / 75)), hourlyRate: 75, productivityNote: 'Budget-derived estimate' },
    ],
    processSteps: [
      { step: 'Preparation', description: 'Site prep and protection', estimatedDuration: '1-2 days', trade: 'general' },
      { step: 'Execution', description: 'Main construction work', estimatedDuration: '3-5 days', trade: 'general' },
      { step: 'Completion', description: 'Punch list, cleanup, final walkthrough', estimatedDuration: '1 day', trade: 'cleanup' },
    ],
    additionalCosts: [
      { name: 'Debris Disposal', description: 'Dumpster / haul-away', amount: round2(value * 0.03), category: 'Disposal' },
    ],
    overheadPercent: 0.10,
    profitPercent: 0.10,
    contingencyPercent: 0.05,
    taxRatePercent: 0.08,
  }, input);
}

export async function runEstimator(input: EstimatorInput) {
  if (!Deno.env.get('OPENAI_API_KEY')) {
    console.log('[AI Quote Generator] No OPENAI_API_KEY — using heuristic fallback.');
    return { estimate: heuristicEstimate(input), usedAI: false };
  }
  try {
    const completion = await openai.chat.completions.create({
      model: ESTIMATOR_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
      ],
      temperature: 0.2, // low temp for consistent, defensible numbers
      max_tokens: 4000,
      response_format: { type: 'json_object' }, // guarantees parseable JSON
    });
    const raw = JSON.parse(completion.choices[0].message.content || '{}');
    const estimate = assembleEstimate(raw, input);
    // If the model returned nothing usable, fall back rather than send an empty quote.
    if (estimate.materials.length === 0 && estimate.labor.length === 0) {
      return { estimate: heuristicEstimate(input), usedAI: false };
    }
    return { estimate, usedAI: true };
  } catch (error: any) {
    console.error('[AI Quote Generator] Estimator error, falling back:', error?.message || error);
    return { estimate: heuristicEstimate(input), usedAI: false };
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

quoteRouter.get('/test', (c) => {
  console.log('[AI Quote Generator] Test endpoint hit');
  return c.json({ success: true, message: 'AI Quote Generator is running', model: ESTIMATOR_MODEL, timestamp: new Date().toISOString() });
});

// POST /generate-quote — general generation (kept for backward compatibility)
quoteRouter.post('/generate-quote', async (c) => {
  try {
    const body = await c.req.json();
    const { serviceType, description, workRequestData } = body;

    const extraParts: string[] = [];
    if (workRequestData?.complexityLevel) extraParts.push(`Complexity: ${workRequestData.complexityLevel}`);
    if (workRequestData?.duration) extraParts.push(`Rough duration estimate: ${workRequestData.duration} hours`);
    if (workRequestData?.requiresPermit != null) extraParts.push(`Requires permit: ${workRequestData.requiresPermit ? 'Yes' : 'No'}`);
    if (workRequestData?.equipment?.length) extraParts.push(`Equipment needed: ${workRequestData.equipment.join(', ')}`);

    const { estimate, usedAI } = await runEstimator({
      title: body.title,
      serviceType,
      description,
      location: body.location || workRequestData?.location,
      estimatedValue: body.estimatedValue ?? workRequestData?.estimatedValue,
      extra: extraParts.join('\n'),
    });

    // Legacy-compatible field names for older callers.
    const laborItems = estimate.labor.map((l: any) => ({ description: l.role, hours: l.hours, rate: l.hourlyRate }));
    const materialItems = estimate.materials.map((m: any) => ({ description: m.description, quantity: m.quantity, unitPrice: m.unitCost, unit: m.unit, vendor: m.supplier }));

    return c.json({
      success: true,
      usedAI,
      estimate,
      laborItems,
      materialItems,
      summary: `Total estimate: $${estimate.totalCost.toLocaleString()} — ${estimate.materials.length} materials, ${estimate.labor.length} labor tasks (confidence: ${estimate.confidence})`,
      totals: { labor: estimate.laborSubtotal, materials: estimate.materialsSubtotal, grandTotal: estimate.totalCost },
    });
  } catch (error: any) {
    console.error('[AI Quote Generator] /generate-quote error:', error);
    return c.json({ success: false, error: error.message || 'Failed to generate quote', laborItems: [], materialItems: [] }, 500);
  }
});

// POST /make-server-3eae23a6/auto-generate-quote — pipeline auto-generation
quoteRouter.post('/make-server-3eae23a6/auto-generate-quote', async (c) => {
  try {
    const body = await c.req.json();
    const { workRequest } = body;
    if (!workRequest) return c.json({ success: false, error: 'Work request data is required' }, 400);

    const extraParts: string[] = [];
    if (workRequest.blueprintAnalysis) {
      const b = workRequest.blueprintAnalysis;
      extraParts.push('Blueprint analysis available:');
      if (b.rooms?.length) extraParts.push(`- Rooms identified: ${b.rooms.length} (${b.rooms.map((r: any) => r.name || r.type).filter(Boolean).join(', ')})`);
      if (b.squareFootage) extraParts.push(`- Total square footage: ${b.squareFootage}`);
      if (b.materials?.length) extraParts.push(`- AI-suggested materials: ${b.materials.length}`);
      if (b.estimatedCosts?.total) extraParts.push(`- Prior AI cost estimate: $${Number(b.estimatedCosts.total).toLocaleString()}`);
    }

    const { estimate, usedAI } = await runEstimator({
      title: workRequest.title,
      serviceType: workRequest.serviceType,
      description: workRequest.description,
      location: workRequest.location,
      estimatedValue: workRequest.estimatedValue,
      extra: extraParts.join('\n'),
    });

    console.log('[AI Quote Generator] Auto-generated quote:', {
      usedAI,
      materials: estimate.materials.length,
      labor: estimate.labor.length,
      processSteps: estimate.processSteps.length,
      totalCost: estimate.totalCost,
      confidence: estimate.confidence,
    });

    // Backward-compatible top-level fields + richer estimate object.
    return c.json({
      success: true,
      usedAI,
      materials: estimate.materials,
      labor: estimate.labor,
      processSteps: estimate.processSteps,
      additionalCosts: estimate.additionalCosts,
      materialsSubtotal: estimate.materialsSubtotal,
      laborSubtotal: estimate.laborSubtotal,
      additionalCostsSubtotal: estimate.additionalCostsSubtotal,
      directCost: estimate.directCost,
      overheadPercent: estimate.overheadPercent,
      overheadAmount: estimate.overheadAmount,
      profitPercent: estimate.profitPercent,
      profitAmount: estimate.profitAmount,
      contingencyPercent: estimate.contingencyPercent,
      contingencyAmount: estimate.contingencyAmount,
      preTaxTotal: estimate.preTaxTotal,
      taxRate: estimate.taxRate,
      taxAmount: estimate.taxAmount,
      totalCost: estimate.totalCost,
      projectSummary: estimate.projectSummary,
      regionalNote: estimate.regionalNote,
      confidence: estimate.confidence,
      assumptions: estimate.assumptions,
    });
  } catch (error: any) {
    console.error('[AI Quote Generator] Pipeline auto-generation error:', error);
    return c.json({ success: false, error: error.message || 'Failed to auto-generate quote' }, 500);
  }
});

export default quoteRouter;
