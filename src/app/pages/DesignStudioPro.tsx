// Design Studio Pro - AI-Powered Floor Plan Design Center (Phase 1)
import { useState, useRef, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import FloorPlan3DViewer from '../components/FloorPlan3DViewer';
import AIVideoUpload from '../components/AIVideoUpload';
import ExportFloorPlanModal from '../components/ExportFloorPlanModal';
import MultiStoryManager from '../components/MultiStoryManager';
import FurnitureLibrary from '../components/FurnitureLibrary';
import MEPLibrary from '../components/MEPLibrary';
import RenderingPanel from '../components/RenderingPanel';
import RenderEngine from '../components/RenderEngine';
import ProjectSelector from '../components/ProjectSelector';
import ProjectInfoPanel from '../components/ProjectInfoPanel';
import FloorPlanMeasurementsPanel from '../components/FloorPlanMeasurementsPanel';
import { AutoDetectionTools } from '../components/AutoDetectionTools';
import BuildingCodeChecker from '../components/BuildingCodeChecker';
import AdvancedCanvasTools from '../components/AdvancedCanvasTools';
import CanvasMinimap from '../components/CanvasMinimap';
import CanvasRulers from '../components/CanvasRulers';
import CanvasCoordinates from '../components/CanvasCoordinates';
import SmartGuides from '../components/SmartGuides';
import { SnapIndicator } from '../components/SnapIndicator';
import LassoSelection from '../components/LassoSelection';
import CanvasContextMenu from '../components/CanvasContextMenu';
import QuickActionsToolbar from '../components/QuickActionsToolbar';
import CanvasStatusBar from '../components/CanvasStatusBar';
import WallToolOverlay from '../components/WallToolOverlay';
import EraseToolOverlay from '../components/EraseToolOverlay';
import UndoRedoPanel from '../components/UndoRedoPanel';
import EnhancedDrawingTools from '../components/EnhancedDrawingTools';
import KitchenCabinetDesigner from '../components/KitchenCabinetDesigner';
import ConstructionScheduleGenerator from '../components/ConstructionScheduleGenerator';
import BlueprintAnalyzer from '../components/BlueprintAnalyzer';
import SmartRoomDetector from '../components/SmartRoomDetector';
import QuoteContextPanel from '../components/QuoteContextPanel';
import UserContextSelector from '../components/UserContextSelector';
import * as AutoLayout from '../components/AutoLayoutEngine';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  UserContext,
  getMockUserContext,
  saveToUserStorage,
  loadFromUserStorage,
  exportUserData,
  DESIGN_STUDIO_KEYS
} from '../lib/userStorageManager';
import {
  saveDesignProject,
  ownerKeyFor,
  listDesignProjects,
  getDesignProject,
  restoreDesignProjectVersion,
  type VersionMeta,
} from '../lib/designProjectService';
import type { RenderSettings, Material } from '../components/RenderingPanel';
import type { AdvancedTool, AdvancedAction } from '../components/AdvancedCanvasTools';
import type { ContextMenuAction } from '../components/CanvasContextMenu';
import * as AdvancedTools from '../utils/advancedCanvasTools';
import {
  Ruler,
  Square,
  Circle,
  Move,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Trash2,
  Download,
  Upload,
  Video,
  Camera,
  Undo,
  Redo,
  Save,
  FolderOpen,
  Settings,
  Layers,
  Home,
  DoorOpen,
  SquareDashed,
  Box,
  Maximize,
  Sparkles,
  Building2,
  Package,
  Zap,
  Droplets,
  Eye,
  EyeOff,
  Pentagon,
  Type,
  Pencil,
  Minus,
  Spline,
  ArrowRightLeft,
  MessageSquare,
  RotateCw,
  MoveVertical,
  ArrowLeft,
  Wand2,
  Shield,
  Calendar,
  FileUp,
  User,
  History,
  RotateCcw,
  Loader2
} from 'lucide-react';

interface DesignStudioProProps {
  onNavigate: (page: string) => void;
}

type Tool = 'select' | 'wall' | 'door' | 'window' | 'room' | 'measure' | 'electrical' | 'plumbing' | 'circle' | 'polygon' | 'line' | 'arc' | 'bezier' | 'text' | 'dimension' | 'leader';

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
  subtype?: string; // For electrical: 'outlet', 'switch', 'light', 'panel', 'junction', 'wire'
                    // For plumbing: 'sink', 'toilet', 'shower', 'pipe-hot', 'pipe-cold', 'pipe-drain', 'valve'
                    // For shapes: 'circle', 'polygon', 'line', 'arc', 'bezier'
                    // For annotations: 'text', 'dimension-line', 'leader'
  connectionPoints?: { id: string; x: number; y: number }[]; // For wires and pipes
  connectedTo?: string[]; // IDs of connected elements
  layerId?: string; // Layer assignment
  groupId?: string; // Group membership
  // Shape-specific properties
  sides?: number; // For polygon
  radius?: number; // For circle/arc
  startAngle?: number; // For arc
  endAngle?: number; // For arc
  points?: { x: number; y: number }[]; // For bezier curves and dimension/leader lines
  text?: string; // For text annotations
  fontSize?: number; // For text
  fontFamily?: string; // For text
  // Dimension-specific properties
  startPoint?: { x: number; y: number }; // For dimension lines
  endPoint?: { x: number; y: number }; // For dimension lines
  dimensionOffset?: number; // Offset from measured elements
  showUnits?: boolean; // Show measurement units
  // 3D properties
  wallHeight?: number; // Height for walls in 3D view (default 96 inches / 8 feet)
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

interface Group {
  id: string;
  name: string;
  elementIds: string[];
}

interface Project {
  id: string;
  name: string;
  elements: CanvasElement[];
  lastModified: Date;
}

