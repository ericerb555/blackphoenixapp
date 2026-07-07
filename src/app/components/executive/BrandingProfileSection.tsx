import { useState, useEffect } from 'react';
import { Building2, Save, RotateCcw, Palette, MapPin, Phone, Mail, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { BrandingService, type BrandingProfile } from '../../lib/services/brandingService';
import { defaultCompanyInfo, convertCompanyInfoToProfile, convertProfileToCompanyInfo, companyInfo } from '../../lib/config/companyInfo';
import { toast } from 'sonner@2.0.3';

export default function BrandingProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BrandingProfile>(convertCompanyInfoToProfile(defaultCompanyInfo));
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await BrandingService.getBrandingProfile();
      
      if (error) throw error;
      
      if (data) {
        setProfile(data);
      } else {
        // Initialize with default values
        setProfile(convertCompanyInfoToProfile(defaultCompanyInfo));
      }
    } catch (error: any) {
      console.error('Error loading branding profile:', error);
      toast.error('Failed to load branding profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data, error } = await BrandingService.updateBrandingProfile(profile);
      
      if (error) throw error;
      
      toast.success('Branding profile saved successfully!');
      setHasChanges(false);
      
      // Reload company info globally
      Object.assign(companyInfo, convertProfileToCompanyInfo(profile));
    } catch (error: any) {
      console.error('Error saving branding profile:', error);
      toast.error(error.message || 'Failed to save branding profile');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProfile(convertCompanyInfoToProfile(defaultCompanyInfo));
    setHasChanges(true);
    toast.info('Reset to default values');
  };

  const updateField = (field: keyof BrandingProfile, value: any) => {
    setProfile({ ...profile, [field]: value });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading branding profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Company Branding Profile
          </h2>
          <p className="text-gray-400 mt-1">Manage your company's information across all invoices and contracts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-xl transition disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl transition shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Company Information */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-orange-400" />
          Company Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
            <input
              type="text"
              value={profile.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Your Company Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Legal Name</label>
            <input
              type="text"
              value={profile.company_legal_name}
              onChange={(e) => updateField('company_legal_name', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Legal Business Name LLC"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
            <input
              type="text"
              value={profile.company_tagline}
              onChange={(e) => updateField('company_tagline', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Your company's tagline or motto"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-400" />
          Address
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 1</label>
            <input
              type="text"
              value={profile.address_line1}
              onChange={(e) => updateField('address_line1', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Street address"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 2 (Optional)</label>
            <input
              type="text"
              value={profile.address_line2 || ''}
              onChange={(e) => updateField('address_line2', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Suite, unit, building, floor, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => updateField('city', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
            <input
              type="text"
              value={profile.state}
              onChange={(e) => updateField('state', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="State"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Zip Code</label>
            <input
              type="text"
              value={profile.zip_code}
              onChange={(e) => updateField('zip_code', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Zip code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
            <input
              type="text"
              value={profile.country}
              onChange={(e) => updateField('country', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Country"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-orange-400" />
          Contact Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="(555) 555-5555"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Fax (Optional)</label>
            <input
              type="tel"
              value={profile.fax || ''}
              onChange={(e) => updateField('fax', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="(555) 555-5556"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="contact@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
            <input
              type="text"
              value={profile.website}
              onChange={(e) => updateField('website', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="www.company.com"
            />
          </div>
        </div>
      </div>

      {/* Tax & Legal */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-400" />
          Tax & Legal Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tax ID</label>
            <input
              type="text"
              value={profile.tax_id}
              onChange={(e) => updateField('tax_id', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="12-3456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tax Label</label>
            <input
              type="text"
              value={profile.tax_label}
              onChange={(e) => updateField('tax_label', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="EIN, SSN, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">License Number (Optional)</label>
            <input
              type="text"
              value={profile.license_number || ''}
              onChange={(e) => updateField('license_number', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="License number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Number (Optional)</label>
            <input
              type="text"
              value={profile.insurance_number || ''}
              onChange={(e) => updateField('insurance_number', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Insurance number"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
            <textarea
              value={profile.payment_terms}
              onChange={(e) => updateField('payment_terms', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              placeholder="Default payment terms for invoices..."
            />
          </div>
        </div>
      </div>

      {/* Banking Information */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-orange-400" />
          Banking Information (Optional)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bank Name</label>
            <input
              type="text"
              value={profile.bank_name || ''}
              onChange={(e) => updateField('bank_name', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Bank name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Account Name</label>
            <input
              type="text"
              value={profile.bank_account_name || ''}
              onChange={(e) => updateField('bank_account_name', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Account holder name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
            <input
              type="text"
              value={profile.bank_account_number || ''}
              onChange={(e) => updateField('bank_account_number', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="****1234 (masked for security)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Routing Number</label>
            <input
              type="text"
              value={profile.bank_routing_number || ''}
              onChange={(e) => updateField('bank_routing_number', e.target.value)}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              placeholder="Routing number"
            />
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-orange-400" />
          Brand Colors
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={profile.primary_color}
                onChange={(e) => updateField('primary_color', e.target.value)}
                className="w-16 h-12 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={profile.primary_color}
                onChange={(e) => updateField('primary_color', e.target.value)}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="#ea580c"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={profile.secondary_color}
                onChange={(e) => updateField('secondary_color', e.target.value)}
                className="w-16 h-12 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={profile.secondary_color}
                onChange={(e) => updateField('secondary_color', e.target.value)}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="#0A0A0A"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={profile.accent_color}
                onChange={(e) => updateField('accent_color', e.target.value)}
                className="w-16 h-12 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={profile.accent_color}
                onChange={(e) => updateField('accent_color', e.target.value)}
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="#f97316"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Reminder */}
      {hasChanges && (
        <div className="bg-orange-600/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-orange-400">You have unsaved changes</p>
            <p className="text-sm text-orange-300/80">Click "Save Changes" to apply your updates across all documents</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
          >
            Save Now
          </button>
        </div>
      )}
    </div>
  );
}
