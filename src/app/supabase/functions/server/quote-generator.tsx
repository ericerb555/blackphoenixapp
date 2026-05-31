/**
 * AI Quote Generator
 * Generates detailed labor tasks and materials lists using OpenAI
 */

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import OpenAI from 'npm:openai@4';

const quoteRouter = new Hono();

// Enable CORS
quoteRouter.use('*', cors({
  origin: '*',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

// Test endpoint
quoteRouter.get('/test', (c) => {
  console.log('[AI Quote Generator] Test endpoint hit');
  return c.json({ 
    success: true, 
    message: 'AI Quote Generator is running',
    timestamp: new Date().toISOString()
  });
});

// POST /generate-quote - Generate labor and materials using AI
quoteRouter.post('/generate-quote', async (c) => {
  console.log('[AI Quote Generator] Received request');
  
  try {
    const body = await c.req.json();
    const { quoteNumber, customerName, serviceType, description, workRequestData } = body;

    console.log('[AI Quote Generator] Generating quote for:', quoteNumber);
    console.log('[AI Quote Generator] Service Type:', serviceType);
    console.log('[AI Quote Generator] Description:', description);

    // Build context from available data
    const context = `
Service Type: ${serviceType}
Description: ${description}
${workRequestData ? `
Additional Details:
- Complexity: ${workRequestData.complexityLevel || 'N/A'}
- Duration Estimate: ${workRequestData.duration || 'N/A'} hours
- Requires Permit: ${workRequestData.requiresPermit ? 'Yes' : 'No'}
- Equipment Needed: ${workRequestData.equipment?.join(', ') || 'N/A'}
` : ''}
`;

    // Generate labor tasks
    const laborPrompt = `You are an expert construction estimator. Based on the following project details, generate a detailed list of labor tasks required.

${context}

For each labor task, provide:
1. A clear description of the work (e.g., "Licensed Electrician - Panel Upgrade & Wiring")
2. Estimated hours required
3. Hourly rate (use industry-standard rates for 2026)

Return ONLY a JSON array of objects with this exact format:
[
  {
    "description": "Task description",
    "hours": number,
    "rate": number
  }
]

Be comprehensive but realistic. Include all necessary skilled labor. Typical project should have 3-8 labor line items.`;

    const materialsPrompt = `You are an expert construction estimator. Based on the following project details, generate a detailed materials list.

${context}

For each material item, provide:
1. A clear description (e.g., "200A Main Electrical Panel", "500ft 12/2 Romex Wire")
2. Quantity needed
3. Unit price (use realistic 2026 prices)

Return ONLY a JSON array of objects with this exact format:
[
  {
    "description": "Material description with specifications",
    "quantity": number,
    "unitPrice": number
  }
]

Be comprehensive and specific. Include all necessary materials, supplies, and consumables. Typical project should have 5-15 material line items.`;

    // Call OpenAI in parallel for speed
    const [laborResponse, materialsResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction estimator. You provide detailed, accurate estimates in JSON format only. No markdown, no explanations, just valid JSON.'
          },
          {
            role: 'user',
            content: laborPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction estimator. You provide detailed, accurate estimates in JSON format only. No markdown, no explanations, just valid JSON.'
          },
          {
            role: 'user',
            content: materialsPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    ]);

    // Parse responses
    let laborItems = [];
    let materialItems = [];

    try {
      const laborText = laborResponse.choices[0].message.content?.trim() || '[]';
      // Remove markdown code blocks if present
      const cleanLaborText = laborText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      laborItems = JSON.parse(cleanLaborText);
    } catch (error) {
      console.error('[AI Quote Generator] Error parsing labor response:', error);
      // Fallback labor items
      laborItems = [
        {
          description: `${serviceType} - Professional Labor`,
          hours: 40,
          rate: 85
        }
      ];
    }

    try {
      const materialsText = materialsResponse.choices[0].message.content?.trim() || '[]';
      // Remove markdown code blocks if present
      const cleanMaterialsText = materialsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      materialItems = JSON.parse(cleanMaterialsText);
    } catch (error) {
      console.error('[AI Quote Generator] Error parsing materials response:', error);
      // Fallback material items
      materialItems = [
        {
          description: `${serviceType} - Materials & Supplies`,
          quantity: 1,
          unitPrice: 2500
        }
      ];
    }

    // Calculate totals
    const laborTotal = laborItems.reduce((sum: number, item: any) => 
      sum + (item.hours * item.rate), 0);
    const materialsTotal = materialItems.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0);
    const grandTotal = laborTotal + materialsTotal;

    console.log('[AI Quote Generator] Generated:', {
      laborItems: laborItems.length,
      materialItems: materialItems.length,
      laborTotal,
      materialsTotal,
      grandTotal
    });

    return c.json({
      success: true,
      laborItems,
      materialItems,
      summary: `Total estimate: $${grandTotal.toLocaleString()} (${laborItems.length} labor tasks, ${materialItems.length} materials)`,
      totals: {
        labor: laborTotal,
        materials: materialsTotal,
        grandTotal
      }
    });

  } catch (error: any) {
    console.error('[AI Quote Generator] Error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to generate quote',
      laborItems: [],
      materialItems: []
    }, 500);
  }
});

