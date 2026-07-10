import { useState } from 'react';
import {
  X, Mail, MessageSquare, User, Phone, Send, Gift, Check,
  AlertCircle, Sparkles, DollarSign, Star
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { TextArea } from './ui/input/TextArea';

interface ReferralInviteFormProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
  referrerName: string;
  userType: 'customer' | 'employee' | 'subcontractor' | 'investor' | 'advertiser';
  programDetails: {
    referrerReward: number;
    refereeReward: number;
    description: string;
  };
}

export default function ReferralInviteForm({
  isOpen,
  onClose,
  referralCode,
  referrerName,
  userType,
  programDetails
}: ReferralInviteFormProps) {
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    personalMessage: '',
  });
  const [sendMethod, setSendMethod] = useState<'email' | 'sms' | 'both'>('email');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.recipientName.trim()) {
      toast.error('Please enter recipient\'s name');
      return false;
    }

    if (sendMethod === 'email' || sendMethod === 'both') {
      if (!formData.recipientEmail.trim()) {
        toast.error('Please enter recipient\'s email');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(formData.recipientEmail)) {
        toast.error('Please enter a valid email address');
        return false;
      }
    }

    if (sendMethod === 'sms' || sendMethod === 'both') {
      if (!formData.recipientPhone.trim()) {
        toast.error('Please enter recipient\'s phone number');
        return false;
      }
      if (!/^\+?[\d\s\-\(\)]+$/.test(formData.recipientPhone)) {
        toast.error('Please enter a valid phone number');
        return false;
      }
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setIsSending(true);

    // Simulate API call to send invitation
    try {
      // In production, this would call your backend API to:
      // 1. Create a referral record in database
      // 2. Send email via SendGrid/AWS SES
      // 3. Send SMS via Twilio
      // 4. Track the invitation

      const referralUrl = `${window.location.origin}/signup?ref=${referralCode}`;
      
      // Email template
      const emailSubject = `${referrerName} has invited you - Get $${programDetails.refereeReward} off!`;
      const emailBody = `
Hi ${formData.recipientName},

${referrerName} thinks you'd love our services!

🎁 SPECIAL OFFER: Use code ${referralCode} to get $${programDetails.refereeReward} off your first purchase!

${formData.personalMessage ? `Personal message from ${referrerName}:\n"${formData.personalMessage}"\n\n` : ''}

Sign up here: ${referralUrl}

This is a limited-time offer. Don't miss out!

Best regards,
The Team
      `.trim();

      // SMS template
      const smsMessage = `${referrerName} invited you! Get $${programDetails.refereeReward} off with code ${referralCode}. Sign up: ${referralUrl}`;

      // Mock API calls
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (sendMethod === 'email' || sendMethod === 'both') {
        console.log('Sending email to:', formData.recipientEmail);
        console.log('Subject:', emailSubject);
        console.log('Body:', emailBody);
        
        // In production:
        // await fetch('/api/send-referral-email', {
        //   method: 'POST',
        //   body: JSON.stringify({
        //     to: formData.recipientEmail,
        //     from: referrerName,
        //     subject: emailSubject,
        //     body: emailBody,
        //     referralCode,
        //     recipientName: formData.recipientName
        //   })
        // });
      }

      if (sendMethod === 'sms' || sendMethod === 'both') {
        console.log('Sending SMS to:', formData.recipientPhone);
        console.log('Message:', smsMessage);
        
        // In production:
        // await fetch('/api/send-referral-sms', {
        //   method: 'POST',
        //   body: JSON.stringify({
        //     to: formData.recipientPhone,
        //     message: smsMessage,
        //     referralCode,
        //     recipientName: formData.recipientName
        //   })
        // });
      }

      // Record referral invitation in database
      // await fetch('/api/referrals/invite', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     referralCode,
      //     recipientName: formData.recipientName,
      //     recipientEmail: formData.recipientEmail,
      //     recipientPhone: formData.recipientPhone,
      //     sendMethod,
      //     personalMessage: formData.personalMessage
      //   })
      // });

      setSent(true);
      toast.success(`Invitation sent successfully via ${sendMethod}!`);

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          recipientName: '',
          recipientEmail: '',
          recipientPhone: '',
          personalMessage: '',
        });
        setSent(false);
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getUserTypeLabel = (type: string) => {
    const labels: any = {
      customer: 'Customer',
      employee: 'Team Member',
      subcontractor: 'Partner',
      investor: 'Investor',
      advertiser: 'Advertiser',
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-3xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Invite Someone</h2>
                <p className="text-orange-100 text-sm">Share your referral code and earn rewards</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Success State */}
        {sent && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Invitation Sent! 🎉</h3>
            <p className="text-gray-400">
              Your referral invitation has been sent to {formData.recipientName}
            </p>
          </div>
        )}

        {/* Form State */}
        {!sent && (
          <div className="p-6 space-y-6">
            {/* Promotion Details */}
            <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/10 rounded-2xl border border-orange-500/30 p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">Special Referral Offer</h3>
                  <p className="text-gray-300 text-sm mb-4">{programDetails.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0A0A0A] rounded-xl p-4 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-gray-400">They Get</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-400">${programDetails.refereeReward}</p>
                      <p className="text-xs text-gray-500">Off first purchase</p>
                    </div>
                    
                    <div className="bg-[#0A0A0A] rounded-xl p-4 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-gray-400">You Earn</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">${programDetails.referrerReward}</p>
                      <p className="text-xs text-gray-500">When they purchase</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0A] rounded-xl p-4 border border-orange-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Your Referral Code:</span>
                  <span className="text-xl font-bold text-orange-400 tracking-wider">{referralCode}</span>
                </div>
              </div>
            </div>

            {/* Send Method Selection */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                How would you like to send the invitation?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSendMethod('email')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    sendMethod === 'email'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:border-blue-500/30'
                  }`}
                >
                  <Mail className="w-6 h-6" />
                  <span className="text-sm font-semibold">Email</span>
                </button>

                <button
                  onClick={() => setSendMethod('sms')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    sendMethod === 'sms'
                      ? 'bg-green-600/20 border-green-500 text-green-400'
                      : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:border-green-500/30'
                  }`}
                >
                  <MessageSquare className="w-6 h-6" />
                  <span className="text-sm font-semibold">SMS</span>
                </button>

                <button
                  onClick={() => setSendMethod('both')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    sendMethod === 'both'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                      : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:border-purple-500/30'
                  }`}
                >
                  <Send className="w-6 h-6" />
                  <span className="text-sm font-semibold">Both</span>
                </button>
              </div>
            </div>

            {/* Recipient Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Recipient Information</h4>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => handleInputChange('recipientName', e.target.value)}
                    placeholder="John Smith"
                    className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Email */}
              {(sendMethod === 'email' || sendMethod === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={formData.recipientEmail}
                      onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                      placeholder="john@example.com"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* Phone */}
              {(sendMethod === 'sms' || sendMethod === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="tel"
                      value={formData.recipientPhone}
                      onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* Personal Message */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Personal Message (Optional)
                </label>
                <TextArea
                  value={formData.personalMessage}
                  onChange={(value) => handleInputChange('personalMessage', value)}
                  placeholder="Add a personal note to make your invitation more compelling..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.personalMessage.length}/500 characters
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-300/80">
                  <li>We'll send your referral code with the special offer</li>
                  <li>They sign up using your code and get ${programDetails.refereeReward} off</li>
                  <li>When they make their first purchase, you earn ${programDetails.referrerReward}</li>
                  <li>Everyone wins! 🎉</li>
                </ol>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 rounded-xl hover:bg-[#2A2A2A] transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
              >
                {isSending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
