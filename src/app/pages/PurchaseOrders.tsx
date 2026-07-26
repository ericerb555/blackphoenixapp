import { useState, useEffect } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { ChevronLeft, Plus, Search, Filter, Download, Eye, Edit, Trash2, Check, X, Clock, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  vendorId: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'sent' | 'received' | 'cancelled';
  total: number;
  items: POItem[];
  approver?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

interface POItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    vendor: '',
    vendorId: '',
    dueDate: '',
    notes: '',
    items: [] as POItem[]
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/purchase-orders`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error(`Failed to fetch purchase orders (${response.status})`);

      const data = await response.json();
      // Show only rich purchase orders (created via this page). Light summary-only
      // records from the supplier hub are filtered out since they lack line items.
      const richOrders = (data.orders || []).filter((o: any) => Array.isArray(o.items));
      setOrders(richOrders);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = async () => {
    try {
      const newPO = {
        poNumber: `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`,
        vendor: formData.vendor,
        vendorId: formData.vendorId,
        date: new Date().toISOString().split('T')[0],
        dueDate: formData.dueDate,
        status: 'draft' as const,
        total: formData.items.reduce((sum, item) => sum + item.total, 0),
        items: formData.items,
        notes: formData.notes,
        createdBy: 'Current User',
        createdAt: new Date().toISOString()
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/purchase-orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newPO),
        }
      );

      if (!response.ok) throw new Error('Failed to create purchase order');

      await fetchOrders();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Failed to create purchase order. Please try again.');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: PurchaseOrder['status']) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/purchase-orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      await fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      // Update locally for demo
      setOrders(prev => prev.map(po => 
        po.id === orderId ? { ...po, status: newStatus } : po
      ));
    }
  };

  const handleDeletePO = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/purchase-orders/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete purchase order');

      await fetchOrders();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      setOrders(prev => prev.filter(po => po.id !== orderId));
    }
  };

  const addItem = () => {
    const newItem: POItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      category: 'Materials'
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (id: string, field: keyof POItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.total = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      })
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const resetForm = () => {
    setFormData({
      vendor: '',
      vendorId: '',
      dueDate: '',
      notes: '',
      items: []
    });
  };

  const getStatusColor = (status: PurchaseOrder['status']) => {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-300',
      pending: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-green-500/20 text-green-300',
      rejected: 'bg-red-500/20 text-red-300',
      sent: 'bg-blue-500/20 text-blue-300',
      received: 'bg-emerald-500/20 text-emerald-300',
      cancelled: 'bg-gray-500/20 text-gray-400'
    };
    return colors[status];
  };

  const getStatusIcon = (status: PurchaseOrder['status']) => {
    const icons = {
      draft: Edit,
      pending: Clock,
      approved: Check,
      rejected: X,
      sent: Download,
      received: Check,
      cancelled: AlertCircle
    };
    const Icon = icons[status];
    return <Icon className="w-4 h-4" />;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by PO number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] appearance-none"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create PO
            </button>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading purchase orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No purchase orders found</div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#ea580c]">{order.poNumber}</h3>
                    <p className="text-gray-400">{order.vendor}</p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="capitalize">{order.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="font-medium">{order.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Due Date</p>
                    <p className="font-medium">{order.dueDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total</p>
                    <p className="font-medium text-[#ea580c]">${order.total.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetailsModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>

                  {order.status === 'draft' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'pending')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                      Submit
                    </button>
                  )}

                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'approved')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'rejected')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}

                  {order.status === 'approved' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'sent')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 text-[#ea580c] rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Send to Vendor
                    </button>
                  )}

                  <button
                    onClick={() => handleDeletePO(order.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold">Create Purchase Order</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Vendor Name</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                    placeholder="Enter vendor name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Vendor ID</label>
                  <input
                    type="text"
                    value={formData.vendorId}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendorId: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                    placeholder="Enter vendor ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Items</h3>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#ea580c] hover:bg-[#ea580c]/90 rounded-lg transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item) => (
                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
                            placeholder="Description"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
                            placeholder="Qty"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
                            placeholder="Price"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 text-[#ea580c] font-medium text-sm">
                            ${item.total.toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.items.length > 0 && (
                  <div className="mt-4 text-right">
                    <span className="text-lg font-semibold">
                      Total: <span className="text-[#ea580c]">
                        ${formData.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                disabled={!formData.vendor || !formData.dueDate || formData.items.length === 0}
                className="px-4 py-2 bg-[#ea580c] hover:bg-[#ea580c]/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold">{selectedOrder.poNumber}</h2>
              <p className="text-gray-400 mt-1">{selectedOrder.vendor}</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mt-1 ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusIcon(selectedOrder.status)}
                    <span className="capitalize">{selectedOrder.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="font-medium mt-1">{selectedOrder.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Due Date</p>
                  <p className="font-medium mt-1">{selectedOrder.dueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Created By</p>
                  <p className="font-medium mt-1">{selectedOrder.createdBy}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Notes</p>
                  <p className="bg-white/5 border border-white/10 rounded-lg p-3">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-4">Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-gray-400">{item.category}</p>
                        </div>
                        <p className="text-[#ea580c] font-semibold">${item.total.toFixed(2)}</p>
                      </div>
                      <div className="text-sm text-gray-400">
                        {item.quantity} × ${item.unitPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-[#ea580c]">
                    ${selectedOrder.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}