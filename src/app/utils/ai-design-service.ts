/**
 * AI-Powered Design Assistant
 * Text-to-floor-plan, image analysis, smart placement, code compliance
 */

export interface AIFloorPlanRequest {
  type: 'text' | 'image' | 'sketch' | 'video';
  input: string; // Text description or base64 image/video
  style?: 'residential' | 'commercial' | 'industrial' | 'mixed-use';
  floors?: number;
  squareFootage?: number;
  rooms?: string[];
  constraints?: {
    maxWidth?: number;
    maxHeight?: number;
    budget?: number;
    buildingCode?: string; // e.g., "IBC 2021", "IRC 2021"
  };
}

export interface AIFloorPlanResponse {
  success: boolean;
  floorPlan: {
    elements: any[];
    measurements: any[];
    annotations: any[];
    metadata: {
      style: string;
      totalArea: number;
      roomCount: number;
      compliance: ComplianceReport;
    };
  };
  alternatives?: any[]; // Alternative designs
  reasoning?: string; // AI explanation
  warnings?: string[];
}

export interface ComplianceReport {
  compliant: boolean;
  code: string;
  checks: ComplianceCheck[];
  violations: ComplianceViolation[];
  recommendations: string[];
}

export interface ComplianceCheck {
  id: string;
  category: 'egress' | 'accessibility' | 'structural' | 'fire-safety' | 'ventilation' | 'lighting';
  rule: string;
  status: 'pass' | 'fail' | 'warning' | 'not-applicable';
  details: string;
}

export interface ComplianceViolation {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  category: string;
  description: string;
  location?: { x: number; y: number };
  recommendation: string;
}

export interface SmartPlacementSuggestion {
  elementType: string;
  position: { x: number; y: number };
  confidence: number; // 0-1
  reasoning: string;
  alternatives?: { x: number; y: number }[];
}

/**
 * AI Design Service
 */
export class AIDesignService {
  private apiKey: string;
  private apiBase: string;

  constructor(apiKey: string, apiBase?: string) {
    this.apiKey = apiKey;
    this.apiBase = apiBase || 'https://api.openai.com/v1';
  }

  /**
   * Generate floor plan from text description
   */
  async generateFromText(description: string, options?: Partial<AIFloorPlanRequest>): Promise<AIFloorPlanResponse> {
    try {
      const prompt = this.buildFloorPlanPrompt(description, options);

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        success: true,
        floorPlan: this.convertAIResponseToElements(parsed),
        reasoning: parsed.reasoning,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      console.error('AI generation error:', error);
      return {
        success: false,
        floorPlan: { elements: [], measurements: [], annotations: [], metadata: {} as any },
        warnings: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Analyze image and generate floor plan
   */
  async generateFromImage(imageBase64: string, options?: Partial<AIFloorPlanRequest>): Promise<AIFloorPlanResponse> {
    try {
      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`AI Vision API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        success: true,
        floorPlan: this.convertAIResponseToElements(parsed),
        reasoning: parsed.reasoning,
        warnings: parsed.warnings || [],
      };
    } catch (error) {
      console.error('AI image analysis error:', error);
      return {
        success: false,
        floorPlan: { elements: [], measurements: [], annotations: [], metadata: {} as any },
        warnings: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Get smart placement suggestions for an element
   */
  async getSmartPlacement(
    elementType: string,
    existingElements: any[],
    context?: string
  ): Promise<SmartPlacementSuggestion[]> {
    try {
      const prompt = `Given a floor plan with existing elements, suggest optimal placement for a ${elementType}.
      
      Existing elements: ${JSON.stringify(existingElements.slice(0, 20))}
      Context: ${context || 'Standard placement'}
      
      Consider:
      - Building codes and regulations
      - Traffic flow and accessibility
      - Functional relationships
      - Ergonomics and usability
      - Safety and emergency egress
      
      Return JSON array of placement suggestions with coordinates, confidence score, and reasoning.`;

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert architectural assistant specializing in optimal component placement.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.6,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return parsed.suggestions || [];
    } catch (error) {
      console.error('Smart placement error:', error);
      return [];
    }
  }

  /**
   * Check building code compliance
   */
  async checkCompliance(elements: any[], code: string = 'IBC 2021'): Promise<ComplianceReport> {
    try {
      const prompt = `Analyze this floor plan for compliance with ${code} building code.
      
      Elements: ${JSON.stringify(elements)}
      
      Check for:
      1. Egress requirements (exit width, travel distance, exit signs)
      2. Accessibility (ADA/ANSI A117.1 compliance, door widths, clearances)
      3. Structural requirements (wall spacing, load-bearing)
      4. Fire safety (compartmentalization, fire-rated walls, sprinklers)
      5. Ventilation and natural light requirements
      6. Minimum room sizes and ceiling heights
      
      Return detailed compliance report in JSON format.`;

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
          temperature: 0.3, // Lower temperature for more consistent compliance checks
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        compliant: parsed.compliant || false,
        code: code,
        checks: parsed.checks || [],
        violations: parsed.violations || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('Compliance check error:', error);
      return {
        compliant: false,
        code: code,
        checks: [],
        violations: [{
          id: 'error',
          severity: 'critical',
          category: 'system',
          description: 'Failed to run compliance check',
          recommendation: 'Please try again or check manually',
        }],
        recommendations: ['Manual review required due to system error'],
      };
    }
  }

  /**
   * Get AI design suggestions
   */
  async getDesignSuggestions(elements: any[], context?: string): Promise<string[]> {
    try {
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
      
      Return array of practical suggestions.`;

      const response = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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

      const data = await response.json();
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return parsed.suggestions || [];
    } catch (error) {
      console.error('Design suggestions error:', error);
      return ['Unable to generate suggestions at this time'];
    }
  }

  // Private helper methods
  private buildFloorPlanPrompt(description: string, options?: Partial<AIFloorPlanRequest>): string {
    let prompt = `Generate a detailed floor plan for: ${description}\n\n`;

    if (options?.style) {
      prompt += `Style: ${options.style}\n`;
    }
    if (options?.floors) {
      prompt += `Number of floors: ${options.floors}\n`;
    }
    if (options?.squareFootage) {
      prompt += `Total area: ${options.squareFootage} sq ft\n`;
    }
    if (options?.rooms && options.rooms.length > 0) {
      prompt += `Required rooms: ${options.rooms.join(', ')}\n`;
    }
    if (options?.constraints?.buildingCode) {
      prompt += `Building code: ${options.constraints.buildingCode}\n`;
    }

    prompt += `\nGenerate a complete floor plan with:
    1. Walls (with x1, y1, x2, y2 coordinates in pixels, scale 1px = 1 inch)
    2. Doors (with position and width)
    3. Windows (with position and width)
    4. Room annotations (with labels like "Living Room", "Bedroom", etc.)
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
      "metadata": {
        "style": string,
        "totalArea": number,
        "roomCount": number
      },
      "reasoning": "Explanation of design decisions",
      "warnings": []
    }`;

    return prompt;
  }

  private convertAIResponseToElements(aiResponse: any): any {
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
      metadata: aiResponse.metadata || {
        style: 'unknown',
        totalArea: 0,
        roomCount: 0,
        compliance: {
          compliant: false,
          code: 'N/A',
          checks: [],
          violations: [],
          recommendations: [],
        },
      },
    };
  }
}

/**
 * Create AI Design Service with environment API key
 */
export function createAIDesignService(): AIDesignService {
  // In production, API key should be fetched from environment
  const apiKey = import.meta.env?.VITE_OPENAI_API_KEY || '';
  return new AIDesignService(apiKey);
}
