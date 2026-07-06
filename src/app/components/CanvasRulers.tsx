// Canvas Rulers - Professional CAD-style Rulers
import { useEffect, useRef } from 'react';

interface CanvasRulersProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };
  gridSize: number;
  units: 'inches' | 'feet' | 'meters';
}

export default function CanvasRulers({
  canvasWidth,
  canvasHeight,
  zoom,
  panOffset,
  gridSize,
  units
}: CanvasRulersProps) {
  const horizontalRef = useRef<HTMLCanvasElement>(null);
  const verticalRef = useRef<HTMLCanvasElement>(null);

  const rulerSize = 30;

  useEffect(() => {
    drawHorizontalRuler();
    drawVerticalRuler();
  }, [canvasWidth, canvasHeight, zoom, panOffset]);

  const formatMeasurement = (pixels: number): string => {
    const inches = pixels;
    
    switch (units) {
      case 'feet':
        const feet = Math.floor(inches / 12);
        const remainingInches = Math.round(inches % 12);
        return remainingInches > 0 ? `${feet}'-${remainingInches}"` : `${feet}'`;
      case 'meters':
        const meters = (inches * 0.0254).toFixed(2);
        return `${meters}m`;
      default: // inches
        return `${Math.round(inches)}"`;
    }
  };

  const drawHorizontalRuler = () => {
    const canvas = horizontalRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = rulerSize;

    // Background
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Ruler marks
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';

    const offset = panOffset.x % (gridSize * zoom);
    const startValue = Math.floor(-panOffset.x / (gridSize * zoom)) * gridSize;

    for (let x = offset; x < canvas.width; x += gridSize * zoom) {
      const value = startValue + ((x - offset) / zoom);
      
      // Major tick (every grid line)
      if (Math.round(value) % gridSize === 0) {
        ctx.beginPath();
        ctx.moveTo(x, rulerSize - 15);
        ctx.lineTo(x, rulerSize);
        ctx.stroke();

        // Label
        const label = formatMeasurement(value);
        const metrics = ctx.measureText(label);
        ctx.fillText(label, x - metrics.width / 2, rulerSize - 18);
      }
      
      // Minor ticks (halfway)
      const halfX = x + (gridSize * zoom) / 2;
      if (halfX < canvas.width) {
        ctx.beginPath();
        ctx.moveTo(halfX, rulerSize - 8);
        ctx.lineTo(halfX, rulerSize);
        ctx.stroke();
      }
    }
  };

  const drawVerticalRuler = () => {
    const canvas = verticalRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = rulerSize;
    canvas.height = canvasHeight;

    // Background
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Ruler marks
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';

    const offset = panOffset.y % (gridSize * zoom);
    const startValue = Math.floor(-panOffset.y / (gridSize * zoom)) * gridSize;

    for (let y = offset; y < canvas.height; y += gridSize * zoom) {
      const value = startValue + ((y - offset) / zoom);
      
      // Major tick
      if (Math.round(value) % gridSize === 0) {
        ctx.beginPath();
        ctx.moveTo(rulerSize - 15, y);
        ctx.lineTo(rulerSize, y);
        ctx.stroke();

        // Label (rotated)
        const label = formatMeasurement(value);
        ctx.save();
        ctx.translate(8, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
      
      // Minor ticks
      const halfY = y + (gridSize * zoom) / 2;
      if (halfY < canvas.height) {
        ctx.beginPath();
        ctx.moveTo(rulerSize - 8, halfY);
        ctx.lineTo(rulerSize, halfY);
        ctx.stroke();
      }
    }
  };

  return (
    <>
      {/* Horizontal Ruler */}
      <canvas
        ref={horizontalRef}
        className="absolute top-0 left-[80px] border-b border-[#2A2A2A]"
        style={{
          width: canvasWidth - 80,
          height: rulerSize,
          pointerEvents: 'none'
        }}
      />

      {/* Vertical Ruler */}
      <canvas
        ref={verticalRef}
        className="absolute left-0 top-[30px] border-r border-[#2A2A2A]"
        style={{
          width: rulerSize,
          height: canvasHeight - 30,
          pointerEvents: 'none'
        }}
      />

      {/* Corner Box */}
      <div className="absolute top-0 left-0 w-[30px] h-[30px] bg-[#1A1A1A] border-r border-b border-[#2A2A2A] flex items-center justify-center">
        <div className="w-3 h-3 bg-[#ea580c] rounded-sm" />
      </div>
    </>
  );
}
