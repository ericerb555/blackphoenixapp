/**
 * Advanced Measurement System for CaptureCAD Studio
 * Provides automatic dimensioning, angle/area/volume tools, and annotations
 */

export interface Measurement {
  id: string;
  type: 'linear' | 'angle' | 'area' | 'volume' | 'radius';
  points: { x: number; y: number }[];
  value: number;
  unit: string;
  label?: string;
  style?: MeasurementStyle;
  layer?: string;
}

export interface Annotation {
  id: string;
  type: 'note' | 'label' | 'callout' | 'dimension';
  position: { x: number; y: number };
  text: string;
  style?: AnnotationStyle;
  layer: string;
  attachedTo?: string; // Element ID
}

export interface MeasurementStyle {
  color: string;
  lineWidth: number;
  fontSize: number;
  arrowType: 'arrow' | 'dot' | 'slash' | 'none';
  textPosition: 'above' | 'below' | 'inline';
  precision: number;
}

export interface AnnotationStyle {
  color: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export const defaultMeasurementStyle: MeasurementStyle = {
  color: '#6cf0ff',
  lineWidth: 1.5,
  fontSize: 11,
  arrowType: 'arrow',
  textPosition: 'above',
  precision: 2,
};

export const defaultAnnotationStyle: AnnotationStyle = {
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 'normal',
  backgroundColor: 'rgba(15, 19, 27, 0.85)',
  borderColor: '#6cf0ff',
  borderWidth: 1,
};

/**
 * Calculate linear distance between two points
 */
export function calculateLinearDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate angle between three points (p2 is vertex)
 */
export function calculateAngle(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  let angle = (angle2 - angle1) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Calculate area of polygon
 */
export function calculateArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Convert pixels to real-world units based on scale
 */
export function pixelsToUnits(pixels: number, scale: string, units: 'ft' | 'm'): number {
  // Extract scale ratio (e.g., "1:100" => 100)
  const scaleRatio = parseInt(scale.split(':')[1]) || 100;
  
  // Assume 1 pixel = 1mm at 1:1 scale
  const mmValue = pixels * scaleRatio;
  
  if (units === 'm') {
    return mmValue / 1000; // Convert to meters
  } else {
    return mmValue / 304.8; // Convert to feet
  }
}

/**
 * Format measurement value with units
 */
export function formatMeasurement(value: number, units: 'ft' | 'm', precision: number = 2): string {
  if (units === 'ft') {
    const feet = Math.floor(value);
    const inches = Math.round((value - feet) * 12);
    return inches > 0 ? `${feet}'-${inches}"` : `${feet}'`;
  } else {
    return `${value.toFixed(precision)}m`;
  }
}

/**
 * Create automatic dimension for a wall element
 */
export function createAutoDimension(
  wall: { x1: number; y1: number; x2: number; y2: number },
  scale: string,
  units: 'ft' | 'm',
  offset: number = 30
): Measurement {
  const distance = calculateLinearDistance(
    { x: wall.x1, y: wall.y1 },
    { x: wall.x2, y: wall.y2 }
  );
  
  const realDistance = pixelsToUnits(distance, scale, units);
  
  // Calculate perpendicular offset for dimension line
  const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
  const perpAngle = angle + Math.PI / 2;
  
  const offsetX = Math.cos(perpAngle) * offset;
  const offsetY = Math.sin(perpAngle) * offset;
  
  return {
    id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'linear',
    points: [
      { x: wall.x1 + offsetX, y: wall.y1 + offsetY },
      { x: wall.x2 + offsetX, y: wall.y2 + offsetY },
    ],
    value: realDistance,
    unit: units,
    label: formatMeasurement(realDistance, units),
    style: defaultMeasurementStyle,
  };
}

/**
 * Render measurement on SVG
 */
export function renderMeasurement(
  measurement: Measurement,
  ctx: CanvasRenderingContext2D | SVGSVGElement,
  zoom: number = 1
): void {
  const style = measurement.style || defaultMeasurementStyle;
  const [p1, p2] = measurement.points;
  
  if (ctx instanceof CanvasRenderingContext2D) {
    // Canvas rendering
    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;
    ctx.font = `${style.fontSize}px monospace`;
    ctx.fillStyle = style.color;
    
    // Draw dimension line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    // Draw arrows
    if (style.arrowType === 'arrow') {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const arrowSize = 8 / zoom;
      
      // Arrow at p1
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(
        p1.x + arrowSize * Math.cos(angle + Math.PI + Math.PI / 6),
        p1.y + arrowSize * Math.sin(angle + Math.PI + Math.PI / 6)
      );
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(
        p1.x + arrowSize * Math.cos(angle + Math.PI - Math.PI / 6),
        p1.y + arrowSize * Math.sin(angle + Math.PI - Math.PI / 6)
      );
      ctx.stroke();
      
      // Arrow at p2
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x + arrowSize * Math.cos(angle + Math.PI / 6),
        p2.y + arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(
        p2.x + arrowSize * Math.cos(angle - Math.PI / 6),
        p2.y + arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.stroke();
    }
    
    // Draw label
    if (measurement.label) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const textMetrics = ctx.measureText(measurement.label);
      
      // Background
      ctx.fillStyle = 'rgba(7, 8, 11, 0.9)';
      ctx.fillRect(
        midX - textMetrics.width / 2 - 4,
        midY - style.fontSize / 2 - 4,
        textMetrics.width + 8,
        style.fontSize + 8
      );
      
      // Text
      ctx.fillStyle = style.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(measurement.label, midX, midY);
    }
    
    ctx.restore();
  }
}

/**
 * Render annotation on canvas
 */
export function renderAnnotation(
  annotation: Annotation,
  ctx: CanvasRenderingContext2D,
  zoom: number = 1
): void {
  const style = annotation.style || defaultAnnotationStyle;
  
  ctx.save();
  ctx.font = `${style.fontWeight} ${style.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  
  const textMetrics = ctx.measureText(annotation.text);
  const padding = 8;
  const width = textMetrics.width + padding * 2;
  const height = style.fontSize + padding * 2;
  
  // Background
  if (style.backgroundColor) {
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(
      annotation.position.x - padding,
      annotation.position.y - padding,
      width,
      height
    );
  }
  
  // Border
  if (style.borderColor && style.borderWidth) {
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.borderWidth;
    ctx.strokeRect(
      annotation.position.x - padding,
      annotation.position.y - padding,
      width,
      height
    );
  }
  
  // Text
  ctx.fillStyle = style.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);
  
  ctx.restore();
}

/**
 * Auto-generate dimensions for all walls in a floor plan
 */
export function autoGenerateDimensions(
  elements: any[],
  scale: string,
  units: 'ft' | 'm'
): Measurement[] {
  const measurements: Measurement[] = [];
  
  elements.forEach((element) => {
    if (element.type === 'wall') {
      const dimension = createAutoDimension(element, scale, units);
      measurements.push(dimension);
    }
  });
  
  return measurements;
}

/**
 * Calculate room area from wall elements
 */
export function calculateRoomArea(
  walls: any[],
  scale: string,
  units: 'ft' | 'm'
): { area: number; perimeter: number; corners: { x: number; y: number }[] } {
  // Extract corner points from walls
  const corners: { x: number; y: number }[] = [];
  
  // This is a simplified version - in production, you'd need proper wall connectivity analysis
  walls.forEach((wall) => {
    corners.push({ x: wall.x1, y: wall.y1 });
    corners.push({ x: wall.x2, y: wall.y2 });
  });
  
  // Remove duplicates
  const uniqueCorners = corners.filter((corner, index, self) => 
    index === self.findIndex((c) => c.x === corner.x && c.y === corner.y)
  );
  
  const pixelArea = calculateArea(uniqueCorners);
  const realArea = pixelsToUnits(Math.sqrt(pixelArea), scale, units) ** 2;
  
  let perimeter = 0;
  for (let i = 0; i < uniqueCorners.length; i++) {
    const j = (i + 1) % uniqueCorners.length;
    const distance = calculateLinearDistance(uniqueCorners[i], uniqueCorners[j]);
    perimeter += pixelsToUnits(distance, scale, units);
  }
  
  return {
    area: realArea,
    perimeter,
    corners: uniqueCorners,
  };
}
