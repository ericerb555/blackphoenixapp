/**
 * Work Order Manager
 *
 * Complete work order lifecycle management:
 * 1. View incoming work requests
 * 2. Convert requests to work orders
 * 3. Assign to crew/contractors
 * 4. Track progress and status
 * 5. Mark completion and generate invoices
 * 6. Customer notifications throughout
 */

import { useState, useEffect } from 'react';
import {
  ClipboardList, User, Calendar, MapPin, Phone, Mail,
  CheckCircle, Clock, AlertCircle, Play, Pause, XCircle,
  Send, FileText, DollarSign, Users, Wrench, ChevronRight,
  Edit2, Trash2, Plus, Filter, Search, Download, Upload,
  Image as ImageIcon, Video, FileCheck, Eye, ArrowRight, ArrowLeft,
  Zap, Building2, Star, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { motion, AnimatePresence } from 'motion/react';
import WorkOrderDetail from './WorkOrderDetail';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

export type WorkRequestStatus = 'new' | 'pending' | 'reviewed' | 'approved' | 'scheduled' | 'completed' | 'rejected';
export type WorkOrderStatus = 'pending' | 'assigned' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';

export interface WorkRequest {
  id: string;
  requestNumber: string;
  status: WorkRequestStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  title: string;
  description: string;
  location: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  preferredDate?: string;
  photos: string[];
  documents: string[];
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  requestId?: string; // Link back to work request
  status: WorkOrderStatus;

  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  location: string;

  // Work details
  title: string;
  description: string;
  serviceType: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';

  // Assignment
  assignedTo?: {
    id: string;
    name: string;
    type: 'crew' | 'contractor';
    phone?: string;
    email?: string;
  };
  assignedAt?: string;

  // Scheduling
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration?: number; // in hours

  // Progress
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;

  // Materials & Costs
  estimatedCost?: number;
  actualCost?: number;
  materialsUsed?: Array<{
    name: string;
    quantity: number;
    cost: number;
  }>;

  // Documentation
  photos: string[];
  beforePhotos: string[];
  afterPhotos: string[];
  documents: string[];
  notes: string;
  completionNotes?: string;

  // Quality & Feedback
  qualityCheck?: {
    passedInspection: boolean;
    inspectedBy: string;
    inspectedAt: string;
    issues?: string[];
  };
  customerRating?: number;
  customerFeedback?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface WorkOrderManagerProps {
  view?: 'requests' | 'orders' | 'all';
  onClose?: () => void;
  onNavigate?: (route: string) => void;
}

export default function WorkOrderManager({ view = 'all', onClose, onNavigate }: WorkOrderManagerProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'orders'>(view === 'requests' ? 'requests' : 'orders');
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<WorkRequest | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const apiHeaders = async (contentType = false) => { const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error('Sign in as an administrator to manage work orders.'); return { Authorization: `Bearer ${session.access_token || publicAnonKey}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) }; };
  const loadData = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests`, { headers: await apiHeaders() });
      const records = await response.json(); if (!response.ok || !Array.isArray(records)) throw new Error(records.error || 'Could not load work requests.');
      const requests = records.map((record: any) => ({ id: record.id, requestNumber: record.requestNumber || record.id, status: (record.status || 'pending') as WorkRequestStatus, customerName: record.client_name || record.clientName || '', customerEmail: record.client_email || record.clientEmail || '', customerPhone: record.client_phone || record.clientPhone || '', serviceType: record.serviceType || record.project_type || '', title: record.project_name || record.title || 'Service request', description: record.description || record.additionalNotes || '', location: record.address || record.siteAddress || '', urgency: record.urgency || 'medium', photos: record.photos || record.media_attachments?.photos || [], documents: record.documents || record.media_attachments?.blueprints || [], createdAt: record.created_at || record.createdAt || new Date().toISOString(), reviewedAt: record.reviewedAt, reviewedBy: record.reviewedBy, notes: record.notes }));
      setWorkRequests(requests); setWorkOrders(records.filter((record: any) => record.workOrder).map((record: any) => record.workOrder));
    } catch (error: any) { toast.error(error.message || 'Could not load live work orders.'); setWorkRequests([]); setWorkOrders([]); }
  };

  const saveRequests = (requests: WorkRequest[]) => setWorkRequests(requests);
  const saveOrders = (orders: WorkOrder[]) => setWorkOrders(orders);

  const saveWorkOrder = async (order: WorkOrder): Promise<boolean> => {
    if (!order.requestId) {
      toast.error('This work order is not linked to a saved request.');
      return false;
    }
    const updatedOrder = { ...order, updatedAt: new Date().toISOString() };
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${encodeURIComponent(order.requestId)}`, {
        method: 'PUT',
        headers: await apiHeaders(true),
        body: JSON.stringify({
          status: updatedOrder.status === 'completed' ? 'completed' : 'approved',
          workOrder: updatedOrder,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not save work order changes.');

      if (updatedOrder.scheduledDate) {
        const day = updatedOrder.scheduledDate.slice(0, 10);
        const time = updatedOrder.scheduledTime || '09:00';
        const scheduleResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${encodeURIComponent(order.requestId)}/schedule`, {
          method: 'POST',
          headers: await apiHeaders(true),
          body: JSON.stringify({
            startAt: `${day}T${time.length === 5 ? `${time}:00` : time}`,
            assignedTo: updatedOrder.assignedTo || null,
            notes: updatedOrder.notes || '',
            status: 'scheduled',
          }),
        });
        const scheduleResult = await scheduleResponse.json();
        if (!scheduleResponse.ok || !scheduleResult.success) throw new Error(scheduleResult.error || 'Work order saved, but its schedule could not be saved.');
      }

      saveOrders(workOrders.map((item) => item.id === updatedOrder.id ? updatedOrder : item));
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Could not save work order changes.');
      return false;
    }
  };

  const convertRequestToOrder = async (request: WorkRequest) => {
    const newOrder: WorkOrder = {
      id: `WO-${Date.now()}`,
      workOrderNumber: `WO-${String(workOrders.length + 1).padStart(5, '0')}`,
      requestId: request.id,
      status: 'pending',
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      customerPhone: request.customerPhone,
      location: request.location,
      title: request.title,
      description: request.description,
      serviceType: request.serviceType,
      priority: request.urgency,
      photos: request.photos,
      beforePhotos: [],
      afterPhotos: [],
      documents: request.documents,
      notes: request.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try { const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${encodeURIComponent(request.id)}`, { method: 'PUT', headers: await apiHeaders(true), body: JSON.stringify({ status: 'approved', reviewedAt: new Date().toISOString(), workOrder: newOrder }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not create work order.'); saveOrders([...workOrders, newOrder]); saveRequests(workRequests.map(r => r.id === request.id ? { ...r, status: 'approved' as WorkRequestStatus, reviewedAt: new Date().toISOString() } : r)); toast.success(`Work order ${newOrder.workOrderNumber} created!`); } catch (error: any) { toast.error(error.message || 'Could not create work order.'); return; }
    setSelectedOrder(newOrder);
    setActiveTab('orders');
  };

  const updateOrderStatus = async (orderId: string, status: WorkOrderStatus) => {
    const updatedOrders = workOrders.map(order => {
      if (order.id === orderId) {
        const updates: Partial<WorkOrder> = { status, updatedAt: new Date().toISOString() };

        if (status === 'in-progress' && !order.startedAt) {
          updates.startedAt = new Date().toISOString();
        }

        if (status === 'completed' && !order.completedAt) {
          updates.completedAt = new Date().toISOString();
          if (order.startedAt) {
            const start = new Date(order.startedAt).getTime();
            const end = new Date().getTime();
            updates.actualDuration = (end - start) / (1000 * 60 * 60); // hours
          }
        }

        return { ...order, ...updates };
      }
      return order;
    });

    const updated = updatedOrders.find(order => order.id === orderId); if (!updated?.requestId) { toast.error('This work order is not linked to a persisted request.'); return; }
    try { const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${encodeURIComponent(updated.requestId)}`, { method: 'PUT', headers: await apiHeaders(true), body: JSON.stringify({ status: status === 'completed' ? 'completed' : 'approved', workOrder: updated }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not update work order status.'); saveOrders(updatedOrders); toast.success('Work order status updated!'); } catch (error: any) { toast.error(error.message || 'Could not update work order status.'); }
  };

  const assignWorkOrder = async (orderId: string, assignee: { id: string; name: string; type: 'crew' | 'contractor' }) => {
    const updatedOrders = workOrders.map(order =>
      order.id === orderId
        ? {
            ...order,
            assignedTo: assignee,
            assignedAt: new Date().toISOString(),
            status: 'assigned' as WorkOrderStatus,
            updatedAt: new Date().toISOString()
          }
        : order
    );

    const updated = updatedOrders.find(order => order.id === orderId); if (!updated?.requestId) { toast.error('This work order is not linked to a persisted request.'); return; }
    try { const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests/${encodeURIComponent(updated.requestId)}`, { method: 'PUT', headers: await apiHeaders(true), body: JSON.stringify({ status: 'approved', workOrder: updated }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not assign work order.'); saveOrders(updatedOrders); toast.success(`Assigned to ${assignee.name}!`); } catch (error: any) { toast.error(error.message || 'Could not assign work order.'); }
  };

  const filteredRequests = workRequests.filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesSearch =
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredOrders = workOrders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'new': 'text-blue-400 bg-blue-500/10',
      'reviewed': 'text-purple-400 bg-purple-500/10',
      'approved': 'text-green-400 bg-green-500/10',
      'rejected': 'text-red-400 bg-red-500/10',
      'pending': 'text-yellow-400 bg-yellow-500/10',
      'assigned': 'text-blue-400 bg-blue-500/10',
      'in-progress': 'text-orange-400 bg-orange-500/10',
      'on-hold': 'text-gray-400 bg-gray-500/10',
      'completed': 'text-green-400 bg-green-500/10',
      'cancelled': 'text-red-400 bg-red-500/10'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400 bg-gray-500/10';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'text-gray-400',
      'medium': 'text-yellow-400',
      'high': 'text-orange-400',
      'emergency': 'text-red-400'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Work Order Management</h1>
            <p className="text-gray-400">Manage customer requests and work orders from intake to completion</p>
          </div>
          <div className="flex gap-3">
            {onNavigate && (
              <button
                onClick={() => onNavigate('unified-dashboard')}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Command Center
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'requests'
                ? 'bg-orange-500 text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Work Requests ({workRequests.filter(r => r.status === 'new').length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-orange-500 text-white'
                : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Work Orders ({workOrders.filter(o => ['pending', 'assigned', 'in-progress'].includes(o.status)).length})
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, title, or number..."
              className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-[#1A1A1A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            {activeTab === 'requests' ? (
              <>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </>
            ) : (
              <>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'requests' ? (
        <WorkRequestsList
          requests={filteredRequests}
          onSelect={setSelectedRequest}
          onConvertToOrder={convertRequestToOrder}
          getStatusColor={getStatusColor}
          getPriorityColor={getPriorityColor}
        />
      ) : (
        <WorkOrdersList
          orders={filteredOrders}
          onSelect={setSelectedOrder}
          onUpdateStatus={updateOrderStatus}
          onAssign={assignWorkOrder}
          getStatusColor={getStatusColor}
          getPriorityColor={getPriorityColor}
        />
      )}

      {/* Work Request Detail Modal */}
      {selectedRequest && (
        <WorkRequestDetailModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onConvertToOrder={convertRequestToOrder}
          getStatusColor={getStatusColor}
          getPriorityColor={getPriorityColor}
        />
      )}

      {/* Work Order Detail Modal */}
      {selectedOrder && (
        <WorkOrderDetail
          workOrder={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSave={async (updatedOrder) => {
            const saved = await saveWorkOrder(updatedOrder);
            if (saved) setSelectedOrder(null);
            return saved;
          }}
          onStatusChange={updateOrderStatus}
        />
      )}
    </div>
  );
}

// Work Request Detail Modal Component
function WorkRequestDetailModal({
  request,
  isOpen,
  onClose,
  onConvertToOrder,
  getStatusColor,
  getPriorityColor
}: {
  request: WorkRequest;
  isOpen: boolean;
  onClose: () => void;
  onConvertToOrder: (request: WorkRequest) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#1A1A1A] border border-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#1A1A1A] border-b border-gray-800 p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{request.title}</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{request.requestNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                Customer Information
              </h3>
              <div className="bg-[#0A0A0A] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{request.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">{request.customerEmail}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">{request.customerPhone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">{request.location}</span>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                Service Details
              </h3>
              <div className="bg-[#0A0A0A] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Service Type:</span>
                  <span className="text-white">{request.serviceType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Urgency:</span>
                  <span className={getPriorityColor(request.urgency)}>{request.urgency}</span>
                </div>
                {request.preferredDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Preferred Date:</span>
                    <span className="text-white">{new Date(request.preferredDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Submitted:</span>
                  <span className="text-white">{new Date(request.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
              <div className="bg-[#0A0A0A] rounded-lg p-4">
                <p className="text-gray-300 whitespace-pre-wrap">{request.description}</p>
              </div>
            </div>

            {/* Notes */}
            {request.notes && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Notes</h3>
                <div className="bg-[#0A0A0A] rounded-lg p-4">
                  <p className="text-gray-300 whitespace-pre-wrap">{request.notes}</p>
                </div>
              </div>
            )}

            {/* Photos */}
            {request.photos && request.photos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-orange-500" />
                  Photos ({request.photos.length})
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {request.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-800"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-gray-800 p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
            >
              Close
            </button>
            {['new', 'pending', 'reviewed'].includes(request.status) && (
              <button
                onClick={() => {
                  onConvertToOrder(request);
                  onClose();
                }}
                className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                Create Work Order
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Work Requests List Component
function WorkRequestsList({
  requests,
  onSelect,
  onConvertToOrder,
  getStatusColor,
  getPriorityColor
}: {
  requests: WorkRequest[];
  onSelect: (request: WorkRequest) => void;
  onConvertToOrder: (request: WorkRequest) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No work requests found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {requests.map(request => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-4 hover:border-orange-500/50 transition-colors cursor-pointer"
          onClick={() => onSelect(request)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400">{request.requestNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </div>
              <h3 className="font-semibold text-white mb-1">{request.title}</h3>
            </div>
            <Star className={getPriorityColor(request.urgency)} />
          </div>

          {/* Customer Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{request.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">{request.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">{request.serviceType}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">{request.description}</p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(request);
              }}
              className="flex-1 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
            {['new', 'pending', 'reviewed'].includes(request.status) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToOrder(request);
                }}
                className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Create Order
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Work Orders List Component
function WorkOrdersList({
  orders,
  onSelect,
  onUpdateStatus,
  onAssign,
  getStatusColor,
  getPriorityColor
}: {
  orders: WorkOrder[];
  onSelect: (order: WorkOrder) => void;
  onUpdateStatus: (orderId: string, status: WorkOrderStatus) => void;
  onAssign: (orderId: string, assignee: { id: string; name: string; type: 'crew' | 'contractor' }) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No work orders found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {orders.map(order => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-4 hover:border-orange-500/50 transition-colors cursor-pointer"
          onClick={() => onSelect(order)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-400">{order.workOrderNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <h3 className="font-semibold text-white mb-1">{order.title}</h3>
            </div>
            <Star className={getPriorityColor(order.priority)} />
          </div>

          {/* Customer & Assignment */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{order.customerName}</span>
            </div>
            {order.assignedTo && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400">{order.assignedTo.name}</span>
              </div>
            )}
            {order.scheduledDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{new Date(order.scheduledDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, 'assigned');
                }}
                className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                Assign
              </button>
            )}
            {order.status === 'assigned' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, 'in-progress');
                }}
                className="flex-1 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            )}
            {order.status === 'in-progress' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(order.id, 'completed');
                }}
                className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(order);
              }}
              className="px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Demo Data Generators
function generateDemoRequests(): WorkRequest[] {
  return [
    {
      id: 'REQ-001',
      requestNumber: 'REQ-00001',
      status: 'new',
      customerName: 'John Smith',
      customerEmail: 'john.smith@email.com',
      customerPhone: '(555) 123-4567',
      serviceType: 'Kitchen Remodel',
      title: 'Complete Kitchen Renovation',
      description: 'Looking to completely renovate my kitchen. Need new cabinets, countertops, and appliances installed.',
      location: '123 Main St, Austin, TX',
      urgency: 'medium',
      preferredDate: '2026-06-01',
      photos: [],
      documents: [],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'REQ-002',
      requestNumber: 'REQ-00002',
      status: 'new',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.j@email.com',
      customerPhone: '(555) 234-5678',
      serviceType: 'Bathroom Repair',
      title: 'Leaking Bathroom Faucet',
      description: 'Main bathroom faucet has been leaking for a week. Need urgent repair.',
      location: '456 Oak Ave, Austin, TX',
      urgency: 'high',
      photos: [],
      documents: [],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'REQ-003',
      requestNumber: 'REQ-00003',
      status: 'reviewed',
      customerName: 'Mike Williams',
      customerEmail: 'mike.w@email.com',
      customerPhone: '(555) 345-6789',
      serviceType: 'Deck Construction',
      title: 'New Deck Installation',
      description: 'Want to build a 20x15 deck in backyard with composite materials.',
      location: '789 Pine Rd, Austin, TX',
      urgency: 'low',
      preferredDate: '2026-07-15',
      photos: [],
      documents: [],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedBy: 'Admin User'
    }
  ];
}

function generateDemoOrders(): WorkOrder[] {
  return [
    {
      id: 'WO-001',
      workOrderNumber: 'WO-00001',
      requestId: 'REQ-100',
      status: 'assigned',
      customerName: 'Emily Davis',
      customerEmail: 'emily.d@email.com',
      customerPhone: '(555) 456-7890',
      location: '321 Elm St, Austin, TX',
      title: 'Electrical Panel Upgrade',
      description: 'Upgrade main electrical panel from 100A to 200A service.',
      serviceType: 'Electrical',
      priority: 'high',
      assignedTo: {
        id: 'CREW-001',
        name: 'Electrical Team A',
        type: 'crew'
      },
      assignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledTime: '09:00',
      estimatedDuration: 6,
      estimatedCost: 3500,
      photos: [],
      beforePhotos: [],
      afterPhotos: [],
      documents: [],
      notes: 'Customer will be home during installation. Park in driveway.',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'WO-002',
      workOrderNumber: 'WO-00002',
      status: 'in-progress',
      customerName: 'Robert Brown',
      customerEmail: 'robert.b@email.com',
      customerPhone: '(555) 567-8901',
      location: '654 Maple Dr, Austin, TX',
      title: 'Roof Leak Repair',
      description: 'Repair leak in roof above master bedroom. Replace damaged shingles.',
      serviceType: 'Roofing',
      priority: 'emergency',
      assignedTo: {
        id: 'CREW-002',
        name: 'Roofing Specialists',
        type: 'crew'
      },
      assignedAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledDate: new Date().toISOString(),
      scheduledTime: '08:00',
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      estimatedDuration: 4,
      estimatedCost: 1200,
      photos: [],
      beforePhotos: ['before1.jpg', 'before2.jpg'],
      afterPhotos: [],
      documents: [],
      notes: 'Active leak - emergency repair needed.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}
