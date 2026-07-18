/**
 * Auto-Layout Engine
 * 
 * Intelligent layout optimization for floor plans:
 * - Smart furniture placement
 * - Room optimization
 * - Traffic flow analysis
 * - Code compliance checking
 * - Space utilization
 */

import { toast } from 'sonner@2.0.3';

interface CanvasElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture' | 'electrical' | 'plumbing' | 'shape' | 'annotation' | 'dimension';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  subtype?: string;
}

interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface LayoutSuggestion {
  id: string;
  type: 'furniture' | 'electrical' | 'plumbing';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Analyze room and suggest optimal furniture placement
 */
export function suggestFurniturePlacement(
  room: Room,
  roomType: 'bedroom' | 'living' | 'kitchen' | 'bathroom' | 'office'
): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  const padding = 24; // 24" clearance from walls

  switch (roomType) {
    case 'bedroom':
      // Bed placement (centered on long wall)
      if (room.width >= room.height) {
        // Horizontal room
        suggestions.push({
          id: 'bed-main',
          type: 'furniture',
          name: 'Queen Bed',
          x: room.x + room.width / 2 - 40,
          y: room.y + padding,
          width: 80, // Queen bed 60" wide
          height: 80, // 80" long
          rotation: 0,
          reason: 'Bed centered on primary wall for optimal space',
          priority: 'high'
        });

        // Nightstands
        suggestions.push({
          id: 'nightstand-left',
          type: 'furniture',
          name: 'Nightstand',
          x: room.x + room.width / 2 - 60,
          y: room.y + padding,
          width: 18,
          height: 18,
          rotation: 0,
          reason: 'Nightstand for bedside storage',
          priority: 'medium'
        });

        suggestions.push({
          id: 'nightstand-right',
          type: 'furniture',
          name: 'Nightstand',
          x: room.x + room.width / 2 + 42,
          y: room.y + padding,
          width: 18,
          height: 18,
          rotation: 0,
          reason: 'Nightstand for bedside storage',
          priority: 'medium'
        });

        // Dresser on opposite wall
        suggestions.push({
          id: 'dresser',
          type: 'furniture',
          name: 'Dresser',
          x: room.x + room.width / 2 - 30,
          y: room.y + room.height - padding - 20,
          width: 60,
          height: 20,
          rotation: 0,
          reason: 'Dresser on opposite wall for balance',
          priority: 'medium'
        });
      }
      break;

    case 'living':
      // Sofa placement
      suggestions.push({
        id: 'sofa-main',
        type: 'furniture',
        name: 'Sofa',
        x: room.x + room.width / 2 - 48,
        y: room.y + room.height / 2 + 30,
        width: 96, // 8 feet
        height: 36, // 3 feet
        rotation: 0,
        reason: 'Sofa positioned for conversation area',
        priority: 'high'
      });

      // Coffee table
      suggestions.push({
        id: 'coffee-table',
        type: 'furniture',
        name: 'Coffee Table',
        x: room.x + room.width / 2 - 24,
        y: room.y + room.height / 2 - 18,
        width: 48,
        height: 24,
        rotation: 0,
        reason: 'Coffee table 18" from sofa',
        priority: 'medium'
      });

      // TV stand
      suggestions.push({
        id: 'tv-stand',
        type: 'furniture',
        name: 'TV Stand',
        x: room.x + room.width / 2 - 36,
        y: room.y + padding,
        width: 72,
        height: 18,
        rotation: 0,
        reason: 'TV centered across from seating',
        priority: 'high'
      });

      // Armchairs
      suggestions.push({
        id: 'chair-left',
        type: 'furniture',
        name: 'Armchair',
        x: room.x + padding,
        y: room.y + room.height / 2 - 16,
        width: 32,
        height: 32,
        rotation: 90,
        reason: 'Additional seating for conversation',
        priority: 'low'
      });

      suggestions.push({
        id: 'chair-right',
        type: 'furniture',
        name: 'Armchair',
        x: room.x + room.width - padding - 32,
        y: room.y + room.height / 2 - 16,
        width: 32,
        height: 32,
        rotation: -90,
        reason: 'Additional seating for conversation',
        priority: 'low'
      });
      break;

    case 'kitchen':
      // Kitchen work triangle optimization
      // Sink
      suggestions.push({
        id: 'sink',
        type: 'plumbing',
        name: 'Kitchen Sink',
        x: room.x + room.width / 2 - 17,
        y: room.y + padding,
        width: 33,
        height: 22,
        rotation: 0,
        reason: 'Sink centered on primary wall',
        priority: 'high'
      });

      // Range (4-5 feet from sink)
      suggestions.push({
        id: 'range',
        type: 'furniture',
        name: 'Range',
        x: room.x + room.width - padding - 30,
        y: room.y + padding,
        width: 30,
        height: 28,
        rotation: 0,
        reason: 'Range 4-5 feet from sink (work triangle)',
        priority: 'high'
      });

      // Refrigerator (completes triangle)
      suggestions.push({
        id: 'refrigerator',
        type: 'furniture',
        name: 'Refrigerator',
        x: room.x + padding,
        y: room.y + padding,
        width: 36,
        height: 30,
        rotation: 0,
        reason: 'Refrigerator completes efficient work triangle',
        priority: 'high'
      });
      break;

    case 'bathroom':
      // Toilet
      suggestions.push({
        id: 'toilet',
        type: 'plumbing',
        name: 'Toilet',
        x: room.x + padding,
        y: room.y + room.height - padding - 28,
        width: 20,
        height: 28,
        rotation: 0,
        reason: 'Toilet with 15" clearance on each side',
        priority: 'high'
      });

      // Vanity
      suggestions.push({
        id: 'vanity',
        type: 'plumbing',
        name: 'Vanity',
        x: room.x + room.width - padding - 36,
        y: room.y + padding,
        width: 36,
        height: 21,
        rotation: 0,
        reason: 'Vanity sink with storage',
        priority: 'high'
      });

      // Shower/tub
      if (room.width >= 60) {
        suggestions.push({
          id: 'shower',
          type: 'plumbing',
          name: 'Shower',
          x: room.x + padding,
          y: room.y + padding,
          width: 36,
          height: 36,
          rotation: 0,
          reason: 'Shower in corner for space efficiency',
          priority: 'high'
        });
      }
      break;

    case 'office':
      // Desk
      suggestions.push({
        id: 'desk',
        type: 'furniture',
        name: 'Desk',
        x: room.x + room.width / 2 - 30,
        y: room.y + padding,
        width: 60,
        height: 30,
        rotation: 0,
        reason: 'Desk facing room entrance',
        priority: 'high'
      });

      // Office chair
      suggestions.push({
        id: 'office-chair',
        type: 'furniture',
        name: 'Office Chair',
        x: room.x + room.width / 2 - 12,
        y: room.y + padding + 35,
        width: 24,
        height: 24,
        rotation: 0,
        reason: 'Ergonomic chair with 36" clearance',
        priority: 'high'
      });

      // Bookshelf
      suggestions.push({
        id: 'bookshelf',
        type: 'furniture',
        name: 'Bookshelf',
        x: room.x + padding,
        y: room.y + padding,
        width: 36,
        height: 12,
        rotation: 0,
        reason: 'Storage along wall',
        priority: 'medium'
      });

      // Filing cabinet
      suggestions.push({
        id: 'filing-cabinet',
        type: 'furniture',
        name: 'Filing Cabinet',
        x: room.x + room.width - padding - 18,
        y: room.y + room.height - padding - 24,
        width: 18,
        height: 24,
        rotation: 0,
        reason: 'File storage in corner',
        priority: 'low'
      });
      break;
  }

  return suggestions;
}

