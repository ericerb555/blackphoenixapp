/**
 * Multi-Floor & Multi-Zone Project Management
 * Enables vertical stacking, floor linking, and zone organization
 */

export interface Floor {
  id: string;
  name: string;
  level: number; // 0 = ground, 1 = first floor, -1 = basement, etc.
  elevation: number; // Height in feet/meters
  height: number; // Floor-to-ceiling height
  isVisible: boolean;
  isLocked: boolean;
  elements: any[]; // Elements on this floor
  measurements: any[];
  annotations: any[];
  opacity: number; // For showing floors below
  color: string; // Floor identifier color
}

export interface Zone {
  id: string;
  name: string;
  floorId: string;
  type: 'room' | 'area' | 'zone' | 'section';
  boundary: { x: number; y: number }[]; // Polygon boundary
  color: string;
  properties: Record<string, any>;
}

export interface FloorLink {
  id: string;
  type: 'staircase' | 'elevator' | 'ramp' | 'opening';
  fromFloorId: string;
  toFloorId: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface MultiFloorProject {
  id: string;
  name: string;
  floors: Floor[];
  zones: Zone[];
  floorLinks: FloorLink[];
  activeFloorId: string;
  metadata: {
    created: string;
    modified: string;
    version: string;
  };
}

/**
 * Multi-Floor Manager
 */
export class MultiFloorManager {
  private project: MultiFloorProject;

  constructor(project: MultiFloorProject) {
    this.project = project;
  }

  /**
   * Create a new floor
   */
  createFloor(name: string, level: number, elevation: number = 0, height: number = 10): Floor {
    const newFloor: Floor = {
      id: `floor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      level,
      elevation,
      height,
      isVisible: true,
      isLocked: false,
      elements: [],
      measurements: [],
      annotations: [],
      opacity: 1,
      color: this.generateFloorColor(level),
    };

    this.project.floors.push(newFloor);
    this.project.floors.sort((a, b) => b.level - a.level); // Sort by level descending
    
    return newFloor;
  }

  /**
   * Delete a floor
   */
  deleteFloor(floorId: string): boolean {
    const index = this.project.floors.findIndex(f => f.id === floorId);
    if (index === -1) return false;

    // Remove floor links
    this.project.floorLinks = this.project.floorLinks.filter(
      link => link.fromFloorId !== floorId && link.toFloorId !== floorId
    );

    // Remove zones
    this.project.zones = this.project.zones.filter(z => z.floorId !== floorId);

    // Remove floor
    this.project.floors.splice(index, 1);

    // If active floor was deleted, switch to another
    if (this.project.activeFloorId === floorId && this.project.floors.length > 0) {
      this.project.activeFloorId = this.project.floors[0].id;
    }

    return true;
  }

  /**
   * Duplicate a floor
   */
  duplicateFloor(floorId: string, newName: string, newLevel: number): Floor | null {
    const sourceFloor = this.project.floors.find(f => f.id === floorId);
    if (!sourceFloor) return null;

    const newFloor: Floor = {
      ...sourceFloor,
      id: `floor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      level: newLevel,
      elements: JSON.parse(JSON.stringify(sourceFloor.elements)), // Deep clone
      measurements: JSON.parse(JSON.stringify(sourceFloor.measurements)),
      annotations: JSON.parse(JSON.stringify(sourceFloor.annotations)),
    };

    this.project.floors.push(newFloor);
    this.project.floors.sort((a, b) => b.level - a.level);

    return newFloor;
  }

  /**
   * Link two floors (staircase, elevator, etc.)
   */
  linkFloors(
    fromFloorId: string,
    toFloorId: string,
    type: FloorLink['type'],
    position: { x: number; y: number },
    width: number = 48,
    height: number = 96
  ): FloorLink {
    const link: FloorLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      fromFloorId,
      toFloorId,
      position,
      width,
      height,
    };

    this.project.floorLinks.push(link);
    return link;
  }

  /**
   * Get active floor
   */
  getActiveFloor(): Floor | null {
    return this.project.floors.find(f => f.id === this.project.activeFloorId) || null;
  }

  /**
   * Set active floor
   */
  setActiveFloor(floorId: string): boolean {
    const floor = this.project.floors.find(f => f.id === floorId);
    if (!floor) return false;

    this.project.activeFloorId = floorId;
    return true;
  }

  /**
   * Toggle floor visibility
   */
  toggleFloorVisibility(floorId: string): boolean {
    const floor = this.project.floors.find(f => f.id === floorId);
    if (!floor) return false;

    floor.isVisible = !floor.isVisible;
    return true;
  }

