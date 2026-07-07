/**
 * Owner Controls Panel
 * 
 * Comprehensive owner management dashboard:
 * - Payment Configuration
 * - Role & User Management
 * - Company Settings
 * - Theme Management
 * - Module Management
 * - Security & Backup
 * - System Configuration
 */

import { useState } from 'react';
import {
  Crown, X, Wallet, Shield, Users, Building2, Sparkles, Layers,
  Lock, Archive, Settings, Globe, CreditCard, Key, FileText,
  Activity, AlertTriangle, BarChart3, Save, RefreshCw, Copy,
  Info, Check, Plus, ChevronRight, DollarSign, Coins, Link,
  ExternalLink, AlertCircle, CheckCircle2, Eye, EyeOff, Download,
  Upload, Zap, Database, Server, Cloud, Bell, Mail, Smartphone,
  Palette, Type, Layout, Monitor, Sun, Moon, Star, TrendingUp, Trash2, Gift
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import StellarWalletManager from './StellarWalletManager';
import RoleManagementSystem from './RoleManagementSystem';
import AdminAlertsSystem from './AdminAlertsSystem';
import PaymentAIAssistant from './payment/PaymentAIAssistant';
import BusinessProfilesHub from './BusinessProfilesHub';
import { PrimaryButton } from './ui/button/PrimaryButton';
import PaymentSettings from './payment/PaymentSettings';
import CompanyProfileManager from './CompanyProfileManager';
import ThemeManager from '../pages/ThemeManager';
import CodeTracker from '../pages/CodeTracker';
import WorkflowControls from '../pages/WorkflowControls';
import DataCleanupUtility from './DataCleanupUtility';
import OwnerGiftManagement from './OwnerGiftManagement';

interface OwnerControlsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  companyLogo?: string;
}

