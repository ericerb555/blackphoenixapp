// Section 4: Code Compliance & Standards Checking Component
// Provides building code selection, automated compliance checks, and design verification

import { useState } from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Shield, FileText, Zap, AlertCircle, Info } from 'lucide-react';

interface ComplianceCheckPanelProps {
  elements: Array<{
    id: string;
    type: 'beam' | 'column' | 'foundation' | 'slab';
    width: number;
    height: number;
    properties: {
      material?: string;
      size?: string;
      load?: number;
      reinforcement?: string;
      grade?: string;
      thickness?: number;
      depth?: number;
      span?: number;
      label?: string;
      stressRatio?: number;
      deflection?: number;
    };
  }>;
  selectedElementId?: string | null;
}

type BuildingCode = 'IBC-2021' | 'IBC-2018' | 'IBC-2015';
type DesignStandard = 'AISC-360' | 'ACI-318' | 'ASCE-7';

interface ComplianceViolation {
  id: string;
  elementId: string;
  severity: 'critical' | 'warning' | 'info';
  code: string;
  section: string;
  description: string;
  currentValue: string;
  requiredValue: string;
  suggestion: string;
}

interface LoadCombination {
  id: string;
  name: string;
  formula: string;
  factorDead: number;
  factorLive: number;
  factorWind?: number;
  factorSeismic?: number;
  description: string;
}

// Building Codes Database
const buildingCodes = {
  'IBC-2021': {
    name: 'International Building Code 2021',
    year: 2021,
    description: 'Latest IBC with updated seismic and wind provisions',
  },
  'IBC-2018': {
    name: 'International Building Code 2018',
    year: 2018,
    description: 'Widely adopted IBC edition',
  },
  'IBC-2015': {
    name: 'International Building Code 2015',
    year: 2015,
    description: 'Legacy IBC edition',
  },
};

// Design Standards Database
const designStandards = {
  'AISC-360': {
    name: 'AISC 360 - Steel Construction Manual',
    version: '16th Edition',
    applicableTo: ['beam', 'column'],
    description: 'Specification for Structural Steel Buildings',
  },
  'ACI-318': {
    name: 'ACI 318 - Building Code Requirements for Structural Concrete',
    version: '2019',
    applicableTo: ['beam', 'column', 'foundation', 'slab'],
    description: 'Concrete design and construction requirements',
  },
  'ASCE-7': {
    name: 'ASCE 7 - Minimum Design Loads',
    version: '2022',
    applicableTo: ['beam', 'column', 'foundation', 'slab'],
    description: 'Load combinations and load factor requirements',
  },
};

// ASCE 7 Load Combinations
const loadCombinations: LoadCombination[] = [
  {
    id: 'lc1',
    name: 'LC1: Dead Only',
    formula: '1.4D',
    factorDead: 1.4,
    factorLive: 0,
    description: 'Dead load only (rare controlling case)',
  },
  {
    id: 'lc2',
    name: 'LC2: Dead + Live',
    formula: '1.2D + 1.6L',
    factorDead: 1.2,
    factorLive: 1.6,
    description: 'Most common gravity load combination',
  },
  {
    id: 'lc3',
    name: 'LC3: Dead + Live + Wind',
    formula: '1.2D + 1.0L + 1.0W',
    factorDead: 1.2,
    factorLive: 1.0,
    factorWind: 1.0,
    description: 'Gravity plus wind loads',
  },
  {
    id: 'lc4',
    name: 'LC4: Dead + Live + Seismic',
    formula: '1.2D + 1.0L + 1.0E',
    factorDead: 1.2,
    factorLive: 1.0,
    factorSeismic: 1.0,
    description: 'Gravity plus seismic loads',
  },
  {
    id: 'lc5',
    name: 'LC5: Dead + Wind',
    formula: '1.2D + 1.0W + 0.5L',
    factorDead: 1.2,
    factorLive: 0.5,
    factorWind: 1.0,
    description: 'Reduced live load with wind',
  },
  {
    id: 'lc6',
    name: 'LC6: Dead + Seismic',
    formula: '1.2D + 1.0E + 0.5L',
    factorDead: 1.2,
    factorLive: 0.5,
    factorSeismic: 1.0,
    description: 'Reduced live load with seismic',
  },
  {
    id: 'lc7',
    name: 'LC7: Dead - Wind',
    formula: '0.9D - 1.0W',
    factorDead: 0.9,
    factorLive: 0,
    factorWind: -1.0,
    description: 'Uplift case with wind',
  },
];

