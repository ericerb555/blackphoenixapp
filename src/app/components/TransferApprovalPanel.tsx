/**
 * Transfer Approval Panel - Admin interface for reviewing hour transfer requests
 * Shows pending transfers and allows approval/denial
 */

import { useState, useEffect } from 'react';
import { 
  ArrowRight, Clock, CheckCircle, XCircle, User, 
  AlertCircle, Loader2, Calendar, MessageSquare 
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface HourTransferRequest {
  id: string;
  fromSubscriptionId: string;
  fromCustomerName: string;
  toSubscriptionId: string;
  toCustomerName: string;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'completed';
  requestedAt: string;
  requestedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  completedAt?: string;
  fromCustomerPhone?: string;
  verifiedAt?: string;
}

interface TransferApprovalPanelProps {
  adminName?: string;
  onTransferProcessed?: () => void;
}

export default function TransferApprovalPanel({ 
  adminName = 'Admin',
  onTransferProcessed 
}: TransferApprovalPanelProps) {
  const [pendingTransfers, setPendingTransfers] = useState<HourTransferRequest[]>([]);
  const [allTransfers, setAllTransfers] = useState<HourTransferRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    loadTransfers();
    // Poll for new transfers every 30 seconds
    const interval = setInterval(loadTransfers, 30000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === 'pending' 
        ? '/hour-transfers/pending'
        : '/hour-transfers/all';
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        // Silently fail - endpoint might not be available yet
        setPendingTransfers([]);
        setAllTransfers([]);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (viewMode === 'pending') {
        setPendingTransfers(data.transfers || []);
      } else {
        setAllTransfers(data.transfers || []);
      }
    } catch (error: any) {
      // Silently fail instead of showing error - this is not critical
      // Console log for debugging only
      if (error.message !== 'Failed to fetch') {
        console.log('Transfer loading info:', error.message);
      }
      setPendingTransfers([]);
      setAllTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (transferId: string, action: 'approve' | 'deny') => {
    setProcessingId(transferId);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/hour-transfers/review/${transferId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            action,
            reviewedBy: adminName,
            reviewNotes: reviewNotes[transferId] || ''
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} transfer`);
      }

      toast.success(
        action === 'approve' 
          ? '✅ Transfer approved and processed!' 
          : '❌ Transfer denied'
      );
      
      // Clear the notes for this transfer
      setReviewNotes(prev => {
        const updated = { ...prev };
        delete updated[transferId];
        return updated;
      });

      // Reload transfers
      await loadTransfers();

      if (onTransferProcessed) {
        onTransferProcessed();
      }
    } catch (error: any) {
      console.error(`Failed to ${action} transfer:`, error);
      toast.error(error.message || `Failed to ${action} transfer`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'approved': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'denied': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const transfers = viewMode === 'pending' ? pendingTransfers : allTransfers;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-purple-400" />
              Hour Transfer Requests
            </h3>
            <p className="text-sm text-gray-400 mt-1">Review and approve customer transfer requests</p>
          </div>
          <button
            onClick={loadTransfers}
            className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition flex items-center gap-2"
            disabled={loading}
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'pending'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
            }`}
          >
            Pending ({pendingTransfers.length})
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'history'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#0A0A0A] text-gray-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Transfer List */}
      <div className="p-6">
        {loading && transfers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {viewMode === 'pending' 
                ? 'No pending transfer requests' 
                : 'No transfer history'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-lg font-bold text-white">
                        {transfer.fromCustomerName}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                      <div className="text-lg font-bold text-white">
                        {transfer.toCustomerName}
                      </div>
                      {transfer.verifiedAt && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded-lg">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-400 font-bold">SMS Verified</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(transfer.requestedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Requested by: {transfer.requestedBy}
                      </span>
                      {transfer.fromCustomerPhone && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {transfer.fromCustomerPhone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">{transfer.hours}h</div>
                      <div className="text-xs text-gray-500">to transfer</div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg border text-xs font-bold uppercase ${getStatusColor(transfer.status)}`}>
                      {transfer.status}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-500 mb-1">Reason:</div>
                  <div className="text-sm text-gray-300">{transfer.reason}</div>
                </div>

                {/* Review Section (Pending only) */}
                {transfer.status === 'pending' && (
                  <>
                    <textarea
                      value={reviewNotes[transfer.id] || ''}
                      onChange={(e) => setReviewNotes(prev => ({
                        ...prev,
                        [transfer.id]: e.target.value
                      }))}
                      placeholder="Optional: Add review notes..."
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ea580c] mb-3"
                      rows={2}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReview(transfer.id, 'deny')}
                        disabled={processingId === transfer.id}
                        className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === transfer.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Deny
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReview(transfer.id, 'approve')}
                        disabled={processingId === transfer.id}
                        className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === transfer.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Approve & Execute
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Review Details (History) */}
                {transfer.status !== 'pending' && (
                  <div className="border-t border-[#2A2A2A] pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Reviewed By:</div>
                        <div className="text-gray-300">{transfer.reviewedBy || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Reviewed At:</div>
                        <div className="text-gray-300">
                          {transfer.reviewedAt ? formatDate(transfer.reviewedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    {transfer.reviewNotes && (
                      <div className="mt-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Review Notes:</div>
                        <div className="text-sm text-gray-300">{transfer.reviewNotes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}