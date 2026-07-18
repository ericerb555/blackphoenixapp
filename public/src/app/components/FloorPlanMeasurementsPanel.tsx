/**
 * Floor Plan Measurements Panel
 * Comprehensive measurements, statistics, and plan details
 */

import { useState } from 'react';
import {
  Ruler,
  Square,
  Maximize2,
  DoorOpen,
  SquareDashed,
  Layers,
  TrendingUp,
  Download,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Home
} from 'lucide-react';

interface CanvasElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'room' | 'furniture' | 'electrical' | 'plumbing' | 'shape' | 'annotation' | 'dimension';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  label?: string;
  wallHeight?: number;
  layerId?: string;
  groupId?: string;
}

interface FloorPlanMeasurementsPanelProps {
  elements: CanvasElement[];
  floors: any[];
  currentFloorId: string;
  onExport?: () => void;
}

export default function FloorPlanMeasurementsPanel({
  elements,
  floors,
  currentFloorId,
  onExport
}: FloorPlanMeasurementsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    rooms: true,
    walls: false,
    doors: false,
    windows: false,
    mep: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper: Convert inches to architectural format
  const inchesToArchitectural = (totalInches: number): string => {
    const feet = Math.floor(totalInches / 12);
    const remainingInches = totalInches % 12;
    const wholeInches = Math.floor(remainingInches);
    const fraction = remainingInches - wholeInches;
    
    const sixteenths = Math.round(fraction * 16);
    
    const getFraction = (sixteenths: number): string => {
      if (sixteenths === 0) return '';
      if (sixteenths === 16) return ' 1"';
      if (sixteenths === 8) return ' 1/2"';
      if (sixteenths === 4) return ' 1/4"';
      if (sixteenths === 12) return ' 3/4"';
      return ` ${sixteenths}/16"`;
    };
    
    if (feet === 0) {
      return `${wholeInches}${getFraction(sixteenths)}`;
    }
    
    if (wholeInches === 0 && sixteenths === 0) {
      return `${feet}'-0"`;
    }
    
    return `${feet}'-${wholeInches}${getFraction(sixteenths)}`;
  };

  // Calculate statistics
  const walls = elements.filter(el => el.type === 'wall');
  const doors = elements.filter(el => el.type === 'door');
  const windows = elements.filter(el => el.type === 'window');
  const rooms = elements.filter(el => el.type === 'room');
  const electrical = elements.filter(el => el.type === 'electrical');
  const plumbing = elements.filter(el => el.type === 'plumbing');

  // Total wall length (in inches)
  const totalWallLength = walls.reduce((sum, wall) => {
    return sum + Math.sqrt(wall.width * wall.width + wall.height * wall.height);
  }, 0);

  // Total square footage
  const totalSquareFootage = rooms.reduce((sum, room) => {
    const areaInches = room.width * room.height;
    return sum + (areaInches / 144); // Convert sq inches to sq feet
  }, 0);

  // Average ceiling height
  const ceilingHeights = walls.filter(w => w.wallHeight).map(w => w.wallHeight || 96);
  const avgCeilingHeight = ceilingHeights.length > 0 
    ? ceilingHeights.reduce((a, b) => a + b, 0) / ceilingHeights.length 
    : 96;

  // Total volume (cubic feet)
  const totalVolume = rooms.reduce((sum, room) => {
    const areaInches = room.width * room.height;
    const areaSqFt = areaInches / 144;
    const height = avgCeilingHeight / 12; // Convert inches to feet
    return sum + (areaSqFt * height);
  }, 0);

  // Perimeter calculation
  const totalPerimeter = walls.reduce((sum, wall) => {
    return sum + wall.width;
  }, 0);

  // Export measurements as JSON
  const exportMeasurements = () => {
    const data = {
      summary: {
        totalSquareFootage: Math.round(totalSquareFootage),
        totalWallLength: inchesToArchitectural(totalWallLength),
        totalPerimeter: inchesToArchitectural(totalPerimeter),
        avgCeilingHeight: inchesToArchitectural(avgCeilingHeight),
        totalVolume: Math.round(totalVolume),
        roomCount: rooms.length,
        wallCount: walls.length,
        doorCount: doors.length,
        windowCount: windows.length
      },
      rooms: rooms.map(room => ({
        id: room.id,
        label: room.label || 'Unlabeled Room',
        width: inchesToArchitectural(room.width),
        height: inchesToArchitectural(room.height),
        squareFootage: Math.round((room.width * room.height) / 144),
        ceilingHeight: inchesToArchitectural(room.wallHeight || avgCeilingHeight)
      })),
      walls: walls.map(wall => ({
        id: wall.id,
        label: wall.label || 'Wall',
        length: inchesToArchitectural(wall.width),
        thickness: inchesToArchitectural(wall.height),
        height: inchesToArchitectural(wall.wallHeight || avgCeilingHeight)
      })),
      doors: doors.map(door => ({
        id: door.id,
        label: door.label || 'Door',
        width: inchesToArchitectural(door.width),
        height: inchesToArchitectural(door.height)
      })),
      windows: windows.map(window => ({
        id: window.id,
        label: window.label || 'Window',
        width: inchesToArchitectural(window.width),
        height: inchesToArchitectural(window.height)
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floor-plan-measurements-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A2A] sticky top-0 bg-[#0A0A0A] z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Ruler className="w-4 h-4 text-[#ea580c]" />
            Floor Plan Measurements
          </h3>
          <button
            onClick={exportMeasurements}
            className="p-1.5 hover:bg-[#2A2A2A] rounded transition-colors text-gray-400 hover:text-white"
            title="Export measurements"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Current Floor: {floors.find(f => f.id === currentFloorId)?.name || 'Unknown'}
        </p>
      </div>

      {/* Summary Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold">Summary</span>
          </div>
          {expandedSections.summary ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.summary && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-[#ea580c]/20 to-transparent border border-[#ea580c]/30 rounded-lg p-3">
                <Square className="w-5 h-5 text-[#ea580c] mb-1" />
                <p className="text-2xl font-bold">{Math.round(totalSquareFootage)}</p>
                <p className="text-xs text-gray-400">Total Sq Ft</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 rounded-lg p-3">
                <Home className="w-5 h-5 text-blue-400 mb-1" />
                <p className="text-2xl font-bold">{rooms.length}</p>
                <p className="text-xs text-gray-400">Rooms</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 rounded-lg p-3">
                <Ruler className="w-5 h-5 text-purple-400 mb-1" />
                <p className="text-lg font-bold">{inchesToArchitectural(totalWallLength)}</p>
                <p className="text-xs text-gray-400">Total Wall Length</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30 rounded-lg p-3">
                <ArrowUpDown className="w-5 h-5 text-green-400 mb-1" />
                <p className="text-lg font-bold">{inchesToArchitectural(avgCeilingHeight)}</p>
                <p className="text-xs text-gray-400">Avg Ceiling Height</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#2A2A2A] rounded-lg p-2">
                <p className="text-xl font-bold text-white">{walls.length}</p>
                <p className="text-xs text-gray-400">Walls</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg p-2">
                <p className="text-xl font-bold text-white">{doors.length}</p>
                <p className="text-xs text-gray-400">Doors</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg p-2">
                <p className="text-xl font-bold text-white">{windows.length}</p>
                <p className="text-xs text-gray-400">Windows</p>
              </div>
            </div>

            <div className="bg-[#2A2A2A] rounded-lg p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">Total Volume</span>
                <span className="font-bold text-white">{Math.round(totalVolume).toLocaleString()} cu ft</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Perimeter</span>
                <span className="font-bold text-white">{inchesToArchitectural(totalPerimeter)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rooms Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('rooms')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold">Rooms</span>
            <span className="text-xs text-gray-500">({rooms.length})</span>
          </div>
          {expandedSections.rooms ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.rooms && (
          <div className="px-4 pb-4 space-y-2">
            {rooms.length > 0 ? (
              rooms.map((room, index) => {
                const sqFt = Math.round((room.width * room.height) / 144);
                const ceilingHeight = room.wallHeight || avgCeilingHeight;
                
                return (
                  <div key={room.id} className="bg-[#2A2A2A] rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-white">
                        {room.label || `Room ${index + 1}`}
                      </p>
                      <span className="text-sm font-bold text-[#ea580c]">{sqFt} sq ft</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Width: </span>
                        <span className="text-white">{inchesToArchitectural(room.width)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Length: </span>
                        <span className="text-white">{inchesToArchitectural(room.height)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Ceiling: </span>
                        <span className="text-white">{inchesToArchitectural(ceilingHeight)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No rooms defined</p>
            )}
          </div>
        )}
      </div>

      {/* Walls Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('walls')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold">Walls</span>
            <span className="text-xs text-gray-500">({walls.length})</span>
          </div>
          {expandedSections.walls ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.walls && (
          <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
            {walls.length > 0 ? (
              walls.map((wall, index) => (
                <div key={wall.id} className="bg-[#2A2A2A] rounded-lg p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{wall.label || `Wall ${index + 1}`}</span>
                    <span className="text-white font-medium">{inchesToArchitectural(wall.width)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">Height:</span>
                    <span className="text-gray-300">{inchesToArchitectural(wall.wallHeight || avgCeilingHeight)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No walls drawn</p>
            )}
          </div>
        )}
      </div>

      {/* Doors Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('doors')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold">Doors</span>
            <span className="text-xs text-gray-500">({doors.length})</span>
          </div>
          {expandedSections.doors ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.doors && (
          <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
            {doors.length > 0 ? (
              doors.map((door, index) => (
                <div key={door.id} className="bg-[#2A2A2A] rounded-lg p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{door.label || `Door ${index + 1}`}</span>
                    <span className="text-white font-medium">{inchesToArchitectural(door.width)}</span>
                  </div>
                  {door.height && (
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-500">Height:</span>
                      <span className="text-gray-300">{inchesToArchitectural(door.height)}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No doors placed</p>
            )}
          </div>
        )}
      </div>

      {/* Windows Section */}
      <div className="border-b border-[#2A2A2A]">
        <button
          onClick={() => toggleSection('windows')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
        >
          <div className="flex items-center gap-2">
            <SquareDashed className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-semibold">Windows</span>
            <span className="text-xs text-gray-500">({windows.length})</span>
          </div>
          {expandedSections.windows ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expandedSections.windows && (
          <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
            {windows.length > 0 ? (
              windows.map((window, index) => (
                <div key={window.id} className="bg-[#2A2A2A] rounded-lg p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{window.label || `Window ${index + 1}`}</span>
                    <span className="text-white font-medium">
                      {inchesToArchitectural(window.width)} × {inchesToArchitectural(window.height)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">No windows placed</p>
            )}
          </div>
        )}
      </div>

      {/* MEP Section */}
      {(electrical.length > 0 || plumbing.length > 0) && (
        <div className="border-b border-[#2A2A2A]">
          <button
            onClick={() => toggleSection('mep')}
            className="w-full p-4 flex items-center justify-between hover:bg-[#2A2A2A] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-[#ea580c]" />
              <span className="text-sm font-semibold">MEP Systems</span>
              <span className="text-xs text-gray-500">({electrical.length + plumbing.length})</span>
            </div>
            {expandedSections.mep ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {expandedSections.mep && (
            <div className="px-4 pb-4 space-y-3">
              {electrical.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Electrical ({electrical.length})</p>
                  <div className="space-y-1">
                    {electrical.map((item, index) => (
                      <div key={item.id} className="bg-[#2A2A2A] rounded p-2 text-xs">
                        <span className="text-gray-400">{item.label || `Electrical ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {plumbing.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Plumbing ({plumbing.length})</p>
                  <div className="space-y-1">
                    {plumbing.map((item, index) => (
                      <div key={item.id} className="bg-[#2A2A2A] rounded p-2 text-xs">
                        <span className="text-gray-400">{item.label || `Plumbing ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
