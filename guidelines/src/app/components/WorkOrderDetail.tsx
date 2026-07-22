/**
 * Work Order Detail Modal
 *
 * Comprehensive view and editor for individual work orders:
 * - View all details and customer information
 * - Assign to crew/contractors
 * - Update status and track progress
 * - Add notes, photos, and documents
 * - Schedule work
 * - Track costs and materials
 * - Quality checks and completion
 * - Generate invoices
 */

import { useState } from 'react';
import {
  X, User, MapPin, Phone, Mail, Calendar, Clock, DollarSign,
  Users, Wrench, Image as ImageIcon, FileText, CheckCircle,
  AlertCircle, Play, Pause, Save, Send, Star, TrendingUp,
  Package, Edit2, Plus, Trash2, Upload, Camera, Video, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { motion, AnimatePresence } from 'motion/react';
import type { WorkOrder, WorkOrderStatus } from './WorkOrderManager';

interface WorkOrderDetailProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: WorkOrder) => Promise<boolean>;
  onStatusChange: (orderId: string, status: WorkOrderStatus) => void;
}

export default function WorkOrderDetail({
  workOrder,
  isOpen,
  onClose,
  onSave,
  onStatusChange
}: WorkOrderDetailProps) {
  const [editedOrder, setEditedOrder] = useState<WorkOrder>(workOrder);
  const [activeTab, setActiveTab] = useState<'details' | 'assignment' | 'progress' | 'materials' | 'photos'>('details');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleSave = async () => {
    const saved = await onSave(editedOrder);
    if (saved) {
      toast.success('Work order updated!');
      onClose();
    }
  };

  const getStatusColor = (status: WorkOrderStatus) => {
    const colors = {
      'pending': 'text-yellow-400 bg-yellow-500/20',
      'assigned': 'text-blue-400 bg-blue-500/20',
      'in-progress': 'text-orange-400 bg-orange-500/20',
      'on-hold': 'text-gray-400 bg-gray-500/20',
      'completed': 'text-green-400 bg-green-500/20',
      'cancelled': 'text-red-400 bg-red-500/20'
    };
    return colors[status];
  };

  const updateField = (field: keyof WorkOrder, value: any) => {
    setEditedOrder({ ...editedOrder, [field]: value });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-[#0A0A0A] border border-gray-800 rounded-xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-none bg-[#1A1A1A] border-b border-gray-800 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{editedOrder.workOrderNumber}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(editedOrder.status)}`}>
                      {editedOrder.status}
                    </span>
                    {editedOrder.priority === 'emergency' && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium text-red-400 bg-red-500/20 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400">{editedOrder.title}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {[
                  { id: 'details', label: 'Details', icon: FileText },
                  { id: 'assignment', label: 'Assignment', icon: Users },
                  { id: 'progress', label: 'Progress', icon: TrendingUp },
                  { id: 'materials', label: 'Materials', icon: Package },
                  { id: 'photos', label: 'Photos & Docs', icon: Camera }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'details' && (
                <DetailsTab
                  order={editedOrder}
                  onUpdate={updateField}
                />
              )}

              {activeTab === 'assignment' && (
                <AssignmentTab
                  order={editedOrder}
                  onUpdate={updateField}
                  onAssign={() => setShowAssignModal(true)}
                />
              )}

              {activeTab === 'progress' && (
                <ProgressTab
                  order={editedOrder}
                  onUpdate={updateField}
                  onStatusChange={onStatusChange}
                />
              )}

              {activeTab === 'materials' && (
                <MaterialsTab
                  order={editedOrder}
                  onUpdate={updateField}
                />
              )}

              {activeTab === 'photos' && (
                <PhotosTab
                  order={editedOrder}
                  onUpdate={updateField}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex-none bg-[#1A1A1A] border-t border-gray-800 p-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Last updated: {new Date(editedOrder.updatedAt).toLocaleString()}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>

          {/* Assignment Modal */}
          {showAssignModal && (
            <AssignmentModal
              onClose={() => setShowAssignModal(false)}
              onAssign={(assignee) => {
                updateField('assignedTo', assignee);
                updateField('assignedAt', new Date().toISOString());
                setShowAssignModal(false);
                toast.success(`Assigned to ${assignee.name}!`);
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// Details Tab
function DetailsTab({
  order,
  onUpdate
}: {
  order: WorkOrder;
  onUpdate: (field: keyof WorkOrder, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name</label>
            <input
              type="text"
              value={order.customerName}
              onChange={(e) => onUpdate('customerName', e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={order.customerEmail}
              onChange={(e) => onUpdate('customerEmail', e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Phone</label>
            <input
              type="tel"
              value={order.customerPhone}
              onChange={(e) => onUpdate('customerPhone', e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Location</label>
            <input
              type="text"
              value={order.location}
              onChange={(e) => onUpdate('location', e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* Work Details */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Work Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Title</label>
            <input
              type="text"
              value={order.title}
              onChange={(e) => onUpdate('title', e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              value={order.description}
              onChange={(e) => onUpdate('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Service Type</label>
              <input
                type="text"
                value={order.serviceType}
                onChange={(e) => onUpdate('serviceType', e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Priority</label>
              <select
                value={order.priority}
                onChange={(e) => onUpdate('priority', e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
        <textarea
          value={order.notes}
          onChange={(e) => onUpdate('notes', e.target.value)}
          rows={6}
          placeholder="Add any notes or special instructions..."
          className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white resize-none placeholder-gray-600"
        />
      </div>
    </div>
  );
}

// Assignment Tab
function AssignmentTab({
  order,
  onUpdate,
  onAssign
}: {
  order: WorkOrder;
  onUpdate: (field: keyof WorkOrder, value: any) => void;
  onAssign: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Current Assignment */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assignment
          </h3>
          <button
            onClick={onAssign}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Assign
          </button>
        </div>

        {order.assignedTo ? (
          <div className="bg-[#0A0A0A] border border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white font-medium mb-1">{order.assignedTo.name}</div>
                <div className="text-sm text-gray-400 mb-2">
                  Type: <span className="text-orange-400">{order.assignedTo.type}</span>
                </div>
                {order.assignedTo.phone && (
                  <div className="text-sm text-gray-400">Phone: {order.assignedTo.phone}</div>
                )}
                {order.assignedTo.email && (
                  <div className="text-sm text-gray-400">Email: {order.assignedTo.email}</div>
                )}
                {order.assignedAt && (
                  <div className="text-xs text-gray-500 mt-2">
                    Assigned: {new Date(order.assignedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  onUpdate('assignedTo', undefined);
                  onUpdate('assignedAt', undefined);
                  toast.success('Assignment removed');
                }}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No assignment yet</p>
            <button
              onClick={onAssign}
              className="mt-4 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors"
            >
              Assign Now
            </button>
          </div>
        )}
      </div>

      {/* Scheduling */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Scheduling
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Scheduled Date</label>
            <input
              type="date"
              value={order.scheduledDate?.split('T')[0] || ''}
              onChange={(e) => onUpdate('scheduledDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Scheduled Time</label>
            <input
              type="time"
              value={order.scheduledTime || ''}
              onChange={(e) => onUpdate('scheduledTime', e.target.value)}
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Estimated Duration (hours)</label>
            <input
              type="number"
              value={order.estimatedDuration || ''}
              onChange={(e) => onUpdate('estimatedDuration', parseFloat(e.target.value) || undefined)}
              min="0"
              step="0.5"
              placeholder="0.0"
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress Tab
function ProgressTab({
  order,
  onUpdate,
  onStatusChange
}: {
  order: WorkOrder;
  onUpdate: (field: keyof WorkOrder, value: any) => void;
  onStatusChange: (orderId: string, status: WorkOrderStatus) => void;
}) {
  const statusOptions: { value: WorkOrderStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'assigned', label: 'Assigned', color: 'bg-blue-500' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-orange-500' },
    { value: 'on-hold', label: 'On Hold', color: 'bg-gray-500' },
    { value: 'completed', label: 'Completed', color: 'bg-green-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Status Update */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statusOptions.map(status => (
            <button
              key={status.value}
              onClick={() => onStatusChange(order.id, status.value)}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                order.status === status.value
                  ? `${status.color} text-white border-transparent`
                  : 'bg-[#0A0A0A] text-gray-400 border-gray-700 hover:border-gray-600'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Tracking */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Time Tracking
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Started At</label>
            <div className="px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white">
              {order.startedAt ? new Date(order.startedAt).toLocaleString() : 'Not started'}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Completed At</label>
            <div className="px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white">
              {order.completedAt ? new Date(order.completedAt).toLocaleString() : 'Not completed'}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Estimated Duration</label>
            <div className="px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white">
              {order.estimatedDuration ? `${order.estimatedDuration} hours` : 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Actual Duration</label>
            <div className="px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white">
              {order.actualDuration ? `${order.actualDuration.toFixed(2)} hours` : 'Not calculated'}
            </div>
          </div>
        </div>
      </div>

      {/* Completion Notes */}
      {order.status === 'completed' && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Completion Notes</h3>
          <textarea
            value={order.completionNotes || ''}
            onChange={(e) => onUpdate('completionNotes', e.target.value)}
            rows={4}
            placeholder="Describe what was completed, any issues encountered, recommendations, etc..."
            className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white resize-none placeholder-gray-600"
          />
        </div>
      )}
    </div>
  );
}

// Materials Tab
function MaterialsTab({
  order,
  onUpdate
}: {
  order: WorkOrder;
  onUpdate: (field: keyof WorkOrder, value: any) => void;
}) {
  const addMaterial = () => {
    const newMaterial = { name: '', quantity: 1, cost: 0 };
    const materials = [...(order.materialsUsed || []), newMaterial];
    onUpdate('materialsUsed', materials);
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    const materials = [...(order.materialsUsed || [])];
    materials[index] = { ...materials[index], [field]: value };
    onUpdate('materialsUsed', materials);
  };

  const removeMaterial = (index: number) => {
    const materials = (order.materialsUsed || []).filter((_, i) => i !== index);
    onUpdate('materialsUsed', materials);
  };

  const totalMaterialsCost = (order.materialsUsed || []).reduce((sum, m) => sum + (m.cost * m.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Cost Estimates */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Cost Estimates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Estimated Cost</label>
            <input
              type="number"
              value={order.estimatedCost || ''}
              onChange={(e) => onUpdate('estimatedCost', parseFloat(e.target.value) || undefined)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Actual Cost</label>
            <input
              type="number"
              value={order.actualCost || ''}
              onChange={(e) => onUpdate('actualCost', parseFloat(e.target.value) || undefined)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materials Used
          </h3>
          <button
            onClick={addMaterial}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </button>
        </div>

        {(order.materialsUsed || []).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No materials added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(order.materialsUsed || []).map((material, index) => (
              <div key={index} className="flex gap-3 items-start bg-[#0A0A0A] border border-gray-700 rounded-lg p-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={material.name}
                    onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                    placeholder="Material name"
                    className="px-3 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white"
                  />
                  <input
                    type="number"
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="0"
                    placeholder="Qty"
                    className="px-3 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white"
                  />
                  <input
                    type="number"
                    value={material.cost}
                    onChange={(e) => updateMaterial(index, 'cost', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="Cost per unit"
                    className="px-3 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <button
                  onClick={() => removeMaterial(index)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex justify-end pt-4 border-t border-gray-700">
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Total Materials Cost</div>
                <div className="text-2xl font-bold text-white">${totalMaterialsCost.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Photos Tab
function PhotosTab({
  order,
  onUpdate
}: {
  order: WorkOrder;
  onUpdate: (field: keyof WorkOrder, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Before Photos */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Before Photos
        </h3>
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg hover:border-orange-500 transition-colors cursor-pointer">
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">Upload before photos</p>
            <p className="text-sm text-gray-500 mt-1">Click to browse or drag and drop</p>
          </div>
        </div>
      </div>

      {/* After Photos */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          After Photos
        </h3>
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg hover:border-orange-500 transition-colors cursor-pointer">
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">Upload after photos</p>
            <p className="text-sm text-gray-500 mt-1">Click to browse or drag and drop</p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents
        </h3>
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg hover:border-orange-500 transition-colors cursor-pointer">
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">Upload documents</p>
            <p className="text-sm text-gray-500 mt-1">Invoices, permits, contracts, etc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Assignment Modal
function AssignmentModal({
  onClose,
  onAssign
}: {
  onClose: () => void;
  onAssign: (assignee: { id: string; name: string; type: 'crew' | 'contractor' }) => void;
}) {
  const demoCrews = [
    { id: 'crew-1', name: 'Electrical Team A', type: 'crew' as const },
    { id: 'crew-2', name: 'Roofing Specialists', type: 'crew' as const },
    { id: 'crew-3', name: 'Plumbing Team', type: 'crew' as const },
    { id: 'crew-4', name: 'General Construction', type: 'crew' as const }
  ];

  const demoContractors = [
    { id: 'cont-1', name: 'Mike Johnson Contracting', type: 'contractor' as const },
    { id: 'cont-2', name: 'Sarah Williams Electrical', type: 'contractor' as const },
    { id: 'cont-3', name: 'Rodriguez Roofing LLC', type: 'contractor' as const }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0A0A0A] border border-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Assign Work Order</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Crews */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">Crews</h4>
          <div className="space-y-2">
            {demoCrews.map(crew => (
              <button
                key={crew.id}
                onClick={() => onAssign(crew)}
                className="w-full flex items-center justify-between p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-800 hover:border-orange-500/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">{crew.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Contractors */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">Contractors</h4>
          <div className="space-y-2">
            {demoContractors.map(contractor => (
              <button
                key={contractor.id}
                onClick={() => onAssign(contractor)}
                className="w-full flex items-center justify-between p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-800 hover:border-orange-500/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-orange-400" />
                  <span className="text-white font-medium">{contractor.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
