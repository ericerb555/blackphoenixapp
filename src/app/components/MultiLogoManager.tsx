/**
 * Multi-Logo Manager Component
 * Manage multiple logo variants for different use cases
 */

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload, Trash2, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { BrandingService } from '../lib/services/brandingService';

interface LogoVariant {
  id: string;
  name: string;
  description: string;
  url?: string;
  fieldName: keyof LogoUrls;
}

interface LogoUrls {
  logo_primary: string;
  logo_secondary: string;
  logo_icon: string;
  logo_square: string;
  logo_horizontal: string;
  logo_vertical: string;
  logo_white: string;
  logo_black: string;
}

export default function MultiLogoManager() {
  const [logos, setLogos] = useState<LogoUrls>({
    logo_primary: '',
    logo_secondary: '',
    logo_icon: '',
    logo_square: '',
    logo_horizontal: '',
    logo_vertical: '',
    logo_white: '',
    logo_black: '',
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  const logoVariants: LogoVariant[] = [
    {
      id: 'primary',
      name: 'Primary Logo',
      description: 'Main logo used across the platform',
      fieldName: 'logo_primary',
    },
    {
      id: 'secondary',
      name: 'Secondary Logo',
      description: 'Alternative logo for different contexts',
      fieldName: 'logo_secondary',
    },
    {
      id: 'icon',
      name: 'Icon/Favicon',
      description: 'Small icon for browser tabs and mobile apps',
      fieldName: 'logo_icon',
    },
    {
      id: 'square',
      name: 'Square Logo',
      description: 'Square format for social media profiles',
      fieldName: 'logo_square',
    },
    {
      id: 'horizontal',
      name: 'Horizontal Logo',
      description: 'Wide format for headers and banners',
      fieldName: 'logo_horizontal',
    },
    {
      id: 'vertical',
      name: 'Vertical Logo',
      description: 'Tall format for sidebars and narrow spaces',
      fieldName: 'logo_vertical',
    },
    {
      id: 'white',
      name: 'White/Light Logo',
      description: 'For dark backgrounds',
      fieldName: 'logo_white',
    },
    {
      id: 'black',
      name: 'Black/Dark Logo',
      description: 'For light backgrounds',
      fieldName: 'logo_black',
    },
  ];

  useEffect(() => {
    loadLogos();
  }, []);

  const loadLogos = async () => {
    try {
      // First try to load from localStorage (where variants are stored)
      const savedVariants = localStorage.getItem('company_logo_variants');
      if (savedVariants) {
        const parsed = JSON.parse(savedVariants);
        setLogos(parsed);
        console.log('✅ Loaded logo variants from localStorage');
        return;
      }

      // Fallback to branding profile for primary logo only
      const { data: profile } = await BrandingService.getBrandingProfile();
      if (profile) {
        setLogos({
          logo_primary: profile.logo_url || '',
          logo_secondary: '',
          logo_icon: '',
          logo_square: '',
          logo_horizontal: '',
          logo_vertical: '',
          logo_white: '',
          logo_black: '',
        });
      }
    } catch (error) {
      console.error('Error loading logos:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof LogoUrls) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(fieldName);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        // Update logos state
        const updatedLogos = {
          ...logos,
          [fieldName]: base64,
        };
        setLogos(updatedLogos);

        // Save to branding profile
        const { data: profile } = await BrandingService.getBrandingProfile();
        if (profile) {
          const updatedProfile = {
            ...profile,
            logo_url: fieldName === 'logo_primary' ? base64 : profile.logo_url,
            // Store all logo variants in a JSON field or separate fields
          };
          await BrandingService.updateBrandingProfile(updatedProfile);

          // Also save to localStorage for logo variants
          localStorage.setItem('company_logo_variants', JSON.stringify(updatedLogos));

          toast.success(`${logoVariants.find(v => v.fieldName === fieldName)?.name} uploaded successfully!`);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (fieldName: keyof LogoUrls) => {
    if (!confirm('Are you sure you want to delete this logo?')) return;

    try {
      const updatedLogos = {
        ...logos,
        [fieldName]: '',
      };
      setLogos(updatedLogos);

      // Save to localStorage
      localStorage.setItem('company_logo_variants', JSON.stringify(updatedLogos));

      // Update branding profile if it's the primary logo
      if (fieldName === 'logo_primary') {
        const { data: profile } = await BrandingService.getBrandingProfile();
        if (profile) {
          await BrandingService.updateBrandingProfile({
            ...profile,
            logo_url: '',
          });
        }
      }

      toast.success('Logo deleted');
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Failed to delete logo');
    }
  };

  const handlePreview = (url: string) => {
    setPreviewLogo(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Logo Library</h3>
        <p className="text-gray-400 text-sm">
          Upload different logo variants for different use cases
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {logoVariants.map((variant) => {
          const logoUrl = logos[variant.fieldName];
          const isUploading = uploading === variant.fieldName;

          return (
            <div
              key={variant.id}
              className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#ea580c] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">{variant.name}</h4>
                  <p className="text-gray-400 text-xs">{variant.description}</p>
                </div>
                {logoUrl && (
                  <div className="flex items-center gap-1 ml-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                )}
              </div>

              {/* Logo Preview */}
              {logoUrl ? (
                <div className="relative bg-white/5 rounded-lg p-4 mb-3 flex items-center justify-center min-h-[120px]">
                  <img
                    src={logoUrl}
                    alt={variant.name}
                    className="max-h-24 max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 mb-3 flex items-center justify-center min-h-[120px] border-2 border-dashed border-[#2A2A2A]">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No logo uploaded</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, variant.fieldName)}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-[#ea580c] hover:bg-[#dc2626] disabled:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium">
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {logoUrl ? 'Replace' : 'Upload'}
                      </>
                    )}
                  </div>
                </label>

                {logoUrl && (
                  <>
                    <button
                      onClick={() => handlePreview(logoUrl)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(variant.fieldName)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewLogo && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewLogo(null)}
        >
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Logo Preview</h3>
              <button
                onClick={() => setPreviewLogo(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-white/5 rounded-lg p-8 flex items-center justify-center min-h-[400px]">
              <img
                src={previewLogo}
                alt="Logo preview"
                className="max-w-full max-h-[500px] object-contain"
              />
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>Tip:</strong> Test your logo on both light and dark backgrounds to ensure it looks good everywhere.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Best Practices */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-200 mb-2">Logo Best Practices:</p>
            <ul className="text-blue-200/80 space-y-1">
              <li>• <strong>Primary Logo:</strong> Your main logo, full color (PNG or SVG recommended)</li>
              <li>• <strong>Icon:</strong> Square format, 512x512px minimum (for favicons and app icons)</li>
              <li>• <strong>White Logo:</strong> For dark backgrounds (transparent PNG)</li>
              <li>• <strong>Black Logo:</strong> For light backgrounds (transparent PNG)</li>
              <li>• <strong>File Size:</strong> Keep under 5MB for fast loading</li>
              <li>• <strong>Format:</strong> PNG with transparency or SVG for best quality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
