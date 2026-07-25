import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Bell,
  DollarSign,
  Mail,
  CreditCard,
  Globe,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle,
  Save,
  RotateCcw,
  Zap,
  Shield,
  Calendar,
  Percent,
  Download,
  Upload,
} from 'lucide-react';

interface SubscriptionHubSettingsData {
  // General Settings
  general: {
    company_name: string;
    support_email: string;
    default_currency: string;
    default_billing_cycle: 'monthly' | 'quarterly' | 'annual';
    enable_trials: boolean;
    default_trial_days: number;
  };
  
  // Billing Settings
  billing: {
    grace_period_days: number;
    auto_cancel_after_days: number;
    prorate_upgrades: boolean;
    prorate_downgrades: boolean;
    allow_plan_changes: boolean;
    require_payment_method: boolean;
  };
  
  // Notification Settings
  notifications: {
    send_welcome_email: boolean;
    send_trial_ending_email: boolean;
    trial_ending_days_before: number;
    send_renewal_reminders: boolean;
    renewal_reminder_days_before: number;
    send_payment_failed_email: boolean;
    send_cancellation_email: boolean;
    send_upgrade_email: boolean;
  };
  
  // Tax Settings
  tax: {
    enable_tax: boolean;
    default_tax_rate: number;
    tax_label: string;
    include_tax_in_price: boolean;
  };
  
  // Advanced Settings
  advanced: {
    enable_coupons: boolean;
    enable_referrals: boolean;
    enable_analytics: boolean;
    enable_webhooks: boolean;
    webhook_url: string;
    allow_cancellations: boolean;
    require_cancellation_reason: boolean;
  };
}

interface SubscriptionHubSettingsProps {
  onClose: () => void;
}

const DEFAULT_SETTINGS: SubscriptionHubSettingsData = {
  general: {
    company_name: 'My Company',
    support_email: 'support@company.com',
    default_currency: 'USD',
    default_billing_cycle: 'monthly',
    enable_trials: true,
    default_trial_days: 14,
  },
  billing: {
    grace_period_days: 3,
    auto_cancel_after_days: 30,
    prorate_upgrades: true,
    prorate_downgrades: false,
    allow_plan_changes: true,
    require_payment_method: true,
  },
  notifications: {
    send_welcome_email: true,
    send_trial_ending_email: true,
    trial_ending_days_before: 3,
    send_renewal_reminders: true,
    renewal_reminder_days_before: 7,
    send_payment_failed_email: true,
    send_cancellation_email: true,
    send_upgrade_email: true,
  },
  tax: {
    enable_tax: false,
    default_tax_rate: 0,
    tax_label: 'VAT',
    include_tax_in_price: false,
  },
  advanced: {
    enable_coupons: true,
    enable_referrals: true,
    enable_analytics: true,
    enable_webhooks: false,
    webhook_url: '',
    allow_cancellations: true,
    require_cancellation_reason: true,
  },
};

