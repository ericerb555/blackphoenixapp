/**
 * AI Plan Builder
 * Lets any portal user (customer, company, vendor, landlord, etc.) describe their
 * needs in plain language and get a recommended custom subscription / maintenance
 * plan back: a curated set of services, a frequency, a skill level, and a short
 * rationale. Pricing is intentionally NOT computed here — the frontend owns the
 * authoritative pricing math (computePrice in maintenancePlans.ts) so numbers stay
 * consistent with the visible catalog.
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import OpenAI from 'npm:openai@4';

const planBuilderRouter = new Hono();

planBuilderRouter.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

planBuilderRouter.get('/test', (c) => {
  console.log('[AI Plan Builder] Test endpoint hit');
  return c.json({
    success: true,
    message: 'AI Plan Builder is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /generate
 * Body:
 *   entityType: string           — homeowner | condo | landlord | commercial
 *   portalRole: string           — the portal the request came from (for context)
 *   needs: string                — the user's plain-language description
 *   catalog: Array<{ id, name, category, baseMonthlyPrice, unit, nhSpecific? }>
 *   frequencies: string[]        — allowed frequency ids
 *   skillLevels: string[]        — allowed skill level ids
 *   history?: { role, content }[]— prior conversation turns (optional)
 */
planBuilderRouter.post('/generate', async (c) => {
  console.log('[AI Plan Builder] Received request');

  try {
    const body = await c.req.json();
    const {
      entityType,
      portalRole,
      needs,
      catalog = [],
      frequencies = ['monthly', 'quarterly', 'annual'],
      skillLevels = ['apprentice', 'journeyman', 'master'],
      history = [],
    } = body;

    if (!needs || typeof needs !== 'string') {
      return c.json({ success: false, error: 'A "needs" description is required.' }, 400);
    }

    // Compact the catalog so the model only sees what it needs to pick from.
    const catalogForModel = (catalog as any[]).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      basePrice: s.baseMonthlyPrice,
      unit: s.unit,
      nhSpecific: !!s.nhSpecific,
    }));

    const systemPrompt = `You are a maintenance-plan advisor for The Black Phoenix Company, a New Hampshire property services firm.
You help ${portalRole || 'a customer'} (entity type: "${entityType}") build a custom subscription / maintenance plan by choosing from an APPROVED service catalog.

Rules:
- You may ONLY recommend services whose "id" appears in the provided catalog. Never invent services or ids.
- Pick a realistic, non-redundant set of services that matches the user's stated needs and budget cues.
- Choose exactly one frequency from: ${frequencies.join(', ')}.
- Choose exactly one skillLevel from: ${skillLevels.join(', ')}.
- Prefer NH-specific services when the user's needs mention winter, snow, ice, radon, code, or compliance.
- Keep the plan focused: typically 3-8 services unless the user clearly asks for comprehensive coverage.
- Do NOT compute or mention dollar totals; the app calculates pricing.

Return ONLY valid JSON (no markdown) in this exact shape:
{
  "planName": "short descriptive name",
  "serviceIds": ["id1", "id2"],
  "frequency": "one of the allowed frequency ids",
  "skillLevel": "one of the allowed skill level ids",
  "rationale": "2-3 sentence plain-language explanation of why this plan fits",
  "followUpQuestion": "one optional short question to refine the plan, or empty string"
}`;

    const userPrompt = `Approved service catalog (JSON):
${JSON.stringify(catalogForModel)}

User's needs: "${needs}"`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: 'user', content: userPrompt },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.5,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content?.trim() || '{}';
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let plan: any;
    try {
      plan = JSON.parse(clean);
    } catch (parseErr) {
      console.error('[AI Plan Builder] Failed to parse model output:', parseErr, 'raw:', raw);
      return c.json({
        success: false,
        error: 'The AI returned an unexpected format. Please try rephrasing your needs.',
      }, 502);
    }

    // Validate serviceIds against the real catalog so the client never gets a bad id.
    const validIds = new Set((catalog as any[]).map((s) => s.id));
    const serviceIds: string[] = Array.isArray(plan.serviceIds)
      ? plan.serviceIds.filter((id: string) => validIds.has(id))
      : [];

    const frequency = frequencies.includes(plan.frequency) ? plan.frequency : frequencies[0];
    const skillLevel = skillLevels.includes(plan.skillLevel) ? plan.skillLevel : 'journeyman';

    console.log('[AI Plan Builder] Generated plan:', {
      entityType,
      portalRole,
      serviceCount: serviceIds.length,
      frequency,
      skillLevel,
    });

    return c.json({
      success: true,
      plan: {
        planName: plan.planName || 'Custom Maintenance Plan',
        serviceIds,
        frequency,
        skillLevel,
        rationale: plan.rationale || '',
        followUpQuestion: plan.followUpQuestion || '',
      },
    });
  } catch (error: any) {
    console.error('[AI Plan Builder] Error:', error);
    return c.json({
      success: false,
      error: error?.message || 'Failed to generate plan',
    }, 500);
  }
});

export default planBuilderRouter;
