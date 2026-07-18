// 3D Floor Plan Viewer Component
import { useRef, useEffect, useState } from 'react';
import { Box, Maximize2, Minimize2, RotateCcw, Eye } from 'lucide-react';

interface CanvasElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  label?: string;
}

interface FloorPlan3DViewerProps {
  elements: CanvasElement[];
  width?: number;
  height?: number;
  onClose?: () => void;
}

export default function FloorPlan3DViewer({
  elements,
  width = 800,
  height = 600,
  onClose
}: FloorPlan3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'perspective' | 'isometric'>('perspective');

  // Wall height in 3D
  const WALL_HEIGHT = 96; // 8 feet in inches

  // Convert 2D coordinates to 3D with isometric projection
  const project3D = (x: number, y: number, z: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Apply rotation
    const cosY = Math.cos((rotation.y * Math.PI) / 180);
    const sinY = Math.sin((rotation.y * Math.PI) / 180);
    const cosX = Math.cos((rotation.x * Math.PI) / 180);
    const sinX = Math.sin((rotation.x * Math.PI) / 180);

    // Rotate around Y axis
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // Rotate around X axis
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Perspective projection
    const scale = viewMode === 'perspective' ? zoom * (300 / (300 + z2)) : zoom * 0.5;

    return {
      x: centerX + x1 * scale,
      y: centerY - y1 * scale,
      z: z2
    };
  };

  // Draw a 3D box (wall, door, window, etc.)
  const draw3DBox = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    strokeColor: string = '#ea580c'
  ) => {
    // Bottom face (floor level)
    const p1 = project3D(x, 0, y);
    const p2 = project3D(x + w, 0, y);
    const p3 = project3D(x + w, 0, y + h);
    const p4 = project3D(x, 0, y + h);

    // Top face (at depth/height)
    const p5 = project3D(x, depth, y);
    const p6 = project3D(x + w, depth, y);
    const p7 = project3D(x + w, depth, y + h);
    const p8 = project3D(x, depth, y + h);

    // Draw faces
    // Top face
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p5.x, p5.y);
    ctx.lineTo(p6.x, p6.y);
    ctx.lineTo(p7.x, p7.y);
    ctx.lineTo(p8.x, p8.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Front face
    const frontShade = adjustBrightness(color, -20);
    ctx.fillStyle = frontShade;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p7.x, p7.y);
    ctx.lineTo(p6.x, p6.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    // Side face
    const sideShade = adjustBrightness(color, -40);
    ctx.fillStyle = sideShade;
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.lineTo(p8.x, p8.y);
    ctx.lineTo(p7.x, p7.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  };

  // Helper to adjust color brightness
  const adjustBrightness = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Main render effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Clear with dark background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, width, height);

    // Draw grid floor
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let i = -500; i <= 500; i += gridSize) {
      const start1 = project3D(i, 0, -500);
      const end1 = project3D(i, 0, 500);
      ctx.beginPath();
      ctx.moveTo(start1.x, start1.y);
      ctx.lineTo(end1.x, end1.y);
      ctx.stroke();

      const start2 = project3D(-500, 0, i);
      const end2 = project3D(500, 0, i);
      ctx.beginPath();
      ctx.moveTo(start2.x, start2.y);
      ctx.lineTo(end2.x, end2.y);
      ctx.stroke();
    }

    // Sort elements by Z depth for proper rendering
    const sortedElements = [...elements].sort((a, b) => {
      const zA = project3D(a.x, 0, a.y).z;
      const zB = project3D(b.x, 0, b.y).z;
      return zB - zA; // Far to near
    });

    // Draw all elements
    sortedElements.forEach((element) => {
      switch (element.type) {
        case 'wall':
          draw3DBox(
            ctx,
            element.x,
            element.y,
            element.width,
            element.height,
            WALL_HEIGHT,
            '#4A4A4A',
            '#ea580c'
          );
          break;

        case 'door':
          draw3DBox(
            ctx,
            element.x,
            element.y,
            element.width,
            element.height,
            WALL_HEIGHT * 0.9, // Slightly shorter
            '#8B4513',
            '#ea580c'
          );
          break;

        case 'window':
          draw3DBox(
            ctx,
            element.x,
            element.y + 30, // Offset from floor
            element.width,
            element.height,
            40, // Window height
            '#87CEEB',
            '#ea580c'
          );
          break;

        case 'room':
          // Draw floor plane for room
          const p1 = project3D(element.x, 0, element.y);
          const p2 = project3D(element.x + element.width, 0, element.y);
          const p3 = project3D(element.x + element.width, 0, element.y + element.height);
          const p4 = project3D(element.x, 0, element.y + element.height);

          ctx.fillStyle = element.color || '#2A2A2A';
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;

          // Room label
          if (element.label) {
            const center = project3D(
              element.x + element.width / 2,
              0,
              element.y + element.height / 2
            );
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(element.label, center.x, center.y);
          }
          break;

        case 'furniture':
          draw3DBox(
            ctx,
            element.x,
            element.y,
            element.width,
            element.height,
            30, // Standard furniture height
            '#6B7280',
            '#9CA3AF'
          );
          break;
      }
    });

    // Add lighting effect
    const gradient = ctx.createRadialGradient(width / 2, height / 4, 0, width / 2, height / 4, width);
    gradient.addColorStop(0, 'rgba(234, 88, 12, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

  }, [elements, rotation, zoom, width, height, viewMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setRotation({
      x: rotation.x + deltaY * 0.5,
      y: rotation.y + deltaX * 0.5
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(Math.max(0.5, Math.min(3, zoom + delta)));
  };

  const resetView = () => {
    setRotation({ x: 30, y: 45 });
    setZoom(1);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-6xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <Box className="w-6 h-6 text-[#ea580c]" />
            <div>
              <h2 className="text-xl font-bold text-white">3D Floor Plan View</h2>
              <p className="text-sm text-gray-400">
                Drag to rotate • Scroll to zoom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'perspective' ? 'isometric' : 'perspective')}
              className="flex items-center gap-2 px-3 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors text-sm"
              title="Toggle View Mode"
            >
              <Eye className="w-4 h-4" />
              {viewMode === 'perspective' ? 'Perspective' : 'Isometric'}
            </button>

            <button
              onClick={resetView}
              className="flex items-center gap-2 px-3 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors text-sm"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-[600px] cursor-move rounded-lg border border-[#2A2A2A]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>

        {/* Controls Info */}
        <div className="p-4 border-t border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div>
              <span className="font-semibold text-white">Rotation:</span> X: {Math.round(rotation.x)}° Y: {Math.round(rotation.y)}°
            </div>
            <div>
              <span className="font-semibold text-white">Zoom:</span> {Math.round(zoom * 100)}%
            </div>
            <div>
              <span className="font-semibold text-white">Elements:</span> {elements.length}
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Phase 2 - Basic 3D Visualization
          </div>
        </div>
      </div>
    </div>
  );
}
