/**
 * Advanced Rendering Panel Component
 * Provides professional rendering settings for floor plans
 */

import { useState } from 'react';
import { X, Settings, Palette, Sun, Lightbulb, Camera, Save, FolderOpen } from 'lucide-react';
import RenderPresetManager from './RenderPresetManager';

export interface RenderSettings {
  quality: 'draft' | 'preview' | 'high' | 'ultra';
  resolution: { width: number; height: number };
  samples: number;
  bounces: number;
  denoise: boolean;
  antialiasing: boolean;
  ambientOcclusion: boolean;
  globalIllumination: boolean;
  shadows: boolean;
  reflections: boolean;
  background: {
    type: 'solid' | 'gradient' | 'hdri';
    color: string;
    color2?: string;
    hdriUrl?: string;
  };
  camera: {
    type: 'orthographic' | 'perspective';
    fov: number;
    angle: number;
  };
  lighting: {
    type: 'natural' | 'studio' | 'custom';
    intensity: number;
    temperature: number;
  };
}

export interface Material {
  id: string;
  name: string;
  type: 'paint' | 'wood' | 'tile' | 'carpet' | 'concrete' | 'metal' | 'glass';
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  textureUrl?: string;
}

interface RenderingPanelProps {
  onClose: () => void;
  onRender: (settings: RenderSettings) => void;
  onApplyMaterial?: (elementId: string, material: Material) => void;
  initialSettings?: Partial<RenderSettings>;
}

const defaultSettings: RenderSettings = {
  quality: 'preview',
  resolution: { width: 1920, height: 1080 },
  samples: 128,
  bounces: 4,
  denoise: true,
  antialiasing: true,
  ambientOcclusion: true,
  globalIllumination: false,
  shadows: true,
  reflections: false,
  background: {
    type: 'solid',
    color: '#ffffff',
  },
  camera: {
    type: 'orthographic',
    fov: 60,
    angle: 45,
  },
  lighting: {
    type: 'natural',
    intensity: 1.0,
    temperature: 6500,
  },
};

const qualityPresets = {
  draft: { samples: 32, bounces: 2, resolution: { width: 1280, height: 720 } },
  preview: { samples: 128, bounces: 4, resolution: { width: 1920, height: 1080 } },
  high: { samples: 512, bounces: 8, resolution: { width: 2560, height: 1440 } },
  ultra: { samples: 2048, bounces: 16, resolution: { width: 3840, height: 2160 } },
};

