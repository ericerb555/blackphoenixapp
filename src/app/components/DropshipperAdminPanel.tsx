/**
 * Dropshipper Admin Panel - Advanced Background Management Interface
 * Enterprise-grade dropshipper integration with AI-powered features
 */

import { useState, useEffect } from 'react';
import { 
  Package, Settings, RefreshCw, AlertCircle, CheckCircle, Clock,
  TrendingUp, Box, Truck, Activity, Eye, EyeOff, Plus, Trash2, Edit,
  PlayCircle, PauseCircle, Database, Link2, Zap, ShoppingCart, Download,
  Brain, DollarSign, BarChart3, Target, Webhook, FileDown, FileUp,
  Sparkles, GitBranch, Shuffle, Filter, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { TextInput, Select, NumberInput, ToggleSwitch } from './ui/input/index';
import { StandardButton } from './ui/button';
import ProductCatalogBrowser from './ProductCatalogBrowser';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function secureHeaders(contentType = false) {
  const { supabase } = await import('../lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token || publicAnonKey}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) };
}

interface DropshipperProvider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
  syncInventory: boolean;
  autoForwardOrders: boolean;
  syncInterval: number;
  settings: {
    markupPercentage?: number;
    fulfillmentTime?: number;
    shippingMethods?: string[];
  };
}

interface DropshipperConfig {
  enabled: boolean;
  providers: DropshipperProvider[];
  lastSync?: string;
}

export default function DropshipperAdminPanel() {
  const [config, setConfig] = useState<DropshipperConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'catalog' | 'inventory' | 'orders' | 'errors'>('overview');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [stats, setStats] = useState({ inventory: 0, orders: 0, errors: 0 });

  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/dropshipper/config`, {
        headers: await secureHeaders()
      });
      
      if (!response.ok) {
        console.log('[DropshipperAdmin] Config not found, initializing...');
        // Initialize dropshipper config
        await initializeDropshipper();
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        // Guard against a config payload missing the providers array — a
        // non-array here would crash every .filter/.some/.map in render.
        setConfig({ ...data.config, providers: Array.isArray(data.config?.providers) ? data.config.providers : [] });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      // Silently fail - don't show toast on initial load
    } finally {
      setLoading(false);
    }
  };

  const initializeDropshipper = async () => {
    try {
      const response = await fetch(`${API_URL}/dropshipper/initialize`, {
        method: 'POST',
        headers: {
          ...(await secureHeaders(true)),
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[DropshipperAdmin] Initialized:', data.message);
        setConfig({ ...data.config, providers: Array.isArray(data.config?.providers) ? data.config.providers : [] });
      }
    } catch (error) {
      console.error('[DropshipperAdmin] Failed to initialize:', error);
    }
  };

  const loadStats = async () => {
    try {
      const [invRes, ordRes, errRes] = await Promise.all([
        fetch(`${API_URL}/dropshipper/inventory`, { headers: await secureHeaders() }),
        fetch(`${API_URL}/dropshipper/orders`, { headers: await secureHeaders() }),
        fetch(`${API_URL}/dropshipper/errors?limit=100`, { headers: await secureHeaders() })
      ]);

      // Check if responses are OK before parsing JSON
      const [invData, ordData, errData] = await Promise.all([
        invRes.ok ? invRes.json().catch(() => ({ total: 0 })) : { total: 0 },
        ordRes.ok ? ordRes.json().catch(() => ({ total: 0 })) : { total: 0 },
        errRes.ok ? errRes.json().catch(() => ({ total: 0 })) : { total: 0 }
      ]);

      setStats({
        inventory: invData.total || 0,
        orders: ordData.total || 0,
        errors: errData.total || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default stats on error
      setStats({ inventory: 0, orders: 0, errors: 0 });
    }
  };

  const toggleModule = async () => {
    if (!config) return;

    try {
      const newEnabled = !config.enabled;
      const response = await fetch(`${API_URL}/dropshipper/toggle`, {
        method: 'POST',
        headers: {
          ...(await secureHeaders(true))
        },
        body: JSON.stringify({ enabled: newEnabled })
      });

      const data = await response.json();
      if (data.success) {
        setConfig({ ...config, enabled: newEnabled });
        toast.success(`Dropshipper module ${newEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      toast.error('Failed to toggle module');
    }
  };

  const syncInventory = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${API_URL}/dropshipper/sync-inventory`, {
        method: 'POST',
        headers: await secureHeaders()
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Synced ${data.synced} products successfully!`);
        await loadStats();
      } else {
        toast.error(`Sync completed with errors: ${data.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error('Failed to sync inventory');
    } finally {
      setSyncing(false);
    }
  };

  const syncTracking = async () => {
    try {
      const response = await fetch(`${API_URL}/dropshipper/sync-tracking`, {
        method: 'POST',
        headers: await secureHeaders()
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Updated ${data.updated} tracking records`);
      }
    } catch (error) {
      toast.error('Failed to sync tracking');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2A2A2A] border-t-[#ea580c] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Dropshipper Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Header */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-[#ea580c]" />
              <h1 className="text-3xl font-bold text-white">Dropshipper Integration</h1>
              {config?.enabled ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-500 text-sm font-semibold rounded-full flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-500/20 text-gray-500 text-sm font-semibold rounded-full flex items-center gap-1">
                  <PauseCircle className="w-4 h-4" />
                  Disabled
                </span>
              )}
            </div>
            <p className="text-gray-400">
              Manage dropshipper providers, inventory sync, and order fulfillment
            </p>
            {config?.lastSync && (
              <p className="text-sm text-gray-500 mt-1">
                Last sync: {new Date(config.lastSync).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={syncInventory}
              disabled={!config?.enabled || syncing}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Inventory
            </button>

            <button
              onClick={syncTracking}
              disabled={!config?.enabled}
              className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck className="w-4 h-4" />
              Sync Tracking
            </button>

            <button
              onClick={toggleModule}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                config?.enabled
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
              }`}
            >
              {config?.enabled ? (
                <>
                  <PauseCircle className="w-4 h-4" />
                  Disable Module
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Enable Module
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Database className="w-8 h-8 text-[#ea580c]" />
            <span className="text-2xl font-bold text-white">{stats.inventory}</span>
          </div>
          <p className="text-gray-400">Synced Products</p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <ShoppingCart className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">{stats.orders}</span>
          </div>
          <p className="text-gray-400">Forwarded Orders</p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Link2 className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-white">{(config?.providers ?? []).filter(p => p.enabled).length || 0}</span>
          </div>
          <p className="text-gray-400">Active Providers</p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold text-white">{stats.errors}</span>
          </div>
          <p className="text-gray-400">Recent Errors</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2 mb-6 flex gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'providers', label: 'Providers', icon: Link2 },
          { id: 'catalog', label: 'Catalog', icon: Box },
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'orders', label: 'Orders', icon: ShoppingCart },
          { id: 'errors', label: 'Error Logs', icon: AlertCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        {activeTab === 'overview' && <OverviewTab config={config} stats={stats} />}
        {activeTab === 'providers' && <ProvidersTab config={config} onRefresh={loadConfig} />}
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'errors' && <ErrorsTab />}
      </div>
    </div>
  );
}

// Tab Components

function OverviewTab({ config, stats }: { config: DropshipperConfig | null; stats: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Module Status</p>
            <p className="text-white font-semibold">
              {config?.enabled ? '✅ Enabled & Running' : '⏸️ Disabled'}
            </p>
          </div>

          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Active Providers</p>
            <p className="text-white font-semibold">
              {(config?.providers ?? []).filter(p => p.enabled).length} / {(config?.providers ?? []).length}
            </p>
          </div>

          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Auto Order Forward</p>
            <p className="text-white font-semibold">
              {(config?.providers ?? []).some(p => p.autoForwardOrders) ? '✅ Enabled' : '❌ Disabled'}
            </p>
          </div>

          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">Last Sync</p>
            <p className="text-white font-semibold">
              {config?.lastSync ? new Date(config.lastSync).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Integration Benefits</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Automatic Inventory Sync</p>
              <p className="text-sm text-gray-400">Products and stock levels sync in the background</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Seamless Order Fulfillment</p>
              <p className="text-sm text-gray-400">Orders automatically forwarded to dropshippers</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Real-time Tracking</p>
              <p className="text-sm text-gray-400">Shipping updates fetched and displayed automatically</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Non-Intrusive Design</p>
              <p className="text-sm text-gray-400">No changes to your existing UI or customer experience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProvidersTab({ config, onRefresh }: { config: DropshipperConfig | null; onRefresh: () => void }) {
  const [showAddModal, setShowAddModal] = useState(false);

  if (!config) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Dropshipper Providers</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {config.providers.length === 0 ? (
        <div className="text-center py-12">
          <Link2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Providers Configured</h3>
          <p className="text-gray-400 mb-6">Add your first dropshipper provider to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all"
          >
            Add Provider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {config.providers.map((provider) => (
            <div key={provider.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
                    {provider.enabled ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-semibold rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-500 text-xs font-semibold rounded">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-4">{provider.apiUrl}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Inventory Sync</p>
                      <p className="text-white">{provider.syncInventory ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Auto Forward Orders</p>
                      <p className="text-white">{provider.autoForwardOrders ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Sync Interval</p>
                      <p className="text-white">{provider.syncInterval} minutes</p>
                    </div>
                    {provider.settings.markupPercentage && (
                      <div>
                        <p className="text-gray-500">Markup</p>
                        <p className="text-white">{provider.settings.markupPercentage}%</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddProviderModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); onRefresh(); }} />
      )}
    </div>
  );
}

function CatalogTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Product Catalog</h2>
      <ProductCatalogBrowser />
    </div>
  );
}

function InventoryTab() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/dropshipper/inventory`, {
        headers: await secureHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setInventory(Array.isArray(data.inventory) ? data.inventory : []);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading inventory...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Synced Inventory ({inventory.length} items)</h2>
      
      {inventory.length === 0 ? (
        <div className="text-center py-12">
          <Box className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No inventory synced yet. Run a sync to import products.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[#2A2A2A]">
              <tr className="text-left text-gray-400 text-sm">
                <th className="pb-3">SKU</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Provider</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Stock</th>
                <th className="pb-3">Last Synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {inventory.map((item) => (
                <tr key={item.sku} className="text-white">
                  <td className="py-3 font-mono text-sm">{item.sku}</td>
                  <td className="py-3">{item.name}</td>
                  <td className="py-3 text-gray-400">{item.providerId}</td>
                  <td className="py-3">${Number(item.price ?? 0).toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.stock > 50 ? 'bg-green-500/20 text-green-500' :
                      item.stock > 10 ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-sm">
                    {new Date(item.lastSynced).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/dropshipper/orders`, {
        headers: await secureHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading orders...</div>;

  const statusColors = {
    pending: 'bg-gray-500/20 text-gray-500',
    forwarded: 'bg-blue-500/20 text-blue-500',
    confirmed: 'bg-purple-500/20 text-purple-500',
    shipped: 'bg-green-500/20 text-green-500',
    delivered: 'bg-green-600/20 text-green-600',
    failed: 'bg-red-500/20 text-red-500',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Forwarded Orders ({orders.length})</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No orders forwarded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.orderId} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-semibold">Order #{order.orderId}</p>
                  <p className="text-sm text-gray-400">Provider: {order.providerId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Items</p>
                  <p className="text-white">{(order.items ?? []).length}</p>
                </div>
                <div>
                  <p className="text-gray-500">Forwarded</p>
                  <p className="text-white">{order.forwardedAt ? new Date(order.forwardedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                {order.trackingNumber && (
                  <div>
                    <p className="text-gray-500">Tracking</p>
                    <p className="text-white font-mono text-xs">{order.trackingNumber}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorsTab() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = async () => {
    try {
      const response = await fetch(`${API_URL}/dropshipper/errors?limit=50`, {
        headers: await secureHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setErrors(Array.isArray(data.errors) ? data.errors : []);
      }
    } catch (error) {
      console.error('Failed to load errors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading errors...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Error Logs ({errors.length})</h2>
      
      {errors.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">No errors logged. System running smoothly!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((error, idx) => (
            <div key={idx} className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{error.type}</span>
                    <span className="text-sm text-gray-500">{new Date(error.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{error.message}</p>
                  {error.providerId && (
                    <p className="text-xs text-gray-500">Provider: {error.providerId}</p>
                  )}
                  {error.orderId && (
                    <p className="text-xs text-gray-500">Order: {error.orderId}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddProviderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    id: `provider_${Date.now()}`,
    name: '',
    apiUrl: '',
    apiKey: '',
    enabled: true,
    syncInventory: true,
    autoForwardOrders: true,
    syncInterval: 60,
    settings: {
      markupPercentage: 0,
      fulfillmentTime: 7,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_URL}/dropshipper/providers`, {
        method: 'POST',
        headers: {
          ...(await secureHeaders(true))
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Provider added successfully!');
        onSuccess();
      }
    } catch (error) {
      toast.error('Failed to add provider');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Add Dropshipper Provider</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Provider Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Dropshipper"
            required
          />

          <TextInput
            label="API URL"
            value={formData.apiUrl}
            onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
            placeholder="https://api.dropshipper.com/v1"
            required
          />

          <TextInput
            label="API Key"
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            placeholder="sk_live_..."
            required
          />

          <NumberInput
            label="Sync Interval (minutes)"
            value={formData.syncInterval}
            onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value) })}
            required
          />

          <NumberInput
            label="Markup Percentage"
            value={formData.settings.markupPercentage}
            onChange={(e) => setFormData({ 
              ...formData, 
              settings: { ...formData.settings, markupPercentage: parseFloat(e.target.value) }
            })}
            placeholder="20"
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white rounded-lg hover:opacity-90 transition-all"
            >
              Add Provider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}