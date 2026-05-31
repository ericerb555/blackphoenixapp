/**
 * Quote Design Asset Creator - Enterprise Integration
 * 
 * Integrated with:
 * - Design Studio Pro (CAD, Floor Plans, 3D)
 * - AI Content Studio (Rendering Generation)
 * - Project Photos & Videos
 * - Work Request Details
 */

import { useState } from 'react';
import {
  X, Palette, Image as ImageIcon, Layers, Box, Wand2, Sparkles,
  Download, Maximize2, Check, Plus, Trash2, Eye, Upload, Zap,
  Video, Camera, FileText, Layout, Ruler, Monitor, Play,
  RefreshCw, Brain, Grid3x3, Settings, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { generateProfessional3DRendering, generateProfessionalFloorPlan } from './QuoteDesignAssetCreatorPreviews';
import { PrimaryButton } from './ui/button/PrimaryButton';

interface DesignAsset {
  id: string;
  name: string;
  type: 'rendering' | 'plan' | 'elevation' | 'detail';
  fileType: string;
  createdDate: string;
  thumbnail?: string;
  preview?: string;
  metadata?: {
    generatedBy: string;
    projectType: string;
    dimensions?: string;
    sourcePhotos?: string[];
    aiModel?: string;
  };
}

interface WorkRequest {
  id: string;
  requestNumber: string;
  customerName: string;
  businessName?: string;
  serviceCategory: string;
  serviceTitle: string;
  serviceDescription: string;
  photos: string[];
  address: string;
  city: string;
  state: string;
}

interface QuoteDesignAssetCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  workRequest?: WorkRequest;
  projectPhotos?: string[];
  projectVideos?: string[];
  onAssetsCreated: (assets: DesignAsset[]) => void;
  existingAssets?: DesignAsset[];
  quoteId?: string;
  onNavigateToCAD?: (quoteId: string, quoteData: any) => void;
}

