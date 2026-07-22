// Canvas Minimap - Bird's Eye View Navigator
import { useEffect, useRef, useState } from 'react';
import { Map, Maximize2, Minimize2 } from 'lucide-react';

interface CanvasMinimapProps {
  elements: any[];
  canvasWidth: number;
  canvasHeight: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  zoom: number;
  onViewportChange: (x: number, y: number) => void;
}

export default function CanvasMinimap({
  elements,
  canvasWidth,
  canvasHeight,
  viewportX,
  viewportY,
  viewportWidth,
  viewportHeight,
  zoom,
  onViewportChange
}: CanvasMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const minimapSize = isExpanded ? 300 : 200;
  const scale = minimapSize / Math.max(canvasWidth, canvasHeight);

  useEffect(() => {
    drawMinimap();
  }, [elements, viewportX, viewportY, viewportWidth, viewportHeight, zoom, isExpanded]);

  const drawMinimap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, minimapSize, minimapSize);

    // Draw grid
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 0.5;
    const gridSize = 100 * scale;
    for (let x = 0; x <= minimapSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, minimapSize);
      ctx.stroke();
    }
    for (let y = 0; y <= minimapSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(minimapSize, y);
      ctx.stroke();
    }

    // Draw elements
    elements.forEach((element) => {
      const x = element.x * scale;
      const y = element.y * scale;
      const width = element.width * scale;
      const height = element.height * scale;

      // Color by type
      let color = '#ea580c';
      if (element.type === 'wall') color = '#3b82f6';
      else if (element.type === 'door') color = '#10b981';
      else if (element.type === 'window') color = '#06b6d4';
      else if (element.type === 'furniture') color = '#f59e0b';
      else if (element.type === 'electrical') color = '#FFD700';
      else if (element.type === 'plumbing') color = '#00BFFF';

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;

      // Apply rotation
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((element.rotation || 0) * Math.PI / 180);
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.restore();
    });

    ctx.globalAlpha = 1;

    // Draw viewport rectangle
    const vpX = (viewportX / zoom) * scale;
    const vpY = (viewportY / zoom) * scale;
    const vpWidth = (viewportWidth / zoom) * scale;
    const vpHeight = (viewportHeight / zoom) * scale;

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(vpX, vpY, vpWidth, vpHeight);
    ctx.setLineDash([]);

    // Fill viewport with transparent orange
    ctx.fillStyle = 'rgba(234, 88, 12, 0.1)';
    ctx.fillRect(vpX, vpY, vpWidth, vpHeight);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && e.type !== 'mousedown') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert minimap coordinates to canvas coordinates
    const canvasX = (x / scale) * zoom - (viewportWidth / 2);
    const canvasY = (y / scale) * zoom - (viewportHeight / 2);

    onViewportChange(canvasX, canvasY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden z-30">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-3 py-2 border-b border-[#2A2A2A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-[#ea580c]" />
          <span className="text-xs font-semibold text-white">Navigator</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-[#2A2A2A] rounded transition-colors text-gray-400 hover:text-white"
          title={isExpanded ? 'Minimize' : 'Maximize'}
        >
          {isExpanded ? (
            <Minimize2 className="w-3 h-3" />
          ) : (
            <Maximize2 className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Minimap Canvas */}
      <div className="p-2">
        <canvas
          ref={canvasRef}
          width={minimapSize}
          height={minimapSize}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-move border border-[#2A2A2A] rounded-lg"
          style={{ 
            width: minimapSize,
            height: minimapSize,
            imageRendering: 'pixelated'
          }}
        />
      </div>

      {/* Stats */}
      <div className="bg-[#0A0A0A] px-3 py-2 border-t border-[#2A2A2A]">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Zoom:</span>
            <span className="text-white ml-1 font-semibold">{Math.round(zoom * 100)}%</span>
          </div>
          <div>
            <span className="text-gray-400">Elements:</span>
            <span className="text-white ml-1 font-semibold">{elements.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
