/**
 * Gift Hours Modal
 * Request to gift hours to customer subscription
 * Requires owner/assignee approval
 */

import { useState, useEffect } from 'react';
import { X, Gift, Clock, User, MessageSquare, AlertCircle, Sparkles, Crown, Palette, Pencil, Hammer } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import * as SupabaseData from '../lib/supabase-data';

interface GiftHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription?: SupabaseData.Subscription | null;
  onSuccess: () => void;
  userRole: 'owner' | 'assignee' | 'employee';
  userName: string;
}

export default function GiftHoursModal({
  isOpen,
  onClose,
  subscription,
  onSuccess,
  userRole,
  userName
}: GiftHoursModalProps) {
  const [hours, setHours] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'standard' | 'urgent'>('standard');
  const [submitting, setSubmitting] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SupabaseData.Subscription[]>([]);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [workType, setWorkType] = useState<'general' | 'design-center' | 'content-center' | 'custom'>('general');
  const [customWorkType, setCustomWorkType] = useState('');

  // Work type options
  const workTypeOptions = [
    {
      id: 'general',
      label: 'General Hours',
      description: 'Standard service hours for any use',
      icon: Clock,
      color: 'purple'
    },
    {
      id: 'design-center',
      label: 'Design Studio Pro',
      description: 'Hours for design work, floor plans, 3D modeling',
      icon: Palette,
      color: 'blue'
    },
    {
      id: 'content-center',
      label: 'Content Creation Center',
      description: 'Hours for content creation, marketing materials, ads',
      icon: Pencil,
      color: 'green'
    },
    {
      id: 'custom',
      label: 'Custom Work Type',
      description: 'Specify a custom type of work',
      icon: Hammer,
      color: 'orange'
    }
  ];

  useEffect(() => {
    if (isOpen && !subscription) {
      loadSubscriptions();
    }
    if (subscription) {
      setSelectedSubId(subscription.id);
    }
  }, [isOpen, subscription]);

  async function loadSubscriptions() {
    try {
      const data = await SupabaseData.getSubscriptions();
      const customerSubs = data.filter(s => s.type === 'customer' && s.status === 'active');
      setSubscriptions(customerSubs);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  }

  async function handleSubmit() {
    if (!selectedSubId) {
      toast.error('Please select a customer subscription');
      return;
    }
    if (hours <= 0) {
      toast.error('Please enter a valid number of hours');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      setSubmitting(true);

      // If owner, gift directly. Otherwise, create pending request
      if (userRole === 'owner') {
        await SupabaseData.giftHours(selectedSubId, hours, reason, userName);
        toast.success(`✅ ${hours} hours gifted successfully!`);
      } else {
        await SupabaseData.createGiftHoursRequest({
          subscriptionId: selectedSubId,
          hours,
          reason,
          urgency,
          requestedBy: userName,
          status: 'pending'
        });
        toast.success('🕐 Gift hours request submitted for approval');
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error gifting hours:', error);
      toast.error('Failed to process gift hours request');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setHours(0);
    setReason('');
    setUrgency('standard');
    setSelectedSubId('');
    onClose();
  }

  if (!isOpen) return null;

  const selectedSub = subscription || subscriptions.find(s => s.id === selectedSubId);
  const canApproveDirectly = userRole === 'owner';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Gift className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gift Hours to Customer</h2>
              <p className="text-sm text-gray-400">
                {canApproveDirectly ? 'Instantly gift hours as owner' : 'Request approval to gift hours'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Owner Badge */}
        {canApproveDirectly && (
          <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-[#ea580c]/10 to-purple-500/10 border border-[#ea580c]/20 rounded-xl flex items-start gap-3">
            <Crown className="w-5 h-5 text-[#ea580c] mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#ea580c] mb-1">Owner Privileges</div>
              <div className="text-sm text-gray-400">
                As owner, your gift hours requests are automatically approved and applied immediately.
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Customer Selection */}
          {!subscription && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Customer Subscription
              </label>
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className="w-full px-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Choose a customer...</option>
                {subscriptions.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.stakeholderName} - {sub.plan} ({sub.hoursIncluded || 0} hrs/month)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Customer Info */}
          {selectedSub && (
            <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-white">{selectedSub.stakeholderName}</div>
                  <div className="text-xs text-gray-400">{selectedSub.plan}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Current Balance</div>
                  <div className="text-lg font-bold text-white">
                    {(selectedSub.hoursIncluded || 0) - (selectedSub.hoursUsed || 0)} hrs
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-[#1a1a1a] rounded-lg">
                  <div className="text-gray-500 mb-1">Included</div>
                  <div className="text-blue-400 font-medium">{selectedSub.hoursIncluded || 0} hrs</div>
                </div>
                <div className="p-2 bg-[#1a1a1a] rounded-lg">
                  <div className="text-gray-500 mb-1">Rollover</div>
                  <div className="text-green-400 font-medium">{selectedSub.hoursRollover || 0} hrs</div>
                </div>
                <div className="p-2 bg-[#1a1a1a] rounded-lg">
                  <div className="text-gray-500 mb-1">Gifted</div>
                  <div className="text-purple-400 font-medium">{selectedSub.hoursGifted || 0} hrs</div>
                </div>
              </div>
            </div>
          )}

          {/* Work Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Work Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {workTypeOptions.map(option => {
                const Icon = option.icon;
                const isSelected = workType === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => setWorkType(option.id as 'general' | 'design-center' | 'content-center' | 'custom')}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      isSelected
                        ? option.color === 'purple' ? 'border-purple-500 bg-purple-500/10'
                        : option.color === 'blue' ? 'border-blue-500 bg-blue-500/10'
                        : option.color === 'green' ? 'border-green-500 bg-green-500/10'
                        : 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-[#2a2a2a] hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${
                        isSelected
                          ? option.color === 'purple' ? 'text-purple-400'
                          : option.color === 'blue' ? 'text-blue-400'
                          : option.color === 'green' ? 'text-green-400'
                          : 'text-orange-400'
                          : 'text-gray-400'
                      }`} />
                      <div className="text-sm font-medium text-white">{option.label}</div>
                    </div>
                    <div className="text-xs text-gray-400">{option.description}</div>
                  </button>
                );
              })}
            </div>
            {workType === 'custom' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={customWorkType}
                  onChange={(e) => setCustomWorkType(e.target.value)}
                  placeholder="e.g., Structural engineering, AI consulting, etc."
                  className="w-full px-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            )}
          </div>

          {/* Hours to Gift */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hours to Gift
            </label>
            <div className="relative">
              <Clock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours || ''}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                placeholder="Enter number of hours"
                className="w-full pl-10 pr-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {[1, 2, 4, 8].map(h => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className="px-3 py-1 bg-[#2a2a2a] hover:bg-purple-500/20 border border-gray-700 hover:border-purple-500 text-gray-300 hover:text-purple-400 rounded-lg text-sm transition"
                >
                  {h} hr{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for Gifting
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer satisfaction gesture, compensation for service delay, loyalty reward..."
              className="w-full px-4 py-3 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              rows={4}
            />
            <div className="mt-2 text-xs text-gray-500">
              {canApproveDirectly ? 'This will be logged for record keeping' : 'Owner will review your request'}
            </div>
          </div>

          {/* Urgency (non-owners only) */}
          {!canApproveDirectly && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Request Priority
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUrgency('standard')}
                  className={`p-4 rounded-lg border-2 transition ${
                    urgency === 'standard'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-[#2a2a2a] hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium text-white mb-1">Standard</div>
                  <div className="text-xs text-gray-400">Regular approval process</div>
                </button>
                <button
                  onClick={() => setUrgency('urgent')}
                  className={`p-4 rounded-lg border-2 transition ${
                    urgency === 'urgent'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-[#2a2a2a] hover:border-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium text-white mb-1">Urgent</div>
                  <div className="text-xs text-gray-400">Requires immediate review</div>
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedSub && hours > 0 && (
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-purple-400 mb-2">Summary</div>
                  <div className="text-sm text-gray-300">
                    <strong>{hours}</strong> hour{hours !== 1 ? 's' : ''} will be {canApproveDirectly ? 'immediately' : 'pending approval to be'} added to{' '}
                    <strong>{selectedSub.stakeholderName}</strong>'s subscription
                    {workType !== 'general' && (
                      <span className="text-blue-400">
                        {' '}for <strong>
                          {workType === 'design-center' ? 'Design Studio Pro' 
                            : workType === 'content-center' ? 'Content Creation Center'
                            : customWorkType || 'Custom Work'}
                        </strong>
                      </span>
                    )}.
                  </div>
                  {selectedSub.hoursIncluded && (
                    <div className="text-xs text-gray-400 mt-2">
                      New total available: {((selectedSub.hoursIncluded || 0) - (selectedSub.hoursUsed || 0) + hours).toFixed(1)} hours
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedSubId || hours <= 0 || !reason.trim() || submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  {canApproveDirectly ? 'Gift Hours' : 'Submit Request'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}