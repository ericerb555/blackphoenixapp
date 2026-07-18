import { useState, useEffect } from 'react';
import { MapPin, Navigation, Save, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { saveDual, loadDual } from '../lib/database';

export default function ServiceAreaSettings() {
  const [serviceAreaRadius, setServiceAreaRadius] = useState<number>(50);
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('CA');
  const [businessZip, setBusinessZip] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await loadDual('service_area_settings');

      if (data) {
        setServiceAreaRadius(data.service_area_radius || 50);
        setBusinessAddress(data.business_address || '');
        setBusinessCity(data.business_city || '');
        setBusinessState(data.business_state || 'CA');
        setBusinessZip(data.business_zip || '');
        console.log('✅ Loaded service area settings from database');
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsData = {
        service_area_radius: serviceAreaRadius,
        business_address: businessAddress,
        business_city: businessCity,
        business_state: businessState,
        business_zip: businessZip,
        updated_at: new Date().toISOString()
      };

      await saveDual('service_area_settings', settingsData);
      console.log('✅ Saved service area settings to database');
      toast.success('Service area settings saved to database!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
          <Navigation className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Service Area Settings</h3>
          <p className="text-sm text-gray-400">Configure your service radius and business location</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Business Address */}
        <div className="space-y-4">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-400" />
            Business Location
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                value={businessCity}
                onChange={(e) => setBusinessCity(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Los Angeles"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State
              </label>
              <input
                type="text"
                value={businessState}
                onChange={(e) => setBusinessState(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={businessZip}
                onChange={(e) => setBusinessZip(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="90001"
              />
            </div>
          </div>
        </div>

        {/* Service Area Radius */}
        <div className="space-y-4 pt-6 border-t border-[#2A2A2A]">
          <h4 className="font-semibold text-white">Service Area Radius</h4>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maximum Distance (miles)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={serviceAreaRadius}
                onChange={(e) => setServiceAreaRadius(parseInt(e.target.value))}
                className="flex-1 h-2 bg-[#2A2A2A] rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ea580c 0%, #ea580c ${(serviceAreaRadius - 10) / 190 * 100}%, #2A2A2A ${(serviceAreaRadius - 10) / 190 * 100}%, #2A2A2A 100%)`
                }}
              />
              <div className="w-20">
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={serviceAreaRadius}
                  onChange={(e) => setServiceAreaRadius(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] text-white rounded-lg text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Projects beyond this distance will receive a warning
            </p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-400">Current Service Area</span>
              <span className="text-lg font-bold text-orange-400">{serviceAreaRadius} miles</span>
            </div>
            <p className="text-xs text-orange-300/60 mt-2">
              Covers approximately {Math.round(Math.PI * serviceAreaRadius * serviceAreaRadius).toLocaleString()} square miles
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-[#2A2A2A]">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl font-bold transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Service Area Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