export default function OwnerControlsPanel({ isOpen, onClose, companyName, companyLogo }: OwnerControlsPanelProps) {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'company' | 'theme' | 'modules' | 'security' | 'settings' | 'wallet' | 'alerts'>('alerts');
  const [companySubTab, setCompanySubTab] = useState<'profile' | 'profiles' | 'payments'>('profile');
  const [settingsSubTab, setSettingsSubTab] = useState<'theme' | 'coding' | 'workflow' | 'cleanup'>('theme');
  const [showGiftManagement, setShowGiftManagement] = useState(false);

  // Payment Configuration State
  const [paymentConfig, setPaymentConfig] = useState({
    stripe: { enabled: true, apiKey: 'sk_test_...', publishableKey: 'pk_test_...', status: 'active' },
    paypal: { enabled: true, clientId: 'AXz...', clientSecret: '***', status: 'active' },
    square: { enabled: false, accessToken: '', locationId: '', status: 'inactive' },
    stellar: { enabled: true, publicKey: 'GBXYZ...', secretKey: '***', status: 'active' },
    xdc: { enabled: true, walletAddress: '0xA1B2...', privateKey: '***', status: 'active' },
    solana: { enabled: false, walletAddress: '', privateKey: '', status: 'inactive' },
    xrp: { enabled: true, walletAddress: 'rXYZ...', secret: '***', status: 'active' },
    quant: { enabled: false, walletAddress: '', apiKey: '', status: 'inactive' }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] rounded-3xl border-2 border-orange-500/30 w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-orange-500/20">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-600 via-orange-600 to-orange-700 p-6 border-b border-orange-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Company Logo */}
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <Crown className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  {companyName}
                  <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 text-xs">
                    Owner Controls
                  </div>
                </h1>
                <p className="text-white/80 text-sm">Complete system configuration and management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Executive Dashboard Button */}
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/owners-dashboard';
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-white to-white/90 hover:from-white/90 hover:to-white text-orange-600 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg border-2 border-white/30"
              >
                <BarChart3 className="w-4 h-4" />
                Executive Dashboard
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white transition border border-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
            {[
              { id: 'alerts', label: 'Admin Alerts', icon: Bell, badge: 8 },
              { id: 'wallet', label: 'Stellar Wallet', icon: Star },
              { id: 'roles', label: 'Roles', icon: Shield },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'company', label: 'Business Hub', icon: Building2 },
              { id: 'modules', label: 'Modules', icon: Layers },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'settings', label: 'Tools & Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 whitespace-nowrap relative ${
                    activeTab === tab.id
                      ? 'bg-white text-orange-600 shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id 
                        ? 'bg-red-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Executive Dashboard Promotion Banner */}
          <div className="mb-6 p-6 bg-gradient-to-r from-orange-600/20 via-orange-500/10 to-transparent rounded-2xl border-2 border-orange-500/30 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">Executive Dashboard</h3>
                    <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                      NEW
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    📊 Profit & Loss Charts • 💰 Revenue Analytics • 🏢 Company Performance • 📈 Growth Trends
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/owners-dashboard';
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg"
              >
                <TrendingUp className="w-5 h-5" />
                Open Dashboard
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Gift Management Quick Access */}
          <div className=\"mb-6 p-6 bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-transparent rounded-2xl border-2 border-purple-500/30 shadow-xl\">
            <div className=\"flex items-center justify-between\">
              <div className=\"flex items-center gap-4\">
                <div className=\"w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg\">
                  <Gift className=\"w-7 h-7 text-white\" />
                </div>
                <div>
                  <div className=\"flex items-center gap-2 mb-1\">
                    <h3 className=\"text-xl font-bold text-white\">Gift Management System</h3>
                    <span className=\"px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs font-bold rounded-full border border-purple-500/30\">
                      OWNER
                    </span>
                  </div>
                  <p className=\"text-gray-400 text-sm\">
                    🎁 Gift Hours • 👑 Subscriptions • 🔧 Plans • 📢 Ad Space • ⚡ Features • 💰 Credits & More
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGiftManagement(true)}
                className=\"px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg\"
              >
                <Gift className=\"w-5 h-5\" />
                Open Gift Manager
                <ChevronRight className=\"w-5 h-5\" />
              </button>
            </div>
          </div>

          {/* Payment Setup Tab - Moved to Business Hub > Payment Settings */}
          {false && activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Quick Info Banner */}
              <div className="p-4 bg-gradient-to-r from-orange-600/10 to-orange-500/5 rounded-xl border border-orange-500/30">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-orange-400 mb-1">Enterprise Payment Infrastructure</p>
                      <button
                        onClick={() => window.location.href = '/unified-payment-center'}
                        className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs font-semibold transition-all border border-orange-500/30"
                      >
                        Open Full Dashboard →
                      </button>
                    </div>
                    <p className="text-xs text-gray-300">
                      Complete payment management system with AI automation, multi-gateway support, and PCI-DSS compliance. Configure gateways below or access the full dashboard for advanced features.
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Assistant Integration */}
              <PaymentAIAssistant />

              {/* Quick Payment Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-xs font-semibold text-green-400">SUCCESS RATE</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">98.5%</p>
                  <p className="text-xs text-gray-400">Last 30 days</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400">TRANSACTIONS</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">1,247</p>
                  <p className="text-xs text-gray-400">This month</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-5 h-5 text-orange-400" />
                    <span className="text-xs font-semibold text-orange-400">VOLUME</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">$84.2K</p>
                  <p className="text-xs text-gray-400">This month</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400">AVG FEE</span>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">1.8%</p>
                  <p className="text-xs text-gray-400">All gateways</p>
                </div>
              </div>

              {/* Traditional Payment Gateways */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-400" />
                    Traditional Payment Gateways
                  </h2>
                  <button className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition border border-green-500/30 text-xs flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Add Gateway
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Stripe */}
                  <div className={`p-4 rounded-xl border-2 transition ${
                    paymentConfig.stripe.enabled 
                      ? 'bg-green-600/5 border-green-500/30' 
                      : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">💳</div>
                        <div>
                          <h3 className="font-bold text-white text-sm">Stripe</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              paymentConfig.stripe.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs ${
                              paymentConfig.stripe.status === 'active' ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {paymentConfig.stripe.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentConfig.stripe.enabled}
                          onChange={(e) => {
                            setPaymentConfig(prev => ({
                              ...prev,
                              stripe: { ...prev.stripe, enabled: e.target.checked, status: e.target.checked ? 'active' : 'inactive' }
                            }));
                            toast.success(`Stripe ${e.target.checked ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>

                    {paymentConfig.stripe.enabled && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">API Key</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="password"
                              value={paymentConfig.stripe.apiKey}
                              readOnly
                              className="flex-1 px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs"
                              placeholder="sk_live_..."
                            />
                            <button className="p-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:border-orange-500/30 transition">
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-1 pt-1">
                          <button
                            onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                            className="px-2 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition text-xs flex items-center justify-center gap-1 border border-purple-500/30"
                            title="Open Stripe Dashboard"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toast.success('Stripe configuration saved!')}
                            className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs flex items-center justify-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:border-orange-500/30 transition text-xs flex items-center justify-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PayPal */}
                  <div className={`p-4 rounded-xl border-2 transition ${
                    paymentConfig.paypal.enabled 
                      ? 'bg-blue-600/5 border-blue-500/30' 
                      : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">💰</div>
                        <div>
                          <h3 className="font-bold text-white text-sm">PayPal</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              paymentConfig.paypal.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs ${
                              paymentConfig.paypal.status === 'active' ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {paymentConfig.paypal.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentConfig.paypal.enabled}
                          onChange={(e) => {
                            setPaymentConfig(prev => ({
                              ...prev,
                              paypal: { ...prev.paypal, enabled: e.target.checked, status: e.target.checked ? 'active' : 'inactive' }
                            }));
                            toast.success(`PayPal ${e.target.checked ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {paymentConfig.paypal.enabled && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">Client ID</label>
                          <input
                            type="text"
                            value={paymentConfig.paypal.clientId}
                            readOnly
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs"
                            placeholder="AXz..."
                          />
                        </div>

                        <div className="flex gap-1 pt-1">
                          <button
                            onClick={() => window.open('https://developer.paypal.com/dashboard', '_blank')}
                            className="px-2 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition text-xs flex items-center justify-center gap-1 border border-purple-500/30"
                            title="Open PayPal Developer Dashboard"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toast.success('PayPal configuration saved!')}
                            className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs flex items-center justify-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:border-orange-500/30 transition text-xs flex items-center justify-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Square */}
                  <div className={`p-4 rounded-xl border-2 transition ${
                    paymentConfig.square.enabled 
                      ? 'bg-purple-600/5 border-purple-500/30' 
                      : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">⬛</div>
                        <div>
                          <h3 className="font-bold text-white text-sm">Square</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              paymentConfig.square.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs ${
                              paymentConfig.square.status === 'active' ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {paymentConfig.square.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentConfig.square.enabled}
                          onChange={(e) => {
                            setPaymentConfig(prev => ({
                              ...prev,
                              square: { ...prev.square, enabled: e.target.checked, status: e.target.checked ? 'active' : 'inactive' }
                            }));
                            toast.success(`Square ${e.target.checked ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {paymentConfig.square.enabled && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">Access Token</label>
                          <input
                            type="password"
                            placeholder="Enter token"
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs"
                          />
                        </div>

                        <div className="flex gap-1 pt-1">
                          <button
                            onClick={() => window.open('https://squareup.com/dashboard', '_blank')}
                            className="px-2 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition text-xs flex items-center justify-center gap-1 border border-purple-500/30"
                            title="Open Square Dashboard"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs flex items-center justify-center gap-1">
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:border-orange-500/30 transition text-xs flex items-center justify-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Blockchain Networks */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-blue-400" />
                    Blockchain Payment Networks (ISO20022)
                  </h2>
                  <div className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 text-xs font-semibold">
                    Ultra-Low Fees
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Stellar */}
                  <div className={`p-4 rounded-xl border-2 transition ${
                    paymentConfig.stellar.enabled 
                      ? 'bg-orange-600/5 border-orange-500/30' 
                      : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">⭐</div>
                        <div>
                          <h3 className="font-bold text-white text-sm">Stellar</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              paymentConfig.stellar.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs ${
                              paymentConfig.stellar.status === 'active' ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {paymentConfig.stellar.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentConfig.stellar.enabled}
                          onChange={(e) => {
                            setPaymentConfig(prev => ({
                              ...prev,
                              stellar: { ...prev.stellar, enabled: e.target.checked, status: e.target.checked ? 'active' : 'inactive' }
                            }));
                            toast.success(`Stellar ${e.target.checked ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                      </label>
                    </div>

                    {paymentConfig.stellar.enabled && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">Public Key</label>
                          <input
                            type="text"
                            value={paymentConfig.stellar.publicKey}
                            readOnly
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs font-mono"
                            placeholder="GBXYZ..."
                          />
                        </div>

                        <div className="p-2 bg-orange-600/10 rounded-lg border border-orange-500/30">
                          <p className="text-xs text-orange-300">⚡ ~$0.00001 per transaction</p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => window.open('https://stellar.expert', '_blank')}
                            className="px-2 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition text-xs flex items-center justify-center gap-1 border border-purple-500/30"
                            title="Open Stellar Explorer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <PrimaryButton
                            onClick={() => toast.success('Stellar configuration saved!')}
                            size="xs"
                            icon={<Save className="w-3 h-3" />}
                            className="flex-1"
                          >
                            Save
                          </PrimaryButton>
                          <button className="flex-1 px-2 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:border-orange-500/30 transition text-xs flex items-center justify-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* XDC */}
                  <div className={`p-4 rounded-xl border-2 transition ${
                    paymentConfig.xdc.enabled 
                      ? 'bg-blue-600/5 border-blue-500/30' 
                      : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">🔷</div>
                        <div>
                          <h3 className="font-bold text-white text-sm">XDC Network</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              paymentConfig.xdc.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs ${
                              paymentConfig.xdc.status === 'active' ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {paymentConfig.xdc.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentConfig.xdc.enabled}
                          onChange={(e) => {
                            setPaymentConfig(prev => ({
                              ...prev,
                              xdc: { ...prev.xdc, enabled: e.target.checked, status: e.target.checked ? 'active' : 'inactive' }
                            }));
                            toast.success(`XDC ${e.target.checked ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {paymentConfig.xdc.enabled && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">Wallet Address</label>
                          <input
                            type="text"
                            value={paymentConfig.xdc.walletAddress}
                            readOnly
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs font-mono"
                            placeholder="0x..."
                          />
                        </div>

                        <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/30">
                          <p className="text-xs text-blue-300">🚀 Enterprise B2B payments</p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => window.open('https://xdc.network', '_blank')}
                            className="px-2 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition text-xs flex items-center justify-center gap-1 border border-purple-500/30"
                            title="Open XDC Network"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs flex items-center justify-center gap-1">
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:border-orange-500/30 transition text-xs flex items-center justify-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* XRP */}
                  <div className={`p-4 rounded-xl border-2 transition ${
                    paymentConfig.xrp.enabled 
                      ? 'bg-purple-600/5 border-purple-500/30' 
                      : 'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">💎</div>
                        <div>
                          <h3 className="font-bold text-white text-sm">XRP Ledger</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              paymentConfig.xrp.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs ${
                              paymentConfig.xrp.status === 'active' ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {paymentConfig.xrp.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentConfig.xrp.enabled}
                          onChange={(e) => {
                            setPaymentConfig(prev => ({
                              ...prev,
                              xrp: { ...prev.xrp, enabled: e.target.checked, status: e.target.checked ? 'active' : 'inactive' }
                            }));
                            toast.success(`XRP ${e.target.checked ? 'enabled' : 'disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {paymentConfig.xrp.enabled && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">Wallet Address</label>
                          <input
                            type="text"
                            value={paymentConfig.xrp.walletAddress}
                            readOnly
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs font-mono"
                            placeholder="rXYZ..."
                          />
                        </div>

                        <div className="p-2 bg-purple-600/10 rounded-lg border border-purple-500/30">
                          <p className="text-xs text-purple-300">🏦 Banking-grade</p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => window.open('https://xrpscan.com', '_blank')}
                            className="px-2 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition text-xs flex items-center justify-center gap-1 border border-purple-500/30"
                            title="Open XRP Ledger Explorer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs flex items-center justify-center gap-1">
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button className="flex-1 px-2 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg hover:border-orange-500/30 transition text-xs flex items-center justify-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-gray-400">Active Methods</span>
                  </div>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
                <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-5 h-5 text-orange-400" />
                    <span className="text-xs text-gray-400">Avg. Fee</span>
                  </div>
                  <p className="text-2xl font-bold text-white">0.5%</p>
                </div>
                <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-gray-400">This Month</span>
                  </div>
                  <p className="text-2xl font-bold text-white">247</p>
                </div>
              </div>

              {/* Full Payment Hub Access */}
              <div className="bg-gradient-to-br from-orange-600/10 via-orange-500/5 to-transparent border border-orange-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Need More Features?</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Access the full Payment Hub for advanced features including transaction management, 
                      subscription billing, refund processing, analytics, and more.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-300 mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Complete transaction history & search
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Subscription & recurring billing management
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Advanced analytics & reporting
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Multi-currency support & exchange rates
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Refund & dispute management
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => window.location.href = '/unified-payment-center'}
                      className="px-8 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl transition-all shadow-lg shadow-orange-500/30 font-semibold flex items-center gap-2 whitespace-nowrap"
                    >
                      <Wallet className="w-5 h-5" />
                      Open Payment Hub
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-center text-gray-500">
                      Opens in main application
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Alerts Tab */}
          {activeTab === 'alerts' && (
            <AdminAlertsSystem companyName={companyName} />
          )}

          {/* Other tabs - Placeholder content */}
          {activeTab === 'wallet' && (
            <StellarWalletManager companyName={companyName} />
          )}

          {activeTab === 'roles' && (
            <RoleManagementSystem companyName={companyName} />
          )}

          {activeTab === 'users' && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">User Management</h3>
              <p className="text-gray-400">Manage users and access control</p>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-6">
              {/* Sub-tabs for Business Hub */}
              <div className="flex items-center gap-2 border-b border-[#2A2A2A] pb-4">
                {[
                  { id: 'profile', label: 'Company Profile & Documents', icon: Building2 },
                  { id: 'profiles', label: 'Multi-Company Manager', icon: Layers },
                  { id: 'payments', label: 'Payment Settings', icon: CreditCard }
                ].map((subTab) => {
                  const Icon = subTab.icon;
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setCompanySubTab(subTab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        companySubTab === subTab.id
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {subTab.label}
                    </button>
                  );
                })}
              </div>

              {/* Sub-tab content */}
              {companySubTab === 'profile' && <CompanyProfileManager />}
              {companySubTab === 'profiles' && <BusinessProfilesHub />}
              {companySubTab === 'payments' && <PaymentSettings />}
            </div>
          )}



          {activeTab === 'modules' && (
            <div className="text-center py-12">
              <Layers className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Module Manager</h3>
              <p className="text-gray-400">Enable/disable application modules</p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Security Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl">
                      <Shield className="w-7 h-7 text-red-400" />
                    </div>
                    Enterprise Security Hub
                  </h2>
                  <p className="text-gray-400">Real-time threat monitoring, AI security, and compliance management</p>
                </div>
                <button
                  onClick={() => window.open('/security-hub', '_blank')}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-500/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Full Security Hub
                </button>
              </div>

              {/* Critical Alerts Banner */}
              <div className="p-4 bg-gradient-to-r from-red-500/20 to-orange-500/10 border border-red-500/50 rounded-xl flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1 animate-pulse" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-400 mb-1">2 Active Security Threats Detected</h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Immediate attention required. Review threats and take action to protect your system.
                  </p>
                  <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition">
                    View Threats →
                  </button>
                </div>
              </div>

              {/* Key Security Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Threat Level */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg">
                      <Activity className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-1">THREAT LEVEL</p>
                      <p className="text-2xl font-bold text-orange-400">35</p>
                    </div>
                  </div>
                  <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all" style={{ width: '35%' }}></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Moderate - Monitor Closely</p>
                </div>

                {/* Blocked Attempts */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-1">BLOCKED TODAY</p>
                      <p className="text-2xl font-bold text-blue-400">247</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Malicious attempts prevented</p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <span className="text-xs text-green-400">+23% from yesterday</span>
                  </div>
                </div>

                {/* AI Predictions */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-1">AI INSIGHTS</p>
                      <p className="text-2xl font-bold text-purple-400">1,284</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Predictions today</p>
                  <div className="flex items-center gap-1 mt-2">
                    <CheckCircle2 className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">98.5% accuracy</span>
                  </div>
                </div>

                {/* Compliance Score */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-1">COMPLIANCE</p>
                      <p className="text-2xl font-bold text-green-400">98%</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">All standards</p>
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">PCI-DSS, ISO 20022</span>
                  </div>
                </div>
              </div>

              {/* Security Features Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Authentication & Access */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-orange-400" />
                    Authentication & Access Control
                  </h3>
                  <div className="space-y-3">
                    {/* MFA Status */}
                    <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <Shield className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">Multi-Factor Authentication</h4>
                            <p className="text-xs text-gray-400">8 authentication methods active</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-xs text-green-400 font-semibold">ACTIVE</span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span>TOTP</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span>SMS</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span>Email</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span>Biometric</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span>Hardware Keys</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          <span>SSO (SAML)</span>
                        </div>
                      </div>
                    </div>

                    {/* SSO Configuration */}
                    <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Globe className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">Single Sign-On (SSO)</h4>
                            <p className="text-xs text-gray-400">3 providers configured</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition">
                          Configure
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <div className="px-2 py-1 bg-[#0A0A0A] rounded border border-[#2A2A2A] text-gray-400">Okta</div>
                        <div className="px-2 py-1 bg-[#0A0A0A] rounded border border-[#2A2A2A] text-gray-400">Azure AD</div>
                        <div className="px-2 py-1 bg-[#0A0A0A] rounded border border-[#2A2A2A] text-gray-400">Google</div>
                      </div>
                    </div>

                    {/* RBAC */}
                    <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Users className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">Role-Based Access Control</h4>
                            <p className="text-xs text-gray-400">6 role levels, 247 permissions</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs transition">
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Security & Monitoring */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    AI Security & Monitoring
                  </h3>
                  <div className="space-y-3">
                    {/* AI Models */}
                    <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white text-sm mb-1">AI Security Models</h4>
                          <p className="text-xs text-gray-400">4 models deployed, 98.5% avg accuracy</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">FraudGuard (LSTM)</span>
                          <span className="text-green-400 font-semibold">98.5%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">IntrusionShield (RF)</span>
                          <span className="text-green-400 font-semibold">97.8%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">AnomalyDetector (IF)</span>
                          <span className="text-green-400 font-semibold">96.2%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">BehaviorAnalyzer (NN)</span>
                          <span className="text-green-400 font-semibold">95.7%</span>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Monitoring */}
                    <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-500/20 rounded-lg">
                            <Activity className="w-4 h-4 text-orange-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">Real-time Monitoring</h4>
                            <p className="text-xs text-gray-400">Events, threats, incidents</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-xs text-green-400 font-semibold">LIVE</span>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-[#0A0A0A] rounded">
                          <p className="text-white font-bold">1,847</p>
                          <p className="text-gray-400 text-[10px]">Events Today</p>
                        </div>
                        <div className="text-center p-2 bg-[#0A0A0A] rounded">
                          <p className="text-red-400 font-bold">2</p>
                          <p className="text-gray-400 text-[10px]">Active Threats</p>
                        </div>
                        <div className="text-center p-2 bg-[#0A0A0A] rounded">
                          <p className="text-orange-400 font-bold">1</p>
                          <p className="text-gray-400 text-[10px]">Incidents</p>
                        </div>
                      </div>
                    </div>

                    {/* Audit Trail */}
                    <div className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/20 rounded-lg">
                            <FileText className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">Audit Trail</h4>
                            <p className="text-xs text-gray-400">7-year retention, immutable logs</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs transition">
                          View Logs
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Status */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Compliance Standards
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { name: 'PCI-DSS', score: 100, color: 'green' },
                    { name: 'ISO 20022', score: 100, color: 'green' },
                    { name: 'Apple Store', score: 100, color: 'green' },
                    { name: 'GDPR', score: 98, color: 'green' },
                    { name: 'CCPA', score: 100, color: 'green' },
                    { name: 'SOX', score: 100, color: 'green' }
                  ].map((standard) => (
                    <div key={standard.name} className="p-3 bg-[#1A1A1A] rounded-xl border border-green-500/30 text-center">
                      <div className="mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                      </div>
                      <h4 className="font-bold text-white text-xs mb-1">{standard.name}</h4>
                      <p className="text-xl font-bold text-green-400">{standard.score}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Security Events */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    Recent Security Events
                  </h3>
                  <button className="text-xs text-orange-400 hover:text-orange-300 transition">
                    View All →
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      time: '2 min ago',
                      type: 'Blocked',
                      description: 'Brute force login attempt from 192.168.1.100',
                      severity: 'high',
                      icon: Shield
                    },
                    {
                      time: '15 min ago',
                      type: 'AI Alert',
                      description: 'Suspicious transaction pattern detected ($50,000)',
                      severity: 'critical',
                      icon: AlertTriangle
                    },
                    {
                      time: '1 hour ago',
                      type: 'Success',
                      description: 'MFA enabled for user john@example.com',
                      severity: 'info',
                      icon: CheckCircle2
                    },
                    {
                      time: '2 hours ago',
                      type: 'Warning',
                      description: 'Unusual login location detected for admin user',
                      severity: 'warning',
                      icon: AlertCircle
                    }
                  ].map((event, index) => (
                    <div key={index} className="p-3 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-orange-500/30 transition flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        event.severity === 'critical' ? 'bg-red-500/20' :
                        event.severity === 'high' ? 'bg-orange-500/20' :
                        event.severity === 'warning' ? 'bg-yellow-500/20' :
                        'bg-blue-500/20'
                      }`}>
                        <event.icon className={`w-4 h-4 ${
                          event.severity === 'critical' ? 'text-red-400' :
                          event.severity === 'high' ? 'text-orange-400' :
                          event.severity === 'warning' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${
                            event.severity === 'critical' ? 'text-red-400' :
                            event.severity === 'high' ? 'text-orange-400' :
                            event.severity === 'warning' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`}>
                            {event.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">{event.time}</span>
                        </div>
                        <p className="text-sm text-gray-300">{event.description}</p>
                      </div>
                      <button className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs transition">
                        Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition text-left">
                  <Key className="w-6 h-6 text-blue-400 mb-3" />
                  <h4 className="font-bold text-white text-sm mb-1">Configure MFA</h4>
                  <p className="text-xs text-gray-400">Set up multi-factor authentication for users</p>
                </button>

                <button className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition text-left">
                  <Users className="w-6 h-6 text-purple-400 mb-3" />
                  <h4 className="font-bold text-white text-sm mb-1">Manage RBAC</h4>
                  <p className="text-xs text-gray-400">Configure roles and permissions</p>
                </button>

                <button className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl hover:border-green-500/50 transition text-left">
                  <FileText className="w-6 h-6 text-green-400 mb-3" />
                  <h4 className="font-bold text-white text-sm mb-1">Compliance Reports</h4>
                  <p className="text-xs text-gray-400">Generate and export compliance reports</p>
                </button>
              </div>

              {/* System Status */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-green-400" />
                  System Health
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Servers', status: 'Operational', icon: Server },
                    { name: 'Database', status: 'Healthy', icon: Database },
                    { name: 'Cloud Services', status: '99.99% uptime', icon: Cloud },
                    { name: 'Encryption', status: 'Active', icon: Lock }
                  ].map((system) => (
                    <div key={system.name} className="p-3 bg-[#1A1A1A] rounded-xl border border-green-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <system.icon className="w-4 h-4 text-green-400" />
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <h4 className="font-semibold text-white text-xs mb-1">{system.name}</h4>
                      <p className="text-xs text-gray-400">{system.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Sub-tabs for Tools & Settings */}
              <div className="flex items-center gap-2 border-b border-[#2A2A2A] pb-4">
                {[
                  { id: 'theme', label: 'Theme Manager', icon: Palette },
                  { id: 'coding', label: 'Coding & Tracking', icon: BarChart3 },
                  { id: 'workflow', label: 'Workflow Controls', icon: Activity },
                  { id: 'cleanup', label: 'Data Cleanup', icon: Database }
                ].map((subTab) => {
                  const Icon = subTab.icon;
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setSettingsSubTab(subTab.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        settingsSubTab === subTab.id
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {subTab.label}
                    </button>
                  );
                })}
              </div>

              {/* Sub-tab content */}
              {settingsSubTab === 'theme' && <ThemeManager />}
              {settingsSubTab === 'coding' && <CodeTracker />}
              {settingsSubTab === 'workflow' && <WorkflowControls />}
              {settingsSubTab === 'cleanup' && <DataCleanupUtility />}
            </div>
          )}
        </div>
      </div>

      {/* Gift Management Modal */}
      {showGiftManagement && (
        <OwnerGiftManagement
          onClose={() => setShowGiftManagement(false)}
        />
      )}
    </div>
  );
}
