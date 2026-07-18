// Advanced Canvas Tools - Professional CAD Features
import { useState } from 'react';
import {
  Lasso,
  Copy,
  Scissors,
  Grid2x2,
  FlipHorizontal,
  Maximize2,
  Ruler,
  AlignCenter,
  Layout,
  Square,
  Circle as CircleIcon,
  Calculator,
  Target,
  Move,
  RotateCw,
  Sparkles,
  Layers2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  MapPin,
  Triangle
} from 'lucide-react';

interface AdvancedCanvasToolsProps {
  onToolSelect: (tool: AdvancedTool) => void;
  activeTool: AdvancedTool | null;
  onAction: (action: AdvancedAction) => void;
  selectedElements: string[];
}

export type AdvancedTool = 
  | 'lasso-select'
  | 'select-by-type'
  | 'offset'
  | 'trim'
  | 'extend'
  | 'fillet'
  | 'chamfer'
  | 'array-linear'
  | 'array-circular'
  | 'mirror'
  | 'measure-area'
  | 'measure-perimeter'
  | 'measure-angle'
  | 'construction-line'
  | 'smart-dimension';

export type AdvancedAction =
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-top'
  | 'align-middle'
  | 'align-bottom'
  | 'distribute-horizontal'
  | 'distribute-vertical'
  | 'zoom-to-fit'
  | 'zoom-to-selection'
  | 'cleanup-walls'
  | 'smart-join';

