// Advanced Canvas Tools - Utility Functions
import type { AdvancedTool, AdvancedAction } from '../components/AdvancedCanvasTools';

interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  [key: string]: any;
}

// ============================================================================
// SELECTION TOOLS
// ============================================================================

export function lassoSelect(
  elements: CanvasElement[],
  lassoPath: { x: number; y: number }[]
): string[] {
  if (lassoPath.length < 3) return [];

  return elements
    .filter((el) => isPointInPolygon({ x: el.x, y: el.y }, lassoPath))
    .map((el) => el.id);
}

export function selectByType(
  elements: CanvasElement[],
  elementType: string
): string[] {
  return elements
    .filter((el) => el.type === elementType)
    .map((el) => el.id);
}

export function selectSimilar(
  elements: CanvasElement[],
  referenceElement: CanvasElement
): string[] {
  return elements
    .filter(
      (el) =>
        el.type === referenceElement.type &&
        Math.abs(el.width - referenceElement.width) < 10 &&
        Math.abs(el.height - referenceElement.height) < 10
    )
    .map((el) => el.id);
}

// ============================================================================
// PRECISION TOOLS
// ============================================================================

export function offsetElement(
  element: CanvasElement,
  distance: number,
  direction: 'horizontal' | 'vertical' | 'both' = 'both'
): CanvasElement {
  const newElement = { ...element, id: `${element.id}-offset-${Date.now()}` };

  if (direction === 'horizontal' || direction === 'both') {
    newElement.x += distance;
  }
  if (direction === 'vertical' || direction === 'both') {
    newElement.y += distance;
  }

  return newElement;
}

export function arrayLinear(
  element: CanvasElement,
  count: number,
  spacing: number,
  direction: 'horizontal' | 'vertical'
): CanvasElement[] {
  const copies: CanvasElement[] = [];

  for (let i = 1; i <= count; i++) {
    const copy = { ...element, id: `${element.id}-array-${i}-${Date.now()}` };
    
    if (direction === 'horizontal') {
      copy.x = element.x + i * (element.width + spacing);
    } else {
      copy.y = element.y + i * (element.height + spacing);
    }

    copies.push(copy);
  }

  return copies;
}

export function arrayCircular(
  element: CanvasElement,
  count: number,
  radius: number,
  centerX: number,
  centerY: number
): CanvasElement[] {
  const copies: CanvasElement[] = [];
  const angleStep = (2 * Math.PI) / count;

  for (let i = 1; i < count; i++) {
    const angle = i * angleStep;
    const copy = { ...element, id: `${element.id}-circular-${i}-${Date.now()}` };
    
    copy.x = centerX + radius * Math.cos(angle) - element.width / 2;
    copy.y = centerY + radius * Math.sin(angle) - element.height / 2;
    copy.rotation = (element.rotation || 0) + (angle * 180) / Math.PI;

    copies.push(copy);
  }

  return copies;
}

export function mirrorElement(
  element: CanvasElement,
  axis: 'horizontal' | 'vertical',
  axisPosition: number
): CanvasElement {
  const mirrored = { ...element, id: `${element.id}-mirror-${Date.now()}` };

  if (axis === 'horizontal') {
    const distance = element.x - axisPosition;
    mirrored.x = axisPosition - distance - element.width;
  } else {
    const distance = element.y - axisPosition;
    mirrored.y = axisPosition - distance - element.height;
  }

  return mirrored;
}

export function filletCorner(
  element: CanvasElement,
  radius: number
): CanvasElement {
  // Add fillet data to element (visual rendering handled separately)
  return {
    ...element,
    cornerRadius: radius,
    cornerType: 'fillet'
  };
}

export function chamferCorner(
  element: CanvasElement,
  distance: number
): CanvasElement {
  return {
    ...element,
    cornerDistance: distance,
    cornerType: 'chamfer'
  };
}

// ============================================================================
// MEASUREMENT TOOLS
// ============================================================================

export function calculateArea(element: CanvasElement): number {
  // Simple rectangle area (in square inches)
  return element.width * element.height;
}

export function calculatePerimeter(element: CanvasElement): number {
  // Simple rectangle perimeter
  return 2 * (element.width + element.height);
}

export function calculateAngle(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): number {
  const angle1 = Math.atan2(point1.y - point2.y, point1.x - point2.x);
  const angle2 = Math.atan2(point3.y - point2.y, point3.x - point2.x);
  let angle = ((angle2 - angle1) * 180) / Math.PI;
  
  if (angle < 0) angle += 360;
  if (angle > 180) angle = 360 - angle;
  
  return Math.round(angle * 100) / 100;
}

