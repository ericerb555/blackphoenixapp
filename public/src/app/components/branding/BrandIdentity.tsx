/**
 * Brand Identity Section Component
 * Handles: Logos, Colors, Typography
 * MAX SIZE: 200 lines | Modular Architecture
 */

import { Sparkles, Image, Palette, Upload, Plus, Trash2, XCircle, Edit, Check, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { BrandingSettings } from './types';

interface BrandIdentityProps {
  settings: BrandingSettings;
  onUpdate: (updates: Partial<BrandingSettings>) => void;
}

export function BrandIdentity({ settings, onUpdate }: BrandIdentityProps) {
  return (
    <div className="space-y-6">
      {/* Company Information */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-4">
        <h4 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ea580c]" />
          Company Information
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => onUpdate({ companyName: e.target.value })}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Tagline (Optional)</label>
            <input
              type="text"
              value={settings.tagline || ''}
              onChange={(e) => onUpdate({ tagline: e.target.value })}
              placeholder="Your company tagline"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
            />
          </div>
        </div>
      </div>

      {/* Logo Library */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-[#ea580c]" />
            Logo Library
          </h4>
          <button
            onClick={() => {
              const newLogo = {
                id: Date.now().toString(),
                name: 'New Logo',
                description: '',
                isDefault: false
              };
              onUpdate({ logos: [...settings.logos, newLogo] });
              toast.success('New logo slot added');
            }}
            className="px-3 py-1.5 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg transition text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Logo
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {settings.logos.map((logo) => (
            <div key={logo.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-16 h-16 rounded-lg bg-[#1A1A1A] border-2 border-dashed border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                  {logo.url ? (
                    <img src={logo.url} alt={logo.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Image className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={logo.name}
                    onChange={(e) => {
                      const updatedLogos = settings.logos.map((l) => 
                        l.id === logo.id ? { ...l, name: e.target.value } : l
                      );
                      onUpdate({ logos: updatedLogos });
                    }}
                    placeholder="Logo name"
                    className="w-full px-2 py-1 mb-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-sm font-semibold text-white focus:outline-none focus:border-[#ea580c]/50"
                  />
                  <input
                    type="text"
                    value={logo.description || ''}
                    onChange={(e) => {
                      const updatedLogos = settings.logos.map((l) => 
                        l.id === logo.id ? { ...l, description: e.target.value } : l
                      );
                      onUpdate({ logos: updatedLogos });
                    }}
                    placeholder="Description (optional)"
                    className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-gray-400 focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => toast.info(`Upload ${logo.name}`)}
                  className="flex-1 px-3 py-2 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg transition text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
                {logo.url && (
                  <button 
                    onClick={() => {
                      const updatedLogos = settings.logos.map((l) => 
                        l.id === logo.id ? { ...l, url: undefined } : l
                      );
                      onUpdate({ logos: updatedLogos });
                      toast.success(`${logo.name} image removed`);
                    }}
                    className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 rounded-lg transition text-xs"
                    title="Remove image"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                )}
                {!logo.isDefault && (
                  <button 
                    onClick={() => {
                      const updatedLogos = settings.logos.filter((l) => l.id !== logo.id);
                      onUpdate({ logos: updatedLogos });
                      toast.success(`${logo.name} slot removed`);
                    }}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition text-xs"
                    title="Delete logo slot"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-xs text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> Upload multiple logo variants for different use cases. PNG or SVG, max 2MB each.
            </span>
          </p>
        </div>
      </div>

      {/* Color Palettes */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#ea580c]" />
            Color Palettes
          </h4>
          <button
            onClick={() => {
              const newPalette = {
                id: Date.now().toString(),
                name: 'New Palette',
                colors: [
                  { name: 'Color 1', hex: '#ea580c', usage: '' }
                ],
                isDefault: false
              };
              onUpdate({ 
                colorPalettes: [...settings.colorPalettes, newPalette] 
              });
              toast.success('New palette created');
            }}
            className="px-3 py-1.5 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg transition text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Palette
          </button>
        </div>

        <div className="space-y-4">
          {settings.colorPalettes.map((palette) => (
            <div key={palette.id} className="p-4 bg-[#0A0A0A] rounded-xl border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={palette.name}
                  onChange={(e) => {
                    const updated = settings.colorPalettes.map((p) =>
                      p.id === palette.id ? { ...p, name: e.target.value } : p
                    );
                    onUpdate({ colorPalettes: updated });
                  }}
                  className="px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-[#ea580c]/50"
                />
                {!palette.isDefault && (
                  <button
                    onClick={() => {
                      const updated = settings.colorPalettes.filter((p) => p.id !== palette.id);
                      onUpdate({ colorPalettes: updated });
                      toast.success('Palette deleted');
                    }}
                    className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {palette.colors.map((color, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color.hex}
                      onChange={(e) => {
                        const updated = settings.colorPalettes.map((p) =>
                          p.id === palette.id ? {
                            ...p,
                            colors: p.colors.map((c, i) =>
                              i === idx ? { ...c, hex: e.target.value } : c
                            )
                          } : p
                        );
                        onUpdate({ colorPalettes: updated });
                      }}
                      className="w-10 h-10 rounded-lg border-2 border-[#2A2A2A] cursor-pointer"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={color.name}
                        onChange={(e) => {
                          const updated = settings.colorPalettes.map((p) =>
                            p.id === palette.id ? {
                              ...p,
                              colors: p.colors.map((c, i) =>
                                i === idx ? { ...c, name: e.target.value } : c
                              )
                            } : p
                          );
                          onUpdate({ colorPalettes: updated });
                        }}
                        placeholder="Color name"
                        className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-white focus:outline-none focus:border-[#ea580c]/50 mb-1"
                      />
                      <input
                        type="text"
                        value={color.hex}
                        readOnly
                        className="w-full px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-gray-400 font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  const updated = settings.colorPalettes.map((p) =>
                    p.id === palette.id ? {
                      ...p,
                      colors: [...p.colors, { name: 'New Color', hex: '#ea580c', usage: '' }]
                    } : p
                  );
                  onUpdate({ colorPalettes: updated });
                }}
                className="mt-3 w-full px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg transition text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Color to Palette
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Edit className="w-5 h-5 text-[#ea580c]" />
          Typography System
        </h4>

        <div className="space-y-3">
          {settings.typography.fontPairings.map((pair) => (
            <button
              key={pair.id}
              onClick={() => {
                const updated = settings.typography.fontPairings.map((p) => ({
                  ...p,
                  isActive: p.id === pair.id
                }));
                onUpdate({
                  typography: {
                    ...settings.typography,
                    fontPairings: updated,
                    headingFont: pair.heading,
                    bodyFont: pair.body
                  }
                });
                toast.success(`Typography updated to ${pair.name}`);
              }}
              className={`w-full p-4 rounded-xl border-2 transition text-left ${
                pair.isActive
                  ? 'border-[#ea580c] bg-[#ea580c]/10'
                  : 'border-[#2A2A2A] hover:border-[#ea580c]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white mb-1" style={{ fontFamily: pair.heading }}>
                    {pair.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span style={{ fontFamily: pair.heading }}>Heading: {pair.heading}</span>
                    {' • '}
                    <span style={{ fontFamily: pair.body }}>Body: {pair.body}</span>
                  </p>
                </div>
                {pair.isActive && (
                  <div className="w-6 h-6 rounded-full bg-[#ea580c] flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
