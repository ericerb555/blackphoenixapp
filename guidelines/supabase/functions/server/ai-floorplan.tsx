/**
 * AI Floor Plan Generation API
 * 
 * Processes video/images to generate floor plans using AI
 * Integrates with OpenAI Vision API for space analysis
 * 
 * Routes:
 * - POST /make-server-57095a78/ai-floorplan/analyze-video
 * - POST /make-server-57095a78/ai-floorplan/analyze-image
 * - POST /make-server-57095a78/ai-floorplan/generate-from-description
 * - POST /make-server-57095a78/ai-floorplan/analyze-kitchen - NEW: Kitchen-specific analysis
 * - GET  /make-server-57095a78/ai-floorplan/projects/:id
 */

import { Hono } from 'npm:hono';

const app = new Hono();

interface VideoAnalysisRequest {
  videoUrl?: string;
  imageUrl?: string;
  videoBase64?: string;
  imageBase64?: string;
  analysisType: 'floor-plan' | 'room-dimensions' | 'full-analysis';
}

interface FloorPlanElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  color?: string;
  metadata?: {
    material?: string;
    dimensions?: string;
    notes?: string;
  };
}

interface FloorPlanProject {
  id: string;
  name: string;
  elements: FloorPlanElement[];
  measurements: {
    totalArea: number;
    roomCount: number;
    wallCount: number;
  };
  metadata: {
    source: 'video' | 'image' | 'manual' | 'ai-description';
    createdAt: string;
    updatedAt: string;
  };
  // NEW: Kitchen-specific data
  kitchenData?: KitchenLayout;
}

// NEW: Kitchen layout interface
interface KitchenLayout {
  roomDimensions: {
    width: number;
    length: number;
    height: number;
    area: number;
  };
  cabinets: KitchenCabinet[];
  appliances: KitchenAppliance[];
  countertops: Countertop[];
  layout: {
    type: 'galley' | 'l-shaped' | 'u-shaped' | 'island' | 'peninsula' | 'one-wall';
    workTriangle: {
      sink: { x: number; y: number };
      stove: { x: number; y: number };
      refrigerator: { x: number; y: number };
      efficiency: number; // 0-100 score
    };
  };
  totalCost: number;
}

interface KitchenCabinet {
  id: string;
  type: 'base' | 'wall' | 'tall' | 'corner' | 'island' | 'pantry';
  position: {
    x: number;
    y: number;
    wall: 'north' | 'south' | 'east' | 'west' | 'island';
  };
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  material: string;
  finish: string;
  hardware: string;
  doors: number;
  drawers: number;
  estimatedCost: number;
}

interface KitchenAppliance {
  id: string;
  type: 'refrigerator' | 'stove' | 'oven' | 'dishwasher' | 'microwave' | 'range-hood';
  position: { x: number; y: number };
  dimensions: { width: number; height: number; depth: number };
  notes: string;
}

interface Countertop {
  id: string;
  material: string;
  length: number;
  depth: number;
  area: number;
  edgeProfile: string;
  estimatedCost: number;
}

/**
 * Analyze video/image using OpenAI Vision API
 */
async function analyzeWithOpenAI(
  imageUrl: string | null,
  imageBase64: string | null,
  prompt: string
): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl || `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ]
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      max_tokens: 4096,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * POST /make-server-57095a78/ai-floorplan/analyze-image
 * Analyze a single image to extract floor plan data
 */
app.post('/analyze-image', async (c) => {
  try {
    const body = await c.req.json<VideoAnalysisRequest>();
    const { imageUrl, imageBase64, analysisType = 'full-analysis' } = body;

    if (!imageUrl && !imageBase64) {
      return c.json({ error: 'Image URL or base64 data required' }, 400);
    }

    console.log('🔍 Analyzing image for floor plan generation...');

    const prompt = `You are an expert architectural analyst. Analyze this image of an interior space and extract detailed floor plan information.

