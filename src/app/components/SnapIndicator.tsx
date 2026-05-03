import React from 'react';

interface SnapIndicatorProps {
  x?: number;
  y?: number;
  type: 'vertical' | 'horizontal' | 'point' | 'grid';
  visible: boolean;
  label?: string;
}

export function SnapIndicator({ x, y, type, visible, label }: SnapIndicatorProps) {
  if (!visible) return null;

  return (
    <>
      {/* Vertical Line */}
      {type === 'vertical' && x !== undefined && (
        <div
          className="absolute top-0 bottom-0 w-px bg-[#ea580c] pointer-events-none z-50"
          style={{ left: `${x}px` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-1 bg-[#ea580c] text-white text-xs rounded shadow-lg whitespace-nowrap">
            {label || `${x}px`}
          </div>
        </div>
      )}

      {/* Horizontal Line */}
      {type === 'horizontal' && y !== undefined && (
        <div
          className="absolute left-0 right-0 h-px bg-[#ea580c] pointer-events-none z-50"
          style={{ top: `${y}px` }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 bg-[#ea580c] text-white text-xs rounded shadow-lg whitespace-nowrap">
            {label || `${y}px`}
          </div>
        </div>
      )}

      {/* Snap Point */}
      {type === 'point' && x !== undefined && y !== undefined && (
        <div
          className="absolute pointer-events-none z-50"
          style={{ left: `${x}px`, top: `${y}px` }}
        >
          {/* Crosshair */}
          <div className="relative">
            <div className="absolute w-8 h-px bg-[#ea580c] top-0 -left-4" />
            <div className="absolute h-8 w-px bg-[#ea580c] left-0 -top-4" />
            <div className="absolute w-2 h-2 bg-[#ea580c] rounded-full -left-1 -top-1 ring-2 ring-white" />
          </div>
          {/* Label */}
          {label && (
            <div className="absolute top-4 left-4 px-2 py-1 bg-[#ea580c] text-white text-xs rounded shadow-lg whitespace-nowrap">
              {label}
            </div>
          )}
        </div>
      )}

      {/* Grid Snap Indicator */}
      {type === 'grid' && x !== undefined && y !== undefined && (
        <div
          className="absolute pointer-events-none z-50"
          style={{ left: `${x}px`, top: `${y}px` }}
        >
          <div className="w-3 h-3 border-2 border-[#ea580c] bg-[#ea580c]/20 rounded-sm -translate-x-1/2 -translate-y-1/2" />
          {label && (
            <div className="absolute top-4 left-4 px-2 py-1 bg-[#ea580c] text-white text-xs rounded shadow-lg whitespace-nowrap">
              {label}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Hook for snap calculations
export function useSnap(snapEnabled: boolean, gridSize: number = 10) {
  const snapToGrid = (value: number): number => {
    if (!snapEnabled) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const snapToPoint = (
    value: number,
    snapPoints: number[],
    threshold: number = 5
  ): { snapped: number; didSnap: boolean } => {
    if (!snapEnabled) return { snapped: value, didSnap: false };

    for (const point of snapPoints) {
      if (Math.abs(value - point) <= threshold) {
        return { snapped: point, didSnap: true };
      }
    }

    return { snapped: value, didSnap: false };
  };

  const snapToGuides = (
    x: number,
    y: number,
    verticalGuides: number[],
    horizontalGuides: number[],
    threshold: number = 5
  ): { x: number; y: number; snappedX: boolean; snappedY: boolean } => {
    const xSnap = snapToPoint(x, verticalGuides, threshold);
    const ySnap = snapToPoint(y, horizontalGuides, threshold);

    return {
      x: xSnap.snapped,
      y: ySnap.snapped,
      snappedX: xSnap.didSnap,
      snappedY: ySnap.didSnap,
    };
  };

  return {
    snapToGrid,
    snapToPoint,
    snapToGuides,
  };
}
