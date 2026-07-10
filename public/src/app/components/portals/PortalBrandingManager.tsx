/**
 * Portal Branding Manager
 * 
 * Universal branding system for all business portals:
 * - Employee Portal
 * - Subcontractor Portal
 * - Vendor Portal
 * - Professional Portal
 * 
 * Features:
 * - Custom logos and colors
 * - Company information
 * - Social media links
 * - Export branded content
 * - Integration with subscription tiers
 */

import { useState, useEffect } from 'react';
import {
  Palette, Upload, Image as ImageIcon, Building2, Globe, Mail,
  Phone, MapPin, Facebook, Instagram, Twitter, Linkedin, Save,
  RefreshCw, Eye, Download, Sparkles, Check, X, Info, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export interface PortalBranding {
  id: string;
  portal_type: 'employee' | 'subcontractor' | 'vendor' | 'professional';
  user_id: string;
  company_name: string;
  tagline?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  
  // Company Info
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Social Media
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  
  // Features based on subscription
  can_export: boolean;
  can_customize_colors: boolean;
  can_upload_logo: boolean;
  
  created_at: string;
  updated_at: string;
}

interface PortalBrandingManagerProps {
  portalType: 'employee' | 'subcontractor' | 'vendor' | 'professional';
  userId: string;
  subscriptionTier: 'free' | 'basic' | 'pro' | 'enterprise';
  onBrandingUpdate?: (branding: PortalBranding) => void;
}

export default function PortalBrandingManager({
  portalType,
  userId,
  subscriptionTier,
  onBrandingUpdate
}: PortalBrandingManagerProps) {
  const [branding, setBranding] = useState<PortalBranding>({
    id: `branding-${Date.now()}`,
    portal_type: portalType,
    user_id: userId,
    company_name: '',
    tagline: '',
    primary_color: '#ea580c',
    secondary_color: '#0A0A0A',
    accent_color: '#f97316',
    can_export: subscriptionTier !== 'free',
    can_customize_colors: subscriptionTier === 'pro' || subscriptionTier === 'enterprise',
    can_upload_logo: subscriptionTier === 'pro' || subscriptionTier === 'enterprise',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBranding();
  }, [portalType, userId]);

  const loadBranding = () => {
    const storageKey = `${portalType}_branding_${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBranding(parsed);
      } catch (e) {
        console.error('Error loading branding:', e);
      }
    }
  };

  const saveBranding = async () => {
    setSaving(true);
    
    try {
      const storageKey = `${portalType}_branding_${userId}`;
      const updatedBranding = {
        ...branding,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(updatedBranding));
      setBranding(updatedBranding);
      
      if (onBrandingUpdate) {
        onBrandingUpdate(updatedBranding);
      }
      
      toast.success('Branding saved successfully!', {
        description: 'Your custom branding has been updated'
      });
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!branding.can_upload_logo) {
      toast.error('Upgrade required', {
        description: 'Logo upload is available in Pro and Enterprise plans'
      });
      return;
    }

    // In a real app, upload to server/storage
    const reader = new FileReader();
    reader.onload = (e) => {
      setBranding({
        ...branding,
        logo_url: e.target?.result as string
      });
      toast.success('Logo uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const getFeatureAccess = () => {
    const features = {
      free: {
        colors: false,
        logo: false,
        export: false,
        socialMedia: false
      },
      basic: {
        colors: false,
        logo: false,
        export: true,
        socialMedia: true
      },
      pro: {
        colors: true,
        logo: true,
        export: true,
        socialMedia: true
      },
      enterprise: {
        colors: true,
        logo: true,
        export: true,
        socialMedia: true
      }
    };
    
    return features[subscriptionTier];
  };

  const features = getFeatureAccess();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
            <Palette className="w-7 h-7 text-[#ea580c]" />
            {portalType.charAt(0).toUpperCase() + portalType.slice(1)} Portal Branding
          </h2>
          <p className="text-gray-400">Customize your portal's appearance and company information</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition font-medium"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={saveBranding}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white rounded-lg hover:from-[#c2410c] hover:to-[#9a3412] transition font-bold shadow-lg shadow-[#ea580c]/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* Subscription Tier Info */}
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-white font-bold mb-1">
              Current Plan: {subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}
            </p>
            <div className="text-sm text-gray-300 space-y-1">
              <p>✓ Company information & contact details</p>
              {features.export && <p>✓ Export content for social media</p>}
              {features.colors && <p>✓ Custom color schemes</p>}
              {features.logo && <p>✓ Custom logo upload</p>}
              {features.socialMedia && <p>✓ Social media integration</p>}
              {!features.colors && <p className="text-gray-500">✗ Custom colors (Pro+ required)</p>}
              {!features.logo && <p className="text-gray-500">✗ Logo upload (Pro+ required)</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Company Information */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#ea580c]" />
              Company Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={branding.company_name}
                  onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                  placeholder="Enter your company name"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Tagline
                </label>
                <input
                  type="text"
                  value={branding.tagline || ''}
                  onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                  placeholder="Your company tagline or motto"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#ea580c]" />
              Company Logo
            </h3>

            <div className="space-y-4">
              {branding.logo_url ? (
                <div className="relative">
                  <img
                    src={branding.logo_url}
                    alt="Company Logo"
                    className="w-full h-48 object-contain bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                  />
                  <button
                    onClick={() => setBranding({ ...branding, logo_url: undefined })}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-3">
                    {features.logo ? 'Upload your company logo' : 'Logo upload requires Pro plan'}
                  </p>
                  <label className={`inline-flex items-center gap-2 px-4 py-2 ${
                    features.logo
                      ? 'bg-[#ea580c] hover:bg-[#c2410c] cursor-pointer'
                      : 'bg-gray-700 cursor-not-allowed'
                  } text-white rounded-lg transition font-medium`}>
                    <Upload className="w-4 h-4" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={!features.logo}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Color Scheme */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#ea580c]" />
              Color Scheme
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => features.colors && setBranding({ ...branding, primary_color: e.target.value })}
                    disabled={!features.colors}
                    className="w-16 h-12 rounded-lg cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={branding.primary_color}
                    onChange={(e) => features.colors && setBranding({ ...branding, primary_color: e.target.value })}
                    disabled={!features.colors}
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c] transition disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={branding.secondary_color}
                    onChange={(e) => features.colors && setBranding({ ...branding, secondary_color: e.target.value })}
                    disabled={!features.colors}
                    className="w-16 h-12 rounded-lg cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={branding.secondary_color}
                    onChange={(e) => features.colors && setBranding({ ...branding, secondary_color: e.target.value })}
                    disabled={!features.colors}
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c] transition disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={branding.accent_color}
                    onChange={(e) => features.colors && setBranding({ ...branding, accent_color: e.target.value })}
                    disabled={!features.colors}
                    className="w-16 h-12 rounded-lg cursor-pointer disabled:cursor-not-allowed"
                  />
                  <input
                    type="text"
                    value={branding.accent_color}
                    onChange={(e) => features.colors && setBranding({ ...branding, accent_color: e.target.value })}
                    disabled={!features.colors}
                    className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c] transition disabled:opacity-50"
                  />
                </div>
              </div>

              {!features.colors && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-400">
                    Upgrade to Pro to customize colors
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Contact & Social */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#ea580c]" />
              Contact Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={branding.email || ''}
                  onChange={(e) => setBranding({ ...branding, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={branding.phone || ''}
                  onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={branding.website || ''}
                  onChange={(e) => setBranding({ ...branding, website: e.target.value })}
                  placeholder="www.company.com"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Address
                </label>
                <input
                  type="text"
                  value={branding.address || ''}
                  onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
                  <input
                    type="text"
                    value={branding.city || ''}
                    onChange={(e) => setBranding({ ...branding, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
                  <input
                    type="text"
                    value={branding.state || ''}
                    onChange={(e) => setBranding({ ...branding, state: e.target.value })}
                    placeholder="ST"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={branding.zip || ''}
                    onChange={(e) => setBranding({ ...branding, zip: e.target.value })}
                    placeholder="12345"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ea580c]" />
              Social Media Links
            </h3>

            {features.socialMedia ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Facebook className="w-4 h-4 inline mr-1 text-blue-500" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={branding.facebook_url || ''}
                    onChange={(e) => setBranding({ ...branding, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/yourpage"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Instagram className="w-4 h-4 inline mr-1 text-pink-500" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={branding.instagram_url || ''}
                    onChange={(e) => setBranding({ ...branding, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/yourpage"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Twitter className="w-4 h-4 inline mr-1 text-blue-400" />
                    Twitter / X
                  </label>
                  <input
                    type="url"
                    value={branding.twitter_url || ''}
                    onChange={(e) => setBranding({ ...branding, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/yourhandle"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <Linkedin className="w-4 h-4 inline mr-1 text-blue-600" />
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={branding.linkedin_url || ''}
                    onChange={(e) => setBranding({ ...branding, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/company/yourcompany"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] transition"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-yellow-400 font-medium mb-1">Social Media Integration</p>
                <p className="text-xs text-gray-400">
                  Upgrade to Basic or higher to add social media links
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#ea580c]" />
            Branding Preview
          </h3>

          <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-8">
            <div className="flex items-start gap-6 mb-6">
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  className="w-24 h-24 object-contain rounded-lg border border-[#2A2A2A]"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg border border-[#2A2A2A] flex items-center justify-center"
                  style={{ backgroundColor: branding.primary_color }}>
                  <Building2 className="w-12 h-12 text-white" />
                </div>
              )}

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2"
                  style={{ color: branding.primary_color }}>
                  {branding.company_name || 'Your Company Name'}
                </h2>
                {branding.tagline && (
                  <p className="text-lg text-gray-400 mb-4">{branding.tagline}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {branding.email && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-4 h-4" style={{ color: branding.accent_color }} />
                      {branding.email}
                    </div>
                  )}
                  {branding.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-4 h-4" style={{ color: branding.accent_color }} />
                      {branding.phone}
                    </div>
                  )}
                  {branding.website && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Globe className="w-4 h-4" style={{ color: branding.accent_color }} />
                      {branding.website}
                    </div>
                  )}
                  {branding.address && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4" style={{ color: branding.accent_color }} />
                      {branding.address}, {branding.city}, {branding.state} {branding.zip}
                    </div>
                  )}
                </div>

                {features.socialMedia && (branding.facebook_url || branding.instagram_url || branding.twitter_url || branding.linkedin_url) && (
                  <div className="flex items-center gap-3 mt-4">
                    {branding.facebook_url && (
                      <a href={branding.facebook_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:scale-110"
                        style={{ backgroundColor: `${branding.primary_color}20`, color: branding.primary_color }}>
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {branding.instagram_url && (
                      <a href={branding.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:scale-110"
                        style={{ backgroundColor: `${branding.primary_color}20`, color: branding.primary_color }}>
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {branding.twitter_url && (
                      <a href={branding.twitter_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:scale-110"
                        style={{ backgroundColor: `${branding.primary_color}20`, color: branding.primary_color }}>
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {branding.linkedin_url && (
                      <a href={branding.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:scale-110"
                        style={{ backgroundColor: `${branding.primary_color}20`, color: branding.primary_color }}>
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: branding.primary_color }} />
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: branding.secondary_color }} />
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: branding.accent_color }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
