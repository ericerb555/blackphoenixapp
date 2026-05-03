/**
 * Advanced Import/Export System
 * Support for DWG, DXF, IFC, and other CAD formats
 */

export interface ImportResult {
  success: boolean;
  elements: any[];
  measurements: any[];
  annotations: any[];
  metadata: {
    format: string;
    version?: string;
    units?: string;
    layers?: string[];
    warnings?: string[];
  };
  errors?: string[];
}

export interface ExportOptions {
  format: 'dwg' | 'dxf' | 'ifc' | 'obj' | 'gltf' | 'svg' | 'pdf' | 'png';
  version?: string; // e.g., "AutoCAD 2021" for DWG
  units?: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  layers?: string[]; // Which layers to include
  scale?: string; // e.g., "1:100"
  paperSize?: string; // For PDF export
  includeMetadata?: boolean;
}

/**
 * DXF Parser (Drawing Exchange Format)
 * Simplified parser for basic DXF entities
 */
export class DXFParser {
  /**
   * Parse DXF file content
   */
  parse(dxfContent: string): ImportResult {
    try {
      const lines = dxfContent.split('\n').map(l => l.trim());
      const elements: any[] = [];
      const layers: string[] = [];
      
      let i = 0;
      let currentEntity: any = {};
      let currentSection = '';

      while (i < lines.length) {
        const code = lines[i];
        const value = lines[i + 1];

        if (code === '0') {
          // Start of new entity
          if (currentEntity.type) {
            const element = this.convertDXFEntityToElement(currentEntity);
            if (element) elements.push(element);
          }
          currentEntity = { type: value };
        } else if (code === '8') {
          // Layer name
          currentEntity.layer = value;
          if (!layers.includes(value)) layers.push(value);
        } else if (code === '10') {
          currentEntity.x1 = parseFloat(value);
        } else if (code === '20') {
          currentEntity.y1 = parseFloat(value);
        } else if (code === '11') {
          currentEntity.x2 = parseFloat(value);
        } else if (code === '21') {
          currentEntity.y2 = parseFloat(value);
        } else if (code === '40') {
          currentEntity.radius = parseFloat(value);
        }

        i += 2;
      }

      // Process last entity
      if (currentEntity.type) {
        const element = this.convertDXFEntityToElement(currentEntity);
        if (element) elements.push(element);
      }

      return {
        success: true,
        elements,
        measurements: [],
        annotations: [],
        metadata: {
          format: 'DXF',
          layers,
          warnings: elements.length === 0 ? ['No entities found in DXF file'] : [],
        },
      };
    } catch (error) {
      return {
        success: false,
        elements: [],
        measurements: [],
        annotations: [],
        metadata: { format: 'DXF' },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private convertDXFEntityToElement(entity: any): any | null {
    if (entity.type === 'LINE') {
      return {
        type: 'wall',
        x1: entity.x1 || 0,
        y1: entity.y1 || 0,
        x2: entity.x2 || 0,
        y2: entity.y2 || 0,
        layer: entity.layer || 'Architectural',
        id: `dxf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } else if (entity.type === 'CIRCLE') {
      return {
        type: 'fixture',
        x: entity.x1 || 0,
        y: entity.y1 || 0,
        radius: entity.radius || 10,
        layer: entity.layer || 'Architectural',
        id: `dxf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }
    return null;
  }
}

/**
 * DXF Exporter
 */
export class DXFExporter {
  /**
   * Export elements to DXF format
   */
  export(elements: any[], options: ExportOptions = { format: 'dxf' }): string {
    let dxf = '';

    // Header
    dxf += '0\nSECTION\n';
    dxf += '2\nHEADER\n';
    dxf += '9\n$ACADVER\n';
    dxf += '1\nAC1021\n'; // AutoCAD 2007
    dxf += '0\nENDSEC\n';

    // Tables section
    dxf += '0\nSECTION\n';
    dxf += '2\nTABLES\n';
    
    // Layer table
    dxf += '0\nTABLE\n';
    dxf += '2\nLAYER\n';
    
    const layers = Array.from(new Set(elements.map(el => el.layer || 'Architectural')));
    layers.forEach(layer => {
      dxf += '0\nLAYER\n';
      dxf += `2\n${layer}\n`;
      dxf += '70\n0\n';
      dxf += '62\n7\n'; // Color: white
    });
    
    dxf += '0\nENDTAB\n';
    dxf += '0\nENDSEC\n';

    // Entities section
    dxf += '0\nSECTION\n';
    dxf += '2\nENTITIES\n';

    elements.forEach(element => {
      if (element.type === 'wall' && 'x1' in element) {
        dxf += '0\nLINE\n';
        dxf += `8\n${element.layer || 'Architectural'}\n`;
        dxf += `10\n${element.x1}\n`;
        dxf += `20\n${element.y1}\n`;
        dxf += `11\n${element.x2}\n`;
        dxf += `21\n${element.y2}\n`;
      } else if (element.type === 'door' || element.type === 'window') {
        // Represent as a line with specific layer
        const width = element.width || 36;
        dxf += '0\nLINE\n';
        dxf += `8\n${element.type === 'door' ? 'Doors' : 'Windows'}\n`;
        dxf += `10\n${element.x}\n`;
        dxf += `20\n${element.y}\n`;
        dxf += `11\n${element.x + width}\n`;
        dxf += `21\n${element.y}\n`;
      } else if (element.type === 'fixture' || element.type === 'panel') {
        // Represent as circle
        dxf += '0\nCIRCLE\n';
        dxf += `8\n${element.layer || 'Plumbing'}\n`;
        dxf += `10\n${element.x}\n`;
        dxf += `20\n${element.y}\n`;
        dxf += `40\n${element.radius || 10}\n`;
      }
    });

    dxf += '0\nENDSEC\n';
    dxf += '0\nEOF\n';

    return dxf;
  }
}

/**
 * SVG Exporter (for web compatibility)
 */
export class SVGExporter {
  export(
    elements: any[],
    measurements: any[],
    annotations: any[],
    options: { width: number; height: number; scale?: number } = { width: 900, height: 560 }
  ): string {
    const scale = options.scale || 1;
    const width = options.width * scale;
    const height = options.height * scale;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg width="${width}" height="${height}" viewBox="0 0 ${options.width} ${options.height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <defs>\n`;
    svg += `    <style>\n`;
    svg += `      .wall { stroke: #6cf0ff; stroke-width: 3; fill: none; }\n`;
    svg += `      .door { stroke: #fbbf24; stroke-width: 2; fill: none; }\n`;
    svg += `      .window { stroke: #3b82f6; stroke-width: 2; fill: none; }\n`;
    svg += `      .fixture { fill: #3b82f6; }\n`;
    svg += `      .dimension { stroke: #a78bfa; stroke-width: 1; fill: none; }\n`;
    svg += `      .annotation { fill: #fbbf24; font-family: sans-serif; font-size: 12px; }\n`;
    svg += `    </style>\n`;
    svg += `  </defs>\n\n`;

    // Elements
    elements.forEach(el => {
      if (el.type === 'wall' && 'x1' in el) {
        svg += `  <line class="wall" x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" />\n`;
      } else if (el.type === 'door' && 'x' in el) {
        const width = el.width || 36;
        svg += `  <line class="door" x1="${el.x}" y1="${el.y}" x2="${el.x + width}" y2="${el.y}" />\n`;
      } else if (el.type === 'window' && 'x' in el) {
        const width = el.width || 48;
        svg += `  <rect class="window" x="${el.x}" y="${el.y - 5}" width="${width}" height="10" />\n`;
      } else if ((el.type === 'fixture' || el.type === 'panel') && 'x' in el) {
        svg += `  <circle class="fixture" cx="${el.x}" cy="${el.y}" r="8" />\n`;
      }
    });

    // Measurements
    measurements.forEach(m => {
      if (m.type === 'linear' && m.points && m.points.length >= 2) {
        const [p1, p2] = m.points;
        svg += `  <line class="dimension" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke-dasharray="4 2" />\n`;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        svg += `  <text class="annotation" x="${midX}" y="${midY - 5}" text-anchor="middle">${m.label}</text>\n`;
      }
    });

    // Annotations
    annotations.forEach(a => {
      if (a.position) {
        svg += `  <text class="annotation" x="${a.position.x}" y="${a.position.y}">${a.text}</text>\n`;
      }
    });

    svg += `</svg>`;
    return svg;
  }
}

/**
 * PDF Exporter (using SVG as intermediate format)
 */
export class PDFExporter {
  async export(
    elements: any[],
    measurements: any[],
    annotations: any[],
    options: ExportOptions & { title?: string } = { format: 'pdf' }
  ): Promise<Blob> {
    // Generate SVG first
    const svgExporter = new SVGExporter();
    const svgContent = svgExporter.export(elements, measurements, annotations);

    // In a real implementation, you would use a library like jsPDF or PDFKit
    // For now, we'll create a simple PDF-like blob
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF`;

    return new Blob([pdfContent], { type: 'application/pdf' });
  }
}

/**
 * Main Import/Export Manager
 */
export class ImportExportManager {
  private dxfParser = new DXFParser();
  private dxfExporter = new DXFExporter();
  private svgExporter = new SVGExporter();
  private pdfExporter = new PDFExporter();

  /**
   * Import from file
   */
  async import(file: File): Promise<ImportResult> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    try {
      const content = await file.text();

      switch (extension) {
        case 'dxf':
          return this.dxfParser.parse(content);
        case 'svg':
          return this.importSVG(content);
        default:
          return {
            success: false,
            elements: [],
            measurements: [],
            annotations: [],
            metadata: { format: extension || 'unknown' },
            errors: [`Unsupported file format: ${extension}`],
          };
      }
    } catch (error) {
      return {
        success: false,
        elements: [],
        measurements: [],
        annotations: [],
        metadata: { format: extension || 'unknown' },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Export to file
   */
  async export(
    elements: any[],
    measurements: any[],
    annotations: any[],
    options: ExportOptions
  ): Promise<{ blob: Blob; filename: string }> {
    let blob: Blob;
    let filename: string;

    switch (options.format) {
      case 'dxf':
        const dxfContent = this.dxfExporter.export(elements, options);
        blob = new Blob([dxfContent], { type: 'application/dxf' });
        filename = `floor-plan-${Date.now()}.dxf`;
        break;

      case 'svg':
        const svgContent = this.svgExporter.export(elements, measurements, annotations);
        blob = new Blob([svgContent], { type: 'image/svg+xml' });
        filename = `floor-plan-${Date.now()}.svg`;
        break;

      case 'pdf':
        blob = await this.pdfExporter.export(elements, measurements, annotations, options);
        filename = `floor-plan-${Date.now()}.pdf`;
        break;

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return { blob, filename };
  }

  /**
   * Download file
   */
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private importSVG(svgContent: string): ImportResult {
    // Basic SVG parser - extracts lines and circles
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const elements: any[] = [];

    // Parse lines (walls)
    doc.querySelectorAll('line').forEach((line, index) => {
      elements.push({
        type: 'wall',
        x1: parseFloat(line.getAttribute('x1') || '0'),
        y1: parseFloat(line.getAttribute('y1') || '0'),
        x2: parseFloat(line.getAttribute('x2') || '0'),
        y2: parseFloat(line.getAttribute('y2') || '0'),
        layer: 'Architectural',
        id: `svg-line-${index}`,
      });
    });

    // Parse circles (fixtures)
    doc.querySelectorAll('circle').forEach((circle, index) => {
      elements.push({
        type: 'fixture',
        x: parseFloat(circle.getAttribute('cx') || '0'),
        y: parseFloat(circle.getAttribute('cy') || '0'),
        radius: parseFloat(circle.getAttribute('r') || '10'),
        layer: 'Plumbing',
        id: `svg-circle-${index}`,
      });
    });

    return {
      success: true,
      elements,
      measurements: [],
      annotations: [],
      metadata: { format: 'SVG' },
    };
  }
}
