/**
 * CAD Design System Backend Routes
 * Handles AI design generation, saving, and loading CAD designs
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const cad = new Hono();

interface DrawingElement {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text' | 'polygon';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: { x: number; y: number }[];
  text?: string;
  color: string;
  strokeWidth: number;
  layer: string;
  metadata?: any;
}

interface AIGenerateRequest {
  prompt: string;
  currentElements: DrawingElement[];
  canvasSize: { width: number; height: number };
  gridSize: number;
}

/**
 * AI Design Generation
 * Generates CAD design elements based on text prompt
 */
cad.post('/ai-generate', async (c) => {
  try {
    const body: AIGenerateRequest = await c.req.json();
    const { prompt, currentElements, canvasSize, gridSize } = body;

    if (!prompt || !prompt.trim()) {
      return c.json({ error: 'Prompt is required' }, 400);
    }

    // Call OpenAI to generate design instructions
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const systemPrompt = `You are a CAD design assistant for construction and handyman projects. 
Given a design request, generate precise CAD drawing elements with coordinates.
Return JSON array of drawing elements with this structure:
{
  "elements": [
    {
      "id": "unique-id",
      "type": "line|rectangle|circle|text|polygon",
      "x": number,
      "y": number,
      "width": number (for rectangle),
      "height": number (for rectangle),
      "radius": number (for circle),
      "points": [{x, y}] (for line/polygon),
      "text": "string" (for text),
      "color": "#ea580c",
      "strokeWidth": 2,
      "layer": "layer-1"
    }
  ],
  "description": "Brief description of what was generated"
}

Canvas dimensions: ${canvasSize.width}x${canvasSize.height}
Grid size: ${gridSize}px
Snap all coordinates to grid multiples.
Create professional, accurate construction designs.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Design request: ${prompt}\n\nCurrent elements on canvas: ${currentElements.length}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return c.json({ error: 'Failed to generate design with AI' }, 500);
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content;
    const designData = JSON.parse(generatedContent);

    // Assign unique IDs and ensure proper formatting
    const elements = designData.elements.map((el: any, index: number) => ({
      ...el,
      id: `ai-${Date.now()}-${index}`,
      color: el.color || '#ea580c',
      strokeWidth: el.strokeWidth || 2,
      layer: el.layer || 'layer-1'
    }));

    return c.json({
      elements,
      description: designData.description || 'AI-generated design',
      success: true
    });

  } catch (error) {
    console.error('Error generating AI design:', error);
    return c.json({ 
      error: 'Failed to generate design', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

/**
 * Save CAD Design
 */
cad.post('/save', async (c) => {
  try {
    const body = await c.req.json();
    const { elements, layers, metadata } = body;

    const designId = `cad-design-${Date.now()}`;
    const designData = {
      id: designId,
      elements,
      layers,
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString()
      }
    };

    await kv.set(designId, designData);

    // Also save to designs index
    const designsIndex = await kv.get('cad-designs-index') || { designs: [] };
    designsIndex.designs.push({
      id: designId,
      elementCount: elements.length,
      savedAt: designData.metadata.savedAt
    });
    await kv.set('cad-designs-index', designsIndex);

    return c.json({
      success: true,
      designId,
      message: 'Design saved successfully'
    });

  } catch (error) {
    console.error('Error saving CAD design:', error);
    return c.json({ 
      error: 'Failed to save design',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Load CAD Design
 */
cad.get('/load/:designId', async (c) => {
  try {
    const designId = c.req.param('designId');
    const design = await kv.get(designId);

    if (!design) {
      return c.json({ error: 'Design not found' }, 404);
    }

    return c.json({
      success: true,
      design
    });

  } catch (error) {
    console.error('Error loading CAD design:', error);
    return c.json({ 
      error: 'Failed to load design',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * List All CAD Designs
 */
cad.get('/list', async (c) => {
  try {
    const designsIndex = await kv.get('cad-designs-index') || { designs: [] };

    return c.json({
      success: true,
      designs: designsIndex.designs || []
    });

  } catch (error) {
    console.error('Error listing CAD designs:', error);
    return c.json({ 
      error: 'Failed to list designs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Delete CAD Design
 */
cad.delete('/:designId', async (c) => {
  try {
    const designId = c.req.param('designId');
    
    await kv.del(designId);

    // Remove from index
    const designsIndex = await kv.get('cad-designs-index') || { designs: [] };
    designsIndex.designs = designsIndex.designs.filter((d: any) => d.id !== designId);
    await kv.set('cad-designs-index', designsIndex);

    return c.json({
      success: true,
      message: 'Design deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting CAD design:', error);
    return c.json({ 
      error: 'Failed to delete design',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default cad;
