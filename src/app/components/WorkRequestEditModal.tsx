import { useState } from 'react';
import {
  X, Save, Edit, Wrench, Recycle, Video, CheckCircle2, Clock, AlertCircle, XCircle
} from 'lucide-react';
import { VideoCapture } from './media/VideoCapture';
import type { VideoRecording } from './media/VideoCapture';

interface WasteDisposal {
  hasWaste: boolean;
  wasteType: string;
  estimatedAmount: string;
  needsRemoval: boolean;
  videos: VideoRecording[];
}

interface WorkRequest {
  id: string;
  requestNumber: string;
  serviceType: string;
  title: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  location: string;
  preferredDate?: string;
  urgency: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  category: string;
  estimatedCost: number;
  actualCost?: number;
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  assignedTo?: string;
  notes: string;
  additionalNotes?: string;
  wasteDisposal?: WasteDisposal;
}

interface WorkRequestEditModalProps {
  request: WorkRequest;
  isOpen: boolean;
  onClose: () => void;
  onSave: (request: WorkRequest) => void;
}

export function WorkRequestEditModal({ request, isOpen, onClose, onSave }: WorkRequestEditModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<WorkRequest>(request);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editData);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setEditData(request);
    setIsEditMode(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in-progress': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 sticky top-0 bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ea580c]/20 rounded-lg">
                <Wrench className="w-6 h-6 text-[#ea580c]" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {isEditMode ? 'Edit Work Request' : 'Work Request Details'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#fb923c] rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ea580c]/20 transition-all"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 font-mono">{editData.requestNumber}</span>
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${getStatusColor(editData.status)}`}>
              {getStatusIcon(editData.status)}
              {editData.status.replace('-', ' ').toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(editData.priority)}`}>
              {editData.priority.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Service Type {isEditMode && <span className="text-red-400">*</span>}
            </label>
            {isEditMode ? (
              <select
                value={editData.serviceType}
                onChange={(e) => setEditData({ ...editData, serviceType: e.target.value })}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
              >
                <option value="">Select service...</option>
                <option value="kitchen-renovation">Kitchen Renovation</option>
                <option value="bathroom-remodel">Bathroom Remodel</option>
                <option value="flooring">Flooring Installation</option>
                <option value="deck-construction">Deck Construction</option>
                <option value="painting">Interior/Exterior Painting</option>
                <option value="roofing">Roofing Services</option>
                <option value="plumbing">Plumbing Services</option>
                <option value="electrical">Electrical Services</option>
                <option value="hvac">HVAC Services</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <p className="text-white">{editData.serviceType || editData.category}</p>
            )}
          </div>

          {/* Title & Description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Title {isEditMode && <span className="text-red-400">*</span>}
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              ) : (
                <p className="text-xl font-bold text-white">{editData.title}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Description {isEditMode && <span className="text-red-400">*</span>}
              </label>
              {isEditMode ? (
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              ) : (
                <p className="text-gray-300">{editData.description}</p>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-[#0A0A0A]/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Customer Name</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editData.customerName}
                    onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.customerName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                {isEditMode ? (
                  <input
                    type="email"
                    value={editData.customerEmail}
                    onChange={(e) => setEditData({ ...editData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.customerEmail}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                {isEditMode ? (
                  <input
                    type="tel"
                    value={editData.customerPhone}
                    onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-[#0A0A0A]/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Location {isEditMode && <span className="text-red-400">*</span>}
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.location}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.category}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Preferred Date</label>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editData.preferredDate || ''}
                    onChange={(e) => setEditData({ ...editData, preferredDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.preferredDate ? new Date(editData.preferredDate).toLocaleDateString() : 'Not specified'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Urgency Level</label>
                {isEditMode ? (
                  <select
                    value={editData.urgency}
                    onChange={(e) => setEditData({ ...editData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  >
                    <option value="low">Low - Flexible timeline</option>
                    <option value="normal">Normal - Within a month</option>
                    <option value="medium">Medium - Within 2 weeks</option>
                    <option value="high">High - Within 1 week</option>
                    <option value="urgent">Urgent - ASAP</option>
                  </select>
                ) : (
                  <p className="text-white capitalize">{editData.urgency}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status & Assignment */}
          <div className="bg-[#0A0A0A]/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Status & Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                {isEditMode ? (
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <p className="text-white capitalize">{editData.status.replace('-', ' ')}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
                {isEditMode ? (
                  <select
                    value={editData.priority}
                    onChange={(e) => setEditData({ ...editData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <p className="text-white capitalize">{editData.priority}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Assigned To</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editData.assignedTo || ''}
                    onChange={(e) => setEditData({ ...editData, assignedTo: e.target.value })}
                    placeholder="Enter worker name"
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.assignedTo || 'Not assigned'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Requested Date</label>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editData.requestedDate}
                    onChange={(e) => setEditData({ ...editData, requestedDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{new Date(editData.requestedDate).toLocaleDateString()}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Scheduled Date</label>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editData.scheduledDate || ''}
                    onChange={(e) => setEditData({ ...editData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.scheduledDate ? new Date(editData.scheduledDate).toLocaleDateString() : 'Not scheduled'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Completed Date</label>
                {isEditMode ? (
                  <input
                    type="date"
                    value={editData.completedDate || ''}
                    onChange={(e) => setEditData({ ...editData, completedDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white">{editData.completedDate ? new Date(editData.completedDate).toLocaleDateString() : 'Not completed'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cost Information */}
          <div className="bg-[#0A0A0A]/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Cost Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Estimated Cost</label>
                {isEditMode ? (
                  <input
                    type="number"
                    value={editData.estimatedCost}
                    onChange={(e) => setEditData({ ...editData, estimatedCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white text-xl font-bold">${editData.estimatedCost.toLocaleString()}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Actual Cost</label>
                {isEditMode ? (
                  <input
                    type="number"
                    value={editData.actualCost || ''}
                    onChange={(e) => setEditData({ ...editData, actualCost: parseFloat(e.target.value) || undefined })}
                    placeholder="Enter actual cost"
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                ) : (
                  <p className="text-white text-xl font-bold">{editData.actualCost ? `$${editData.actualCost.toLocaleString()}` : 'Not set'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
              {isEditMode ? (
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              ) : (
                <p className="text-gray-300 bg-[#0A0A0A] p-4 rounded-lg">{editData.notes || 'No notes'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Additional Notes</label>
              {isEditMode ? (
                <textarea
                  value={editData.additionalNotes || ''}
                  onChange={(e) => setEditData({ ...editData, additionalNotes: e.target.value })}
                  rows={3}
                  placeholder="Add any additional notes..."
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              ) : (
                <p className="text-gray-300 bg-[#0A0A0A] p-4 rounded-lg">{editData.additionalNotes || 'No additional notes'}</p>
              )}
            </div>
          </div>

          {/* Waste & Disposal Section */}
          <div className="bg-gradient-to-br from-green-600/10 to-green-600/5 border-2 border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Recycle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-200">Waste & Disposal Information</h3>
                <p className="text-sm text-green-300">Debris removal and disposal details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasWaste"
                  checked={editData.wasteDisposal?.hasWaste || false}
                  onChange={(e) => setEditData({
                    ...editData,
                    wasteDisposal: {
                      ...(editData.wasteDisposal || { hasWaste: false, wasteType: '', estimatedAmount: '', needsRemoval: false, videos: [] }),
                      hasWaste: e.target.checked
                    }
                  })}
                  disabled={!isEditMode}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                />
                <label htmlFor="hasWaste" className="text-sm text-gray-300 cursor-pointer">
                  This project generates waste/debris that needs disposal
                </label>
              </div>

              {editData.wasteDisposal?.hasWaste && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Type of Waste</label>
                      {isEditMode ? (
                        <select
                          value={editData.wasteDisposal?.wasteType || ''}
                          onChange={(e) => setEditData({
                            ...editData,
                            wasteDisposal: {
                              ...(editData.wasteDisposal || { hasWaste: true, wasteType: '', estimatedAmount: '', needsRemoval: false, videos: [] }),
                              wasteType: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                        >
                          <option value="">Select type...</option>
                          <option value="construction">Construction Debris</option>
                          <option value="demolition">Demolition Waste</option>
                          <option value="renovation">Renovation Materials</option>
                          <option value="mixed">Mixed Waste</option>
                          <option value="recyclable">Recyclable Materials</option>
                          <option value="hazardous">Hazardous Materials</option>
                        </select>
                      ) : (
                        <p className="text-white capitalize">{editData.wasteDisposal?.wasteType || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Estimated Amount</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editData.wasteDisposal?.estimatedAmount || ''}
                          onChange={(e) => setEditData({
                            ...editData,
                            wasteDisposal: {
                              ...(editData.wasteDisposal || { hasWaste: true, wasteType: '', estimatedAmount: '', needsRemoval: false, videos: [] }),
                              estimatedAmount: e.target.value
                            }
                          })}
                          placeholder="e.g., 2 cubic yards, 10 bags"
                          className="w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                        />
                      ) : (
                        <p className="text-white">{editData.wasteDisposal?.estimatedAmount || 'Not specified'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="needsRemoval"
                      checked={editData.wasteDisposal?.needsRemoval || false}
                      onChange={(e) => setEditData({
                        ...editData,
                        wasteDisposal: {
                          ...(editData.wasteDisposal || { hasWaste: true, wasteType: '', estimatedAmount: '', needsRemoval: false, videos: [] }),
                          needsRemoval: e.target.checked
                        }
                      })}
                      disabled={!isEditMode}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                    />
                    <label htmlFor="needsRemoval" className="text-sm text-gray-300 cursor-pointer">
                      Professional waste removal service required
                    </label>
                  </div>

                  {/* Video Documentation */}
                  <div className="border-t-2 border-green-500/20 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="w-5 h-5 text-green-400" />
                      <h5 className="font-medium text-green-200">Video Documentation</h5>
                    </div>
                    {isEditMode ? (
                      <>
                        <p className="text-sm text-green-300 mb-3">
                          Record videos showing the current state, existing materials, or areas that will generate waste.
                        </p>
                        <VideoCapture
                          onVideosChanged={(videos) => {
                            setEditData({
                              ...editData,
                              wasteDisposal: {
                                ...(editData.wasteDisposal || { hasWaste: true, wasteType: '', estimatedAmount: '', needsRemoval: false, videos: [] }),
                                videos
                              }
                            });
                          }}
                          maxDuration={180}
                          maxFileSize={100}
                          showThumbnails={true}
                          allowMultiple={true}
                        />
                      </>
                    ) : (
                      <>
                        {editData.wasteDisposal?.videos && editData.wasteDisposal.videos.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm text-green-300">
                              {editData.wasteDisposal.videos.length} video{editData.wasteDisposal.videos.length > 1 ? 's' : ''} attached
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {editData.wasteDisposal.videos.map((video, idx) => (
                                <div key={idx} className="bg-[#0A0A0A] rounded-lg p-2 border border-gray-700">
                                  <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-green-400" />
                                    <span className="text-xs text-gray-400 truncate">{video.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No videos attached</p>
                        )}
                      </>
                    )}
                    {editData.wasteDisposal?.videos && editData.wasteDisposal.videos.length > 0 && (
                      <div className="mt-3 p-3 bg-green-600/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-green-200">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{editData.wasteDisposal.videos.length} video{editData.wasteDisposal.videos.length > 1 ? 's' : ''} recorded</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-[#0A0A0A]/50 flex items-center justify-end gap-3">
          {isEditMode ? (
            <>
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#fb923c] rounded-xl font-semibold hover:shadow-lg hover:shadow-[#ea580c]/20 transition-all"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