function DesignStudioProInner({ onNavigate }: DesignStudioProProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElements, setSelectedElements] = useState<string[]>([]); // Multi-select support
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]); // Copy/paste clipboard
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false); // Default OFF for precise placement
  const [snapToElements, setSnapToElements] = useState(true); // Snap to other elements
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number; type: string }[]>([]); // Visual snap guides
  const [snapThreshold] = useState(10); // Snap distance in pixels
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [showAIUpload, setShowAIUpload] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMultiStory, setShowMultiStory] = useState(false);
  const [showFurnitureLibrary, setShowFurnitureLibrary] = useState(false);
  const [showMEPLibrary, setShowMEPLibrary] = useState(false);
  const [showRenderingPanel, setShowRenderingPanel] = useState(false);
  const [showRenderEngine, setShowRenderEngine] = useState(false);
  const [showAutoDetectionTools, setShowAutoDetectionTools] = useState(false);
  const [showBuildingCodeChecker, setShowBuildingCodeChecker] = useState(false);
  const [renderSettings, setRenderSettings] = useState<RenderSettings | null>(null);
  const [showElectricalOverlay, setShowElectricalOverlay] = useState(true);
  const [showPlumbingOverlay, setShowPlumbingOverlay] = useState(true);
  
  // New Design Tools
  const [showKitchenDesigner, setShowKitchenDesigner] = useState(false);
  const [showScheduleGenerator, setShowScheduleGenerator] = useState(false);
  const [showBlueprintAnalyzer, setShowBlueprintAnalyzer] = useState(false);
  const [showSmartRoomDetector, setShowSmartRoomDetector] = useState(false);
  const [showAutoLayoutPanel, setShowAutoLayoutPanel] = useState(false);
  
  // Quote Integration
  const [activeQuote, setActiveQuote] = useState<any | null>(null);
  const [showQuotePanel, setShowQuotePanel] = useState(false);
  
  // Project Management
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [currentProject, setCurrentProject] = useState<any | null>(null);
  const [showMeasurementsPanel, setShowMeasurementsPanel] = useState(true);
  
  // User Context & Folder Isolation
  const [userContext, setUserContext] = useState<UserContext>(getMockUserContext());
  const [showUserContextSelector, setShowUserContextSelector] = useState(false);
  
  // Advanced Canvas Features
  const [advancedTool, setAdvancedTool] = useState<AdvancedTool | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [units, setUnits] = useState<'inches' | 'feet' | 'meters'>('inches');
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const [showSmartGuides, setShowSmartGuides] = useState(true);
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number; type: 'grid' | 'element' | 'intersection' | null }>({ x: 0, y: 0, type: null });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [quickToolbar, setQuickToolbar] = useState<{ x: number; y: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wallSnapToAngle, setWallSnapToAngle] = useState(true);
  const [eraseMode, setEraseMode] = useState<'single' | 'multiple' | 'brush'>('single');
  const [eraseSelection, setEraseSelection] = useState<any[]>([]);
  const [hoveredElement, setHoveredElement] = useState<any | null>(null);
  
  // Layers & Groups
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-default', name: 'Default', visible: true, locked: false, color: '#ea580c' },
    { id: 'layer-walls', name: 'Walls', visible: true, locked: false, color: '#3b82f6' },
    { id: 'layer-furniture', name: 'Furniture', visible: true, locked: false, color: '#10b981' },
    { id: 'layer-mep', name: 'MEP', visible: true, locked: false, color: '#f59e0b' },
  ]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [floors, setFloors] = useState([
    { id: 'floor-1', name: 'Ground Floor', level: 1, elements: [], visible: true, locked: false }
  ]);
  const [currentFloorId, setCurrentFloorId] = useState('floor-1');
  const [measurements, setMeasurements] = useState<{ label: string; value: string }[]>([]);
  const [showMeasurements, setShowMeasurements] = useState(true); // Toggle for measurements visibility
  const [showAllMeasurements, setShowAllMeasurements] = useState(false); // Show measurements on all elements
  
  // History for undo/redo
  const [history, setHistory] = useState<typeof floors[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isPanning, setIsPanning] = useState(false); // Spacebar pan mode
  
  // Wall drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [continuousWallMode, setContinuousWallMode] = useState(false); // New: continuous wall drawing
  const [lastWallEndPoint, setLastWallEndPoint] = useState<{ x: number; y: number } | null>(null); // New: track last endpoint
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [editingDimensions, setEditingDimensions] = useState({ width: '', height: '' });
  
  // Dimension drawing state
  const [dimensionStart, setDimensionStart] = useState<{ x: number; y: number } | null>(null);
  const [dimensionPreview, setDimensionPreview] = useState<{ x: number; y: number } | null>(null);

  // 3D View state
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [cameraRotation, setCameraRotation] = useState(45); // Degrees around Z-axis
  const [cameraPitch, setCameraPitch] = useState(30); // Degrees of tilt

  // Drag and resize state
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'tl', 'tr', 'bl', 'br', 'left', 'right'
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [originalElement, setOriginalElement] = useState<CanvasElement | null>(null);
  
  // Multi-select drag box state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStart, setRotationStart] = useState(0);
  const [editingRotation, setEditingRotation] = useState('');
  
  // Wall thickness settings
  const [defaultWallThickness, setDefaultWallThickness] = useState(4); // inches (standard 2x4 wall)
  const [editingThickness, setEditingThickness] = useState('');
  
  const gridSize = 20;

  // Load floor plan data from URL parameters (Work Request & Quote Integration)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const floorPlanParam = urlParams.get('floorPlan');
    const workRequestParam = urlParams.get('workRequest');
    const quoteParam = urlParams.get('quote');
    const quoteIdParam = urlParams.get('quoteId');
    
    // Load from Quote (priority)
    if (quoteParam && quoteIdParam) {
      try {
        const quoteData = JSON.parse(decodeURIComponent(quoteParam));
        
        // Set active quote
        setActiveQuote(quoteData);
        setShowQuotePanel(true);
        
        // Load floor plan if exists in quote
        if (quoteData.floorPlanData && quoteData.floorPlanData.elements) {
          setFloors([{
            id: 'floor-1',
            name: `${quoteData.projectTitle} - Floor Plan`,
            level: 1,
            elements: quoteData.floorPlanData.elements.map((el: any) => ({
              ...el,
              color: el.type === 'wall' ? '#3b82f6' : 
                     el.type === 'door' ? '#10b981' : 
                     el.type === 'window' ? '#f59e0b' : 
                     el.type === 'room' ? '#ea580c' : '#6b7280'
            })),
            visible: true,
            locked: false
          }]);
          
          toast.success('Quote design loaded!', {
            description: `${quoteData.quoteNumber}: ${quoteData.projectTitle}`
          });
        } else {
          toast.info('Quote loaded - No existing design', {
            description: 'Start creating the floor plan design'
          });
        }
        
        setStatusMessage({
          text: `Quote ${quoteData.quoteNumber} loaded - Make your design changes`,
          type: 'info'
        });
        
        setTimeout(() => setStatusMessage(null), 5000);
        
      } catch (error) {
        console.error('Failed to load quote data from URL:', error);
        toast.error('Failed to load quote data', {
          description: 'Invalid quote format'
        });
      }
    }
    // Load from Work Request (fallback)
    else if (floorPlanParam && workRequestParam) {
      try {
        const floorPlanData = JSON.parse(decodeURIComponent(floorPlanParam));
        const workRequestData = JSON.parse(decodeURIComponent(workRequestParam));
        
        // Load floor plan elements onto the canvas
        setFloors([{
          id: 'floor-1',
          name: `${workRequestData.title} - Floor Plan`,
          level: 1,
          elements: floorPlanData.elements.map((el: any) => ({
            ...el,
            color: el.type === 'wall' ? '#3b82f6' : 
                   el.type === 'door' ? '#10b981' : 
                   el.type === 'window' ? '#f59e0b' : 
                   el.type === 'room' ? '#ea580c' : '#6b7280'
          })),
          visible: true,
          locked: false
        }]);
        
        toast.success('Floor plan loaded from work request!', {
          description: `${workRequestData.requestNumber}: ${workRequestData.title}`
        });
        
        // Show success status message
        setStatusMessage({
          text: `Loaded: ${workRequestData.title} (${floorPlanData.elements.length} elements)`,
          type: 'success'
        });
        
        // Clear status after 5 seconds
        setTimeout(() => setStatusMessage(null), 5000);
        
      } catch (error) {
        console.error('Failed to load floor plan from URL:', error);
        toast.error('Failed to load floor plan data', {
          description: 'Invalid floor plan format'
        });
      }
    }
  }, []); // Run once on mount

  // Save a plan/rendering image to the active quote as a buildable deliverable.
  const [savingDeliverable, setSavingDeliverable] = useState(false);
  const saveDeliverableToQuote = async (dataUrl: string, name: string, kind: 'plan' | 'rendering') => {
    if (!activeQuote?.quoteId) {
      toast.error('Open this design from a quote first to attach deliverables.');
      return;
    }
    if (!dataUrl) {
      toast.error('Nothing to capture yet — draw or render something first.');
      return;
    }
    setSavingDeliverable(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/quotes/${activeQuote.quoteId}/deliverables`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ name, kind, dataUrl }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || `Save failed with ${res.status}`);
      toast.success(`${kind === 'plan' ? 'Plan' : 'Rendering'} attached to quote ${activeQuote.quoteNumber || ''}`.trim());
    } catch (error) {
      console.error('[DesignStudio] Error saving deliverable:', error);
      toast.error(`Could not attach ${kind}: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setSavingDeliverable(false);
    }
  };

  // Capture the current 2D floor-plan canvas and attach it as a plan.
  const savePlanToQuote = () => {
    const canvas = canvasRef.current;
    if (!canvas) { toast.error('Canvas not ready.'); return; }
    const dataUrl = canvas.toDataURL('image/png');
    saveDeliverableToQuote(dataUrl, `${activeQuote?.projectTitle || 'floor-plan'}`, 'plan');
  };

  // Convert decimal inches to architectural format (feet-inches-sixteenths)
  const inchesToArchitectural = (totalInches: number): string => {
    const feet = Math.floor(totalInches / 12);
    const remainingInches = totalInches % 12;
    const wholeInches = Math.floor(remainingInches);
    const fraction = remainingInches - wholeInches;
    
    // Convert to sixteenths
    const sixteenths = Math.round(fraction * 16);
    
    // Simplify fraction
    const getFraction = (sixteenths: number): string => {
      if (sixteenths === 0) return '';
      if (sixteenths === 16) return '';
      if (sixteenths === 8) return ' 1/2';
      if (sixteenths === 4) return ' 1/4';
      if (sixteenths === 12) return ' 3/4';
      if (sixteenths === 2) return ' 1/8';
      if (sixteenths === 6) return ' 3/8';
      if (sixteenths === 10) return ' 5/8';
      if (sixteenths === 14) return ' 7/8';
      if (sixteenths === 1) return ' 1/16';
      if (sixteenths === 3) return ' 3/16';
      if (sixteenths === 5) return ' 5/16';
      if (sixteenths === 7) return ' 7/16';
      if (sixteenths === 9) return ' 9/16';
      if (sixteenths === 11) return ' 11/16';
      if (sixteenths === 13) return ' 13/16';
      if (sixteenths === 15) return ' 15/16';
      return ` ${sixteenths}/16`;
    };
    
    const fractionStr = getFraction(sixteenths);
    const adjustedWholeInches = sixteenths === 16 ? wholeInches + 1 : wholeInches;
    const adjustedFeet = adjustedWholeInches === 12 ? feet + 1 : feet;
    const finalInches = adjustedWholeInches === 12 ? 0 : adjustedWholeInches;
    
    if (adjustedFeet === 0) {
      return `${finalInches}${fractionStr}"`;
    } else {
      return `${adjustedFeet}'-${finalInches}${fractionStr}"`;
    }
  };

  // Parse architectural format to decimal inches
  const architecturalToInches = (input: string): number => {
    try {
      // Handle formats like: 12'-3 5/16", 12-3.5, 12.5, 150, etc.
      let totalInches = 0;
      
      // Remove quotes and normalize
      input = input.replace(/"/g, '').replace(/'/g, '-').trim();
      
      // Check for feet-inches format (12-3, 12-3.5, etc)
      if (input.includes('-')) {
        const parts = input.split('-');
        const feet = parseFloat(parts[0]) || 0;
        totalInches = feet * 12;
        
        if (parts[1]) {
          // Handle fraction in inches part
          if (parts[1].includes('/')) {
            const inchParts = parts[1].split(' ');
            totalInches += parseFloat(inchParts[0]) || 0;
            if (inchParts[1] && inchParts[1].includes('/')) {
              const [num, den] = inchParts[1].split('/');
              totalInches += parseFloat(num) / parseFloat(den);
            }
          } else {
            totalInches += parseFloat(parts[1]) || 0;
          }
        }
      } else if (input.includes('/')) {
        // Just a fraction (like "3/4")
        const parts = input.split(' ');
        if (parts.length > 1) {
          totalInches = parseFloat(parts[0]) || 0;
          const [num, den] = parts[1].split('/');
          totalInches += parseFloat(num) / parseFloat(den);
        } else {
          const [num, den] = input.split('/');
          totalInches = parseFloat(num) / parseFloat(den);
        }
      } else {
        // Just a number (assume inches)
        totalInches = parseFloat(input) || 0;
      }
      
      return totalInches;
    } catch (e) {
      return 0;
    }
  };

  // 3D Isometric Projection Functions
  const project3D = (x: number, y: number, z: number): { x: number; y: number } => {
    // Convert rotation to radians
    const rotRad = (cameraRotation * Math.PI) / 180;
    const pitchRad = (cameraPitch * Math.PI) / 180;
    
    // Rotate around Z-axis
    const x1 = x * Math.cos(rotRad) - y * Math.sin(rotRad);
    const y1 = x * Math.sin(rotRad) + y * Math.cos(rotRad);
    const z1 = z;
    
    // Apply isometric projection with pitch
    const isoX = x1 - y1;
    const isoY = (x1 + y1) * 0.5 - z1 * Math.sin(pitchRad);
    
    return { x: isoX, y: isoY };
  };

  // Get current floor elements
  const currentFloor = floors.find(f => f.id === currentFloorId);
  const elements = currentFloor ? currentFloor.elements : [];

  // Resolve which layer an element belongs to. Falls back to a sensible layer by
  // element type when the element has no explicit layerId, so the Layers panel
  // governs every element on the canvas — not just ones tagged at creation.
  const layerForElement = (el?: CanvasElement | null): Layer | undefined => {
    if (!el) return undefined;
    if (el.layerId) {
      const found = layers.find(l => l.id === el.layerId);
      if (found) return found;
    }
    const byType =
      el.type === 'wall' ? 'layer-walls' :
      el.type === 'furniture' ? 'layer-furniture' :
      (el.type === 'electrical' || el.type === 'plumbing') ? 'layer-mep' :
      'layer-default';
    return layers.find(l => l.id === byType) || layers.find(l => l.id === 'layer-default');
  };
  // Layer enforcement: an element is locked if its layer (or the floor) is locked.
  const isElementLocked = (el?: CanvasElement | null) => {
    if (!el) return false;
    if (currentFloor?.locked) return true;
    const layer = layerForElement(el);
    return !!(layer && layer.locked);
  };
  // An element is hidden if its layer is not visible.
  const isElementHidden = (el?: CanvasElement | null) => {
    if (!el) return false;
    const layer = layerForElement(el);
    return !!(layer && !layer.visible);
  };
  // Elements available for interaction (hit-testing / selection): visible & unlocked.
  const selectableElements = () => elements.filter(el => !isElementHidden(el) && !isElementLocked(el));

  // Helper to update current floor elements
  const updateFloorElements = (updater: (elements: CanvasElement[]) => CanvasElement[]) => {
    setFloors(floors.map(f => 
      f.id === currentFloorId 
        ? { ...f, elements: updater(f.elements) }
        : f
    ));
  };

  // Snap a door/window opening into the nearest wall: align it to the wall's
  // centerline, match the wall's orientation & thickness, and clamp the opening
  // so it stays within the wall span. Returns a partial update or null.
  const snapOpeningToWall = (opening: CanvasElement): Partial<CanvasElement> | null => {
    if (opening.type !== 'door' && opening.type !== 'window') return null;
    const walls = elements.filter(el => el.type === 'wall');
    if (walls.length === 0) return null;

    const ocx = opening.x + opening.width / 2;
    const ocy = opening.y + opening.height / 2;
    const SNAP_DIST = 40; // inches

    let best: CanvasElement | null = null;
    let bestDist = Infinity;
    walls.forEach(w => {
      // distance from opening center to wall rectangle
      const dx = Math.max(w.x - ocx, 0, ocx - (w.x + w.width));
      const dy = Math.max(w.y - ocy, 0, ocy - (w.y + w.height));
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) { bestDist = dist; best = w; }
    });
    if (!best || bestDist > SNAP_DIST) return null;

    const wall = best;
    const horizontal = wall.width >= wall.height;
    const span = horizontal ? wall.width : wall.height;
    const openingLen = Math.min(opening.width, span); // opening cannot exceed wall

    if (horizontal) {
      let nx = ocx - openingLen / 2;
      nx = Math.max(wall.x, Math.min(nx, wall.x + wall.width - openingLen));
      return {
        x: nx,
        y: wall.y,
        width: openingLen,
        height: wall.height,
        rotation: 0,
      };
    } else {
      let ny = ocy - openingLen / 2;
      ny = Math.max(wall.y, Math.min(ny, wall.y + wall.height - openingLen));
      return {
        x: wall.x,
        y: ny,
        width: wall.width,
        height: openingLen,
        rotation: 0,
      };
    }
  };

  // Smart snapping function
  const getSnappedPosition = (x: number, y: number, excludeId?: string) => {
    let snappedX = x;
    let snappedY = y;
    const guides: { x?: number; y?: number; type: string }[] = [];
    
    // Grid snapping
    if (snapToGrid) {
      snappedX = Math.round(x / gridSize) * gridSize;
      snappedY = Math.round(y / gridSize) * gridSize;
    }
    
    // Element snapping (only if enabled and not snapping to grid)
    if (snapToElements && !snapToGrid) {
      const threshold = snapThreshold / zoom;
      let closestXDist = threshold;
      let closestYDist = threshold;
      
      elements.forEach((el) => {
        if (el.id === excludeId) return; // Don't snap to self
        
        const snapPoints = {
          left: el.x,
          right: el.x + el.width,
          centerX: el.x + el.width / 2,
          top: el.y,
          bottom: el.y + el.height,
          centerY: el.y + el.height / 2,
        };
        
        // Check X alignment
        Object.entries(snapPoints).forEach(([type, value]) => {
          if (type.includes('X') || type === 'left' || type === 'right') {
            const dist = Math.abs(x - value);
            if (dist < closestXDist) {
              closestXDist = dist;
              snappedX = value;
              guides.push({ x: value, type: `vertical-${type}` });
            }
          }
        });
        
        // Check Y alignment
        Object.entries(snapPoints).forEach(([type, value]) => {
          if (type.includes('Y') || type === 'top' || type === 'bottom') {
            const dist = Math.abs(y - value);
            if (dist < closestYDist) {
              closestYDist = dist;
              snappedY = value;
              guides.push({ y: value, type: `horizontal-${type}` });
            }
          }
        });
      });
    }
    
    setSnapGuides(guides);
    return { x: snappedX, y: snappedY };
  };

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render based on view mode
    if (viewMode === '3d') {
      // 3D Isometric View
      render3DView(ctx, canvas.width, canvas.height);
    } else {
      // 2D View (existing code)
      render2DView(ctx, canvas.width, canvas.height);
    }
  }, [elements, zoom, panOffset, selectedElement, selectedElements, gridVisible, snapToGrid, snapToElements, isDrawing, drawStart, currentMousePos, continuousWallMode, lastWallEndPoint, isBoxSelecting, selectionBoxStart, selectionBoxEnd, layers, dimensionStart, dimensionPreview, activeTool, viewMode, cameraRotation, cameraPitch, showAllMeasurements]);

  // 2D Rendering Function
  const render2DView = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    // Draw grid
    if (gridVisible) {
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = 1;

      for (let x = 0; x <= canvasWidth; x += gridSize * zoom) {
        ctx.beginPath();
        ctx.moveTo(x + panOffset.x, 0);
        ctx.lineTo(x + panOffset.x, canvasHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= canvasHeight; y += gridSize * zoom) {
        ctx.beginPath();
        ctx.moveTo(0, y + panOffset.y);
        ctx.lineTo(canvasWidth, y + panOffset.y);
        ctx.stroke();
      }
    }

    // Draw elements (respecting layer visibility)
    elements.forEach((element) => {
      // Check if element's layer is visible (resolves by type when untagged)
      if (isElementHidden(element)) return; // Skip hidden layers

      ctx.save();
      ctx.translate(
        element.x * zoom + panOffset.x,
        element.y * zoom + panOffset.y
      );
      ctx.rotate((element.rotation * Math.PI) / 180);

      // Draw based on type
      switch (element.type) {
        case 'wall':
          ctx.fillStyle = element.id === selectedElement ? '#ea580c' : '#4A4A4A';
          ctx.fillRect(0, 0, element.width * zoom, element.height * zoom);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, element.width * zoom, element.height * zoom);
          
          // Show measurement on wall
          if (element.id === selectedElement || isDrawing || showAllMeasurements) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            const measurement = inchesToArchitectural(element.width);
            ctx.fillText(measurement, (element.width * zoom) / 2, -8);
            
            // Show label if available
            if (element.label && showAllMeasurements) {
              ctx.font = '12px Arial';
              ctx.fillStyle = '#10b981';
              ctx.fillText(element.label, (element.width * zoom) / 2, (element.height * zoom) + 16);
            }
          }
          break;

        case 'door':
          ctx.fillStyle = element.id === selectedElement ? '#ea580c' : '#8B4513';
          ctx.fillRect(0, 0, element.width * zoom, element.height * zoom);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, element.width * zoom, element.height * zoom);
          // Door arc
          ctx.beginPath();
          ctx.arc(0, 0, element.width * zoom, 0, Math.PI / 2);
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          
          // Door frame (3D effect)
          ctx.strokeStyle = '#654321';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, element.width * zoom, element.height * zoom);
          
          // Show measurement
          if (element.id === selectedElement || showAllMeasurements) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            const measurement = inchesToArchitectural(element.width);
            ctx.fillText(measurement, (element.width * zoom) / 2, -8);
            
            // Show label if available
            if (element.label && showAllMeasurements) {
              ctx.font = '11px Arial';
              ctx.fillStyle = '#10b981';
              ctx.fillText(element.label, (element.width * zoom) / 2, (element.height * zoom) + 14);
            }
          }
          break;

        case 'window':
          // Window frame (outer)
          ctx.fillStyle = element.id === selectedElement ? '#ea580c' : '#4A90A4';
          ctx.fillRect(0, 0, element.width * zoom, element.height * zoom);
          
          // Window glass (inner) - lighter, translucent
          ctx.fillStyle = '#87CEEB';
          ctx.globalAlpha = 0.4;
          ctx.fillRect(2, 2, (element.width * zoom) - 4, (element.height * zoom) - 4);
          ctx.globalAlpha = 1;
          
          // Window frame outline
          ctx.strokeStyle = '#2F4F4F';
          ctx.lineWidth = 3;
          ctx.strokeRect(0, 0, element.width * zoom, element.height * zoom);
          
          // Window divider (muntins)
          ctx.strokeStyle = '#2F4F4F';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo((element.width * zoom) / 2, 0);
          ctx.lineTo((element.width * zoom) / 2, element.height * zoom);
          ctx.stroke();
          
          // Show measurement
          if (element.id === selectedElement || showAllMeasurements) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            const measurement = inchesToArchitectural(element.width);
            ctx.fillText(measurement, (element.width * zoom) / 2, -8);
            
            // Show label if available
            if (element.label && showAllMeasurements) {
              ctx.font = '11px Arial';
              ctx.fillStyle = '#10b981';
              ctx.fillText(element.label, (element.width * zoom) / 2, (element.height * zoom) + 14);
            }
          }
          break;

        case 'room':
          ctx.fillStyle = element.color || '#2A2A2A';
          ctx.globalAlpha = 0.1;
          ctx.fillRect(0, 0, element.width * zoom, element.height * zoom);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = element.id === selectedElement ? '#ea580c' : '#4A4A4A';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, element.width * zoom, element.height * zoom);
          
          // Label
          if (element.label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(element.label, 10, 20);
          }
          
          // Show dimensions when showAllMeasurements is enabled
          if (showAllMeasurements || element.id === selectedElement) {
            ctx.textAlign = 'center';
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#f59e0b';
            
            // Width (top)
            const widthMeasurement = inchesToArchitectural(element.width);
            ctx.fillText(widthMeasurement, (element.width * zoom) / 2, -8);
            
            // Height (right side, rotated)
            ctx.save();
            ctx.translate((element.width * zoom) + 15, (element.height * zoom) / 2);
            ctx.rotate(-Math.PI / 2);
            const heightMeasurement = inchesToArchitectural(element.height);
            ctx.fillText(heightMeasurement, 0, 0);
            ctx.restore();
            
            // Area (center)
            const areaInches = element.width * element.height;
            const areaSqFt = Math.round(areaInches / 144);
            ctx.fillStyle = '#10b981';
            ctx.font = '11px Arial';
            ctx.fillText(`${areaSqFt} sq ft`, (element.width * zoom) / 2, (element.height * zoom) / 2 + 10);
          }
          break;

        case 'furniture':
          // Draw furniture with visual details based on subtype
          const drawFurnitureDetails = () => {
            const w = element.width * zoom;
            const h = element.height * zoom;
            const furnitureType = element.subtype || '';
            const isSelected = element.id === selectedElement;
            
            // Sofas
            if (furnitureType.includes('sofa') || furnitureType.includes('loveseat')) {
              // Backrest
              ctx.fillStyle = element.color || '#8B7355';
              ctx.fillRect(0, 0, w, h * 0.25);
              // Seat
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#8B7355');
              ctx.fillRect(0, h * 0.25, w, h * 0.75);
              // Cushion lines
              ctx.strokeStyle = '#654321';
              ctx.lineWidth = 2;
              for (let i = 1; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo((w / 3) * i, h * 0.25);
                ctx.lineTo((w / 3) * i, h);
                ctx.stroke();
              }
            }
            // Armchairs
            else if (furnitureType.includes('armchair') || furnitureType.includes('chair')) {
              // Seat
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#A0826D');
              ctx.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.7);
              // Backrest
              ctx.fillRect(w * 0.2, 0, w * 0.6, h * 0.4);
              // Armrests
              ctx.fillRect(0, h * 0.3, w * 0.15, h * 0.5);
              ctx.fillRect(w * 0.85, h * 0.3, w * 0.15, h * 0.5);
            }
            // Beds
            else if (furnitureType.includes('bed')) {
              // Mattress
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#8B4513');
              ctx.fillRect(0, h * 0.15, w, h * 0.85);
              // Headboard
              ctx.fillStyle = '#654321';
              ctx.fillRect(0, 0, w, h * 0.2);
              // Pillows
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(w * 0.1, h * 0.15, w * 0.35, h * 0.15);
              ctx.fillRect(w * 0.55, h * 0.15, w * 0.35, h * 0.15);
            }
            // Tables (dining, coffee)
            else if (furnitureType.includes('table') && !furnitureType.includes('nightstand')) {
              // Table top
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#8B4513');
              ctx.fillRect(0, 0, w, h);
              // Table legs (corners)
              ctx.fillStyle = '#654321';
              const legSize = Math.min(w, h) * 0.08;
              ctx.fillRect(legSize, legSize, legSize, legSize);
              ctx.fillRect(w - legSize * 2, legSize, legSize, legSize);
              ctx.fillRect(legSize, h - legSize * 2, legSize, legSize);
              ctx.fillRect(w - legSize * 2, h - legSize * 2, legSize, legSize);
              // Round tables
              if (furnitureType.includes('round')) {
                ctx.beginPath();
                ctx.arc(w/2, h/2, Math.min(w, h) / 2, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#8B4513');
                ctx.fill();
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            }
            // Countertops
            else if (furnitureType.includes('counter')) {
              // Counter surface
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#8B7355');
              ctx.fillRect(0, 0, w, h);
              // Edge detail
              ctx.fillStyle = '#654321';
              ctx.fillRect(0, h - h * 0.1, w, h * 0.1);
              // Grain lines
              ctx.strokeStyle = '#6B5B45';
              ctx.lineWidth = 1;
              for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(0, h * 0.2 * i);
                ctx.lineTo(w, h * 0.2 * i);
                ctx.stroke();
              }
            }
            // Kitchen appliances (refrigerator, stove)
            else if (furnitureType.includes('refrigerator') || furnitureType.includes('fridge')) {
              ctx.fillStyle = isSelected ? '#ea580c' : '#C0C0C0';
              ctx.fillRect(0, 0, w, h);
              // Doors
              ctx.strokeStyle = '#A0A0A0';
              ctx.lineWidth = 3;
              ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.45);
              ctx.strokeRect(w * 0.05, h * 0.52, w * 0.9, h * 0.43);
              // Handles
              ctx.fillStyle = '#4A4A4A';
              ctx.fillRect(w * 0.85, h * 0.25, w * 0.05, h * 0.15);
              ctx.fillRect(w * 0.85, h * 0.72, w * 0.05, h * 0.15);
            }
            else if (furnitureType.includes('stove') || furnitureType.includes('range')) {
              ctx.fillStyle = isSelected ? '#ea580c' : '#4A4A4A';
              ctx.fillRect(0, 0, w, h);
              // Burners
              ctx.fillStyle = '#000000';
              const burnerSize = w * 0.2;
              ctx.beginPath();
              ctx.arc(w * 0.3, h * 0.3, burnerSize / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(w * 0.7, h * 0.3, burnerSize / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(w * 0.3, h * 0.7, burnerSize / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(w * 0.7, h * 0.7, burnerSize / 2, 0, Math.PI * 2);
              ctx.fill();
            }
            // Booths
            else if (furnitureType.includes('booth')) {
              // Seat base
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#8B4513');
              ctx.fillRect(0, h * 0.5, w, h * 0.5);
              // Backrest
              ctx.fillStyle = element.color || '#8B4513';
              ctx.fillRect(0, 0, w, h * 0.55);
              // Padding lines
              ctx.strokeStyle = '#654321';
              ctx.lineWidth = 2;
              ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.45);
            }
            // Bar stools
            else if (furnitureType.includes('stool')) {
              // Seat
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#8B7355');
              ctx.beginPath();
              ctx.arc(w/2, h/2, Math.min(w, h) / 3, 0, Math.PI * 2);
              ctx.fill();
              // Base
              ctx.strokeStyle = '#4A4A4A';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(w/2, h/2);
              ctx.lineTo(w/2, h);
              ctx.stroke();
            }
            // Default furniture (generic)
            else {
              ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#6B7280');
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = element.color || '#4A4A4A';
              ctx.lineWidth = 2;
              ctx.strokeRect(2, 2, w - 4, h - 4);
            }
            
            // Always draw outline
            ctx.strokeStyle = isSelected ? '#ea580c' : '#4A4A4A';
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.strokeRect(0, 0, w, h);
            
            // Label on hover/select
            if (isSelected && element.label) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 12px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(element.label, w / 2, h + 15);
            }
          };
          drawFurnitureDetails();
          break;
        
        case 'shape':
          const w = element.width * zoom;
          const h = element.height * zoom;
          const shapeColor = element.color || '#3b82f6';
          const isSelected = element.id === selectedElement || selectedElements.includes(element.id);
          
          ctx.strokeStyle = isSelected ? '#ea580c' : shapeColor;
          ctx.fillStyle = shapeColor;
          ctx.lineWidth = isSelected ? 3 : 2;
          
          switch (element.subtype) {
            case 'circle':
              const radiusX = w / 2;
              const radiusY = h / 2;
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.stroke();
              break;
              
            case 'polygon':
              const sides = element.sides || 6;
              const centerX = w / 2;
              const centerY = h / 2;
              const radius = Math.min(w, h) / 2;
              
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.closePath();
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.stroke();
              break;
              
            case 'line':
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.moveTo(0, h / 2);
              ctx.lineTo(w, h / 2);
              ctx.stroke();
              
              // Draw end caps
              ctx.fillStyle = isSelected ? '#ea580c' : shapeColor;
              ctx.beginPath();
              ctx.arc(0, h / 2, 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(w, h / 2, 4, 0, Math.PI * 2);
              ctx.fill();
              break;
              
            case 'arc':
              const startAngle = (element.startAngle || 0) * Math.PI / 180;
              const endAngle = (element.endAngle || 180) * Math.PI / 180;
              const arcRadius = Math.min(w, h) / 2;
              
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              ctx.arc(w / 2, h / 2, arcRadius, startAngle, endAngle);
              ctx.stroke();
              ctx.globalAlpha = 1;
              ctx.lineWidth = (isSelected ? 3 : 2) * 2;
              ctx.stroke();
              break;
              
            case 'bezier':
              // Simple bezier curve (can be enhanced with control points)
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.moveTo(0, h);
              ctx.bezierCurveTo(w / 3, 0, 2 * w / 3, 0, w, h);
              ctx.stroke();
              break;
          }
          
          // Draw label if exists
          if (element.label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(element.label, w / 2, h / 2);
          }
          break;
        
        case 'annotation':
          if (element.subtype === 'text' && element.text) {
            ctx.fillStyle = element.color || '#ffffff';
            ctx.font = `${element.fontSize || 16}px ${element.fontFamily || 'Arial'}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            // Background for better readability
            const textMetrics = ctx.measureText(element.text);
            const textHeight = element.fontSize || 16;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-4, -4, textMetrics.width + 8, textHeight + 8);
            
            // Text
            ctx.fillStyle = element.color || '#ffffff';
            ctx.fillText(element.text, 0, 0);
            
            // Selection outline
            if (isSelected) {
              ctx.strokeStyle = '#ea580c';
              ctx.lineWidth = 2;
              ctx.strokeRect(-4, -4, textMetrics.width + 8, textHeight + 8);
            }
          } else if (element.subtype === 'leader' && element.startPoint && element.endPoint) {
            // Draw leader line
            ctx.strokeStyle = isSelected ? '#ea580c' : (element.color || '#FFD700');
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            
            const sx = (element.startPoint.x - element.x) * zoom;
            const sy = (element.startPoint.y - element.y) * zoom;
            const ex = (element.endPoint.x - element.x) * zoom;
            const ey = (element.endPoint.y - element.y) * zoom;
            
            // Leader line
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            
            // Arrow at start point
            const angle = Math.atan2(ey - sy, ex - sx);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - 10 * Math.cos(angle - Math.PI / 6), sy - 10 * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(sx - 10 * Math.cos(angle + Math.PI / 6), sy - 10 * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fillStyle = isSelected ? '#ea580c' : (element.color || '#FFD700');
            ctx.fill();
            
            // Text at end point
            if (element.text) {
              ctx.fillStyle = element.color || '#FFD700';
              ctx.font = `${element.fontSize || 12}px Arial`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              
              // Background
              const metrics = ctx.measureText(element.text);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(ex - 4, ey - 10, metrics.width + 8, 20);
              
              // Text
              ctx.fillStyle = element.color || '#FFD700';
              ctx.fillText(element.text, ex, ey);
            }
          }
          break;
        
        case 'dimension':
          if (element.startPoint && element.endPoint) {
            const sx = (element.startPoint.x - element.x) * zoom;
            const sy = (element.startPoint.y - element.y) * zoom;
            const ex = (element.endPoint.x - element.x) * zoom;
            const ey = (element.endPoint.y - element.y) * zoom;
            
            const dimColor = isSelected ? '#ea580c' : (element.color || '#FFD700');
            ctx.strokeStyle = dimColor;
            ctx.fillStyle = dimColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            
            // Calculate dimension line offset
            const offset = (element.dimensionOffset || 20) * zoom;
            const dx = ex - sx;
            const dy = ey - sy;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Perpendicular offset
            const perpAngle = angle + Math.PI / 2;
            const ox = Math.cos(perpAngle) * offset;
            const oy = Math.sin(perpAngle) * offset;
            
            // Extension lines
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + ox, sy + oy);
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + ox, ey + oy);
            ctx.stroke();
            
            // Dimension line
            ctx.beginPath();
            ctx.moveTo(sx + ox, sy + oy);
            ctx.lineTo(ex + ox, ey + oy);
            ctx.stroke();
            
            // Arrows
            const arrowSize = 8;
            // Start arrow
            ctx.beginPath();
            ctx.moveTo(sx + ox, sy + oy);
            ctx.lineTo(sx + ox + arrowSize * Math.cos(angle + Math.PI + Math.PI / 6), 
                       sy + oy + arrowSize * Math.sin(angle + Math.PI + Math.PI / 6));
            ctx.lineTo(sx + ox + arrowSize * Math.cos(angle + Math.PI - Math.PI / 6), 
                       sy + oy + arrowSize * Math.sin(angle + Math.PI - Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            
            // End arrow
            ctx.beginPath();
            ctx.moveTo(ex + ox, ey + oy);
            ctx.lineTo(ex + ox + arrowSize * Math.cos(angle + Math.PI / 6), 
                       ey + oy + arrowSize * Math.sin(angle + Math.PI / 6));
            ctx.lineTo(ex + ox + arrowSize * Math.cos(angle - Math.PI / 6), 
                       ey + oy + arrowSize * Math.sin(angle - Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            
            // Measurement text
            const distance = Math.sqrt(
              Math.pow(element.endPoint.x - element.startPoint.x, 2) + 
              Math.pow(element.endPoint.y - element.startPoint.y, 2)
            );
            const measurement = element.showUnits !== false 
              ? inchesToArchitectural(distance) 
              : distance.toFixed(2);
            
            ctx.save();
            ctx.translate((sx + ex) / 2 + ox, (sy + ey) / 2 + oy);
            ctx.rotate(angle);
            
            // Text background
            ctx.font = `bold ${element.fontSize || 12}px Arial`;
            const textMetrics = ctx.measureText(measurement);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(-textMetrics.width / 2 - 4, -10, textMetrics.width + 8, 20);
            
            // Text
            ctx.fillStyle = dimColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(measurement, 0, 0);
            
            ctx.restore();
          }
          break;
        
        case 'electrical':
          ctx.fillStyle = element.id === selectedElement ? '#ea580c' : '#FFD700';
          ctx.fillRect(0, 0, element.width * zoom, element.height * zoom);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, element.width * zoom, element.height * zoom);
          
          // Label
          if (element.label) {
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.fillText(element.label, 10, 20);
          }
          break;
        
        case 'plumbing':
          ctx.fillStyle = element.id === selectedElement ? '#ea580c' : '#00BFFF';
          ctx.fillRect(0, 0, element.width * zoom, element.height * zoom);
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, element.width * zoom, element.height * zoom);
          
          // Label
          if (element.label) {
            ctx.fillStyle = '#000000';
            ctx.font = '14px Arial';
            ctx.fillText(element.label, 10, 20);
          }
          break;
      }

      ctx.restore();
    });

    // Draw live preview while drawing wall
    if (isDrawing && drawStart && currentMousePos && activeTool === 'wall') {
      const startX = drawStart.x * zoom + panOffset.x;
      const startY = drawStart.y * zoom + panOffset.y;
      const endX = currentMousePos.x * zoom + panOffset.x;
      const endY = currentMousePos.y * zoom + panOffset.y;

      // Calculate length
      const dx = currentMousePos.x - drawStart.x;
      const dy = currentMousePos.y - drawStart.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const lengthArchitectural = inchesToArchitectural(length);

      // Draw preview line
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw measurement label (only if measurements are enabled)
      if (showMeasurements) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(midX - 70, midY - 25, 140, 50);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lengthArchitectural, midX, midY);
      }

      // Draw start marker (green if continuing from previous wall, orange if new)
      ctx.fillStyle = continuousWallMode && lastWallEndPoint ? '#22c55e' : '#ea580c';
      ctx.beginPath();
      ctx.arc(startX, startY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw end marker (always orange)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw dimension/leader preview
    if (dimensionStart && dimensionPreview && (activeTool === 'dimension' || activeTool === 'leader')) {
      const startX = dimensionStart.x * zoom + panOffset.x;
      const startY = dimensionStart.y * zoom + panOffset.y;
      const endX = dimensionPreview.x * zoom + panOffset.x;
      const endY = dimensionPreview.y * zoom + panOffset.y;
      
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      if (activeTool === 'dimension') {
        // Dimension preview
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        const offset = 20;
        const perpAngle = angle + Math.PI / 2;
        const ox = Math.cos(perpAngle) * offset;
        const oy = Math.sin(perpAngle) * offset;
        
        // Extension lines
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + ox, startY + oy);
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX + ox, endY + oy);
        ctx.stroke();
        
        // Dimension line
        ctx.beginPath();
        ctx.moveTo(startX + ox, startY + oy);
        ctx.lineTo(endX + ox, endY + oy);
        ctx.stroke();
        
        // Measurement
        const distance = Math.sqrt(
          Math.pow(dimensionPreview.x - dimensionStart.x, 2) + 
          Math.pow(dimensionPreview.y - dimensionStart.y, 2)
        );
        const measurement = inchesToArchitectural(distance);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(measurement, (startX + endX) / 2 + ox, (startY + endY) / 2 + oy - 5);
      } else {
        // Leader preview
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
      
      // Draw markers
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(startX, startY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw selection box (drag-to-select)
    if (isBoxSelecting && selectionBoxStart && selectionBoxEnd) {
      const startX = selectionBoxStart.x * zoom + panOffset.x;
      const startY = selectionBoxStart.y * zoom + panOffset.y;
      const endX = selectionBoxEnd.x * zoom + panOffset.x;
      const endY = selectionBoxEnd.y * zoom + panOffset.y;
      
      const boxX = Math.min(startX, endX);
      const boxY = Math.min(startY, endY);
      const boxW = Math.abs(endX - startX);
      const boxH = Math.abs(endY - startY);
      
      // Semi-transparent fill
      ctx.fillStyle = 'rgba(234, 88, 12, 0.1)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      
      // Dashed border
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);
    }

    // Draw snap guides (smart alignment lines)
    if (snapGuides.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#3b82f6'; // Blue snap guides
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      snapGuides.forEach(guide => {
        if (guide.x !== undefined) {
          // Vertical guide
          const x = guide.x * zoom + panOffset.x;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight);
          ctx.stroke();
          
          // Label
          ctx.fillStyle = '#3b82f6';
          ctx.font = '10px Arial';
          ctx.fillText('|', x - 2, 15);
        }
        
        if (guide.y !== undefined) {
          // Horizontal guide
          const y = guide.y * zoom + panOffset.y;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasWidth, y);
          ctx.stroke();
          
          // Label
          ctx.fillStyle = '#3b82f6';
          ctx.font = '10px Arial';
          ctx.fillText('—', 10, y + 4);
        }
      });
      
      ctx.restore();
      ctx.setLineDash([]);
    }

    // Draw highlights for multi-selected elements
    if (selectedElements.length > 0) {
      selectedElements.forEach(id => {
        const floor = floors.find(f => f.id === currentFloorId);
        if (!floor) return;
        
        const el = floor.elements.find((e: CanvasElement) => e.id === id);
        if (el) {
          const x = el.x * zoom + panOffset.x;
          const y = el.y * zoom + panOffset.y;
          const w = el.width * zoom;
          const h = el.height * zoom;
          
          // Highlight with orange dashed border
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
          ctx.setLineDash([]);
          
          // Small corner indicators
          const handleSize = 8;
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(x + w - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(x - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
        }
      });
    }

    // Draw selection handles for selected element
    if (selectedElement) {
      const selected = elements.find((el) => el.id === selectedElement);
      if (selected) {
        const x = selected.x * zoom + panOffset.x;
        const y = selected.y * zoom + panOffset.y;
        const w = selected.width * zoom;
        const h = selected.height * zoom;

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
        ctx.setLineDash([]);

        // Corner and edge handles
        const handleSize = 10;
        ctx.fillStyle = '#ea580c';
        
        // Corner handles
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x + w - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
        
        // Edge handles (for walls - to extend them)
        if (selected.type === 'wall') {
          ctx.fillStyle = '#22c55e'; // Green for extension handles
          ctx.fillRect(x + w - handleSize / 2, y + h / 2 - handleSize / 2, handleSize, handleSize); // Right
          ctx.fillRect(x - handleSize / 2, y + h / 2 - handleSize / 2, handleSize, handleSize); // Left
          
          // Thickness adjustment handles (top and bottom)
          ctx.fillStyle = '#a855f7'; // Purple for thickness handles
          ctx.fillRect(x + w / 2 - handleSize / 2, y - handleSize / 2, handleSize, handleSize); // Top
          ctx.fillRect(x + w / 2 - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize); // Bottom
        }
        
        // Rotation handle (blue circle above the element)
        const rotateHandleY = y - 30;
        const rotateHandleX = x + w / 2;
        
        // Draw line from element to rotation handle
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y - 5);
        ctx.lineTo(rotateHandleX, rotateHandleY);
        ctx.stroke();
        
        // Draw rotation handle
        ctx.fillStyle = '#3b82f6'; // Blue for rotation handle
        ctx.beginPath();
        ctx.arc(rotateHandleX, rotateHandleY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw rotation icon inside handle
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rotateHandleX, rotateHandleY, 4, 0, Math.PI * 1.5);
        ctx.stroke();
        
        // Show rotation angle
        if (isRotating) {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(rotateHandleX + 15, rotateHandleY - 15, 60, 30);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${Math.round(selected.rotation)}°`, rotateHandleX + 20, rotateHandleY);
        }
      }
    }
  }; // End of render2DView

  // 3D Rendering Function
  const render3DView = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Draw 3D grid
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1;
    
    // Draw elements in 3D
    const sortedElements = [...elements].sort((a, b) => {
      // Sort by depth for proper rendering
      const depthA = a.y + a.x;
      const depthB = b.y + b.x;
      return depthA - depthB;
    });
    
    sortedElements.forEach((element) => {
      // Check layer visibility (resolves by type when untagged)
      if (isElementHidden(element)) return;

      const isSelected = element.id === selectedElement || selectedElements.includes(element.id);
      
      ctx.save();
      
      switch (element.type) {
        case 'wall': {
          const height = element.wallHeight || 96; // Default 8 feet
          const thickness = element.height;
          
          // Define wall corners
          const corners = [
            { x: element.x, y: element.y, z: 0 },
            { x: element.x + element.width, y: element.y, z: 0 },
            { x: element.x + element.width, y: element.y + thickness, z: 0 },
            { x: element.x, y: element.y + thickness, z: 0 },
          ];
          
          const topCorners = corners.map(c => ({ ...c, z: height }));
          
          // Project all points
          const projectedBottom = corners.map(c => {
            const p = project3D(c.x, c.y, c.z);
            return { x: p.x * zoom + centerX, y: p.y * zoom + centerY };
          });
          
          const projectedTop = topCorners.map(c => {
            const p = project3D(c.x, c.y, c.z);
            return { x: p.x * zoom + centerX, y: p.y * zoom + centerY };
          });
          
          // Draw faces with shading
          const wallColor = isSelected ? '#ea580c' : '#4A4A4A';
          
          // Front face
          ctx.fillStyle = wallColor;
          ctx.beginPath();
          ctx.moveTo(projectedBottom[0].x, projectedBottom[0].y);
          ctx.lineTo(projectedBottom[1].x, projectedBottom[1].y);
          ctx.lineTo(projectedTop[1].x, projectedTop[1].y);
          ctx.lineTo(projectedTop[0].x, projectedTop[0].y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#2A2A2A';
          ctx.stroke();
          
          // Right face (darker)
          ctx.fillStyle = isSelected ? '#c44708' : '#3A3A3A';
          ctx.beginPath();
          ctx.moveTo(projectedBottom[1].x, projectedBottom[1].y);
          ctx.lineTo(projectedBottom[2].x, projectedBottom[2].y);
          ctx.lineTo(projectedTop[2].x, projectedTop[2].y);
          ctx.lineTo(projectedTop[1].x, projectedTop[1].y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#2A2A2A';
          ctx.stroke();
          
          // Top face (lightest)
          ctx.fillStyle = isSelected ? '#ff6b1f' : '#5A5A5A';
          ctx.beginPath();
          ctx.moveTo(projectedTop[0].x, projectedTop[0].y);
          ctx.lineTo(projectedTop[1].x, projectedTop[1].y);
          ctx.lineTo(projectedTop[2].x, projectedTop[2].y);
          ctx.lineTo(projectedTop[3].x, projectedTop[3].y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#2A2A2A';
          ctx.stroke();
          break;
        }
        
        case 'room': {
          // Draw room floor in 3D
          const corners = [
            { x: element.x, y: element.y, z: 0 },
            { x: element.x + element.width, y: element.y, z: 0 },
            { x: element.x + element.width, y: element.y + element.height, z: 0 },
            { x: element.x, y: element.y + element.height, z: 0 },
          ];
          
          const projected = corners.map(c => {
            const p = project3D(c.x, c.y, c.z);
            return { x: p.x * zoom + centerX, y: p.y * zoom + centerY };
          });
          
          ctx.fillStyle = isSelected ? 'rgba(234, 88, 12, 0.3)' : 'rgba(100, 100, 100, 0.2)';
          ctx.beginPath();
          ctx.moveTo(projected[0].x, projected[0].y);
          ctx.lineTo(projected[1].x, projected[1].y);
          ctx.lineTo(projected[2].x, projected[2].y);
          ctx.lineTo(projected[3].x, projected[3].y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#ea580c' : '#4A4A4A';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw room label
          if (element.label) {
            const center = project3D(
              element.x + element.width / 2,
              element.y + element.height / 2,
              0
            );
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(element.label, center.x * zoom + centerX, center.y * zoom + centerY);
          }
          break;
        }
        
        case 'door':
        case 'window': {
          // Draw as flat rectangles elevated on walls
          const height = element.type === 'door' ? 80 : 40;
          const elevation = element.type === 'door' ? 0 : 30;
          
          const corners = [
            { x: element.x, y: element.y, z: elevation },
            { x: element.x + element.width, y: element.y, z: elevation },
            { x: element.x + element.width, y: element.y + element.height, z: elevation },
            { x: element.x, y: element.y + element.height, z: elevation },
          ];
          
          const topCorners = corners.map(c => ({ ...c, z: c.z + height }));
          
          const projectedBottom = corners.map(c => {
            const p = project3D(c.x, c.y, c.z);
            return { x: p.x * zoom + centerX, y: p.y * zoom + centerY };
          });
          
          const projectedTop = topCorners.map(c => {
            const p = project3D(c.x, c.y, c.z);
            return { x: p.x * zoom + centerX, y: p.y * zoom + centerY };
          });
          
          const color = element.type === 'door' 
            ? (isSelected ? '#ea580c' : '#8B4513')
            : (isSelected ? '#ea580c' : '#87CEEB');
          
          // Front face
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(projectedBottom[0].x, projectedBottom[0].y);
          ctx.lineTo(projectedBottom[1].x, projectedBottom[1].y);
          ctx.lineTo(projectedTop[1].x, projectedTop[1].y);
          ctx.lineTo(projectedTop[0].x, projectedTop[0].y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#2A2A2A';
          ctx.stroke();
          break;
        }
      }
      
      ctx.restore();
    });
    
    // Draw 3D view label
    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('3D Isometric View', 20, 30);
  }; // End of render3DView

  // Calculate measurements (outside of rendering)
  useEffect(() => {
    if (elements.length > 0) {
      const totalArea = elements
        .filter((el) => el.type === 'room')
        .reduce((sum, el) => sum + (el.width * el.height) / 144, 0); // Convert to sq ft

      setMeasurements([
        { label: 'Total Rooms', value: elements.filter((el) => el.type === 'room').length.toString() },
        { label: 'Total Area', value: `${totalArea.toFixed(2)} sq ft` },
        { label: 'Elements', value: elements.length.toString() },
      ]);
    }
  }, [elements]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo (Ctrl+Y or Cmd+Shift+Z)
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
      // Copy (Ctrl+C or Cmd+C)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      // Paste (Ctrl+V or Cmd+V)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      // Duplicate (Ctrl+D or Cmd+D)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      }
      // Delete (Delete or Backspace)
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      }
      // Select All (Ctrl+A or Cmd+A)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
      // Group (Ctrl+G or Cmd+G)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        handleGroup();
      }
      // Ungroup (Ctrl+Shift+G or Cmd+Shift+G)
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'g') {
        e.preventDefault();
        handleUngroup();
      }
      // Escape - Clear selection and cancel drawing
      else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedElements([]);
        setSelectedElement(null);
        setIsBoxSelecting(false);
        setSelectionBoxStart(null);
        setSelectionBoxEnd(null);
        setIsDrawing(false);
        setDrawStart(null);
        setContinuousWallMode(false);
        setDimensionStart(null);
        setDimensionPreview(null);
      }
      // Arrow Keys - Nudge selected elements
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1; // Shift = 10px, normal = 1px
        handleNudge(e.key, nudgeAmount);
      }
      // Spacebar - Enable pan mode
      else if (e.key === ' ' && !isPanning) {
        e.preventDefault();
        setIsPanning(true);
      }
      // Tool Hotkeys
      else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setActiveTool('select');
      }
      else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setActiveTool('wall');
      }
      else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveTool('door');
      }
      else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setActiveTool('room');
      }
      // Toggle snap to grid (G key)
      else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setSnapToGrid(!snapToGrid);
        console.log(`Snap to Grid: ${!snapToGrid ? 'ON' : 'OFF'}`);
      }
      // Toggle snap to elements (E key) - but not when Ctrl is pressed (reserved for element snap menu)
      else if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSnapToElements(!snapToElements);
        console.log(`Snap to Elements: ${!snapToElements ? 'ON' : 'OFF'}`);
      }
      // Toggle 3D view (3 key)
      else if (e.key === '3') {
        e.preventDefault();
        setViewMode(viewMode === '2d' ? '3d' : '2d');
        console.log(`View Mode: ${viewMode === '2d' ? '3D' : '2D'}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Disable pan mode when spacebar is released
      if (e.key === ' ') {
        e.preventDefault();
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElement, selectedElements, elements, clipboard, isPanning, history, historyIndex, snapToGrid, snapToElements]);

  // Auto-clear status messages after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    
    // Use smart snapping
    const { x: snappedX, y: snappedY } = getSnappedPosition(x, y);

    // Handle wall drawing mode - CONTINUOUS DRAWING
    if (activeTool === 'wall') {
      if (!isDrawing) {
        // Start first wall or continue from last endpoint
        const startPoint = continuousWallMode && lastWallEndPoint 
          ? lastWallEndPoint 
          : { x: snappedX, y: snappedY };
        
        setIsDrawing(true);
        setDrawStart(startPoint);
        setCurrentMousePos(startPoint);
        setContinuousWallMode(true); // Enter continuous mode
      } else {
        // Finish current wall segment using the CURRENT CLICK position (not currentMousePos state)
        if (drawStart) {
          const endX = snappedX;
          const endY = snappedY;
          const dx = endX - drawStart.x;
          const dy = endY - drawStart.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          
          // Only create wall if length > 5 pixels (avoid accidental tiny walls)
          if (length > 5) {
            // Calculate rotation angle for the wall
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Create wall with proper length and standard thickness
            const newElement: CanvasElement = {
              id: `wall-${Date.now()}-${Math.random()}`, // Add random to ensure unique ID
              type: 'wall',
              x: drawStart.x,
              y: drawStart.y - (defaultWallThickness / 2),
              width: length,
              height: defaultWallThickness,
              rotation: angle,
            };

            updateFloorElements(els => [...els, newElement]);
            setSelectedElement(newElement.id);
            setShowPropertiesPanel(true);
            
            // Save endpoint for next wall segment
            setLastWallEndPoint({ x: endX, y: endY });
          }
        }
        
        // Continue drawing from endpoint (don't exit drawing mode)
        setIsDrawing(false); // Will restart on next click
        setDrawStart(null);
        setCurrentMousePos(null);
      }
      return;
    }
    
    // If switching away from wall tool, exit continuous mode
    if (activeTool !== 'wall' && continuousWallMode) {
      setContinuousWallMode(false);
      setLastWallEndPoint(null);
    }

    // Check if clicking on existing element (skip hidden/locked layers)
    const clickedElement = selectableElements().find((el) => {
      return (
        x >= el.x &&
        x <= el.x + el.width &&
        y >= el.y &&
        y <= el.y + el.height
      );
    });

    if (clickedElement) {
      // If element is part of a group, select entire group
      if (clickedElement.groupId) {
        const groupElements = elements
          .filter((el) => el.groupId === clickedElement.groupId)
          .map((el) => el.id);
        setSelectedElements(groupElements);
        setSelectedElement(null);
        console.log(`Selected group with ${groupElements.length} elements`);
      } else {
        setSelectedElement(clickedElement.id);
        setSelectedElements([]);
        const el = elements.find((e) => e.id === clickedElement.id);
        if (el) {
          setEditingDimensions({ width: el.width.toString(), height: el.height.toString() });
        }
      }
      setShowPropertiesPanel(true);
      return;
    }

    // Add new element based on active tool
    if (activeTool !== 'select' && activeTool !== 'measure') {
      // Special handling for text tool
      if (activeTool === 'text') {
        const text = prompt('Enter text:');
        if (!text) return;
        
        const newElement: CanvasElement = {
          id: `text-${Date.now()}`,
          type: 'annotation',
          subtype: 'text',
          x: snappedX,
          y: snappedY,
          width: 200,
          height: 40,
          rotation: 0,
          text: text,
          fontSize: 16,
          fontFamily: 'Arial',
          color: '#ffffff',
        };
        updateFloorElements(elements => [...elements, newElement]);
        setSelectedElement(newElement.id);
        setShowPropertiesPanel(true);
        return;
      }

      // Handle shape tools
      let elementType: 'shape' | 'wall' | 'door' | 'window' | 'room' | 'furniture' | 'electrical' | 'plumbing' = 
        (activeTool === 'circle' || activeTool === 'polygon' || activeTool === 'line' || activeTool === 'arc' || activeTool === 'bezier') 
          ? 'shape' 
          : activeTool as any;

      const newElement: CanvasElement = {
        id: `${activeTool}-${Date.now()}`,
        type: elementType,
        subtype: (activeTool === 'circle' || activeTool === 'polygon' || activeTool === 'line' || activeTool === 'arc' || activeTool === 'bezier') 
          ? activeTool 
          : undefined,
        x: snappedX,
        y: snappedY,
        width: activeTool === 'wall' ? 200 : activeTool === 'door' ? 80 : activeTool === 'window' ? 100 : activeTool === 'line' ? 100 : 100,
        height: activeTool === 'wall' ? 20 : activeTool === 'door' ? 10 : activeTool === 'window' ? 10 : activeTool === 'line' ? 5 : 100,
        rotation: 0,
        color: activeTool === 'circle' || activeTool === 'polygon' || activeTool === 'line' || activeTool === 'arc' || activeTool === 'bezier' 
          ? '#3b82f6' 
          : undefined,
        label: activeTool === 'room' ? 'Room ' + (elements.filter(e => e.type === 'room').length + 1) : undefined,
        // Shape-specific properties
        sides: activeTool === 'polygon' ? 6 : undefined,
        radius: activeTool === 'circle' ? 50 : undefined,
        startAngle: activeTool === 'arc' ? 0 : undefined,
        endAngle: activeTool === 'arc' ? 180 : undefined,
      };

      updateFloorElements(elements => [...elements, newElement]);
      setSelectedElement(newElement.id);
      setShowPropertiesPanel(true);
      setEditingDimensions({ width: newElement.width.toString(), height: newElement.height.toString() });
    } else {
      setSelectedElement(null);
      setShowPropertiesPanel(false);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    
    // Use smart snapping (handles both grid and element snapping)
    const { x: snappedX, y: snappedY } = getSnappedPosition(x, y, selectedElement || undefined);

    // Handle spacebar pan mode
    if (isPanning && isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle wall drawing
    if (isDrawing && drawStart && activeTool === 'wall') {
      setCurrentMousePos({ x: snappedX, y: snappedY });
      return;
    }

    // Handle dimension drawing preview
    if (dimensionStart && (activeTool === 'dimension' || activeTool === 'leader')) {
      setDimensionPreview({ x: snappedX, y: snappedY });
      return;
    }

    // Handle element dragging (including groups)
    if (isDraggingElement && (selectedElement || selectedElements.length > 0) && originalElement) {
      const deltaX = snappedX - dragOffset.x - originalElement.x;
      const deltaY = snappedY - dragOffset.y - originalElement.y;

      // If dragging a single element that's in a group, move entire group
      let elementIdsToMove: string[] = [];
      if (selectedElement) {
        const el = elements.find(e => e.id === selectedElement);
        if (el?.groupId) {
          elementIdsToMove = elements.filter(e => e.groupId === el.groupId).map(e => e.id);
        } else {
          elementIdsToMove = [selectedElement];
        }
      } else if (selectedElements.length > 0) {
        elementIdsToMove = selectedElements;
      }

      updateFloorElements(elements =>
        elements.map(el =>
          elementIdsToMove.includes(el.id)
            ? { ...el, x: el.x + deltaX, y: el.y + deltaY }
            : el
        )
      );
      return;
    }

    // Handle element resizing
    if (isResizing && selectedElement && originalElement && resizeHandle) {
      const selected = elements.find(el => el.id === selectedElement);
      if (!selected) return;

      let newX = selected.x;
      let newY = selected.y;
      let newWidth = selected.width;
      let newHeight = selected.height;

      switch (resizeHandle) {
        case 'tl': // Top-left
          newX = snappedX;
          newY = snappedY;
          newWidth = originalElement.x + originalElement.width - snappedX;
          newHeight = originalElement.y + originalElement.height - snappedY;
          break;
        case 'tr': // Top-right
          newY = snappedY;
          newWidth = snappedX - selected.x;
          newHeight = originalElement.y + originalElement.height - snappedY;
          break;
        case 'bl': // Bottom-left
          newX = snappedX;
          newWidth = originalElement.x + originalElement.width - snappedX;
          newHeight = snappedY - selected.y;
          break;
        case 'br': // Bottom-right
          newWidth = snappedX - selected.x;
          newHeight = snappedY - selected.y;
          break;
        case 'left': // Left edge (for walls)
          newX = snappedX;
          newWidth = originalElement.x + originalElement.width - snappedX;
          break;
        case 'right': // Right edge (for walls)
          newWidth = snappedX - selected.x;
          break;
        case 'top': // Top edge (for walls - adjust thickness)
          newY = snappedY;
          newHeight = originalElement.y + originalElement.height - snappedY;
          break;
        case 'bottom': // Bottom edge (for walls - adjust thickness)
          newHeight = snappedY - selected.y;
          break;
      }

      // Ensure minimum dimensions
      if (newWidth < 10) newWidth = 10;
      if (newHeight < 10) newHeight = 10;

      updateFloorElements(elements =>
        elements.map(el =>
          el.id === selectedElement
            ? { ...el, x: newX, y: newY, width: newWidth, height: newHeight }
            : el
        )
      );
      
      // Update dimensions panel
      setEditingDimensions({ width: newWidth.toFixed(0), height: newHeight.toFixed(0) });
    }

    // Handle element rotation
    if (isRotating && selectedElement && originalElement) {
      const selected = elements.find(el => el.id === selectedElement);
      if (!selected) return;

      // Calculate angle from element center to mouse
      const centerX = selected.x + selected.width / 2;
      const centerY = selected.y + selected.height / 2;
      const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
      
      // Snap to 15-degree increments if shift key is held (we'll default to smooth for now)
      let newRotation = angle + 90; // Offset by 90 to start at top
      
      // Normalize to 0-360
      while (newRotation < 0) newRotation += 360;
      while (newRotation >= 360) newRotation -= 360;

      updateFloorElements(elements =>
        elements.map(el =>
          el.id === selectedElement
            ? { ...el, rotation: newRotation }
            : el
        )
      );
      
      setEditingRotation(newRotation.toFixed(0));
    }
    
    // Handle box selection dragging
    if (isBoxSelecting && selectionBoxStart) {
      setSelectionBoxEnd({ x, y });
      return;
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;

    // Handle spacebar pan mode
    if (isPanning) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Only handle dragging/resizing with select tool
    if (activeTool !== 'select') return;

    // Check if clicking on a resize handle
    if (selectedElement) {
      const selected = elements.find(el => el.id === selectedElement);
      if (selected && !isElementLocked(selected)) {
        const handleSize = 10 / zoom;
        const ex = selected.x;
        const ey = selected.y;
        const ew = selected.width;
        const eh = selected.height;

        // Check corner handles
        if (Math.abs(x - ex) < handleSize && Math.abs(y - ey) < handleSize) {
          setIsResizing(true);
          setResizeHandle('tl');
          setOriginalElement({ ...selected });
          return;
        }
        if (Math.abs(x - (ex + ew)) < handleSize && Math.abs(y - ey) < handleSize) {
          setIsResizing(true);
          setResizeHandle('tr');
          setOriginalElement({ ...selected });
          return;
        }
        if (Math.abs(x - ex) < handleSize && Math.abs(y - (ey + eh)) < handleSize) {
          setIsResizing(true);
          setResizeHandle('bl');
          setOriginalElement({ ...selected });
          return;
        }
        if (Math.abs(x - (ex + ew)) < handleSize && Math.abs(y - (ey + eh)) < handleSize) {
          setIsResizing(true);
          setResizeHandle('br');
          setOriginalElement({ ...selected });
          return;
        }

        // Check edge handles for walls
        if (selected.type === 'wall') {
          if (Math.abs(x - ex) < handleSize && Math.abs(y - (ey + eh / 2)) < handleSize) {
            setIsResizing(true);
            setResizeHandle('left');
            setOriginalElement({ ...selected });
            return;
          }
          if (Math.abs(x - (ex + ew)) < handleSize && Math.abs(y - (ey + eh / 2)) < handleSize) {
            setIsResizing(true);
            setResizeHandle('right');
            setOriginalElement({ ...selected });
            return;
          }
          if (Math.abs(y - ey) < handleSize && Math.abs(x - (ex + ew / 2)) < handleSize) {
            setIsResizing(true);
            setResizeHandle('top');
            setOriginalElement({ ...selected });
            return;
          }
          if (Math.abs(y - (ey + eh)) < handleSize && Math.abs(x - (ex + ew / 2)) < handleSize) {
            setIsResizing(true);
            setResizeHandle('bottom');
            setOriginalElement({ ...selected });
            return;
          }
        }

        // Check rotation handle (blue circle above element)
        const rotateHandleY = ey - 30 / zoom;
        const rotateHandleX = ex + ew / 2;
        const distToRotateHandle = Math.sqrt(
          Math.pow(x - rotateHandleX, 2) + Math.pow(y - rotateHandleY, 2)
        );
        
        if (distToRotateHandle < 10 / zoom) {
          setIsRotating(true);
          setRotationStart(selected.rotation);
          setOriginalElement({ ...selected });
          return;
        }

        // Check if clicking inside selected element (for dragging)
        if (x >= ex && x <= ex + ew && y >= ey && y <= ey + eh) {
          setIsDraggingElement(true);
          setDragOffset({ x: x - ex, y: y - ey });
          setOriginalElement({ ...selected });
          return;
        }
      }
    }

    // Check if clicking on an element to select it (skip hidden/locked layers)
    const clickedElement = selectableElements().find((el) => {
      return (
        x >= el.x &&
        x <= el.x + el.width &&
        y >= el.y &&
        y <= el.y + el.height
      );
    });

    if (clickedElement) {
      // Shift+click: Add/remove from multi-selection
      if (e.shiftKey) {
        if (selectedElements.includes(clickedElement.id)) {
          // Remove from selection
          setSelectedElements(selectedElements.filter(id => id !== clickedElement.id));
        } else {
          // Add to selection
          setSelectedElements([...selectedElements, clickedElement.id]);
        }
        setSelectedElement(null);
      } else {
        // Normal click: select single element
        setSelectedElement(clickedElement.id);
        setSelectedElements([]);
        setShowPropertiesPanel(true);
        setEditingDimensions({ 
          width: clickedElement.width.toString(), 
          height: clickedElement.height.toString() 
        });
      }
    } else {
      // Handle dimension/leader tool clicks
      if (activeTool === 'dimension' || activeTool === 'leader') {
        if (!dimensionStart) {
          // First click - set start point
          setDimensionStart({ x: snappedX, y: snappedY });
        } else {
          // Second click - create dimension
          const text = activeTool === 'leader' ? prompt('Enter callout text:') || '' : '';
          
          const newDimension: CanvasElement = {
            id: `${activeTool}-${Date.now()}`,
            type: activeTool === 'dimension' ? 'dimension' : 'annotation',
            subtype: activeTool === 'dimension' ? 'dimension-line' : 'leader',
            x: Math.min(dimensionStart.x, snappedX),
            y: Math.min(dimensionStart.y, snappedY),
            width: Math.abs(snappedX - dimensionStart.x),
            height: Math.abs(snappedY - dimensionStart.y),
            rotation: 0,
            startPoint: dimensionStart,
            endPoint: { x: snappedX, y: snappedY },
            color: '#FFD700',
            text: text,
            fontSize: 12,
            showUnits: true,
            dimensionOffset: 20,
          };
          
          updateFloorElements(elements => [...elements, newDimension]);
          setDimensionStart(null);
          setDimensionPreview(null);
          setSelectedElement(newDimension.id);
          setShowPropertiesPanel(true);
        }
        return;
      }
      
      // Clicking on empty space - start box selection
      if (!e.shiftKey) {
        setSelectedElement(null);
        setSelectedElements([]);
        setShowPropertiesPanel(false);
      }
      
      // Start box selection
      setIsBoxSelecting(true);
      setSelectionBoxStart({ x, y });
      setSelectionBoxEnd({ x, y });
    }
  };

  const handleCanvasMouseUp = () => {
    // If we just finished dragging a door/window, snap it into the nearest wall.
    if (isDraggingElement && selectedElement) {
      const dragged = elements.find(el => el.id === selectedElement);
      if (dragged && (dragged.type === 'door' || dragged.type === 'window')) {
        const snap = snapOpeningToWall(dragged);
        if (snap) {
          updateFloorElements(els =>
            els.map(el => (el.id === selectedElement ? { ...el, ...snap } : el))
          );
        }
      }
    }

    setIsDraggingElement(false);
    setIsResizing(false);
    setIsRotating(false);

    // Complete box selection
    if (isBoxSelecting && selectionBoxStart && selectionBoxEnd) {
      const floor = floors.find(f => f.id === currentFloorId);
      if (floor) {
        // Calculate selection box bounds
        const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
        const maxX = Math.max(selectionBoxStart.x, selectionBoxEnd.x);
        const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
        const maxY = Math.max(selectionBoxStart.y, selectionBoxEnd.y);
        
        // Find all elements within the selection box
        const selectedIds = floor.elements
          .filter((el: CanvasElement) => {
            // Check if element overlaps with selection box
            return !(el.x + el.width < minX || el.x > maxX || el.y + el.height < minY || el.y > maxY);
          })
          .map((el: CanvasElement) => el.id);
        
        if (selectedIds.length > 0) {
          setSelectedElements(selectedIds);
          setSelectedElement(null);
        }
      }
      
      setIsBoxSelecting(false);
      setSelectionBoxStart(null);
      setSelectionBoxEnd(null);
    }
    setResizeHandle(null);
    setOriginalElement(null);
  };

  const handleUpdateDimensions = () => {
    if (!selectedElement) return;

    const width = parseFloat(editingDimensions.width);
    const height = parseFloat(editingDimensions.height);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      alert('Please enter valid dimensions');
      return;
    }

    updateFloorElements(elements =>
      elements.map(el => 
        el.id === selectedElement 
          ? { ...el, width, height }
          : el
      )
    );
  };

  const handleCanvasDoubleClick = () => {
    // Double-click to end continuous wall drawing mode
    if (continuousWallMode && activeTool === 'wall') {
      setContinuousWallMode(false);
      setLastWallEndPoint(null);
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentMousePos(null);
      // Show notification
      console.log('Continuous wall drawing ended - double-clicked');
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));

  const handleDeleteSelected = () => {
    // Delete multiple selected elements or single selected element
    if (selectedElements.length > 0) {
      const floor = floors.find(f => f.id === currentFloorId);
      if (floor) {
        const updatedFloor = {
          ...floor,
          elements: floor.elements.filter((el: CanvasElement) => !selectedElements.includes(el.id))
        };
        setFloors(floors.map(f => f.id === currentFloorId ? updatedFloor : f));
        setSelectedElements([]);
      }
    } else if (selectedElement) {
      const floor = floors.find(f => f.id === currentFloorId);
      if (floor) {
        const updatedFloor = {
          ...floor,
          elements: floor.elements.filter((el: CanvasElement) => el.id !== selectedElement)
        };
        setFloors(floors.map(f => f.id === currentFloorId ? updatedFloor : f));
        setSelectedElement(null);
      }
    }
  };

  const handleCopy = () => {
    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    if (selectedElements.length > 0) {
      const elementsToCopy = floor.elements.filter((el: CanvasElement) => selectedElements.includes(el.id));
      setClipboard(elementsToCopy);
      console.log(`Copied ${elementsToCopy.length} elements to clipboard`);
    } else if (selectedElement) {
      const elementToCopy = floor.elements.find((el: CanvasElement) => el.id === selectedElement);
      if (elementToCopy) {
        setClipboard([elementToCopy]);
        console.log('Copied 1 element to clipboard');
      }
    }
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;

    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    const offset = 20; // Offset pasted elements slightly
    const newElements = clipboard.map((el: CanvasElement) => ({
      ...el,
      id: `${el.type}-${Date.now()}-${Math.random()}`,
      x: el.x + offset,
      y: el.y + offset,
    }));

    const updatedFloor = {
      ...floor,
      elements: [...floor.elements, ...newElements]
    };
    setFloors(floors.map(f => f.id === currentFloorId ? updatedFloor : f));

    // Select the newly pasted elements
    setSelectedElements(newElements.map(el => el.id));
    setSelectedElement(null);
    console.log(`Pasted ${newElements.length} elements`);
  };

  const handleDuplicate = () => {
    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    let elementsToDuplicate: CanvasElement[] = [];
    
    if (selectedElements.length > 0) {
      elementsToDuplicate = floor.elements.filter((el: CanvasElement) => selectedElements.includes(el.id));
    } else if (selectedElement) {
      const el = floor.elements.find((e: CanvasElement) => e.id === selectedElement);
      if (el) elementsToDuplicate = [el];
    }

    if (elementsToDuplicate.length === 0) return;

    const offset = 20;
    const newElements = elementsToDuplicate.map((el: CanvasElement) => ({
      ...el,
      id: `${el.type}-${Date.now()}-${Math.random()}`,
      x: el.x + offset,
      y: el.y + offset,
    }));

    const updatedFloor = {
      ...floor,
      elements: [...floor.elements, ...newElements]
    };
    setFloors(floors.map(f => f.id === currentFloorId ? updatedFloor : f));

    // Select the duplicated elements
    setSelectedElements(newElements.map(el => el.id));
    setSelectedElement(null);
    console.log(`Duplicated ${newElements.length} elements`);
  };

  const handleSelectAll = () => {
    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    const allIds = floor.elements.map((el: CanvasElement) => el.id);
    setSelectedElements(allIds);
    setSelectedElement(null);
    console.log(`Selected all ${allIds.length} elements`);
  };

  const handleNudge = (direction: string, amount: number) => {
    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    let elementIds: string[] = [];
    if (selectedElements.length > 0) {
      elementIds = selectedElements;
    } else if (selectedElement) {
      elementIds = [selectedElement];
    } else {
      return; // Nothing selected
    }

    const updatedElements = floor.elements.map((el: CanvasElement) => {
      if (!elementIds.includes(el.id)) return el;

      let newX = el.x;
      let newY = el.y;

      switch (direction) {
        case 'ArrowUp':
          newY -= amount;
          break;
        case 'ArrowDown':
          newY += amount;
          break;
        case 'ArrowLeft':
          newX -= amount;
          break;
        case 'ArrowRight':
          newX += amount;
          break;
      }

      return { ...el, x: newX, y: newY };
    });

    const updatedFloor = { ...floor, elements: updatedElements };
    saveToHistory();
    setFloors(floors.map(f => f.id === currentFloorId ? updatedFloor : f));
  };

  const saveToHistory = () => {
    // Save current state to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(floors))); // Deep copy
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setFloors(JSON.parse(JSON.stringify(history[newIndex]))); // Deep copy
      console.log(`Undo: Restored state ${newIndex}`);
    } else {
      console.log('Nothing to undo');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setFloors(JSON.parse(JSON.stringify(history[newIndex]))); // Deep copy
      console.log(`Redo: Restored state ${newIndex}`);
    } else {
      console.log('Nothing to redo');
    }
  };

  const handleGroup = () => {
    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    if (selectedElements.length < 2) {
      console.log('Select at least 2 elements to group');
      return;
    }

    const groupId = `group-${Date.now()}`;
    const groupName = `Group ${groups.length + 1}`;

    // Create new group
    const newGroup: Group = {
      id: groupId,
      name: groupName,
      elementIds: [...selectedElements],
    };

    setGroups([...groups, newGroup]);

    // Assign group ID to all selected elements
    const updatedElements = floor.elements.map((el: CanvasElement) =>
      selectedElements.includes(el.id) ? { ...el, groupId } : el
    );

    const updatedFloor = { ...floor, elements: updatedElements };
    saveToHistory();
    setFloors(floors.map(f => f.id === currentFloorId ? updatedFloor : f));

    console.log(`Grouped ${selectedElements.length} elements into "${groupName}"`);
  };

  const handleUngroup = () => {
    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    let affectedGroupIds = new Set<string>();

    // Get group IDs from selected elements
    if (selectedElements.length > 0) {
      floor.elements.forEach((el: CanvasElement) => {
        if (selectedElements.includes(el.id) && el.groupId) {
          affectedGroupIds.add(el.groupId);
        }
      });
    } else if (selectedElement) {
      const el = floor.elements.find((e: CanvasElement) => e.id === selectedElement);
      if (el?.groupId) {
        affectedGroupIds.add(el.groupId);
      }
    }

    if (affectedGroupIds.size === 0) {
      console.log('No grouped elements selected');
      return;
    }

    // Remove group ID from all elements in affected groups
    const updatedElements = floor.elements.map((el: CanvasElement) =>
      el.groupId && affectedGroupIds.has(el.groupId) ? { ...el, groupId: undefined } : el
    );

    // Remove groups from groups array
    const updatedGroups = groups.filter(g => !affectedGroupIds.has(g.id));
    setGroups(updatedGroups);

    const updatedFloor = { ...floor, elements: updatedElements };
    saveToHistory();
    setFloors(floors.map(f => f.id === currentFloorId ? updatedFloor : f));

    console.log(`Ungrouped ${affectedGroupIds.size} group(s)`);
  };

  // Stable id for the project currently being edited, so repeated saves version
  // the same server record instead of creating a new project each time.
  const [serverProjectId, setServerProjectId] = useState<string | null>(null);

  // Version History panel state.
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionList, setVersionList] = useState<VersionMeta[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  // Remember the last project this user opened so we can reload it (from the
  // server) on their next visit — even on a different device.
  const lastProjectKey = (ownerKey: string) => `bpc_ds_last_project_${ownerKey}`;

  /** Load a server project record into the live editor state. */
  const hydrateFromProject = (project: any) => {
    if (!project) return;
    if (Array.isArray(project.floors) && project.floors.length > 0) {
      setFloors(project.floors);
      setCurrentFloorId(project.floors[0].id);
    }
    if (Array.isArray(project.layers) && project.layers.length > 0) {
      setLayers(project.layers);
    }
    setServerProjectId(project.id);
    setCurrentProject({
      id: project.id,
      name: project.name,
      elements: Array.isArray(project.floors) && project.floors[0]?.elements ? project.floors[0].elements : [],
      lastModified: new Date(project.updatedAt || Date.now()),
    });
    try { localStorage.setItem(lastProjectKey(ownerKeyFor(userContext)), project.id); } catch {}
  };

  // On open, hydrate from the server (source of truth) so the studio reflects
  // the latest saved state across devices — unless a quote/work-request/floor
  // plan is being loaded via URL params, which takes priority.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('quote') || params.get('workRequest') || params.get('floorPlan')) return;
    let cancelled = false;
    (async () => {
      try {
        const ownerKey = ownerKeyFor(userContext);
        let targetId = localStorage.getItem(lastProjectKey(ownerKey));
        if (!targetId) {
          const projects = await listDesignProjects(ownerKey);
          if (projects.length > 0) targetId = projects[0].id; // most recently updated
        }
        if (!targetId || cancelled) return;
        const { project } = await getDesignProject(ownerKey, targetId);
        if (cancelled || !project) return;
        hydrateFromProject(project);
        toast.success(`☁️ Synced "${project.name}" from cloud (v${project.version}).`);
      } catch (err) {
        console.warn('Server hydration skipped (using blank/local state):', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** Open the Version History panel and load this project's snapshots. */
  const openVersionHistory = async () => {
    if (!serverProjectId) {
      toast.info('Save this project first to start a version history.');
      return;
    }
    setShowVersionHistory(true);
    setLoadingVersions(true);
    try {
      const { versions } = await getDesignProject(ownerKeyFor(userContext), serverProjectId);
      setVersionList(versions);
    } catch (err) {
      console.error('Failed to load version history:', err);
      toast.error('Could not load version history.');
    } finally {
      setLoadingVersions(false);
    }
  };

  /** Restore a snapshot into the editor (the restore itself creates a new version). */
  const handleRestoreVersion = async (versionId: string, versionNum: number) => {
    if (!serverProjectId) return;
    setRestoringVersionId(versionId);
    try {
      const ownerKey = ownerKeyFor(userContext);
      const project = await restoreDesignProjectVersion(serverProjectId, ownerKey, versionId);
      hydrateFromProject(project);
      const { versions } = await getDesignProject(ownerKey, serverProjectId);
      setVersionList(versions);
      toast.success(`Restored v${versionNum}. Saved as v${project.version}.`);
    } catch (err) {
      console.error('Restore failed:', err);
      toast.error('Could not restore this version.');
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleSaveProject = async () => {
    const localId = serverProjectId || `project-${Date.now()}`;
    const name = currentProject?.name || `Design ${new Date().toLocaleDateString()}`;
    const project: Project = {
      id: localId,
      name,
      elements,
      lastModified: new Date(),
    };

    // Local cache/offline fallback (fast, always succeeds).
    const existingProjects = loadFromUserStorage<Project[]>(
      userContext,
      DESIGN_STUDIO_KEYS.PROJECTS,
      []
    );
    const merged = [...existingProjects.filter(p => p.id !== localId), project];
    saveToUserStorage(userContext, DESIGN_STUDIO_KEYS.PROJECTS, merged);

    // Server persistence + versioning (source of truth across devices).
    try {
      const { project: saved } = await saveDesignProject({
        id: serverProjectId || undefined,
        name,
        ownerKey: ownerKeyFor(userContext),
        floors,
        layers,
        quoteId: activeQuote?.quoteId || null,
        note: serverProjectId ? 'Auto-saved' : 'Created',
      });
      setServerProjectId(saved.id);
      try { localStorage.setItem(lastProjectKey(ownerKeyFor(userContext)), saved.id); } catch {}
      toast.success(`✅ Saved to cloud (v${saved.version}) — synced across your devices.`);
    } catch (err) {
      console.error('Design project cloud save failed, kept local copy:', err);
      toast.warning(`Saved locally to your ${userContext.userType} folder — cloud sync failed, will retry on next save.`);
    }
  };

  const handleLoadProject = () => {
    // Load from user-specific storage
    const existingProjects = loadFromUserStorage<Project[]>(
      userContext,
      DESIGN_STUDIO_KEYS.PROJECTS,
      []
    );
    
    if (existingProjects.length > 0) {
      const lastProject = existingProjects[existingProjects.length - 1];
      updateFloorElements(() => lastProject.elements);
      toast.success('Project loaded from your folder!');
    } else {
      toast.info('No saved projects found in your folder.');
    }
  };
  
  const handleExportProject = () => {
    // Export all user data
    const userData = exportUserData(userContext);
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `design-studio-export-${userContext.userName}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('✅ Project exported successfully!');
  };

  const handleExportPDF = () => {
    alert('PDF export will be available in Phase 3');
  };

  // Advanced Tools Handler
  const handleAdvancedAction = (action: AdvancedAction) => {
    const floor = floors.find(f => f.id === currentFloorId);
    if (!floor) return;

    const selectedEls = elements.filter(el => selectedElements.includes(el.id));

    switch (action) {
      case 'align-left':
      case 'align-center':
      case 'align-right':
      case 'align-top':
      case 'align-middle':
      case 'align-bottom':
        const alignment = action.replace('align-', '') as any;
        const aligned = AdvancedTools.alignElements(selectedEls, alignment);
        updateFloorElements(els => els.map(el => {
          const updated = aligned.find(a => a.id === el.id);
          return updated || el;
        }));
        setStatusMessage({ text: `Aligned ${selectedEls.length} elements`, type: 'success' });
        break;

      case 'distribute-horizontal':
        const distH = AdvancedTools.distributeElements(selectedEls, 'horizontal');
        updateFloorElements(els => els.map(el => {
          const updated = distH.find(d => d.id === el.id);
          return updated || el;
        }));
        setStatusMessage({ text: 'Distributed horizontally', type: 'success' });
        break;

      case 'distribute-vertical':
        const distV = AdvancedTools.distributeElements(selectedEls, 'vertical');
        updateFloorElements(els => els.map(el => {
          const updated = distV.find(d => d.id === el.id);
          return updated || el;
        }));
        setStatusMessage({ text: 'Distributed vertically', type: 'success' });
        break;

      case 'zoom-to-fit':
        const fitView = AdvancedTools.zoomToFit(elements, 1200, 800);
        setZoom(fitView.zoom);
        setPanOffset({ x: fitView.panX, y: fitView.panY });
        setStatusMessage({ text: 'Zoomed to fit all elements', type: 'info' });
        break;

      case 'zoom-to-selection':
        if (selectedEls.length > 0) {
          const selView = AdvancedTools.zoomToSelection(selectedEls, 1200, 800);
          setZoom(selView.zoom);
          setPanOffset({ x: selView.panX, y: selView.panY });
          setStatusMessage({ text: 'Zoomed to selection', type: 'info' });
        }
        break;

      case 'cleanup-walls':
        const cleaned = AdvancedTools.cleanupWalls(elements);
        updateFloorElements(() => cleaned);
        setStatusMessage({ text: 'Walls cleaned up and connected!', type: 'success' });
        break;

      case 'smart-join':
        const joined = AdvancedTools.smartJoin(elements);
        updateFloorElements(() => joined);
        setStatusMessage({ text: 'Elements auto-connected!', type: 'success' });
        break;
    }
  };

  // Context Menu Handler
  const handleContextMenuAction = (action: ContextMenuAction) => {
    const selectedEls = elements.filter(el => selectedElements.includes(el.id));

    switch (action) {
      case 'copy':
        // Store in clipboard (simplified)
        localStorage.setItem('clipboard', JSON.stringify(selectedEls));
        setStatusMessage({ text: `Copied ${selectedEls.length} element(s)`, type: 'success' });
        break;

      case 'paste':
        const clipboard = localStorage.getItem('clipboard');
        if (clipboard) {
          const copied = JSON.parse(clipboard);
          const pasted = copied.map((el: any) => ({
            ...el,
            id: `${el.id}-copy-${Date.now()}`,
            x: el.x + 20,
            y: el.y + 20
          }));
          updateFloorElements(els => [...els, ...pasted]);
          setStatusMessage({ text: `Pasted ${pasted.length} element(s)`, type: 'success' });
        }
        break;

      case 'duplicate':
        const duplicated = selectedEls.map(el => ({
          ...el,
          id: `${el.id}-dup-${Date.now()}`,
          x: el.x + 20,
          y: el.y + 20
        }));
        updateFloorElements(els => [...els, ...duplicated]);
        setSelectedElements(duplicated.map(el => el.id));
        setStatusMessage({ text: `Duplicated ${duplicated.length} element(s)`, type: 'success' });
        break;

      case 'delete':
        updateFloorElements(els => els.filter(el => !selectedElements.includes(el.id)));
        setSelectedElements([]);
        setStatusMessage({ text: `Deleted ${selectedEls.length} element(s)`, type: 'success' });
        break;

      case 'rotate-90':
        updateFloorElements(els => els.map(el => 
          selectedElements.includes(el.id) 
            ? { ...el, rotation: (el.rotation || 0) + 90 }
            : el
        ));
        setStatusMessage({ text: 'Rotated 90°', type: 'success' });
        break;

      case 'rotate-180':
        updateFloorElements(els => els.map(el => 
          selectedElements.includes(el.id) 
            ? { ...el, rotation: (el.rotation || 0) + 180 }
            : el
        ));
        setStatusMessage({ text: 'Rotated 180°', type: 'success' });
        break;

      case 'group':
        if (selectedEls.length > 1) {
          handleGroupSelected();
          setStatusMessage({ text: `Grouped ${selectedEls.length} elements`, type: 'success' });
        }
        break;

      case 'ungroup':
        handleUngroupSelected();
        setStatusMessage({ text: 'Ungrouped elements', type: 'success' });
        break;
    }

    setContextMenu(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  window.location.href = '/unified-dashboard';
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Back to Unified Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Box className="w-8 h-8 text-[#ea580c]" />
              <div>
                <h1 className="text-2xl font-bold text-white">Design Studio Pro</h1>
                <p className="text-sm text-gray-400">AI-Powered Floor Plan Design Center</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Primary Actions */}
              <button
                onClick={() => setShowProjectSelector(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-[#ea580c] flex items-center gap-2"
                title="Open Project"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Open</span>
              </button>

              <button
                onClick={handleSaveProject}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-green-500 flex items-center gap-2"
                title={`Save to your ${userContext.userType} folder`}
              >
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Save</span>
              </button>

              <button
                onClick={handleExportProject}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-blue-500 flex items-center gap-2"
                title="Export all your projects"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export</span>
              </button>

              <div className="w-px h-8 bg-[#2A2A2A]" />
              
              {/* User Context Indicator */}
              <button
                onClick={() => setShowUserContextSelector(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-[#ea580c] flex items-center gap-2"
                title="Change folder settings"
              >
                <User className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-sm text-gray-500">Saving as:</div>
                  <div className="text-sm font-medium capitalize">{userContext.userType}</div>
                </div>
              </button>

              <div className="w-px h-8 bg-[#2A2A2A]" />

              {/* AI Tools */}
              <button
                onClick={() => setShowAIUpload(true)}
                className="px-4 py-2 bg-[#ea580c] hover:bg-orange-600 text-white rounded-lg transition flex items-center gap-2"
                title="AI Video to Floor Plan"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">AI Generate</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">BETA</span>
              </button>

              <button
                onClick={() => setShowBlueprintAnalyzer(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-purple-600/50 hover:border-purple-500 flex items-center gap-2"
                title="Import & Analyze Blueprints"
              >
                <FileUp className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Import</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">BETA</span>
              </button>

              <button
                onClick={() => setShowAutoDetectionTools(true)}
                disabled={elements.length === 0}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                title="Auto-detect & Verify"
              >
                <Wand2 className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium">Auto</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">BETA</span>
              </button>

              <div className="w-px h-8 bg-[#2A2A2A]" />

              {/* Design Tools */}
              <button
                onClick={() => setShowKitchenDesigner(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-orange-500 flex items-center gap-2"
                title="Kitchen & Cabinet Designer"
              >
                <Package className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium">Kitchen</span>
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">BETA</span>
              </button>

              <button
                onClick={() => setShowFurnitureLibrary(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] flex items-center gap-2"
                title="Furniture Library"
              >
                <Box className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Furniture</span>
              </button>

              <button
                onClick={() => setShowMEPLibrary(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-yellow-500 flex items-center gap-2"
                title="MEP Systems (Electrical & Plumbing)"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">MEP</span>
              </button>

              <button
                onClick={() => setShowScheduleGenerator(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-blue-600/50 hover:border-blue-500 flex items-center gap-2"
                title="Construction Schedule Generator"
              >
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Schedule</span>
              </button>

              <div className="w-px h-8 bg-[#2A2A2A]" />

              {/* View & Organize */}
              <button
                onClick={() => setShowMultiStory(true)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] flex items-center gap-2"
                title="Multi-Story Manager"
              >
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium">Floors</span>
              </button>

              <button
                onClick={() => setShowLayersPanel(!showLayersPanel)}
                className={`px-4 py-2 rounded-lg transition border flex items-center gap-2 ${
                  showLayersPanel
                    ? 'bg-[#ea580c] border-[#ea580c] text-white'
                    : 'bg-[#1A1A1A] hover:bg-[#2A2A2A] border-[#2A2A2A] text-white'
                }`}
                title="Layers & Groups"
              >
                <Layers className="w-4 h-4" />
                <span className="text-sm font-medium">Layers</span>
              </button>

              <button
                onClick={() => setShowMeasurementsPanel(!showMeasurementsPanel)}
                className={`px-4 py-2 rounded-lg transition border flex items-center gap-2 ${
                  showMeasurementsPanel
                    ? 'bg-[#ea580c] border-[#ea580c] text-white'
                    : 'bg-[#1A1A1A] hover:bg-[#2A2A2A] border-[#2A2A2A] text-white'
                }`}
                title="Measurements Panel"
              >
                <Ruler className="w-4 h-4" />
                <span className="text-sm font-medium">Measure</span>
              </button>

              <div className="w-px h-8 bg-[#2A2A2A]" />

              {/* 3D & Render */}
              <button
                onClick={() => setShow3DViewer(true)}
                disabled={elements.length === 0}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                title="3D Viewer"
              >
                <Maximize className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">3D</span>
              </button>

              <button
                onClick={() => setShowRenderingPanel(true)}
                disabled={elements.length === 0}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-purple-600/50 hover:border-purple-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                title="Photorealistic Render"
              >
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Render</span>
              </button>

              <div className="w-px h-8 bg-[#2A2A2A]" />

              {/* Export & Code */}
              <button
                onClick={() => setShowBuildingCodeChecker(true)}
                disabled={elements.length === 0}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                title="Building Code Check"
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium">Code</span>
              </button>

              <button
                onClick={openVersionHistory}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] flex items-center gap-2"
                title="Version History"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">History</span>
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                disabled={elements.length === 0}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-green-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                title="Export Blueprints"
              >
                <Download className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Export</span>
              </button>

              {/* Attach the current plan to the originating quote as a buildable deliverable */}
              {activeQuote?.quoteId && (
                <button
                  onClick={savePlanToQuote}
                  disabled={elements.length === 0 || savingDeliverable}
                  className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-lg transition border border-[#2A2A2A] hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Save this floor plan to the quote as a buildable deliverable"
                >
                  <Save className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{savingDeliverable ? 'Saving…' : 'Save to Quote'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Toolbar */}
        <div className="w-20 bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col items-center py-4 gap-2">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'select'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Select"
          >
            <Move className="w-5 h-5" />
          </button>

          <div className="w-12 h-px bg-[#2A2A2A] my-2" />

          <button
            onClick={() => setActiveTool('wall')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'wall'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Wall"
          >
            <Square className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('door')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'door'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Door"
          >
            <DoorOpen className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('window')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'window'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Window"
          >
            <SquareDashed className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('room')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'room'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Room"
          >
            <Home className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('measure')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'measure'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Measure"
          >
            <Ruler className="w-5 h-5" />
          </button>

          <div className="w-12 h-px bg-[#2A2A2A] my-2" />

          {/* Advanced Drawing Tools */}
          <button
            onClick={() => setActiveTool('circle')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'circle'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Circle"
          >
            <Circle className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('polygon')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'polygon'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Polygon"
          >
            <Pentagon className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('line')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'line'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Line"
          >
            <Minus className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('bezier')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'bezier'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Bezier Curve"
          >
            <Spline className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('text')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'text'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Text Annotation"
          >
            <Type className="w-5 h-5" />
          </button>

          <div className="w-12 h-px bg-[#2A2A2A] my-2" />

          {/* Dimensioning Tools */}
          <button
            onClick={() => setActiveTool('dimension')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'dimension'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Dimension Line"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTool('leader')}
            className={`p-3 rounded-lg transition-all ${
              activeTool === 'leader'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
            title="Leader Callout"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <div className="w-12 h-px bg-[#2A2A2A] my-2" />

          <button
            onClick={handleDeleteSelected}
            disabled={!selectedElement}
            className={`p-3 rounded-lg transition-all ${
              selectedElement
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[#2A2A2A] text-gray-600 cursor-not-allowed'
            }`}
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative">
          {/* Canvas Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setGridVisible(!gridVisible)}
              className={`p-2 border border-[#2A2A2A] rounded-lg transition-colors ${
                gridVisible ? 'bg-[#ea580c]' : 'bg-[#1A1A1A] hover:bg-[#2A2A2A]'
              }`}
              title="Toggle Grid"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>

            {/* Show All Measurements Toggle */}
            <button
              onClick={() => setShowAllMeasurements(!showAllMeasurements)}
              className={`p-2 border border-[#2A2A2A] rounded-lg transition-colors ${
                showAllMeasurements ? 'bg-[#10b981]' : 'bg-[#1A1A1A] hover:bg-[#2A2A2A]'
              }`}
              title="Show All Measurements"
            >
              <Ruler className="w-5 h-5" />
            </button>

            {/* 3D View Toggle */}
            <button
              onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
              className={`p-2 border border-[#2A2A2A] rounded-lg transition-colors ${
                viewMode === '3d' ? 'bg-[#ea580c]' : 'bg-[#1A1A1A] hover:bg-[#2A2A2A]'
              }`}
              title="Toggle 3D View"
            >
              <Box className="w-5 h-5" />
            </button>
            
            {/* Snap to Grid Toggle - IMPORTANT FOR PRECISE PLACEMENT */}
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 border-2 rounded-lg transition-all ${
                snapToGrid 
                  ? 'bg-[#ea580c] border-[#ea580c] text-white' 
                  : 'bg-[#1A1A1A] border-[#FFD700] text-[#FFD700] hover:bg-[#2A2A2A]'
              }`}
              title={snapToGrid ? "Snap to Grid ON (Click to disable for precise placement)" : "Snap to Grid OFF (Precise placement enabled)"}
            >
              <div className="flex flex-col items-center gap-1">
                <Grid3x3 className="w-5 h-5" />
                <span className="text-[10px] font-bold">
                  {snapToGrid ? 'SNAP' : 'FREE'}
                </span>
              </div>
            </button>
            
            {/* Measurements Toggle */}
            <button
              onClick={() => setShowMeasurements(!showMeasurements)}
              className={`p-2 border-2 rounded-lg transition-all ${
                showMeasurements 
                  ? 'bg-[#ea580c] border-[#ea580c] text-white' 
                  : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:bg-[#2A2A2A]'
              }`}
              title={showMeasurements ? "Measurements ON (Click to hide)" : "Measurements OFF (Click to show)"}
            >
              <div className="flex flex-col items-center gap-1">
                <Ruler className="w-5 h-5" />
                <span className="text-[10px] font-bold">
                  {showMeasurements ? 'ON' : 'OFF'}
                </span>
              </div>
            </button>
          </div>

          {/* 3D Camera Controls */}
          {viewMode === '3d' && (
            <div className="absolute top-24 left-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 space-y-3 w-64">
              <div className="flex items-center gap-2 mb-2">
                <Box className="w-5 h-5 text-[#ea580c]" />
                <h3 className="font-semibold">3D Camera Controls</h3>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-1">
                    <RotateCw className="w-4 h-4" />
                    Rotation
                  </label>
                  <span className="text-sm text-white font-semibold">{cameraRotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={cameraRotation}
                  onChange={(e) => setCameraRotation(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 flex items-center gap-1">
                    <MoveVertical className="w-4 h-4" />
                    Pitch
                  </label>
                  <span className="text-sm text-white font-semibold">{cameraPitch}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={cameraPitch}
                  onChange={(e) => setCameraPitch(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#2A2A2A]">
                <button
                  onClick={() => { setCameraRotation(45); setCameraPitch(30); }}
                  className="flex-1 px-3 py-2 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors text-sm"
                >
                  Reset View
                </button>
              </div>
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            className={`w-full h-full ${isPanning ? 'cursor-grab' : activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
            style={{ backgroundColor: '#0A0A0A' }}
          />

          {/* Zoom Level Indicator */}
          <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm">
            Zoom: {Math.round(zoom * 100)}%
          </div>
          
          {/* Continuous Wall Mode Indicator */}
          {continuousWallMode && activeTool === 'wall' && (
            <div className="absolute bottom-4 left-32 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] border-2 border-[#FFD700] rounded-lg text-sm font-bold animate-pulse shadow-lg">
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                <span>CONTINUOUS WALL MODE</span>
              </div>
              <div className="text-sm text-gray-200 mt-1">
                Click to continue • Double-click to finish
              </div>
            </div>
          )}

          {/* Pan Mode Indicator */}
          {isPanning && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 border-2 border-blue-400 rounded-lg text-sm font-bold shadow-lg">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4" />
                <span>PAN MODE (Hold Spacebar)</span>
              </div>
            </div>
          )}

          {/* Snap Status Indicators */}
          <div className="absolute top-4 right-4 flex gap-2">
            {snapToGrid && (
              <div className="px-3 py-1.5 bg-green-600 border border-green-400 rounded-lg text-sm font-bold flex items-center gap-1">
                <Square className="w-3 h-3" />
                SNAP TO GRID
              </div>
            )}
            {snapToElements && (
              <div className="px-3 py-1.5 bg-blue-600 border border-blue-400 rounded-lg text-sm font-bold flex items-center gap-1">
                <Move className="w-3 h-3" />
                SNAP TO ELEMENTS
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="absolute bottom-4 right-4 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm space-y-1 max-w-xs">
            <div className="font-semibold text-[#ea580c] mb-2">Keyboard Shortcuts</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-400">
              <span>S</span><span>Select</span>
              <span>W</span><span>Wall</span>
              <span>D</span><span>Door</span>
              <span>R</span><span>Room</span>
              <span>G</span><span className={snapToGrid ? 'text-green-400 font-bold' : ''}>Grid Snap</span>
              <span>E</span><span className={snapToElements ? 'text-blue-400 font-bold' : ''}>Element Snap</span>
              <span>3</span><span className={viewMode === '3d' ? 'text-[#ea580c] font-bold' : ''}>3D View</span>
              <span>Space</span><span>Pan</span>
              <span>Arrows</span><span>Nudge</span>
              <span>Ctrl+Z</span><span>Undo</span>
              <span>Ctrl+Y</span><span>Redo</span>
              <span>Ctrl+G</span><span>Group</span>
              <span>Ctrl+Shift+G</span><span className="text-sm">Ungroup</span>
              <span>Ctrl+C/V</span><span>Copy/Paste</span>
              <span>Ctrl+D</span><span>Duplicate</span>
              <span>Del</span><span>Delete</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties & Measurements */}
        <div className="w-80 bg-[#1A1A1A] border-l border-[#2A2A2A] overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Measurements */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#ea580c]" />
                Measurements
              </h3>
              <div className="space-y-2">
                {measurements.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-[#2A2A2A] rounded-lg"
                  >
                    <span className="text-gray-400 text-sm">{m.label}</span>
                    <span className="text-white font-semibold">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Element Properties */}
            {selectedElement && (() => {
              const selected = elements.find((el) => el.id === selectedElement);
              return selected && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#ea580c]" />
                  Properties
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <p className="text-sm text-gray-400">Selected Element</p>
                    <p className="text-white font-semibold">
                      {selected.type.toUpperCase()}
                    </p>
                  </div>

                  {/* Precise numeric geometry (inches) */}
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Position &amp; Size (in)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: 'x', label: 'X' },
                        { key: 'y', label: 'Y' },
                        { key: 'width', label: 'W' },
                        { key: 'height', label: 'H' },
                      ] as const).map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 w-4">{label}</span>
                          <input
                            type="number"
                            step="0.5"
                            value={Math.round((selected[key] as number) * 100) / 100}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (isNaN(v)) return;
                              if ((key === 'width' || key === 'height') && v <= 0) return;
                              updateFloorElements(els =>
                                els.map(el => (el.id === selectedElement ? { ...el, [key]: v } : el))
                              );
                            }}
                            className="flex-1 min-w-0 p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-gray-500 w-12">Rotate</span>
                      <input
                        type="number"
                        step="1"
                        value={Math.round((selected.rotation || 0) * 10) / 10}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (isNaN(v)) return;
                          updateFloorElements(els =>
                            els.map(el => (el.id === selectedElement ? { ...el, rotation: ((v % 360) + 360) % 360 } : el))
                          );
                        }}
                        className="flex-1 min-w-0 p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                      />
                      <span className="text-gray-400 text-sm">°</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {inchesToArchitectural(selected.width)} × {inchesToArchitectural(selected.height)}
                    </p>
                  </div>

                  {selected.type === 'wall' && (
                    <div className="p-3 bg-[#2A2A2A] rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Wall Thickness</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editingThickness || selected.height.toString()}
                          onChange={(e) => setEditingThickness(e.target.value)}
                          placeholder={selected.height.toString()}
                          className="flex-1 p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                        <span className="text-gray-400 text-sm">in</span>
                        <button
                          onClick={() => {
                            const thickness = parseFloat(editingThickness || selected.height.toString());
                            if (!isNaN(thickness) && thickness > 0) {
                              updateFloorElements(elements =>
                                elements.map(el =>
                                  el.id === selectedElement
                                    ? { ...el, height: thickness }
                                    : el
                                )
                              );
                              setEditingDimensions({ ...editingDimensions, height: thickness.toString() });
                              setEditingThickness('');
                            }
                          }}
                          className="p-2 bg-[#ea580c] text-white rounded-lg text-sm font-semibold"
                        >
                          Set
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, height: 4 }
                                  : el
                              )
                            );
                            setEditingDimensions({ ...editingDimensions, height: '4' });
                          }}
                          className="px-2 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-sm rounded"
                        >
                          4" (2x4)
                        </button>
                        <button
                          onClick={() => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, height: 6 }
                                  : el
                              )
                            );
                            setEditingDimensions({ ...editingDimensions, height: '6' });
                          }}
                          className="px-2 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-sm rounded"
                        >
                          6" (2x6)
                        </button>
                        <button
                          onClick={() => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, height: 8 }
                                  : el
                              )
                            );
                            setEditingDimensions({ ...editingDimensions, height: '8' });
                          }}
                          className="px-2 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-sm rounded"
                        >
                          8" (2x8)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Wall Height for 3D View */}
                  {selected.type === 'wall' && (
                    <div className="p-3 bg-[#2A2A2A] rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Wall Height (3D)</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="60"
                          max="240"
                          value={selected.wallHeight || 96}
                          onChange={(e) => {
                            const height = parseInt(e.target.value);
                            if (!isNaN(height) && height > 0) {
                              updateFloorElements(elements =>
                                elements.map(el =>
                                  el.id === selectedElement
                                    ? { ...el, wallHeight: height }
                                    : el
                                )
                              );
                            }
                          }}
                          className="flex-1 p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                        <span className="text-gray-400 text-sm">in</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, wallHeight: 96 }
                                  : el
                              )
                            );
                          }}
                          className="px-2 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-sm rounded"
                        >
                          8' Standard
                        </button>
                        <button
                          onClick={() => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, wallHeight: 108 }
                                  : el
                              )
                            );
                          }}
                          className="px-2 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-sm rounded"
                        >
                          9' High
                        </button>
                        <button
                          onClick={() => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, wallHeight: 120 }
                                  : el
                              )
                            );
                          }}
                          className="px-2 py-1 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-sm rounded"
                        >
                          10' Tall
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        {inchesToArchitectural(selected.wallHeight || 96)}
                      </p>
                    </div>
                  )}
                  
                  {/* Shape-specific properties */}
                  {selected.type === 'shape' && selected.subtype === 'polygon' && (
                    <div className="p-3 bg-[#2A2A2A] rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Polygon Sides</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="3"
                          max="12"
                          value={selected.sides || 6}
                          onChange={(e) => {
                            const sides = parseInt(e.target.value);
                            if (!isNaN(sides) && sides >= 3 && sides <= 12) {
                              updateFloorElements(elements =>
                                elements.map(el =>
                                  el.id === selectedElement
                                    ? { ...el, sides }
                                    : el
                                )
                              );
                            }
                          }}
                          className="flex-1 p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                        <span className="text-gray-400 text-sm">sides</span>
                      </div>
                    </div>
                  )}
                  
                  {selected.type === 'shape' && (
                    <div className="p-3 bg-[#2A2A2A] rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Shape Color</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selected.color || '#3b82f6'}
                          onChange={(e) => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, color: e.target.value }
                                  : el
                              )
                            );
                          }}
                          className="w-full h-10 bg-[#3A3A3A] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                  
                  {selected.type === 'annotation' && selected.subtype === 'text' && (
                    <div className="p-3 bg-[#2A2A2A] rounded-lg space-y-3">
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Text</p>
                        <input
                          type="text"
                          value={selected.text || ''}
                          onChange={(e) => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, text: e.target.value }
                                  : el
                              )
                            );
                          }}
                          className="w-full p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Font Size</p>
                        <input
                          type="number"
                          min="8"
                          max="72"
                          value={selected.fontSize || 16}
                          onChange={(e) => {
                            const fontSize = parseInt(e.target.value);
                            if (!isNaN(fontSize)) {
                              updateFloorElements(elements =>
                                elements.map(el =>
                                  el.id === selectedElement
                                    ? { ...el, fontSize }
                                    : el
                                )
                              );
                            }
                          }}
                          className="w-full p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Text Color</p>
                        <input
                          type="color"
                          value={selected.color || '#ffffff'}
                          onChange={(e) => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, color: e.target.value }
                                  : el
                              )
                            );
                          }}
                          className="w-full h-10 bg-[#3A3A3A] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Dimension properties */}
                  {selected.type === 'dimension' && (
                    <div className="p-3 bg-[#2A2A2A] rounded-lg space-y-3">
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Dimension Offset</p>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={selected.dimensionOffset || 20}
                          onChange={(e) => {
                            const offset = parseInt(e.target.value);
                            if (!isNaN(offset)) {
                              updateFloorElements(elements =>
                                elements.map(el =>
                                  el.id === selectedElement
                                    ? { ...el, dimensionOffset: offset }
                                    : el
                                )
                              );
                            }
                          }}
                          className="w-full p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Show Units</p>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.showUnits !== false}
                            onChange={(e) => {
                              updateFloorElements(elements =>
                                elements.map(el =>
                                  el.id === selectedElement
                                    ? { ...el, showUnits: e.target.checked }
                                    : el
                                )
                              );
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-white text-sm">Display measurement units</span>
                        </label>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Dimension Color</p>
                        <input
                          type="color"
                          value={selected.color || '#FFD700'}
                          onChange={(e) => {
                            updateFloorElements(elements =>
                              elements.map(el =>
                                el.id === selectedElement
                                  ? { ...el, color: e.target.value }
                                  : el
                              )
                            );
                          }}
                          className="w-full h-10 bg-[#3A3A3A] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 bg-[#2A2A2A] rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">Dimensions</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 w-14">Length:</span>
                        <input
                          type="text"
                          value={editingDimensions.width}
                          onChange={(e) => setEditingDimensions({ ...editingDimensions, width: e.target.value })}
                          placeholder={inchesToArchitectural(selected.width)}
                          className="flex-1 p-1.5 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                      </div>
                      {selected.type !== 'wall' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 w-14">Height:</span>
                          <input
                            type="text"
                            value={editingDimensions.height}
                            onChange={(e) => setEditingDimensions({ ...editingDimensions, height: e.target.value })}
                            placeholder={inchesToArchitectural(selected.height)}
                            className="flex-1 p-1.5 bg-[#3A3A3A] text-white rounded-lg text-sm"
                          />
                        </div>
                      )}
                      <button
                        onClick={handleUpdateDimensions}
                        className="w-full p-2 bg-[#ea580c] text-white rounded-lg text-sm font-semibold"
                      >
                        Update Dimensions
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Current: {inchesToArchitectural(selected.width)} × {inchesToArchitectural(selected.height)}
                    </p>
                  </div>
                  
                  {selected.rotation !== 0 && (
                    <div className="p-3 bg-[#2A2A2A] rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Rotation</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editingRotation || Math.round(selected.rotation).toString()}
                          onChange={(e) => setEditingRotation(e.target.value)}
                          className="flex-1 p-2 bg-[#3A3A3A] text-white rounded-lg text-sm"
                        />
                        <span className="text-gray-400 text-sm">deg</span>
                        <button
                          onClick={() => {
                            const rotation = parseFloat(editingRotation || selected.rotation.toString());
                            if (!isNaN(rotation)) {
                              updateFloorElements(elements =>
                                elements.map(el =>
                                  el.id === selectedElement
                                    ? { ...el, rotation }
                                    : el
                                )
                              );
                              setEditingRotation('');
                            }
                          }}
                          className="p-2 bg-[#ea580c] text-white rounded-lg text-sm font-semibold"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#ea580c]" />
                Elements ({elements.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {elements.map((el) => (
                  <button
                    key={el.id}
                    onClick={() => setSelectedElement(el.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedElement === el.id
                        ? 'bg-[#ea580c] text-white'
                        : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {el.label || el.type.charAt(0).toUpperCase() + el.type.slice(1)}
                      </span>
                      <span className="text-sm opacity-70">
                        {el.width} x {el.height}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Settings</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="w-4 h-4 accent-[#ea580c]"
                  />
                  <span className="text-sm text-gray-300">Snap to Grid</span>
                </label>
                
                <label className="flex items-center gap-3 p-3 bg-[#2A2A2A] rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMeasurements}
                    onChange={(e) => setShowMeasurements(e.target.checked)}
                    className="w-4 h-4 accent-[#ea580c]"
                  />
                  <span className="text-sm text-gray-300">Show Measurements</span>
                </label>
              </div>
            </div>

            {/* Floor Plan Measurements Panel */}
            {showMeasurementsPanel && (
              <div className="border-t border-[#2A2A2A] pt-4">
                <FloorPlanMeasurementsPanel
                  elements={elements}
                  floors={floors}
                  currentFloorId={currentFloorId}
                  onExport={() => setShowExportModal(true)}
                />
              </div>
            )}

            {/* Current Project Section */}
            {currentProject && (
              <div className="border-t border-[#2A2A2A] pt-4">
                <ProjectInfoPanel 
                  quoteId={currentProject.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Import Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Import from Video/Camera</h2>
              <button
                onClick={() => setShowCameraModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-400">
                Connect to camera systems to automatically generate floor plans from video footage.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setShowCameraModal(false);
                    onNavigate('change-order-camera');
                  }}
                  className="p-6 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors text-left"
                >
                  <Camera className="w-8 h-8 text-[#ea580c] mb-3" />
                  <h3 className="font-semibold mb-2">Change Order Camera</h3>
                  <p className="text-sm text-gray-400">
                    Capture existing spaces for renovation planning
                  </p>
                </button>

                <button
                  onClick={() => {
                    setShowCameraModal(false);
                    onNavigate('work-request-intake');
                  }}
                  className="p-6 bg-[#2A2A2A] rounded-lg hover:bg-[#3A3A3A] transition-colors text-left"
                >
                  <Video className="w-8 h-8 text-[#ea580c] mb-3" />
                  <h3 className="font-semibold mb-2">Work Request Camera</h3>
                  <p className="text-sm text-gray-400">
                    Document work areas with video capture
                  </p>
                </button>
              </div>

              <div className="pt-4 border-t border-[#2A2A2A]">
                <p className="text-sm text-gray-500 italic">
                  Note: AI video-to-floor plan generation will be available in Phase 2
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Viewer Modal */}
      {show3DViewer && (
        <FloorPlan3DViewer
          elements={elements}
          onClose={() => setShow3DViewer(false)}
        />
      )}

      {/* AI Upload Modal */}
      {showAIUpload && (
        <AIVideoUpload
          onFloorPlanGenerated={(newElements, metadata) => {
            console.log('✅ Floor plan generated:', metadata);
            updateFloorElements(() => newElements);
            setShowAIUpload(false);
          }}
          onClose={() => setShowAIUpload(false)}
          onNavigateToCamera={(type) => {
            setShowAIUpload(false);
            if (type === 'change-order') {
              onNavigate('change-order-camera');
            } else {
              onNavigate('work-request-intake');
            }
          }}
        />
      )}

      {/* Multi-Story Manager Modal */}
      {showMultiStory && (
        <MultiStoryManager
          floors={floors}
          currentFloorId={currentFloorId}
          onFloorsChange={setFloors}
          onFloorSelect={setCurrentFloorId}
          onClose={() => setShowMultiStory(false)}
        />
      )}

      {/* Furniture Library Modal */}
      {showFurnitureLibrary && (
        <FurnitureLibrary
          onPlaceFurniture={(furniture) => {
            const newElement: CanvasElement = {
              id: `furniture-${Date.now()}`,
              type: 'furniture',
              x: 100,
              y: 100,
              width: furniture.width,
              height: furniture.height,
              rotation: 0,
              color: furniture.color,
              label: furniture.name,
              subtype: furniture.id, // Store furniture type ID for detailed rendering
            };
            updateFloorElements(elements => [...elements, newElement]);
            setSelectedElement(newElement.id);
          }}
          onClose={() => setShowFurnitureLibrary(false)}
        />
      )}

      {/* Auto-Detection Tools Modal */}
      {showAutoDetectionTools && (
        <AutoDetectionTools
          elements={elements}
          onUpdateElements={updateFloorElements}
          onClose={() => setShowAutoDetectionTools(false)}
        />
      )}

      {/* Building Code Checker Modal */}
      {showBuildingCodeChecker && (
        <BuildingCodeChecker
          elements={elements}
          onClose={() => setShowBuildingCodeChecker(false)}
        />
      )}

      {/* Version History Panel */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">Version History</h2>
                  <p className="text-xs text-gray-400">
                    {currentProject?.name || 'Current project'} · every save is a restorable snapshot
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingVersions && (
                <div className="flex items-center justify-center gap-3 py-10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading history…
                </div>
              )}

              {!loadingVersions && versionList.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  No snapshots yet. Save the project to create the first version.
                </div>
              )}

              {!loadingVersions && versionList.map((v, idx) => (
                <div
                  key={v.versionId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    idx === 0 ? 'bg-amber-500/5 border-amber-500/30' : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-sm font-bold text-white shrink-0">
                    v{v.version}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {v.note || 'Saved'}
                      {idx === 0 && <span className="ml-2 text-[10px] text-amber-300 font-bold">CURRENT</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(v.versionId, v.version)}
                    disabled={restoringVersionId !== null || idx === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    title={idx === 0 ? 'This is the current version' : 'Restore this version'}
                  >
                    {restoringVersionId === v.versionId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RotateCcw className="w-3.5 h-3.5" />}
                    Restore
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#2A2A2A] bg-[#1A1A1A]/50 text-xs text-gray-500">
              Restoring a version loads it into the editor and saves it as a new version, so you never lose history.
            </div>
          </div>
        </div>
      )}

      {/* MEPLibrary Modal */}
      {showMEPLibrary && (
        <MEPLibrary
          onPlaceItem={(mep) => {
            const newElement: CanvasElement = {
              id: `mep-${Date.now()}`,
              type: mep.type as 'electrical' | 'plumbing',
              x: 100,
              y: 100,
              width: mep.width,
              height: mep.height,
              rotation: 0,
              color: mep.color,
              label: mep.name,
              subtype: mep.subtype,
              connectionPoints: mep.connectionPoints,
              connectedTo: mep.connectedTo,
            };
            updateFloorElements(elements => [...elements, newElement]);
            setSelectedElement(newElement.id);
            setShowMEPLibrary(false);
          }}
          onClose={() => setShowMEPLibrary(false)}
        />
      )}

      {/* Layers & Groups Panel */}
      {showLayersPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] border-2 border-[#ea580c] rounded-lg w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#ea580c]" />
                Layers & Groups
              </h2>
              <button
                onClick={() => setShowLayersPanel(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Layers Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-[#ea580c]">Layers</h3>
                <div className="space-y-2">
                  {layers.map((layer) => {
                    const layerElementCount = elements.filter(el => el.layerId === layer.id).length;
                    return (
                      <div
                        key={layer.id}
                        className="p-3 bg-[#2A2A2A] rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span className="font-medium">{layer.name}</span>
                          <span className="text-sm text-gray-400">({layerElementCount} items)</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setLayers(layers.map(l =>
                                l.id === layer.id ? { ...l, visible: !l.visible } : l
                              ));
                            }}
                            className={`p-2 rounded transition-colors ${
                              layer.visible
                                ? 'bg-[#3A3A3A] hover:bg-[#4A4A4A]'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                            title={layer.visible ? 'Hide layer' : 'Show layer'}
                          >
                            {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setLayers(layers.map(l =>
                                l.id === layer.id ? { ...l, locked: !l.locked } : l
                              ));
                            }}
                            className={`p-2 rounded transition-colors ${
                              layer.locked
                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                : 'bg-[#3A3A3A] hover:bg-[#4A4A4A]'
                            }`}
                            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                          >
                            {layer.locked ? '🔒' : '🔓'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Groups Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-[#ea580c]">Groups</h3>
                  <button
                    onClick={handleGroup}
                    disabled={selectedElements.length < 2}
                    className="px-3 py-1 bg-[#ea580c] text-white rounded text-sm font-semibold hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Group Selected (Ctrl+G)
                  </button>
                </div>
                {groups.length === 0 ? (
                  <div className="p-4 bg-[#2A2A2A] rounded-lg text-center text-gray-400 text-sm">
                    No groups created yet. Select multiple elements and press Ctrl+G to group.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="p-3 bg-[#2A2A2A] rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Box className="w-4 h-4 text-blue-400" />
                          <span className="font-medium">{group.name}</span>
                          <span className="text-sm text-gray-400">({group.elementIds.length} items)</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedElements(group.elementIds);
                              setSelectedElement(null);
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors"
                          >
                            Select
                          </button>
                          <button
                            onClick={() => {
                              setSelectedElements(group.elementIds);
                              handleUngroup();
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors"
                          >
                            Ungroup
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Floor Plan Modal */}
      {showExportModal && (
        <ExportFloorPlanModal
          elements={elements}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Advanced Rendering Panel */}
      {showRenderingPanel && (
        <RenderingPanel
          onClose={() => setShowRenderingPanel(false)}
          onRender={(settings) => {
            console.log('🎨 Rendering with settings:', settings);
            setRenderSettings(settings);
            setShowRenderingPanel(false);
            setShowRenderEngine(true);
          }}
          onApplyMaterial={(elementId, material) => {
            console.log('🎨 Applying material:', material.name, 'to element:', elementId);
            // Update element with material data
            updateFloorElements(elements => 
              elements.map(el => 
                el.id === elementId 
                  ? { ...el, color: material.baseColor, material: material.id }
                  : el
              )
            );
          }}
        />
      )}

      {/* Render Engine */}
      {showRenderEngine && renderSettings && (
        <RenderEngine
          elements={elements}
          settings={renderSettings}
          onClose={() => {
            setShowRenderEngine(false);
            setRenderSettings(null);
          }}
          savingToQuote={savingDeliverable}
          onSaveToQuote={activeQuote?.quoteId
            ? (dataUrl: string) => saveDeliverableToQuote(dataUrl, `${activeQuote?.projectTitle || 'render'}`, 'rendering')
            : undefined}
        />
      )}

      {/* Project Selector */}
      {showProjectSelector && (
        <ProjectSelector
          onClose={() => setShowProjectSelector(false)}
          onSelectProject={(quote) => {
            setCurrentProject(quote);
            setShowProjectSelector(false);
            // Load project data from backend if exists
            console.log('Selected project:', quote);
          }}
        />
      )}

      {/* Advanced Canvas Tools */}
      <AdvancedCanvasTools
        onToolSelect={setAdvancedTool}
        activeTool={advancedTool}
        onAction={handleAdvancedAction}
        selectedElements={selectedElements}
      />

      {/* Canvas Minimap */}
      {showMinimap && (
        <CanvasMinimap
          elements={elements}
          canvasWidth={1920}
          canvasHeight={1080}
          viewportX={panOffset.x}
          viewportY={panOffset.y}
          viewportWidth={1200}
          viewportHeight={800}
          zoom={zoom}
          onViewportChange={(x, y) => setPanOffset({ x, y })}
        />
      )}

      {/* Canvas Coordinates Display */}
      {showCoordinates && (
        <CanvasCoordinates
          mouseX={mousePosition.x}
          mouseY={mousePosition.y}
          selectedElement={selectedElement ? elements.find(el => el.id === selectedElement) : undefined}
          gridSize={gridSize}
          snapToGrid={snapToGrid}
          zoom={zoom}
          units={units}
        />
      )}

      {/* Smart Guides */}
      <SmartGuides
        elements={elements}
        activeElement={selectedElement ? elements.find(el => el.id === selectedElement) : null}
        mouseX={mousePosition.x}
        mouseY={mousePosition.y}
        visible={showSmartGuides}
      />

      {/* Snap Indicator */}
      <SnapIndicator
        x={snapIndicator.x}
        y={snapIndicator.y}
        snapType={snapIndicator.type}
        visible={snapToGrid || snapIndicator.type !== null}
      />

      {/* Lasso Selection */}
      {advancedTool === 'lasso-select' && (
        <LassoSelection
          isActive={true}
          path={lassoPath}
          onComplete={(selectedIds) => {
            setSelectedElements(selectedIds);
            setLassoPath([]);
            setAdvancedTool(null);
          }}
          elements={elements}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedElements={elements.filter(el => selectedElements.includes(el.id))}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Quick Actions Toolbar */}
      {quickToolbar && selectedElements.length > 0 && (
        <QuickActionsToolbar
          selectedElements={elements.filter(el => selectedElements.includes(el.id))}
          position={quickToolbar}
          onAction={(action) => {
            handleContextMenuAction(action as ContextMenuAction);
            setQuickToolbar(null);
          }}
          visible={true}
        />
      )}

      {/* Wall Tool Overlay */}
      <WallToolOverlay
        isActive={activeTool === 'wall'}
        startPoint={drawStart}
        currentPoint={currentMousePos}
        length={drawStart && currentMousePos 
          ? Math.sqrt(Math.pow(currentMousePos.x - drawStart.x, 2) + Math.pow(currentMousePos.y - drawStart.y, 2))
          : 0
        }
        angle={drawStart && currentMousePos
          ? (Math.atan2(currentMousePos.y - drawStart.y, currentMousePos.x - drawStart.x) * 180) / Math.PI
          : 0
        }
        snapToAngle={wallSnapToAngle}
        continuousMode={continuousWallMode}
        wallThickness={6}
        onToggleSnap={() => setWallSnapToAngle(!wallSnapToAngle)}
        onToggleContinuous={() => setContinuousWallMode(!continuousWallMode)}
        onFinish={() => {
          setIsDrawing(false);
          setDrawStart(null);
          setCurrentMousePos(null);
          setLastWallEndPoint(null);
        }}
        onCancel={() => {
          setActiveTool('select');
          setIsDrawing(false);
          setDrawStart(null);
          setCurrentMousePos(null);
          setLastWallEndPoint(null);
          setContinuousWallMode(false);
        }}
      />

      {/* Erase Tool Overlay */}
      <EraseToolOverlay
        isActive={activeTool === 'erase'}
        hoveredElement={hoveredElement}
        selectedElements={eraseMode === 'multiple' ? eraseSelection : (hoveredElement ? [hoveredElement] : [])}
        onErase={(elementIds) => {
          updateFloorElements(els => els.filter(el => !elementIds.includes(el.id)));
          setEraseSelection([]);
          setStatusMessage({ text: `Deleted ${elementIds.length} element(s)`, type: 'success' });
        }}
        onCancel={() => {
          setActiveTool('select');
          setEraseSelection([]);
        }}
        onClearSelection={() => {
          setEraseSelection([]);
          setStatusMessage({ text: 'Selection cleared', type: 'info' });
        }}
        mode={eraseMode}
        onModeChange={setEraseMode}
      />

      {/* Undo/Redo Panel */}
      <UndoRedoPanel
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        historyIndex={historyIndex}
        historyLength={history.length}
      />

      {/* Enhanced Drawing Tools */}
      <EnhancedDrawingTools
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* Status Bar */}
      <CanvasStatusBar
        activeTool={activeTool}
        elementCount={elements.length}
        selectedCount={selectedElements.length}
        lastSaved={lastSaved}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        message={statusMessage?.text}
        messageType={statusMessage?.type}
      />

      {/* Kitchen & Cabinet Designer */}
      {showKitchenDesigner && (
        <KitchenCabinetDesigner
          onClose={() => setShowKitchenDesigner(false)}
          onSave={(kitchenData) => {
            // Save kitchen design to project
            setCurrentProject({
              ...currentProject,
              kitchenDesign: kitchenData,
              lastModified: new Date()
            });
            toast.success('Kitchen design saved to project!');
            setShowKitchenDesigner(false);
          }}
        />
      )}

      {/* Construction Schedule Generator */}
      {showScheduleGenerator && (
        <ConstructionScheduleGenerator
          onClose={() => setShowScheduleGenerator(false)}
          projectName={currentProject?.name || 'Current Project'}
          onSave={(scheduleData) => {
            // Save schedule to project
            setCurrentProject({
              ...currentProject,
              schedule: scheduleData,
              lastModified: new Date()
            });
            toast.success('Project schedule saved!');
            setShowScheduleGenerator(false);
          }}
        />
      )}

      {/* Blueprint Analyzer & Reader */}
      {showBlueprintAnalyzer && (
        <BlueprintAnalyzer
          onClose={() => setShowBlueprintAnalyzer(false)}
          onImport={(blueprintData) => {
            // Import blueprint analysis to canvas
            console.log('Blueprint imported:', blueprintData);
            
            // Convert blueprint analysis to canvas elements
            if (blueprintData.analysis) {
              const analysis = blueprintData.analysis;
              
              // Create rooms from analysis
              const newElements: any[] = [];
              let yOffset = 100;
              
              analysis.dimensions.rooms.forEach((room: any, idx: number) => {
                const roomElement = {
                  id: `room-imported-${idx}`,
                  type: 'room' as const,
                  x: 100,
                  y: yOffset,
                  width: room.width * 10, // Scale for canvas
                  height: room.height * 10,
                  rotation: 0,
                  color: '#3b82f6',
                  label: room.name,
                  layerId: 'layer-default'
                };
                newElements.push(roomElement);
                yOffset += (room.height * 10) + 50;
              });
              
              // Add to current floor
              updateFloorElements(els => [...els, ...newElements]);
              
              toast.success(`Imported ${analysis.dimensions.rooms.length} rooms from blueprint!`);
            }
            
            setShowBlueprintAnalyzer(false);
          }}
        />
      )}

      {/* Smart Room Detector */}
      {showSmartRoomDetector && (
        <SmartRoomDetector
          walls={elements.filter(el => el.type === 'wall')}
          doors={elements.filter(el => el.type === 'door')}
          windows={elements.filter(el => el.type === 'window')}
          onRoomsDetected={(detectedRooms) => {
            // Add detected rooms to canvas
            updateFloorElements(els => [...els, ...detectedRooms]);
            toast.success(`Added ${detectedRooms.length} rooms to floor plan!`);
            setShowSmartRoomDetector(false);
          }}
          onClose={() => setShowSmartRoomDetector(false)}
        />
      )}

      {/* Quote Context Panel */}
      {activeQuote && showQuotePanel && (
        <QuoteContextPanel
          quoteData={activeQuote}
          designElements={elements}
          onSaveToQuote={async (updatedQuote) => {
            try {
              // Save to backend
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/quotes/${activeQuote.quoteId}`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    floorPlanData: updatedQuote.floorPlanData,
                    materials: updatedQuote.materials,
                    lastModified: updatedQuote.lastModified
                  }),
                }
              );

              if (!response.ok) {
                throw new Error('Failed to save quote');
              }

              // Update local state
              setActiveQuote(updatedQuote);

              // Auto-push into the sales Pipeline so a designed quote becomes a
              // tracked opportunity (non-fatal if it fails).
              try {
                const mats = Array.isArray(updatedQuote.materials) ? updatedQuote.materials : [];
                const materialsSubtotal = mats.reduce(
                  (s: number, m: any) => s + (Number(m.totalCost) || (Number(m.quantity) || 0) * (Number(m.unitCost) || 0)),
                  0
                );
                const estValue = Number(updatedQuote.total) || materialsSubtotal;
                const pipelineItem = {
                  id: `PIPE-${activeQuote.quoteId}`,
                  itemNumber: updatedQuote.quoteNumber || activeQuote.quoteId,
                  stage: 'quote-draft',
                  customerName: updatedQuote.customerName || 'Unassigned',
                  location: '',
                  serviceType: 'Design Studio',
                  title: `${updatedQuote.quoteNumber || activeQuote.quoteId} — ${updatedQuote.projectTitle || 'Design'}`,
                  description: `Design saved from Design Studio (${mats.length} materials)`,
                  estimatedValue: estValue,
                  priority: 'medium',
                  createdDate: new Date().toISOString(),
                  lastModified: new Date().toISOString(),
                  customerId: updatedQuote.customerId || '',
                  source: 'design-studio',
                  quote: {
                    id: activeQuote.quoteId,
                    quoteNumber: updatedQuote.quoteNumber || activeQuote.quoteId,
                    materials: mats.map((m: any) => ({
                      id: `${activeQuote.quoteId}-${Math.random().toString(36).slice(2, 8)}`,
                      name: m.name, quantity: m.quantity, unit: 'each',
                      unitCost: m.unitCost, totalCost: m.totalCost, category: 'Design', visible: true,
                    })),
                    labor: [],
                    processSteps: [],
                    materialsSubtotal,
                    laborSubtotal: 0,
                    taxRate: 0.08,
                    taxAmount: materialsSubtotal * 0.08,
                    totalCost: estValue,
                    generatedAt: new Date().toISOString(),
                    approvalStatus: 'pending',
                  },
                };
                const pipeRes = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/pipeline/items`,
                  {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(pipelineItem),
                  }
                );
                if (!pipeRes.ok) console.error('[DesignStudio] Pipeline push failed with', pipeRes.status);
              } catch (pipeErr) {
                console.error('[DesignStudio] Error pushing design quote to pipeline:', pipeErr);
              }

              toast.success('Design saved to quote & pipeline!', {
                description: 'Quote updated successfully'
              });
            } catch (error) {
              console.error('Error saving to quote:', error);
              throw error;
            }
          }}
          onReturnToQuote={() => {
            // Navigate back to quote page
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('returnUrl') || `/quotes/${activeQuote.quoteId}`;
            window.location.href = returnUrl;
          }}
        />
      )}

      {/* User Context Selector */}
      {showUserContextSelector && (
        <UserContextSelector
          currentContext={userContext}
          onContextChange={(newContext) => {
            setUserContext(newContext);
            toast.success(`✅ Now saving to ${newContext.userType} folder`);
          }}
          onClose={() => setShowUserContextSelector(false)}
        />
      )}
    </div>
  );
}

// Wrap the editor so a rendering crash inside the design tool never takes down
// the whole application — the user gets a recoverable fallback instead.
export default function DesignStudioPro({ onNavigate }: DesignStudioProProps) {
  return (
    <ErrorBoundary
      onNavigate={onNavigate}
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] text-white p-8 text-center">
          <h1 className="text-2xl font-bold text-[#ea580c] mb-3">Design Studio hit a snag</h1>
          <p className="text-gray-400 max-w-md mb-6">
            The floor plan editor ran into an unexpected error. Your saved projects are safe — try
            reopening the studio or head back to the dashboard.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#ea580c] hover:bg-orange-600 text-white rounded-lg font-semibold"
            >
              Reload Studio
            </button>
            <button
              onClick={() => onNavigate?.('unified-dashboard')}
              className="px-5 py-2.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      }
    >
      <DesignStudioProInner onNavigate={onNavigate} />
    </ErrorBoundary>
  );
}