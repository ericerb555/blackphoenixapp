/**
 * Hour Transfer Modal - Customer-to-Customer Transfer with SMS Verification & Admin Approval
 * Step 1: Fill transfer details and send SMS code
 * Step 2: Enter code to verify and submit for admin approval
 */

import { useState, useEffect } from 'react';
import { X, ArrowRight, Clock, User, AlertCircle, CheckCircle, Loader2, Phone, Shield } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import * as SupabaseData from '../lib/supabase-data';

interface HourTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceSubscription: SupabaseData.Subscription;
  onSuccess?: () => void;
}

type Step = 'details' | 'verify';

export default function HourTransferModal({
  isOpen,
  onClose,
  sourceSubscription,
  onSuccess
}: HourTransferModalProps) {
  const [step, setStep] = useState<Step>('details');
  const [subscriptions, setSubscriptions] = useState<SupabaseData.Subscription[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [hours, setHours] = useState('');
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [debugCode, setDebugCode] = useState(''); // For testing only
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes in seconds

  const availableHours = (sourceSubscription?.totalHours || 0) - (sourceSubscription?.usedHours || 0);

  useEffect(() => {
    if (isOpen) {
      loadSubscriptions();
      setStep('details');
      setVerificationCode('');
      setVerificationId('');
      setDebugCode('');
      setCountdown(600);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (step === 'verify' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const allSubs = await SupabaseData.getSubscriptions();
      // Filter out the source subscription
      const others = allSubs.filter(sub => sub.id !== sourceSubscription.id);
      setSubscriptions(others);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      toast.error('Failed to load customer list');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hoursNum = parseFloat(hours);
    
    // Validation
    if (!selectedTargetId) {
      toast.error('Please select a recipient');
      return;
    }
    
    if (!hours || hoursNum <= 0) {
      toast.error('Please enter a valid number of hours');
      return;
    }
    
    if (hoursNum > availableHours) {
      toast.error(`You only have ${availableHours} hours available`);
      return;
    }
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for the transfer');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setSubmitting(true);

    try {
      const targetSub = subscriptions.find(s => s.id === selectedTargetId);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/hour-transfers/send-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            phone: phone.trim(),
            fromSubscriptionId: sourceSubscription.id,
            toSubscriptionId: selectedTargetId,
            hours: hoursNum,
            reason: reason.trim(),
            requestedBy: sourceSubscription.customerName,
            fromCustomerName: sourceSubscription.customerName,
            toCustomerName: targetSub?.customerName
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setVerificationId(data.verificationId);
      if (data.debugCode) {
        setDebugCode(data.debugCode); // For testing only
      }
      setStep('verify');
      setCountdown(600); // Reset to 10 minutes
      toast.success('📱 Verification code sent to your phone!');
    } catch (error: any) {
      console.error('Send code error:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    if (verificationCode.trim().length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/hour-transfers/verify-and-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            verificationId,
            code: verificationCode.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      toast.success('✅ Transfer verified and submitted for admin approval!');
      
      // Reset form
      setSelectedTargetId('');
      setHours('');
      setReason('');
      setPhone('');
      setVerificationCode('');
      setVerificationId('');
      setDebugCode('');
      setStep('details');
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              {step === 'details' ? <ArrowRight className="w-5 h-5 text-white" /> : <Shield className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {step === 'details' ? 'Transfer Hours' : 'Verify Your Phone'}
              </h2>
              <p className="text-sm text-gray-400">
                {step === 'details' 
                  ? 'Step 1: Enter transfer details' 
                  : 'Step 2: Enter verification code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-[#0A0A0A] border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-2 rounded-full ${step === 'details' ? 'bg-purple-600' : 'bg-purple-600'}`} />
            <div className={`flex-1 h-2 rounded-full ${step === 'verify' ? 'bg-purple-600' : 'bg-gray-700'}`} />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className={step === 'details' ? 'text-purple-400 font-medium' : 'text-gray-500'}>
              Transfer Details
            </span>
            <span className={step === 'verify' ? 'text-purple-400 font-medium' : 'text-gray-500'}>
              SMS Verification
            </span>
          </div>
        </div>

        {/* Step 1: Transfer Details */}
        {step === 'details' && (
          <form onSubmit={handleSendCode} className="p-6 space-y-6">
            {/* Source Info */}
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">FROM (Your Account)</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-white">{sourceSubscription.customerName}</div>
                  <div className="text-sm text-gray-400">{sourceSubscription.planName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Available Hours</div>
                  <div className="text-2xl font-bold text-green-400">{availableHours}h</div>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <strong>2-Step Security:</strong> You'll receive an SMS code to verify this transfer before it goes to admin approval.
              </div>
            </div>

            {/* Recipient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transfer To (Recipient)
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#ea580c] animate-spin" />
                </div>
              ) : (
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ea580c]"
                  required
                >
                  <option value="">Select a customer...</option>
                  {subscriptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.customerName} - {sub.planName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Hours Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hours to Transfer
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  min="0.5"
                  step="0.5"
                  max={availableHours}
                  placeholder="0.0"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#ea580c]"
                  required
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Maximum: {availableHours} hours available
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Transfer
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you're transferring these hours..."
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ea580c] min-h-[100px] resize-y"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Phone Number (for SMS verification)
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#ea580c]"
                  required
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                We'll send a 6-digit code to verify this transfer
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-medium transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || loading}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    Send Verification Code
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Verification Code */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyAndSubmit} className="p-6 space-y-6">
            {/* Code Sent Banner */}
            <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-300">
                <strong>Code Sent!</strong> Check your phone for a 6-digit verification code.
              </div>
            </div>

            {/* Debug Code Display (TESTING ONLY) */}
            {debugCode && (
              <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="text-xs text-yellow-500 mb-1">🧪 TESTING MODE - Your verification code:</div>
                <div className="text-3xl font-bold text-yellow-400 tracking-widest text-center py-2">
                  {debugCode}
                </div>
                <div className="text-xs text-yellow-500 text-center mt-1">
                  (In production, this would only be sent via SMS)
                </div>
              </div>
            )}

            {/* Transfer Summary */}
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="text-sm font-medium text-white mb-3">Transfer Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">From:</span>
                  <span className="text-white font-medium">{sourceSubscription.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">To:</span>
                  <span className="text-white font-medium">
                    {subscriptions.find(s => s.id === selectedTargetId)?.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-purple-400 font-bold">{hours} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="text-white font-medium">{phone}</span>
                </div>
              </div>
            </div>

            {/* Verification Code Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Enter 6-Digit Code
                </label>
                <div className="text-sm text-gray-400">
                  Expires in: <span className="text-[#ea580c] font-bold">{formatTime(countdown)}</span>
                </div>
              </div>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-4 text-white text-center text-2xl tracking-widest font-bold focus:outline-none focus:border-[#ea580c]"
                required
                autoFocus
              />
              <div className="mt-2 text-xs text-gray-500 text-center">
                Didn't receive the code? 
                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setVerificationCode('');
                    setVerificationId('');
                    setDebugCode('');
                  }}
                  className="text-[#ea580c] hover:text-[#c2410c] ml-1 underline"
                >
                  Go back and resend
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4 flex gap-3">
              <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-300">
                After verification, your transfer will be submitted for admin approval before being processed.
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep('details');
                  setVerificationCode('');
                }}
                className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-medium transition"
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || verificationCode.length !== 6}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Verify & Submit
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}