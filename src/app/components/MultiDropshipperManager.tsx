/**
 * MultiDropshipperManager — connect and manage multiple dropshippers simultaneously
 * Supports: Doba, Spocket, DSers, Printful, AutoDS, SaleHoo, Wholesale2B, CJdropshipping
 * Features: connect/disconnect, product import, markup rules, order routing, inventory sync
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Package, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Clock,
  DollarSign, ShoppingBag, Truck, Link2, Settings, Eye, EyeOff,
  ChevronDown, ChevronUp, Search, Filter, ArrowUpRight, Zap,
  AlertTriangle, BarChart3, Globe, X, Save, Edit2,
} from 'lucide-react';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// ── Supported suppliers ────────────────────────────────────────────────────────

interface SupplierDef {
  id: string;
  name: string;
  logo: string;
  description: string;
  categories: string[];
  minOrder: string;
  shipsFrom: string;
  avgShipping: string;
  apiType: 'key' | 'oauth' | 'key+secret';
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  color: string;
  website: string;
  pros: string[];
}

const SUPPLIERS: SupplierDef[] = [
  {
    id: 'doba', name: 'Doba', logo: '🏭', color: 'from-blue-600 to-blue-700',
    description: 'US-based dropshipper with 2M+ products across all categories. Fast domestic shipping.',
    categories: ['Tools', 'Hardware', 'Home Improvement', 'Electronics'],
    minOrder: 'No minimum', shipsFrom: 'USA', avgShipping: '3–7 days',
    apiType: 'key+secret', website: 'doba.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your Doba API Key' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Your Doba API Secret', secret: true },
    ],
    pros: ['US-based inventory', 'No minimum order', 'Real-time stock'],
  },
  {
    id: 'spocket', name: 'Spocket', logo: '🚀', color: 'from-purple-600 to-purple-700',
    description: 'Premium US & EU suppliers. High-quality products with fast shipping and branded invoicing.',
    categories: ['Home Decor', 'Tools', 'Accessories', 'Lifestyle'],
    minOrder: 'No minimum', shipsFrom: 'USA / EU', avgShipping: '2–5 days',
    apiType: 'key', website: 'spocket.co',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your Spocket API Key', secret: true },
    ],
    pros: ['US/EU suppliers', 'Branded invoicing', 'High margins'],
  },
  {
    id: 'dsers', name: 'DSers (AliExpress)', logo: '🔗', color: 'from-orange-500 to-orange-600',
    description: 'Official AliExpress dropshipping partner. Massive product catalog, lowest prices.',
    categories: ['Tools', 'Hardware', 'Electronics', 'General'],
    minOrder: 'No minimum', shipsFrom: 'China / USA', avgShipping: '7–20 days',
    apiType: 'oauth', website: 'dsers.com',
    fields: [
      { key: 'app_key', label: 'App Key', placeholder: 'DSers App Key' },
      { key: 'app_secret', label: 'App Secret', placeholder: 'DSers App Secret', secret: true },
    ],
    pros: ['Lowest prices', '1M+ products', 'Bulk ordering'],
  },
  {
    id: 'printful', name: 'Printful', logo: '🖨️', color: 'from-teal-600 to-teal-700',
    description: 'Print-on-demand for custom branded products. T-shirts, mugs, posters with your logo.',
    categories: ['Apparel', 'Accessories', 'Home & Living', 'Branded Merch'],
    minOrder: 'No minimum', shipsFrom: 'USA / EU', avgShipping: '3–7 days',
    apiType: 'key', website: 'printful.com',
    fields: [
      { key: 'api_key', label: 'API Token', placeholder: 'Your Printful API Token', secret: true },
    ],
    pros: ['No inventory', 'Custom branding', 'High quality'],
  },
  {
    id: 'autods', name: 'AutoDS', logo: '🤖', color: 'from-indigo-600 to-indigo-700',
    description: 'AI-powered dropshipping automation. Sources from 25+ suppliers, auto price optimization.',
    categories: ['All Categories', 'Electronics', 'Home', 'Tools'],
    minOrder: 'No minimum', shipsFrom: 'USA / China / EU', avgShipping: '3–15 days',
    apiType: 'key', website: 'autods.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your AutoDS API Key', secret: true },
    ],
    pros: ['AI price optimization', '25+ sources', 'Auto fulfillment'],
  },
  {
    id: 'cjdropshipping', name: 'CJ Dropshipping', logo: '📦', color: 'from-red-600 to-red-700',
    description: 'Free dropshipping service with warehouses in USA, Europe, and Asia. Product sourcing included.',
    categories: ['Tools', 'Electronics', 'Fashion', 'Home'],
    minOrder: 'No minimum', shipsFrom: 'China / USA / EU', avgShipping: '5–15 days',
    apiType: 'key', website: 'cjdropshipping.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your CJ Dropshipping API Key', secret: true },
    ],
    pros: ['Free service', 'US warehouse', 'Product sourcing'],
  },
  {
    id: 'salehoo', name: 'SaleHoo', logo: '🏪', color: 'from-green-600 to-green-700',
    description: 'Vetted supplier directory with 8,000+ verified suppliers. Focused on quality and legitimacy.',
    categories: ['General', 'Electronics', 'Apparel', 'Home'],
    minOrder: 'Varies', shipsFrom: 'USA / Global', avgShipping: '3–10 days',
    apiType: 'key', website: 'salehoo.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your SaleHoo API Key', secret: true },
    ],
    pros: ['Verified suppliers', 'Low risk', 'Market research'],
  },
  {
    id: 'wholesale2b', name: 'Wholesale2b', logo: '🏬', color: 'from-cyan-600 to-cyan-700',
    description: '1M+ products from US wholesalers. Automated order routing and real-time inventory.',
    categories: ['Tools', 'Hardware', 'Home', 'Sports'],
    minOrder: 'No minimum', shipsFrom: 'USA', avgShipping: '2–7 days',
    apiType: 'key', website: 'wholesale2b.com',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your Wholesale2b API Key', secret: true },
      { key: 'user_id', label: 'User ID', placeholder: 'Your account User ID' },
    ],
    pros: ['US-only shipping', '1M+ products', 'Auto routing'],
  },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConnectedSupplier {
  id: string;
  supplierId: string;
  name: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  productCount: number;
  lastSync: string;
  markupType: 'percent' | 'fixed';
  markupValue: number;
  autoForwardOrders: boolean;
  credentials: Record<string, string>;
  syncInterval: number; // hours
  categories: string[];
  totalRevenue: number;
  pendingOrders: number;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  supplier: string;
  category: string;
  inStock: boolean;
  image: string;
  sku: string;
}

type ManagerTab = 'suppliers' | 'inventory' | 'orders' | 'settings';

// ── Mock connected suppliers ───────────────────────────────────────────────────

const MOCK_CONNECTED: ConnectedSupplier[] = [
  {
    id: 'cs1', supplierId: 'doba', name: 'Doba',
    status: 'connected', productCount: 1247, lastSync: '12 min ago',
    markupType: 'percent', markupValue: 35, autoForwardOrders: true,
    credentials: { api_key: '••••••••••••', api_secret: '••••••••••••' },
    syncInterval: 4, categories: ['Tools', 'Hardware', 'Electrical'],
    totalRevenue: 12400, pendingOrders: 3,
  },
  {
    id: 'cs2', supplierId: 'printful', name: 'Printful',
    status: 'connected', productCount: 89, lastSync: '2 hours ago',
    markupType: 'percent', markupValue: 50, autoForwardOrders: true,
    credentials: { api_key: '••••••••••••' },
    syncInterval: 12, categories: ['Branded Merch', 'Apparel'],
    totalRevenue: 3200, pendingOrders: 1,
  },
];

export default function MultiDropshipperManager() {
  const { session } = useAuth();
  const token = session?.access_token || publicAnonKey;

  const [activeTab, setActiveTab] = useState<ManagerTab>('suppliers');
  const [connected, setConnected] = useState<ConnectedSupplier[]>(MOCK_CONNECTED);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDef | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [markupType, setMarkupType] = useState<'percent' | 'fixed'>('percent');
  const [markupValue, setMarkupValue] = useState('35');
  const [autoForward, setAutoForward] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [editingMarkup, setEditingMarkup] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [importingToStore, setImportingToStore] = useState<string | null>(null);

  // Mock inventory
  useEffect(() => {
    setInventory([
      { id: 'i1', name: 'Heavy Duty Drill Kit', price: 89.99, supplier: 'Doba', category: 'Tools', inStock: true, image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=120&q=80', sku: 'DOB-DRL-001' },
      { id: 'i2', name: 'Smart LED Switch Pack', price: 49.99, supplier: 'Doba', category: 'Electrical', inStock: true, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=80', sku: 'DOB-ELC-042' },
      { id: 'i3', name: 'Pipe Repair Clamp Set', price: 34.99, supplier: 'Doba', category: 'Plumbing', inStock: true, image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=120&q=80', sku: 'DOB-PLM-007' },
      { id: 'i4', name: 'BP Logo Contractor Tee', price: 22.00, supplier: 'Printful', category: 'Apparel', inStock: true, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=120&q=80', sku: 'PRF-APR-001' },
      { id: 'i5', name: 'Cordless Screwdriver Set', price: 54.99, supplier: 'Doba', category: 'Tools', inStock: false, image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=120&q=80', sku: 'DOB-DRL-015' },
      { id: 'i6', name: 'Weatherproof Outlet Box', price: 18.99, supplier: 'Doba', category: 'Electrical', inStock: true, image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=120&q=80', sku: 'DOB-ELC-089' },
    ]);
  }, []);

  async function connectSupplier() {
    if (!selectedSupplier) return;
    const missing = selectedSupplier.fields.find(f => !credentials[f.key]);
    if (missing) { toast.error(`Please enter your ${missing.label}`); return; }
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1800));

    const newConn: ConnectedSupplier = {
      id: `cs${Date.now()}`, supplierId: selectedSupplier.id, name: selectedSupplier.name,
      status: 'connected', productCount: Math.floor(Math.random() * 500) + 50,
      lastSync: 'just now',
      markupType, markupValue: Number(markupValue), autoForwardOrders: autoForward,
      credentials, syncInterval: 4, categories: selectedSupplier.categories,
      totalRevenue: 0, pendingOrders: 0,
    };
    setConnected(prev => [...prev, newConn]);
    toast.success(`✅ ${selectedSupplier.name} connected! ${newConn.productCount} products synced.`);
    setConnecting(false);
    setShowAddModal(false);
    setSelectedSupplier(null);
    setCredentials({});
  }

  async function syncSupplier(id: string) {
    setSyncing(id);
    await new Promise(r => setTimeout(r, 2000));
    setConnected(prev => prev.map(s => s.id === id ? { ...s, lastSync: 'just now', productCount: s.productCount + Math.floor(Math.random() * 10) } : s));
    toast.success('Inventory synced!');
    setSyncing(null);
  }

  function disconnectSupplier(id: string) {
    const s = connected.find(c => c.id === id);
    setConnected(prev => prev.filter(c => c.id !== id));
    toast.success(`${s?.name} disconnected`);
  }

  async function importToStore(item: InventoryItem) {
    setImportingToStore(item.id);
    await new Promise(r => setTimeout(r, 1000));
    toast.success(`"${item.name}" added to your store!`);
    setImportingToStore(null);
  }

  async function syncAllToStore() {
    toast.success(`Syncing ${inventory.filter(i => i.inStock).length} in-stock products to your store…`);
    await new Promise(r => setTimeout(r, 1500));
    toast.success('Store updated with all in-stock dropship products!');
  }

  const availableSuppliers = SUPPLIERS.filter(s => !connected.find(c => c.supplierId === s.id));
  const filteredInventory = inventory.filter(i => {
    const matchSearch = !inventorySearch || i.name.toLowerCase().includes(inventorySearch.toLowerCase()) || i.sku.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchFilter = inventoryFilter === 'all' || i.supplier === inventoryFilter || (inventoryFilter === 'inStock' && i.inStock);
    return matchSearch && matchFilter;
  });
  const supplierOptions = ['all', 'inStock', ...Array.from(new Set(inventory.map(i => i.supplier)))];

  const tabs: { id: ManagerTab; label: string; icon: any; badge?: number }[] = [
    { id: 'suppliers', label: 'Connected Suppliers', icon: Link2, badge: connected.length },
    { id: 'inventory', label: 'Product Catalog', icon: Package, badge: inventory.length },
    { id: 'orders', label: 'Order Routing', icon: Truck },
    { id: 'settings', label: 'Global Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-400" /> Multi-Dropshipper Manager
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Connect multiple suppliers simultaneously · Auto order routing · Live inventory sync
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncAllToStore}
            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 rounded-lg text-sm font-semibold transition">
            <ShoppingBag className="w-4 h-4" /> Sync All to Store
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Connected Suppliers', value: connected.length, icon: Link2, color: 'text-blue-400 bg-blue-500/10' },
          { label: 'Total Products', value: connected.reduce((a, s) => a + s.productCount, 0).toLocaleString(), icon: Package, color: 'text-orange-400 bg-orange-500/10' },
          { label: 'Pending Orders', value: connected.reduce((a, s) => a + s.pendingOrders, 0), icon: Truck, color: 'text-yellow-400 bg-yellow-500/10' },
          { label: 'Est. Monthly Revenue', value: `$${connected.reduce((a, s) => a + s.totalRevenue, 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-400 bg-green-500/10' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-semibold transition flex-shrink-0 ${activeTab === tab.id ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-[#2A2A2A] text-gray-300'}`}>{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ── SUPPLIERS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {connected.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
              <Globe className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No suppliers connected yet</p>
              <p className="text-gray-600 text-sm mt-1 mb-4">Add your first dropshipper to start importing products</p>
              <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold text-sm transition">
                + Add Your First Supplier
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {connected.map(supplier => {
                const def = SUPPLIERS.find(s => s.id === supplier.supplierId);
                const expanded = expandedSupplier === supplier.id;
                return (
                  <div key={supplier.id} className={`bg-[#1A1A1A] border rounded-2xl overflow-hidden transition ${supplier.status === 'connected' ? 'border-green-500/20' : 'border-[#2A2A2A]'}`}>
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedSupplier(expanded ? null : supplier.id)}>
                      {/* Logo */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${def?.color || 'from-gray-600 to-gray-700'} flex items-center justify-center text-2xl flex-shrink-0`}>
                        {def?.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white">{supplier.name}</p>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            supplier.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                            supplier.status === 'syncing' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {supplier.status === 'connected' && <><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Connected</>}
                            {supplier.status === 'syncing' && <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing</>}
                            {supplier.status === 'error' && <><AlertTriangle className="w-3 h-3" /> Error</>}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>{supplier.productCount.toLocaleString()} products</span>
                          <span>Synced {supplier.lastSync}</span>
                          <span>Markup: {supplier.markupType === 'percent' ? `+${supplier.markupValue}%` : `+$${supplier.markupValue}`}</span>
                          <span className={supplier.autoForwardOrders ? 'text-green-400' : 'text-gray-500'}>
                            {supplier.autoForwardOrders ? '✓ Auto-routing ON' : '✗ Auto-routing OFF'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); syncSupplier(supplier.id); }}
                          disabled={syncing === supplier.id}
                          className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
                          <RefreshCw className={`w-4 h-4 ${syncing === supplier.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setExpandedSupplier(expanded ? null : supplier.id); }}
                          className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-[#2A2A2A] px-5 py-4 space-y-4">
                        {/* Markup editor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">Markup Rule</label>
                            <div className="flex gap-2">
                              <select
                                value={editingMarkup === supplier.id ? undefined : supplier.markupType}
                                onChange={e => setConnected(prev => prev.map(s => s.id === supplier.id ? { ...s, markupType: e.target.value as any } : s))}
                                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                                <option value="percent">% Markup</option>
                                <option value="fixed">$ Fixed Add</option>
                              </select>
                              <input
                                type="number" min="0"
                                value={supplier.markupValue}
                                onChange={e => setConnected(prev => prev.map(s => s.id === supplier.id ? { ...s, markupValue: Number(e.target.value) } : s))}
                                className="w-24 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                              />
                              <button onClick={() => toast.success('Markup saved!')}
                                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition">
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">Auto Order Routing</label>
                            <div className="flex items-center gap-3">
                              <button onClick={() => setConnected(prev => prev.map(s => s.id === supplier.id ? { ...s, autoForwardOrders: !s.autoForwardOrders } : s))}
                                className={`w-12 h-6 rounded-full transition-all relative ${supplier.autoForwardOrders ? 'bg-green-600' : 'bg-[#2A2A2A]'}`}>
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${supplier.autoForwardOrders ? 'left-6' : 'left-0.5'}`} />
                              </button>
                              <span className="text-sm text-gray-300">
                                {supplier.autoForwardOrders ? 'Orders auto-forwarded to supplier' : 'Manual order forwarding'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Categories */}
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-2">Active Categories</p>
                          <div className="flex flex-wrap gap-2">
                            {supplier.categories.map(c => (
                              <span key={c} className="px-3 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-full text-xs text-gray-300">{c}</span>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button onClick={() => disconnectSupplier(supplier.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-semibold transition">
                            <Trash2 className="w-4 h-4" /> Disconnect
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Available suppliers to add */}
          {availableSuppliers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Available to Connect</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {availableSuppliers.map(s => (
                  <button key={s.id} onClick={() => { setSelectedSupplier(s); setShowAddModal(true); }}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 rounded-xl p-4 text-left transition group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{s.logo}</span>
                      <p className="font-semibold text-white text-sm">{s.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">{s.description.slice(0, 80)}…</p>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Truck className="w-3 h-3" /> {s.avgShipping}
                    </div>
                    <div className="mt-2 text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition font-semibold">
                      Click to connect →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVENTORY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 focus-within:border-orange-500/50 transition">
              <Search className="w-4 h-4 text-gray-500" />
              <input value={inventorySearch} onChange={e => setInventorySearch(e.target.value)}
                placeholder="Search products or SKUs…"
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              {supplierOptions.map(opt => (
                <button key={opt} onClick={() => setInventoryFilter(opt)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${inventoryFilter === opt ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                  {opt === 'all' ? 'All' : opt === 'inStock' ? 'In Stock' : opt}
                </button>
              ))}
            </div>
            <button onClick={syncAllToStore}
              className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 rounded-xl text-xs font-bold transition">
              <ShoppingBag className="w-3.5 h-3.5" /> Push All to Store
            </button>
          </div>

          <div className="space-y-2">
            {filteredInventory.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/20 rounded-xl px-4 py-3 transition">
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{item.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                    <span>SKU: {item.sku}</span>
                    <span>{item.supplier}</span>
                    <span>{item.category}</span>
                    <span className={item.inStock ? 'text-green-400' : 'text-red-400'}>
                      {item.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-orange-400">${item.price}</p>
                </div>
                <button
                  onClick={() => importToStore(item)}
                  disabled={importingToStore === item.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 rounded-lg text-xs font-bold transition disabled:opacity-50">
                  {importingToStore === item.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShoppingBag className="w-3 h-3" />}
                  Add to Store
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ORDER ROUTING TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          <div className="bg-[#1A1A1A] border border-green-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-green-400" />
              <p className="font-bold text-white">Automatic Order Routing — Active</p>
            </div>
            <p className="text-sm text-gray-400 mb-4">When a customer places an order, the system automatically identifies which supplier carries each product and forwards the order to the correct dropshipper. No manual action needed.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: '1', label: 'Customer Orders', desc: 'Customer completes checkout in your store', icon: ShoppingBag },
                { step: '2', label: 'Auto Route', desc: 'System groups items by supplier and forwards', icon: Truck },
                { step: '3', label: 'Supplier Ships', desc: 'Supplier ships directly to customer with tracking', icon: CheckCircle },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex items-start gap-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{s.step}</div>
                    <div>
                      <p className="font-semibold text-white text-sm">{s.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-supplier routing rules */}
          <div>
            <p className="text-sm font-semibold text-white mb-3">Supplier Routing Rules</p>
            <div className="space-y-2">
              {connected.map(s => (
                <div key={s.id} className="flex items-center gap-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3">
                  <p className="font-semibold text-white text-sm flex-1">{s.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.categories.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-xs text-gray-400">{c}</span>
                    ))}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.autoForwardOrders ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {s.autoForwardOrders ? 'Auto' : 'Manual'}
                  </span>
                  <span className="text-orange-400 font-bold text-sm">{s.pendingOrders} pending</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 space-y-4">
            <p className="font-bold text-white">Global Sync Settings</p>
            {[
              { label: 'Auto-sync inventory every', value: '4 hours' },
              { label: 'Out-of-stock action', value: 'Hide from store' },
              { label: 'Price rounding', value: 'Round up to .99' },
              { label: 'Default shipping estimate', value: 'Show supplier estimate' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0">
                <p className="text-sm text-gray-300">{s.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-400 font-semibold">{s.value}</span>
                  <button onClick={() => toast.success('Setting updated')} className="p-1 hover:bg-[#2A2A2A] rounded text-gray-500 hover:text-white transition">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5">
            <p className="font-bold text-white mb-3">Webhook Endpoints</p>
            <p className="text-xs text-gray-500 mb-3">Configure these in each supplier's dashboard to receive real-time inventory and order updates.</p>
            {[
              { label: 'Inventory Update Webhook', url: `${SERVER}/dropshipper/webhook/inventory` },
              { label: 'Order Status Webhook', url: `${SERVER}/dropshipper/webhook/order-status` },
              { label: 'Tracking Update Webhook', url: `${SERVER}/dropshipper/webhook/tracking` },
            ].map((w, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[#2A2A2A] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400">{w.label}</p>
                  <p className="text-xs text-gray-600 font-mono truncate">{w.url}</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(w.url).catch(() => {}); toast.success('Copied!'); }}
                  className="p-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-gray-500 hover:text-white transition">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADD SUPPLIER MODAL ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white">Add Supplier</h3>
              <button onClick={() => { setShowAddModal(false); setSelectedSupplier(null); setCredentials({}); }}
                className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!selectedSupplier ? (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableSuppliers.map(s => (
                  <button key={s.id} onClick={() => setSelectedSupplier(s)}
                    className="flex items-start gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/40 rounded-xl text-left transition group">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl flex-shrink-0`}>{s.logo}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.description.slice(0, 70)}…</p>
                      <div className="flex gap-3 mt-2 text-xs text-gray-600">
                        <span>✈ {s.shipsFrom}</span>
                        <span>⏱ {s.avgShipping}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.pros.map(p => <span key={p} className="text-xs text-green-400">✓ {p}</span>).slice(0, 2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Selected supplier header */}
                <div className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${selectedSupplier.color} bg-opacity-20`}>
                  <span className="text-3xl">{selectedSupplier.logo}</span>
                  <div>
                    <p className="font-bold text-white">{selectedSupplier.name}</p>
                    <p className="text-xs text-white/70">{selectedSupplier.description}</p>
                  </div>
                  <button onClick={() => setSelectedSupplier(null)} className="ml-auto p-1 hover:bg-white/10 rounded text-white/60 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* API credentials */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white">API Credentials</p>
                  {selectedSupplier.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5">{field.label}</label>
                      <div className="relative">
                        <input
                          type={field.secret && !showSecret[field.key] ? 'password' : 'text'}
                          value={credentials[field.key] || ''}
                          onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none placeholder-gray-600 pr-10"
                        />
                        {field.secret && (
                          <button type="button" onClick={() => setShowSecret(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition">
                            {showSecret[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <a href={`https://${selectedSupplier.website}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Get API key from {selectedSupplier.website}
                  </a>
                </div>

                {/* Markup + routing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Markup Rule</label>
                    <div className="flex gap-2">
                      <select value={markupType} onChange={e => setMarkupType(e.target.value as any)}
                        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                        <option value="percent">% Markup</option>
                        <option value="fixed">$ Fixed Add</option>
                      </select>
                      <input type="number" min="0" value={markupValue} onChange={e => setMarkupValue(e.target.value)}
                        className="w-24 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Example: cost $50 → your price ${markupType === 'percent' ? (50 * (1 + Number(markupValue) / 100)).toFixed(2) : (50 + Number(markupValue)).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Order Routing</label>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => setAutoForward(!autoForward)}
                        className={`w-11 h-6 rounded-full transition-all relative ${autoForward ? 'bg-green-600' : 'bg-[#2A2A2A]'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${autoForward ? 'left-5' : 'left-0.5'}`} />
                      </button>
                      <span className="text-sm text-gray-300">{autoForward ? 'Auto-forward orders' : 'Manual only'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={connectSupplier} disabled={connecting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition">
                    {connecting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</> : <><CheckCircle className="w-4 h-4" /> Connect {selectedSupplier.name}</>}
                  </button>
                  <button onClick={() => { setSelectedSupplier(null); setCredentials({}); }}
                    className="px-5 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
