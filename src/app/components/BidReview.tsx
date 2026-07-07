import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, DollarSign, Clock, Calendar, 
  Star, Award, TrendingUp, User, Phone, Mail, Package,
  FileText, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface BidReviewProps {
  requestId: string;
  onBidAccepted?: () => void;
}

export default function BidReview({ requestId, onBidAccepted }: BidReviewProps) {
  const [bids, setBids] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [expandedBid, setExpandedBid] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    loadBids();
  }, [requestId]);

  const loadBids = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/provider-bids/request/${requestId}/bids`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBids(data.bids || []);
          setStats(data.stats || {});
        }
      }
    } catch (error) {
      console.error('Error loading bids:', error);
      toast.error('Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    setAccepting(bidId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/provider-bids/accept-bid/${bidId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('✅ Bid accepted! Provider will be notified.');
        loadBids();
        onBidAccepted?.();
      } else {
        toast.error(data.error || 'Failed to accept bid');
      }
    } catch (error) {
      console.error('Error accepting bid:', error);
      toast.error('Failed to accept bid');
    } finally {
      setAccepting(null);
    }
  };

  const handleRejectBid = async (bidId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/provider-bids/reject-bid/${bidId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ reason: 'Not selected' })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success('Bid rejected');
        loadBids();
      } else {
        toast.error(data.error || 'Failed to reject bid');
      }
    } catch (error) {
      console.error('Error rejecting bid:', error);
      toast.error('Failed to reject bid');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#ea580c] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Loading bids...</p>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center">
        <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Bids Yet</h3>
        <p className="text-gray-400">Waiting for providers to submit their bids</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
            <p className="text-sm text-blue-300">Total Bids</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              ${stats.lowestBid ? Math.round(stats.lowestBid).toLocaleString() : '-'}
            </p>
            <p className="text-sm text-green-300">Lowest Bid</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              ${stats.averageBid ? Math.round(stats.averageBid).toLocaleString() : '-'}
            </p>
            <p className="text-sm text-purple-300">Average Bid</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              ${stats.highestBid ? Math.round(stats.highestBid).toLocaleString() : '-'}
            </p>
            <p className="text-sm text-orange-300">Highest Bid</p>
          </div>
        </div>
      </div>

      {/* Bids List */}
      <div className="space-y-3">
        {bids.map((bid, index) => {
          const isExpanded = expandedBid === bid.id;
          const isLowest = bid.bidAmount === stats.lowestBid;
          const isAccepted = bid.status === 'accepted';
          const isRejected = bid.status === 'rejected';

          return (
            <div
              key={bid.id}
              className={`bg-[#1A1A1A] border rounded-xl transition-all ${
                isAccepted
                  ? 'border-green-500/50 bg-green-500/5'
                  : isRejected
                  ? 'border-gray-700 opacity-50'
                  : isLowest
                  ? 'border-[#ea580c]/50'
                  : 'border-[#2A2A2A] hover:border-[#ea580c]/30'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  {/* Left: Provider Info & Bid Amount */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ea580c] to-orange-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white">{bid.providerName}</h4>
                        {isLowest && !isAccepted && (
                          <span className="px-2 py-0.5 bg-[#ea580c]/20 text-[#ea580c] text-xs font-semibold rounded">
                            LOWEST BID
                          </span>
                        )}
                        {isAccepted && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs font-semibold rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            ACCEPTED
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-semibold rounded">
                            REJECTED
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-white font-bold text-lg">${bid.bidAmount.toLocaleString()}</span>
                        </div>
                        {bid.estimatedDuration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {bid.estimatedDuration}
                          </div>
                        )}
                        {bid.proposedStartDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(bid.proposedStartDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {bid.notes && !isExpanded && (
                        <p className="text-sm text-gray-400 line-clamp-2">{bid.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {!isAccepted && !isRejected && (
                      <>
                        <StandardButton
                          variant="success"
                          size="sm"
                          onClick={() => handleAcceptBid(bid.id)}
                          loading={accepting === bid.id}
                          icon={<CheckCircle className="w-4 h-4" />}
                        >
                          Accept
                        </StandardButton>
                        <StandardButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRejectBid(bid.id)}
                        >
                          Decline
                        </StandardButton>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedBid(isExpanded ? null : bid.id)}
                      className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      {isExpanded ? 'Less' : 'Details'}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-4">
                    {/* Full Notes */}
                    {bid.notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-2">NOTES</p>
                        <p className="text-sm text-gray-300">{bid.notes}</p>
                      </div>
                    )}

                    {/* Cost Breakdown */}
                    {(bid.materials?.length > 0 || bid.laborCost) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-2">COST BREAKDOWN</p>
                        <div className="bg-[#0A0A0A] rounded-lg p-3 space-y-2">
                          {bid.laborCost && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Labor</span>
                              <span className="text-white font-semibold">${bid.laborCost.toLocaleString()}</span>
                            </div>
                          )}
                          {bid.materials?.map((material: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-400">{material.name}</span>
                              <span className="text-white font-semibold">${material.cost.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-[#2A2A2A] flex justify-between font-bold">
                            <span className="text-white">Total</span>
                            <span className="text-[#ea580c]">${bid.bidAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Additional Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {bid.warranty && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">WARRANTY</p>
                          <p className="text-sm text-white flex items-center gap-1">
                            <Shield className="w-4 h-4 text-blue-400" />
                            {bid.warranty}
                          </p>
                        </div>
                      )}
                      {bid.includesPermits !== undefined && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 mb-1">PERMITS</p>
                          <p className={`text-sm ${bid.includesPermits ? 'text-green-400' : 'text-gray-400'}`}>
                            {bid.includesPermits ? '✓ Included' : 'Not included'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Submission Date */}
                    <div className="text-xs text-gray-500">
                      Submitted {new Date(bid.submittedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}