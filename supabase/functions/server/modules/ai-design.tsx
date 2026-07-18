/**
 * AI Design Generation API Endpoint
 * Server-side OpenAI integration for floor plan generation
 */

import { Hono } from 'npm:hono@3';
import { cors } from 'npm:hono/cors';

const aiRouter = new Hono();

// Enable CORS
aiRouter.use('*', cors());

/**
 * Generate floor plan from text description
 */
aiRouter.post('/generate-from-text', async (c) => {
  try {
    const { description, options } = await c.req.json();

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const prompt = buildFloorPlanPrompt(description, options);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert architectural AI assistant specializing in floor plan generation. 
            Generate detailed floor plans in JSON format with precise coordinates, dimensions, and building code compliance.
            Always consider ergonomics, accessibility, traffic flow, and safety regulations.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return c.json({ error: 'Failed to generate floor plan' }, 500);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return c.json({
      success: true,
      floorPlan: convertAIResponseToElements(parsed),
      reasoning: parsed.reasoning,
      warnings: parsed.warnings || [],
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return c.json({ error: error.message || 'Unknown error' }, 500);
  }
});

/**
 * Analyze image and generate floor plan
 */
aiRouter.post('/generate-from-image', async (c) => {
  try {
    const { imageBase64, options } = await c.req.json();

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing architectural drawings, sketches, and photos to extract floor plan information.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and extract a detailed floor plan. Identify walls, doors, windows, rooms, and dimensions. 
                Return a JSON structure with elements array containing wall coordinates, door/window positions, and room annotations.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI Vision API error:', error);
      return c.json({ error: 'Failed to analyze image' }, 500);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return c.json({
      success: true,
      floorPlan: convertAIResponseToElements(parsed),
      reasoning: parsed.reasoning,
      warnings: parsed.warnings || [],
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    return c.json({ error: error.message || 'Unknown error' }, 500);
  }
});

/**
 * Check building code compliance
 */
aiRouter.post('/check-compliance', async (c) => {
  try {
    const { elements, code = 'IBC 2021' } = await c.req.json();

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const prompt = `Analyze this floor plan for compliance with ${code} building code.
    
    Elements: ${JSON.stringify(elements)}
    
    Check for:
    1. Egress requirements (exit width, travel distance, exit signs)
    2. Accessibility (ADA/ANSI A117.1 compliance, door widths, clearances)
    3. Structural requirements (wall spacing, load-bearing)
    4. Fire safety (compartmentalization, fire-rated walls, sprinklers)
    5. Ventilation and natural light requirements
    6. Minimum room sizes and ceiling heights
    
    Return detailed compliance report in JSON format with structure:
    {
      "compliant": boolean,
      "checks": [{ "id": string, "category": string, "rule": string, "status": string, "details": string }],
      "violations": [{ "id": string, "severity": string, "category": string, "description": string, "recommendation": string }],
      "recommendations": string[]
    }`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a building code compliance expert with deep knowledge of IBC, IRC, ADA, and NFPA codes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return c.json({ error: 'Failed to check compliance' }, 500);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return c.json({
      compliant: parsed.compliant || false,
      code: code,
      checks: parsed.checks || [],
      violations: parsed.violations || [],
      recommendations: parsed.recommendations || [],
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    return c.json({ error: error.message || 'Unknown error' }, 500);
  }
});

/**
 * Get design suggestions
 */
aiRouter.post('/design-suggestions', async (c) => {
  try {
    const { elements, context } = await c.req.json();

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const prompt = `Analyze this floor plan and provide design improvement suggestions.
    
    Current design: ${JSON.stringify(elements.slice(0, 20))}
    Context: ${context || 'General improvements'}
    
    Focus on:
    - Space utilization
    - Traffic flow
    - Natural lighting
    - Accessibility
    - Functionality
    - Aesthetics
    
    Return JSON with structure: { "suggestions": string[] }`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced architect providing constructive design feedback.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return c.json({ error: 'Failed to get suggestions' }, 500);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return c.json({ suggestions: parsed.suggestions || [] });
  } catch (error) {
    console.error('Design suggestions error:', error);
    return c.json({ error: error.message || 'Unknown error' }, 500);
  }
});

// Helper functions
function buildFloorPlanPrompt(description: string, options: any = {}): string {
  let prompt = `Generate a detailed floor plan for: ${description}\n\n`;

  if (options.style) {
    prompt += `Style: ${options.style}\n`;
  }
  if (options.floors) {
    prompt += `Number of floors: ${options.floors}\n`;
  }
  if (options.squareFootage) {
    prompt += `Total area: ${options.squareFootage} sq ft\n`;
  }
  if (options.rooms && options.rooms.length > 0) {
    prompt += `Required rooms: ${options.rooms.join(', ')}\n`;
  }

  prompt += `\nGenerate a complete floor plan with:
  1. Walls (with x1, y1, x2, y2 coordinates in pixels, scale 1px = 1 inch)
  2. Doors (with position and width)
  3. Windows (with position and width)
  4. Room annotations (with labels)
  5. Dimensions and measurements
  
  Canvas size: 900x560 pixels
  
  Return JSON format:
  {
    "elements": [
      { "type": "wall", "x1": number, "y1": number, "x2": number, "y2": number, "layer": "Architectural" },
      { "type": "door", "x": number, "y": number, "width": number, "layer": "Architectural" },
      { "type": "window", "x": number, "y": number, "width": number, "layer": "Architectural" }
    ],
    "annotations": [
      { "type": "note", "position": {"x": number, "y": number}, "text": string, "layer": "Annotations" }
    ],
    "measurements": [],
    "metadata": { "style": string, "totalArea": number, "roomCount": number },
    "reasoning": string,
    "warnings": []
  }`;

  return prompt;
}

function convertAIResponseToElements(aiResponse: any): any {
  return {
    elements: (aiResponse.elements || []).map((el: any) => ({
      ...el,
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    })),
    measurements: aiResponse.measurements || [],
    annotations: (aiResponse.annotations || []).map((ann: any) => ({
      ...ann,
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    })),
    metadata: aiResponse.metadata || {},
  };
}

export default aiRouter;
