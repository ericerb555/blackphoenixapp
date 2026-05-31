// Structural Design - Refactored Modular Version
import { useState } from 'react';
import { ArrowLeft, Save, Grid3x3, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { StructuralCanvas } from '../components/StructuralCanvas';
import { StructuralToolbar } from '../components/StructuralToolbar';
import { StructuralPropertiesPanel } from '../components/StructuralPropertiesPanel';
import { StructuralLayersPanel } from '../components/StructuralLayersPanel';
import { LoadAnalysisPanel } from '../components/LoadAnalysisPanel';
import { ConnectionDesignPanel } from '../components/ConnectionDesignPanel';
import { ComplianceCheckPanel } from '../components/ComplianceCheckPanel';
import { MaterialSpecificationPanel } from '../components/MaterialSpecificationPanel';
import { CostEstimationPanel } from '../components/CostEstimationPanel';
import { Visualization3DPanel } from '../components/Visualization3DPanel';
import { ExportDocumentationPanel } from '../components/ExportDocumentationPanel';
import { ScheduleTimelinePanel } from '../components/ScheduleTimelinePanel';

interface StructuralDesignProps {
  onNavigate: (page: string) => void;
}

type StructuralTool = 'select' | 'beam' | 'column' | 'foundation' | 'slab' | 'dimension' | 'annotation';

interface StructuralElement {
  id: string;
  type: 'beam' | 'column' | 'foundation' | 'slab';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layerId: string;
  properties: any;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export default function StructuralDesign({ onNavigate }: StructuralDesignProps) {
  const [activeTool, setActiveTool] = useState<StructuralTool>('select');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 400, y: 300 });
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid] = useState(true);
  const gridSize = 20;
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  
  const [elements, setElements] = useState<StructuralElement[]>([]);
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-1', name: 'Structural Grid', visible: true, locked: false, color: '#ea580c' },
    { id: 'layer-2', name: 'Beams', visible: true, locked: false, color: '#3b82f6' },
    { id: 'layer-3', name: 'Columns', visible: true, locked: false, color: '#10b981' },
    { id: 'layer-4', name: 'Foundations', visible: true, locked: false, color: '#f59e0b' },
    { id: 'layer-5', name: 'Slabs', visible: true, locked: false, color: '#8b5cf6' },
    { id: 'layer-6', name: 'Annotations', visible: true, locked: false, color: '#ffffff' },
  ]);
  
  const [currentLayer, setCurrentLayer] = useState('layer-1');
  const [history, setHistory] = useState<StructuralElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [projectName, setProjectName] = useState('Untitled Structural Design');

  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...elements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    
    if (snapToGrid) {
      return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize,
      };
    }
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    
    if (activeTool === 'select') {
      const clickedElement = elements.find(el => 
        coords.x >= el.x && coords.x <= el.x + el.width &&
        coords.y >= el.y && coords.y <= el.y + el.height
      );
      setSelectedElement(clickedElement ? clickedElement.id : null);
    } else {
      setIsDrawing(true);
      setDrawStart(coords);
      setCurrentMousePos(coords);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setCurrentMousePos(getCanvasCoords(e));
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !currentMousePos) return;
    
    const width = Math.abs(currentMousePos.x - drawStart.x);
    const height = Math.abs(currentMousePos.y - drawStart.y);
    
    if (width < 5 || height < 5) {
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentMousePos(null);
      return;
    }
    
    const newElement: StructuralElement = {
      id: `${activeTool}-${Date.now()}`,
      type: activeTool as any,
      x: Math.min(drawStart.x, currentMousePos.x),
      y: Math.min(drawStart.y, currentMousePos.y),
      width,
      height,
      rotation: 0,
      layerId: currentLayer,
      properties: getDefaultProperties(activeTool as any),
    };
    
    setElements([...elements, newElement]);
    saveToHistory();
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentMousePos(null);
    toast.success(`${activeTool} added`);
  };

  const getDefaultProperties = (type: 'beam' | 'column' | 'foundation' | 'slab') => {
    const counts = { beam: 0, column: 0, foundation: 0, slab: 0 };
    elements.forEach(el => counts[el.type]++);
    
    const defaults: Record<string, any> = {
      beam: { material: 'Reinforced Concrete', size: 'W12x26', load: 0, reinforcement: '4#5', grade: 'Grade 60', label: `Beam ${counts.beam + 1}` },
      column: { material: 'Reinforced Concrete', size: '12"x12"', load: 0, reinforcement: '8#8', grade: 'Grade 60', label: `Column ${counts.column + 1}` },
      foundation: { material: 'Concrete', thickness: 12, depth: 36, reinforcement: '#4 @ 12" O.C.', grade: '3000 PSI', label: `Foundation ${counts.foundation + 1}` },
      slab: { material: 'Concrete', thickness: 4, reinforcement: '6x6 W1.4xW1.4', grade: '3000 PSI', label: `Slab ${counts.slab + 1}` },
    };
    return defaults[type] || {};
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setElements(history[historyIndex - 1]);
      setHistoryIndex(historyIndex - 1);
      toast.success('Undo');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setElements(history[historyIndex + 1]);
      setHistoryIndex(historyIndex + 1);
      toast.success('Redo');
    }
  };

  const handleDelete = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
      saveToHistory();
      toast.success('Element deleted');
    }
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);
  const elementCounts = layers.reduce((acc, layer) => {
    acc[layer.id] = elements.filter(el => el.layerId === layer.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('design-studio-pro')}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Home className="w-6 h-6 text-orange-500" />
            <div>
              <h1 className="text-xl font-bold">Structural Design</h1>
              <p className="text-sm text-gray-400">Complete System: Canvas + Loads + Connections + Compliance + Materials + Cost + 3D</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="px-4 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg focus:outline-none focus:border-orange-500"
            />
            <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        <StructuralToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          canDelete={!!selectedElement}
        />

        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 z-10 flex gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-2">
            <button
              onClick={() => setGridVisible(!gridVisible)}
              className={`p-2 rounded ${gridVisible ? 'bg-orange-600' : 'hover:bg-[#2A2A2A]'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(Math.min(zoom + 0.1, 3))} className="p-2 hover:bg-[#2A2A2A] rounded">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))} className="p-2 hover:bg-[#2A2A2A] rounded">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="px-3 py-2 text-sm border-l border-[#2A2A2A]">{Math.round(zoom * 100)}%</div>
          </div>

          <StructuralCanvas
            elements={elements}
            layers={layers}
            zoom={zoom}
            panOffset={panOffset}
            selectedElement={selectedElement}
            gridVisible={gridVisible}
            isDrawing={isDrawing}
            drawStart={drawStart}
            currentMousePos={currentMousePos}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>

        <div className="w-80 bg-[#1A1A1A] border-l border-[#2A2A2A] overflow-y-auto">
          <StructuralLayersPanel
            layers={layers}
            currentLayer={currentLayer}
            elementCounts={elementCounts}
            onLayerSelect={setCurrentLayer}
            onLayerUpdate={(layerId, updates) => {
              setLayers(layers.map(l => l.id === layerId ? { ...l, ...updates } : l));
            }}
          />

          {selectedElementData && (
            <StructuralPropertiesPanel
              element={selectedElementData}
              onUpdate={(updates) => {
                setElements(elements.map(el => el.id === selectedElement ? { ...el, ...updates } : el));
              }}
            />
          )}

          <div className="p-4 border-t border-[#2A2A2A]">
            <h3 className="text-sm font-semibold mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Beams:</span><span className="text-blue-400">{elements.filter(e => e.type === 'beam').length}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Columns:</span><span className="text-green-400">{elements.filter(e => e.type === 'column').length}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Foundations:</span><span className="text-yellow-400">{elements.filter(e => e.type === 'foundation').length}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Slabs:</span><span className="text-purple-400">{elements.filter(e => e.type === 'slab').length}</span></div>
              <div className="flex justify-between pt-2 border-t border-[#2A2A2A] font-semibold"><span>Total:</span><span className="text-orange-400">{elements.length}</span></div>
            </div>
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <LoadAnalysisPanel
              elements={elements}
              selectedElementId={selectedElement}
              onUpdateElement={(id, updates) => {
                setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
              }}
            />
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <ConnectionDesignPanel
              elements={elements}
              selectedElementId={selectedElement}
              onAddConnection={(conn) => toast.success(`${conn.type} connection added`)}
            />
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <ComplianceCheckPanel elements={elements} selectedElementId={selectedElement} />
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <MaterialSpecificationPanel elements={elements} selectedElementId={selectedElement} />
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <CostEstimationPanel elements={elements} selectedElementId={selectedElement} />
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <Visualization3DPanel elements={elements} selectedElementId={selectedElement} />
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <ExportDocumentationPanel elements={elements} projectName={projectName} />
          </div>

          <div className="p-4 border-t border-[#2A2A2A]">
            <ScheduleTimelinePanel elements={elements} />
          </div>
        </div>
      </div>
    </div>
  );
}