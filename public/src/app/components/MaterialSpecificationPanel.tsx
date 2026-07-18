// Material Specification Panel - Section 5
import { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Check, X, DollarSign, Beaker } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  type: 'concrete' | 'steel' | 'wood' | 'masonry' | 'composite';
  strength: string;
  grade: string;
  density: number;
  modulus: number;
  cost: number;
  standard: string;
  properties: {
    yieldStrength?: number;
    ultimateStrength?: number;
    poissonRatio?: number;
    thermalExpansion?: number;
  };
}

interface MaterialSpecificationPanelProps {
  onMaterialSelect?: (material: Material) => void;
  selectedMaterialId?: string;
}

export function MaterialSpecificationPanel({ 
  onMaterialSelect, 
  selectedMaterialId 
}: MaterialSpecificationPanelProps) {
  const [materials, setMaterials] = useState<Material[]>([
    {
      id: 'mat-1',
      name: 'Concrete - 4000 PSI',
      type: 'concrete',
      strength: '4000 psi',
      grade: 'Grade 60',
      density: 150,
      modulus: 3605000,
      cost: 125,
      standard: 'ACI 318',
      properties: {
        ultimateStrength: 4000,
        poissonRatio: 0.2,
        thermalExpansion: 5.5,
      },
    },
    {
      id: 'mat-2',
      name: 'Structural Steel - A992',
      type: 'steel',
      strength: '50 ksi',
      grade: 'A992',
      density: 490,
      modulus: 29000000,
      cost: 850,
      standard: 'AISC 360',
      properties: {
        yieldStrength: 50000,
        ultimateStrength: 65000,
        poissonRatio: 0.3,
        thermalExpansion: 6.5,
      },
    },
    {
      id: 'mat-3',
      name: 'Douglas Fir - Select Structural',
      type: 'wood',
      strength: '1500 psi',
      grade: 'SS',
      density: 34,
      modulus: 1900000,
      cost: 650,
      standard: 'NDS 2018',
      properties: {
        ultimateStrength: 1500,
        poissonRatio: 0.3,
        thermalExpansion: 2.1,
      },
    },
  ]);

  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'library' | 'create'>('library');

  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    type: 'concrete',
    density: 150,
    modulus: 3000000,
    cost: 100,
    properties: {},
  });

  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.strength) return;

    const material: Material = {
      id: `mat-${Date.now()}`,
      name: newMaterial.name,
      type: newMaterial.type as any,
      strength: newMaterial.strength,
      grade: newMaterial.grade || '',
      density: newMaterial.density || 0,
      modulus: newMaterial.modulus || 0,
      cost: newMaterial.cost || 0,
      standard: newMaterial.standard || '',
      properties: newMaterial.properties || {},
    };

    setMaterials([...materials, material]);
    setNewMaterial({
      type: 'concrete',
      density: 150,
      modulus: 3000000,
      cost: 100,
      properties: {},
    });
    setViewMode('library');
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const getMaterialIcon = (type: string) => {
    const colors = {
      concrete: 'text-gray-400',
      steel: 'text-blue-400',
      wood: 'text-amber-400',
      masonry: 'text-red-400',
      composite: 'text-purple-400',
    };
    return colors[type as keyof typeof colors] || 'text-gray-400';
  };

  const getMaterialBg = (type: string) => {
    const colors = {
      concrete: 'bg-gray-500/20',
      steel: 'bg-blue-500/20',
      wood: 'bg-amber-500/20',
      masonry: 'bg-red-500/20',
      composite: 'bg-purple-500/20',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500/20';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-500" />
          Material Specification
        </h3>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 bg-[#2A2A2A] p-1 rounded-lg">
        <button
          onClick={() => setViewMode('library')}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
            viewMode === 'library' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Material Library
        </button>
        <button
          onClick={() => setViewMode('create')}
          className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
            viewMode === 'create' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Create Material
        </button>
      </div>

      {/* Material Library View */}
      {viewMode === 'library' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {materials.map((material) => (
            <div
              key={material.id}
              onClick={() => onMaterialSelect?.(material)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedMaterialId === material.id
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#1A1A1A]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded ${getMaterialBg(material.type)}`}>
                    <Beaker className={`w-4 h-4 ${getMaterialIcon(material.type)}`} />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{material.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{material.type}</div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMaterial(material.id);
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#2A2A2A] p-2 rounded">
                  <div className="text-gray-500">Strength</div>
                  <div className="text-white font-medium">{material.strength}</div>
                </div>
                <div className="bg-[#2A2A2A] p-2 rounded">
                  <div className="text-gray-500">Grade</div>
                  <div className="text-white font-medium">{material.grade}</div>
                </div>
                <div className="bg-[#2A2A2A] p-2 rounded">
                  <div className="text-gray-500">Density</div>
                  <div className="text-white font-medium">{material.density} pcf</div>
                </div>
                <div className="bg-[#2A2A2A] p-2 rounded">
                  <div className="text-gray-500">Cost</div>
                  <div className="text-green-400 font-medium">${material.cost}/yd³</div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-[#2A2A2A]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Standard: {material.standard}</span>
                  <span className="text-gray-500">E = {(material.modulus / 1000000).toFixed(1)} Msi</span>
                </div>
              </div>
            </div>
          ))}

          {materials.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No materials in library. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Create Material View */}
      {viewMode === 'create' && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Material Name *</label>
            <input
              type="text"
              value={newMaterial.name || ''}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              placeholder="e.g., Concrete - 5000 PSI"
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Material Type *</label>
            <select
              value={newMaterial.type || 'concrete'}
              onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value as any })}
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="concrete">Concrete</option>
              <option value="steel">Steel</option>
              <option value="wood">Wood</option>
              <option value="masonry">Masonry</option>
              <option value="composite">Composite</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Strength *</label>
              <input
                type="text"
                value={newMaterial.strength || ''}
                onChange={(e) => setNewMaterial({ ...newMaterial, strength: e.target.value })}
                placeholder="e.g., 4000 psi"
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Grade</label>
              <input
                type="text"
                value={newMaterial.grade || ''}
                onChange={(e) => setNewMaterial({ ...newMaterial, grade: e.target.value })}
                placeholder="e.g., Grade 60"
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Density (pcf)</label>
              <input
                type="number"
                value={newMaterial.density || ''}
                onChange={(e) => setNewMaterial({ ...newMaterial, density: parseFloat(e.target.value) })}
                placeholder="150"
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Modulus (psi)</label>
              <input
                type="number"
                value={newMaterial.modulus || ''}
                onChange={(e) => setNewMaterial({ ...newMaterial, modulus: parseFloat(e.target.value) })}
                placeholder="3605000"
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Cost ($/yd³)</label>
            <input
              type="number"
              value={newMaterial.cost || ''}
              onChange={(e) => setNewMaterial({ ...newMaterial, cost: parseFloat(e.target.value) })}
              placeholder="125"
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Standard</label>
            <input
              type="text"
              value={newMaterial.standard || ''}
              onChange={(e) => setNewMaterial({ ...newMaterial, standard: e.target.value })}
              placeholder="e.g., ACI 318, AISC 360"
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-[#2A2A2A]">
            <h4 className="text-xs font-semibold text-gray-400 mb-2">Advanced Properties</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Yield Strength (psi)</label>
                <input
                  type="number"
                  value={newMaterial.properties?.yieldStrength || ''}
                  onChange={(e) => setNewMaterial({ 
                    ...newMaterial, 
                    properties: { ...newMaterial.properties, yieldStrength: parseFloat(e.target.value) }
                  })}
                  placeholder="50000"
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Ultimate Strength (psi)</label>
                <input
                  type="number"
                  value={newMaterial.properties?.ultimateStrength || ''}
                  onChange={(e) => setNewMaterial({ 
                    ...newMaterial, 
                    properties: { ...newMaterial.properties, ultimateStrength: parseFloat(e.target.value) }
                  })}
                  placeholder="65000"
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Poisson's Ratio</label>
                <input
                  type="number"
                  step="0.01"
                  value={newMaterial.properties?.poissonRatio || ''}
                  onChange={(e) => setNewMaterial({ 
                    ...newMaterial, 
                    properties: { ...newMaterial.properties, poissonRatio: parseFloat(e.target.value) }
                  })}
                  placeholder="0.2"
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Thermal Expansion (×10⁻⁶)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMaterial.properties?.thermalExpansion || ''}
                  onChange={(e) => setNewMaterial({ 
                    ...newMaterial, 
                    properties: { ...newMaterial.properties, thermalExpansion: parseFloat(e.target.value) }
                  })}
                  placeholder="5.5"
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              onClick={handleAddMaterial}
              disabled={!newMaterial.name || !newMaterial.strength}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Add Material
            </button>
            <button
              onClick={() => {
                setNewMaterial({
                  type: 'concrete',
                  density: 150,
                  modulus: 3000000,
                  cost: 100,
                  properties: {},
                });
                setViewMode('library');
              }}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="pt-3 border-t border-[#2A2A2A]">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#2A2A2A] p-2 rounded">
            <div className="text-gray-500">Total Materials</div>
            <div className="text-white font-bold text-lg">{materials.length}</div>
          </div>
          <div className="bg-[#2A2A2A] p-2 rounded">
            <div className="text-gray-500">Avg Cost</div>
            <div className="text-green-400 font-bold text-lg">
              ${materials.length > 0 ? Math.round(materials.reduce((sum, m) => sum + m.cost, 0) / materials.length) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
