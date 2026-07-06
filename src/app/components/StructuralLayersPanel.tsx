import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2, Plus, Layers } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  elements: number;
}

interface StructuralLayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onLayerSelect: (layerId: string) => void;
  onLayerToggleVisible: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerAdd: () => void;
}

export function StructuralLayersPanel({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerToggleVisible,
  onLayerToggleLock,
  onLayerDelete,
  onLayerAdd,
}: StructuralLayersPanelProps) {
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  return (
    <div className="w-80 bg-[#0A0A0A] border-l border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#ea580c]" />
          <h3 className="text-sm font-semibold text-white">Layers</h3>
        </div>
        <button
          onClick={onLayerAdd}
          className="p-1.5 hover:bg-zinc-800 rounded transition-colors group"
          title="Add Layer"
        >
          <Plus className="w-4 h-4 text-zinc-400 group-hover:text-[#ea580c]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6">
            <Layers className="w-12 h-12 mb-3 text-zinc-700" />
            <p className="text-sm text-center">No layers yet</p>
            <button
              onClick={onLayerAdd}
              className="mt-4 px-4 py-2 bg-[#ea580c] text-white rounded text-sm hover:bg-[#dc2626] transition-colors"
            >
              Create First Layer
            </button>
          </div>
        ) : (
          <div className="p-2">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`group rounded-lg mb-1 transition-all ${
                  activeLayerId === layer.id
                    ? 'bg-[#ea580c]/10 border border-[#ea580c]'
                    : 'border border-transparent hover:bg-zinc-900/50'
                }`}
                onMouseEnter={() => setHoveredLayerId(layer.id)}
                onMouseLeave={() => setHoveredLayerId(null)}
              >
                <div className="flex items-center gap-2 p-3">
                  <div
                    className="w-4 h-4 rounded border-2 border-zinc-700 flex-shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <button
                    onClick={() => onLayerSelect(layer.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-sm font-medium text-white truncate">
                      {layer.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {layer.elements} element{layer.elements !== 1 ? 's' : ''}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onLayerToggleVisible(layer.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible ? (
                        <Eye className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>

                    <button
                      onClick={() => onLayerToggleLock(layer.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    >
                      {layer.locked ? (
                        <Lock className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <Unlock className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>

                    <button
                      onClick={() => onLayerDelete(layer.id)}
                      className={`p-1.5 hover:bg-red-900/20 rounded transition-colors ${
                        hoveredLayerId === layer.id ? 'opacity-100' : 'opacity-0'
                      }`}
                      title="Delete layer"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500">
          <div className="flex justify-between mb-1">
            <span>Total Layers:</span>
            <span className="text-white">{layers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Elements:</span>
            <span className="text-white">
              {layers.reduce((sum, layer) => sum + layer.elements, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