// POST /make-server-57095a78/auto-generate-quote - Pipeline-specific auto-generation endpoint
quoteRouter.post('/make-server-57095a78/auto-generate-quote', async (c) => {
  console.log('[AI Quote Generator] Pipeline auto-generation request received');
  
  try {
    const body = await c.req.json();
    const { workRequest } = body;

    if (!workRequest) {
      return c.json({
        success: false,
        error: 'Work request data is required'
      }, 400);
    }

    console.log('[AI Quote Generator] Auto-generating quote for work request:', workRequest.id);
    console.log('[AI Quote Generator] Service Type:', workRequest.serviceType);
    console.log('[AI Quote Generator] Title:', workRequest.title);

    // Build comprehensive context
    const context = `
Project Title: ${workRequest.title}
Service Type: ${workRequest.serviceType}
Description: ${workRequest.description}
Location: ${workRequest.location || 'Not specified'}
Estimated Value: $${workRequest.estimatedValue?.toLocaleString() || 'N/A'}
${workRequest.blueprintAnalysis ? `
Blueprint Analysis Available:
- Rooms Identified: ${workRequest.blueprintAnalysis.rooms?.length || 0}
- Materials Suggested: ${workRequest.blueprintAnalysis.materials?.length || 0}
- AI Estimated Cost: $${workRequest.blueprintAnalysis.estimatedCosts?.total?.toLocaleString() || 'N/A'}
` : ''}
`;

    // Enhanced labor prompt with process steps
    const laborPrompt = `You are an expert construction project manager and estimator. Based on the following project details, generate a detailed breakdown of labor requirements AND high-level process steps.

${context}

Provide TWO things:

1. LABOR TASKS - Detailed labor line items with hours and rates
2. PROCESS STEPS - High-level workflow stages (e.g., "Site Preparation", "Electrical Rough-In", "Final Inspection")

Return ONLY valid JSON in this exact format:
{
  "labor": [
    {
      "description": "Clear task description",
      "hours": number,
      "rate": number
    }
  ],
  "processSteps": [
    {
      "step": "Step name",
      "description": "Brief description",
      "estimatedDuration": "duration estimate"
    }
  ]
}

Be comprehensive and realistic. Include all skilled labor needed.`;

    const materialsPrompt = `You are an expert construction estimator with access to 2026 pricing data. Based on the following project details, generate a detailed, itemized materials list.

${context}

For each material, provide specific details including:
- Exact product descriptions with specifications
- Realistic quantities
- Current 2026 unit prices
- Vendor suggestions when applicable (Grainger, Home Depot, Lowe's)

Return ONLY a JSON array with this exact format:
[
  {
    "description": "Specific material with specs",
    "quantity": number,
    "unitPrice": number,
    "unit": "unit type (e.g., 'each', 'linear ft', 'sq ft')",
    "vendor": "suggested vendor (optional)"
  }
]

Be thorough and specific. Include all materials, fasteners, supplies, and consumables.`;

    // Call OpenAI in parallel
    const [laborResponse, materialsResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction estimator and project manager. Return only valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: laborPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction estimator with current pricing knowledge. Return only valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: materialsPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })
    ]);

    // Parse labor response
    let laborItems = [];
    let processSteps = [];

    try {
      const laborText = laborResponse.choices[0].message.content?.trim() || '{}';
      const cleanLaborText = laborText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const laborData = JSON.parse(cleanLaborText);
      laborItems = laborData.labor || [];
      processSteps = laborData.processSteps || [];
    } catch (error) {
      console.error('[AI Quote Generator] Error parsing labor response:', error);
      console.error('[AI Quote Generator] Raw response:', laborResponse.choices[0].message.content);
      // Fallback
      laborItems = [{
        description: `${workRequest.serviceType} - Professional Labor`,
        hours: 40,
        rate: 85
      }];
      processSteps = [
        { step: 'Preparation', description: 'Site preparation and setup', estimatedDuration: '1-2 days' },
        { step: 'Execution', description: 'Main construction work', estimatedDuration: '3-5 days' },
        { step: 'Completion', description: 'Final inspection and cleanup', estimatedDuration: '1 day' }
      ];
    }

    // Parse materials response
    let materialItems = [];

    try {
      const materialsText = materialsResponse.choices[0].message.content?.trim() || '[]';
      const cleanMaterialsText = materialsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      materialItems = JSON.parse(cleanMaterialsText);
    } catch (error) {
      console.error('[AI Quote Generator] Error parsing materials response:', error);
      console.error('[AI Quote Generator] Raw response:', materialsResponse.choices[0].message.content);
      // Fallback
      materialItems = [{
        description: `${workRequest.serviceType} - Materials Package`,
        quantity: 1,
        unitPrice: workRequest.estimatedValue * 0.6 || 5000,
        unit: 'lot'
      }];
    }

    // Calculate totals
    const laborSubtotal = laborItems.reduce((sum: number, item: any) => 
      sum + ((item.hours || 0) * (item.rate || 0)), 0);
    const materialsSubtotal = materialItems.reduce((sum: number, item: any) => 
      sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    
    const taxRate = 0.08;
    const taxAmount = (laborSubtotal + materialsSubtotal) * taxRate;
    const totalCost = laborSubtotal + materialsSubtotal + taxAmount;

    console.log('[AI Quote Generator] Auto-generated quote:', {
      laborItems: laborItems.length,
      materialItems: materialItems.length,
      processSteps: processSteps.length,
      laborSubtotal,
      materialsSubtotal,
      taxAmount,
      totalCost
    });

    return c.json({
      success: true,
      materials: materialItems,
      labor: laborItems,
      processSteps: processSteps,
      materialsSubtotal,
      laborSubtotal,
      taxAmount,
      totalCost
    });

  } catch (error: any) {
    console.error('[AI Quote Generator] Pipeline auto-generation error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to auto-generate quote'
    }, 500);
  }
});

export default quoteRouter;