// Deflection Limits
const deflectionLimits = {
  'beam-floor': { limit: 360, description: 'L/360 - Floor beams (plaster ceiling)' },
  'beam-roof': { limit: 240, description: 'L/240 - Roof beams (no plaster)' },
  'beam-cantilever': { limit: 180, description: 'L/180 - Cantilever members' },
  'general': { limit: 240, description: 'L/240 - General members' },
};

// Material Properties Database
const materialDatabase = {
  concrete: {
    '3000 PSI': { fc: 3000, Ec: 3320, description: 'Standard concrete' },
    '4000 PSI': { fc: 4000, Ec: 3834, description: 'High-strength concrete' },
    '5000 PSI': { fc: 5000, Ec: 4287, description: 'Premium concrete' },
  },
  steel: {
    'Grade 60': { fy: 60, Es: 29000, description: 'Standard rebar' },
    'Grade 75': { fy: 75, Es: 29000, description: 'High-strength rebar' },
    'A36': { fy: 36, Es: 29000, description: 'Structural steel' },
    'A992': { fy: 50, Es: 29000, description: 'W-shapes (beams/columns)' },
  },
};

export function ComplianceCheckPanel({ elements, selectedElementId }: ComplianceCheckPanelProps) {
  const [showCodeSelection, setShowCodeSelection] = useState(true);
  const [showComplianceChecks, setShowComplianceChecks] = useState(true);
  const [showLoadCombinations, setShowLoadCombinations] = useState(false);
  const [showStandardsLibrary, setShowStandardsLibrary] = useState(false);
  
  // State
  const [selectedCode, setSelectedCode] = useState<BuildingCode>('IBC-2021');
  const [selectedStandards, setSelectedStandards] = useState<DesignStandard[]>(['AISC-360', 'ACI-318', 'ASCE-7']);
  const [seismicCategory, setSeismicCategory] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('D');
  const [occupancyCategory, setOccupancyCategory] = useState<'I' | 'II' | 'III' | 'IV'>('II');
  const [fireRatingRequired, setFireRatingRequired] = useState(2); // hours
  
  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Perform compliance checks for all elements
  const performComplianceChecks = (): ComplianceViolation[] => {
    const violations: ComplianceViolation[] = [];

    elements.forEach((element) => {
      // Check 1: Deflection Limits
      if (element.type === 'beam' && element.properties.deflection && element.properties.span) {
        const allowableDeflection = (element.properties.span * 12) / 360; // L/360 in inches
        const actualDeflection = element.properties.deflection;
        
        if (actualDeflection > allowableDeflection) {
          violations.push({
            id: `${element.id}-deflection`,
            elementId: element.id,
            severity: 'warning',
            code: 'IBC',
            section: 'Table 1604.3',
            description: 'Beam deflection exceeds allowable limit',
            currentValue: `${actualDeflection.toFixed(2)}"`,
            requiredValue: `${allowableDeflection.toFixed(2)}" (L/360)`,
            suggestion: 'Increase beam depth or add additional support',
          });
        }
      }

      // Check 2: Stress Ratio
      if (element.properties.stressRatio && element.properties.stressRatio > 1.0) {
        violations.push({
          id: `${element.id}-stress`,
          elementId: element.id,
          severity: 'critical',
          code: selectedStandards.includes('AISC-360') ? 'AISC 360' : 'ACI 318',
          section: element.type === 'beam' ? 'Chapter F' : 'Chapter E',
          description: `${element.type.charAt(0).toUpperCase() + element.type.slice(1)} exceeds capacity`,
          currentValue: `${(element.properties.stressRatio * 100).toFixed(1)}%`,
          requiredValue: '≤ 100%',
          suggestion: `Increase ${element.type} size or reduce applied loads`,
        });
      }

      // Check 3: Column Slenderness (placeholder check)
      if (element.type === 'column') {
        const assumedLength = element.height; // Simplified
        const assumedRadius = element.width / 4; // Simplified
        const slendernessRatio = assumedLength / assumedRadius;
        
        if (slendernessRatio > 200) {
          violations.push({
            id: `${element.id}-slenderness`,
            elementId: element.id,
            severity: 'warning',
            code: 'AISC 360',
            section: 'E2',
            description: 'Column slenderness ratio exceeds limit',
            currentValue: slendernessRatio.toFixed(0),
            requiredValue: '≤ 200',
            suggestion: 'Add intermediate bracing or increase column size',
          });
        }
      }

      // Check 4: Minimum Reinforcement
      if ((element.type === 'beam' || element.type === 'column') && 
          element.properties.material?.toLowerCase().includes('concrete')) {
        if (!element.properties.reinforcement || element.properties.reinforcement === '') {
          violations.push({
            id: `${element.id}-rebar`,
            elementId: element.id,
            severity: 'critical',
            code: 'ACI 318',
            section: element.type === 'beam' ? '9.6.1' : '10.6.1',
            description: 'Missing reinforcement specification',
            currentValue: 'None specified',
            requiredValue: element.type === 'beam' ? 'Min 2 bars top & bottom' : 'Min 4 bars',
            suggestion: 'Specify minimum reinforcement per ACI 318',
          });
        }
      }

      // Check 5: Concrete Cover Requirements
      if (element.type === 'foundation' && element.properties.material?.toLowerCase().includes('concrete')) {
        // Assume minimum 3" cover for cast-against-soil
        violations.push({
          id: `${element.id}-cover`,
          elementId: element.id,
          severity: 'info',
          code: 'ACI 318',
          section: '20.5.1.3',
          description: 'Verify concrete cover for foundation',
          currentValue: 'Not specified',
          requiredValue: '3" min (cast against soil)',
          suggestion: 'Ensure 3" minimum cover for corrosion protection',
        });
      }

      // Check 6: Seismic Detailing Requirements
      if (['D', 'E', 'F'].includes(seismicCategory)) {
        if (element.type === 'beam' && element.properties.material?.toLowerCase().includes('concrete')) {
          violations.push({
            id: `${element.id}-seismic`,
            elementId: element.id,
            severity: 'warning',
            code: 'ACI 318',
            section: '18.6',
            description: `SDC ${seismicCategory} requires special moment frame detailing`,
            currentValue: 'Standard detailing',
            requiredValue: 'Special seismic detailing',
            suggestion: 'Provide closely spaced stirrups and adequate development length',
          });
        }
      }

      // Check 7: Fire Rating
      if (fireRatingRequired > 0) {
        if (element.type === 'beam' || element.type === 'column') {
          const thickness = element.properties.thickness || 0;
          const requiredThickness = fireRatingRequired * 1.5; // Simplified: 1.5" per hour
          
          if (thickness < requiredThickness) {
            violations.push({
              id: `${element.id}-fire`,
              elementId: element.id,
              severity: 'warning',
              code: 'IBC',
              section: 'Chapter 7',
              description: `${fireRatingRequired}-hour fire rating may not be achieved`,
              currentValue: `${thickness}" thick`,
              requiredValue: `≥ ${requiredThickness}" or use spray-applied fireproofing`,
              suggestion: 'Add fire protection or increase member size',
            });
          }
        }
      }
    });

    return violations;
  };

  const violations = performComplianceChecks();
  
  // Categorize violations
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const warningViolations = violations.filter(v => v.severity === 'warning');
  const infoViolations = violations.filter(v => v.severity === 'info');

  // Calculate compliance percentage
  const totalChecks = elements.length * 5; // Approximate number of checks per element
  const passedChecks = totalChecks - violations.length;
  const compliancePercentage = (passedChecks / totalChecks) * 100;

  // Get violations for selected element
  const selectedElementViolations = selectedElement 
    ? violations.filter(v => v.elementId === selectedElement.id)
    : [];

  return (
    <div className="space-y-4">
      {/* Code Selection */}
      <div className="border-b border-[#2A2A2A] pb-4">
        <button
          onClick={() => setShowCodeSelection(!showCodeSelection)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Building Codes & Standards
          </div>
          {showCodeSelection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showCodeSelection && (
          <div className="space-y-3">
            {/* Building Code */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Building Code</label>
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value as BuildingCode)}
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
              >
                {Object.entries(buildingCodes).map(([code, info]) => (
                  <option key={code} value={code}>{info.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{buildingCodes[selectedCode].description}</p>
            </div>

            {/* Design Standards */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">Design Standards</label>
              <div className="space-y-2">
                {Object.entries(designStandards).map(([standard, info]) => (
                  <label key={standard} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStandards.includes(standard as DesignStandard)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStandards([...selectedStandards, standard as DesignStandard]);
                        } else {
                          setSelectedStandards(selectedStandards.filter(s => s !== standard));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-xs text-white">{info.name}</div>
                      <div className="text-xs text-gray-500">{info.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Project Parameters */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2A2A2A]">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Seismic Category</label>
                <select
                  value={seismicCategory}
                  onChange={(e) => setSeismicCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                >
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(cat => (
                    <option key={cat} value={cat}>SDC {cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Occupancy</label>
                <select
                  value={occupancyCategory}
                  onChange={(e) => setOccupancyCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                >
                  {['I', 'II', 'III', 'IV'].map(cat => (
                    <option key={cat} value={cat}>Category {cat}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Fire Rating (hours)</label>
                <select
                  value={fireRatingRequired}
                  onChange={(e) => setFireRatingRequired(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value={0}>None Required</option>
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                  <option value={4}>4 Hours</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Dashboard */}
      <div className="border-b border-[#2A2A2A] pb-4">
        <button
          onClick={() => setShowComplianceChecks(!showComplianceChecks)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Compliance Verification
          </div>
          {showComplianceChecks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showComplianceChecks && (
          <div className="space-y-3">
            {/* Overall Compliance Status */}
            <div className={`px-4 py-3 rounded-lg border-2 ${
              criticalViolations.length > 0
                ? 'bg-red-500/10 border-red-500/30'
                : warningViolations.length > 0
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Overall Compliance</span>
                <span className={`text-lg font-bold ${
                  criticalViolations.length > 0 ? 'text-red-400' :
                  warningViolations.length > 0 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {compliancePercentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    criticalViolations.length > 0 ? 'bg-red-500' :
                    warningViolations.length > 0 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${compliancePercentage}%` }}
                />
              </div>
            </div>

            {/* Violation Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-center">
                <div className="text-xl font-bold text-red-400">{criticalViolations.length}</div>
                <div className="text-xs text-gray-400">Critical</div>
              </div>
              <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-center">
                <div className="text-xl font-bold text-yellow-400">{warningViolations.length}</div>
                <div className="text-xs text-gray-400">Warnings</div>
              </div>
              <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded text-center">
                <div className="text-xl font-bold text-blue-400">{infoViolations.length}</div>
                <div className="text-xs text-gray-400">Info</div>
              </div>
            </div>

            {/* Violations List */}
            {violations.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="text-xs font-semibold text-gray-300 sticky top-0 bg-[#1A1A1A] py-1">
                  Issues Found ({violations.length})
                </h4>
                {violations.map((violation) => {
                  const element = elements.find(el => el.id === violation.elementId);
                  return (
                    <div
                      key={violation.id}
                      className={`p-3 rounded-lg border ${
                        violation.severity === 'critical'
                          ? 'bg-red-500/5 border-red-500/30'
                          : violation.severity === 'warning'
                          ? 'bg-yellow-500/5 border-yellow-500/30'
                          : 'bg-blue-500/5 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {violation.severity === 'critical' ? (
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        ) : violation.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-white mb-1">
                            {element?.properties.label || `${element?.type} ${violation.elementId.slice(-4)}`}
                          </div>
                          <div className="text-xs text-gray-300 mb-2">{violation.description}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-gray-500">Current:</span>
                              <span className="ml-1 text-red-400">{violation.currentValue}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Required:</span>
                              <span className="ml-1 text-green-400">{violation.requiredValue}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 bg-[#0A0A0A] px-2 py-1 rounded mb-2">
                            💡 {violation.suggestion}
                          </div>
                          <div className="text-xs text-gray-500">
                            {violation.code} § {violation.section}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-center bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-green-400 mb-1">All Checks Passed!</div>
                <div className="text-xs text-gray-400">Design complies with selected codes</div>
              </div>
            )}

            {/* Selected Element Violations */}
            {selectedElement && selectedElementViolations.length > 0 && (
              <div className="pt-3 border-t border-[#2A2A2A]">
                <h4 className="text-xs font-semibold text-orange-400 mb-2">
                  Issues for Selected Element ({selectedElementViolations.length})
                </h4>
                <div className="space-y-1">
                  {selectedElementViolations.map((v) => (
                    <div key={v.id} className="text-xs px-2 py-1 bg-[#2A2A2A] rounded">
                      <span className={
                        v.severity === 'critical' ? 'text-red-400' :
                        v.severity === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }>●</span>
                      <span className="ml-2 text-gray-300">{v.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Load Combinations */}
      <div className="border-b border-[#2A2A2A] pb-4">
        <button
          onClick={() => setShowLoadCombinations(!showLoadCombinations)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            ASCE 7 Load Combinations
          </div>
          {showLoadCombinations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLoadCombinations && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">
              Strength Design (LRFD) Load Combinations:
            </div>
            {loadCombinations.map((combo) => (
              <div
                key={combo.id}
                className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="text-xs font-semibold text-white">{combo.name}</div>
                  <div className="text-xs text-orange-400 font-mono">{combo.formula}</div>
                </div>
                <div className="text-xs text-gray-400">{combo.description}</div>
              </div>
            ))}
            
            <div className="mt-3 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded">
              <div className="text-xs text-blue-300 mb-1">
                <Info className="w-3 h-3 inline mr-1" />
                Load Factor Notation
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                <div>D = Dead Load</div>
                <div>L = Live Load</div>
                <div>W = Wind Load</div>
                <div>E = Seismic Load</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Standards Library */}
      <div>
        <button
          onClick={() => setShowStandardsLibrary(!showStandardsLibrary)}
          className="w-full flex items-center justify-between mb-3 text-sm font-semibold hover:text-orange-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Standards Library
          </div>
          {showStandardsLibrary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showStandardsLibrary && (
          <div className="space-y-3">
            {/* Material Properties */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Concrete Properties</h4>
              <div className="space-y-1">
                {Object.entries(materialDatabase.concrete).map(([grade, props]) => (
                  <div key={grade} className="px-3 py-2 bg-[#1A1A1A] rounded">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-semibold">{grade}</span>
                      <span className="text-gray-400">{props.description}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      f'c = {props.fc} psi | Ec = {props.Ec} ksi
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Steel Properties</h4>
              <div className="space-y-1">
                {Object.entries(materialDatabase.steel).map(([grade, props]) => (
                  <div key={grade} className="px-3 py-2 bg-[#1A1A1A] rounded">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-semibold">{grade}</span>
                      <span className="text-gray-400">{props.description}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Fy = {props.fy} ksi | Es = {props.Es} ksi
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deflection Limits */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Deflection Limits</h4>
              <div className="space-y-1">
                {Object.entries(deflectionLimits).map(([key, limit]) => (
                  <div key={key} className="px-3 py-2 bg-[#1A1A1A] rounded text-xs">
                    <div className="flex justify-between">
                      <span className="text-white">L/{limit.limit}</span>
                      <span className="text-gray-400">{limit.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Reference */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Quick Reference</h4>
              <div className="space-y-1 text-xs">
                <div className="px-3 py-2 bg-[#1A1A1A] rounded">
                  <div className="text-white mb-1">Min Concrete Cover</div>
                  <div className="text-gray-400">Cast against soil: 3" | Weather exposed: 2" | Interior: 3/4"</div>
                </div>
                <div className="px-3 py-2 bg-[#1A1A1A] rounded">
                  <div className="text-white mb-1">Min Reinforcement Ratio</div>
                  <div className="text-gray-400">Beams: ρmin = 0.0033 | Columns: 1% (min), 8% (max)</div>
                </div>
                <div className="px-3 py-2 bg-[#1A1A1A] rounded">
                  <div className="text-white mb-1">Development Length</div>
                  <div className="text-gray-400">#4: 12" | #5: 15" | #6: 18" (simplified for f'c=3000, fy=60)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Summary */}
      <div className="pt-2 border-t border-[#2A2A2A]">
        <h4 className="text-xs font-semibold text-gray-300 mb-2">Active Standards</h4>
        <div className="space-y-1">
          <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded text-xs">
            <span className="text-gray-400">Building Code:</span>
            <span className="text-orange-400 font-semibold">{buildingCodes[selectedCode].name}</span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded text-xs">
            <span className="text-gray-400">Seismic Design:</span>
            <span className="text-orange-400 font-semibold">SDC {seismicCategory}</span>
          </div>
          <div className="flex justify-between px-3 py-2 bg-[#1A1A1A] rounded text-xs">
            <span className="text-gray-400">Total Violations:</span>
            <span className={`font-semibold ${
              criticalViolations.length > 0 ? 'text-red-400' :
              warningViolations.length > 0 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {violations.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