export function calculateDistance(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// ALIGNMENT ACTIONS
// ============================================================================

export function alignElements(
  elements: CanvasElement[],
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
): CanvasElement[] {
  if (elements.length < 2) return elements;

  const bounds = getElementsBounds(elements);

  return elements.map((el) => {
    const updated = { ...el };

    switch (alignment) {
      case 'left':
        updated.x = bounds.minX;
        break;
      case 'center':
        updated.x = bounds.centerX - el.width / 2;
        break;
      case 'right':
        updated.x = bounds.maxX - el.width;
        break;
      case 'top':
        updated.y = bounds.minY;
        break;
      case 'middle':
        updated.y = bounds.centerY - el.height / 2;
        break;
      case 'bottom':
        updated.y = bounds.maxY - el.height;
        break;
    }

    return updated;
  });
}

export function distributeElements(
  elements: CanvasElement[],
  direction: 'horizontal' | 'vertical'
): CanvasElement[] {
  if (elements.length < 3) return elements;

  const sorted = [...elements].sort((a, b) => 
    direction === 'horizontal' ? a.x - b.x : a.y - b.y
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const totalSpace = direction === 'horizontal'
    ? (last.x + last.width) - first.x
    : (last.y + last.height) - first.y;

  const totalElementSize = sorted.reduce(
    (sum, el) => sum + (direction === 'horizontal' ? el.width : el.height),
    0
  );

  const spacing = (totalSpace - totalElementSize) / (sorted.length - 1);

  let currentPos = direction === 'horizontal' ? first.x : first.y;

  return sorted.map((el, index) => {
    if (index === 0 || index === sorted.length - 1) return el;

    const updated = { ...el };
    if (direction === 'horizontal') {
      updated.x = currentPos;
      currentPos += el.width + spacing;
    } else {
      updated.y = currentPos;
      currentPos += el.height + spacing;
    }

    return updated;
  });
}

// ============================================================================
// SMART TOOLS
// ============================================================================

export function cleanupWalls(elements: CanvasElement[]): CanvasElement[] {
  const walls = elements.filter((el) => el.type === 'wall');
  const others = elements.filter((el) => el.type !== 'wall');

  // Auto-connect walls that are close to each other
  const cleaned = walls.map((wall) => {
    const connectedWalls = walls.filter((w) => {
      if (w.id === wall.id) return false;
      
      // Check if walls are close enough to connect
      const distance = calculateDistance(
        { x: wall.x + wall.width, y: wall.y + wall.height / 2 },
        { x: w.x, y: w.y + w.height / 2 }
      );
      
      return distance < 10;
    });

    return {
      ...wall,
      connectedWalls: connectedWalls.map((w) => w.id)
    };
  });

  return [...cleaned, ...others];
}

export function smartJoin(elements: CanvasElement[]): CanvasElement[] {
  // Auto-connect adjacent elements
  return elements.map((el) => {
    const adjacent = elements.filter((other) => {
      if (other.id === el.id) return false;
      
      const distance = calculateDistance(
        { x: el.x + el.width / 2, y: el.y + el.height / 2 },
        { x: other.x + other.width / 2, y: other.y + other.height / 2 }
      );
      
      return distance < el.width + 5;
    });

    return {
      ...el,
      connectedTo: adjacent.map((a) => a.id)
    };
  });
}

// ============================================================================
// VIEW ACTIONS
// ============================================================================

export function zoomToFit(
  elements: CanvasElement[],
  viewportWidth: number,
  viewportHeight: number
): { zoom: number; panX: number; panY: number } {
  if (elements.length === 0) {
    return { zoom: 1, panX: 0, panY: 0 };
  }

  const bounds = getElementsBounds(elements);
  const padding = 50;

  const scaleX = (viewportWidth - padding * 2) / (bounds.maxX - bounds.minX);
  const scaleY = (viewportHeight - padding * 2) / (bounds.maxY - bounds.minY);
  const zoom = Math.min(scaleX, scaleY, 2); // Cap at 200%

  const panX = -(bounds.minX * zoom - padding);
  const panY = -(bounds.minY * zoom - padding);

  return { zoom, panX, panY };
}

export function zoomToSelection(
  selectedElements: CanvasElement[],
  viewportWidth: number,
  viewportHeight: number
): { zoom: number; panX: number; panY: number } {
  return zoomToFit(selectedElements, viewportWidth, viewportHeight);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getElementsBounds(elements: CanvasElement[]) {
  const minX = Math.min(...elements.map((el) => el.x));
  const minY = Math.min(...elements.map((el) => el.y));
  const maxX = Math.max(...elements.map((el) => el.x + el.width));
  const maxY = Math.max(...elements.map((el) => el.y + el.height));

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY
  };
}

function isPointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[]
): boolean {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    
    if (intersect) inside = !inside;
  }

  return inside;
}

export function formatMeasurement(
  pixels: number,
  units: 'inches' | 'feet' | 'meters'
): string {
  const inches = pixels;
  
  switch (units) {
    case 'feet':
      const feet = Math.floor(inches / 12);
      const remainingInches = Math.round(inches % 12);
      return remainingInches > 0 ? `${feet}'-${remainingInches}"` : `${feet}'`;
    case 'meters':
      return `${(inches * 0.0254).toFixed(2)}m`;
    default:
      return `${Math.round(inches)}"`;
  }
}