/**
 * Analyze traffic flow and suggest improvements
 */
export function analyzeTrafficFlow(elements: CanvasElement[]): {
  issues: string[];
  suggestions: string[];
  score: number;
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check door clearances
  const doors = elements.filter(el => el.type === 'door');
  const furniture = elements.filter(el => el.type === 'furniture');

  doors.forEach(door => {
    furniture.forEach(item => {
      const distance = Math.sqrt(
        Math.pow(door.x - item.x, 2) + Math.pow(door.y - item.y, 2)
      );
      
      if (distance < 36) { // 36" minimum clearance
        issues.push(`${item.label || 'Furniture'} too close to door (${Math.round(distance)}" - need 36")`);
        score -= 10;
      }
    });
  });

  // Check hallway widths
  const walls = elements.filter(el => el.type === 'wall');
  // Simplified check - would need wall relationship analysis
  if (walls.length > 4) {
    suggestions.push('Ensure hallways are minimum 36" wide (42" preferred)');
  }

  // Check room sizes
  const rooms = elements.filter(el => el.type === 'room');
  rooms.forEach(room => {
    const area = (room.width / 12) * (room.height / 12); // Convert to square feet
    
    if (area < 70) {
      issues.push(`${room.label || 'Room'} is small (${Math.round(area)} sqft - min 70 recommended)`);
      score -= 5;
    }
  });

  // Check furniture spacing
  furniture.forEach((item, idx) => {
    furniture.slice(idx + 1).forEach(other => {
      const distance = Math.sqrt(
        Math.pow(item.x - other.x, 2) + Math.pow(item.y - other.y, 2)
      );
      
      if (distance < 24 && distance > 0) { // Too close
        suggestions.push(`Consider spacing between ${item.label || 'furniture'} and ${other.label || 'furniture'} (${Math.round(distance)}")`);
      }
    });
  });

  // Minimum score of 0
  score = Math.max(0, score);

  return { issues, suggestions, score };
}

