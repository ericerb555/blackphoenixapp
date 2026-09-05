/**
 * Generate Quote from Blueprint Analysis
 * 
 * Takes AI blueprint analysis results and auto-generates a complete quote
 * with labor and materials from the analyzed blueprints
 */

import { Hono } from 'npm:hono@4';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

const quoteFromBlueprintRouter = new Hono();

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

/** The signed-in person behind the request, or null. */
async function blueprintActor(c: any): Promise<{ id: string; email: string } | null> {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: String(data.user.id), email: String(data.user.email || '').toLowerCase() };
  } catch {
    return null;
  }
}

/*
 * CORS is not set here.
 *
 * It used to be, from the days when this router was standalone and unmounted.
 * `index.tsx` already applies it across `/*`, and a second `use('*')` inside a
 * sub-app mounted at `/quotes` would run as middleware for everything under
 * that prefix — including `/quotes/by-token/:token/sign`, which is the public
 * signing route. Duplicating a permissive CORS policy onto a signing endpoint
 * is not a thing to do by accident on the way to fixing a 404.
 */

// POST /quotes/generate-from-blueprint - Auto-generate quote from blueprint analysis
quoteFromBlueprintRouter.post('/generate-from-blueprint', async (c) => {
  console.log('[Quote from Blueprint] Request received');

  /**
   * Who is asking.
   *
   * This route had no check of any kind while it was unmounted. It writes a
   * quote into the store, and the customer work request form calls it — so it
   * has to admit customers, but it must know which one, or a quote lands with no
   * owner and no way to tell whose blueprint produced it.
   *
   * Prices are not taken from the request and never were: the labour rates and
   * the markup are read from the company's own settings and the totals are
   * computed here. That part was already right and is the part that matters.
   */
  const caller = await blueprintActor(c);
  if (!caller) {
    return c.json({ success: false, error: 'Sign in to generate a quote.' }, 401);
  }

  try {
    const body = await c.req.json();
    const { workRequestId, blueprintAnalysis, clientInfo, projectInfo } = body;

    if (!blueprintAnalysis) {
      return c.json({
        success: false,
        error: 'No blueprint analysis provided'
      }, 400);
    }

    console.log('[Quote from Blueprint] Generating quote...');
    console.log(`- Work Request: ${workRequestId}`);
    console.log(`- Square Footage: ${blueprintAnalysis.totalSquareFootage}`);
    console.log(`- Materials: ${blueprintAnalysis.materials?.length || 0} categories`);

    // Load configured labor rates
    const laborRatesData = await kv.get('labor_rates_config');
    const profitSettings = await kv.get('profit_settings');

    console.log('[Quote from Blueprint] Labor rates loaded:', !!laborRatesData);
    console.log('[Quote from Blueprint] Profit settings loaded:', !!profitSettings);

    // Generate quote number
    const quoteNumber = `QT-BP-${Date.now().toString().slice(-8)}`;

    // Convert blueprint materials to quote materials
    const quoteMaterials = [];
    let materialIndex = 1;

    if (blueprintAnalysis.materials && Array.isArray(blueprintAnalysis.materials)) {
      for (const category of blueprintAnalysis.materials) {
        for (const item of category.items) {
          quoteMaterials.push({
            id: `m${materialIndex++}`,
            name: item.name,
            description: item.notes || `${category.category} - ${item.name}`,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.estimatedCost / item.quantity || item.estimatedCost,
            total: item.estimatedCost,
            category: category.category,
            supplier: item.supplier || null,
            visible: true,
            editable: true
          });
        }
      }
    }

    // Generate labor items based on square footage and blueprint details
    const quoteLaborItems = [];
    let laborIndex = 1;

    const squareFootage = blueprintAnalysis.totalSquareFootage || 0;
    const roomCount = blueprintAnalysis.rooms?.length || 1;
    
    // Get labor rates from config or use defaults
    const defaultRates = laborRatesData?.laborRates || [
      { name: 'Project Manager', hourlyRate: 85 },
      { name: 'Lead Carpenter', hourlyRate: 65 },
      { name: 'Carpenter', hourlyRate: 45 },
      { name: 'Electrician', hourlyRate: 95 },
      { name: 'Plumber', hourlyRate: 105 },
      { name: 'Painter', hourlyRate: 50 },
      { name: 'General Labor', hourlyRate: 40 }
    ];

    /**
     * READ THIS BEFORE TRUSTING THE HOURS BELOW.
     *
     * `0.5 hours per square foot`, `squareFootage * 0.15` for carpentry, and the
     * fallback hourly rates above are figures that were typed into this file.
     * They are not Black Phoenix's measured production rates and not an
     * industry table anybody can cite — which is exactly the problem
     * `laborTasks.ts` was written to solve, with per-trade man-hours marked
     * `source: 'seed'` or `source: 'yours'` so the difference is visible.
     *
     * This route predates that module and still does its own arithmetic. The
     * quote it produces is therefore marked `binding: false` with
     * `provenance: 'blueprint-analysis'`, it is a draft, and it goes to the
     * office rather than to the customer. That is survivable for an internal
     * first pass and is not survivable on a quote anybody sends.
     *
     * The correct fix is to price this through `laborTasks`, the same as every
     * other estimate. Until that is done, treat these hours as a placeholder.
     */
    const estimatedTotalHours = squareFootage * 0.5; // ~0.5 hours per sq ft
    const projectManagementHours = Math.max(40, squareFootage / 50);

    // Project management
    const pmRate = defaultRates.find(r => r.name === 'Project Manager')?.hourlyRate || 85;
    quoteLaborItems.push({
      id: `l${laborIndex++}`,
      role: 'Project Manager',
      description: 'Overall project coordination and management',
      hours: Math.round(projectManagementHours),
      hourlyRate: pmRate,
      total: Math.round(projectManagementHours * pmRate),
      visible: true,
      editable: true
    });

    // Carpentry (if materials include framing/cabinets)
    if (blueprintAnalysis.materials?.some((cat: any) => 
      cat.category === 'Cabinetry' || cat.category === 'Framing' || cat.category === 'Doors & Windows'
    )) {
      const carpenterRate = defaultRates.find(r => r.name === 'Lead Carpenter')?.hourlyRate || 65;
      const carpentryHours = Math.round(squareFootage * 0.15);
      quoteLaborItems.push({
        id: `l${laborIndex++}`,
        role: 'Lead Carpenter',
        description: 'Cabinet installation, trim work, and carpentry',
        hours: carpentryHours,
        hourlyRate: carpenterRate,
        total: carpentryHours * carpenterRate,
        visible: true,
        editable: true
      });
    }

    // Electrical (based on construction details)
    if (blueprintAnalysis.constructionDetails?.electricalOutlets > 0) {
      const electricianRate = defaultRates.find(r => r.name === 'Electrician')?.hourlyRate || 95;
      const electricalHours = Math.max(16, blueprintAnalysis.constructionDetails.electricalOutlets * 0.5);
      quoteLaborItems.push({
        id: `l${laborIndex++}`,
        role: 'Licensed Electrician',
        description: `Electrical work - ${blueprintAnalysis.constructionDetails.electricalOutlets} outlets/fixtures`,
        hours: Math.round(electricalHours),
        hourlyRate: electricianRate,
        total: Math.round(electricalHours * electricianRate),
        visible: true,
        editable: true
      });
    }

    // Plumbing (based on construction details)
    if (blueprintAnalysis.constructionDetails?.plumbingFixtures > 0) {
      const plumberRate = defaultRates.find(r => r.name === 'Plumber')?.hourlyRate || 105;
      const plumbingHours = Math.max(12, blueprintAnalysis.constructionDetails.plumbingFixtures * 2);
      quoteLaborItems.push({
        id: `l${laborIndex++}`,
        role: 'Licensed Plumber',
        description: `Plumbing work - ${blueprintAnalysis.constructionDetails.plumbingFixtures} fixtures`,
        hours: Math.round(plumbingHours),
        hourlyRate: plumberRate,
        total: Math.round(plumbingHours * plumberRate),
        visible: true,
        editable: true
      });
    }

    // Painting (almost always needed)
    const painterRate = defaultRates.find(r => r.name === 'Painter')?.hourlyRate || 50;
    const paintingHours = Math.round(squareFootage * 0.08);
    if (paintingHours > 0) {
      quoteLaborItems.push({
        id: `l${laborIndex++}`,
        role: 'Professional Painter',
        description: 'Interior painting and finishing',
        hours: paintingHours,
        hourlyRate: painterRate,
        total: paintingHours * painterRate,
        visible: true,
        editable: true
      });
    }

    // General labor for cleanup and support
    const laborRate = defaultRates.find(r => r.name === 'General Labor')?.hourlyRate || 40;
    const generalLaborHours = Math.round(squareFootage * 0.05);
    quoteLaborItems.push({
      id: `l${laborIndex++}`,
      role: 'General Labor',
      description: 'Site cleanup, material handling, and support',
      hours: generalLaborHours,
      hourlyRate: laborRate,
      total: generalLaborHours * laborRate,
      visible: true,
      editable: true
    });

    // Calculate totals
    const laborTotal = quoteLaborItems.reduce((sum, item) => sum + item.total, 0);
    const materialsSubtotal = quoteMaterials.reduce((sum, item) => sum + item.total, 0);
    
    // Apply materials markup if configured
    const materialsMarkup = profitSettings?.materialsMarkup || 0;
    const materialsTotal = materialsSubtotal * (1 + materialsMarkup / 100);
    
    const subtotal = laborTotal + materialsTotal;
    const tax = subtotal * 0.0875; // 8.75% default tax rate
    const total = subtotal + tax;

    // Save quote to KV store
    const quote = {
      quoteNumber,
      workRequestId,
      clientInfo,
      projectInfo,
      laborItems: quoteLaborItems,
      materialItems: quoteMaterials,
      totals: {
        labor: laborTotal,
        materialsSubtotal,
        materialsMarkup,
        materialsTotal,
        subtotal,
        tax,
        total
      },
      blueprintAnalysis: {
        totalSquareFootage: blueprintAnalysis.totalSquareFootage,
        totalLinearFootage: blueprintAnalysis.totalLinearFootage,
        roomsCount: blueprintAnalysis.rooms?.length || 0,
        materialsCount: quoteMaterials.length
      },
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'AI Blueprint Analysis',
        // Who actually asked, as opposed to what produced it. Without this a
        // quote arrives with no way to tell whose blueprint made it.
        requestedBy: caller.email,
        requestedByUserId: caller.id,
        status: 'draft',
        // Read from a blueprint the customer supplied, not from a site visit.
        // Said on the record so nobody downstream mistakes it for measured.
        provenance: 'blueprint-analysis',
        binding: false,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    /**
     * `quote:` — the key every other quote screen reads.
     *
     * This wrote `quote_${quoteNumber}` with an underscore. Nothing else in the
     * codebase reads that shape, so every quote this route has ever produced
     * would have been stored successfully and been invisible to the quote list,
     * the pipeline and the customer portal. It went unnoticed because the route
     * was never mounted, so it has never actually written one.
     */
    await kv.set(`quote:${quoteNumber}`, { ...quote, id: quoteNumber });

    console.log('[Quote from Blueprint] Quote generated successfully');
    console.log(`- Quote Number: ${quoteNumber}`);
    console.log(`- Labor Items: ${quoteLaborItems.length}`);
    console.log(`- Material Items: ${quoteMaterials.length}`);
    console.log(`- Total: $${total.toLocaleString()}`);

    /**
     * What goes back, and what deliberately does not.
     *
     * The stored quote carries `materialsMarkup` and the materials subtotal
     * before markup — the company's margin, in a number. This route is called
     * by the customer work request form, so returning the whole quote object
     * would put our markup in a customer's browser. It is not rendered there,
     * which is not a defence: it is in the network response either way.
     *
     * The caller only needs the quote number — that is all the form uses — but
     * the totals are useful to staff, so what comes back is the finished
     * figures with the workings removed.
     */
    const { materialsMarkup: _markup, materialsSubtotal: _preMarkup, ...safeTotals } = quote.totals;

    return c.json({
      success: true,
      quoteNumber,
      quote: { ...quote, totals: safeTotals },
      summary: {
        laborItems: quoteLaborItems.length,
        materialItems: quoteMaterials.length,
        laborTotal,
        materialsTotal,
        total
      }
    });

  } catch (error) {
    console.error('[Quote from Blueprint] Error:', error);
    return c.json({
      success: false,
      error: 'Failed to generate quote from blueprint',
      details: error.message
    }, 500);
  }
});

export default quoteFromBlueprintRouter;
