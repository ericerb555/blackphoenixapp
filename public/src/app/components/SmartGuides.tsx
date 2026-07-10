// Smart Guides - Visual Alignment Helpers
import { useEffect, useState } from 'react';

interface SmartGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  label: string;
  matchingElements: string[];
}

interface SmartGuidesProps {
  elements: any[];
  activeElement: any | null;
  mouseX: number;
  mouseY: number;
  snapThreshold?: number;
  visible: boolean;
}

export default function SmartGuides({
  elements,
  activeElement,
  mouseX,
  mouseY,
  snapThreshold = 5,
  visible
}: SmartGuidesProps) {
  const [guides, setGuides] = useState<SmartGuide[]>([]);

  useEffect(() => {
    if (!visible || !activeElement) {
      setGuides([]);
      return;
    }

    const newGuides: SmartGuide[] = [];

    // Find alignment opportunities with other elements
    elements.forEach((el) => {
      if (el.id === activeElement.id) return;

      // Check for horizontal alignment (same Y)
      const yDiff = Math.abs((activeElement.y + activeElement.height / 2) - (el.y + el.height / 2));
      if (yDiff < snapThreshold) {
        newGuides.push({
          type: 'horizontal',
          position: el.y + el.height / 2,
          label: 'Center Align',
          matchingElements: [el.id]
        });
      }

      // Check top edge alignment
      const topDiff = Math.abs(activeElement.y - el.y);
      if (topDiff < snapThreshold) {
        newGuides.push({
          type: 'horizontal',
          position: el.y,
          label: 'Top Align',
          matchingElements: [el.id]
        });
      }

      // Check bottom edge alignment
      const bottomDiff = Math.abs((activeElement.y + activeElement.height) - (el.y + el.height));
      if (bottomDiff < snapThreshold) {
        newGuides.push({
          type: 'horizontal',
          position: el.y + el.height,
          label: 'Bottom Align',
          matchingElements: [el.id]
        });
      }

      // Check for vertical alignment (same X)
      const xDiff = Math.abs((activeElement.x + activeElement.width / 2) - (el.x + el.width / 2));
      if (xDiff < snapThreshold) {
        newGuides.push({
          type: 'vertical',
          position: el.x + el.width / 2,
          label: 'Center Align',
          matchingElements: [el.id]
        });
      }

      // Check left edge alignment
      const leftDiff = Math.abs(activeElement.x - el.x);
      if (leftDiff < snapThreshold) {
        newGuides.push({
          type: 'vertical',
          position: el.x,
          label: 'Left Align',
          matchingElements: [el.id]
        });
      }

      // Check right edge alignment
      const rightDiff = Math.abs((activeElement.x + activeElement.width) - (el.x + el.width));
      if (rightDiff < snapThreshold) {
        newGuides.push({
          type: 'vertical',
          position: el.x + el.width,
          label: 'Right Align',
          matchingElements: [el.id]
        });
      }
    });

    // Remove duplicates and keep only closest guides
    const uniqueGuides = newGuides.filter((guide, index, self) =>
      index === self.findIndex((g) => 
        g.type === guide.type && Math.abs(g.position - guide.position) < 1
      )
    );

    setGuides(uniqueGuides.slice(0, 4)); // Limit to 4 guides
  }, [elements, activeElement, mouseX, mouseY, visible]);

  if (!visible || guides.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <pattern
          id="guide-dash"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
        >
          <line
            x1="0"
            y1="0"
            x2="8"
            y2="0"
            stroke="#ea580c"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        </pattern>
      </defs>

      {guides.map((guide, index) => (
        <g key={`${guide.type}-${guide.position}-${index}`}>
          {guide.type === 'horizontal' ? (
            <>
              <line
                x1="0"
                y1={guide.position}
                x2="100%"
                y2={guide.position}
                stroke="#ea580c"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.8"
              />
              <circle
                cx={activeElement.x + activeElement.width / 2}
                cy={guide.position}
                r="3"
                fill="#ea580c"
                opacity="0.9"
              />
              <text
                x={activeElement.x + activeElement.width / 2 + 10}
                y={guide.position - 5}
                fill="#ea580c"
                fontSize="10"
                fontWeight="600"
              >
                {guide.label}
              </text>
            </>
          ) : (
            <>
              <line
                x1={guide.position}
                y1="0"
                x2={guide.position}
                y2="100%"
                stroke="#ea580c"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.8"
              />
              <circle
                cx={guide.position}
                cy={activeElement.y + activeElement.height / 2}
                r="3"
                fill="#ea580c"
                opacity="0.9"
              />
              <text
                x={guide.position + 5}
                y={activeElement.y + activeElement.height / 2 - 10}
                fill="#ea580c"
                fontSize="10"
                fontWeight="600"
              >
                {guide.label}
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}
