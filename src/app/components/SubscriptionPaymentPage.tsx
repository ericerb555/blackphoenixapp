/**
 * Subscription Payment Page Component
 * Full-page payment interface for subscription billing
 */

import { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Building2, 
  Calendar, 
  DollarSign, 
  Check,
  Lock,
  AlertCircle,
  Clock,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SubscriptionPaymentPageProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: string;
    name: string;
    plan: string;
    type: string;
    amount: number;
    billingCycle: 'monthly' | 'quarterly' | 'annually';
    status: string;
    nextBillingDate?: string;
    hoursIncluded?: number;
    hoursUsed?: number;
    hoursRemaining?: number;
  };
  onPaymentSuccess: () => void;
}

export default function SubscriptionPaymentPage({
  isOpen,
  onClose,
  subscription,
  onPaymentSuccess,
}: SubscriptionPaymentPageProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card');
  const [processing, setProcessing] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingZip, setBillingZip] = useState('');
  
  // ACH form state
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');

  if (!isOpen) return null;

  const handlePayment = async () => {
    // Validate form
    if (paymentMethod === 'card') {
      if (!cardNumber || !cardName || !expiryDate || !cvv || !billingZip) {
        toast.error('Please fill in all card details');
        return;
      }
    } else {
      if (!routingNumber || !accountNumber || !accountName) {
        toast.error('Please fill in all bank account details');
        return;
      }
    }

    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Payment of $${subscription.amount.toFixed(2)} processed successfully!`);
      onPaymentSuccess();
      onClose();
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0F0F0F] border-b border-[#1a1a1a] p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#ea580c]" />
              Complete Payment
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Secure payment for {subscription.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition"
            disabled={processing}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Payment Method Selection */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-lg border-2 transition ${
                      paymentMethod === 'card'
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 mb-2 ${paymentMethod === 'card' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                    <div className="text-sm font-medium text-white">Credit/Debit Card</div>
                    <div className="text-xs text-gray-400">Visa, Mastercard, Amex</div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('ach')}
                    className={`p-4 rounded-lg border-2 transition ${
                      paymentMethod === 'ach'
                        ? 'border-[#ea580c] bg-[#ea580c]/10'
                        : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <Building2 className={`w-6 h-6 mb-2 ${paymentMethod === 'ach' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                    <div className="text-sm font-medium text-white">Bank Account (ACH)</div>
                    <div className="text-xs text-gray-400">Direct debit</div>
                  </button>
                </div>
              </div>

              {/* Card Payment Form */}
              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={billingZip}
                        onChange={(e) => setBillingZip(e.target.value.slice(0, 10))}
                        placeholder="12345"
                        className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ACH Payment Form */}
              {paymentMethod === 'ach' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setAccountType('checking')}
                        className={`p-3 rounded-lg border-2 transition text-sm font-medium ${
                          accountType === 'checking'
                            ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                            : 'border-[#1a1a1a] text-gray-400 hover:border-[#2a2a2a]'
                        }`}
                      >
                        Checking
                      </button>
                      <button
                        onClick={() => setAccountType('savings')}
                        className={`p-3 rounded-lg border-2 transition text-sm font-medium ${
                          accountType === 'savings'
                            ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                            : 'border-[#1a1a1a] text-gray-400 hover:border-[#2a2a2a]'
                        }`}
                      >
                        Savings
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Routing Number
                    </label>
                    <input
                      type="text"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="123456789"
                      maxLength={9}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))}
                      placeholder="1234567890123"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-200">
                        ACH payments typically take 3-5 business days to process. Your subscription will be activated immediately upon verification.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white">Secure Payment</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Your payment information is encrypted and secure. We never store your full card details.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subscription</span>
                    <span className="text-white font-medium">{subscription.plan}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Stakeholder</span>
                    <span className="text-white">{subscription.name}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Billing Cycle</span>
                    <span className="text-white capitalize">{subscription.billingCycle}</span>
                  </div>

                  {subscription.hoursIncluded !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Hours Included</span>
                      <span className="text-white">{subscription.hoursIncluded}h</span>
                    </div>
                  )}

                  {subscription.nextBillingDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Next Billing</span>
                      <span className="text-white text-xs">{new Date(subscription.nextBillingDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#2a2a2a] pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Total Due</span>
                    <span className="text-2xl font-bold text-[#ea580c]">
                      ${subscription.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full px-6 py-4 bg-[#ea580c] hover:bg-[#ea580c]/90 disabled:bg-[#ea580c]/50 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Complete Payment
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By completing this payment, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