/**
 * Optimize room layout automatically
 */
export function optimizeRoomLayout(room: Room, elements: CanvasElement[]): CanvasElement[] {
  const optimized: CanvasElement[] = [];
  
  // Get room elements
  const roomElements = elements.filter(el => 
    el.x >= room.x && 
    el.x + el.width <= room.x + room.width &&
    el.y >= room.y &&
    el.y + el.height <= room.y + room.height
  );

  const furniture = roomElements.filter(el => el.type === 'furniture');
  const fixed = roomElements.filter(el => el.type !== 'furniture'); // walls, doors, etc.

  // Keep fixed elements
  optimized.push(...fixed);

  // Rearrange furniture for optimal spacing
  const padding = 24;
  let currentX = room.x + padding;
  let currentY = room.y + padding;
  let rowHeight = 0;

  furniture.forEach(item => {
    // Check if item fits in current row
    if (currentX + item.width + padding > room.x + room.width) {
      // Move to next row
      currentX = room.x + padding;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }

    // Place item
    optimized.push({
      ...item,
      x: currentX,
      y: currentY
    });

    // Update position
    currentX += item.width + padding;
    rowHeight = Math.max(rowHeight, item.height);
  });

  return optimized;
}

/**
 * Calculate optimal outlet placements based on room and furniture
 */
export function suggestOutletPlacement(room: Room, furniture: CanvasElement[]): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  
  // NEC Code: Outlets every 12 feet along walls, no point more than 6 feet from outlet
  const outletSpacing = 144; // 12 feet in inches
  
  // Top wall outlets
  for (let x = room.x + 24; x < room.x + room.width - 24; x += outletSpacing) {
    suggestions.push({
      id: `outlet-top-${x}`,
      type: 'electrical',
      name: 'Duplex Outlet',
      x: x,
      y: room.y + 15, // 15" from floor (standard height)
      width: 15,
      height: 15,
      rotation: 0,
      reason: 'NEC code: Outlet spacing every 12 feet',
      priority: 'high'
    });
  }

  // Bottom wall outlets
  for (let x = room.x + 24; x < room.x + room.width - 24; x += outletSpacing) {
    suggestions.push({
      id: `outlet-bottom-${x}`,
      type: 'electrical',
      name: 'Duplex Outlet',
      x: x,
      y: room.y + room.height - 15,
      width: 15,
      height: 15,
      rotation: 0,
      reason: 'NEC code: Outlet spacing every 12 feet',
      priority: 'high'
    });
  }

  // Add outlets near furniture (desks, beds, sofas)
  furniture.forEach(item => {
    if (item.label?.toLowerCase().includes('desk') || 
        item.label?.toLowerCase().includes('bed') ||
        item.label?.toLowerCase().includes('sofa')) {
      suggestions.push({
        id: `outlet-furniture-${item.id}`,
        type: 'electrical',
        name: 'Duplex Outlet',
        x: item.x + item.width + 12,
        y: item.y + 15,
        width: 15,
        height: 15,
        rotation: 0,
        reason: `Convenience outlet for ${item.label}`,
        priority: 'medium'
      });
    }
  });

  return suggestions;
}

/**
 * Generate complete layout for a room type
 */
export function generateCompleteLayout(
  room: Room,
  roomType: 'bedroom' | 'living' | 'kitchen' | 'bathroom' | 'office'
): {
  furniture: LayoutSuggestion[];
  electrical: LayoutSuggestion[];
  plumbing: LayoutSuggestion[];
  notes: string[];
} {
  const furniture = suggestFurniturePlacement(room, roomType);
  const electrical = suggestOutletPlacement(room, furniture as any);
  const plumbing = furniture.filter(item => item.type === 'plumbing');
  const furnitureOnly = furniture.filter(item => item.type === 'furniture');

  const notes = [
    `Generated layout for ${room.label}`,
    `Room size: ${Math.round(room.width / 12)}' x ${Math.round(room.height / 12)}'`,
    `Area: ${Math.round((room.width / 12) * (room.height / 12))} sqft`,
    `Furniture items: ${furnitureOnly.length}`,
    `Electrical outlets: ${electrical.length}`,
    `Plumbing fixtures: ${plumbing.length}`
  ];

  return {
    furniture: furnitureOnly,
    electrical,
    plumbing,
    notes
  };
}

export default {
  suggestFurniturePlacement,
  analyzeTrafficFlow,
  optimizeRoomLayout,
  suggestOutletPlacement,
  generateCompleteLayout
};
