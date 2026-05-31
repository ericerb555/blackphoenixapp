/**
 * Template & Component Library System
 * Pre-built rooms, components, and design templates
 */

export interface Template {
  id: string;
  name: string;
  category: 'residential' | 'commercial' | 'industrial' | 'mixed-use';
  subcategory: string; // e.g., "kitchen", "bathroom", "office", "retail"
  description: string;
  thumbnail?: string;
  elements: any[];
  measurements: any[];
  annotations: any[];
  dimensions: {
    width: number;
    height: number;
    area: number;
  };
  tags: string[];
  popularity: number;
  createdBy: string;
  createdAt: string;
}

export interface ComponentFamily {
  id: string;
  name: string;
  category: 'furniture' | 'fixture' | 'equipment' | 'structural';
  variants: ComponentVariant[];
  manufacturer?: string;
  specifications?: Record<string, any>;
}

export interface ComponentVariant {
  id: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  element: any; // The actual element data
  thumbnail?: string;
  price?: number;
  sku?: string;
}

/**
 * Built-in Template Library
 */
export const TEMPLATE_LIBRARY: Template[] = [
  {
    id: 'residential-kitchen-1',
    name: 'Modern L-Shaped Kitchen',
    category: 'residential',
    subcategory: 'kitchen',
    description: '12x10 ft modern kitchen with island and pantry',
    elements: [
      { type: 'wall', x1: 100, y1: 100, x2: 244, y2: 100, layer: 'Architectural' },
      { type: 'wall', x1: 244, y1: 100, x2: 244, y2: 220, layer: 'Architectural' },
      { type: 'wall', x1: 244, y1: 220, x2: 100, y2: 220, layer: 'Architectural' },
      { type: 'wall', x1: 100, y1: 220, x2: 100, y2: 100, layer: 'Architectural' },
      { type: 'door', x: 100, y: 160, width: 36, layer: 'Architectural' },
      { type: 'window', x: 200, y: 100, width: 48, layer: 'Architectural' },
    ],
    measurements: [],
    annotations: [
      { type: 'note', position: { x: 160, y: 160 }, text: 'Kitchen', layer: 'Annotations' },
    ],
    dimensions: { width: 144, height: 120, area: 120 },
    tags: ['kitchen', 'modern', 'L-shaped', 'island'],
    popularity: 95,
    createdBy: 'CaptureCAD',
    createdAt: '2026-01-01',
  },
  {
    id: 'residential-bathroom-1',
    name: 'Full Bathroom with Tub',
    category: 'residential',
    subcategory: 'bathroom',
    description: '8x10 ft bathroom with tub, toilet, and vanity',
    elements: [
      { type: 'wall', x1: 300, y1: 100, x2: 396, y2: 100, layer: 'Architectural' },
      { type: 'wall', x1: 396, y1: 100, x2: 396, y2: 220, layer: 'Architectural' },
      { type: 'wall', x1: 396, y1: 220, x2: 300, y2: 220, layer: 'Architectural' },
      { type: 'wall', x1: 300, y1: 220, x2: 300, y2: 100, layer: 'Architectural' },
      { type: 'door', x: 300, y: 160, width: 30, layer: 'Architectural' },
      { type: 'fixture', x: 320, y: 120, layer: 'Plumbing' },
      { type: 'fixture', x: 360, y: 120, layer: 'Plumbing' },
      { type: 'fixture', x: 320, y: 190, layer: 'Plumbing' },
    ],
    measurements: [],
    annotations: [
      { type: 'note', position: { x: 340, y: 160 }, text: 'Bathroom', layer: 'Annotations' },
    ],
    dimensions: { width: 96, height: 120, area: 80 },
    tags: ['bathroom', 'full-bath', 'tub', 'residential'],
    popularity: 88,
    createdBy: 'CaptureCAD',
    createdAt: '2026-01-01',
  },
  {
    id: 'residential-bedroom-1',
    name: 'Master Bedroom Suite',
    category: 'residential',
    subcategory: 'bedroom',
    description: '14x16 ft master bedroom with walk-in closet',
    elements: [
      { type: 'wall', x1: 420, y1: 100, x2: 588, y2: 100, layer: 'Architectural' },
      { type: 'wall', x1: 588, y1: 100, x2: 588, y2: 292, layer: 'Architectural' },
      { type: 'wall', x1: 588, y1: 292, x2: 420, y2: 292, layer: 'Architectural' },
      { type: 'wall', x1: 420, y1: 292, x2: 420, y2: 100, layer: 'Architectural' },
      { type: 'door', x: 420, y: 190, width: 36, layer: 'Architectural' },
      { type: 'window', x: 500, y: 100, width: 60, layer: 'Architectural' },
      { type: 'window', x: 588, y: 190, width: 60, layer: 'Architectural' },
    ],
    measurements: [],
    annotations: [
      { type: 'note', position: { x: 500, y: 196 }, text: 'Master Bedroom', layer: 'Annotations' },
    ],
    dimensions: { width: 168, height: 192, area: 224 },
    tags: ['bedroom', 'master', 'walk-in-closet', 'residential'],
    popularity: 92,
    createdBy: 'CaptureCAD',
    createdAt: '2026-01-01',
  },
  {
    id: 'commercial-office-1',
    name: 'Open Office Layout',
    category: 'commercial',
    subcategory: 'office',
    description: '20x30 ft open office with 8 workstations',
    elements: [
      { type: 'wall', x1: 100, y1: 300, x2: 340, y2: 300, layer: 'Architectural' },
      { type: 'wall', x1: 340, y1: 300, x2: 340, y2: 540, layer: 'Architectural' },
      { type: 'wall', x1: 340, y1: 540, x2: 100, y2: 540, layer: 'Architectural' },
      { type: 'wall', x1: 100, y1: 540, x2: 100, y2: 300, layer: 'Architectural' },
      { type: 'door', x: 220, y: 300, width: 42, layer: 'Architectural' },
      { type: 'window', x: 120, y: 300, width: 72, layer: 'Architectural' },
      { type: 'window', x: 280, y: 300, width: 72, layer: 'Architectural' },
    ],
    measurements: [],
    annotations: [
      { type: 'note', position: { x: 220, y: 420 }, text: 'Open Office', layer: 'Annotations' },
    ],
    dimensions: { width: 240, height: 240, area: 600 },
    tags: ['office', 'commercial', 'open-plan', 'workstations'],
    popularity: 85,
    createdBy: 'CaptureCAD',
    createdAt: '2026-01-01',
  },
  {
    id: 'commercial-conference-1',
    name: 'Conference Room',
    category: 'commercial',
    subcategory: 'meeting',
    description: '16x20 ft conference room with AV equipment',
    elements: [
      { type: 'wall', x1: 360, y1: 300, x2: 552, y2: 300, layer: 'Architectural' },
      { type: 'wall', x1: 552, y1: 300, x2: 552, y2: 460, layer: 'Architectural' },
      { type: 'wall', x1: 552, y1: 460, x2: 360, y2: 460, layer: 'Architectural' },
      { type: 'wall', x1: 360, y1: 460, x2: 360, y2: 300, layer: 'Architectural' },
      { type: 'door', x: 360, y: 380, width: 42, layer: 'Architectural' },
      { type: 'window', x: 480, y: 300, width: 60, layer: 'Architectural' },
    ],
    measurements: [],
    annotations: [
      { type: 'note', position: { x: 456, y: 380 }, text: 'Conference Room', layer: 'Annotations' },
    ],
    dimensions: { width: 192, height: 160, area: 320 },
    tags: ['conference', 'meeting', 'commercial', 'AV'],
    popularity: 78,
    createdBy: 'CaptureCAD',
    createdAt: '2026-01-01',
  },
  {
    id: 'commercial-retail-1',
    name: 'Retail Storefront',
    category: 'commercial',
    subcategory: 'retail',
    description: '25x40 ft retail space with display windows',
    elements: [
      { type: 'wall', x1: 580, y1: 300, x2: 880, y2: 300, layer: 'Architectural' },
      { type: 'wall', x1: 880, y1: 300, x2: 880, y2: 620, layer: 'Architectural' },
      { type: 'wall', x1: 880, y1: 620, x2: 580, y2: 620, layer: 'Architectural' },
      { type: 'wall', x1: 580, y1: 620, x2: 580, y2: 300, layer: 'Architectural' },
      { type: 'door', x: 700, y: 300, width: 48, layer: 'Architectural' },
      { type: 'window', x: 620, y: 300, width: 60, layer: 'Architectural' },
      { type: 'window', x: 780, y: 300, width: 60, layer: 'Architectural' },
    ],
    measurements: [],
    annotations: [
      { type: 'note', position: { x: 730, y: 460 }, text: 'Retail Space', layer: 'Annotations' },
    ],
    dimensions: { width: 300, height: 320, area: 1000 },
    tags: ['retail', 'storefront', 'commercial', 'display'],
    popularity: 82,
    createdBy: 'CaptureCAD',
    createdAt: '2026-01-01',
  },
];

