// Professional Floor Plan Export System - Phase 8: Advanced Export Capabilities
import { useState } from 'react';
import { Download, FileText, Image as ImageIcon, File, Loader2, CheckCircle, FileJson, Layers, Camera, Package } from 'lucide-react';

interface CanvasElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture' | 'electrical' | 'plumbing' | 'shape' | 'annotation' | 'dimension';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  label?: string;
  subtype?: string;
  wallHeight?: number;
  points?: { x: number; y: number }[];
  text?: string;
  fontSize?: number;
}

interface ExportFloorPlanModalProps {
  elements: CanvasElement[];
  projectName?: string;
  onClose: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

type ExportFormat = 'pdf' | 'dxf' | 'png' | 'svg' | 'json' | '3d-png' | 'batch';
type Resolution = '1080p' | '2k' | '4k' | 'custom';
type Quality = 'standard' | 'high' | 'ultra';

export default function ExportFloorPlanModal({
  elements,
  projectName = 'Floor Plan',
  onClose,
  canvasRef
}: ExportFloorPlanModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Advanced export options
  const [resolution, setResolution] = useState<Resolution>('2k');
  const [quality, setQuality] = useState<Quality>('high');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  
  // Export options
  const [includeGrid, setIncludeGrid] = useState(true);
  const [includeMeasurements, setIncludeMeasurements] = useState(true);
  const [includeLabels, setIncludeLabels] = useState(true);
  const [includeFurniture, setIncludeFurniture] = useState(true);
  const [includeAnnotations, setIncludeAnnotations] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [paperSize, setPaperSize] = useState<'letter' | 'a4' | 'tabloid' | 'a3'>('letter');
  const [scale, setScale] = useState<'1/4' | '1/8' | '1/16' | '1/32'>('1/4');

  // Resolution presets
  const getResolutionDimensions = (): { width: number; height: number } => {
    switch (resolution) {
      case '1080p':
        return { width: 1920, height: 1080 };
      case '2k':
        return { width: 2560, height: 1440 };
      case '4k':
        return { width: 3840, height: 2160 };
      case 'custom':
        return { width: customWidth, height: customHeight };
    }
  };

  // Quality multiplier
  const getQualityMultiplier = (): number => {
    switch (quality) {
      case 'standard':
        return 1;
      case 'high':
        return 1.5;
      case 'ultra':
        return 2;
    }
  };

  const generatePDF = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const sizes = {
      letter: { width: 2550, height: 3300 },
      a4: { width: 2480, height: 3508 },
      tabloid: { width: 3300, height: 5100 },
      a3: { width: 3508, height: 4961 }
    };

    const size = sizes[paperSize];
    canvas.width = size.width;
    canvas.height = size.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px Arial';
    ctx.fillText(projectName, 100, 100);

    ctx.font = '24px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(new Date().toLocaleDateString(), 100, 150);

    const drawingArea = {
      x: 100,
      y: 250,
      width: canvas.width - 200,
      height: canvas.height - 400
    };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });

    const floorPlanWidth = maxX - minX || 1;
    const floorPlanHeight = maxY - minY || 1;

    const scaleX = drawingArea.width / floorPlanWidth;
    const scaleY = drawingArea.height / floorPlanHeight;
    const drawScale = Math.min(scaleX, scaleY) * 0.9;

    if (includeGrid) {
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1;
      const gridSize = 20 * drawScale;
      
      for (let x = drawingArea.x; x < drawingArea.x + drawingArea.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, drawingArea.y);
        ctx.lineTo(x, drawingArea.y + drawingArea.height);
        ctx.stroke();
      }
      
      for (let y = drawingArea.y; y < drawingArea.y + drawingArea.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(drawingArea.x, y);
        ctx.lineTo(drawingArea.x + drawingArea.width, y);
        ctx.stroke();
      }
    }

    elements.forEach(element => {
      if (element.type === 'furniture' && !includeFurniture) return;
      if ((element.type === 'annotation' || element.type === 'dimension') && !includeAnnotations) return;

      const x = drawingArea.x + (element.x - minX) * drawScale;
      const y = drawingArea.y + (element.y - minY) * drawScale;
      const w = element.width * drawScale;
      const h = element.height * drawScale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((element.rotation * Math.PI) / 180);

      switch (element.type) {
        case 'wall':
          ctx.fillStyle = '#4A4A4A';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, w, h);
          break;

        case 'door':
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, w, h);
          ctx.beginPath();
          ctx.arc(0, 0, w, 0, Math.PI / 2);
          ctx.strokeStyle = '#000000';
          ctx.stroke();
          break;

        case 'window':
          ctx.fillStyle = '#87CEEB';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, w, h);
          break;

        case 'room':
          ctx.fillStyle = element.color || '#f5f5f5';
          ctx.globalAlpha = 0.2;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, w, h);
          
          if (includeLabels && element.label) {
            ctx.fillStyle = '#000000';
            ctx.font = '20px Arial';
            ctx.fillText(element.label, 10, 25);
          }
          break;

        case 'furniture':
          ctx.fillStyle = '#6B7280';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, w, h);
          break;
      }

      ctx.restore();
    });

    if (includeMeasurements) {
      const legendY = canvas.height - 150;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('Measurements:', 100, legendY);
      
      ctx.font = '16px Arial';
      const totalArea = elements
        .filter(el => el.type === 'room')
        .reduce((sum, el) => sum + (el.width * el.height) / 144, 0);
      
      ctx.fillText(`Total Area: ${totalArea.toFixed(2)} sq ft`, 100, legendY + 30);
      ctx.fillText(`Rooms: ${elements.filter(el => el.type === 'room').length}`, 100, legendY + 55);
      ctx.fillText(`Scale: ${scale}"=1'-0"`, 100, legendY + 80);
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    return canvas.toDataURL('image/png');
  };

  const generateHighResPNG = async () => {
    const { width, height } = getResolutionDimensions();
    const qualityMultiplier = getQualityMultiplier();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    canvas.width = width * qualityMultiplier;
    canvas.height = height * qualityMultiplier;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      if (el.type === 'furniture' && !includeFurniture) return;
      if ((el.type === 'annotation' || el.type === 'dimension') && !includeAnnotations) return;
      
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });

    const floorPlanWidth = maxX - minX || 1;
    const floorPlanHeight = maxY - minY || 1;

    const padding = 100 * qualityMultiplier;
    const scaleX = (canvas.width - padding * 2) / floorPlanWidth;
    const scaleY = (canvas.height - padding * 2) / floorPlanHeight;
    const drawScale = Math.min(scaleX, scaleY);

    const offsetX = (canvas.width - floorPlanWidth * drawScale) / 2;
    const offsetY = (canvas.height - floorPlanHeight * drawScale) / 2;

    if (includeGrid) {
      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1 * qualityMultiplier;
      const gridSize = 20 * drawScale;
      
      for (let x = offsetX; x < offsetX + floorPlanWidth * drawScale; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, offsetY);
        ctx.lineTo(x, offsetY + floorPlanHeight * drawScale);
        ctx.stroke();
      }
      
      for (let y = offsetY; y < offsetY + floorPlanHeight * drawScale; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + floorPlanWidth * drawScale, y);
        ctx.stroke();
      }
    }

    elements.forEach(element => {
      if (element.type === 'furniture' && !includeFurniture) return;
      if ((element.type === 'annotation' || element.type === 'dimension') && !includeAnnotations) return;

      const x = offsetX + (element.x - minX) * drawScale;
      const y = offsetY + (element.y - minY) * drawScale;
      const w = element.width * drawScale;
      const h = element.height * drawScale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((element.rotation * Math.PI) / 180);

      switch (element.type) {
        case 'wall':
          ctx.fillStyle = '#4A4A4A';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2 * qualityMultiplier;
          ctx.strokeRect(0, 0, w, h);
          break;

        case 'door':
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2 * qualityMultiplier;
          ctx.strokeRect(0, 0, w, h);
          ctx.beginPath();
          ctx.arc(0, 0, w, 0, Math.PI / 2);
          ctx.strokeStyle = '#000000';
          ctx.stroke();
          break;

        case 'window':
          ctx.fillStyle = '#87CEEB';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2 * qualityMultiplier;
          ctx.strokeRect(0, 0, w, h);
          break;

        case 'room':
          ctx.fillStyle = element.color || '#f5f5f5';
          ctx.globalAlpha = 0.2;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2 * qualityMultiplier;
          ctx.strokeRect(0, 0, w, h);
          
          if (includeLabels && element.label) {
            ctx.fillStyle = '#000000';
            ctx.font = `bold ${20 * qualityMultiplier}px Arial`;
            ctx.fillText(element.label, 10 * qualityMultiplier, 25 * qualityMultiplier);
          }
          break;

        case 'furniture':
          ctx.fillStyle = '#6B7280';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1 * qualityMultiplier;
          ctx.strokeRect(0, 0, w, h);
          break;

        case 'electrical':
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1 * qualityMultiplier;
          ctx.stroke();
          break;

        case 'plumbing':
          ctx.fillStyle = '#00BFFF';
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1 * qualityMultiplier;
          ctx.stroke();
          break;
      }

      ctx.restore();
    });

    if (includeWatermark) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.font = `${30 * qualityMultiplier}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Design Studio Pro', canvas.width / 2, canvas.height - 50 * qualityMultiplier);
    }

    if (includeMeasurements) {
      const legendY = canvas.height - 150 * qualityMultiplier;
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${20 * qualityMultiplier}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText('Measurements:', 50 * qualityMultiplier, legendY);
      
      ctx.font = `${16 * qualityMultiplier}px Arial`;
      const totalArea = elements
        .filter(el => el.type === 'room')
        .reduce((sum, el) => sum + (el.width * el.height) / 144, 0);
      
      ctx.fillText(`Total Area: ${totalArea.toFixed(2)} sq ft`, 50 * qualityMultiplier, legendY + 30 * qualityMultiplier);
      ctx.fillText(`Rooms: ${elements.filter(el => el.type === 'room').length}`, 50 * qualityMultiplier, legendY + 55 * qualityMultiplier);
      ctx.fillText(`Quality: ${quality.toUpperCase()} (${width}x${height})`, 50 * qualityMultiplier, legendY + 80 * qualityMultiplier);
    }

    return canvas.toDataURL('image/png', quality === 'ultra' ? 1.0 : quality === 'high' ? 0.95 : 0.85);
  };

  const generateDXF = () => {
    let dxf = `0\nSECTION\n2\nHEADER\n`;
    dxf += `9\n$ACADVER\n1\nAC1015\n`;
    dxf += `0\nENDSEC\n`;
    
    dxf += `0\nSECTION\n2\nENTITIES\n`;

    elements.forEach((element) => {
      switch (element.type) {
        case 'wall':
        case 'room':
          dxf += `0\nLWPOLYLINE\n`;
          dxf += `8\n${element.type}\n`;
          dxf += `90\n5\n`;
          dxf += `70\n1\n`;
          
          dxf += `10\n${element.x}\n20\n${element.y}\n`;
          dxf += `10\n${element.x + element.width}\n20\n${element.y}\n`;
          dxf += `10\n${element.x + element.width}\n20\n${element.y + element.height}\n`;
          dxf += `10\n${element.x}\n20\n${element.y + element.height}\n`;
          dxf += `10\n${element.x}\n20\n${element.y}\n`;
          break;

        case 'door':
        case 'window':
          dxf += `0\nLINE\n`;
          dxf += `8\n${element.type}\n`;
          dxf += `10\n${element.x}\n20\n${element.y}\n30\n0.0\n`;
          dxf += `11\n${element.x + element.width}\n21\n${element.y}\n31\n0.0\n`;
          break;
      }

      if (element.label) {
        dxf += `0\nTEXT\n`;
        dxf += `8\nlabels\n`;
        dxf += `10\n${element.x + element.width / 2}\n20\n${element.y + element.height / 2}\n30\n0.0\n`;
        dxf += `40\n12.0\n`;
        dxf += `1\n${element.label}\n`;
      }
    });

    dxf += `0\nENDSEC\n`;
    dxf += `0\nEOF\n`;

    return dxf;
  };

  const generateSVG = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    });

    const width = maxX - minX + 100;
    const height = maxY - minY + 100;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <rect width="100%" height="100%" fill="white"/>\n`;

    elements.forEach(element => {
      const x = element.x - minX + 50;
      const y = element.y - minY + 50;

      switch (element.type) {
        case 'wall':
          svg += `  <rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" fill="#4A4A4A" stroke="#000" stroke-width="2"/>\n`;
          break;
        case 'door':
          svg += `  <rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" fill="#8B4513" stroke="#000" stroke-width="2"/>\n`;
          svg += `  <path d="M ${x} ${y} A ${element.width} ${element.width} 0 0 1 ${x + element.width} ${y}" stroke="#000" fill="none"/>\n`;
          break;
        case 'window':
          svg += `  <rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" fill="#87CEEB" fill-opacity="0.3" stroke="#000" stroke-width="2"/>\n`;
          break;
        case 'room':
          svg += `  <rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" fill="${element.color || '#f5f5f5'}" fill-opacity="0.2" stroke="#000" stroke-width="2"/>\n`;
          if (element.label) {
            svg += `  <text x="${x + element.width / 2}" y="${y + element.height / 2}" text-anchor="middle" font-size="14" fill="#000">${element.label}</text>\n`;
          }
          break;
        case 'furniture':
          svg += `  <rect x="${x}" y="${y}" width="${element.width}" height="${element.height}" fill="#6B7280" stroke="#000" stroke-width="1"/>\n`;
          break;
      }
    });

    svg += `</svg>`;
    return svg;
  };

  const generateJSON = () => {
    const projectData = {
      version: '1.0',
      projectName,
      exportDate: new Date().toISOString(),
      elements: elements,
      metadata: {
        totalElements: elements.length,
        elementTypes: {
          walls: elements.filter(el => el.type === 'wall').length,
          doors: elements.filter(el => el.type === 'door').length,
          windows: elements.filter(el => el.type === 'window').length,
          rooms: elements.filter(el => el.type === 'room').length,
          furniture: elements.filter(el => el.type === 'furniture').length,
          electrical: elements.filter(el => el.type === 'electrical').length,
          plumbing: elements.filter(el => el.type === 'plumbing').length,
        },
        totalArea: elements
          .filter(el => el.type === 'room')
          .reduce((sum, el) => sum + (el.width * el.height) / 144, 0),
      }
    };
    
    return JSON.stringify(projectData, null, 2);
  };

  const batchExport = async () => {
    console.log('📦 Starting batch export...');
    const exports = [];

    console.log('  → Exporting 2D PNG...');
    const png2D = await generateHighResPNG();
    exports.push({ name: `${projectName}_2D.png`, data: png2D });

    console.log('  → Exporting SVG...');
    const svgContent = generateSVG();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    exports.push({ name: `${projectName}.svg`, blob: svgBlob });

    console.log('  → Exporting JSON...');
    const jsonContent = generateJSON();
    const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
    exports.push({ name: `${projectName}.json`, blob: jsonBlob });

    console.log('  → Exporting DXF...');
    const dxfContent = generateDXF();
    const dxfBlob = new Blob([dxfContent], { type: 'application/dxf' });
    exports.push({ name: `${projectName}.dxf`, blob: dxfBlob });

    console.log(`✅ Batch export complete: ${exports.length} files`);
    return exports;
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      if (format === 'batch') {
        const exports = await batchExport();
        
        for (const exp of exports) {
          const link = document.createElement('a');
          
          if (exp.data) {
            link.href = exp.data;
          } else if (exp.blob) {
            link.href = URL.createObjectURL(exp.blob);
          }
          
          link.download = exp.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          if (exp.blob) {
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
        return;
      }

      let dataUrl: string;
      let filename: string;

      switch (format) {
        case 'pdf':
          dataUrl = await generatePDF();
          filename = `${projectName}.pdf.png`;
          break;

        case 'dxf':
          const dxfContent = generateDXF();
          const dxfBlob = new Blob([dxfContent], { type: 'application/dxf' });
          dataUrl = URL.createObjectURL(dxfBlob);
          filename = `${projectName}.dxf`;
          break;

        case 'svg':
          const svgContent = generateSVG();
          const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
          dataUrl = URL.createObjectURL(svgBlob);
          filename = `${projectName}.svg`;
          break;

        case 'png':
          dataUrl = await generateHighResPNG();
          filename = `${projectName}_${resolution}_${quality}.png`;
          break;

        case 'json':
          const jsonContent = generateJSON();
          const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
          dataUrl = URL.createObjectURL(jsonBlob);
          filename = `${projectName}.json`;
          break;

        case '3d-png':
          if (canvasRef?.current) {
            dataUrl = canvasRef.current.toDataURL('image/png');
            filename = `${projectName}_3D.png`;
          } else {
            throw new Error('3D view not available');
          }
          break;

        default:
          throw new Error('Unsupported format');
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (['dxf', 'svg', 'json'].includes(format)) {
        setTimeout(() => URL.revokeObjectURL(dataUrl), 100);
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1500);

    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export floor plan');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A] sticky top-0 bg-[#1A1A1A] z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Download className="w-6 h-6 text-[#ea580c]" />
              Export Floor Plan
            </h2>
            <p className="text-sm text-gray-400">
              Professional export • Phase 8 Advanced Capabilities
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'pdf'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <FileText className={`w-8 h-8 mx-auto mb-2 ${format === 'pdf' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-white">PDF</p>
                <p className="text-xs text-gray-500">Document</p>
              </button>

              <button
                onClick={() => setFormat('png')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'png'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${format === 'png' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-white">PNG</p>
                <p className="text-xs text-gray-500">Hi-Res</p>
              </button>

              <button
                onClick={() => setFormat('svg')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'svg'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <Layers className={`w-8 h-8 mx-auto mb-2 ${format === 'svg' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-white">SVG</p>
                <p className="text-xs text-gray-500">Vector</p>
              </button>

              <button
                onClick={() => setFormat('dxf')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'dxf'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <File className={`w-8 h-8 mx-auto mb-2 ${format === 'dxf' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-white">DXF</p>
                <p className="text-xs text-gray-500">AutoCAD</p>
              </button>

              <button
                onClick={() => setFormat('json')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'json'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <FileJson className={`w-8 h-8 mx-auto mb-2 ${format === 'json' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-white">JSON</p>
                <p className="text-xs text-gray-500">Project</p>
              </button>

              <button
                onClick={() => setFormat('3d-png')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === '3d-png'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <Camera className={`w-8 h-8 mx-auto mb-2 ${format === '3d-png' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-white">3D View</p>
                <p className="text-xs text-gray-500">Render</p>
              </button>

              <button
                onClick={() => setFormat('batch')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  format === 'batch'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <Package className={`w-8 h-8 mx-auto mb-2 ${format === 'batch' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-white">Batch</p>
                <p className="text-xs text-gray-500">All Files</p>
              </button>
            </div>
          </div>

          {format === 'png' && (
            <div className="space-y-4 p-4 bg-[#2A2A2A] rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-3">High-Resolution Export Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Preset
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as Resolution)}
                  className="w-full px-4 py-2 bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white"
                >
                  <option value="1080p">1080p (1920x1080)</option>
                  <option value="2k">2K (2560x1440)</option>
                  <option value="4k">4K Ultra HD (3840x2160)</option>
                  <option value="custom">Custom Dimensions</option>
                </select>
              </div>

              {resolution === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white"
                      min="640"
                      max="7680"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white"
                      min="480"
                      max="4320"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality Level
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as Quality)}
                  className="w-full px-4 py-2 bg-[#3A3A3A] border border-[#4A4A4A] rounded-lg text-white"
                >
                  <option value="standard">Standard (1x)</option>
                  <option value="high">High (1.5x)</option>
                  <option value="ultra">Ultra (2x)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Higher quality produces larger files with better detail
                </p>
              </div>
            </div>
          )}

          {(format === 'pdf' || format === 'png') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paper Size
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white"
                >
                  <option value="letter">Letter (8.5" x 11")</option>
                  <option value="a4">A4 (210mm x 297mm)</option>
                  <option value="tabloid">Tabloid (11" x 17")</option>
                  <option value="a3">A3 (297mm x 420mm)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scale
                </label>
                <select
                  value={scale}
                  onChange={(e) => setScale(e.target.value as any)}
                  className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white"
                >
                  <option value="1/4">1/4" = 1'-0"</option>
                  <option value="1/8">1/8" = 1'-0"</option>
                  <option value="1/16">1/16" = 1'-0"</option>
                  <option value="1/32">1/32" = 1'-0"</option>
                </select>
              </div>
            </div>
          )}

          {format === 'batch' && (
            <div className="p-4 bg-gradient-to-r from-[#ea580c]/10 to-[#dc2626]/10 border border-[#ea580c]/20 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#ea580c]" />
                Batch Export Will Include:
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 2D Floor Plan (High-Res PNG)</li>
                <li>• Vector Graphics (SVG)</li>
                <li>• Project Data (JSON)</li>
                <li>• AutoCAD File (DXF)</li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                All files will be downloaded automatically
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Export Options</h3>
            
            <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#3A3A3A] transition-colors">
              <input
                type="checkbox"
                checked={includeGrid}
                onChange={(e) => setIncludeGrid(e.target.checked)}
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="text-sm text-gray-300">Include Grid Lines</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#3A3A3A] transition-colors">
              <input
                type="checkbox"
                checked={includeMeasurements}
                onChange={(e) => setIncludeMeasurements(e.target.checked)}
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="text-sm text-gray-300">Include Measurements & Stats</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#3A3A3A] transition-colors">
              <input
                type="checkbox"
                checked={includeLabels}
                onChange={(e) => setIncludeLabels(e.target.checked)}
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="text-sm text-gray-300">Include Room Labels</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#3A3A3A] transition-colors">
              <input
                type="checkbox"
                checked={includeFurniture}
                onChange={(e) => setIncludeFurniture(e.target.checked)}
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="text-sm text-gray-300">Include Furniture</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#3A3A3A] transition-colors">
              <input
                type="checkbox"
                checked={includeAnnotations}
                onChange={(e) => setIncludeAnnotations(e.target.checked)}
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="text-sm text-gray-300">Include Annotations & Dimensions</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer hover:bg-[#3A3A3A] transition-colors">
              <input
                type="checkbox"
                checked={includeWatermark}
                onChange={(e) => setIncludeWatermark(e.target.checked)}
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="text-sm text-gray-300">Include Watermark</span>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-green-500 text-sm font-semibold">Export Successful!</p>
                <p className="text-green-400 text-xs">
                  {format === 'batch' ? 'All files downloaded' : 'File downloaded to your device'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting || elements.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg shadow-[#ea580c]/20"
          >
            {exporting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                {format === 'batch' ? 'Exporting All Files...' : 'Exporting...'}
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                {format === 'batch' ? 'Export All (Batch)' : `Export ${format.toUpperCase()}`}
              </>
            )}
          </button>

          {elements.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              Add elements to your design to enable export
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
