/**
 * Generate Quote from Blueprint Analysis
 * 
 * Takes AI blueprint analysis results and auto-generates a complete quote
 * with labor and materials from the analyzed blueprints
 */

import { Hono } from 'npm:hono@4';
import { rateForRole, rateForTrade, blueprintPricing } from './blueprintRates.ts';
import { resolvePricing } from './pricingDefaults.ts';
import { applyMargins } from './quoteMargins.ts';
import { blueprintTakeoff } from './blueprintTakeoff.ts';
import { mergeServerCatalogue, findTask } from './serverCatalogue.ts';
import { resolveCatalogue } from './rateLearning.ts';
import { estimateTaskLabor } from './laborMath.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
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

    /*
     * The company's own rates and markups.
     *
     * This read `labor_rates_config` and `profit_settings` — two keys that
     * have never existed in the store. Every other quoting path reads
     * `labor_rates:global`, which is where the rates screen saves, so this
     * route silently used the figures typed into this file and marked
     * materials up by ZERO while the saved setting was twenty per cent.
     *
     * One read, because the rates and the markups are two halves of the same
     * saved record and reading them from separate keys is how they came to
     * disagree in the first place.
     */
    const savedPricing = await kv.get('labor_rates:global');
    const { rates: rateCard, usingStandards, profitSettings } = blueprintPricing(savedPricing);

    /**
     * The markups, overhead, margin and tax, from the same resolver every
     * other quoting path uses.
     *
     * Both records are read because they are both places the company's
     * margins can be saved and they do not agree on field names — see
     * `resolvePricing`. Reading only one is how this route came to apply no
     * overhead, no profit, and an 8.75% sales tax in a state without one.
     */
    const pricingConfig = await kv.get('pricing_config:global').catch(() => null);
    const { settings: pricingSettings } = resolvePricing(pricingConfig, savedPricing);

    console.log('[Quote from Blueprint] Rate card:', rateCard.length, 'trades,',
      usingStandards ? 'STANDARD figures' : "the company's own");
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
    
    /*
     * The private rate list that used to live here is gone.
     *
     * It was keyed by ROLE — "Lead Carpenter", "Electrician" — while the rate
     * card is keyed by TRADE. That mismatch is why pointing this route at the
     * right key would not have been enough on its own: every lookup would have
     * missed and fallen through to these numbers anyway, and the bug would have
     * looked fixed. `rateForRole` maps the two.
     *
     * The figures survive only as the last-resort fallback passed to each
     * call, used when the card has no rate for that trade — and `rateForRole`
     * reports that as `typed` so a quote can say which it used.
     */

    /**
     * THE HOURS COME FROM THE CATALOGUE NOW.
     *
     * This route used to multiply square footage by figures typed into this
     * file — 0.5 hours per square foot overall, 0.15 for carpentry, 0.08 for
     * painting — and said so in a comment explaining that they were neither
     * measured nor citable.
     *
     * Every labour line below is now a TASK from the server's own catalogue,
     * quantified by `blueprintTakeoff` from what was actually read off the
     * drawing, and priced with `estimateTaskLabor` — the same arithmetic, the
     * same minimum-hours floor, as the design centre. Where the learning loop
     * has corrected a production rate from finished jobs, that correction is
     * what prices this quote.
     *
     * IT IS STILL A DRAFT, AND STILL `binding: false`.
     *
     * Catalogue hours make it defensible; they do not make it checked. It
     * remains a language model reading a drawing, and a misread room dimension
     * is wrong however well the hours derive from it. What has changed is that
     * a reviewer can now see WHICH number to doubt: every line names the field
     * it came from and whether anything about it was assumed.
     */
    /*
     * Project management is the one line that is NOT a catalogue task.
     *
     * There is no production rate for coordinating a job — it scales with the
     * job's size and duration rather than with a quantity of anything. So it
     * keeps the figure this route always used, and `rateForRole` reports it as
     * `typed` rather than dressing it up as a rate somebody set.
     */
    const projectManagementHours = Math.max(40, squareFootage / 50);

    // Project management
    const pmRate = rateForRole('Project Manager', rateCard, usingStandards, 85).hourlyRate;
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

    /*
     * Every other labour line, from the drawing through the catalogue.
     *
     * The takeoff decides WHAT and HOW MUCH; the catalogue decides how long a
     * unit of it takes; the rate card decides what an hour of that trade costs.
     * Three separate questions, each answered by the thing that owns it, which
     * is what the typed multipliers were standing in for.
     */
    const takeoff = blueprintTakeoff(blueprintAnalysis);
    const catalogue = resolveCatalogue(
      mergeServerCatalogue(
        await kv.get('labor_tasks:catalogue'),
        await kv.get('labor_tasks:global'),
      ),
      ((await kv.get('labor_tasks:measured')) as any)?.rates || [],
    );

    const takeoffNotes: string[] = [...takeoff.notes];

    for (const line of takeoff.lines) {
      const task = findTask(catalogue as any, line.taskId);
      if (!task) {
        // A task the takeoff knows and the published catalogue does not. Said
        // out loud rather than skipped silently: it means work nobody priced.
        takeoffNotes.push(`${line.taskId} is not in the published catalogue, so `
          + `${line.quantity} ${line.from} went unpriced. Re-publish the catalogue.`);
        continue;
      }
      if (!(task.hoursPerUnit > 0)) {
        takeoffNotes.push(`${task.name} has no production rate recorded, so it is not priced.`);
        continue;
      }

      const rate = rateForTrade(task.tradeId, rateCard, usingStandards, 0);
      const estimate = estimateTaskLabor(task, line.quantity, rate.hourlyRate);
      if (!(estimate.hours > 0)) continue;

      quoteLaborItems.push({
        id: `l${laborIndex++}`,
        role: task.name,
        description: `${line.quantity} ${task.unit} — from ${line.from}`
          + (line.assumed ? ' (assumed)' : '')
          + (estimate.minimumApplied ? '. Minimum call-out applied.' : ''),
        hours: estimate.hours,
        hourlyRate: rate.hourlyRate,
        total: estimate.cost,
        visible: true,
        editable: true,
        /* Provenance, so whoever checks the draft can see what to doubt. */
        taskId: task.id,
        tradeId: task.tradeId,
        quantity: line.quantity,
        unit: task.unit,
        derivedFrom: line.from,
        assumed: line.assumed,
        minimumApplied: estimate.minimumApplied,
        rateSource: rate.source,
        hoursSource: (task as any).resolvedFrom || task.source,
        because: (task as any).because || undefined,
      });
    }

    const laborTotal = quoteLaborItems.reduce((sum, item) => sum + item.total, 0);
    const materialsSubtotal = quoteMaterials.reduce((sum, item) => sum + item.total, 0);

    // Apply materials markup if configured
    const materialsMarkup = profitSettings?.materialsMarkup || 0;
    const materialsTotal = materialsSubtotal * (1 + materialsMarkup / 100);

    /**
     * THE SAME ARITHMETIC AS EVERY OTHER QUOTE, AND IT USED NOT TO BE.
     *
     * What this did before, in three lines:
     *
     *     const subtotal = laborTotal + materialsTotal;
     *     const tax = subtotal * 0.0875;   // 8.75% default tax rate
     *     const total = subtotal + tax;
     *
     * Three faults in it, all costing money in the same direction:
     *
     * NO OVERHEAD AND NO PROFIT. A blueprint quote was labour plus marked-up
     * materials plus tax. Nothing carried the business, and nothing was earned
     * on the job — it quoted at cost. The description path applies Eric's 10%
     * overhead and 20% profit, so the same work quoted from a drawing came out
     * roughly a quarter cheaper than quoted from a description, with the whole
     * difference being the margin.
     *
     * A SALES TAX THAT DOES NOT EXIST. 8.75% hardcoded, in New Hampshire,
     * which has none. `STANDARD_PRICING.taxRate` is 0 deliberately and says so
     * in a comment. It is also the sort of number the company might change,
     * which is the last thing that should be typed into a route.
     *
     * TAX ON THE LABOUR. Even where sales tax applies it is on materials, not
     * on hours. This charged it on the whole subtotal.
     *
     * So the figures now come from `applyMargins` — one copy, shared with the
     * assembler, asserted to the penny in `tests/quoteMargins.test.ts` — and
     * the settings from `resolvePricing`, which is what the description path
     * and the capital plan read. A quote and a capital plan for the same work
     * must not disagree.
     *
     * Contingency is deliberately zero here rather than the assembler's 5%
     * default. There it is a figure the model judges per job; a takeoff
     * measured off a drawing has no such figure, and inventing one would add
     * cost nobody decided on.
     */
    const margins = applyMargins({
      materialsSubtotal: materialsTotal,
      laborSubtotal: laborTotal,
      additionalCostsSubtotal: 0,
      creditsSubtotal: 0,
      overheadPercent: Number(pricingSettings.overheadPercentage ?? 0) / 100,
      profitPercent: Number(pricingSettings.profitMargin ?? 0) / 100,
      contingencyPercent: 0,
      taxRatePercent: Number(pricingSettings.taxRate ?? 0) / 100,
    });

    const subtotal = margins.directCost;
    const tax = margins.taxAmount;
    const total = margins.totalCost;

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
        /**
         * Broken out, because a quote that shows a total without showing the
         * overhead and profit inside it cannot be checked by the person
         * sending it — and these two were absent from this path entirely
         * until now. Percentages are stored alongside the amounts so a figure
         * can still be explained after the settings have moved on.
         */
        overheadPercent: margins.overheadPercent,
        overhead: margins.overheadAmount,
        profitPercent: margins.profitPercent,
        profit: margins.profitAmount,
        preTaxTotal: margins.preTaxTotal,
        taxRate: margins.taxRate,
        tax,
        total
      },
      /* What the takeoff measured and what it had to assume. On the quote
         rather than only in the log, because the person checking the draft is
         not the person who ran it. */
      takeoff: {
        measurements: takeoff.measurements,
        notes: takeoffNotes,
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