/**
 * Component Library
 */
export const COMPONENT_LIBRARY: ComponentFamily[] = [
  {
    id: 'door-family',
    name: 'Standard Doors',
    category: 'structural',
    variants: [
      {
        id: 'door-30',
        name: '30" Single Door',
        dimensions: { width: 30, height: 80 },
        element: { type: 'door', width: 30 },
      },
      {
        id: 'door-36',
        name: '36" Single Door',
        dimensions: { width: 36, height: 80 },
        element: { type: 'door', width: 36 },
      },
      {
        id: 'door-42',
        name: '42" Single Door',
        dimensions: { width: 42, height: 80 },
        element: { type: 'door', width: 42 },
      },
      {
        id: 'door-60-double',
        name: '60" Double Door',
        dimensions: { width: 60, height: 80 },
        element: { type: 'door', width: 60 },
      },
    ],
  },
  {
    id: 'window-family',
    name: 'Standard Windows',
    category: 'structural',
    variants: [
      {
        id: 'window-36',
        name: '36" Window',
        dimensions: { width: 36, height: 48 },
        element: { type: 'window', width: 36 },
      },
      {
        id: 'window-48',
        name: '48" Window',
        dimensions: { width: 48, height: 60 },
        element: { type: 'window', width: 48 },
      },
      {
        id: 'window-60',
        name: '60" Window',
        dimensions: { width: 60, height: 60 },
        element: { type: 'window', width: 60 },
      },
      {
        id: 'window-72',
        name: '72" Bay Window',
        dimensions: { width: 72, height: 72 },
        element: { type: 'window', width: 72 },
      },
    ],
  },
];

