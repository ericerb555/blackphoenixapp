import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface StructuralCanvasProps {
  elements: any[];
  selectedElementId: string | null;
  onElementSelect: (elementId: string | null) => void;
  activeTool: string;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

export function StructuralCanvas({
  elements,
  selectedElementId,
  onElementSelect,
  activeTool,
  gridSize,
  showGrid,
  snapToGrid,
}: StructuralCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    drawCanvas();
  }, [elements, selectedElementId, zoom, pan, showGrid, gridSize]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw elements
    elements.forEach((element) => {
      drawElement(ctx, element, element.id === selectedElementId);
    });

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;

    const scaledGridSize = gridSize * zoom;
    const startX = Math.floor(-pan.x / scaledGridSize) * scaledGridSize + pan.x;
    const startY = Math.floor(-pan.y / scaledGridSize) * scaledGridSize + pan.y;

    for (let x = startX; x < width; x += scaledGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = startY; y < height; y += scaledGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawElement = (ctx: CanvasRenderingContext2D, element: any, isSelected: boolean) => {
    const { x = 0, y = 0, width = 100, height = 100, type = 'wall', color = '#ea580c' } = element;

    // Draw element based on type
    ctx.fillStyle = isSelected ? '#ea580c' : color;
    ctx.strokeStyle = isSelected ? '#ffffff' : '#4a4a4a';
    ctx.lineWidth = isSelected ? 3 : 1;

    switch (type) {
      case 'wall':
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        break;
      case 'beam':
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        // Add beam pattern
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(x + i, y);
          ctx.lineTo(x + i, y + height);
          ctx.stroke();
        }
        break;
      case 'column':
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'slab':
        ctx.fillStyle = isSelected ? 'rgba(234, 88, 12, 0.3)' : 'rgba(234, 88, 12, 0.2)';
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
        break;
      default:
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
    }

    // Draw element label if selected
    if (isSelected && element.name) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(element.name, x, y - 5);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Find clicked element
    const clickedElement = elements.find((element) => {
      const ex = element.x || 0;
      const ey = element.y || 0;
      const ew = element.width || 100;
      const eh = element.height || 100;
      return x >= ex && x <= ex + ew && y >= ey && y <= ey + eh;
    });

    onElementSelect(clickedElement ? clickedElement.id : null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.1));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div ref={containerRef} className="flex-1 relative bg-[#0A0A0A]">
      <canvas
        ref={canvasRef}
        width={containerRef.current?.clientWidth || 800}
        height={containerRef.current?.clientHeight || 600}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-crosshair"
      />

      {/* Canvas Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white">
        {Math.round(zoom * 100)}%
      </div>

      {/* Tool Indicator */}
      {activeTool && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white flex items-center gap-2">
          <Move className="w-4 h-4 text-[#ea580c]" />
          <span>Tool: {activeTool}</span>
        </div>
      )}
    </div>
  );
}