  /**
   * Set floor opacity (for showing floors below)
   */
  setFloorOpacity(floorId: string, opacity: number): boolean {
    const floor = this.project.floors.find(f => f.id === floorId);
    if (!floor) return false;

    floor.opacity = Math.max(0, Math.min(1, opacity));
    return true;
  }

  /**
   * Get floors in rendering order (top to bottom)
   */
  getFloorsInRenderOrder(): Floor[] {
    return [...this.project.floors]
      .filter(f => f.isVisible)
      .sort((a, b) => b.level - a.level);
  }

  /**
   * Create a zone on a floor
   */
  createZone(
    floorId: string,
    name: string,
    type: Zone['type'],
    boundary: { x: number; y: number }[]
  ): Zone {
    const zone: Zone = {
      id: `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      floorId,
      type,
      boundary,
      color: this.generateZoneColor(),
      properties: {},
    };

    this.project.zones.push(zone);
    return zone;
  }

  /**
   * Get zones for a floor
   */
  getZonesForFloor(floorId: string): Zone[] {
    return this.project.zones.filter(z => z.floorId === floorId);
  }

  /**
   * Align element vertically across floors
   */
  alignVertically(elementId: string, sourceFloorId: string, targetFloorId: string): boolean {
    const sourceFloor = this.project.floors.find(f => f.id === sourceFloorId);
    const targetFloor = this.project.floors.find(f => f.id === targetFloorId);
    
    if (!sourceFloor || !targetFloor) return false;

    const element = sourceFloor.elements.find(e => e.id === elementId);
    if (!element) return false;

    // Clone element to target floor at same X,Y position
    const clonedElement = JSON.parse(JSON.stringify(element));
    clonedElement.id = `${element.id}-copy-${Date.now()}`;
    targetFloor.elements.push(clonedElement);

    return true;
  }

  /**
   * Get total building height
   */
  getTotalHeight(): number {
    if (this.project.floors.length === 0) return 0;
    
    const maxElevation = Math.max(...this.project.floors.map(f => f.elevation + f.height));
    const minElevation = Math.min(...this.project.floors.map(f => f.elevation));
    
    return maxElevation - minElevation;
  }

  /**
   * Export floor data
   */
  exportFloor(floorId: string): Floor | null {
    const floor = this.project.floors.find(f => f.id === floorId);
    return floor ? JSON.parse(JSON.stringify(floor)) : null;
  }

  /**
   * Import floor data
   */
  importFloor(floorData: Floor): Floor {
    const newFloor = {
      ...floorData,
      id: `floor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.project.floors.push(newFloor);
    this.project.floors.sort((a, b) => b.level - a.level);

    return newFloor;
  }

  // Helper methods
  private generateFloorColor(level: number): string {
    const colors = [
      '#6cf0ff', // Ground
      '#ff5c2a', // First
      '#a78bfa', // Second
      '#fbbf24', // Third
      '#3b82f6', // Fourth
      '#22c55e', // Fifth
    ];
    return colors[Math.abs(level) % colors.length];
  }

  private generateZoneColor(): string {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    return colors[Math.floor(Math.random() * colors.length)] + '40'; // With alpha
  }

  getProject(): MultiFloorProject {
    return this.project;
  }
}

/**
 * Create a new multi-floor project
 */
export function createMultiFloorProject(name: string): MultiFloorProject {
  const groundFloor: Floor = {
    id: `floor-${Date.now()}-ground`,
    name: 'Ground Floor',
    level: 0,
    elevation: 0,
    height: 10,
    isVisible: true,
    isLocked: false,
    elements: [],
    measurements: [],
    annotations: [],
    opacity: 1,
    color: '#6cf0ff',
  };

  return {
    id: `project-${Date.now()}`,
    name,
    floors: [groundFloor],
    zones: [],
    floorLinks: [],
    activeFloorId: groundFloor.id,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: '2.0.0',
    },
  };
}

/**
 * Calculate floor statistics
 */
export function calculateFloorStats(floor: Floor) {
  return {
    elementCount: floor.elements.length,
    wallCount: floor.elements.filter(e => e.type === 'wall').length,
    doorCount: floor.elements.filter(e => e.type === 'door').length,
    windowCount: floor.elements.filter(e => e.type === 'window').length,
    measurementCount: floor.measurements.length,
    annotationCount: floor.annotations.length,
  };
}
