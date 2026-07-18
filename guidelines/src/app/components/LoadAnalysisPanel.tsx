// Section 2: Load Calculations & Structural Analysis Component
// Provides load analysis, stress calculations, safety factors, and material database

import { useState } from 'react';
import { Activity, TrendingUp, AlertTriangle, CheckCircle, Database, ChevronDown, ChevronUp } from 'lucide-react';

interface LoadAnalysisPanelProps {
  elements: Array<{
    id: string;
    type: 'beam' | 'column' | 'foundation' | 'slab';
    properties: {
      material?: string;
      size?: string;
      load?: number;
      grade?: string;
      thickness?: number;
      depth?: number;
      span?: number;
    };
    width: number;
    height: number;
  }>;
  selectedElementId?: string | null;
  onUpdateElement?: (id: string, updates: any) => void;
}

// Material property database
const materialDatabase = {
  steel: {
    'A36': { yieldStrength: 36000, ultimateStrength: 58000, modulus: 29000000, density: 490 },
    'A572 Grade 50': { yieldStrength: 50000, ultimateStrength: 65000, modulus: 29000000, density: 490 },
    'A992': { yieldStrength: 50000, ultimateStrength: 65000, modulus: 29000000, density: 490 },
  },
  concrete: {
    '3000 PSI': { compressiveStrength: 3000, modulus: 3150000, density: 150 },
    '4000 PSI': { compressiveStrength: 4000, modulus: 3640000, density: 150 },
    '5000 PSI': { compressiveStrength: 5000, modulus: 4070000, density: 150 },
  },
  rebar: {
    'Grade 40': { yieldStrength: 40000, ultimateStrength: 60000 },
    'Grade 60': { yieldStrength: 60000, ultimateStrength: 90000 },
    'Grade 75': { yieldStrength: 75000, ultimateStrength: 100000 },
  }
};

// Load type configurations
const loadTypes = {
  dead: { factor: 1.2, description: 'Dead Load (Structure Weight)' },
  live: { factor: 1.6, description: 'Live Load (Occupancy)' },
  wind: { factor: 1.0, description: 'Wind Load' },
  seismic: { factor: 1.0, description: 'Seismic Load' },
  snow: { factor: 1.2, description: 'Snow Load' },
};

