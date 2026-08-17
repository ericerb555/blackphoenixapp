/**
 * Supplier Management Hub - Consolidated Supplier Operations
 * 
 * Central hub for supplier connections, responses, audits, and purchase orders
 * Tabs: Supplier Connect | Supplier Response | Supplier Audit | Purchase Orders
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Truck, MessageSquare, Shield, Receipt, Plus, Search, 
  Filter, TrendingUp, BarChart3, Download, Edit2, Eye, Star,
  CheckCircle, Clock, AlertCircle, DollarSign, Package, Mail,
  X, Save, Key, Globe, Phone, MapPin, Building2
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import { toast } from 'sonner@2.0.3';
import { SupplierRfqTab } from '../components/suppliers/SupplierRfqTab';
import { SupplierAuditTab } from '../components/suppliers/SupplierAuditTab';

type TabType = 'connect' | 'respond' | 'audit' | 'purchase-orders';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export default function SupplierManagementHub() {
  const [activeTab, setActiveTab] = useState<TabType>('connect');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddPOModal, setShowAddPOModal] = useState(false);

  interface Supplier { id: string; name: string; category: string; status: string; rating: number; totalOrders: number; totalSpend: number; lastOrder: string; contact: string; }
  interface PurchaseOrder { id: string; supplier: string; items: number; total: number; status: string; orderDate: string; expectedDelivery: string; }
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/suppliers`, { headers: await authedHeaders() });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
      toast.error(`Failed to load suppliers: ${err?.message || err}`);
    }
  };

  const loadPurchaseOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/purchase-orders`, { headers: await authedHeaders() });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setPurchaseOrders(data.orders || []);
    } catch (err: any) {
      console.error('Failed to load purchase orders:', err);
      toast.error(`Failed to load purchase orders: ${err?.message || err}`);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadPurchaseOrders();
  }, []);

  const handleSaveSupplier = async (formData: any) => {
    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      setShowAddSupplierModal(false);
      toast.success('Supplier saved');
      loadSuppliers();
    } catch (err: any) {
      console.error('Failed to save supplier:', err);
      toast.error(`Could not save the supplier: ${err?.message || err}`);
    }
  };

  const handleSavePO = async (formData: any) => {
    try {
      const res = await fetch(`${API_BASE}/purchase-orders`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({
          ...formData,
          items: Number(formData.items) || 0,
          total: Number(formData.total) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
      setShowAddPOModal(false);
      toast.success('Purchase order saved');
      loadPurchaseOrders();
    } catch (err: any) {
      console.error('Failed to save purchase order:', err);
      toast.error(`Could not save the purchase order: ${err?.message || err}`);
    }
  };

  // Read tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const tabs = [
    { id: 'connect', label: 'Supplier Connect', icon: Truck },
    { id: 'respond', label: 'Supplier Response', icon: MessageSquare },
    { id: 'audit', label: 'Supplier Audit', icon: Shield },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: Receipt }
  ];

  const supplierOptions = suppliers.map(s => ({ id: s.id, name: s.name }));

  const filteredSuppliers = suppliers.filter(supplier => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.category.toLowerCase().includes(query) ||
      supplier.id.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; text: string; label: string } } = {
      'active': { bg: 'bg-green-600/20', text: 'text-green-400', label: 'Active' },
      'pending': { bg: 'bg-yellow-600/20', text: 'text-yellow-400', label: 'Pending' },
      'inactive': { bg: 'bg-zinc-600/20', text: 'text-zinc-400', label: 'Inactive' }
    };
    return badges[status] || badges['active'];
  };

  const getPOStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; text: string; label: string } } = {
      'pending': { bg: 'bg-yellow-600/20', text: 'text-yellow-400', label: 'Pending' },
      'approved': { bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'Approved' },
      'delivered': { bg: 'bg-green-600/20', text: 'text-green-400', label: 'Delivered' },
      'cancelled': { bg: 'bg-red-600/20', text: 'text-red-400', label: 'Cancelled' }
    };
    return badges[status] || badges['pending'];
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PageHeader 
        title="Supplier Management Hub"
        description="Comprehensive supplier connections, responses, audits, and purchase orders"
        onBack={() => window.location.href = '/unified-dashboard'}
      />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-2 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                    : 'bg-[#0A0A0A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'connect' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Active Suppliers</p>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {suppliers.filter(s => s.status === 'active').length}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Total Orders</p>
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {suppliers.reduce((sum, s) => sum + s.totalOrders, 0)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Total Spend</p>
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  ${suppliers.reduce((sum, s) => sum + s.totalSpend, 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-orange-200">Avg Rating</p>
                  <Star className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {(suppliers.reduce((sum, s) => sum + s.rating, 0) / (suppliers.length || 1)).toFixed(1)}
                </p>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <button 
                onClick={() => setShowAddSupplierModal(true)}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </div>

            {/* Suppliers List */}
            <div className="grid gap-4">
              {filteredSuppliers.map((supplier) => {
                const statusBadge = getStatusBadge(supplier.status);
                
                return (
                  <div 
                    key={supplier.id} 
                    className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-orange-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Truck className="w-6 h-6 text-purple-400" />
                          <h3 className="text-lg font-bold">{supplier.name}</h3>
                          <span className={`px-2 py-1 rounded text-sm font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm text-yellow-400 font-semibold">{supplier.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-400 mb-1">{supplier.category}</p>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Mail className="w-4 h-4" />
                          <span>{supplier.contact}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-400 mb-1">Total Spend</p>
                        <p className="text-2xl font-bold text-green-400">${supplier.totalSpend.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <p className="text-sm text-zinc-400 mb-1">Total Orders</p>
                        <p className="text-xl font-bold text-white">{supplier.totalOrders}</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <p className="text-sm text-zinc-400 mb-1">Last Order</p>
                        <p className="text-sm font-semibold text-white">{supplier.lastOrder}</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <p className="text-sm text-zinc-400 mb-1">Avg Order</p>
                        <p className="text-xl font-bold text-white">${Math.round(supplier.totalSpend / supplier.totalOrders)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        New Order
                      </button>
                      <button className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Contact
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 text-center">
              <button 
                onClick={() => window.location.href = '/supplier-connect'}
                className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold"
              >
                View All Supplier Connections
              </button>
            </div>
          </div>
        )}

        {activeTab === 'respond' && (
          <SupplierRfqTab suppliers={supplierOptions} />
        )}

        {activeTab === 'audit' && (
          <SupplierAuditTab suppliers={supplierOptions} />
        )}

        {activeTab === 'purchase-orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Purchase Orders</h2>
              <button 
                onClick={() => setShowAddPOModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New PO
              </button>
            </div>

            {/* PO Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border border-yellow-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-yellow-200">Pending</p>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {purchaseOrders.filter(po => po.status === 'pending').length}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Approved</p>
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {purchaseOrders.filter(po => po.status === 'approved').length}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Delivered</p>
                  <Truck className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {purchaseOrders.filter(po => po.status === 'delivered').length}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Total Value</p>
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">
                  ${purchaseOrders.reduce((sum, po) => sum + po.total, 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Purchase Orders List */}
            <div className="grid gap-4">
              {purchaseOrders.map((po) => {
                const statusBadge = getPOStatusBadge(po.status);
                
                return (
                  <div 
                    key={po.id} 
                    className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-orange-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{po.id}</h3>
                          <span className={`px-2 py-1 rounded text-sm font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 mb-1">Supplier: {po.supplier}</p>
                        <p className="text-sm text-zinc-400">Order Date: {po.orderDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-400 mb-1">Total</p>
                        <p className="text-2xl font-bold text-green-400">${po.total.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <p className="text-sm text-zinc-400 mb-1">Items</p>
                        <p className="text-xl font-bold text-white">{po.items}</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-3">
                        <p className="text-sm text-zinc-400 mb-1">Expected Delivery</p>
                        <p className="text-sm font-semibold text-white">{po.expectedDelivery}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {po.status === 'pending' && (
                        <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                          Approve
                        </button>
                      )}
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <button className="px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 text-center">
              <button 
                onClick={() => window.location.href = '/purchase-orders'}
                className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold"
              >
                View All Purchase Orders
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <AddSupplierModal 
          onClose={() => setShowAddSupplierModal(false)}
          onSave={handleSaveSupplier}
        />
      )}

      {/* Add Purchase Order Modal */}
      {showAddPOModal && (
        <AddPOModal 
          onClose={() => setShowAddPOModal(false)}
          onSave={handleSavePO}
        />
      )}
    </div>
  );
}

// Add Supplier Modal Component
function AddSupplierModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void | Promise<void> }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    contact: '',
    phone: '',
    address: '',
    website: '',
    // API Configuration
    hasApiAccess: false,
    apiEndpoint: '',
    apiKey: '',
    apiSecret: '',
    authType: 'api-key',
    syncInventory: false,
    syncPricing: false
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.contact) {
      toast.error('Please fill in required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Add New Supplier</h2>
                <p className="text-orange-100 text-sm">Configure supplier details and API integration</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="e.g., ABC Supply Co"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select category</option>
                  <option value="General Hardware">General Hardware</option>
                  <option value="Plumbing Supplies">Plumbing Supplies</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Lumber & Building Materials">Lumber & Building Materials</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Tools & Equipment">Tools & Equipment</option>
                  <option value="Industrial Equipment">Industrial Equipment</option>
                  <option value="Safety Supplies">Safety Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="supplier@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="https://www.supplier.com"
                />
              </div>
            </div>
          </div>

          {/* API Configuration */}
          <div className="border-t border-zinc-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                API Integration (Optional)
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasApiAccess}
                  onChange={(e) => setFormData({ ...formData, hasApiAccess: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-400">Enable API Access</span>
              </label>
            </div>

            {formData.hasApiAccess && (
              <div className="space-y-4 bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      API Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={formData.apiEndpoint}
                      onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      placeholder="https://api.supplier.com/v1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Authentication Type
                    </label>
                    <select
                      value={formData.authType}
                      onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="api-key">API Key</option>
                      <option value="oauth">OAuth 2.0</option>
                      <option value="basic">Basic Auth</option>
                      <option value="bearer">Bearer Token</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      placeholder="Enter API key"
                    />
                  </div>

                  {formData.authType === 'oauth' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        API Secret / Client Secret
                      </label>
                      <input
                        type="password"
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="Enter API secret"
                      />
                    </div>
                  )}
                </div>

                {/* Sync Options */}
                <div className="border-t border-zinc-800 pt-4 mt-4">
                  <p className="text-sm font-semibold text-gray-400 mb-3">Sync Options</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.syncInventory}
                        onChange={(e) => setFormData({ ...formData, syncInventory: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-600 focus:ring-orange-500 focus:ring-offset-zinc-900"
                      />
                      <span className="text-sm text-gray-300">Sync Inventory Levels</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.syncPricing}
                        onChange={(e) => setFormData({ ...formData, syncPricing: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-600 focus:ring-orange-500 focus:ring-offset-zinc-900"
                      />
                      <span className="text-sm text-gray-300">Sync Pricing Updates</span>
                    </label>
                  </div>
                </div>

                {/* API Info Box */}
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-300 mb-1">API Integration Benefits</p>
                      <ul className="text-sm text-blue-200/80 space-y-1">
                        <li>• Real-time inventory synchronization</li>
                        <li>• Automatic pricing updates</li>
                        <li>• Streamlined order processing</li>
                        <li>• Reduced manual data entry</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-zinc-800 p-6 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-semibold transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Add Supplier
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Purchase Order Modal Component
function AddPOModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void | Promise<void> }) {
  const [formData, setFormData] = useState({
    supplier: '',
    items: 0,
    total: 0,
    status: 'pending',
    orderDate: '',
    expectedDelivery: ''
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.supplier || !formData.items || !formData.total || !formData.orderDate || !formData.expectedDelivery) {
      toast.error('Please fill in required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Add New Purchase Order</h2>
                <p className="text-orange-100 text-sm">Configure purchase order details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Supplier *
                </label>
                <select
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select supplier</option>
                  <option value="HD Supply Co">HD Supply Co</option>
                  <option value="Ferguson Plumbing">Ferguson Plumbing</option>
                  <option value="Grainger Industrial">Grainger Industrial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Items *
                </label>
                <input
                  type="number"
                  value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Number of items"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Total *
                </label>
                <input
                  type="number"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Total amount"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Expected Delivery *
                </label>
                <input
                  type="date"
                  value={formData.expectedDelivery}
                  onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-zinc-800 p-6 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-semibold transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Add Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
}