Please identify and provide measurements for:
1. **Walls**: Location, length, thickness, material
2. **Doors**: Position, width, swing direction, type
3. **Windows**: Position, width, height, type
4. **Rooms**: Dimensions, purpose/label, floor area
5. **Overall dimensions**: Total width, length, ceiling height if visible

Return your analysis as a JSON object with this structure:
{
  "rooms": [
    {
      "label": "Living Room",
      "x": 0,
      "y": 0,
      "width": 240,
      "height": 180,
      "area": 43200,
      "notes": "Large open space with natural light"
    }
  ],
  "walls": [
    {
      "x": 0,
      "y": 0,
      "width": 240,
      "height": 6,
      "orientation": "horizontal",
      "material": "drywall"
    }
  ],
  "doors": [
    {
      "x": 120,
      "y": 0,
      "width": 36,
      "height": 6,
      "swingDirection": "inward",
      "type": "standard"
    }
  ],
  "windows": [
    {
      "x": 60,
      "y": 0,
      "width": 48,
      "height": 4,
      "type": "double-hung"
    }
  ],
  "measurements": {
    "totalWidth": 240,
    "totalLength": 180,
    "ceilingHeight": 96,
    "totalArea": 43200,
    "unit": "inches"
  },
  "notes": "Any additional observations about the space"
}

All measurements should be in inches. Be as precise as possible based on visible reference points.`;

    const aiResponse = await analyzeWithOpenAI(imageUrl, imageBase64, prompt);
    const analysisText = aiResponse.choices[0]?.message?.content || '';

    console.log('✅ AI Analysis complete');

    // Extract JSON from response
    let floorPlanData;
    try {
      // Try to find JSON in the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        floorPlanData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return c.json({
        error: 'Failed to parse AI analysis',
        rawResponse: analysisText
      }, 500);
    }

    // Convert to FloorPlanElements format
    const elements: FloorPlanElement[] = [];
    let elementId = 0;

    // Add rooms
    if (floorPlanData.rooms) {
      floorPlanData.rooms.forEach((room: any) => {
        elements.push({
          id: `room-${elementId++}`,
          type: 'room',
          x: room.x || 0,
          y: room.y || 0,
          width: room.width || 200,
          height: room.height || 200,
          rotation: 0,
          label: room.label || 'Room',
          color: '#2A2A2A',
          metadata: {
            dimensions: `${room.width}" x ${room.height}"`,
            notes: room.notes
          }
        });
      });
    }

    // Add walls
    if (floorPlanData.walls) {
      floorPlanData.walls.forEach((wall: any) => {
        elements.push({
          id: `wall-${elementId++}`,
          type: 'wall',
          x: wall.x || 0,
          y: wall.y || 0,
          width: wall.width || 200,
          height: wall.height || 20,
          rotation: 0,
          metadata: {
            material: wall.material
          }
        });
      });
    }

    // Add doors
    if (floorPlanData.doors) {
      floorPlanData.doors.forEach((door: any) => {
        elements.push({
          id: `door-${elementId++}`,
          type: 'door',
          x: door.x || 0,
          y: door.y || 0,
          width: door.width || 36,
          height: door.height || 6,
          rotation: 0,
          metadata: {
            notes: `${door.type}, ${door.swingDirection} swing`
          }
        });
      });
    }

    // Add windows
    if (floorPlanData.windows) {
      floorPlanData.windows.forEach((window: any) => {
        elements.push({
          id: `window-${elementId++}`,
          type: 'window',
          x: window.x || 0,
          y: window.y || 0,
          width: window.width || 48,
          height: window.height || 4,
          rotation: 0,
          metadata: {
            notes: window.type
          }
        });
      });
    }

    const project: FloorPlanProject = {
      id: `ai-project-${Date.now()}`,
      name: `AI Generated - ${new Date().toLocaleDateString()}`,
      elements,
      measurements: {
        totalArea: floorPlanData.measurements?.totalArea || 0,
        roomCount: floorPlanData.rooms?.length || 0,
        wallCount: floorPlanData.walls?.length || 0
      },
      metadata: {
        source: 'image',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    return c.json({
      success: true,
      project,
      rawAnalysis: floorPlanData,
      aiResponse: analysisText
    });

  } catch (error: any) {
    console.error('Error analyzing image:', error);
    return c.json({
      error: 'Failed to analyze image',
      details: error.message
    }, 500);
  }
});

/**
 * POST /make-server-57095a78/ai-floorplan/analyze-video
 * Analyze video frames to extract floor plan data
 */
app.post('/analyze-video', async (c) => {
  try {
    const body = await c.req.json<VideoAnalysisRequest>();
    const { videoUrl, videoBase64 } = body;

    if (!videoUrl && !videoBase64) {
      return c.json({ error: 'Video URL or base64 data required' }, 400);
    }

    console.log('🎥 Processing video for floor plan generation...');

    // For Phase 2, we'll analyze the first frame as an image
    // In a future phase, we can implement full video frame extraction
    
    return c.json({
      error: 'Video processing not yet implemented',
      message: 'Please use analyze-image endpoint with a video frame screenshot',
      nextSteps: 'Full video frame extraction coming in Phase 3'
    }, 501);

  } catch (error: any) {
    console.error('Error analyzing video:', error);
    return c.json({
      error: 'Failed to analyze video',
      details: error.message
    }, 500);
  }
});

/**
 * POST /make-server-57095a78/ai-floorplan/generate-from-description
 * Generate floor plan from text description using AI
 */
app.post('/generate-from-description', async (c) => {
  try {
    const { description } = await c.req.json<{ description: string }>();

    if (!description) {
      return c.json({ error: 'Description required' }, 400);
    }

    console.log('📝 Generating floor plan from description...');

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `You are an expert architectural designer. Based on the following description, create a detailed floor plan.

