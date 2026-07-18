// Render Preset Manager - Save & Load Rendering Configurations
import { useState } from 'react';
import { Save, FolderOpen, Trash2, Star, StarOff, Copy, Download, Upload } from 'lucide-react';
import type { RenderSettings } from './RenderingPanel';

export interface RenderPreset {
  id: string;
  name: string;
  description: string;
  settings: RenderSettings;
  createdAt: number;
  isFavorite: boolean;
  thumbnail?: string;
}

interface RenderPresetManagerProps {
  onLoadPreset: (preset: RenderPreset) => void;
  currentSettings: RenderSettings;
}

const DEFAULT_PRESETS: RenderPreset[] = [
  {
    id: 'preset-daytime-interior',
    name: 'Daytime Interior',
    description: 'Bright natural lighting for interior spaces',
    isFavorite: true,
    createdAt: Date.now(),
    settings: {
      quality: 'good',
      resolution: { width: 1920, height: 1080 },
      samples: 128,
      enableShadows: true,
      enableReflections: true,
      enableAmbientOcclusion: true,
      timeOfDay: 'noon',
      sunIntensity: 1.2,
      sunAngle: 60,
      environmentLighting: true,
      hdriEnvironment: 'studio',
      artificialLights: [],
      postProcessing: {
        bloom: false,
        vignette: false,
        colorGrading: true,
        exposure: 1.1,
        contrast: 1.0,
        saturation: 1.1
      }
    }
  },
  {
    id: 'preset-sunset-showcase',
    name: 'Sunset Showcase',
    description: 'Warm golden hour lighting for presentations',
    isFavorite: true,
    createdAt: Date.now(),
    settings: {
      quality: 'best',
      resolution: { width: 2560, height: 1440 },
      samples: 256,
      enableShadows: true,
      enableReflections: true,
      enableAmbientOcclusion: true,
      timeOfDay: 'sunset',
      sunIntensity: 1.5,
      sunAngle: 30,
      environmentLighting: true,
      hdriEnvironment: 'outdoor-sunset',
      artificialLights: [],
      postProcessing: {
        bloom: true,
        vignette: true,
        colorGrading: true,
        exposure: 1.2,
        contrast: 1.1,
        saturation: 1.3
      }
    }
  },
  {
    id: 'preset-night-ambient',
    name: 'Night Ambient',
    description: 'Atmospheric night lighting with artificial lights',
    isFavorite: false,
    createdAt: Date.now(),
    settings: {
      quality: 'good',
      resolution: { width: 1920, height: 1080 },
      samples: 128,
      enableShadows: true,
      enableReflections: true,
      enableAmbientOcclusion: true,
      timeOfDay: 'night',
      sunIntensity: 0.3,
      sunAngle: 45,
      environmentLighting: true,
      hdriEnvironment: 'indoor',
      artificialLights: [],
      postProcessing: {
        bloom: true,
        vignette: true,
        colorGrading: true,
        exposure: 0.9,
        contrast: 1.2,
        saturation: 0.9
      }
    }
  },
  {
    id: 'preset-quick-draft',
    name: 'Quick Draft',
    description: 'Fast preview render for testing',
    isFavorite: false,
    createdAt: Date.now(),
    settings: {
      quality: 'draft',
      resolution: { width: 1280, height: 720 },
      samples: 32,
      enableShadows: true,
      enableReflections: false,
      enableAmbientOcclusion: false,
      timeOfDay: 'noon',
      sunIntensity: 1.0,
      sunAngle: 45,
      environmentLighting: true,
      hdriEnvironment: 'studio',
      artificialLights: [],
      postProcessing: {
        bloom: false,
        vignette: false,
        colorGrading: false,
        exposure: 1.0,
        contrast: 1.0,
        saturation: 1.0
      }
    }
  },
  {
    id: 'preset-ultra-quality',
    name: 'Ultra Quality',
    description: 'Maximum quality for final presentations',
    isFavorite: true,
    createdAt: Date.now(),
    settings: {
      quality: 'ultra',
      resolution: { width: 3840, height: 2160 },
      samples: 512,
      enableShadows: true,
      enableReflections: true,
      enableAmbientOcclusion: true,
      timeOfDay: 'afternoon',
      sunIntensity: 1.3,
      sunAngle: 50,
      environmentLighting: true,
      hdriEnvironment: 'outdoor-day',
      artificialLights: [],
      postProcessing: {
        bloom: true,
        vignette: false,
        colorGrading: true,
        exposure: 1.1,
        contrast: 1.05,
        saturation: 1.15
      }
    }
  }
];

