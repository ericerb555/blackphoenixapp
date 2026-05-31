import { useState } from 'react';
import { X, Send, DollarSign, Calendar, Clock, Package, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SendOfferModalProps {
  workRequest: any;
  propertyType: 'condo' | 'landlord' | 'property_manager';
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendOfferModal({ workRequest, propertyType, onClose, onSuccess }: SendOfferModalProps) {
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    estimatedCost: '',
    estimatedDuration: '',
    startDate: '',
    materials: '',
    notes: '',
    recipientEmail: workRequest.contact_email || '',
    recipientName: workRequest.contact_name || workRequest.submitted_by || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.estimatedCost || !formData.recipientEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSending(true);
    
    try {
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-management`;
      
      const response = await fetch(`${API_BASE}/offers/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workRequestId: workRequest.id,
          propertyType,
          recipientEmail: formData.recipientEmail,
          recipientName: formData.recipientName,
          offerDetails: {
            estimatedCost: parseFloat(formData.estimatedCost),
            estimatedDuration: formData.estimatedDuration,
            startDate: formData.startDate,
            materials: formData.materials,
            notes: formData.notes
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Offer sent successfully!');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to send offer');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Failed to send offer');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Send Offer</h2>
              <p className="text-sm text-orange-100">{workRequest.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Work Request Summary */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Work Request Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Description:</span>
                  <span className="text-white">{workRequest.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span className="text-white">{workRequest.location || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Priority:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    workRequest.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                    workRequest.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {workRequest.priority || 'normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recipient Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Recipient Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {/* Offer Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Offer Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Estimated Cost <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="5000.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Estimated Duration
                  </label>
                  <input
                    type="text"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="2-3 weeks"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Proposed Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Materials/Equipment
                </label>
                <input
                  type="text"
                  value={formData.materials}
                  onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                  placeholder="Paint, drywall, lumber, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
                  rows={4}
                  placeholder="Any additional information about the offer..."
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                📧 The offer will be sent to <strong>{formData.recipientEmail || 'the recipient'}</strong> via email with all the details above.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A2A2A] px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={sending}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Offer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
