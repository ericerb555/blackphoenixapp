/**
 * Generate Quote from Blueprint Analysis
 * 
 * Takes AI blueprint analysis results and auto-generates a complete quote
 * with labor and materials from the analyzed blueprints
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

const quoteFromBlueprintRouter = new Hono();

// Enable CORS
quoteFromBlueprintRouter.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// POST /quotes/generate-from-blueprint - Auto-generate quote from blueprint analysis
quoteFromBlueprintRouter.post('/generate-from-blueprint', async (c) => {
  console.log('[Quote from Blueprint] Request received');
  
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

    // Estimate labor hours based on square footage
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
        status: 'draft',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };

    await kv.set(`quote_${quoteNumber}`, quote);

    console.log('[Quote from Blueprint] Quote generated successfully');
    console.log(`- Quote Number: ${quoteNumber}`);
    console.log(`- Labor Items: ${quoteLaborItems.length}`);
    console.log(`- Material Items: ${quoteMaterials.length}`);
    console.log(`- Total: $${total.toLocaleString()}`);

    return c.json({
      success: true,
      quoteNumber,
      quote,
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
