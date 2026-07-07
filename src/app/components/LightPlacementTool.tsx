// Interactive Light Placement Tool - Custom Lighting System
import { useState } from 'react';
import { Lightbulb, Sun, Zap, Trash2, Settings2, Plus } from 'lucide-react';

interface Light {
  id: string;
  type: 'point' | 'spot' | 'area' | 'directional';
  name: string;
  position: { x: number; y: number; z: number };
  color: string;
  intensity: number;
  radius?: number;
  angle?: number;
  enabled: boolean;
}

interface LightPlacementToolProps {
  onAddLight: (light: Light) => void;
  onUpdateLight: (id: string, light: Partial<Light>) => void;
  onDeleteLight: (id: string) => void;
  lights: Light[];
  canvasWidth: number;
  canvasHeight: number;
}

export default function LightPlacementTool({
  onAddLight,
  onUpdateLight,
  onDeleteLight,
  lights,
  canvasWidth,
  canvasHeight
}: LightPlacementToolProps) {
  const [selectedLight, setSelectedLight] = useState<Light | null>(null);
  const [placementMode, setPlacementMode] = useState<Light['type'] | null>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placementMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newLight: Light = {
      id: `light-${Date.now()}`,
      type: placementMode,
      name: `${placementMode.charAt(0).toUpperCase() + placementMode.slice(1)} Light ${lights.length + 1}`,
      position: { x, y, z: 200 },
      color: '#FFFFFF',
      intensity: 1.0,
      radius: placementMode === 'point' ? 100 : undefined,
      angle: placementMode === 'spot' ? 45 : undefined,
      enabled: true
    };

    onAddLight(newLight);
    setPlacementMode(null);
  };

  const lightTypeIcons = {
    point: Lightbulb,
    spot: Zap,
    area: Settings2,
    directional: Sun
  };

  return (
    <div className="space-y-4">
      {/* Light Type Selection */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Add Light</h3>
        <div className="grid grid-cols-4 gap-2">
          {(['point', 'spot', 'area', 'directional'] as const).map((type) => {
            const Icon = lightTypeIcons[type];
            return (
              <button
                key={type}
                onClick={() => setPlacementMode(placementMode === type ? null : type)}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  placementMode === type
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <Icon className={`w-5 h-5 ${placementMode === type ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                <span className="text-xs text-white capitalize">{type}</span>
              </button>
            );
          })}
        </div>
        {placementMode && (
          <p className="text-xs text-[#ea580c] mt-2">
            Click on the canvas below to place {placementMode} light
          </p>
        )}
      </div>

      {/* Light Preview Canvas */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Light Placement</h3>
        <div
          onClick={handleCanvasClick}
          className={`relative bg-[#0A0A0A] border-2 rounded-lg overflow-hidden ${
            placementMode ? 'border-[#ea580c] cursor-crosshair' : 'border-[#2A2A2A]'
          }`}
          style={{ height: '200px' }}
        >
          {/* Grid Background */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#3A3A3A" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Placed Lights */}
          {lights.map((light) => {
            const Icon = lightTypeIcons[light.type];
            const scale = 200 / canvasHeight;
            const displayX = light.position.x * scale;
            const displayY = light.position.y * scale;

            return (
              <div
                key={light.id}
                className={`absolute cursor-pointer group ${
                  selectedLight?.id === light.id ? 'z-10' : 'z-0'
                }`}
                style={{
                  left: `${displayX}px`,
                  top: `${displayY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLight(light);
                }}
              >
                {/* Light Glow Effect */}
                {light.enabled && (
                  <div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                      width: `${light.radius ? (light.radius * scale) / 2 : 30}px`,
                      height: `${light.radius ? (light.radius * scale) / 2 : 30}px`,
                      backgroundColor: light.color,
                      opacity: light.intensity * 0.5,
                      transform: 'translate(-50%, -50%)',
                      left: '50%',
                      top: '50%'
                    }}
                  />
                )}
                
                {/* Light Icon */}
                <div
                  className={`relative p-2 rounded-full transition-all ${
                    selectedLight?.id === light.id
                      ? 'bg-[#ea580c] scale-125'
                      : 'bg-[#2A2A2A] group-hover:bg-[#3A3A3A]'
                  }`}
                  style={{ borderColor: light.color, borderWidth: '2px' }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Light List */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Lights ({lights.length})</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {lights.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              No lights added. Select a light type above and click on the canvas.
            </p>
          ) : (
            lights.map((light) => {
              const Icon = lightTypeIcons[light.type];
              return (
                <div
                  key={light.id}
                  onClick={() => setSelectedLight(light)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedLight?.id === light.id
                      ? 'border-[#ea580c] bg-[#ea580c]/10'
                      : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{light.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {light.type} • Intensity: {(light.intensity * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateLight(light.id, { enabled: !light.enabled });
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          light.enabled
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}
                      >
                        <Lightbulb className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLight(light.id);
                          if (selectedLight?.id === light.id) {
                            setSelectedLight(null);
                          }
                        }}
                        className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Light Properties */}
      {selectedLight && (
        <div className="p-4 bg-[#2A2A2A] rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-white mb-2">Light Properties</h3>
          
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={selectedLight.name}
              onChange={(e) => onUpdateLight(selectedLight.id, { name: e.target.value })}
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg text-white text-sm"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={selectedLight.color}
                onChange={(e) => onUpdateLight(selectedLight.id, { color: e.target.value })}
                className="w-12 h-10 bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={selectedLight.color}
                onChange={(e) => onUpdateLight(selectedLight.id, { color: e.target.value })}
                className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg text-white text-sm font-mono"
              />
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Intensity: {(selectedLight.intensity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={selectedLight.intensity}
              onChange={(e) => onUpdateLight(selectedLight.id, { intensity: Number(e.target.value) })}
              className="w-full accent-[#ea580c]"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Position</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={Math.round(selectedLight.position.x)}
                onChange={(e) => onUpdateLight(selectedLight.id, {
                  position: { ...selectedLight.position, x: Number(e.target.value) }
                })}
                className="px-2 py-1.5 bg-[#1A1A1A] border border-[#3A3A3A] rounded text-white text-xs"
                placeholder="X"
              />
              <input
                type="number"
                value={Math.round(selectedLight.position.y)}
                onChange={(e) => onUpdateLight(selectedLight.id, {
                  position: { ...selectedLight.position, y: Number(e.target.value) }
                })}
                className="px-2 py-1.5 bg-[#1A1A1A] border border-[#3A3A3A] rounded text-white text-xs"
                placeholder="Y"
              />
              <input
                type="number"
                value={Math.round(selectedLight.position.z)}
                onChange={(e) => onUpdateLight(selectedLight.id, {
                  position: { ...selectedLight.position, z: Number(e.target.value) }
                })}
                className="px-2 py-1.5 bg-[#1A1A1A] border border-[#3A3A3A] rounded text-white text-xs"
                placeholder="Z"
              />
            </div>
          </div>

          {/* Type-specific properties */}
          {selectedLight.type === 'point' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Radius: {selectedLight.radius || 100}px
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={selectedLight.radius || 100}
                onChange={(e) => onUpdateLight(selectedLight.id, { radius: Number(e.target.value) })}
                className="w-full accent-[#ea580c]"
              />
            </div>
          )}

          {selectedLight.type === 'spot' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Cone Angle: {selectedLight.angle || 45}°
              </label>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={selectedLight.angle || 45}
                onChange={(e) => onUpdateLight(selectedLight.id, { angle: Number(e.target.value) })}
                className="w-full accent-[#ea580c]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
