/**
 * Asset Library Section Component
 * Handles: Media Assets, Categories, Upload Management
 * MAX SIZE: 200 lines | Modular Architecture
 */

import { Upload, Folder, Image, Eye, Copy, LayoutGrid, Camera, Users, Sparkles, Video, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { AssetLibrarySettings } from './types';

interface AssetLibraryProps {
  settings: AssetLibrarySettings;
  onUpdate: (updates: Partial<AssetLibrarySettings>) => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function AssetLibrary({ settings, onUpdate, selectedCategory, onCategoryChange }: AssetLibraryProps) {
  const selectedCat = settings.categories.find((c) => c.id === selectedCategory);

  // Icon mapping for categories
  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      LayoutGrid,
      Camera,
      Users,
      Sparkles,
      Video,
      FileText,
      Folder
    };
    return icons[iconName] || Folder;
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
        <div className="grid grid-cols-3 gap-3">
          {settings.categories.map((category) => {
            const IconComponent = getIconComponent(category.icon);

            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`p-4 rounded-xl border-2 transition ${
                  selectedCategory === category.id
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
                }`}
              >
                <IconComponent className="w-6 h-6 text-[#ea580c] mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">{category.name}</p>
                <p className="text-xs text-gray-400 mt-1">{category.assets.length} assets</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Grid */}
      {selectedCat && (
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-white">{selectedCat.name}</h4>
              <p className="text-sm text-gray-400">{selectedCat.description}</p>
            </div>
            <button
              onClick={() => toast.info('Upload asset to ' + selectedCat.name)}
              className="px-4 py-2 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg transition text-sm font-semibold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Asset
            </button>
          </div>

          {selectedCat.assets.length === 0 ? (
            <div className="py-12 text-center">
              <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No assets in this category yet</p>
              <p className="text-sm text-gray-500">Click "Upload Asset" to add your first file</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {selectedCat.assets.map((asset) => (
                <div key={asset.id} className="group relative p-3 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] hover:border-[#ea580c]/50 transition">
                  <div className="aspect-square rounded-lg bg-[#1A1A1A] mb-2 flex items-center justify-center">
                    {asset.url ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Image className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{asset.name}</p>
                  <p className="text-xs text-gray-400">Used {asset.usageCount}x</p>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <button 
                      onClick={() => toast.info(`Preview ${asset.name}`)}
                      className="p-1.5 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg transition"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(asset.url || '');
                        toast.success('Asset URL copied');
                      }}
                      className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg transition"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