export default function SubscriptionHubSettings({ onClose }: SubscriptionHubSettingsProps) {
  const [settings, setSettings] = useState<SubscriptionHubSettingsData>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<'general' | 'billing' | 'notifications' | 'tax' | 'advanced'>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem('subscription_hub_settings');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Clear corrupted data
      localStorage.removeItem('subscription_hub_settings');
      console.log('Cleared corrupted settings data');
    }
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('subscription_hub_settings', JSON.stringify(settings));
      setHasChanges(false);
      setTimeout(() => {
        setSaving(false);
        // Show success message
        alert('Settings saved successfully!');
      }, 500);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaving(false);
      alert('Error saving settings');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default settings?')) {
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(true);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'subscription-hub-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            setSettings(imported);
            setHasChanges(true);
            alert('Settings imported successfully!');
          } catch (error) {
            alert('Error importing settings. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const updateSetting = (section: keyof SubscriptionHubSettingsData, key: string, value: any) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    });
    setHasChanges(true);
  };

  const sections = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'billing', name: 'Billing', icon: DollarSign },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'tax', name: 'Tax', icon: Percent },
    { id: 'advanced', name: 'Advanced', icon: Zap },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between border-b border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Subscription Hub Settings</h2>
              <p className="text-sm text-orange-100">
                Configure your subscription management preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-[#1A1A1A] border-r border-[#2A2A2A] p-4 overflow-y-auto">
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-[#2A2A2A] space-y-2">
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:bg-[#2A2A2A] hover:text-white rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export Settings
              </button>
              <button
                onClick={handleImport}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:bg-[#2A2A2A] hover:text-white rounded-lg transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                Import Settings
              </button>
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:bg-[#2A2A2A] hover:text-white rounded-lg transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-400" />
                    General Settings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={settings.general.company_name}
                        onChange={(e) => updateSetting('general', 'company_name', e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={settings.general.support_email}
                        onChange={(e) => updateSetting('general', 'support_email', e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Default Currency
                        </label>
                        <select
                          value={settings.general.default_currency}
                          onChange={(e) => updateSetting('general', 'default_currency', e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Default Billing Cycle
                        </label>
                        <select
                          value={settings.general.default_billing_cycle}
                          onChange={(e) => updateSetting('general', 'default_billing_cycle', e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="annual">Annual</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-white">Enable Trial Periods</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Allow new subscriptions to start with a trial period
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.general.enable_trials}
                            onChange={(e) => updateSetting('general', 'enable_trials', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      {settings.general.enable_trials && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Default Trial Days
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={settings.general.default_trial_days}
                            onChange={(e) => updateSetting('general', 'default_trial_days', parseInt(e.target.value))}
                            className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Settings */}
            {activeSection === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-400" />
                    Billing Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Grace Period (Days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={settings.billing.grace_period_days}
                          onChange={(e) => updateSetting('billing', 'grace_period_days', parseInt(e.target.value))}
                          className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Days before marking subscription as past due after failed payment
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Auto-Cancel After (Days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="90"
                          value={settings.billing.auto_cancel_after_days}
                          onChange={(e) => updateSetting('billing', 'auto_cancel_after_days', parseInt(e.target.value))}
                          className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Days before auto-canceling past due subscriptions
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Prorate Upgrades</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Calculate prorated charges when upgrading plans
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.billing.prorate_upgrades}
                            onChange={(e) => updateSetting('billing', 'prorate_upgrades', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Prorate Downgrades</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Calculate prorated credits when downgrading plans
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.billing.prorate_downgrades}
                            onChange={(e) => updateSetting('billing', 'prorate_downgrades', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Allow Plan Changes</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Let customers upgrade or downgrade their plans
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.billing.allow_plan_changes}
                            onChange={(e) => updateSetting('billing', 'allow_plan_changes', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Require Payment Method</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Require payment method even for trial subscriptions
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.billing.require_payment_method}
                            onChange={(e) => updateSetting('billing', 'require_payment_method', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-400" />
                    Notification Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Welcome Email</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Send welcome email when subscription is created
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.send_welcome_email}
                            onChange={(e) => updateSetting('notifications', 'send_welcome_email', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-white">Trial Ending Email</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Remind customers before their trial ends
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.notifications.send_trial_ending_email}
                              onChange={(e) => updateSetting('notifications', 'send_trial_ending_email', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>
                        {settings.notifications.send_trial_ending_email && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Days Before Trial Ends
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={settings.notifications.trial_ending_days_before}
                              onChange={(e) => updateSetting('notifications', 'trial_ending_days_before', parseInt(e.target.value))}
                              className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            />
                          </div>
                        )}
                      </div>

                      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-white">Renewal Reminders</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Send reminder before subscription renewal
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.notifications.send_renewal_reminders}
                              onChange={(e) => updateSetting('notifications', 'send_renewal_reminders', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>
                        {settings.notifications.send_renewal_reminders && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Days Before Renewal
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={settings.notifications.renewal_reminder_days_before}
                              onChange={(e) => updateSetting('notifications', 'renewal_reminder_days_before', parseInt(e.target.value))}
                              className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Payment Failed Email</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Notify customers when payment fails
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.send_payment_failed_email}
                            onChange={(e) => updateSetting('notifications', 'send_payment_failed_email', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Cancellation Email</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Confirm when subscription is cancelled
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.send_cancellation_email}
                            onChange={(e) => updateSetting('notifications', 'send_cancellation_email', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Upgrade Email</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Congratulate customers on plan upgrades
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.send_upgrade_email}
                            onChange={(e) => updateSetting('notifications', 'send_upgrade_email', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tax Settings */}
            {activeSection === 'tax' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-orange-400" />
                    Tax Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-white">Enable Tax</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Apply tax to subscription prices
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.tax.enable_tax}
                          onChange={(e) => updateSetting('tax', 'enable_tax', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>

                    {settings.tax.enable_tax && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Default Tax Rate (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={settings.tax.default_tax_rate}
                              onChange={(e) => updateSetting('tax', 'default_tax_rate', parseFloat(e.target.value))}
                              className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Tax Label
                            </label>
                            <input
                              type="text"
                              value={settings.tax.tax_label}
                              onChange={(e) => updateSetting('tax', 'tax_label', e.target.value)}
                              placeholder="VAT, GST, Sales Tax"
                              className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-white">Include Tax in Price</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Display prices with tax included
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.tax.include_tax_in_price}
                              onChange={(e) => updateSetting('tax', 'include_tax_in_price', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-400">
                              <p className="font-medium mb-1">Tax Calculation Example</p>
                              <p className="text-blue-300">
                                ${settings.tax.include_tax_in_price ? '100.00 (includes $' + (100 * settings.tax.default_tax_rate / (100 + settings.tax.default_tax_rate)).toFixed(2) + ' tax)' : '100.00 + $' + (100 * settings.tax.default_tax_rate / 100).toFixed(2) + ' tax = $' + (100 + (100 * settings.tax.default_tax_rate / 100)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            {activeSection === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-400" />
                    Advanced Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Enable Coupons</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Allow discount coupons and promo codes
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.advanced.enable_coupons}
                            onChange={(e) => updateSetting('advanced', 'enable_coupons', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Enable Referrals</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Allow customers to refer others for rewards
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.advanced.enable_referrals}
                            onChange={(e) => updateSetting('advanced', 'enable_referrals', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Enable Analytics</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Track subscription metrics and insights
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.advanced.enable_analytics}
                            onChange={(e) => updateSetting('advanced', 'enable_analytics', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-white">Enable Webhooks</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Send events to external systems
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.advanced.enable_webhooks}
                              onChange={(e) => updateSetting('advanced', 'enable_webhooks', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>
                        {settings.advanced.enable_webhooks && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Webhook URL
                            </label>
                            <input
                              type="url"
                              value={settings.advanced.webhook_url}
                              onChange={(e) => updateSetting('advanced', 'webhook_url', e.target.value)}
                              placeholder="https://your-domain.com/webhooks"
                              className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Allow Cancellations</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Let customers cancel their subscriptions
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.advanced.allow_cancellations}
                            onChange={(e) => updateSetting('advanced', 'allow_cancellations', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">Require Cancellation Reason</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Ask for feedback when customers cancel
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.advanced.require_cancellation_reason}
                            onChange={(e) => updateSetting('advanced', 'require_cancellation_reason', e.target.checked)}
                            disabled={!settings.advanced.allow_cancellations}
                            className="sr-only peer disabled:opacity-50"
                          />
                          <div className="w-11 h-6 bg-[#2A2A2A] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#2A2A2A] p-6 bg-[#1A1A1A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">Unsaved changes</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
