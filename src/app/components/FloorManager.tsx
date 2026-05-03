/**
 * Floor Manager Component
 * UI for managing multiple floors in CaptureCAD Studio
 */

import { useState } from 'react';
import { 
  Plus, Trash2, Copy, Eye, EyeOff, Lock, Unlock, 
  MoveVertical, ChevronUp, ChevronDown, Layers as LayersIcon 
} from 'lucide-react';
import { Floor, MultiFloorManager, calculateFloorStats } from '../utils/multi-floor-system';

interface FloorManagerProps {
  floorManager: MultiFloorManager;
  onFloorChange: (floorId: string) => void;
  onUpdate: () => void;
}

export default function FloorManager({ floorManager, onFloorChange, onUpdate }: FloorManagerProps) {
  const [showManager, setShowManager] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  const project = floorManager.getProject();
  const activeFloor = floorManager.getActiveFloor();

  const handleCreateFloor = () => {
    const level = Math.max(...project.floors.map(f => f.level)) + 1;
    const elevation = project.floors.reduce((max, f) => Math.max(max, f.elevation + f.height), 0);
    
    const name = prompt('Enter floor name:', `Floor ${level}`);
    if (!name) return;

    const newFloor = floorManager.createFloor(name, level, elevation, 10);
    onFloorChange(newFloor.id);
    onUpdate();
  };

  const handleDuplicateFloor = (floorId: string) => {
    const floor = project.floors.find(f => f.id === floorId);
    if (!floor) return;

    const level = Math.max(...project.floors.map(f => f.level)) + 1;
    const name = prompt('Enter new floor name:', `${floor.name} Copy`);
    if (!name) return;

    const newFloor = floorManager.duplicateFloor(floorId, name, level);
    if (newFloor) {
      onFloorChange(newFloor.id);
      onUpdate();
    }
  };

  const handleDeleteFloor = (floorId: string) => {
    const floor = project.floors.find(f => f.id === floorId);
    if (!floor) return;

    if (project.floors.length === 1) {
      alert('Cannot delete the last floor!');
      return;
    }

    if (confirm(`Delete "${floor.name}"? This cannot be undone.`)) {
      floorManager.deleteFloor(floorId);
      onUpdate();
    }
  };

  const handleToggleVisibility = (floorId: string) => {
    floorManager.toggleFloorVisibility(floorId);
    onUpdate();
  };

  const handleSetActive = (floorId: string) => {
    floorManager.setActiveFloor(floorId);
    onFloorChange(floorId);
    onUpdate();
  };

  const toggleExpanded = (floorId: string) => {
    const newExpanded = new Set(expandedFloors);
    if (newExpanded.has(floorId)) {
      newExpanded.delete(floorId);
    } else {
      newExpanded.add(floorId);
    }
    setExpandedFloors(newExpanded);
  };

  if (!showManager) {
    return (
      <button
        onClick={() => setShowManager(true)}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] hover:from-[#a78bfa]/90 hover:to-[#8b5cf6]/90 shadow-2xl hover:shadow-[0_0_40px_rgba(167,139,250,0.4)] transition-all hover:scale-110 flex items-center justify-center z-50"
        title="Floor Manager"
      >
        <LayersIcon className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed right-6 bottom-6 w-80 max-h-[80vh] bg-gradient-to-br from-[#0f131b] to-[#08090e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayersIcon className="w-5 h-5 text-[#a78bfa]" />
          <h3 className="text-lg font-bold">Floor Manager</h3>
        </div>
        <button
          onClick={() => setShowManager(false)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Floors List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {project.floors.map((floor) => {
          const isActive = floor.id === project.activeFloorId;
          const isExpanded = expandedFloors.has(floor.id);
          const stats = calculateFloorStats(floor);

          return (
            <div
              key={floor.id}
              className={`rounded-xl border ${
                isActive
                  ? 'border-[#a78bfa]/50 bg-gradient-to-b from-[#a78bfa]/15 to-[#a78bfa]/5'
                  : 'border-white/10 bg-gradient-to-b from-white/5 to-white/2'
              } overflow-hidden transition-all`}
            >
              {/* Floor Header */}
              <div
                className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => handleSetActive(floor.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: floor.color }}
                    />
                    <span className="font-semibold text-sm">{floor.name}</span>
                    {isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#a78bfa]/20 text-[#a78bfa] font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(floor.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Level {floor.level}</span>
                  <span>•</span>
                  <span>{stats.elementCount} elements</span>
                  <span>•</span>
                  <span>{floor.height}ft</span>
                </div>
              </div>

              {/* Floor Actions - Expanded */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/5">
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    <button
                      onClick={() => handleToggleVisibility(floor.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                      title={floor.isVisible ? 'Hide' : 'Show'}
                    >
                      {floor.isVisible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDuplicateFloor(floor.id)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFloor(floor.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                      title="Lock"
                    >
                      {floor.isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white/5">
                      <div className="text-gray-400">Walls</div>
                      <div className="font-mono text-white">{stats.wallCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <div className="text-gray-400">Doors</div>
                      <div className="font-mono text-white">{stats.doorCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <div className="text-gray-400">Windows</div>
                      <div className="font-mono text-white">{stats.windowCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                      <div className="text-gray-400">Measurements</div>
                      <div className="font-mono text-white">{stats.measurementCount}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - Add Floor Button */}
      <div className="p-3 border-t border-white/10 bg-gradient-to-t from-white/5 to-transparent flex-shrink-0">
        <button
          onClick={handleCreateFloor}
          className="w-full px-4 py-3 rounded-xl border border-[#a78bfa]/30 bg-gradient-to-b from-[#a78bfa]/15 to-transparent hover:border-[#a78bfa]/50 hover:from-[#a78bfa]/25 transition-all font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Floor
        </button>

        {/* Project Stats */}
        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="text-gray-400">Total Floors</div>
            <div className="font-mono text-white font-bold">{project.floors.length}</div>
          </div>
          <div>
            <div className="text-gray-400">Height</div>
            <div className="font-mono text-white font-bold">{floorManager.getTotalHeight()}ft</div>
          </div>
          <div>
            <div className="text-gray-400">Links</div>
            <div className="font-mono text-white font-bold">{project.floorLinks.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
