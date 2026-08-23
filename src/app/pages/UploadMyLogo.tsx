/**
 * Upload My Logo - Simple logo uploader
 * Directly saves logo to localStorage for immediate use
 */

import { useState } from 'react';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { uploadImageDataUrl } from '../utils/imageStorage';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const LOGO_SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export default function UploadMyLogo() {
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLogoPreview(base64);
        toast.success('Logo loaded! Enter your company name and click Save.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to load logo');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!logoPreview) {
      toast.error('Please upload a logo first');
      return;
    }

    if (!companyName.trim()) {
      toast.error('Please enter your company name');
      return;
    }

    setUploading(true);
    try {
      // Upload the logo to Supabase Storage and keep only the URL in
      // localStorage (base64 in localStorage bloats storage and backups).
      let logoUrl = logoPreview;
      try {
        logoUrl = await uploadImageDataUrl(logoPreview, 'company/logo');
      } catch (e) {
        console.warn('Logo storage upload failed, saving locally as fallback:', e);
        toast.message('Saved locally — image server was unavailable.');
      }

      // Save to localStorage in the exact format DirectoryLandingPage expects
      const brandingProfile = {
        company_name: companyName,
        brandName: companyName,
        businessName: companyName,
        logo_url: logoUrl,
        logo_primary: logoUrl,
        logoPrimary: logoUrl,
        primary_color: '#ea580c',
        secondary_color: '#f97316'
      };

      localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));

      // Persist to the server so the branding loads across devices and for public
      // (unauthenticated) landing-page visitors via /public/branding.
      try {
        await fetch(`${LOGO_SERVER}/branding-profile`, {
          method: 'POST',
          headers: await authedHeadersOrAnon(publicAnonKey),
          body: JSON.stringify({ branding: brandingProfile }),
        });
      } catch (e) {
        console.warn('Branding profile server save failed (kept locally):', e);
      }

      console.log('✅ Logo saved to localStorage');
      console.log('✅ Company name:', companyName);

      // Dispatch event to update the landing page
      window.dispatchEvent(new Event('brandingUpdated'));

      toast.success('✅ Logo saved! Go back to your landing page to see it.');

      // Auto-navigate to landing page after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      toast.error('Failed to save logo');
      console.error('Save error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-[#1A1A1A] border-2 border-orange-500/30 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Upload Your Logo</h1>
          <p className="text-gray-400 mb-8">Upload your company logo and it will appear on your landing page</p>

          <div className="space-y-6">
            {/* Company Name Input */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Your Logo
              </label>
              <div className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-8 text-center hover:border-orange-500/50 transition">
                {logoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="w-48 h-48 object-contain mx-auto bg-white/5 rounded-lg p-4"
                    />
                    <button
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="text-orange-400 hover:text-orange-300 text-sm font-semibold"
                    >
                      Change Logo
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Click to upload your logo</p>
                    <p className="text-xs text-gray-500">PNG, JPG, or SVG</p>
                  </div>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {!logoPreview && (
                  <button
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={uploading}
                    className="mt-4 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {uploading ? 'Loading...' : 'Choose File'}
                  </button>
                )}
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Status:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {companyName ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                  )}
                  <span className={companyName ? 'text-green-400' : 'text-gray-500'}>
                    Company Name
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {logoPreview ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                  )}
                  <span className={logoPreview ? 'text-green-400' : 'text-gray-500'}>
                    Logo Uploaded
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!logoPreview || !companyName.trim()}
              className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl font-bold text-lg transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <Check className="w-6 h-6" />
              Save My Logo
            </button>

            {/* Helper Text */}
            <p className="text-xs text-gray-500 text-center">
              After saving, you'll be redirected to your landing page where your logo will appear
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
