/**
 * Cohort Settings Modal
 * Allows editing of all cohort system settings including capacity limits, pricing, and rules
 */

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Settings, DollarSign, Users, MapPin, Crown, Calendar } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface CohortSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface CohortSettings {
  capacityLimits: {
    total: number;
    subcontractorsPerTrade: number;
    vendors: number;
    advertisers: number;
    radius: number;
    trialMonths: number;
    founderSlots: number;
    founderDiscount: number;
  };
  subscriptionRates: {
    subcontractor: number;
    vendor: number;
    advertiser: number;
  };
  maintenancePlans: {
    basic: number;
    standard: number;
    premium: number;
    enterprise: number;
  };
  vendorPlans: {
    starter: number;
    professional: number;
    enterprise: number;
  };
  advertiserPlans: {
    basic: number;
    premium: number;
    platinum: number;
  };
}

export function CohortSettingsModal({ isOpen, onClose, onSave }: CohortSettingsModalProps) {
  const [settings, setSettings] = useState<CohortSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/settings`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Settings saved successfully');
        if (onSave) onSave();
        onClose();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/settings/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        toast.success('Settings reset to defaults');
      } else {
        toast.error('Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const updateCapacityLimit = (key: string, value: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      capacityLimits: {
        ...settings.capacityLimits,
        [key]: value,
      },
    });
  };

  const updateSubscriptionRate = (key: string, value: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      subscriptionRates: {
        ...settings.subscriptionRates,
        [key]: value,
      },
    });
  };

  const updateMaintenancePlan = (key: string, value: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      maintenancePlans: {
        ...settings.maintenancePlans,
        [key]: value,
      },
    });
  };

  const updateVendorPlan = (key: string, value: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      vendorPlans: {
        ...settings.vendorPlans,
        [key]: value,
      },
    });
  };

  const updateAdvertiserPlan = (key: string, value: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      advertiserPlans: {
        ...settings.advertiserPlans,
        [key]: value,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ea580c]/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#ea580c]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cohort System Settings</h2>
              <p className="text-sm text-zinc-400">Customize capacity limits, pricing, and rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : settings ? (
            <div className="space-y-6">
              {/* Capacity Limits */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Capacity Limits</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Total Territory Capacity</label>
                    <input
                      type="number"
                      value={settings.capacityLimits.total}
                      onChange={(e) => updateCapacityLimit('total', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Subcontractors Per Trade</label>
                    <input
                      type="number"
                      value={settings.capacityLimits.subcontractorsPerTrade}
                      onChange={(e) => updateCapacityLimit('subcontractorsPerTrade', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Max Vendors</label>
                    <input
                      type="number"
                      value={settings.capacityLimits.vendors}
                      onChange={(e) => updateCapacityLimit('vendors', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Max Advertisers</label>
                    <input
                      type="number"
                      value={settings.capacityLimits.advertisers}
                      onChange={(e) => updateCapacityLimit('advertisers', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>
              </div>

              {/* Geographic & Trial Settings */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Geographic & Trial Settings</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Territory Radius (miles)</label>
                    <input
                      type="number"
                      value={settings.capacityLimits.radius}
                      onChange={(e) => updateCapacityLimit('radius', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Trial Period (months)</label>
                    <input
                      type="number"
                      value={settings.capacityLimits.trialMonths}
                      onChange={(e) => updateCapacityLimit('trialMonths', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>
              </div>

              {/* Founder Program */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-white">Founder Program</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Founder Slots Available</label>
                    <input
                      type="number"
                      value={settings.capacityLimits.founderSlots}
                      onChange={(e) => updateCapacityLimit('founderSlots', parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Founder Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.capacityLimits.founderDiscount * 100}
                      onChange={(e) => updateCapacityLimit('founderDiscount', parseFloat(e.target.value) / 100)}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>
              </div>

              {/* Subscription Rates */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-bold text-white">Subscription Rates (Monthly)</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Subcontractor</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.subscriptionRates.subcontractor}
                        onChange={(e) => updateSubscriptionRate('subcontractor', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Vendor</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.subscriptionRates.vendor}
                        onChange={(e) => updateSubscriptionRate('vendor', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Advertiser</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.subscriptionRates.advertiser}
                        onChange={(e) => updateSubscriptionRate('advertiser', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Plans */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Maintenance Plans (Monthly)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Basic</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.maintenancePlans.basic}
                        onChange={(e) => updateMaintenancePlan('basic', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Standard</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.maintenancePlans.standard}
                        onChange={(e) => updateMaintenancePlan('standard', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Premium</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.maintenancePlans.premium}
                        onChange={(e) => updateMaintenancePlan('premium', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Enterprise</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.maintenancePlans.enterprise}
                        onChange={(e) => updateMaintenancePlan('enterprise', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Plans */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Vendor Plans (Monthly)</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Starter</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.vendorPlans.starter}
                        onChange={(e) => updateVendorPlan('starter', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Professional</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.vendorPlans.professional}
                        onChange={(e) => updateVendorPlan('professional', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Enterprise</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.vendorPlans.enterprise}
                        onChange={(e) => updateVendorPlan('enterprise', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advertiser Plans */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Advertiser Plans (Monthly)</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Basic</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.advertiserPlans.basic}
                        onChange={(e) => updateAdvertiserPlan('basic', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Premium</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.advertiserPlans.premium}
                        onChange={(e) => updateAdvertiserPlan('premium', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Platinum</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        value={settings.advertiserPlans.platinum}
                        onChange={(e) => updateAdvertiserPlan('platinum', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
}