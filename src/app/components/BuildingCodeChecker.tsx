/**
 * Building Code Compliance Checker
 * Automated verification against building codes and standards
 */

import { useState } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info,
  ExternalLink,
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/**
 * Local fallback ruleset — mirrors the server's IRC 2021 defaults so the checker
 * still works offline. The server (design-standards) is the source of truth.
 */
const FALLBACK_RULESET = {
  jurisdiction: 'IRC2021',
  label: 'IRC 2021 · ICC A117.1 · ADA 2010 (local)',
  thresholds: {
    minDoorWidthIn: 32, stdDoorWidthIn: 36, adaClearWidthIn: 32,
    egressWindowMinSqFt: 5.7, naturalLightMinPct: 8,
    bedroomMinSqFt: 70, habitableMinDimIn: 84, bathroomMinSqFt: 35,
    ceilingMinFt: 7, ceilingStdFt: 7.5, loadBearingMinSpacingIn: 48,
  },
  references: {
    minDoorWidth: 'IRC R311.2', adaClearWidth: 'ADA Std. 404.2.3',
    egressWindow: 'IRC R310.2.1', naturalLight: 'IRC R303.1',
    loadBearing: 'IRC R602', bedroomSize: 'IRC R304.2',
    habitableDim: 'IRC R304.3', bathroomSize: 'IRC R307', ceilingHeight: 'IRC R305.1',
  },
};

interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  wallHeight?: number;
}

interface ComplianceCheck {
  id: string;
  category: 'egress' | 'accessibility' | 'structural' | 'fire' | 'ventilation' | 'size';
  rule: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  reference?: string;
}

interface BuildingCodeCheckerProps {
  elements: CanvasElement[];
  onClose: () => void;
}

