/**
 * Asset Library Section Component
 * Handles: Media Assets, Categories, Upload Management
 * MAX SIZE: 200 lines | Modular Architecture
 */

import { useRef, useState } from 'react';
import { Upload, Folder, Image, Eye, Copy, LayoutGrid, Camera, Users, Sparkles, Video, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImageFile } from '../../utils/imageStorage';
import type { AssetLibrarySettings } from './types';

interface AssetLibraryProps {
  settings: AssetLibrarySettings;
  onUpdate: (updates: Partial<AssetLibrarySettings>) => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function AssetLibrary({ settings, onUpdate, selectedCategory, onCategoryChange }: AssetLibraryProps) {
  const selectedCat = settings.categories.find((c) => c.id === selectedCategory);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Put a file in the library, for real.
   *
   * "Upload Asset" was `toast.info('Upload asset to ' + selectedCat.name)` —
   * no picker, no request — directly above an empty state reading 'Click
   * "Upload Asset" to add your first file'. The screen gave an instruction
   * that could not be followed, and following it looked like it had worked.
   *
   * `uploadImageFile` is the helper the rest of the app uses and it sends the
   * signed-in staff token. The asset model already carries `url`,
   * `uploadedAt` and `usageCount`, so nothing had to be invented to store the
   * result.
   */
  const uploadAsset = async (file: File | undefined) => {
    if (!file || !selectedCat) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file, `branding/${selectedCat.id}`);
      const asset = {
        id: `asset_${Date.now().toString(36)}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        url,
        categoryId: selectedCat.id,
        usageCount: 0,
        uploadedAt: new Date().toISOString(),
      };
      onUpdate({
        categories: settings.categories.map((category) =>
          category.id === selectedCat.id
            ? { ...category, assets: [...category.assets, asset] }
            : category),
      });
      toast.success(`${asset.name} added to ${selectedCat.name}.`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not upload that file.');
    } finally {
      setUploading(false);
      // So picking the same file twice in a row still fires a change event.
      if (fileInput.current) fileInput.current.value = '';
    }
  };

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void uploadAsset(event.target.files?.[0])}
              />
              <button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg transition text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload Asset'}
              </button>
            </>
          </div>

          {selectedCat.assets.length === 0 ? (
            <div className="py-12 text-center">
              <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No assets in this category yet</p>
              <p className="text-sm text-gray-500">Click "Upload Asset" to add your first file</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                      /* Said "Preview <name>" and showed nothing. There is no
                         lightbox on this screen, and the asset's own URL is the
                         preview — opened in a tab, which works on a phone too.
                         An asset with no file behind it says so rather than
                         opening a blank tab. */
                      onClick={() => {
                        if (!asset.url) {
                          toast.error('That asset has no file behind it yet.');
                          return;
                        }
                        window.open(asset.url, '_blank', 'noopener,noreferrer');
                      }}
                      title={asset.url ? `Open ${asset.name}` : 'No file uploaded yet'}
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
