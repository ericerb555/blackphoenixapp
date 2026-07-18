/**
 * Enhanced Drawing Tools Component
 * Provides advanced drawing tools panel for Design Studio Pro
 */

import { 
  MousePointer, 
  Square, 
  Circle, 
  Triangle, 
  Minus, 
  Type, 
  Move,
  Eraser,
  Pencil,
  Ruler,
  Undo,
  Redo,
  Grid3x3,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';

export type DrawingTool = 
  | 'select' 
  | 'wall' 
  | 'door' 
  | 'window' 
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'text' 
  | 'move' 
  | 'erase' 
  | 'pencil' 
  | 'measure';

interface EnhancedDrawingToolsProps {
  activeTool: string;
  onToolChange: (tool: DrawingTool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

interface ToolDefinition {
  id: DrawingTool;
  name: string;
  icon: any;
  shortcut: string;
  category: 'selection' | 'drawing' | 'shapes' | 'editing' | 'history';
}

const tools: ToolDefinition[] = [
  // Selection & Movement
  { id: 'select', name: 'Select', icon: MousePointer, shortcut: 'V', category: 'selection' },
  { id: 'move', name: 'Move', icon: Move, shortcut: 'M', category: 'selection' },
  
  // Drawing Tools
  { id: 'wall', name: 'Wall', icon: Minus, shortcut: 'W', category: 'drawing' },
  { id: 'door', name: 'Door', icon: Square, shortcut: 'D', category: 'drawing' },
  { id: 'window', name: 'Window', icon: Square, shortcut: 'N', category: 'drawing' },
  { id: 'pencil', name: 'Pencil', icon: Pencil, shortcut: 'P', category: 'drawing' },
  
  // Shape Tools
  { id: 'rectangle', name: 'Rectangle', icon: Square, shortcut: 'R', category: 'shapes' },
  { id: 'circle', name: 'Circle', icon: Circle, shortcut: 'C', category: 'shapes' },
  { id: 'line', name: 'Line', icon: Minus, shortcut: 'L', category: 'shapes' },
  
  // Other Tools
  { id: 'text', name: 'Text', icon: Type, shortcut: 'T', category: 'editing' },
  { id: 'measure', name: 'Measure', icon: Ruler, shortcut: 'U', category: 'editing' },
  { id: 'erase', name: 'Erase', icon: Eraser, shortcut: 'E', category: 'editing' },
];

export default function EnhancedDrawingTools({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: EnhancedDrawingToolsProps) {
  const categories = {
    selection: tools.filter(t => t.category === 'selection'),
    drawing: tools.filter(t => t.category === 'drawing'),
    shapes: tools.filter(t => t.category === 'shapes'),
    editing: tools.filter(t => t.category === 'editing'),
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg shadow-xl z-40 overflow-hidden">
      {/* Selection Tools */}
      <div className="p-2 border-b border-[#1a1a1a]">
        {categories.selection.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`w-12 h-12 flex items-center justify-center rounded transition-all mb-1 last:mb-0 group relative ${
                activeTool === tool.id
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F0F0F] border border-[#1a1a1a] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="font-medium text-white">{tool.name}</div>
                <div className="text-gray-500 text-[10px]">Shortcut: {tool.shortcut}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drawing Tools */}
      <div className="p-2 border-b border-[#1a1a1a]">
        {categories.drawing.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`w-12 h-12 flex items-center justify-center rounded transition-all mb-1 last:mb-0 group relative ${
                activeTool === tool.id
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F0F0F] border border-[#1a1a1a] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="font-medium text-white">{tool.name}</div>
                <div className="text-gray-500 text-[10px]">Shortcut: {tool.shortcut}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Shape Tools */}
      <div className="p-2 border-b border-[#1a1a1a]">
        {categories.shapes.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`w-12 h-12 flex items-center justify-center rounded transition-all mb-1 last:mb-0 group relative ${
                activeTool === tool.id
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F0F0F] border border-[#1a1a1a] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="font-medium text-white">{tool.name}</div>
                <div className="text-gray-500 text-[10px]">Shortcut: {tool.shortcut}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editing Tools */}
      <div className="p-2 border-b border-[#1a1a1a]">
        {categories.editing.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`w-12 h-12 flex items-center justify-center rounded transition-all mb-1 last:mb-0 group relative ${
                activeTool === tool.id
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
              }`}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F0F0F] border border-[#1a1a1a] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="font-medium text-white">{tool.name}</div>
                <div className="text-gray-500 text-[10px]">Shortcut: {tool.shortcut}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* History Controls */}
      {(onUndo || onRedo) && (
        <div className="p-2">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`w-12 h-12 flex items-center justify-center rounded transition-all mb-1 group relative ${
                canUndo
                  ? 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F0F0F] border border-[#1a1a1a] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="font-medium text-white">Undo</div>
                <div className="text-gray-500 text-[10px]">Ctrl+Z</div>
              </div>
            </button>
          )}
          
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`w-12 h-12 flex items-center justify-center rounded transition-all group relative ${
                canRedo
                  ? 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="w-5 h-5" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#0F0F0F] border border-[#1a1a1a] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="font-medium text-white">Redo</div>
                <div className="text-gray-500 text-[10px]">Ctrl+Shift+Z</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
