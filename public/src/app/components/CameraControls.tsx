// Advanced Camera Controls - Multiple View Angles & Presets
import { useState } from 'react';
import { Camera, Eye, Box, Maximize2, RotateCw, Move } from 'lucide-react';

export interface CameraSettings {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number; // Field of view in degrees
  near: number;
  far: number;
  up: { x: number; y: number; z: number };
}

export interface CameraPreset {
  id: string;
  name: string;
  description: string;
  settings: CameraSettings;
  icon: any;
}

interface CameraControlsProps {
  onApplyPreset: (preset: CameraPreset) => void;
  onUpdateSettings: (settings: Partial<CameraSettings>) => void;
  currentSettings: CameraSettings;
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'top',
    name: 'Top View',
    description: '2D floor plan view from above',
    icon: Maximize2,
    settings: {
      position: { x: 0, y: -1000, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      fov: 50,
      near: 0.1,
      far: 2000,
      up: { x: 0, y: 0, z: 1 }
    }
  },
  {
    id: 'perspective',
    name: 'Perspective',
    description: '3D perspective view',
    icon: Box,
    settings: {
      position: { x: 500, y: -500, z: 400 },
      target: { x: 0, y: 0, z: 0 },
      fov: 60,
      near: 0.1,
      far: 2000,
      up: { x: 0, y: 0, z: 1 }
    }
  },
  {
    id: 'front',
    name: 'Front View',
    description: 'Orthographic front elevation',
    icon: Eye,
    settings: {
      position: { x: 0, y: -800, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      fov: 45,
      near: 0.1,
      far: 2000,
      up: { x: 0, y: 0, z: 1 }
    }
  },
  {
    id: 'side-left',
    name: 'Left Side',
    description: 'Orthographic left elevation',
    icon: RotateCw,
    settings: {
      position: { x: -800, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      fov: 45,
      near: 0.1,
      far: 2000,
      up: { x: 0, y: 0, z: 1 }
    }
  },
  {
    id: 'side-right',
    name: 'Right Side',
    description: 'Orthographic right elevation',
    icon: RotateCw,
    settings: {
      position: { x: 800, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      fov: 45,
      near: 0.1,
      far: 2000,
      up: { x: 0, y: 0, z: 1 }
    }
  },
  {
    id: 'isometric',
    name: 'Isometric',
    description: '45° isometric projection',
    icon: Box,
    settings: {
      position: { x: 600, y: -600, z: 600 },
      target: { x: 0, y: 0, z: 0 },
      fov: 35,
      near: 0.1,
      far: 2000,
      up: { x: 0, y: 0, z: 1 }
    }
  }
];

export default function CameraControls({
  onApplyPreset,
  onUpdateSettings,
  currentSettings
}: CameraControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('perspective');
  const [customMode, setCustomMode] = useState(false);

  const handlePresetClick = (preset: CameraPreset) => {
    setSelectedPreset(preset.id);
    setCustomMode(false);
    onApplyPreset(preset);
  };

  return (
    <div className="space-y-6">
      {/* Camera Presets */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Camera Presets</h3>
        <div className="grid grid-cols-3 gap-3">
          {CAMERA_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPreset === preset.id && !customMode
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  selectedPreset === preset.id && !customMode ? 'text-[#ea580c]' : 'text-gray-400'
                }`} />
                <p className="text-sm font-medium text-white mb-1">{preset.name}</p>
                <p className="text-xs text-gray-500">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Field of View */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Camera Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Field of View: {currentSettings.fov}°
            </label>
            <input
              type="range"
              min="20"
              max="120"
              step="1"
              value={currentSettings.fov}
              onChange={(e) => {
                setCustomMode(true);
                onUpdateSettings({ fov: Number(e.target.value) });
              }}
              className="w-full accent-[#ea580c]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Narrow (20°)</span>
              <span>Normal (60°)</span>
              <span>Wide (120°)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Position */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Position</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">X Position</label>
            <input
              type="number"
              value={Math.round(currentSettings.position.x)}
              onChange={(e) => {
                setCustomMode(true);
                onUpdateSettings({
                  position: { ...currentSettings.position, x: Number(e.target.value) }
                });
              }}
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Y Position</label>
            <input
              type="number"
              value={Math.round(currentSettings.position.y)}
              onChange={(e) => {
                setCustomMode(true);
                onUpdateSettings({
                  position: { ...currentSettings.position, y: Number(e.target.value) }
                });
              }}
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Z Position</label>
            <input
              type="number"
              value={Math.round(currentSettings.position.z)}
              onChange={(e) => {
                setCustomMode(true);
                onUpdateSettings({
                  position: { ...currentSettings.position, z: Number(e.target.value) }
                });
              }}
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Camera Target */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Look At Target</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">X Target</label>
            <input
              type="number"
              value={Math.round(currentSettings.target.x)}
              onChange={(e) => {
                setCustomMode(true);
                onUpdateSettings({
                  target: { ...currentSettings.target, x: Number(e.target.value) }
                });
              }}
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Y Target</label>
            <input
              type="number"
              value={Math.round(currentSettings.target.y)}
              onChange={(e) => {
                setCustomMode(true);
                onUpdateSettings({
                  target: { ...currentSettings.target, y: Number(e.target.value) }
                });
              }}
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Z Target</label>
            <input
              type="number"
              value={Math.round(currentSettings.target.z)}
              onChange={(e) => {
                setCustomMode(true);
                onUpdateSettings({
                  target: { ...currentSettings.target, z: Number(e.target.value) }
                });
              }}
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              const centerPreset = CAMERA_PRESETS.find(p => p.id === 'perspective');
              if (centerPreset) handlePresetClick(centerPreset);
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            <Move className="w-4 h-4" />
            Center View
          </button>
          <button
            onClick={() => {
              onUpdateSettings({ fov: 60 });
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            <Camera className="w-4 h-4" />
            Reset FOV
          </button>
        </div>
      </div>

      {/* Custom Mode Indicator */}
      {customMode && (
        <div className="p-3 bg-[#ea580c]/10 border border-[#ea580c] rounded-lg">
          <p className="text-sm text-[#ea580c] font-medium">
            📷 Custom Camera Mode
          </p>
          <p className="text-xs text-gray-400 mt-1">
            You've modified the camera settings. Select a preset to restore defaults.
          </p>
        </div>
      )}

      {/* Camera Info */}
      <div className="p-4 bg-[#2A2A2A] rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-2">Current Camera</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Position:</span>
            <span className="text-white ml-2">
              ({Math.round(currentSettings.position.x)}, {Math.round(currentSettings.position.y)}, {Math.round(currentSettings.position.z)})
            </span>
          </div>
          <div>
            <span className="text-gray-400">Target:</span>
            <span className="text-white ml-2">
              ({Math.round(currentSettings.target.x)}, {Math.round(currentSettings.target.y)}, {Math.round(currentSettings.target.z)})
            </span>
          </div>
          <div>
            <span className="text-gray-400">FOV:</span>
            <span className="text-white ml-2">{currentSettings.fov}°</span>
          </div>
          <div>
            <span className="text-gray-400">Mode:</span>
            <span className="text-white ml-2">{customMode ? 'Custom' : selectedPreset}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
