// Lasso Selection - Visual freeform selection tool
import { useEffect, useState } from 'react';

interface LassoSelectionProps {
  isActive: boolean;
  path: { x: number; y: number }[];
  onComplete: (selectedIds: string[]) => void;
  elements: any[];
}

export default function LassoSelection({ isActive, path, onComplete, elements }: LassoSelectionProps) {
  const [previewSelection, setPreviewSelection] = useState<string[]>([]);

  useEffect(() => {
    if (path.length < 3) {
      setPreviewSelection([]);
      return;
    }

    // Check which elements are inside the lasso path
    const selected = elements.filter((el) => {
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      return isPointInPolygon({ x: centerX, y: centerY }, path);
    }).map(el => el.id);

    setPreviewSelection(selected);
  }, [path, elements]);

  if (!isActive || path.length === 0) return null;

  // Create SVG path string
  const pathString = path.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ') + (path.length > 2 ? ' Z' : '');

  return (
    <svg className="absolute inset-0 pointer-events-none z-30" style={{ width: '100%', height: '100%' }}>
      {/* Lasso path */}
      <path
        d={pathString}
        fill="rgba(147, 51, 234, 0.1)"
        stroke="#9333ea"
        strokeWidth="2"
        strokeDasharray="5,5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Selection points */}
      {path.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="3"
          fill="#9333ea"
          opacity={index === path.length - 1 ? 1 : 0.6}
        />
      ))}

      {/* Preview selected elements */}
      {elements.filter(el => previewSelection.includes(el.id)).map((el) => (
        <rect
          key={el.id}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          fill="none"
          stroke="#9333ea"
          strokeWidth="2"
          opacity="0.6"
          transform={`rotate(${el.rotation || 0}, ${el.x + el.width / 2}, ${el.y + el.height / 2})`}
        />
      ))}

      {/* Selection count badge */}
      {previewSelection.length > 0 && path.length > 5 && (
        <g>
          <rect
            x={path[path.length - 1].x + 10}
            y={path[path.length - 1].y - 25}
            width="60"
            height="24"
            fill="#9333ea"
            rx="12"
            opacity="0.9"
          />
          <text
            x={path[path.length - 1].x + 40}
            y={path[path.length - 1].y - 9}
            textAnchor="middle"
            fill="white"
            fontSize="12"
            fontWeight="600"
          >
            {previewSelection.length} items
          </text>
        </g>
      )}
    </svg>
  );
}

// Helper function - check if point is inside polygon
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
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