export function LoadAnalysisPanel({ elements, selectedElementId, onUpdateElement }: LoadAnalysisPanelProps) {
  const [showMaterialDB, setShowMaterialDB] = useState(false);
  const [showLoadAnalysis, setShowLoadAnalysis] = useState(true);
  const [showStressAnalysis, setShowStressAnalysis] = useState(true);
  const [activeLoadType, setActiveLoadType] = useState<'dead' | 'live' | 'wind' | 'seismic' | 'snow'>('dead');

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Calculate stress for selected element
  const calculateStress = (element: typeof selectedElement) => {
    if (!element) return null;

    const load = element.properties.load || 0;
    const area = element.width * element.height; // Simplified cross-sectional area
    const stress = area > 0 ? load / area : 0;

    // Get material properties
    let allowableStress = 0;
    const material = element.properties.material || '';
    const grade = element.properties.grade || '';

    if (material.toLowerCase().includes('steel')) {
      const steelGrade = Object.keys(materialDatabase.steel).find(key => 
        grade.includes(key) || key.includes(grade)
      );
      if (steelGrade) {
        allowableStress = materialDatabase.steel[steelGrade as keyof typeof materialDatabase.steel].yieldStrength / 1.67; // Factor of safety
      } else {
        allowableStress = 21600; // Default A36 allowable
      }
    } else if (material.toLowerCase().includes('concrete')) {
      const concreteGrade = Object.keys(materialDatabase.concrete).find(key => 
        grade.includes(key.split(' ')[0])
      );
      if (concreteGrade) {
        allowableStress = materialDatabase.concrete[concreteGrade as keyof typeof materialDatabase.concrete].compressiveStrength * 0.45;
      } else {
        allowableStress = 1350; // Default 3000 PSI allowable
      }
    }

    const safetyFactor = allowableStress > 0 ? allowableStress / (stress || 1) : 0;
    const passed = safetyFactor >= 1.0;

    return {
      appliedStress: stress,
      allowableStress,
      safetyFactor,
      passed,
      utilization: (stress / allowableStress) * 100,
    };
  };

  // Calculate total load takedown
  const calculateLoadTakedown = () => {
    const beamLoads = elements.filter(el => el.type === 'beam')
      .reduce((sum, el) => sum + (el.properties.load || 0), 0);
    const columnLoads = elements.filter(el => el.type === 'column')
      .reduce((sum, el) => sum + (el.properties.load || 0), 0);
    const slabLoads = elements.filter(el => el.type === 'slab')
      .reduce((sum, el) => sum + (el.properties.load || 0), 0);
    const foundationLoads = elements.filter(el => el.type === 'foundation')
      .reduce((sum, el) => sum + (el.properties.load || 0), 0);

    return {
      beamLoads,
      columnLoads,
      slabLoads,
      foundationLoads,
      totalLoad: beamLoads + columnLoads + slabLoads + foundationLoads,
    };
  };

  const stressAnalysis = selectedElement ? calculateStress(selectedElement) : null;
  const loadTakedown = calculateLoadTakedown();

  return (
    <div className="space-y-4">
      {/* Load Analysis Section */}
      <div className="border-b border-[#2A2A2A] pb-4">
        <button
          onClick={() => setShowLoadAnalysis(!showLoadAnalysis)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Load Analysis
          </div>
          {showLoadAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLoadAnalysis && (
          <div className="space-y-3">
            {/* Load Type Selector */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">Load Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(loadTypes) as Array<keyof typeof loadTypes>).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveLoadType(type)}
                    className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                      activeLoadType === type
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-2 px-3 py-2 bg-[#1A1A1A] rounded text-xs text-gray-400">
                <div className="flex justify-between mb-1">
                  <span>{loadTypes[activeLoadType].description}</span>
                  <span className="text-orange-400">Factor: {loadTypes[activeLoadType].factor}</span>
                </div>
              </div>
            </div>

            {/* Load Takedown Summary */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">Load Path Takedown</label>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">Slab Loads:</span>
                  <span className="text-purple-400">{loadTakedown.slabLoads.toFixed(0)} lbs</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">↓ Beam Loads:</span>
                  <span className="text-blue-400">{loadTakedown.beamLoads.toFixed(0)} lbs</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">↓ Column Loads:</span>
                  <span className="text-green-400">{loadTakedown.columnLoads.toFixed(0)} lbs</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">↓ Foundation:</span>
                  <span className="text-yellow-400">{loadTakedown.foundationLoads.toFixed(0)} lbs</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-orange-600/20 rounded border border-orange-600/30">
                  <span className="text-white font-semibold">Total Load:</span>
                  <span className="text-orange-400 font-bold">{loadTakedown.totalLoad.toFixed(0)} lbs</span>
                </div>
              </div>
            </div>

            {/* Applied Load Input for Selected Element */}
            {selectedElement && onUpdateElement && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Applied {activeLoadType.charAt(0).toUpperCase() + activeLoadType.slice(1)} Load
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={selectedElement.properties.load || 0}
                    onChange={(e) => {
                      onUpdateElement(selectedElement.id, {
                        properties: { ...selectedElement.properties, load: Number(e.target.value) }
                      });
                    }}
                    className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                    placeholder="Load (lbs)"
                  />
                  <span className="px-3 py-2 bg-[#1A1A1A] rounded text-sm text-gray-400">lbs</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stress Analysis Section */}
      {selectedElement && stressAnalysis && (
        <div className="border-b border-[#2A2A2A] pb-4">
          <button
            onClick={() => setShowStressAnalysis(!showStressAnalysis)}
            className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Stress Analysis
            </div>
            {showStressAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showStressAnalysis && (
            <div className="space-y-3">
              {/* Stress Status Indicator */}
              <div className={`px-3 py-3 rounded-lg border-2 ${
                stressAnalysis.passed
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {stressAnalysis.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`font-semibold ${
                    stressAnalysis.passed ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stressAnalysis.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div className="text-xs text-gray-300">
                  Safety Factor: <span className="font-bold text-white">
                    {stressAnalysis.safetyFactor.toFixed(2)}
                  </span>
                  {stressAnalysis.safetyFactor < 1.0 && (
                    <span className="ml-2 text-red-400">(Unsafe - Increase section size)</span>
                  )}
                </div>
              </div>

              {/* Stress Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">Applied Stress:</span>
                  <span className="text-white">{stressAnalysis.appliedStress.toFixed(0)} psi</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">Allowable Stress:</span>
                  <span className="text-white">{stressAnalysis.allowableStress.toFixed(0)} psi</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">Utilization Ratio:</span>
                  <span className={`font-semibold ${
                    stressAnalysis.utilization > 100 ? 'text-red-400' :
                    stressAnalysis.utilization > 80 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {stressAnalysis.utilization.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Utilization Bar */}
              <div>
                <div className="text-xs text-gray-400 mb-1">Capacity Utilization</div>
                <div className="w-full h-6 bg-[#1A1A1A] rounded-lg overflow-hidden border border-[#2A2A2A]">
                  <div
                    className={`h-full transition-all ${
                      stressAnalysis.utilization > 100 ? 'bg-red-500' :
                      stressAnalysis.utilization > 80 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(stressAnalysis.utilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Material Database Section */}
      <div>
        <button
          onClick={() => setShowMaterialDB(!showMaterialDB)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Material Database
          </div>
          {showMaterialDB ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMaterialDB && (
          <div className="space-y-3">
            {/* Steel Properties */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Steel Grades</h4>
              <div className="space-y-1">
                {Object.entries(materialDatabase.steel).map(([grade, props]) => (
                  <div key={grade} className="px-3 py-2 bg-[#1A1A1A] rounded text-xs">
                    <div className="font-semibold text-white mb-1">{grade}</div>
                    <div className="grid grid-cols-2 gap-1 text-gray-400">
                      <div>Fy: {(props.yieldStrength / 1000).toFixed(0)} ksi</div>
                      <div>Fu: {(props.ultimateStrength / 1000).toFixed(0)} ksi</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Concrete Properties */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Concrete Grades</h4>
              <div className="space-y-1">
                {Object.entries(materialDatabase.concrete).map(([grade, props]) => (
                  <div key={grade} className="px-3 py-2 bg-[#1A1A1A] rounded text-xs">
                    <div className="font-semibold text-white mb-1">{grade}</div>
                    <div className="grid grid-cols-2 gap-1 text-gray-400">
                      <div>f'c: {props.compressiveStrength} psi</div>
                      <div>Ec: {(props.modulus / 1000000).toFixed(2)} Mpsi</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rebar Properties */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Rebar Grades</h4>
              <div className="space-y-1">
                {Object.entries(materialDatabase.rebar).map(([grade, props]) => (
                  <div key={grade} className="px-3 py-2 bg-[#1A1A1A] rounded text-xs">
                    <div className="font-semibold text-white mb-1">{grade}</div>
                    <div className="grid grid-cols-2 gap-1 text-gray-400">
                      <div>Fy: {(props.yieldStrength / 1000).toFixed(0)} ksi</div>
                      <div>Fu: {(props.ultimateStrength / 1000).toFixed(0)} ksi</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Summary */}
      <div className="pt-2 border-t border-[#2A2A2A]">
        <h4 className="text-xs font-semibold text-gray-300 mb-2">System Status</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-[#1A1A1A] rounded">
            <span className="text-gray-400">Elements Analyzed:</span>
            <span className="text-white font-semibold">{elements.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-[#1A1A1A] rounded">
            <span className="text-gray-400">Total System Load:</span>
            <span className="text-orange-400 font-semibold">{loadTakedown.totalLoad.toFixed(0)} lbs</span>
          </div>
          {selectedElement && stressAnalysis && (
            <div className={`flex items-center justify-between text-xs px-3 py-2 rounded ${
              stressAnalysis.passed ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <span className="text-gray-300">Selected Element:</span>
              <span className={`font-semibold ${
                stressAnalysis.passed ? 'text-green-400' : 'text-red-400'
              }`}>
                {stressAnalysis.passed ? 'OK' : 'OVERSTRESSED'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
