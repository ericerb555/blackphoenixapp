// Section 3: Connection Design & Detailing Component
// Provides connection types, auto-sizing, capacity checks, and detail generation

import { useState } from 'react';
import { Link2, Wrench, FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Zap, Package } from 'lucide-react';

interface ConnectionDesignPanelProps {
  elements: Array<{
    id: string;
    type: 'beam' | 'column' | 'foundation' | 'slab';
    properties: {
      material?: string;
      size?: string;
      load?: number;
      grade?: string;
    };
  }>;
  selectedElementId?: string | null;
  onAddConnection?: (connection: Connection) => void;
}

interface Connection {
  id: string;
  type: ConnectionType;
  elementId: string;
  targetElementId?: string;
  boltGrade: string;
  boltSize: string;
  boltCount: number;
  boltPattern: string;
  weldType?: string;
  weldSize?: number;
  plateThickness?: number;
  plateMaterial?: string;
  shearCapacity?: number;
  momentCapacity?: number;
  passed: boolean;
}

type ConnectionType = 
  | 'bolted-shear' 
  | 'bolted-tension' 
  | 'bolted-combined'
  | 'welded-fillet'
  | 'welded-groove'
  | 'beam-column-simple'
  | 'beam-column-moment'
  | 'base-plate'
  | 'splice';

// Bolt specifications database
const boltDatabase = {
  'A325': {
    'M16': { diameter: 16, shearCapacity: 12.5, tensionCapacity: 20.0, area: 201 },
    'M20': { diameter: 20, shearCapacity: 19.5, tensionCapacity: 31.2, area: 314 },
    'M24': { diameter: 24, shearCapacity: 28.1, tensionCapacity: 44.9, area: 452 },
    '3/4"': { diameter: 19.05, shearCapacity: 17.9, tensionCapacity: 28.3, area: 285 },
    '7/8"': { diameter: 22.23, shearCapacity: 24.3, tensionCapacity: 38.6, area: 388 },
    '1"': { diameter: 25.4, shearCapacity: 31.8, tensionCapacity: 50.6, area: 507 },
  },
  'A490': {
    'M16': { diameter: 16, shearCapacity: 15.6, tensionCapacity: 25.0, area: 201 },
    'M20': { diameter: 20, shearCapacity: 24.4, tensionCapacity: 39.0, area: 314 },
    'M24': { diameter: 24, shearCapacity: 35.1, tensionCapacity: 56.1, area: 452 },
    '3/4"': { diameter: 19.05, shearCapacity: 22.4, tensionCapacity: 35.4, area: 285 },
    '7/8"': { diameter: 22.23, shearCapacity: 30.4, tensionCapacity: 48.3, area: 388 },
    '1"': { diameter: 25.4, shearCapacity: 39.8, tensionCapacity: 63.3, area: 507 },
  },
  'A307': {
    '3/4"': { diameter: 19.05, shearCapacity: 9.0, tensionCapacity: 14.2, area: 285 },
    '7/8"': { diameter: 22.23, shearCapacity: 12.2, tensionCapacity: 19.4, area: 388 },
    '1"': { diameter: 25.4, shearCapacity: 16.0, tensionCapacity: 25.4, area: 507 },
  }
};

// Weld specifications
const weldDatabase = {
  'E70XX': {
    'electrodeStrength': 70,
    'allowableShear': 21.0, // ksi
    'sizes': [3, 4, 5, 6, 8, 10, 12, 16], // mm or 1/16"
  },
  'E80XX': {
    'electrodeStrength': 80,
    'allowableShear': 24.0, // ksi
    'sizes': [3, 4, 5, 6, 8, 10, 12, 16],
  },
};

// Standard bolt patterns
const boltPatterns = {
  'single-line': { rows: 1, description: 'Single Line' },
  'double-line': { rows: 2, description: 'Double Line (Standard)' },
  'staggered': { rows: 2, description: 'Staggered Pattern' },
  'rectangular': { rows: 2, description: 'Rectangular Grid' },
  'circular': { rows: 1, description: 'Circular Pattern' },
};