Description: ${description}

Generate a complete floor plan with rooms, walls, doors, and windows. Return your design as a JSON object with this structure:
{
  "rooms": [
    { "label": "Living Room", "x": 0, "y": 0, "width": 240, "height": 180, "notes": "..." }
  ],
  "walls": [
    { "x": 0, "y": 0, "width": 240, "height": 6, "orientation": "horizontal" }
  ],
  "doors": [
    { "x": 120, "y": 0, "width": 36, "height": 6, "swingDirection": "inward" }
  ],
  "windows": [
    { "x": 60, "y": 0, "width": 48, "height": 4 }
  ],
  "measurements": {
    "totalWidth": 240,
    "totalLength": 180,
    "unit": "inches"
  }
}

All measurements in inches. Create a functional, realistic layout.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0]?.message?.content || '';

    // Parse AI response
    let floorPlanData;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        floorPlanData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      return c.json({
        error: 'Failed to parse AI response',
        rawResponse: analysisText
      }, 500);
    }

    // Convert to FloorPlanElements
    const elements: FloorPlanElement[] = [];
    let elementId = 0;

    // Add all elements (same logic as analyze-image)
    if (floorPlanData.rooms) {
      floorPlanData.rooms.forEach((room: any) => {
        elements.push({
          id: `room-${elementId++}`,
          type: 'room',
          x: room.x || 0,
          y: room.y || 0,
          width: room.width || 200,
          height: room.height || 200,
          rotation: 0,
          label: room.label || 'Room',
          color: '#2A2A2A'
        });
      });
    }

    if (floorPlanData.walls) {
      floorPlanData.walls.forEach((wall: any) => {
        elements.push({
          id: `wall-${elementId++}`,
          type: 'wall',
          x: wall.x || 0,
          y: wall.y || 0,
          width: wall.width || 200,
          height: wall.height || 20,
          rotation: 0
        });
      });
    }

    if (floorPlanData.doors) {
      floorPlanData.doors.forEach((door: any) => {
        elements.push({
          id: `door-${elementId++}`,
          type: 'door',
          x: door.x || 0,
          y: door.y || 0,
          width: door.width || 36,
          height: door.height || 6,
          rotation: 0
        });
      });
    }

    if (floorPlanData.windows) {
      floorPlanData.windows.forEach((window: any) => {
        elements.push({
          id: `window-${elementId++}`,
          type: 'window',
          x: window.x || 0,
          y: window.y || 0,
          width: window.width || 48,
          height: window.height || 4,
          rotation: 0
        });
      });
    }

    const project: FloorPlanProject = {
      id: `ai-project-${Date.now()}`,
      name: `AI Generated - ${new Date().toLocaleDateString()}`,
      elements,
      measurements: {
        totalArea: floorPlanData.measurements?.totalArea || 0,
        roomCount: floorPlanData.rooms?.length || 0,
        wallCount: floorPlanData.walls?.length || 0
      },
      metadata: {
        source: 'ai-description',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    return c.json({
      success: true,
      project,
      rawAnalysis: floorPlanData
    });

  } catch (error: any) {
    console.error('Error generating from description:', error);
    return c.json({
      error: 'Failed to generate floor plan',
      details: error.message
    }, 500);
  }
});

