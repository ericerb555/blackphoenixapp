/**
 * Step 6: Branding Customization
 * Customize portal appearance and branding
 * Integrates with BrandingHub for logo selection
 */

import { useState } from 'react';
import { ChevronLeft, Upload, Palette, Image as ImageIcon } from 'lucide-react';
import { WizardStepProps } from '../types';
import { toast } from 'sonner@2.0.3';
import PortalService from '../../../lib/services/portalService';
import { PrimaryButton } from '../../ui/button/PrimaryButton';

export default function BrandingCustomization({ data, onUpdate, onNext, onPrevious }: WizardStepProps) {
  const [uploading, setUploading] = useState(false);
  const branding = data.branding || { primaryColor: '#ea580c', secondaryColor: '#0A0A0A', logoUrl: '' };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be smaller than 5MB');
      return;
    }

    try {
      setUploading(true);

      // For now, create a local URL (in production, upload to Supabase)
      const localUrl = URL.createObjectURL(file);
      
      onUpdate({
        branding: {
          ...branding,
          logoUrl: localUrl
        }
      });

      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const predefinedColors = [
    { name: 'Deep Orange', value: '#ea580c' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Red', value: '#ef4444' },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Customize Portal Branding</h3>
        <p className="text-gray-400">Set colors, logo, and visual identity</p>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Portal Logo
          </label>
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <div className="w-24 h-24 rounded-xl bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center overflow-hidden">
                <img src={branding.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl bg-[#1A1A1A] border-2 border-dashed border-[#2A2A2A] flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-600" />
              </div>
            )}
            <div className="flex-1">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="px-4 py-3 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-medium hover:bg-orange-600/30 transition cursor-pointer inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : branding.logoUrl ? 'Change Logo' : 'Upload Logo'}
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG, or SVG. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Primary Color */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Primary Color
          </label>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3">
            {predefinedColors.map(color => (
              <button
                key={color.value}
                onClick={() => onUpdate({ branding: { ...branding, primaryColor: color.value } })}
                className={`w-full aspect-square rounded-xl border-2 transition ${
                  branding.primaryColor === color.value
                    ? 'border-white ring-2 ring-white/30'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          <input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => onUpdate({ branding: { ...branding, primaryColor: e.target.value } })}
            className="w-full h-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl cursor-pointer"
          />
        </div>

        {/* Secondary Color */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">Secondary Color</label>
          <input
            type="color"
            value={branding.secondaryColor}
            onChange={(e) => onUpdate({ branding: { ...branding, secondaryColor: e.target.value } })}
            className="w-full h-12 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl cursor-pointer"
          />
        </div>

        {/* Preview */}
        <div className="p-6 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
          <p className="text-sm font-medium text-gray-400 mb-4">Preview</p>
          <div className="space-y-3">
            <div 
              className="p-4 rounded-lg text-white font-medium"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Primary Color Preview
            </div>
            <div 
              className="p-4 rounded-lg text-white font-medium border-2"
              style={{ 
                backgroundColor: branding.secondaryColor,
                borderColor: branding.primaryColor
              }}
            >
              Secondary Color Preview
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-6 border-t border-[#2A2A2A]">
        <button
          onClick={onPrevious}
          className="px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl font-medium hover:bg-[#2A2A2A] transition flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>
        <PrimaryButton
          onClick={onNext}
        >
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}