export function ConnectionDesignPanel({ elements, selectedElementId, onAddConnection }: ConnectionDesignPanelProps) {
  const [showConnectionLibrary, setShowConnectionLibrary] = useState(true);
  const [showConnectionDesigner, setShowConnectionDesigner] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showMaterialSpecs, setShowMaterialSpecs] = useState(false);
  
  // Connection designer state
  const [selectedConnectionType, setSelectedConnectionType] = useState<ConnectionType>('bolted-shear');
  const [boltGrade, setBoltGrade] = useState<keyof typeof boltDatabase>('A325');
  const [boltSize, setBoltSize] = useState('3/4"');
  const [boltCount, setBoltCount] = useState(4);
  const [boltPattern, setBoltPattern] = useState('double-line');
  const [weldType, setWeldType] = useState<keyof typeof weldDatabase>('E70XX');
  const [weldSize, setWeldSize] = useState(6);
  const [plateThickness, setPlateThickness] = useState(12);
  
  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Calculate connection capacity
  const calculateConnectionCapacity = () => {
    if (!selectedElement) return null;

    const appliedLoad = selectedElement.properties.load || 0;
    let shearCapacity = 0;
    let tensionCapacity = 0;
    let momentCapacity = 0;

    if (selectedConnectionType.includes('bolted')) {
      const boltSpec = boltDatabase[boltGrade][boltSize as keyof typeof boltDatabase['A325']];
      if (boltSpec) {
        shearCapacity = boltSpec.shearCapacity * boltCount;
        tensionCapacity = boltSpec.tensionCapacity * boltCount;
      }
    } else if (selectedConnectionType.includes('welded')) {
      const weldSpec = weldDatabase[weldType];
      // Simplified weld capacity: allowable shear * weld size * length
      // Assuming 10" total weld length for this example
      const weldLength = 10;
      shearCapacity = weldSpec.allowableShear * (weldSize / 16) * weldLength;
    }

    if (selectedConnectionType.includes('moment')) {
      // Simplified moment capacity
      momentCapacity = shearCapacity * 12; // Assume 12" moment arm
    }

    const utilizationShear = shearCapacity > 0 ? (appliedLoad / shearCapacity) * 100 : 0;
    const passed = utilizationShear <= 100;

    return {
      shearCapacity,
      tensionCapacity,
      momentCapacity,
      utilizationShear,
      passed,
      appliedLoad,
    };
  };

  const capacityAnalysis = calculateConnectionCapacity();

  // Generate bill of materials
  const generateBOM = () => {
    const bom = [];
    
    if (selectedConnectionType.includes('bolted')) {
      bom.push({
        item: `${boltGrade} Bolt ${boltSize}`,
        quantity: boltCount,
        unit: 'ea',
      });
      bom.push({
        item: `${boltGrade} Nut ${boltSize}`,
        quantity: boltCount,
        unit: 'ea',
      });
      bom.push({
        item: `Washer ${boltSize}`,
        quantity: boltCount * 2,
        unit: 'ea',
      });
    }
    
    if (selectedConnectionType.includes('welded')) {
      const weldLength = 10; // inches
      bom.push({
        item: `${weldType} Electrode`,
        quantity: (weldLength * weldSize) / 16,
        unit: 'lbs',
      });
    }
    
    if (selectedConnectionType.includes('base-plate') || selectedConnectionType.includes('splice')) {
      bom.push({
        item: `Connection Plate ${plateThickness}mm thick`,
        quantity: 1,
        unit: 'ea',
      });
    }
    
    return bom;
  };

  const bom = generateBOM();

  // Add connection handler
  const handleAddConnection = () => {
    if (!selectedElement || !onAddConnection) return;

    const analysis = calculateConnectionCapacity();
    
    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      type: selectedConnectionType,
      elementId: selectedElement.id,
      boltGrade,
      boltSize,
      boltCount,
      boltPattern,
      weldType,
      weldSize,
      plateThickness,
      shearCapacity: analysis?.shearCapacity,
      momentCapacity: analysis?.momentCapacity,
      passed: analysis?.passed || false,
    };

    onAddConnection(newConnection);
  };

  return (
    <div className="space-y-4">
      {/* Connection Type Library */}
      <div className="border-b border-[#2A2A2A] pb-4">
        <button
          onClick={() => setShowConnectionLibrary(!showConnectionLibrary)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Connection Library
          </div>
          {showConnectionLibrary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showConnectionLibrary && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">Select Connection Type:</div>
            
            {/* Bolted Connections */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-300 mb-1">Bolted Connections</div>
              {[
                { type: 'bolted-shear', label: 'Simple Shear' },
                { type: 'bolted-tension', label: 'Tension' },
                { type: 'bolted-combined', label: 'Combined Shear/Tension' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedConnectionType(type as ConnectionType)}
                  className={`w-full px-3 py-2 rounded text-xs text-left transition-colors ${
                    selectedConnectionType === type
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Welded Connections */}
            <div className="space-y-1 mt-3">
              <div className="text-xs font-semibold text-gray-300 mb-1">Welded Connections</div>
              {[
                { type: 'welded-fillet', label: 'Fillet Weld' },
                { type: 'welded-groove', label: 'Groove Weld (CJP)' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedConnectionType(type as ConnectionType)}
                  className={`w-full px-3 py-2 rounded text-xs text-left transition-colors ${
                    selectedConnectionType === type
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Special Connections */}
            <div className="space-y-1 mt-3">
              <div className="text-xs font-semibold text-gray-300 mb-1">Special Connections</div>
              {[
                { type: 'beam-column-simple', label: 'Beam-Column Simple Shear' },
                { type: 'beam-column-moment', label: 'Beam-Column Moment' },
                { type: 'base-plate', label: 'Column Base Plate' },
                { type: 'splice', label: 'Member Splice' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedConnectionType(type as ConnectionType)}
                  className={`w-full px-3 py-2 rounded text-xs text-left transition-colors ${
                    selectedConnectionType === type
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#1A1A1A] text-gray-300 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connection Designer */}
      {selectedElement && (
        <div className="border-b border-[#2A2A2A] pb-4">
          <button
            onClick={() => setShowConnectionDesigner(!showConnectionDesigner)}
            className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Connection Designer
            </div>
            {showConnectionDesigner ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showConnectionDesigner && (
            <div className="space-y-3">
              <div className="px-3 py-2 bg-orange-600/10 border border-orange-600/30 rounded text-xs text-orange-300">
                Designing: <span className="font-semibold capitalize">{selectedConnectionType.replace(/-/g, ' ')}</span>
              </div>

              {/* Bolted Connection Parameters */}
              {selectedConnectionType.includes('bolted') && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Bolt Grade</label>
                    <select
                      value={boltGrade}
                      onChange={(e) => setBoltGrade(e.target.value as keyof typeof boltDatabase)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                    >
                      {Object.keys(boltDatabase).map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Bolt Size</label>
                    <select
                      value={boltSize}
                      onChange={(e) => setBoltSize(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                    >
                      {Object.keys(boltDatabase[boltGrade]).map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Number of Bolts</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBoltCount(Math.max(2, boltCount - 1))}
                        className="px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={boltCount}
                        onChange={(e) => setBoltCount(Math.max(2, Number(e.target.value)))}
                        className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm text-center focus:outline-none focus:border-orange-500"
                        min="2"
                      />
                      <button
                        onClick={() => setBoltCount(boltCount + 1)}
                        className="px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Bolt Pattern</label>
                    <select
                      value={boltPattern}
                      onChange={(e) => setBoltPattern(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                    >
                      {Object.entries(boltPatterns).map(([key, pattern]) => (
                        <option key={key} value={key}>{pattern.description}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Welded Connection Parameters */}
              {selectedConnectionType.includes('welded') && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Electrode Grade</label>
                    <select
                      value={weldType}
                      onChange={(e) => setWeldType(e.target.value as keyof typeof weldDatabase)}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                    >
                      {Object.keys(weldDatabase).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Weld Size (1/16")</label>
                    <select
                      value={weldSize}
                      onChange={(e) => setWeldSize(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                    >
                      {weldDatabase[weldType].sizes.map((size) => (
                        <option key={size} value={size}>{size}/16" ({(size / 16).toFixed(3)}")</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Plate Thickness (for base plates and splices) */}
              {(selectedConnectionType.includes('base-plate') || selectedConnectionType.includes('splice')) && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Plate Thickness (mm)</label>
                  <input
                    type="number"
                    value={plateThickness}
                    onChange={(e) => setPlateThickness(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                    min="6"
                    step="2"
                  />
                </div>
              )}

              {/* Auto-size Button */}
              <button
                onClick={() => {
                  // Auto-sizing logic based on applied load
                  const load = selectedElement.properties.load || 0;
                  if (selectedConnectionType.includes('bolted')) {
                    const requiredCapacity = load * 1.5; // 50% safety margin
                    const boltSpec = boltDatabase[boltGrade][boltSize as keyof typeof boltDatabase['A325']];
                    if (boltSpec) {
                      const requiredBolts = Math.ceil(requiredCapacity / boltSpec.shearCapacity);
                      setBoltCount(Math.max(2, requiredBolts));
                    }
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Auto-Size Connection
              </button>

              {/* Add Connection Button */}
              {onAddConnection && (
                <button
                  onClick={handleAddConnection}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Add Connection to Element
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connection Analysis */}
      {selectedElement && capacityAnalysis && (
        <div className="border-b border-[#2A2A2A] pb-4">
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Connection Analysis
            </div>
            {showAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAnalysis && (
            <div className="space-y-3">
              {/* Status Indicator */}
              <div className={`px-3 py-3 rounded-lg border-2 ${
                capacityAnalysis.passed
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {capacityAnalysis.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`font-semibold ${
                    capacityAnalysis.passed ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {capacityAnalysis.passed ? 'CONNECTION ADEQUATE' : 'CONNECTION INADEQUATE'}
                  </span>
                </div>
                <div className="text-xs text-gray-300">
                  Utilization: <span className="font-bold text-white">
                    {capacityAnalysis.utilizationShear.toFixed(1)}%
                  </span>
                  {!capacityAnalysis.passed && (
                    <span className="ml-2 text-red-400">(Increase bolt count or size)</span>
                  )}
                </div>
              </div>

              {/* Capacity Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">Applied Load:</span>
                  <span className="text-white">{capacityAnalysis.appliedLoad.toFixed(0)} kips</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                  <span className="text-gray-400">Shear Capacity:</span>
                  <span className="text-white">{capacityAnalysis.shearCapacity.toFixed(1)} kips</span>
                </div>
                {capacityAnalysis.tensionCapacity > 0 && (
                  <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                    <span className="text-gray-400">Tension Capacity:</span>
                    <span className="text-white">{capacityAnalysis.tensionCapacity.toFixed(1)} kips</span>
                  </div>
                )}
                {capacityAnalysis.momentCapacity > 0 && (
                  <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
                    <span className="text-gray-400">Moment Capacity:</span>
                    <span className="text-white">{capacityAnalysis.momentCapacity.toFixed(1)} kip-in</span>
                  </div>
                )}
              </div>

              {/* Utilization Bar */}
              <div>
                <div className="text-xs text-gray-400 mb-1">Capacity Utilization</div>
                <div className="w-full h-6 bg-[#1A1A1A] rounded-lg overflow-hidden border border-[#2A2A2A]">
                  <div
                    className={`h-full transition-all ${
                      capacityAnalysis.utilizationShear > 100 ? 'bg-red-500' :
                      capacityAnalysis.utilizationShear > 80 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(capacityAnalysis.utilizationShear, 100)}%` }}
                  />
                </div>
              </div>

              {/* Bill of Materials */}
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <Package className="w-3 h-3" />
                  Bill of Materials
                </h4>
                <div className="space-y-1">
                  {bom.map((item, index) => (
                    <div key={index} className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded text-xs">
                      <span className="text-gray-300">{item.item}</span>
                      <span className="text-white font-semibold">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Material Specifications */}
      <div>
        <button
          onClick={() => setShowMaterialSpecs(!showMaterialSpecs)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Material Specifications
          </div>
          {showMaterialSpecs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMaterialSpecs && (
          <div className="space-y-3">
            {/* Bolt Specifications */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Bolt Grades</h4>
              <div className="space-y-2">
                {Object.entries(boltDatabase).map(([grade, sizes]) => (
                  <div key={grade} className="px-3 py-2 bg-[#1A1A1A] rounded">
                    <div className="text-xs font-semibold text-white mb-1">{grade}</div>
                    <div className="text-xs text-gray-400">
                      Available sizes: {Object.keys(sizes).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weld Specifications */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Weld Electrodes</h4>
              <div className="space-y-2">
                {Object.entries(weldDatabase).map(([electrode, specs]) => (
                  <div key={electrode} className="px-3 py-2 bg-[#1A1A1A] rounded">
                    <div className="text-xs font-semibold text-white mb-1">{electrode}</div>
                    <div className="text-xs text-gray-400">
                      Strength: {specs.electrodeStrength} ksi | Allowable Shear: {specs.allowableShear} ksi
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Requirements */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">AISC Requirements</h4>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="px-3 py-2 bg-[#1A1A1A] rounded">
                  Min Edge Distance: 1.5 × bolt diameter
                </div>
                <div className="px-3 py-2 bg-[#1A1A1A] rounded">
                  Min Bolt Spacing: 3 × bolt diameter
                </div>
                <div className="px-3 py-2 bg-[#1A1A1A] rounded">
                  Max Bolt Spacing: 24 × plate thickness or 12"
                </div>
                <div className="px-3 py-2 bg-[#1A1A1A] rounded">
                  Min Weld Size: Based on thinner plate
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Summary */}
      <div className="pt-2 border-t border-[#2A2A2A]">
        <h4 className="text-xs font-semibold text-gray-300 mb-2">Connection Summary</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded">
            <span className="text-gray-400">Selected Type:</span>
            <span className="text-orange-400 font-semibold capitalize">
              {selectedConnectionType.replace(/-/g, ' ')}
            </span>
          </div>
          {selectedElement && capacityAnalysis && (
            <div className={`flex justify-between px-3 py-2 rounded ${
              capacityAnalysis.passed ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <span className="text-gray-300">Status:</span>
              <span className={`font-semibold ${
                capacityAnalysis.passed ? 'text-green-400' : 'text-red-400'
              }`}>
                {capacityAnalysis.passed ? 'ADEQUATE' : 'INADEQUATE'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
