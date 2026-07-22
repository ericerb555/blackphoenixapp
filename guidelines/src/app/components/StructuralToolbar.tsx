import React from 'react';
import {
  MousePointer2,
  Move,
  Square,
  Circle,
  Minus,
  Grid3x3,
  Ruler,
  Layers,
  Save,
  Upload,
  Download,
  Undo,
  Redo,
  Trash2,
} from 'lucide-react';

interface StructuralToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function StructuralToolbar({
  activeTool,
  onToolChange,
  onSave,
  onLoad,
  onExport,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: StructuralToolbarProps) {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pan', icon: Move, label: 'Pan' },
    { id: 'wall', icon: Square, label: 'Wall' },
    { id: 'beam', icon: Minus, label: 'Beam' },
    { id: 'column', icon: Circle, label: 'Column' },
    { id: 'slab', icon: Layers, label: 'Slab' },
    { id: 'measure', icon: Ruler, label: 'Measure' },
    { id: 'grid', icon: Grid3x3, label: 'Grid' },
  ];

  const ToolButton = ({ tool }: { tool: typeof tools[0] }) => {
    const Icon = tool.icon;
    const isActive = activeTool === tool.id;

    return (
      <button
        onClick={() => onToolChange(tool.id)}
        className={`p-3 rounded-lg transition-all ${
          isActive
            ? 'bg-[#ea580c] text-white shadow-lg shadow-[#ea580c]/20'
            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
        }`}
        title={tool.label}
      >
        <Icon className="w-5 h-5" />
      </button>
    );
  };

  return (
    <div className="bg-[#0A0A0A] border-b border-zinc-800 p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Drawing Tools */}
        <div className="flex items-center gap-2">
          {tools.map((tool) => (
            <ToolButton key={tool.id} tool={tool} />
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-zinc-800" />

        {/* History Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-3 rounded-lg transition-all ${
              canUndo
                ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                : 'bg-zinc-900/50 text-zinc-700 border border-zinc-900 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-3 rounded-lg transition-all ${
              canRedo
                ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                : 'bg-zinc-900/50 text-zinc-700 border border-zinc-900 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-zinc-800" />

        {/* File Operations */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            className="p-3 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800 transition-all"
            title="Save"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={onLoad}
            className="p-3 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800 transition-all"
            title="Load"
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={onExport}
            className="p-3 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800 transition-all"
            title="Export"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-zinc-800" />

        {/* Clear */}
        <button
          onClick={onClear}
          className="p-3 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/30 border border-red-900/50 transition-all"
          title="Clear Canvas"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Info */}
        <div className="text-sm text-zinc-500">
          Active Tool: <span className="text-[#ea580c] font-medium">{activeTool}</span>
        </div>
      </div>
    </div>
  );
}