/**
 * POST /make-server-57095a78/ai-floorplan/analyze-kitchen
 * Analyze a kitchen image to extract kitchen-specific data
 */
app.post('/analyze-kitchen', async (c) => {
  try {
    const body = await c.req.json<VideoAnalysisRequest>();
    const { imageUrl, imageBase64, analysisType = 'full-analysis' } = body;

    if (!imageUrl && !imageBase64) {
      return c.json({ error: 'Image URL or base64 data required' }, 400);
    }

    console.log('🔍 Analyzing kitchen image for floor plan generation...');

    const prompt = `You are an expert kitchen designer. Analyze this image of a kitchen and extract detailed kitchen layout information.

Please identify and provide measurements for:
1. **Cabinets**: Type, position, dimensions, material, finish, hardware, number of doors/drawers
2. **Appliances**: Type, position, dimensions, notes
3. **Countertops**: Material, length, depth, area, edge profile
4. **Layout**: Type (galley, L-shaped, U-shaped, island, peninsula, one-wall), work triangle (sink, stove, refrigerator, efficiency score)
5. **Overall dimensions**: Total width, length, ceiling height if visible

Return your analysis as a JSON object with this structure:
{
  "roomDimensions": {
    "width": 240,
    "length": 180,
    "height": 96,
    "area": 43200
  },
  "cabinets": [
    {
      "id": "cabinet-1",
      "type": "base",
      "position": {
        "x": 0,
        "y": 0,
        "wall": "north"
      },
      "dimensions": {
        "width": 48,
        "height": 36,
        "depth": 24
      },
      "material": "oak",
      "finish": "natural",
      "hardware": "chrome",
      "doors": 2,
      "drawers": 1,
      "estimatedCost": 150
    }
  ],
  "appliances": [
    {
      "id": "appliance-1",
      "type": "refrigerator",
      "position": {
        "x": 120,
        "y": 0
      },
      "dimensions": {
        "width": 36,
        "height": 60,
        "depth": 36
      },
      "notes": "Side-by-side refrigerator"
    }
  ],
  "countertops": [
    {
      "id": "countertop-1",
      "material": "granite",
      "length": 120,
      "depth": 24,
      "area": 2880,
      "edgeProfile": "bullnose",
      "estimatedCost": 500
    }
  ],
  "layout": {
    "type": "galley",
    "workTriangle": {
      "sink": { "x": 60, "y": 0 },
      "stove": { "x": 120, "y": 0 },
      "refrigerator": { "x": 180, "y": 0 },
      "efficiency": 85
    }
  },
  "totalCost": 1150
}

All measurements should be in inches. Be as precise as possible based on visible reference points.`;

    const aiResponse = await analyzeWithOpenAI(imageUrl, imageBase64, prompt);
    const analysisText = aiResponse.choices[0]?.message?.content || '';

    console.log('✅ AI Analysis complete');

    // Extract JSON from response
    let kitchenData;
    try {
      // Try to find JSON in the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        kitchenData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return c.json({
        error: 'Failed to parse AI analysis',
        rawResponse: analysisText
      }, 500);
    }

    // Convert to FloorPlanElements format
    const elements: FloorPlanElement[] = [];
    let elementId = 0;

    // Add rooms
    if (kitchenData.roomDimensions) {
      elements.push({
        id: `room-${elementId++}`,
        type: 'room',
        x: 0,
        y: 0,
        width: kitchenData.roomDimensions.width || 200,
        height: kitchenData.roomDimensions.length || 200,
        rotation: 0,
        label: 'Kitchen',
        color: '#2A2A2A',
        metadata: {
          dimensions: `${kitchenData.roomDimensions.width}" x ${kitchenData.roomDimensions.length}"`,
          notes: 'Kitchen space'
        }
      });
    }

    // Add walls
    if (kitchenData.roomDimensions) {
      elements.push({
        id: `wall-${elementId++}`,
        type: 'wall',
        x: 0,
        y: 0,
        width: kitchenData.roomDimensions.width || 200,
        height: 6,
        rotation: 0,
        metadata: {
          material: 'drywall'
        }
      });
      elements.push({
        id: `wall-${elementId++}`,
        type: 'wall',
        x: 0,
        y: 0,
        width: 6,
        height: kitchenData.roomDimensions.length || 200,
        rotation: 0,
        metadata: {
          material: 'drywall'
        }
      });
      elements.push({
        id: `wall-${elementId++}`,
        type: 'wall',
        x: 0,
        y: kitchenData.roomDimensions.length || 200,
        width: kitchenData.roomDimensions.width || 200,
        height: 6,
        rotation: 0,
        metadata: {
          material: 'drywall'
        }
      });
      elements.push({
        id: `wall-${elementId++}`,
        type: 'wall',
        x: kitchenData.roomDimensions.width || 200,
        y: 0,
        width: 6,
        height: kitchenData.roomDimensions.length || 200,
        rotation: 0,
        metadata: {
          material: 'drywall'
        }
      });
    }

    // Add doors
    if (kitchenData.cabinets) {
      kitchenData.cabinets.forEach((cabinet: any) => {
        if (cabinet.type === 'base' || cabinet.type === 'wall') {
          elements.push({
            id: `door-${elementId++}`,
            type: 'door',
            x: cabinet.position.x || 0,
            y: cabinet.position.y || 0,
            width: cabinet.dimensions.width || 36,
            height: cabinet.dimensions.height || 6,
            rotation: 0,
            metadata: {
              notes: `${cabinet.type}, ${cabinet.hardware} hardware`
            }
          });
        }
      });
    }

    // Add windows
    if (kitchenData.cabinets) {
      kitchenData.cabinets.forEach((cabinet: any) => {
        if (cabinet.type === 'base' || cabinet.type === 'wall') {
          elements.push({
            id: `window-${elementId++}`,
            type: 'window',
            x: cabinet.position.x || 0,
            y: cabinet.position.y || 0,
            width: cabinet.dimensions.width || 48,
            height: cabinet.dimensions.height || 4,
            rotation: 0,
            metadata: {
              notes: 'Kitchen window'
            }
          });
        }
      });
    }

    const project: FloorPlanProject = {
      id: `ai-project-${Date.now()}`,
      name: `AI Generated - ${new Date().toLocaleDateString()}`,
      elements,
      measurements: {
        totalArea: kitchenData.roomDimensions?.area || 0,
        roomCount: 1,
        wallCount: 4
      },
      metadata: {
        source: 'image',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      kitchenData
    };

    return c.json({
      success: true,
      project,
      rawAnalysis: kitchenData,
      aiResponse: analysisText
    });

  } catch (error: any) {
    console.error('Error analyzing kitchen image:', error);
    return c.json({
      error: 'Failed to analyze kitchen image',
      details: error.message
    }, 500);
  }
});

export default app;