export default function AdvancedCanvasTools({
  onToolSelect,
  activeTool,
  onAction,
  selectedElements
}: AdvancedCanvasToolsProps) {
  const [showPanel, setShowPanel] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'selection' | 'precision' | 'measurement' | 'alignment'>('selection');

  const categories = [
    { id: 'selection', name: 'Selection', icon: Lasso },
    { id: 'precision', name: 'Precision', icon: Target },
    { id: 'measurement', name: 'Measure', icon: Calculator },
    { id: 'alignment', name: 'Align', icon: AlignCenter }
  ];

  const selectionTools = [
    { id: 'lasso-select', name: 'Lasso Select', icon: Lasso, desc: 'Draw to select' },
    { id: 'select-by-type', name: 'Select by Type', icon: Layers2, desc: 'Select all walls, doors, etc.' }
  ];

  const precisionTools = [
    { id: 'offset', name: 'Offset', icon: Move, desc: 'Create parallel copy' },
    { id: 'trim', name: 'Trim', icon: Scissors, desc: 'Trim to intersection' },
    { id: 'extend', name: 'Extend', icon: RotateCw, desc: 'Extend to boundary' },
    { id: 'fillet', name: 'Fillet', icon: CircleIcon, desc: 'Round corners' },
    { id: 'chamfer', name: 'Chamfer', icon: Triangle, desc: 'Bevel corners' },
    { id: 'array-linear', name: 'Linear Array', icon: Grid2x2, desc: 'Repeat in rows/cols' },
    { id: 'array-circular', name: 'Circular Array', icon: RotateCw, desc: 'Repeat in circle' },
    { id: 'mirror', name: 'Mirror', icon: FlipHorizontal, desc: 'Mirror elements' },
    { id: 'construction-line', name: 'Construction', icon: Crosshair, desc: 'Guide lines' }
  ];

  const measurementTools = [
    { id: 'measure-area', name: 'Area', icon: Square, desc: 'Calculate area' },
    { id: 'measure-perimeter', name: 'Perimeter', icon: Ruler, desc: 'Total length' },
    { id: 'measure-angle', name: 'Angle', icon: RotateCw, desc: 'Measure angles' },
    { id: 'smart-dimension', name: 'Smart Dimension', icon: Sparkles, desc: 'Auto-dimension' }
  ];

  const alignmentActions = [
    { id: 'align-left', name: 'Align Left', icon: AlignCenter, desc: 'Align to left edge' },
    { id: 'align-center', name: 'Align Center', icon: AlignCenter, desc: 'Center horizontally' },
    { id: 'align-right', name: 'Align Right', icon: AlignCenter, desc: 'Align to right edge' },
    { id: 'align-top', name: 'Align Top', icon: AlignCenter, desc: 'Align to top edge' },
    { id: 'align-middle', name: 'Align Middle', icon: AlignCenter, desc: 'Center vertically' },
    { id: 'align-bottom', name: 'Align Bottom', icon: AlignCenter, desc: 'Align to bottom edge' },
    { id: 'distribute-horizontal', name: 'Distribute H', icon: Layout, desc: 'Space evenly horizontal' },
    { id: 'distribute-vertical', name: 'Distribute V', icon: Layout, desc: 'Space evenly vertical' }
  ];

  const viewActions = [
    { id: 'zoom-to-fit', name: 'Zoom to Fit', icon: Maximize2, desc: 'Fit all elements' },
    { id: 'zoom-to-selection', name: 'Zoom to Selection', icon: ZoomIn, desc: 'Fit selection' }
  ];

  const smartActions = [
    { id: 'cleanup-walls', name: 'Cleanup Walls', icon: Sparkles, desc: 'Fix wall connections' },
    { id: 'smart-join', name: 'Smart Join', icon: Target, desc: 'Auto-connect elements' }
  ];

  const getCurrentTools = () => {
    switch (activeCategory) {
      case 'selection': return selectionTools;
      case 'precision': return precisionTools;
      case 'measurement': return measurementTools;
      case 'alignment': return [];
      default: return [];
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed top-32 right-4 p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg hover:opacity-90 transition-opacity z-30"
        title="Show Advanced Tools"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-32 right-4 w-80 bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-xl shadow-2xl z-30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Advanced Tools
            </h3>
            <p className="text-xs text-white/80 mt-1">Professional CAD Features</p>
          </div>
          <button
            onClick={() => setShowPanel(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-[#2A2A2A] bg-[#0A0A0A]">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeCategory === cat.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
            }`}
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {/* Tools Grid */}
        {activeCategory !== 'alignment' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {getCurrentTools().map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool.id as AdvancedTool)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  activeTool === tool.id
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-[#2A2A2A] border-[#3A3A3A] text-gray-300 hover:border-purple-500/50 hover:bg-[#3A3A3A]'
                }`}
                title={tool.desc}
              >
                <tool.icon className={`w-5 h-5 mb-1.5 ${
                  activeTool === tool.id ? 'text-white' : 'text-purple-400'
                }`} />
                <p className="text-xs font-medium">{tool.name}</p>
                <p className="text-xs opacity-70 mt-0.5">{tool.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Alignment Actions */}
        {activeCategory === 'alignment' && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-2 font-semibold">Alignment</p>
              <div className="grid grid-cols-3 gap-2">
                {alignmentActions.slice(0, 6).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => onAction(action.id as AdvancedAction)}
                    disabled={selectedElements.length < 2}
                    className="p-2.5 bg-[#2A2A2A] rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                    title={action.desc}
                  >
                    <action.icon className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-300">{action.name.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2 font-semibold">Distribution</p>
              <div className="grid grid-cols-2 gap-2">
                {alignmentActions.slice(6).map((action) => (
                  <button
                    key={action.id}
                    onClick={() => onAction(action.id as AdvancedAction)}
                    disabled={selectedElements.length < 3}
                    className="p-2.5 bg-[#2A2A2A] rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    title={action.desc}
                  >
                    <action.icon className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-300">{action.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <p className="text-xs text-gray-400 mb-2 font-semibold">Quick Actions</p>
          <div className="space-y-1.5">
            {viewActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.id as AdvancedAction)}
                className="w-full p-2 bg-[#2A2A2A] rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 text-left"
                title={action.desc}
              >
                <action.icon className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-white">{action.name}</p>
                  <p className="text-xs text-gray-400">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Smart Tools */}
        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <p className="text-xs text-gray-400 mb-2 font-semibold">Smart Tools</p>
          <div className="space-y-1.5">
            {smartActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.id as AdvancedAction)}
                className="w-full p-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg hover:from-purple-600/40 hover:to-blue-600/40 transition-colors flex items-center gap-2 text-left"
                title={action.desc}
              >
                <action.icon className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-white">{action.name}</p>
                  <p className="text-xs text-gray-400">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selection Info */}
        {selectedElements.length > 0 && (
          <div className="mt-4 p-3 bg-purple-600/20 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-300">
              <span className="font-semibold">{selectedElements.length}</span> element{selectedElements.length !== 1 ? 's' : ''} selected
            </p>
            {selectedElements.length >= 2 && (
              <p className="text-xs text-purple-400 mt-1">Alignment tools available</p>
            )}
            {selectedElements.length >= 3 && (
              <p className="text-xs text-purple-400">Distribution tools available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
