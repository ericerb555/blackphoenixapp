// Payment Gateway Integration
// Stripe-style payment processing
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  DollarSign,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { StandardButton } from './ui/StandardButton';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface PaymentGatewayProps {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (paymentResult: PaymentResult) => void;
  onError: (error: string) => void;
}

interface PaymentResult {
  transactionId: string;
  paymentMethod: string;
  amount: number;
  status: 'succeeded' | 'processing' | 'failed';
  timestamp: string;
  receiptUrl?: string;
}

export default function PaymentGateway({
  amount,
  currency = 'USD',
  description,
  onSuccess,
  onError
}: PaymentGatewayProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'paypal'>('card');
  const [savedCards, setSavedCards] = useState<PaymentMethod[]>([]);
  const [useNewCard, setUseNewCard] = useState(true);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Card form state
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    zipCode: '',
    saveCard: false
  });

  // Bank account form state
  const [bankData, setBankData] = useState({
    accountNumber: '',
    routingNumber: '',
    accountName: '',
    accountType: 'checking' as 'checking' | 'savings'
  });

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substr(0, 19);
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substr(0, 2) + '/' + cleaned.substr(2, 2);
    }
    return cleaned;
  };

  const validateCard = () => {
    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 15) {
      onError('Please enter a valid card number');
      return false;
    }
    if (!cardData.name) {
      onError('Please enter the cardholder name');
      return false;
    }
    if (!cardData.expiry || cardData.expiry.length !== 5) {
      onError('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      onError('Please enter a valid CVV');
      return false;
    }
    return true;
  };

  const processPayment = async () => {
    if (paymentMethod === 'card' && useNewCard) {
      if (!validateCard()) return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing (in production, call Stripe/Square API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success (90% success rate)
      const success = Math.random() > 0.1;

      if (success) {
        const result: PaymentResult = {
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          paymentMethod: paymentMethod === 'card' ? 
            `${getCardBrand(cardData.number)} •••• ${cardData.number.slice(-4)}` : 
            paymentMethod,
          amount,
          status: 'succeeded',
          timestamp: new Date().toISOString(),
          receiptUrl: `https://receipts.example.com/${Date.now()}`
        };

        onSuccess(result);
      } else {
        throw new Error('Payment declined. Please try another card.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getCardBrand = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    return 'Card';
  };

  return (
    <div className="space-y-6">
      {/* Payment Amount */}
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Amount</div>
            <div className="text-3xl font-bold text-white">
              ${amount.toFixed(2)} <span className="text-xl text-gray-400">{currency}</span>
            </div>
            {description && (
              <div className="text-sm text-gray-400 mt-1">{description}</div>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">Payment Method</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setPaymentMethod('card')}
            className={`p-4 rounded-xl border-2 transition-all ${
              paymentMethod === 'card'
                ? 'border-[#ea580c] bg-[#ea580c]/10'
                : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
            }`}
          >
            <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
              paymentMethod === 'card' ? 'text-[#ea580c]' : 'text-gray-400'
            }`} />
            <div className={`text-sm font-semibold ${
              paymentMethod === 'card' ? 'text-white' : 'text-gray-400'
            }`}>
              Card
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('bank')}
            className={`p-4 rounded-xl border-2 transition-all ${
              paymentMethod === 'bank'
                ? 'border-[#ea580c] bg-[#ea580c]/10'
                : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
            }`}
          >
            <Building className={`w-6 h-6 mx-auto mb-2 ${
              paymentMethod === 'bank' ? 'text-[#ea580c]' : 'text-gray-400'
            }`} />
            <div className={`text-sm font-semibold ${
              paymentMethod === 'bank' ? 'text-white' : 'text-gray-400'
            }`}>
              Bank
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('paypal')}
            className={`p-4 rounded-xl border-2 transition-all ${
              paymentMethod === 'paypal'
                ? 'border-[#ea580c] bg-[#ea580c]/10'
                : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
            }`}
          >
            <Shield className={`w-6 h-6 mx-auto mb-2 ${
              paymentMethod === 'paypal' ? 'text-[#ea580c]' : 'text-gray-400'
            }`} />
            <div className={`text-sm font-semibold ${
              paymentMethod === 'paypal' ? 'text-white' : 'text-gray-400'
            }`}>
              PayPal
            </div>
          </button>
        </div>
      </div>

      {/* Card Payment Form */}
      {paymentMethod === 'card' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Saved Cards */}
          {savedCards.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-white">Saved Cards</label>
                <button
                  onClick={() => setUseNewCard(!useNewCard)}
                  className="text-sm text-[#ea580c] hover:text-orange-400"
                >
                  {useNewCard ? 'Use saved card' : 'Use new card'}
                </button>
              </div>

              {!useNewCard && (
                <div className="space-y-2">
                  {savedCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCard(card.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedCard === card.id
                          ? 'border-[#ea580c] bg-[#ea580c]/10'
                          : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#ea580c]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-[#ea580c]" />
                          <div>
                            <div className="text-white font-semibold">
                              {card.brand} •••• {card.last4}
                            </div>
                            <div className="text-sm text-gray-400">
                              Expires {card.expiryMonth}/{card.expiryYear}
                            </div>
                          </div>
                        </div>
                        {card.isDefault && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Card Form */}
          {useNewCard && (
            <div className="space-y-4">
              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Card Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-3 pl-12 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Cardholder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cardholder Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 pl-12 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Expiry Date *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 pl-12 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                    />
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CVV *
                  </label>
                  <input
                    type="text"
                    value={cardData.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCardData({ ...cardData, cvv: value });
                    }}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                  />
                </div>
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  value={cardData.zipCode}
                  onChange={(e) => setCardData({ ...cardData, zipCode: e.target.value })}
                  placeholder="12345"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              {/* Save Card */}
              <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-[#ea580c]/30 transition-colors">
                <input
                  type="checkbox"
                  checked={cardData.saveCard}
                  onChange={(e) => setCardData({ ...cardData, saveCard: e.target.checked })}
                  className="w-5 h-5 rounded border-[#2A2A2A] text-[#ea580c] focus:ring-[#ea580c]"
                />
                <span className="text-white">Save card for future purchases</span>
              </label>
            </div>
          )}
        </motion.div>
      )}

      {/* Bank Account Form */}
      {paymentMethod === 'bank' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">
              Bank transfers typically take 3-5 business days to process.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBankData({ ...bankData, accountType: 'checking' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  bankData.accountType === 'checking'
                    ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400'
                }`}
              >
                Checking
              </button>
              <button
                onClick={() => setBankData({ ...bankData, accountType: 'savings' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  bankData.accountType === 'savings'
                    ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400'
                }`}
              >
                Savings
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account Number *
            </label>
            <input
              type="text"
              value={bankData.accountNumber}
              onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
              placeholder="000123456789"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Routing Number *
            </label>
            <input
              type="text"
              value={bankData.routingNumber}
              onChange={(e) => setBankData({ ...bankData, routingNumber: e.target.value })}
              placeholder="110000000"
              maxLength={9}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={bankData.accountName}
              onChange={(e) => setBankData({ ...bankData, accountName: e.target.value })}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
            />
          </div>
        </motion.div>
      )}

      {/* PayPal */}
      {paymentMethod === 'paypal' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-8 text-center"
        >
          <Shield className="w-16 h-16 text-[#ea580c] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Pay with PayPal</h3>
          <p className="text-gray-400 mb-6">
            You'll be redirected to PayPal to complete your payment securely.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              PayPal integration coming soon! For now, use card or bank payment.
            </p>
          </div>
        </motion.div>
      )}

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-green-400 font-semibold text-sm mb-1">Secure Payment</div>
          <div className="text-green-300 text-sm">
            Your payment information is encrypted and secure. We never store your full card details.
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <StandardButton
        variant="primary"
        onClick={processPayment}
        disabled={processing || (paymentMethod === 'paypal')}
        icon={processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
        className="w-full"
      >
        {processing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)}`}
      </StandardButton>
    </div>
  );
}