export default function QuoteDesignAssetCreator({
  isOpen,
  onClose,
  projectTitle,
  workRequest,
  projectPhotos = [],
  projectVideos = [],
  onAssetsCreated,
  existingAssets = [],
  quoteId,
  onNavigateToCAD
}: QuoteDesignAssetCreatorProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'ai-generate' | 'cad' | 'photos'>('create');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdAssets, setCreatedAssets] = useState<DesignAsset[]>(existingAssets);
  const [previewAsset, setPreviewAsset] = useState<DesignAsset | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Determine project type from work request
  const projectType = workRequest?.serviceCategory.toLowerCase() || 'general';
  const isKitchen = projectType.includes('kitchen');
  const isBathroom = projectType.includes('bathroom');
  const isCommercial = projectType.includes('commercial');

  // Available design asset templates
  const assetTemplates = [
    { 
      id: 'render-main', 
      name: `3D Rendering - ${projectTitle} Main View`, 
      type: 'rendering' as const, 
      icon: ImageIcon, 
      color: 'purple', 
      description: 'AI-generated photorealistic main perspective',
      tool: 'AI Content Studio + DALL-E 3'
    },
    { 
      id: 'render-detail', 
      name: `3D Rendering - Detail View`, 
      type: 'rendering' as const, 
      icon: ImageIcon, 
      color: 'purple', 
      description: 'Close-up AI rendering of key features',
      tool: 'AI Content Studio + Runway Gen-2'
    },
    { 
      id: 'render-aerial', 
      name: `3D Rendering - Aerial View`, 
      type: 'rendering' as const, 
      icon: ImageIcon, 
      color: 'purple', 
      description: 'Bird\'s eye AI perspective',
      tool: 'AI Content Studio'
    },
    { 
      id: 'plan-floor', 
      name: 'CAD Floor Plan - Full Layout', 
      type: 'plan' as const, 
      icon: Layout, 
      color: 'blue', 
      description: 'Complete CAD floor plan with dimensions',
      tool: 'Design Studio Pro'
    },
    { 
      id: 'plan-electrical', 
      name: 'Electrical Plan', 
      type: 'plan' as const, 
      icon: Zap, 
      color: 'yellow', 
      description: 'Electrical layout and circuits',
      tool: 'Design Studio Pro'
    },
    { 
      id: 'plan-plumbing', 
      name: 'Plumbing Plan', 
      type: 'plan' as const, 
      icon: Layers, 
      color: 'cyan', 
      description: 'Plumbing layout and fixtures',
      tool: 'Design Studio Pro'
    },
    { 
      id: 'elevation-front', 
      name: 'Elevation - Front View', 
      type: 'elevation' as const, 
      icon: Box, 
      color: 'orange', 
      description: 'Professional front elevation drawing',
      tool: 'Design Studio Pro'
    },
    { 
      id: 'elevation-side', 
      name: 'Elevation - Side View', 
      type: 'elevation' as const, 
      icon: Box, 
      color: 'orange', 
      description: 'Side elevation drawing',
      tool: 'Design Studio Pro'
    },
    { 
      id: 'detail-cabinet', 
      name: isKitchen ? 'Cabinet Details' : 'Fixture Details', 
      type: 'detail' as const, 
      icon: Ruler, 
      color: 'green', 
      description: 'Detailed construction drawings',
      tool: 'Design Studio Pro'
    },
    { 
      id: 'detail-materials', 
      name: 'Material Specifications', 
      type: 'detail' as const, 
      icon: FileText, 
      color: 'green', 
      description: 'Material specs and finishes',
      tool: 'Design Studio Pro'
    }
  ];

  const toggleAssetSelection = (assetId: string) => {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);
  };

  const generateSelectedAssets = async () => {
    if (selectedAssets.size === 0) {
      toast.error('Please select at least one asset to generate');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    
    toast.info(`🎨 Analyzing project: ${projectTitle}`, {
      description: 'Processing work request details, photos, and project specifications...'
    });

    // Simulate AI analysis with progress
    await new Promise(resolve => setTimeout(resolve, 800));
    setGenerationProgress(20);

    toast.info('🧠 AI Processing', {
      description: `Detected: ${projectType.toUpperCase()} project | Using Design Studio Pro + AI Studio`
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    setGenerationProgress(50);

    const newAssets: DesignAsset[] = Array.from(selectedAssets).map(assetId => {
      const template = assetTemplates.find(t => t.id === assetId);
      if (!template) return null;

      // Generate professional preview with actual project context
      const context = {
        projectType,
        projectTitle,
        customerName: workRequest?.customerName || 'Customer',
        serviceDescription: workRequest?.serviceDescription || '',
        photos: projectPhotos,
        address: workRequest?.address || ''
      };
      
      let previewData: string;
      
      if (template.type === 'rendering') {
        previewData = generateProfessional3DRendering(template.name, context);
      } else if (template.type === 'plan' || template.type === 'elevation') {
        previewData = generateProfessionalFloorPlan(template.name, context);
      } else {
        previewData = generateProjectSpecificPreview(template.type, template.name, context);
      }

      return {
        id: `DA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: template.name,
        type: template.type,
        fileType: template.type === 'rendering' ? 'png' : 'dwg',
        createdDate: new Date().toISOString(),
        preview: previewData,
        metadata: {
          generatedBy: template.tool,
          projectType: projectType,
          dimensions: template.type === 'plan' ? 'Auto-calculated from measurements' : undefined,
          sourcePhotos: projectPhotos.slice(0, 3),
          aiModel: template.tool.includes('AI') ? 'GPT-4 + DALL-E 3' : 'CAD Engine'
        }
      };
    }).filter(Boolean) as DesignAsset[];

    await new Promise(resolve => setTimeout(resolve, 1200));
    setGenerationProgress(100);

    setCreatedAssets([...createdAssets, ...newAssets]);
    setSelectedAssets(new Set());
    setIsGenerating(false);
    setGenerationProgress(0);
    
    toast.success(`✅ Generated ${newAssets.length} design asset${newAssets.length > 1 ? 's' : ''}!`, {
      description: 'Assets ready for quote attachment'
    });
  };

  const generateProjectSpecificPreview = (
    type: string,
    name: string,
    context: {
      projectType: string;
      projectTitle: string;
      customerName: string;
      serviceDescription: string;
      photos: string[];
      address: string;
    }
  ) => {
    const { projectType, projectTitle, customerName, address } = context;
    
    // Determine room-specific colors and elements
    const isKitchen = projectType.includes('kitchen');
    const isBathroom = projectType.includes('bathroom');
    const isElectrical = name.includes('Electrical');
    const isPlumbing = name.includes('Plumbing');
    const isCabinet = name.includes('Cabinet') || name.includes('Fixture');
    
    if (type === 'rendering') {
      // Generate professional photorealistic 3D rendering
      const backgroundColor = isKitchen ? '#F5F5DC' : isBathroom ? '#E8F4F8' : '#F0F0F0';
      const accentColor = isKitchen ? '#8B4513' : isBathroom ? '#4A90E2' : '#696969';
      
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="1600" height="1200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#E0F6FF;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="roomGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0.1" />
            </linearGradient>
            <filter id="shadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
              <feOffset dx="3" dy="3" result="offsetblur"/>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <pattern id="tiles" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill="${backgroundColor}"/>
              <rect width="58" height="58" x="1" y="1" fill="white" opacity="0.9"/>
            </pattern>
          </defs>
          
          <!-- Background -->
          <rect width="1200" height="800" fill="url(#roomGrad)"/>
          
          ${isKitchen ? `
            <!-- Kitchen Scene -->
            <!-- Floor -->
            <rect y="600" width="1200" height="200" fill="url(#tiles)"/>
            
            <!-- Cabinets -->
            <rect x="100" y="350" width="400" height="250" fill="#8B4513" filter="url(#shadow)"/>
            <rect x="110" y="360" width="380" height="230" fill="#A0826D"/>
            
            <!-- Upper Cabinets -->
            <rect x="100" y="200" width="400" height="120" fill="#654321" filter="url(#shadow)"/>
            
            <!-- Countertop -->
            <rect x="90" y="335" width="420" height="15" fill="#D4B896" filter="url(#shadow)"/>
            
            <!-- Appliances -->
            <rect x="550" y="350" width="150" height="250" fill="#C0C0C0" stroke="#808080" stroke-width="3" filter="url(#shadow)"/>
            <text x="625" y="475" font-family="Arial" font-size="14" fill="#000" text-anchor="middle">FRIDGE</text>
            
            <rect x="750" y="450" width="120" height="150" fill="#2C3E50" stroke="#1a252f" stroke-width="3" filter="url(#shadow)"/>
            <circle cx="810" cy="525" r="35" fill="#4A4A4A"/>
            <text x="810" y="670" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">Range</text>
            
            <!-- Cabinet Hardware -->
            <circle cx="480" cy="425" r="5" fill="#DAA520"/>
            <circle cx="480" cy="500" r="5" fill="#DAA520"/>
          ` : isBathroom ? `
            <!-- Bathroom Scene -->
            <!-- Floor -->
            <rect y="600" width="1200" height="200" fill="url(#tiles)"/>
            
            <!-- Vanity -->
            <rect x="150" y="450" width="350" height="150" fill="#8B7355" filter="url(#shadow)"/>
            <rect x="160" y="440" width="330" height="15" fill="#D4B896"/>
            
            <!-- Mirror -->
            <rect x="180" y="250" width="290" height="180" fill="#E8F4F8" stroke="#4A90E2" stroke-width="4" opacity="0.7" filter="url(#shadow)"/>
            
            <!-- Sink -->
            <ellipse cx="325" cy="445" rx="60" ry="30" fill="white" stroke="#C0C0C0" stroke-width="2"/>
            
            <!-- Faucet -->
            <rect x="315" y="410" width="20" height="35" rx="10" fill="#C0C0C0"/>
            
            <!-- Shower -->
            <rect x="700" y="300" width="350" height="300" fill="#E8F4F8" stroke="#4A90E2" stroke-width="3" opacity="0.5" filter="url(#shadow)"/>
            <text x="875" y="460" font-family="Arial" font-size="16" fill="#4A90E2" text-anchor="middle">Walk-In Shower</text>
            
            <!-- Shower Head -->
            <circle cx="875" cy="320" r="15" fill="#C0C0C0"/>
          ` : `
            <!-- General Room -->
            <rect y="600" width="1200" height="200" fill="#8B7355" opacity="0.6"/>
            
            <!-- Walls -->
            <rect x="100" y="200" width="1000" height="400" fill="url(#roomGrad)" opacity="0.7"/>
            
            <!-- Window -->
            <rect x="400" y="220" width="300" height="200" fill="#87CEEB" opacity="0.6" stroke="#666" stroke-width="3"/>
          `}
          
          <!-- AI Generation Badge -->
          <rect x="20" y="20" width="280" height="60" fill="#9333ea" rx="10" filter="url(#shadow)"/>
          <text x="160" y="45" font-family="Arial" font-size="16" fill="white" text-anchor="middle" font-weight="bold">
            ✨ AI Generated Rendering
          </text>
          <text x="160" y="65" font-family="Arial" font-size="12" fill="white" text-anchor="middle" opacity="0.9">
            GPT-4 + DALL-E 3 | Design Studio Pro
          </text>
          
          <!-- Project Info -->
          <rect y="720" width="1200" height="80" fill="#000000" opacity="0.85"/>
          <text x="600" y="750" font-family="Arial" font-size="22" fill="white" text-anchor="middle" font-weight="bold">
            ${projectTitle}
          </text>
          <text x="600" y="775" font-family="Arial" font-size="14" fill="#ea580c" text-anchor="middle">
            ${customerName} | ${address}
          </text>
        </svg>
      `)}`;
    }
    
    if (type === 'plan') {
      // Generate CAD-style floor plan
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E0E0E0" stroke-width="0.5"/>
            </pattern>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <polygon points="0 0, 10 5, 0 10" fill="#FF0000"/>
            </marker>
          </defs>
          
          <!-- Background -->
          <rect width="1200" height="900" fill="white"/>
          <rect width="1200" height="900" fill="url(#grid)"/>
          
          <!-- CAD Title Block -->
          <rect x="20" y="20" width="400" height="100" fill="#0A0A0A"/>
          <text x="220" y="50" font-family="Arial" font-size="18" fill="#ea580c" text-anchor="middle" font-weight="bold">
            DESIGN STUDIO PRO
          </text>
          <text x="220" y="70" font-family="Arial" font-size="14" fill="white" text-anchor="middle">
            ${projectTitle}
          </text>
          <text x="220" y="90" font-family="Arial" font-size="11" fill="#999" text-anchor="middle">
            Project: ${workRequest?.requestNumber || 'WR-2026-XXX'} | ${new Date().toLocaleDateString()}
          </text>
          
          ${isKitchen ? `
            <!-- Kitchen Floor Plan -->
            <!-- Outer Walls -->
            <rect x="200" y="200" width="700" height="500" fill="none" stroke="#000" stroke-width="6"/>
            
            <!-- Island -->
            <rect x="400" y="400" width="200" height="120" fill="none" stroke="#000" stroke-width="3"/>
            <text x="500" y="465" font-family="Arial" font-size="14" fill="#666" text-anchor="middle">ISLAND</text>
            
            <!-- Cabinets -->
            <rect x="210" y="210" width="680" height="70" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="5,5"/>
            <text x="550" y="250" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">UPPER CABINETS</text>
            
            <!-- Appliances -->
            <rect x="210" y="300" width="80" height="80" fill="none" stroke="#000" stroke-width="2"/>
            <text x="250" y="345" font-family="Arial" font-size="11" fill="#666" text-anchor="middle">REFRIG</text>
            
            <rect x="320" y="300" width="60" height="60" fill="none" stroke="#000" stroke-width="2"/>
            <text x="350" y="335" font-family="Arial" font-size="11" fill="#666" text-anchor="middle">SINK</text>
            
            <rect x="810" y="550" width="80" height="140" fill="none" stroke="#000" stroke-width="2"/>
            <text x="850" y="625" font-family="Arial" font-size="11" fill="#666" text-anchor="middle" transform="rotate(-90 850 625)">RANGE</text>
          ` : isBathroom ? `
            <!-- Bathroom Floor Plan -->
            <!-- Outer Walls -->
            <rect x="200" y="200" width="500" height="500" fill="none" stroke="#000" stroke-width="6"/>
            
            <!-- Vanity -->
            <rect x="210" y="210" width="480" height="80" fill="none" stroke="#000" stroke-width="3"/>
            <ellipse cx="350" cy="250" rx="35" ry="25" fill="none" stroke="#000" stroke-width="2"/>
            <ellipse cx="550" cy="250" rx="35" ry="25" fill="none" stroke="#000" stroke-width="2"/>
            <text x="450" y="340" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">DOUBLE VANITY</text>
            
            <!-- Toilet -->
            <ellipse cx="300" cy="600" rx="25" ry="35" fill="none" stroke="#000" stroke-width="2"/>
            <rect x="285" y="560" width="30" height="30" fill="none" stroke="#000" stroke-width="2"/>
            <text x="300" y="650" font-family="Arial" font-size="11" fill="#666" text-anchor="middle">TOILET</text>
            
            <!-- Shower -->
            <rect x="500" y="450" width="190" height="240" fill="none" stroke="#000" stroke-width="3"/>
            <line x1="510" y1="460" x2="540" y2="490" stroke="#4A90E2" stroke-width="2"/>
            <circle cx="550" cy="470" r="10" fill="none" stroke="#4A90E2" stroke-width="2"/>
            <text x="595" y="575" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">WALK-IN</text>
            <text x="595" y="595" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">SHOWER</text>
          ` : `
            <!-- General Space -->
            <rect x="200" y="200" width="700" height="500" fill="none" stroke="#000" stroke-width="6"/>
            <line x1="200" y1="450" x2="650" y2="450" stroke="#000" stroke-width="4"/>
            <line x1="600" y1="200" x2="600" y2="700" stroke="#000" stroke-width="4"/>
            <text x="425" y="350" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">MAIN SPACE</text>
          `}
          
          <!-- Dimensions -->
          <line x1="200" y1="750" x2="900" y2="750" stroke="#FF0000" stroke-width="2" marker-end="url(#arrowhead)"/>
          <line x1="900" y1="750" x2="200" y2="750" stroke="#FF0000" stroke-width="2" marker-start="url(#arrowhead)"/>
          <text x="550" y="770" font-family="Arial" font-size="16" fill="#FF0000" text-anchor="middle" font-weight="bold">
            ${isKitchen ? '14\'-0"' : isBathroom ? '10\'-0"' : '28\'-0"'}
          </text>
          
          <!-- Professional Title Block -->
          <rect x="50" y="800" width="1100" height="80" fill="none" stroke="#000" stroke-width="3"/>
          <line x1="50" y1="840" x2="1150" y2="840" stroke="#000" stroke-width="1"/>
          <text x="600" y="825" font-family="Arial" font-size="18" fill="#000" text-anchor="middle" font-weight="bold">
            ${name}
          </text>
          <text x="150" y="862" font-family="Arial" font-size="12" fill="#666">
            SCALE: 1/4" = 1'-0"
          </text>
          <text x="600" y="862" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">
            DRAWN BY: Design Studio Pro | ${customerName}
          </text>
          <text x="1050" y="862" font-family="Arial" font-size="12" fill="#666" text-anchor="end">
            DATE: ${new Date().toLocaleDateString()}
          </text>
        </svg>
      `)}`;
    }
    
    if (type === 'elevation') {
      // Generate elevation with project context
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="material" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
              <rect width="40" height="20" fill="#D4B896"/>
              <rect width="38" height="18" x="1" y="1" fill="#E8DCC8"/>
            </pattern>
          </defs>
          
          <!-- Background -->
          <rect width="1200" height="800" fill="#F8F8F8"/>
          
          <!-- Ground Line -->
          <line x1="0" y1="650" x2="1200" y2="650" stroke="#000" stroke-width="3"/>
          
          ${isKitchen ? `
            <!-- Kitchen Elevation -->
            <rect x="200" y="300" width="800" height="350" fill="url(#material)" stroke="#000" stroke-width="4"/>
            
            <!-- Cabinet Doors -->
            <rect x="220" y="320" width="120" height="150" fill="none" stroke="#000" stroke-width="2"/>
            <circle cx="325" cy="395" r="6" fill="#DAA520"/>
            
            <rect x="360" y="320" width="120" height="150" fill="none" stroke="#000" stroke-width="2"/>
            <circle cx="465" cy="395" r="6" fill="#DAA520"/>
            
            <rect x="500" y="320" width="120" height="150" fill="none" stroke="#000" stroke-width="2"/>
            <circle cx="605" cy="395" r="6" fill="#DAA520"/>
            
            <!-- Countertop -->
            <rect x="200" y="480" width="800" height="20" fill="#696969" stroke="#000" stroke-width="2"/>
            
            <!-- Base Cabinets -->
            <rect x="220" y="510" width="360" height="140" fill="none" stroke="#000" stroke-width="2"/>
            <rect x="620" y="510" width="360" height="140" fill="none" stroke="#000" stroke-width="2"/>
            
            <!-- Appliances -->
            <rect x="590" y="510" width="20" height="140" fill="#C0C0C0" stroke="#000" stroke-width="1"/>
          ` : isBathroom ? `
            <!-- Bathroom Elevation -->
            <rect x="200" y="350" width="800" height="300" fill="url(#material)" stroke="#000" stroke-width="4"/>
            
            <!-- Mirror -->
            <rect x="350" y="380" width="500" height="200" fill="#E8F4F8" stroke="#4A90E2" stroke-width="3" opacity="0.7"/>
            
            <!-- Vanity -->
            <rect x="300" y="590" width="600" height="60" fill="#8B7355" stroke="#000" stroke-width="2"/>
            
            <!-- Sinks -->
            <ellipse cx="450" cy="620" rx="40" ry="20" fill="white" stroke="#000" stroke-width="2"/>
            <ellipse cx="750" cy="620" rx="40" ry="20" fill="white" stroke="#000" stroke-width="2"/>
            
            <!-- Faucets -->
            <line x1="450" y1="600" x2="450" y2="580" stroke="#C0C0C0" stroke-width="4"/>
            <line x1="750" y1="600" x2="750" y2="580" stroke="#C0C0C0" stroke-width="4"/>
          ` : `
            <!-- General Elevation -->
            <rect x="200" y="300" width="800" height="350" fill="url(#material)" stroke="#000" stroke-width="4"/>
            
            <!-- Features -->
            <rect x="400" y="380" width="120" height="180" fill="#E8F4F8" stroke="#000" stroke-width="2"/>
            <rect x="680" y="380" width="120" height="180" fill="#E8F4F8" stroke="#000" stroke-width="2"/>
          `}
          
          <!-- Dimension Lines -->
          <line x1="180" y1="300" x2="180" y2="650" stroke="#FF0000" stroke-width="2"/>
          <line x1="175" y1="300" x2="185" y2="300" stroke="#FF0000" stroke-width="2"/>
          <line x1="175" y1="650" x2="185" y2="650" stroke="#FF0000" stroke-width="2"/>
          <text x="160" y="480" font-family="Arial" font-size="14" fill="#FF0000" text-anchor="middle" transform="rotate(-90 160 480)">
            ${isKitchen ? '8\'-6"' : isBathroom ? '8\'-0"' : '11\'-0"'}
          </text>
          
          <!-- Title -->
          <rect x="50" y="700" width="1100" height="80" fill="white" stroke="#000" stroke-width="2"/>
          <text x="600" y="735" font-family="Arial" font-size="20" fill="#000" text-anchor="middle" font-weight="bold">
            ${name} - ${projectTitle}
          </text>
          <text x="600" y="760" font-family="Arial" font-size="13" fill="#666" text-anchor="middle">
            Customer: ${customerName} | Generated by Design Studio Pro
          </text>
        </svg>
      `)}`;
    }
    
    // Detail drawings
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="1000" height="800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="detailGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#DDD" stroke-width="0.5"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="1000" height="800" fill="white"/>
        <rect width="1000" height="800" fill="url(#detailGrid)"/>
        
        <!-- Detail Circle -->
        <circle cx="500" cy="320" r="180" fill="none" stroke="#ea580c" stroke-width="4"/>
        <text x="500" y="170" font-family="Arial" font-size="24" fill="#ea580c" text-anchor="middle" font-weight="bold">
          DETAIL ${isKitchen ? 'A' : isBathroom ? 'B' : 'C'}
        </text>
        
        <!-- Detail Drawing -->
        ${isKitchen ? `
          <!-- Cabinet Detail -->
          <rect x="350" y="200" width="300" height="240" fill="none" stroke="#000" stroke-width="3"/>
          <line x1="350" y1="260" x2="650" y2="260" stroke="#000" stroke-width="2"/>
          <line x1="350" y1="320" x2="650" y2="320" stroke="#000" stroke-width="2"/>
          <line x1="350" y1="380" x2="650" y2="380" stroke="#000" stroke-width="2"/>
          
          <!-- Hardware -->
          <circle cx="630" cy="230" r="5" fill="#DAA520"/>
          <circle cx="630" cy="290" r="5" fill="#DAA520"/>
          <circle cx="630" cy="350" r="5" fill="#DAA520"/>
          <circle cx="630" cy="410" r="5" fill="#DAA520"/>
        ` : `
          <!-- Fixture Detail -->
          <rect x="400" y="250" width="200" height="140" fill="none" stroke="#000" stroke-width="3"/>
          <ellipse cx="500" cy="320" rx="60" ry="30" fill="none" stroke="#000" stroke-width="2"/>
          <line x1="500" y1="280" x2="500" y2="250" stroke="#000" stroke-width="2"/>
        `}
        
        <!-- Callouts -->
        <line x1="420" y1="240" x2="250" y2="150" stroke="#0066CC" stroke-width="2"/>
        <circle cx="420" cy="240" r="4" fill="#0066CC"/>
        <text x="150" y="145" font-family="Arial" font-size="13" fill="#0066CC" font-weight="bold">
          ${isKitchen ? 'MAPLE WOOD FINISH' : 'CERAMIC FINISH'}
        </text>
        
        <line x1="600" y1="300" x2="750" y2="220" stroke="#0066CC" stroke-width="2"/>
        <circle cx="600" cy="300" r="4" fill="#0066CC"/>
        <text x="760" y="225" font-family="Arial" font-size="13" fill="#0066CC" font-weight="bold">
          ${isKitchen ? 'SOFT-CLOSE HINGES' : 'PREMIUM HARDWARE'}
        </text>
        
        <!-- Dimensions -->
        <line x1="680" y1="200" x2="680" y2="440" stroke="#FF0000" stroke-width="2"/>
        <line x1="675" y1="200" x2="685" y2="200" stroke="#FF0000" stroke-width="2"/>
        <line x1="675" y1="440" x2="685" y2="440" stroke="#FF0000" stroke-width="2"/>
        <text x="710" y="325" font-family="Arial" font-size="14" fill="#FF0000" font-weight="bold">24"</text>
        
        <!-- Title Block -->
        <rect x="50" y="520" width="900" height="240" fill="white" stroke="#000" stroke-width="2"/>
        <text x="500" y="560" font-family="Arial" font-size="22" fill="#000" text-anchor="middle" font-weight="bold">
          ${name}
        </text>
        <text x="500" y="590" font-family="Arial" font-size="15" fill="#666" text-anchor="middle">
          ${projectTitle} - ${customerName}
        </text>
        <text x="500" y="615" font-family="Arial" font-size="13" fill="#999" text-anchor="middle">
          SCALE: 1" = 1'-0" | Generated by Design Studio Pro
        </text>
        
        <!-- Material Specifications -->
        <text x="80" y="650" font-family="Arial" font-size="14" fill="#000" font-weight="bold">MATERIALS & SPECIFICATIONS:</text>
        ${isKitchen ? `
          <text x="80" y="675" font-family="Arial" font-size="11" fill="#666">• Cabinet Body: 3/4" Maple Plywood, Grade A</text>
          <text x="80" y="695" font-family="Arial" font-size="11" fill="#666">• Finish: Clear Polyurethane, 3 coats with sanding between</text>
          <text x="80" y="715" font-family="Arial" font-size="11" fill="#666">• Hardware: Soft-close concealed hinges, Blum brand</text>
          <text x="80" y="735" font-family="Arial" font-size="11" fill="#666">• Installation: Professional mounting per manufacturer specs</text>
        ` : `
          <text x="80" y="675" font-family="Arial" font-size="11" fill="#666">• Fixture Body: Ceramic, premium grade</text>
          <text x="80" y="695" font-family="Arial" font-size="11" fill="#666">• Finish: Glazed white, easy-clean surface</text>
          <text x="80" y="715" font-family="Arial" font-size="11" fill="#666">• Hardware: Chrome-plated brass fittings</text>
          <text x="80" y="735" font-family="Arial" font-size="11" fill="#666">• Installation: Professional plumbing installation required</text>
        `}
      </svg>
    `)}`;
  };

  const deleteAsset = (assetId: string) => {
    setCreatedAssets(createdAssets.filter(a => a.id !== assetId));
    toast.success('Asset removed');
  };

  const attachAssetsToQuote = () => {
    if (createdAssets.length === 0) {
      toast.error('No assets to attach');
      return;
    }
    onAssetsCreated(createdAssets);
    toast.success(`Attached ${createdAssets.length} design asset${createdAssets.length > 1 ? 's' : ''} to quote`);
    onClose();
  };

  const openInDesignStudio = () => {
    if (!onNavigateToCAD || !quoteId) {
      toast.error('Navigation not configured');
      return;
    }
    
    // Prepare quote context data to pass to Design Studio Pro
    const quoteContext = {
      quoteId,
      projectTitle,
      workRequest,
      projectPhotos,
      projectVideos,
      existingAssets: createdAssets
    };
    
    toast.success('Opening Design Studio Pro...', {
      description: 'Loading project in professional CAD workspace'
    });
    
    // Navigate to Design Studio Pro with quote context
    onNavigateToCAD(quoteId, quoteContext);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
              <Palette className="w-7 h-7 text-[#ea580c]" />
              Enterprise Design Asset Creator
            </h2>
            <p className="text-gray-400">
              AI-Powered • Design Studio Pro • {projectTitle}
            </p>
            {workRequest && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-500">
                  <span className="text-[#ea580c] font-semibold">{workRequest.customerName}</span>
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-500">{workRequest.serviceCategory}</span>
                {projectPhotos.length > 0 && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-green-400 flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {projectPhotos.length} photo{projectPhotos.length > 1 ? 's' : ''} available
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openInDesignStudio}
              className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium text-sm"
            >
              <Layout className="w-4 h-4" />
              Open in Design Studio
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-[#2A2A2A]">
          {[
            { id: 'create', label: 'Quick Generate', icon: Sparkles },
            { id: 'ai-generate', label: 'AI Studio', icon: Brain },
            { id: 'cad', label: 'CAD Designer', icon: Ruler },
            { id: 'photos', label: 'Project Media', icon: Camera }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'text-[#ea580c] border-[#ea580c]'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'create' && (
            <>
              {/* Quick Generate Tab */}
              {createdAssets.length === 0 || selectedAssets.size > 0 ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Select Assets to Generate</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Powered by AI Content Studio + Design Studio Pro
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        {selectedAssets.size} selected
                      </span>
                      {selectedAssets.size > 0 && (
                        <button
                          onClick={() => setSelectedAssets(new Set())}
                          className="text-xs text-[#ea580c] hover:text-[#c2410c] font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {assetTemplates.map((template) => {
                      const Icon = template.icon;
                      const isSelected = selectedAssets.has(template.id);
                      const alreadyCreated = createdAssets.some(a => 
                        a.name === template.name
                      );

                      return (
                        <button
                          key={template.id}
                          onClick={() => !alreadyCreated && toggleAssetSelection(template.id)}
                          disabled={alreadyCreated}
                          className={`p-4 rounded-xl border-2 transition-all text-left relative ${
                            alreadyCreated
                              ? 'border-green-500/30 bg-green-600/10 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'border-[#ea580c] bg-[#ea580c]/10'
                              : 'border-[#2A2A2A] hover:border-[#ea580c]/50 bg-[#1A1A1A]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Icon className={`w-6 h-6 ${
                              alreadyCreated ? 'text-green-400' :
                              isSelected ? 'text-[#ea580c]' : 'text-gray-400'
                            }`} />
                            {isSelected && !alreadyCreated && (
                              <Check className="w-5 h-5 text-[#ea580c]" />
                            )}
                            {alreadyCreated && (
                              <Check className="w-5 h-5 text-green-400" />
                            )}
                          </div>
                          <p className={`text-sm font-semibold mb-1 ${
                            isSelected ? 'text-white' : 'text-gray-300'
                          }`}>
                            {template.name}
                          </p>
                          <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                          <p className="text-xs text-[#ea580c] font-medium">{template.tool}</p>
                          {alreadyCreated && (
                            <span className="text-xs text-green-400 mt-2 block">✓ Created</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedAssets.size > 0 && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={generateSelectedAssets}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition-all shadow-lg shadow-[#ea580c]/20 font-bold disabled:opacity-50 relative overflow-hidden"
                      >
                        {isGenerating ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Generating... {generationProgress}%</span>
                            <div 
                              className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                              style={{ width: `${generationProgress}%` }}
                            />
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-5 h-5" />
                            Generate {selectedAssets.size} Asset{selectedAssets.size > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Created Assets */}
              {createdAssets.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#ea580c]" />
                      Generated Assets ({createdAssets.length})
                    </h3>
                    <button
                      onClick={() => setSelectedAssets(new Set())}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add More Assets
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {createdAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden hover:border-[#ea580c]/30 transition group"
                      >
                        {/* Preview */}
                        <div 
                          className="relative w-full h-56 bg-[#2A2A2A] cursor-pointer"
                          onClick={() => setPreviewAsset(asset)}
                        >
                          {asset.preview ? (
                            <img
                              src={asset.preview}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {asset.type === 'rendering' ? (
                                <ImageIcon className="w-12 h-12 text-gray-600" />
                              ) : (
                                <Layers className="w-12 h-12 text-gray-600" />
                              )}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Preview
                            </button>
                          </div>
                          <span className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-semibold ${
                            asset.type === 'rendering' ? 'bg-purple-600 text-white' :
                            asset.type === 'plan' ? 'bg-blue-600 text-white' :
                            asset.type === 'elevation' ? 'bg-orange-600 text-white' :
                            'bg-green-600 text-white'
                          }`}>
                            {asset.type.toUpperCase()}
                          </span>
                          {asset.metadata?.generatedBy && (
                            <span className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-semibold bg-black/70 text-white">
                              {asset.metadata.generatedBy}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h4 className="font-semibold text-white mb-1">{asset.name}</h4>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>{asset.fileType.toUpperCase()}</span>
                            <span>{new Date(asset.createdDate).toLocaleDateString()}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewAsset(asset)}
                              className="flex-1 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 hover:text-white rounded-lg transition text-xs font-medium flex items-center justify-center gap-1"
                            >
                              <Maximize2 className="w-3 h-3" />
                              View
                            </button>
                            <button
                              onClick={() => deleteAsset(asset.id)}
                              className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition text-xs font-medium flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'ai-generate' && (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-[#ea580c] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">AI Content Studio</h3>
              <p className="text-gray-400 mb-6">Advanced AI rendering with DALL-E 3 and GPT-4</p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium">
                Launch AI Studio
              </button>
            </div>
          )}

          {activeTab === 'cad' && (
            <div className="text-center py-12">
              <Ruler className="w-16 h-16 text-[#ea580c] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Professional CAD Designer</h3>
              <p className="text-gray-400 mb-6">Full 2D/3D CAD workspace for detailed drawings</p>
              <button 
                onClick={openInDesignStudio}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
              >
                Open Design Studio Pro
              </button>
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Project Media</h3>
              {projectPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {projectPhotos.map((photo, idx) => (
                    <div key={idx} className="bg-[#1A1A1A] rounded-lg p-2 border border-[#2A2A2A]">
                      <div className="text-sm text-gray-400 text-center">Photo {idx + 1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No project photos available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="text-sm text-gray-400">
            {createdAssets.length} asset{createdAssets.length !== 1 ? 's' : ''} ready to attach
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={attachAssetsToQuote}
              disabled={createdAssets.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-xl hover:from-[#c2410c] hover:to-[#9a3412] transition-all shadow-lg shadow-[#ea580c]/20 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Attach to Quote ({createdAssets.length})
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewAsset && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6"
          onClick={() => setPreviewAsset(null)}
        >
          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <div>
                  <h3 className="font-bold text-white">{previewAsset.name}</h3>
                  {previewAsset.metadata && (
                    <p className="text-sm text-gray-400 mt-1">
                      Generated by: {previewAsset.metadata.generatedBy} | {previewAsset.metadata.projectType}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-auto">
                {previewAsset.preview && (
                  <img
                    src={previewAsset.preview}
                    alt={previewAsset.name}
                    className="w-full h-auto rounded-lg"
                  />
                )}
              </div>
              <div className="flex items-center justify-center gap-3 p-4 border-t border-[#2A2A2A]">
                <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <PrimaryButton
                  onClick={() => {
                    openInDesignCenter();
                  }}
                >
                  <Palette className="w-4 h-4" />
                  Edit in Design Center
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
