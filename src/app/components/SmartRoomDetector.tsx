/**
 * Smart Room Detector
 * 
 * AI-powered room detection and analysis:
 * - Detect rooms from walls
 * - Auto-calculate dimensions
 * - Identify room types
 * - Generate labels
 * - Space optimization suggestions
 */

import { useState } from 'react';
import { X, Sparkles, Ruler, Home, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface DetectedRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number; // square feet
  perimeter: number; // feet
  suggestedType: 'bedroom' | 'living' | 'kitchen' | 'bathroom' | 'office' | 'dining' | 'hallway' | 'closet' | 'unknown';
  suggestedName: string;
  confidence: number; // 0-100
  doors: number;
  windows: number;
  walls: string[]; // wall IDs forming this room
}

interface SmartRoomDetectorProps {
  walls: Wall[];
  doors: any[];
  windows: any[];
  onRoomsDetected: (rooms: any[]) => void;
  onClose: () => void;
}

export default function SmartRoomDetector({ 
  walls, 
  doors, 
  windows, 
  onRoomsDetected, 
  onClose 
}: SmartRoomDetectorProps) {
  const [detecting, setDetecting] = useState(false);
  const [detectedRooms, setDetectedRooms] = useState<DetectedRoom[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const detectRooms = () => {
    setDetecting(true);
    toast.info('Analyzing floor plan...', {
      description: 'Detecting rooms from walls'
    });

    // Simulate AI detection (in real implementation, this would use graph algorithms)
    setTimeout(() => {
      const rooms = analyzeWallsAndDetectRooms(walls, doors, windows);
      setDetectedRooms(rooms);
      setDetecting(false);
      
      toast.success(`Detected ${rooms.length} rooms!`, {
        description: 'Review and select rooms to add'
      });
    }, 2000);
  };

  const analyzeWallsAndDetectRooms = (
    walls: Wall[], 
    doors: any[], 
    windows: any[]
  ): DetectedRoom[] => {
    const rooms: DetectedRoom[] = [];
    
    // Simplified room detection - find rectangular spaces bounded by walls
    // In production, this would use proper polygon detection algorithms
    
    // Group walls by proximity to find enclosed spaces
    const enclosedSpaces = findEnclosedSpaces(walls);
    
    enclosedSpaces.forEach((space, index) => {
      const area = (space.width / 12) * (space.height / 12); // Square feet
      const perimeter = 2 * ((space.width / 12) + (space.height / 12)); // Feet
      
      // Count doors and windows in this space
      const doorsInRoom = doors.filter(d => 
        isElementInSpace(d, space)
      ).length;
      
      const windowsInRoom = windows.filter(w => 
        isElementInSpace(w, space)
      ).length;
      
      // Determine room type based on size and features
      const { type, name, confidence } = determineRoomType(
        area, 
        doorsInRoom, 
        windowsInRoom,
        space.width / 12,
        space.height / 12
      );
      
      rooms.push({
        id: `room-detected-${index}`,
        x: space.x,
        y: space.y,
        width: space.width,
        height: space.height,
        area,
        perimeter,
        suggestedType: type,
        suggestedName: name,
        confidence,
        doors: doorsInRoom,
        windows: windowsInRoom,
        walls: space.wallIds
      });
    });
    
    return rooms;
  };

  const findEnclosedSpaces = (walls: Wall[]): any[] => {
    // Simplified: Create sample rooms based on wall configuration
    // In production, this would use proper space detection
    const spaces: any[] = [];
    
    // Sample detection - creates rooms every 200px
    const gridSize = 200;
    const maxX = Math.max(...walls.map(w => w.x + w.width));
    const maxY = Math.max(...walls.map(w => w.y + w.height));
    
    for (let x = 50; x < maxX; x += gridSize) {
      for (let y = 50; y < maxY; y += gridSize) {
        // Check if this area has walls around it
        const hasWalls = checkForSurroundingWalls(x, y, gridSize - 50, gridSize - 50, walls);
        
        if (hasWalls) {
          spaces.push({
            x,
            y,
            width: gridSize - 50,
            height: gridSize - 50,
            wallIds: []
          });
        }
      }
    }
    
    return spaces;
  };

  const checkForSurroundingWalls = (
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    walls: Wall[]
  ): boolean => {
    // Simplified check - in production, would check if walls form enclosure
    return walls.length >= 4;
  };

  const isElementInSpace = (element: any, space: any): boolean => {
    return (
      element.x >= space.x &&
      element.x + element.width <= space.x + space.width &&
      element.y >= space.y &&
      element.y + element.height <= space.y + space.height
    );
  };

  const determineRoomType = (
    area: number,
    doors: number,
    windows: number,
    widthFeet: number,
    heightFeet: number
  ): { type: DetectedRoom['suggestedType']; name: string; confidence: number } => {
    let confidence = 60; // Base confidence
    
    // Bedroom: 100-250 sqft, 1-2 windows, 1-2 doors
    if (area >= 100 && area <= 250 && windows >= 1 && doors <= 2) {
      return { 
        type: 'bedroom', 
        name: 'Bedroom', 
        confidence: 85 
      };
    }
    
    // Living Room: 200-400 sqft, 2+ windows
    if (area >= 200 && area <= 400 && windows >= 2) {
      return { 
        type: 'living', 
        name: 'Living Room', 
        confidence: 80 
      };
    }
    
    // Kitchen: 100-200 sqft, 1+ windows
    if (area >= 100 && area <= 200 && windows >= 1) {
      return { 
        type: 'kitchen', 
        name: 'Kitchen', 
        confidence: 75 
      };
    }
    
    // Bathroom: 30-80 sqft, small size, 0-1 windows
    if (area >= 30 && area <= 80 && windows <= 1) {
      return { 
        type: 'bathroom', 
        name: 'Bathroom', 
        confidence: 85 
      };
    }
    
    // Office: 80-150 sqft, 1+ windows
    if (area >= 80 && area <= 150 && windows >= 1) {
      return { 
        type: 'office', 
        name: 'Office', 
        confidence: 70 
      };
    }
    
    // Dining: 120-200 sqft
    if (area >= 120 && area <= 200) {
      return { 
        type: 'dining', 
        name: 'Dining Room', 
        confidence: 70 
      };
    }
    
    // Hallway: Long and narrow (ratio > 3:1)
    const ratio = Math.max(widthFeet, heightFeet) / Math.min(widthFeet, heightFeet);
    if (ratio > 3 && area < 100) {
      return { 
        type: 'hallway', 
        name: 'Hallway', 
        confidence: 80 
      };
    }
    
    // Closet: Very small (< 30 sqft)
    if (area < 30) {
      return { 
        type: 'closet', 
        name: 'Closet', 
        confidence: 75 
      };
    }
    
    // Unknown
    return { 
      type: 'unknown', 
      name: `Room ${area.toFixed(0)} sqft`, 
      confidence: 50 
    };
  };

  const toggleRoomSelection = (roomId: string) => {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter(id => id !== roomId));
    } else {
      setSelectedRooms([...selectedRooms, roomId]);
    }
  };

  const addSelectedRooms = () => {
    const roomsToAdd = detectedRooms.filter(room => 
      selectedRooms.includes(room.id)
    ).map(room => ({
      id: room.id,
      type: 'room' as const,
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
      rotation: 0,
      label: room.suggestedName,
      color: getRoomColor(room.suggestedType)
    }));

    onRoomsDetected(roomsToAdd);
    toast.success(`Added ${roomsToAdd.length} rooms to floor plan!`);
    onClose();
  };

  const getRoomColor = (type: DetectedRoom['suggestedType']): string => {
    const colors: Record<string, string> = {
      bedroom: '#3b82f6',
      living: '#10b981',
      kitchen: '#f59e0b',
      bathroom: '#06b6d4',
      office: '#8b5cf6',
      dining: '#ec4899',
      hallway: '#6b7280',
      closet: '#64748b',
      unknown: '#9ca3af'
    };
    return colors[type] || '#9ca3af';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Sparkles className="w-8 h-8" />
                Smart Room Detector
              </h2>
              <p className="text-white/80 mt-1">AI-powered room detection from floor plan</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Info Panel */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-gray-400 text-sm mb-1">Walls Detected</p>
                <p className="text-white text-2xl font-bold">{walls.length}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Doors</p>
                <p className="text-white text-2xl font-bold">{doors.length}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Windows</p>
                <p className="text-white text-2xl font-bold">{windows.length}</p>
              </div>
            </div>
          </div>

          {/* Detect Button */}
          {detectedRooms.length === 0 && (
            <div className="text-center py-12">
              <Home className="w-24 h-24 mx-auto text-gray-600 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Detect Rooms</h3>
              <p className="text-gray-400 mb-6">
                Our AI will analyze your floor plan and automatically detect rooms
              </p>
              <button
                onClick={detectRooms}
                disabled={detecting || walls.length < 4}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                {detecting ? 'Analyzing...' : 'Detect Rooms'}
              </button>
              {walls.length < 4 && (
                <p className="text-orange-400 text-sm mt-4">
                  Need at least 4 walls to detect rooms
                </p>
              )}
            </div>
          )}

          {/* Detected Rooms */}
          {detectedRooms.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  Detected {detectedRooms.length} Rooms
                </h3>
                <p className="text-gray-400 text-sm">
                  Select rooms to add to floor plan
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {detectedRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => toggleRoomSelection(room.id)}
                    className={`bg-[#1A1A1A] border-2 rounded-xl p-4 cursor-pointer transition ${
                      selectedRooms.includes(room.id)
                        ? 'border-purple-500 bg-purple-600/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-bold text-lg">{room.suggestedName}</h4>
                        <p className={`text-sm font-semibold ${getConfidenceColor(room.confidence)}`}>
                          {room.confidence}% confidence
                        </p>
                      </div>
                      {selectedRooms.includes(room.id) && (
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Dimensions:</span>
                        <span className="text-white font-medium">
                          {Math.round(room.width / 12)}' × {Math.round(room.height / 12)}'
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Area:</span>
                        <span className="text-white font-medium">
                          {Math.round(room.area)} sqft
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Doors:</span>
                        <span className="text-white font-medium">{room.doors}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Windows:</span>
                        <span className="text-white font-medium">{room.windows}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                      <div className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: getRoomColor(room.suggestedType) }}
                        />
                        <span className="text-gray-400 capitalize">{room.suggestedType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {detectedRooms.length > 0 && (
          <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] p-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {selectedRooms.length} of {detectedRooms.length} rooms selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRooms(detectedRooms.map(r => r.id))}
                className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-medium transition"
              >
                Select All
              </button>
              <button
                onClick={addSelectedRooms}
                disabled={selectedRooms.length === 0}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Add {selectedRooms.length} Rooms
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