export default function BuildingCodeChecker({ elements, onClose }: BuildingCodeCheckerProps) {
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [rulesetLabel, setRulesetLabel] = useState<string>('');

  const runComplianceCheck = async () => {
    setChecking(true);

    // Pull the live, citable ruleset from the design-standards data source.
    // Fall back to the bundled IRC 2021 defaults if the server is unreachable.
    let ruleset = FALLBACK_RULESET;
    try {
      const res = await fetch(`${SERVER}/design-standards/code-rules?jurisdiction=IRC2021`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.ruleset) {
        ruleset = data.ruleset;
      } else {
        console.warn('Code-rules fetch returned no ruleset, using local fallback:', data?.error);
      }
    } catch (err) {
      console.warn('Code-rules fetch failed, using local fallback:', err);
    }
    setRulesetLabel(ruleset.label || ruleset.jurisdiction || 'IRC 2021');

    const t = ruleset.thresholds;
    const ref = ruleset.references;
    const results: ComplianceCheck[] = [];

    const walls = elements.filter(el => el.type === 'wall');
    const doors = elements.filter(el => el.type === 'door');
    const windows = elements.filter(el => el.type === 'window');
    const rooms = elements.filter(el => el.type === 'room');

    // EGRESS — minimum door width
    doors.forEach(door => {
      const widthInches = door.width;
      if (widthInches < t.minDoorWidthIn) {
        results.push({
          id: `door-width-${door.id}`, category: 'egress', rule: 'Minimum Door Width', status: 'fail',
          details: `Door ${door.label || 'unlabeled'} is ${Math.round(widthInches)}" wide. Minimum required: ${t.minDoorWidthIn}"`,
          reference: ref.minDoorWidth,
        });
      } else if (widthInches < t.stdDoorWidthIn) {
        results.push({
          id: `door-width-${door.id}`, category: 'egress', rule: 'Door Width Standard', status: 'warning',
          details: `Door ${door.label || 'unlabeled'} is ${Math.round(widthInches)}" wide. Standard: ${t.stdDoorWidthIn}" recommended`,
          reference: ref.minDoorWidth,
        });
      } else {
        results.push({
          id: `door-width-${door.id}`, category: 'egress', rule: 'Minimum Door Width', status: 'pass',
          details: `Door ${door.label || 'unlabeled'} meets minimum width requirement (${Math.round(widthInches)}")`,
          reference: ref.minDoorWidth,
        });
      }
    });

    // ACCESSIBILITY — ADA clear width
    const accessibleDoors = doors.filter(d => d.width >= t.adaClearWidthIn);
    if (doors.length > 0) {
      results.push({
        id: 'ada-doors', category: 'accessibility', rule: 'ADA Doorway Clearance',
        status: accessibleDoors.length === doors.length ? 'pass' : 'warning',
        details: `${accessibleDoors.length}/${doors.length} doors meet the ${t.adaClearWidthIn}" ADA clear-width requirement`,
        reference: ref.adaClearWidth,
      });
    }

    // STRUCTURAL — load-bearing wall spacing
    if (walls.length >= 2) {
      const parallelWalls = walls.filter(w => Math.abs(w.rotation % 180) < 5);
      if (parallelWalls.length >= 2) {
        let structuralIssue = false;
        parallelWalls.forEach((w1, i) => {
          parallelWalls.slice(i + 1).forEach(w2 => {
            const distance = Math.abs(w1.y - w2.y) + Math.abs(w1.x - w2.x);
            if (distance < t.loadBearingMinSpacingIn) structuralIssue = true;
          });
        });
        results.push({
          id: 'wall-spacing', category: 'structural', rule: 'Load-Bearing Wall Spacing',
          status: structuralIssue ? 'warning' : 'pass',
          details: structuralIssue
            ? `Some walls are closer than ${t.loadBearingMinSpacingIn}". Verify load-bearing requirements.`
            : 'Wall spacing appears adequate for structural integrity',
          reference: ref.loadBearing,
        });
      }
    }

    // FIRE SAFETY — emergency egress windows for bedrooms
    const bedrooms = rooms.filter(r => r.label?.toLowerCase().includes('bed'));
    bedrooms.forEach(bedroom => {
      const bedroomWindows = windows.filter(w =>
        w.x >= bedroom.x && w.x <= bedroom.x + bedroom.width &&
        w.y >= bedroom.y && w.y <= bedroom.y + bedroom.height);
      if (bedroomWindows.length === 0) {
        results.push({
          id: `egress-window-${bedroom.id}`, category: 'fire', rule: 'Emergency Egress Window', status: 'fail',
          details: `${bedroom.label} requires an emergency egress window`, reference: ref.egressWindow,
        });
      } else {
        const adequateWindow = bedroomWindows.some(w => (w.width * w.height) / 144 >= t.egressWindowMinSqFt);
        results.push({
          id: `egress-window-${bedroom.id}`, category: 'fire', rule: 'Emergency Egress Window',
          status: adequateWindow ? 'pass' : 'warning',
          details: adequateWindow
            ? `${bedroom.label} has an adequate egress window`
            : `${bedroom.label} window may not meet the minimum ${t.egressWindowMinSqFt} sq ft opening`,
          reference: ref.egressWindow,
        });
      }
    });

    // VENTILATION & NATURAL LIGHT
    rooms.forEach(room => {
      const roomWindows = windows.filter(w =>
        w.x >= room.x && w.x <= room.x + room.width &&
        w.y >= room.y && w.y <= room.y + room.height);
      const roomSqFt = (room.width * room.height) / 144;
      const totalWindowArea = roomWindows.reduce((sum, w) => sum + (w.width * w.height) / 144, 0);
      const windowRatio = roomSqFt > 0 ? (totalWindowArea / roomSqFt) * 100 : 0;
      if (windowRatio < t.naturalLightMinPct) {
        results.push({
          id: `ventilation-${room.id}`, category: 'ventilation', rule: 'Natural Light & Ventilation', status: 'warning',
          details: `${room.label || 'Room'} window area is ${windowRatio.toFixed(1)}% of floor area. Minimum ${t.naturalLightMinPct}% required`,
          reference: ref.naturalLight,
        });
      } else {
        results.push({
          id: `ventilation-${room.id}`, category: 'ventilation', rule: 'Natural Light & Ventilation', status: 'pass',
          details: `${room.label || 'Room'} meets natural light requirements (${windowRatio.toFixed(1)}%)`,
          reference: ref.naturalLight,
        });
      }
    });

    // MINIMUM ROOM SIZES
    const minDimFt = t.habitableMinDimIn / 12;
    rooms.forEach(room => {
      const sqFt = (room.width * room.height) / 144;
      const widthFt = room.width / 12;
      const lengthFt = room.height / 12;
      if (room.label?.toLowerCase().includes('bed')) {
        if (sqFt < t.bedroomMinSqFt || widthFt < minDimFt || lengthFt < minDimFt) {
          results.push({
            id: `room-size-${room.id}`, category: 'size', rule: 'Bedroom Minimum Size', status: 'fail',
            details: `${room.label} is ${sqFt.toFixed(0)} sq ft. Minimum: ${t.bedroomMinSqFt} sq ft with ${minDimFt}' minimum dimension`,
            reference: ref.bedroomSize,
          });
        } else {
          results.push({
            id: `room-size-${room.id}`, category: 'size', rule: 'Bedroom Minimum Size', status: 'pass',
            details: `${room.label} meets minimum size requirements (${sqFt.toFixed(0)} sq ft)`,
            reference: ref.bedroomSize,
          });
        }
      }
      if (room.label?.toLowerCase().includes('bath') && sqFt < t.bathroomMinSqFt) {
        results.push({
          id: `room-size-${room.id}`, category: 'size', rule: 'Bathroom Size', status: 'warning',
          details: `${room.label} is ${sqFt.toFixed(0)} sq ft. Typical minimum: ${t.bathroomMinSqFt} sq ft`,
          reference: ref.bathroomSize,
        });
      }
    });

    // CEILING HEIGHTS
    const measuredWalls = walls.filter(w => w.wallHeight);
    const avgCeilingHeight = measuredWalls.reduce((sum, w) => sum + (w.wallHeight || 96), 0) / Math.max(measuredWalls.length, 1);
    const ceilingHeightFeet = avgCeilingHeight / 12;
    if (ceilingHeightFeet < t.ceilingMinFt) {
      results.push({
        id: 'ceiling-height', category: 'size', rule: 'Minimum Ceiling Height', status: 'fail',
        details: `Average ceiling height is ${ceilingHeightFeet.toFixed(1)}'. Minimum required: ${t.ceilingMinFt}'`,
        reference: ref.ceilingHeight,
      });
    } else if (ceilingHeightFeet < t.ceilingStdFt) {
      results.push({
        id: 'ceiling-height', category: 'size', rule: 'Standard Ceiling Height', status: 'warning',
        details: `Average ceiling height is ${ceilingHeightFeet.toFixed(1)}'. Standard: 8' recommended`,
        reference: ref.ceilingHeight,
      });
    } else {
      results.push({
        id: 'ceiling-height', category: 'size', rule: 'Ceiling Height', status: 'pass',
        details: `Ceiling height meets requirements (${ceilingHeightFeet.toFixed(1)}')`,
        reference: ref.ceilingHeight,
      });
    }

    setChecks(results);
    setChecking(false);

    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warning').length;
    if (failCount === 0 && warnCount === 0) {
      toast.success('All building code checks passed!');
    } else if (failCount > 0) {
      toast.error(`${failCount} code violations found`);
    } else {
      toast.warning(`${warnCount} warnings found`);
    }
  };

  const filteredChecks = selectedCategory === 'all' 
    ? checks 
    : checks.filter(c => c.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All Checks', color: 'gray' },
    { id: 'egress', label: 'Egress', color: 'blue' },
    { id: 'accessibility', label: 'Accessibility', color: 'purple' },
    { id: 'structural', label: 'Structural', color: 'orange' },
    { id: 'fire', label: 'Fire Safety', color: 'red' },
    { id: 'ventilation', label: 'Ventilation', color: 'green' },
    { id: 'size', label: 'Room Sizes', color: 'yellow' }
  ];

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warning').length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0d0d0d] border border-[#2A2A2A] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Shield className="w-7 h-7 text-[#ea580c]" />
              Building Code Compliance
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <p className="text-gray-400 mb-4">
            Automated compliance checking against{' '}
            {rulesetLabel || 'IRC (International Residential Code) and ADA standards'}
            {rulesetLabel && <span className="text-green-400"> · live ruleset</span>}
          </p>

          {!checking && checks.length === 0 && (
            <button
              onClick={runComplianceCheck}
              disabled={elements.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield className="w-5 h-5" />
              Run Compliance Check
            </button>
          )}

          {checking && (
            <div className="flex items-center justify-center gap-3 p-6 bg-[#2A2A2A] rounded-lg">
              <Loader2 className="w-6 h-6 text-[#ea580c] animate-spin" />
              <div>
                <p className="text-white font-medium">Analyzing floor plan...</p>
                <p className="text-sm text-gray-400">Checking code compliance requirements</p>
              </div>
            </div>
          )}

          {checks.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-400">{passCount}</p>
                <p className="text-xs text-green-300">Passed</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-400">{warnCount}</p>
                <p className="text-xs text-yellow-300">Warnings</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-400">{failCount}</p>
                <p className="text-xs text-red-300">Violations</p>
              </div>
            </div>
          )}
        </div>

        {/* Category Filters */}
        {checks.length > 0 && (
          <div className="px-6 py-4 border-b border-[#2A2A2A] overflow-x-auto">
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#3A3A3A]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {checks.length > 0 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {filteredChecks.map(check => (
              <div
                key={check.id}
                className={`p-4 rounded-lg border ${
                  check.status === 'pass'
                    ? 'bg-green-500/5 border-green-500/30'
                    : check.status === 'warning'
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-red-500/5 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {check.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    {check.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                    {check.status === 'fail' && <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-white mb-1">{check.rule}</h4>
                        <p className="text-sm text-gray-300">{check.details}</p>
                        {check.reference && (
                          <div className="flex items-center gap-1 mt-2">
                            <FileText className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">{check.reference}</span>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        check.status === 'pass'
                          ? 'bg-green-500/20 text-green-300'
                          : check.status === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {check.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredChecks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No {selectedCategory} checks available
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A] bg-blue-500/5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">Compliance Disclaimer</p>
              <p className="text-blue-300/80">
                This automated check is for preliminary guidance only. Always consult with local building officials and licensed professionals for final code compliance verification. Building codes vary by jurisdiction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
