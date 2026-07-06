// Canvas Coordinates Display - Real-time cursor position and measurements
import { useState, useEffect } from 'react';
import { Crosshair, Ruler, Move, RotateCw } from 'lucide-react';

interface CanvasCoordinatesProps {
  mouseX: number;
  mouseY: number;
  selectedElement?: any;
  gridSize: number;
  snapToGrid: boolean;
  zoom: number;
  units: 'inches' | 'feet' | 'meters';
}

export default function CanvasCoordinates({
  mouseX,
  mouseY,
  selectedElement,
  gridSize,
  snapToGrid,
  zoom,
  units
}: CanvasCoordinatesProps) {
  const [displayX, setDisplayX] = useState(0);
  const [displayY, setDisplayY] = useState(0);

  useEffect(() => {
    if (snapToGrid) {
      setDisplayX(Math.round(mouseX / gridSize) * gridSize);
      setDisplayY(Math.round(mouseY / gridSize) * gridSize);
    } else {
      setDisplayX(Math.round(mouseX));
      setDisplayY(Math.round(mouseY));
    }
  }, [mouseX, mouseY, gridSize, snapToGrid]);

  const formatValue = (pixels: number): string => {
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
  };

  return (
    <div className="fixed bottom-4 left-4 flex gap-3 z-30">
      {/* Cursor Position */}
      <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center gap-3">
          <Crosshair className="w-4 h-4 text-[#ea580c]" />
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-400">X:</span>
              <span className="text-white ml-2 font-mono font-semibold">
                {formatValue(displayX)}
              </span>
            </div>
            <div className="w-px h-4 bg-[#2A2A2A]" />
            <div>
              <span className="text-gray-400">Y:</span>
              <span className="text-white ml-2 font-mono font-semibold">
                {formatValue(displayY)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Element Info */}
      {selectedElement && (
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-2 border-purple-500/50 rounded-lg px-4 py-2 shadow-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-gray-400">W:</span>
                <span className="text-white ml-2 font-mono font-semibold">
                  {formatValue(selectedElement.width)}
                </span>
              </div>
            </div>
            <div className="w-px h-4 bg-purple-500/30" />
            <div>
              <span className="text-gray-400">H:</span>
              <span className="text-white ml-2 font-mono font-semibold">
                {formatValue(selectedElement.height)}
              </span>
            </div>
            <div className="w-px h-4 bg-purple-500/30" />
            <div className="flex items-center gap-2">
              <RotateCw className="w-3 h-3 text-purple-400" />
              <span className="text-white font-mono font-semibold">
                {selectedElement.rotation || 0}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Level */}
      <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <Move className="w-4 h-4 text-[#ea580c]" />
          <span className="text-white font-mono font-semibold">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Grid Snap Indicator */}
      {snapToGrid && (
        <div className="bg-green-900/30 border-2 border-green-500/50 rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-300 font-semibold">
              Grid: {gridSize}"
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
