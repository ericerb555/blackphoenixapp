// Multi-Story Floor Plan Management System
import { useState } from 'react';
import { Layers, Plus, Copy, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Home } from 'lucide-react';

interface CanvasElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  label?: string;
}

interface Floor {
  id: string;
  name: string;
  level: number;
  elements: CanvasElement[];
  visible: boolean;
  locked: boolean;
}

interface MultiStoryManagerProps {
  floors: Floor[];
  currentFloorId: string;
  onFloorsChange: (floors: Floor[]) => void;
  onFloorSelect: (floorId: string) => void;
  onClose: () => void;
}

export default function MultiStoryManager({
  floors,
  currentFloorId,
  onFloorsChange,
  onFloorSelect,
  onClose
}: MultiStoryManagerProps) {
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const addFloor = () => {
    const maxLevel = Math.max(...floors.map(f => f.level), 0);
    const newFloor: Floor = {
      id: `floor-${Date.now()}`,
      name: `Floor ${maxLevel + 1}`,
      level: maxLevel + 1,
      elements: [],
      visible: true,
      locked: false
    };

    onFloorsChange([...floors, newFloor]);
    onFloorSelect(newFloor.id);
  };

  const duplicateFloor = (floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return;

    const maxLevel = Math.max(...floors.map(f => f.level));
    const newFloor: Floor = {
      id: `floor-${Date.now()}`,
      name: `${floor.name} (Copy)`,
      level: maxLevel + 1,
      elements: floor.elements.map(el => ({
        ...el,
        id: `${el.id}-copy-${Date.now()}`
      })),
      visible: true,
      locked: false
    };

    onFloorsChange([...floors, newFloor]);
  };

  const deleteFloor = (floorId: string) => {
    if (floors.length === 1) {
      alert('Cannot delete the last floor');
      return;
    }

    if (!confirm('Are you sure you want to delete this floor?')) return;

    const newFloors = floors.filter(f => f.id !== floorId);
    onFloorsChange(newFloors);

    if (currentFloorId === floorId) {
      onFloorSelect(newFloors[0].id);
    }
  };

  const toggleVisibility = (floorId: string) => {
    const newFloors = floors.map(f =>
      f.id === floorId ? { ...f, visible: !f.visible } : f
    );
    onFloorsChange(newFloors);
  };

  const moveFloorUp = (floorId: string) => {
    const index = floors.findIndex(f => f.id === floorId);
    if (index === 0) return;

    const newFloors = [...floors];
    [newFloors[index - 1], newFloors[index]] = [newFloors[index], newFloors[index - 1]];
    
    // Update levels
    newFloors.forEach((floor, idx) => {
      floor.level = idx + 1;
    });

    onFloorsChange(newFloors);
  };

  const moveFloorDown = (floorId: string) => {
    const index = floors.findIndex(f => f.id === floorId);
    if (index === floors.length - 1) return;

    const newFloors = [...floors];
    [newFloors[index], newFloors[index + 1]] = [newFloors[index + 1], newFloors[index]];
    
    // Update levels
    newFloors.forEach((floor, idx) => {
      floor.level = idx + 1;
    });

    onFloorsChange(newFloors);
  };

  const startEditing = (floor: Floor) => {
    setEditingFloorId(floor.id);
    setEditingName(floor.name);
  };

  const saveEdit = () => {
    if (!editingFloorId) return;

    const newFloors = floors.map(f =>
      f.id === editingFloorId ? { ...f, name: editingName } : f
    );
    onFloorsChange(newFloors);
    setEditingFloorId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-[#ea580c]" />
            <div>
              <h2 className="text-2xl font-bold text-white">Multi-Story Manager</h2>
              <p className="text-sm text-gray-400">Manage multiple floors and levels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Floors List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {floors
              .sort((a, b) => b.level - a.level) // Show highest floor first
              .map((floor, index) => (
                <div
                  key={floor.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentFloorId === floor.id
                      ? 'border-[#ea580c] bg-[#ea580c]/10'
                      : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Home className={`w-5 h-5 ${currentFloorId === floor.id ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                      
                      {editingFloorId === floor.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={saveEdit}
                          onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                          className="px-2 py-1 bg-[#0A0A0A] border border-[#ea580c] rounded text-white"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => onFloorSelect(floor.id)}
                          onDoubleClick={() => startEditing(floor)}
                          className="text-left flex-1"
                        >
                          <p className="font-semibold text-white">{floor.name}</p>
                          <p className="text-xs text-gray-400">
                            Level {floor.level} • {floor.elements.length} elements
                          </p>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Visibility Toggle */}
                      <button
                        onClick={() => toggleVisibility(floor.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          floor.visible
                            ? 'bg-[#3A3A3A] text-white hover:bg-[#4A4A4A]'
                            : 'bg-[#2A2A2A] text-gray-600 hover:bg-[#3A3A3A]'
                        }`}
                        title={floor.visible ? 'Hide' : 'Show'}
                      >
                        {floor.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      {/* Move Up */}
                      <button
                        onClick={() => moveFloorUp(floor.id)}
                        disabled={index === 0}
                        className="p-2 bg-[#3A3A3A] rounded-lg hover:bg-[#4A4A4A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => moveFloorDown(floor.id)}
                        disabled={index === floors.length - 1}
                        className="p-2 bg-[#3A3A3A] rounded-lg hover:bg-[#4A4A4A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={() => duplicateFloor(floor.id)}
                        className="p-2 bg-[#3A3A3A] rounded-lg hover:bg-[#4A4A4A] transition-colors"
                        title="Duplicate Floor"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteFloor(floor.id)}
                        disabled={floors.length === 1}
                        className="p-2 bg-red-600/20 rounded-lg hover:bg-red-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Delete Floor"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Floor Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 pl-8">
                    <span>Rooms: {floor.elements.filter(e => e.type === 'room').length}</span>
                    <span>Walls: {floor.elements.filter(e => e.type === 'wall').length}</span>
                    <span>Doors: {floor.elements.filter(e => e.type === 'door').length}</span>
                    <span>Windows: {floor.elements.filter(e => e.type === 'window').length}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A] flex items-center justify-between">
          <button
            onClick={addFloor}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Floor
          </button>

          <div className="text-sm text-gray-400">
            Total Floors: {floors.length}
          </div>
        </div>
      </div>
    </div>
  );
}