export default function RenderPresetManager({
  onLoadPreset,
  currentSettings
}: RenderPresetManagerProps) {
  const [presets, setPresets] = useState<RenderPreset[]>(DEFAULT_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<RenderPreset | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: RenderPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName,
      description: newPresetDescription,
      settings: currentSettings,
      createdAt: Date.now(),
      isFavorite: false
    };

    setPresets([newPreset, ...presets]);
    setNewPresetName('');
    setNewPresetDescription('');
    setShowSaveDialog(false);
  };

  const handleDeletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
    if (selectedPreset?.id === id) {
      setSelectedPreset(null);
    }
  };

  const handleToggleFavorite = (id: string) => {
    setPresets(presets.map(p =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const handleDuplicatePreset = (preset: RenderPreset) => {
    const duplicated: RenderPreset = {
      ...preset,
      id: `preset-${Date.now()}`,
      name: `${preset.name} (Copy)`,
      createdAt: Date.now()
    };
    setPresets([duplicated, ...presets]);
  };

  const handleExportPresets = () => {
    const dataStr = JSON.stringify(presets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `render-presets-${Date.now()}.json`;
    link.click();
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setPresets([...imported, ...presets]);
      } catch (error) {
        alert('Failed to import presets. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const favoritePresets = presets.filter(p => p.isFavorite);
  const otherPresets = presets.filter(p => !p.isFavorite);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Render Presets</h3>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportPresets}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportPresets}
            className="flex items-center gap-2 px-3 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            Save Current
          </button>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-[#2A2A2A] rounded-lg border-2 border-[#ea580c]">
          <h4 className="text-sm font-semibold text-white mb-3">Save Current Settings as Preset</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Preset Name</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g., Morning Render"
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Description (Optional)</label>
              <textarea
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Brief description of this preset..."
                className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#3A3A3A] rounded-lg text-white text-sm resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="flex-1 px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Save Preset
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPresetName('');
                  setNewPresetDescription('');
                }}
                className="px-4 py-2 bg-[#3A3A3A] text-white rounded-lg hover:bg-[#4A4A4A] transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorites */}
      {favoritePresets.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Favorites
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {favoritePresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isSelected={selectedPreset?.id === preset.id}
                onSelect={() => setSelectedPreset(preset)}
                onLoad={() => onLoadPreset(preset)}
                onDelete={() => handleDeletePreset(preset.id)}
                onToggleFavorite={() => handleToggleFavorite(preset.id)}
                onDuplicate={() => handleDuplicatePreset(preset)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Presets */}
      {otherPresets.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">All Presets</h4>
          <div className="grid grid-cols-2 gap-3">
            {otherPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isSelected={selectedPreset?.id === preset.id}
                onSelect={() => setSelectedPreset(preset)}
                onLoad={() => onLoadPreset(preset)}
                onDelete={() => handleDeletePreset(preset.id)}
                onToggleFavorite={() => handleToggleFavorite(preset.id)}
                onDuplicate={() => handleDuplicatePreset(preset)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Preset Details */}
      {selectedPreset && (
        <div className="p-4 bg-[#2A2A2A] rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-2">Preset Details</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Quality:</span>
              <span className="text-white ml-2 capitalize">{selectedPreset.settings.quality}</span>
            </div>
            <div>
              <span className="text-gray-400">Resolution:</span>
              <span className="text-white ml-2">
                {selectedPreset.settings.resolution.width}×{selectedPreset.settings.resolution.height}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Samples:</span>
              <span className="text-white ml-2">{selectedPreset.settings.samples}</span>
            </div>
            <div>
              <span className="text-gray-400">Time of Day:</span>
              <span className="text-white ml-2 capitalize">{selectedPreset.settings.timeOfDay}</span>
            </div>
            <div>
              <span className="text-gray-400">Shadows:</span>
              <span className="text-white ml-2">{selectedPreset.settings.enableShadows ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-400">Reflections:</span>
              <span className="text-white ml-2">{selectedPreset.settings.enableReflections ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PresetCard({
  preset,
  isSelected,
  onSelect,
  onLoad,
  onDelete,
  onToggleFavorite,
  onDuplicate
}: {
  preset: RenderPreset;
  isSelected: boolean;
  onSelect: () => void;
  onLoad: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-[#ea580c] bg-[#ea580c]/10'
          : 'border-[#2A2A2A] bg-[#2A2A2A] hover:border-[#3A3A3A]'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h5 className="text-sm font-semibold text-white">{preset.name}</h5>
          {preset.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{preset.description}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-1 hover:bg-[#3A3A3A] rounded transition-colors"
        >
          {preset.isFavorite ? (
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          ) : (
            <StarOff className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <span className="capitalize">{preset.settings.quality}</span>
        <span>•</span>
        <span>{preset.settings.samples} samples</span>
        <span>•</span>
        <span className="capitalize">{preset.settings.timeOfDay}</span>
      </div>

      <div className="flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLoad();
          }}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#ea580c] text-white rounded text-xs hover:bg-[#dc2626] transition-colors"
        >
          <FolderOpen className="w-3 h-3" />
          Load
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1.5 bg-[#3A3A3A] text-gray-300 rounded hover:bg-[#4A4A4A] transition-colors"
          title="Duplicate"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete preset "${preset.name}"?`)) {
              onDelete();
            }
          }}
          className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