export default function RenderingPanel({ 
  onClose, 
  onRender, 
  onApplyMaterial,
  initialSettings 
}: RenderingPanelProps) {
  const [settings, setSettings] = useState<RenderSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const [activeTab, setActiveTab] = useState<'quality' | 'lighting' | 'materials' | 'camera'>('quality');
  const [showPresetManager, setShowPresetManager] = useState(false);

  const updateSettings = (updates: Partial<RenderSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const handleQualityChange = (quality: RenderSettings['quality']) => {
    const preset = qualityPresets[quality];
    updateSettings({
      quality,
      ...preset,
    });
  };

  const materials: Material[] = [
    { id: '1', name: 'White Paint', type: 'paint', color: '#ffffff', roughness: 0.8, metalness: 0, opacity: 1 },
    { id: '2', name: 'Gray Paint', type: 'paint', color: '#808080', roughness: 0.8, metalness: 0, opacity: 1 },
    { id: '3', name: 'Oak Wood', type: 'wood', color: '#daa06d', roughness: 0.6, metalness: 0, opacity: 1 },
    { id: '4', name: 'Walnut Wood', type: 'wood', color: '#654321', roughness: 0.6, metalness: 0, opacity: 1 },
    { id: '5', name: 'Ceramic Tile', type: 'tile', color: '#f0f0f0', roughness: 0.2, metalness: 0, opacity: 1 },
    { id: '6', name: 'Gray Carpet', type: 'carpet', color: '#a0a0a0', roughness: 0.9, metalness: 0, opacity: 1 },
    { id: '7', name: 'Concrete', type: 'concrete', color: '#b0b0b0', roughness: 0.7, metalness: 0, opacity: 1 },
    { id: '8', name: 'Glass', type: 'glass', color: '#e0f0ff', roughness: 0.1, metalness: 0, opacity: 0.3 },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#ea580c]" />
            <h2 className="text-xl font-bold text-white">Advanced Rendering Settings</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresetManager(true)}
              className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
              title="Manage Presets"
            >
              <FolderOpen className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a1a1a]">
          {[
            { id: 'quality', label: 'Quality', icon: Settings },
            { id: 'lighting', label: 'Lighting', icon: Sun },
            { id: 'materials', label: 'Materials', icon: Palette },
            { id: 'camera', label: 'Camera', icon: Camera },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1a1a1a] text-[#ea580c] border-b-2 border-[#ea580c]'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quality Tab */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Quality Preset</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['draft', 'preview', 'high', 'ultra'] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => handleQualityChange(quality)}
                      className={`p-4 rounded-lg border transition-all text-left ${
                        settings.quality === quality
                          ? 'bg-[#ea580c]/20 border-[#ea580c] text-white'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-[#ea580c]/50'
                      }`}
                    >
                      <div className="font-medium text-white capitalize">{quality}</div>
                      <div className="text-xs mt-1">
                        {qualityPresets[quality].samples} samples • {qualityPresets[quality].resolution.width}x{qualityPresets[quality].resolution.height}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-400 mb-2">
                    <span>Samples</span>
                    <span className="text-white">{settings.samples}</span>
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="4096"
                    step="16"
                    value={settings.samples}
                    onChange={(e) => updateSettings({ samples: parseInt(e.target.value) })}
                    className="w-full accent-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-400 mb-2">
                    <span>Light Bounces</span>
                    <span className="text-white">{settings.bounces}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="32"
                    value={settings.bounces}
                    onChange={(e) => updateSettings({ bounces: parseInt(e.target.value) })}
                    className="w-full accent-[#ea580c]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-400">Render Features</label>
                {[
                  { key: 'denoise', label: 'Denoise' },
                  { key: 'antialiasing', label: 'Anti-aliasing' },
                  { key: 'ambientOcclusion', label: 'Ambient Occlusion' },
                  { key: 'globalIllumination', label: 'Global Illumination' },
                  { key: 'shadows', label: 'Shadows' },
                  { key: 'reflections', label: 'Reflections' },
                ].map((feature) => (
                  <label key={feature.key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[feature.key as keyof RenderSettings] as boolean}
                      onChange={(e) => updateSettings({ [feature.key]: e.target.checked })}
                      className="w-4 h-4 accent-[#ea580c]"
                    />
                    <span className="text-white">{feature.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Lighting Tab */}
          {activeTab === 'lighting' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Lighting Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['natural', 'studio', 'custom'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => updateSettings({ lighting: { ...settings.lighting, type } })}
                      className={`p-4 rounded-lg border transition-all ${
                        settings.lighting.type === type
                          ? 'bg-[#ea580c]/20 border-[#ea580c] text-white'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-[#ea580c]/50'
                      }`}
                    >
                      <Sun className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium capitalize">{type}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-400 mb-2">
                  <span>Intensity</span>
                  <span className="text-white">{settings.lighting.intensity.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={settings.lighting.intensity}
                  onChange={(e) => updateSettings({ 
                    lighting: { ...settings.lighting, intensity: parseFloat(e.target.value) }
                  })}
                  className="w-full accent-[#ea580c]"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-400 mb-2">
                  <span>Color Temperature</span>
                  <span className="text-white">{settings.lighting.temperature}K</span>
                </label>
                <input
                  type="range"
                  min="2000"
                  max="10000"
                  step="100"
                  value={settings.lighting.temperature}
                  onChange={(e) => updateSettings({ 
                    lighting: { ...settings.lighting, temperature: parseInt(e.target.value) }
                  })}
                  className="w-full accent-[#ea580c]"
                />
              </div>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Select a material to apply it to elements in your floor plan
              </p>
              <div className="grid grid-cols-2 gap-3">
                {materials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => onApplyMaterial && onApplyMaterial('', material)}
                    className="p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:border-[#ea580c] transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded border border-[#2a2a2a]"
                        style={{ backgroundColor: material.color }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">{material.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{material.type}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Roughness: {material.roughness} • Metalness: {material.metalness}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Camera Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['orthographic', 'perspective'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => updateSettings({ camera: { ...settings.camera, type } })}
                      className={`p-4 rounded-lg border transition-all ${
                        settings.camera.type === type
                          ? 'bg-[#ea580c]/20 border-[#ea580c] text-white'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-[#ea580c]/50'
                      }`}
                    >
                      <Camera className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium capitalize">{type}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-400 mb-2">
                  <span>Field of View</span>
                  <span className="text-white">{settings.camera.fov}°</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={settings.camera.fov}
                  onChange={(e) => updateSettings({ 
                    camera: { ...settings.camera, fov: parseInt(e.target.value) }
                  })}
                  className="w-full accent-[#ea580c]"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-400 mb-2">
                  <span>Camera Angle</span>
                  <span className="text-white">{settings.camera.angle}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={settings.camera.angle}
                  onChange={(e) => updateSettings({ 
                    camera: { ...settings.camera, angle: parseInt(e.target.value) }
                  })}
                  className="w-full accent-[#ea580c]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1a1a1a] flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Estimated render time: {Math.ceil(settings.samples / 128 * 2)} minutes
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onRender(settings)}
              className="px-6 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white rounded-lg transition font-medium"
            >
              Start Rendering
            </button>
          </div>
        </div>
      </div>

      {/* Preset Manager Modal */}
      {showPresetManager && (
        <RenderPresetManager
          currentSettings={settings}
          onLoadPreset={(settings) => {
            setSettings(settings);
            setShowPresetManager(false);
          }}
          onClose={() => setShowPresetManager(false)}
        />
      )}
    </div>
  );
}