/**
 * Template Library Manager
 */
export class TemplateLibraryManager {
  private templates: Template[] = [...TEMPLATE_LIBRARY];
  private components: ComponentFamily[] = [...COMPONENT_LIBRARY];

  /**
   * Search templates
   */
  searchTemplates(query: string, category?: string): Template[] {
    const lowerQuery = query.toLowerCase();
    
    return this.templates.filter((template) => {
      const matchesQuery =
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));

      const matchesCategory = !category || template.category === category;

      return matchesQuery && matchesCategory;
    }).sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): Template | null {
    return this.templates.find((t) => t.id === id) || null;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): Template[] {
    return this.templates
      .filter((t) => t.category === category)
      .sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 6): Template[] {
    return [...this.templates]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Add custom template
   */
  addTemplate(template: Omit<Template, 'id' | 'createdAt'>): Template {
    const newTemplate: Template = {
      ...template,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    this.templates.push(newTemplate);
    return newTemplate;
  }

  /**
   * Get component family
   */
  getComponentFamily(id: string): ComponentFamily | null {
    return this.components.find((c) => c.id === id) || null;
  }

  /**
   * Get all component families
   */
  getAllComponentFamilies(): ComponentFamily[] {
    return this.components;
  }

  /**
   * Search components
   */
  searchComponents(query: string): ComponentFamily[] {
    const lowerQuery = query.toLowerCase();
    return this.components.filter((comp) =>
      comp.name.toLowerCase().includes(lowerQuery)
    );
  }
}

/**
 * Apply template to canvas
 */
export function applyTemplate(
  template: Template,
  offsetX: number = 0,
  offsetY: number = 0
): { elements: any[]; measurements: any[]; annotations: any[] } {
  return {
    elements: template.elements.map((el) => {
      const newEl = { ...el };
      if ('x1' in el && 'y1' in el) {
        newEl.x1 = el.x1 + offsetX;
        newEl.y1 = el.y1 + offsetY;
      }
      if ('x2' in el && 'y2' in el) {
        newEl.x2 = el.x2 + offsetX;
        newEl.y2 = el.y2 + offsetY;
      }
      if ('x' in el && 'y' in el) {
        newEl.x = el.x + offsetX;
        newEl.y = el.y + offsetY;
      }
      newEl.id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return newEl;
    }),
    measurements: template.measurements.map((m) => ({
      ...m,
      id: `meas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    })),
    annotations: template.annotations.map((a) => ({
      ...a,
      position: {
        x: a.position.x + offsetX,
        y: a.position.y + offsetY,
      },
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    })),
  };
}
