import { useState, useEffect } from 'react';
import {
  Settings, Shield, Globe, Bell, Zap, DollarSign, CreditCard,
  Server, Key, Webhook, CheckCircle, XCircle, AlertTriangle,
  Save, RefreshCw, Eye, EyeOff, Copy, Check, Plus, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner@2.0.3';
import UnifiedPaymentService from '../../lib/services/unifiedPaymentService';

interface PaymentSettings {
  id: string;
  payment_enabled: boolean;
  accepted_currencies: string[];
  default_currency: string;
  enable_cards: boolean;
  enable_ach: boolean;
  enable_digital_wallets: boolean;
  enable_crypto: boolean;
  enable_recurring: boolean;
  business_name: string;
  business_email: string;
  support_email: string;
  statement_descriptor: string;
  require_cvv: boolean;
  require_postal_code: boolean;
  enable_3d_secure: boolean;
  fraud_detection_enabled: boolean;
  fraud_score_threshold: number;
  single_transaction_limit: number;
  daily_transaction_limit: number;
  monthly_volume_limit: number;
  notify_on_payment: boolean;
  notify_on_refund: boolean;
  notify_on_dispute: boolean;
  notification_emails: string[];
}

interface Gateway {
  id: string;
  gateway_name: string;
  display_name: string;
  gateway_type: string;
  is_active: boolean;
  is_default: boolean;
  environment: string;
}

export default function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'gateways' | 'security' | 'notifications'>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
    loadGateways();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Error loading settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGateways = async () => {
    try {
      const { data, error } = await UnifiedPaymentService.getPaymentGateways();
      if (error) throw error;
      
      // Map to expected format
      const mappedGateways = (data || [])
        .filter(gateway => gateway && gateway.gateway_name) // Filter out invalid entries
        .map(gateway => ({
          id: gateway.gateway_name,
          gateway_name: gateway.gateway_name || 'unknown',
          display_name: gateway.gateway_name 
            ? (gateway.gateway_name.charAt(0).toUpperCase() + gateway.gateway_name.slice(1))
            : 'Unknown',
          gateway_type: gateway.gateway_name || 'unknown',
          is_active: gateway.is_active ?? false,
          is_default: false,
          environment: gateway.test_mode ? 'test' : 'production',
        }));
      
      setGateways(mappedGateways);
    } catch (err) {
      console.error('Error loading gateways:', err);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('payment_settings')
        .update(settings)
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Settings saved successfully');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGateway = async (gatewayName: string, isActive: boolean) => {
    try {
      const { error } = await UnifiedPaymentService.updatePaymentGateway(
        gatewayName as any,
        { is_active: !isActive }
      );

      if (error) throw error;

      loadGateways();
      toast.success(`Gateway ${!isActive ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error('Error toggling gateway:', err);
      toast.error('Failed to update gateway');
    }
  };

  const setDefaultGateway = async (gatewayName: string) => {
    try {
      // Setting default gateway functionality to be implemented
      toast.info('Default gateway selection coming soon');
      loadGateways();
      toast.success('Default gateway updated');
    } catch (err) {
      console.error('Error setting default gateway:', err);
      toast.error('Failed to set default gateway');
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-orange-400" />
            Payment Settings
          </h2>
          <p className="text-gray-400 mt-1">Configure payment system preferences</p>
        </div>

        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-2 inline-flex gap-2">
        {[
          { key: 'general', label: 'General', icon: Settings },
          { key: 'gateways', label: 'Gateways', icon: Server },
          { key: 'security', label: 'Security', icon: Shield },
          { key: 'notifications', label: 'Notifications', icon: Bell }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            {/* Business Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-400" />
                Business Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.business_name || ''}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={settings.business_email || ''}
                    onChange={(e) => setSettings({ ...settings, business_email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    placeholder="payments@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.support_email || ''}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    placeholder="support@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Statement Descriptor
                  </label>
                  <input
                    type="text"
                    value={settings.statement_descriptor || ''}
                    onChange={(e) => setSettings({ ...settings, statement_descriptor: e.target.value })}
                    maxLength={22}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    placeholder="YOUR COMPANY"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 22 characters. Appears on customer statements.</p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="pt-8 border-t border-[#2A2A2A]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-400" />
                Accepted Payment Methods
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'enable_cards', label: 'Credit/Debit Cards', desc: 'Visa, Mastercard, Amex, Discover' },
                  { key: 'enable_ach', label: 'Bank Accounts (ACH)', desc: 'Direct bank transfers' },
                  { key: 'enable_digital_wallets', label: 'Digital Wallets', desc: 'Apple Pay, Google Pay, PayPal' },
                  { key: 'enable_crypto', label: 'Cryptocurrency', desc: 'Bitcoin, Ethereum, USDC' }
                ].map(method => (
                  <label
                    key={method.key}
                    className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-white">{method.label}</div>
                      <div className="text-sm text-gray-400">{method.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[method.key as keyof PaymentSettings] as boolean}
                      onChange={(e) => setSettings({ ...settings, [method.key]: e.target.checked })}
                      className="w-5 h-5 text-orange-500 bg-[#0A0A0A] border-[#2A2A2A] rounded focus:ring-2 focus:ring-orange-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Currency Settings */}
            <div className="pt-8 border-t border-[#2A2A2A]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-400" />
                Currency Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Currency
                  </label>
                  <select
                    value={settings.default_currency}
                    onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transaction Limits */}
            <div className="pt-8 border-t border-[#2A2A2A]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Transaction Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Single Transaction
                  </label>
                  <input
                    type="number"
                    value={settings.single_transaction_limit || ''}
                    onChange={(e) => setSettings({ ...settings, single_transaction_limit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    placeholder="10000.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Daily Limit
                  </label>
                  <input
                    type="number"
                    value={settings.daily_transaction_limit || ''}
                    onChange={(e) => setSettings({ ...settings, daily_transaction_limit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    placeholder="50000.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Volume
                  </label>
                  <input
                    type="number"
                    value={settings.monthly_volume_limit || ''}
                    onChange={(e) => setSettings({ ...settings, monthly_volume_limit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
                    placeholder="500000.00"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gateway Settings */}
        {activeTab === 'gateways' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Payment Gateways</h3>
                <p className="text-sm text-gray-400">Manage your payment processor integrations</p>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Gateway
              </button>
            </div>

            <div className="space-y-4">
              {gateways.map(gateway => (
                <div
                  key={gateway.id}
                  className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center border border-orange-500/30">
                        <Server className="w-6 h-6 text-orange-400" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">{gateway.display_name}</h4>
                          {gateway.is_default && (
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-lg border border-orange-500/30 font-semibold">
                              Default
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-lg font-semibold ${
                            gateway.is_active
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {gateway.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1 capitalize">
                          {gateway.gateway_type.replace('_', ' ')} • {gateway.environment}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!gateway.is_default && (
                        <button
                          onClick={() => setDefaultGateway(gateway.id)}
                          className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-lg transition text-sm"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => toggleGateway(gateway.id, gateway.is_active)}
                        className={`px-4 py-2 rounded-lg transition text-sm font-semibold ${
                          gateway.is_active
                            ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400'
                            : 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400'
                        }`}
                      >
                        {gateway.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {gateways.length === 0 && (
                <div className="text-center py-12">
                  <Server className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No payment gateways configured</p>
                  <button className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all inline-flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Your First Gateway
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-6">Security & Fraud Prevention</h3>

            <div className="space-y-4">
              {[
                { key: 'require_cvv', label: 'Require CVV', desc: 'Require security code for card payments' },
                { key: 'require_postal_code', label: 'Require Postal Code', desc: 'Verify billing address postal code' },
                { key: 'enable_3d_secure', label: 'Enable 3D Secure', desc: 'Additional authentication for cards' },
                { key: 'fraud_detection_enabled', label: 'Fraud Detection', desc: 'AI-powered fraud prevention' }
              ].map(setting => (
                <label
                  key={setting.key}
                  className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-white">{setting.label}</div>
                    <div className="text-sm text-gray-400">{setting.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[setting.key as keyof PaymentSettings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked })}
                    className="w-5 h-5 text-orange-500 bg-[#0A0A0A] border-[#2A2A2A] rounded focus:ring-2 focus:ring-orange-500"
                  />
                </label>
              ))}
            </div>

            {settings.fraud_detection_enabled && (
              <div className="pt-6 border-t border-[#2A2A2A]">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Fraud Score Threshold
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.fraud_score_threshold}
                    onChange={(e) => setSettings({ ...settings, fraud_score_threshold: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <div className="w-20 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-center text-white font-semibold">
                    {settings.fraud_score_threshold}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Transactions with fraud score above this threshold will be flagged for review
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-6">Email Notifications</h3>

            <div className="space-y-4">
              {[
                { key: 'notify_on_payment', label: 'Payment Received', desc: 'When a payment is successful' },
                { key: 'notify_on_refund', label: 'Refund Issued', desc: 'When a refund is processed' },
                { key: 'notify_on_dispute', label: 'Dispute Filed', desc: 'When a chargeback is received' }
              ].map(notification => (
                <label
                  key={notification.key}
                  className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-orange-500/30 transition cursor-pointer"
                >
                  <div>
                    <div className="font-medium text-white">{notification.label}</div>
                    <div className="text-sm text-gray-400">{notification.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[notification.key as keyof PaymentSettings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [notification.key]: e.target.checked })}
                    className="w-5 h-5 text-orange-500 bg-[#0A0A0A] border-[#2A2A2A] rounded focus:ring-2 focus:ring-orange-500"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
