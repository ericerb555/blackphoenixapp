// Enhanced Multi-Step Checkout with Progress Indicator and Multiple Payment Options
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart,
  User,
  MapPin,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  Lock,
  Truck,
  Package,
  DollarSign,
  Wallet,
  Smartphone,
  Building,
  Calendar,
  Shield,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface CheckoutFlowProps {
  cartItems: any[];
  cartTotal: number;
  onComplete: (orderData: any) => void;
  onCancel: () => void;
}

type CheckoutStep = 'info' | 'shipping' | 'payment' | 'review';

type PaymentMethod = 'card' | 'paypal' | 'apple-pay' | 'google-pay' | 'ach' | 'bnpl';

export default function EnhancedCheckoutFlow({ 
  cartItems, 
  cartTotal, 
  onComplete, 
  onCancel 
}: CheckoutFlowProps) {
  // Guard against a missing/NaN total so the summary never crashes on render.
  const safeCartTotal = typeof cartTotal === 'number' && !Number.isNaN(cartTotal) ? cartTotal : 0;
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('info');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const [shippingInfo, setShippingInfo] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    shippingMethod: 'standard'
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false,
    // ACH
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking' as 'checking' | 'savings',
    // BNPL
    bnplProvider: 'affirm' as 'affirm' | 'klarna' | 'afterpay'
  });

  const steps: { id: CheckoutStep; label: string; icon: any }[] = [
    { id: 'info', label: 'Information', icon: User },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'review', label: 'Review', icon: Check }
  ];

  const getCurrentStepIndex = () => steps.findIndex(s => s.id === currentStep);

  const shippingMethods = [
    { id: 'standard', name: 'Standard Shipping', time: '5-7 business days', price: 0 },
    { id: 'express', name: 'Express Shipping', time: '2-3 business days', price: 15 },
    { id: 'overnight', name: 'Overnight Shipping', time: '1 business day', price: 35 }
  ];

  const paymentMethods: { id: PaymentMethod; name: string; icon: any; description: string }[] = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, Amex' },
    { id: 'paypal', name: 'PayPal', icon: Wallet, description: 'Fast & secure' },
    { id: 'apple-pay', name: 'Apple Pay', icon: Smartphone, description: 'One-tap payment' },
    { id: 'google-pay', name: 'Google Pay', icon: Smartphone, description: 'Quick checkout' },
    { id: 'ach', name: 'Bank Transfer (ACH)', icon: Building, description: 'Direct from bank' },
    { id: 'bnpl', name: 'Buy Now, Pay Later', icon: Calendar, description: 'Split into payments' }
  ];

  const handleNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handlePreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const handleCompleteOrder = async () => {
    setProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const orderData = {
      customer: customerInfo,
      shipping: shippingInfo,
      payment: { method: paymentMethod },
      items: cartItems,
      total: calculateTotal(),
      orderDate: new Date().toISOString()
    };

    onComplete(orderData);
  };

  const calculateShippingCost = () => {
    const method = shippingMethods.find(m => m.id === shippingInfo.shippingMethod);
    return method?.price || 0;
  };

  const calculateTax = () => {
    return safeCartTotal * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return safeCartTotal + calculateShippingCost() + calculateTax();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -top-48 -left-48"></div>
        <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Secure Checkout
            </h1>
          </div>
          <p className="text-slate-400">Complete your purchase in just a few steps</p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = getCurrentStepIndex() > index;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{
                        scale: isCurrent ? 1.1 : 1,
                      }}
                      className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                          : isCurrent
                          ? 'bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-purple-500/50'
                          : 'bg-slate-800/50 border-2 border-slate-700'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-8 h-8 text-white" />
                      ) : (
                        <Icon className={`w-7 h-7 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                      )}
                    </motion.div>
                    <div className="mt-3 text-center">
                      <div className={`text-sm font-semibold ${
                        isCurrent ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-slate-500'
                      }`}>
                        {step.label}
                      </div>
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-4 rounded-full overflow-hidden bg-slate-800">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{
                          width: isCompleted ? '100%' : '0%'
                        }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="grid grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-7">
            <AnimatePresence mode="wait">
              {currentStep === 'info' && (
                <StepCard
                  key="info"
                  title="Contact Information"
                  description="We'll use this to send order updates"
                  icon={User}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={customerInfo.firstName}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                          placeholder="John"
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={customerInfo.lastName}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                          placeholder="Doe"
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                  </div>
                </StepCard>
              )}

              {currentStep === 'shipping' && (
                <StepCard
                  key="shipping"
                  title="Shipping Address"
                  description="Where should we deliver your order?"
                  icon={MapPin}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        placeholder="123 Main Street"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.city}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                          placeholder="San Francisco"
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          State *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.state}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                          placeholder="CA"
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.zipCode}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                          placeholder="94103"
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          Country *
                        </label>
                        <input
                          type="text"
                          value={shippingInfo.country}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Shipping Methods */}
                    <div className="pt-4">
                      <label className="block text-sm font-semibold text-slate-300 mb-3">
                        Shipping Method
                      </label>
                      <div className="space-y-3">
                        {shippingMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setShippingInfo({ ...shippingInfo, shippingMethod: method.id })}
                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                              shippingInfo.shippingMethod === method.id
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                shippingInfo.shippingMethod === method.id
                                  ? 'border-cyan-500 bg-cyan-500'
                                  : 'border-slate-600'
                              }`}>
                                {shippingInfo.shippingMethod === method.id && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-white">{method.name}</div>
                                <div className="text-sm text-slate-400">{method.time}</div>
                              </div>
                            </div>
                            <div className="font-bold text-cyan-400">
                              {method.price === 0 ? 'FREE' : `$${method.price.toFixed(2)}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </StepCard>
              )}

              {currentStep === 'payment' && (
                <StepCard
                  key="payment"
                  title="Payment Method"
                  description="Choose your preferred payment option"
                  icon={CreditCard}
                >
                  <div className="space-y-6">
                    {/* Payment Method Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              paymentMethod === method.id
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <Icon className={`w-5 h-5 ${
                                paymentMethod === method.id ? 'text-cyan-400' : 'text-slate-500'
                              }`} />
                              <div className={`font-semibold text-sm ${
                                paymentMethod === method.id ? 'text-white' : 'text-slate-400'
                              }`}>
                                {method.name}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 text-left">
                              {method.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Payment Details */}
                    {paymentMethod === 'card' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Card Number *
                          </label>
                          <input
                            type="text"
                            value={paymentInfo.cardNumber}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Cardholder Name *
                          </label>
                          <input
                            type="text"
                            value={paymentInfo.cardName}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                              Expiry Date *
                            </label>
                            <input
                              type="text"
                              value={paymentInfo.expiryDate}
                              onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })}
                              placeholder="MM/YY"
                              className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                              CVV *
                            </label>
                            <input
                              type="text"
                              value={paymentInfo.cvv}
                              onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
                              placeholder="123"
                              maxLength={4}
                              className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentInfo.saveCard}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, saveCard: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-600 bg-slate-900/50"
                          />
                          <span className="text-sm text-slate-300">Save card for future purchases</span>
                        </label>
                      </div>
                    )}

                    {paymentMethod === 'ach' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Account Number *
                          </label>
                          <input
                            type="text"
                            value={paymentInfo.accountNumber}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, accountNumber: e.target.value })}
                            placeholder="1234567890"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Routing Number *
                          </label>
                          <input
                            type="text"
                            value={paymentInfo.routingNumber}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, routingNumber: e.target.value })}
                            placeholder="021000021"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Account Type
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setPaymentInfo({ ...paymentInfo, accountType: 'checking' })}
                              className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                                paymentInfo.accountType === 'checking'
                                  ? 'border-cyan-500 bg-cyan-500/10 text-white'
                                  : 'border-slate-700 bg-slate-900/30 text-slate-400'
                              }`}
                            >
                              Checking
                            </button>
                            <button
                              onClick={() => setPaymentInfo({ ...paymentInfo, accountType: 'savings' })}
                              className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                                paymentInfo.accountType === 'savings'
                                  ? 'border-cyan-500 bg-cyan-500/10 text-white'
                                  : 'border-slate-700 bg-slate-900/30 text-slate-400'
                              }`}
                            >
                              Savings
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'bnpl' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-white mb-1">Pay in 4 interest-free payments</h4>
                              <p className="text-sm text-purple-300">
                                Split your purchase into 4 equal payments with no interest or fees
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Select Provider
                          </label>
                          {['affirm', 'klarna', 'afterpay'].map((provider) => (
                            <button
                              key={provider}
                              onClick={() => setPaymentInfo({ ...paymentInfo, bnplProvider: provider as any })}
                              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                                paymentInfo.bnplProvider === provider
                                  ? 'border-purple-500 bg-purple-500/10'
                                  : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                              }`}
                            >
                              <span className="font-semibold text-white capitalize">{provider}</span>
                              {paymentInfo.bnplProvider === provider && (
                                <Check className="w-5 h-5 text-purple-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {['paypal', 'apple-pay', 'google-pay'].includes(paymentMethod) && (
                      <div className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center">
                          <Wallet className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          Continue with {paymentMethods.find(m => m.id === paymentMethod)?.name}
                        </h3>
                        <p className="text-slate-400 mb-6">
                          You'll be redirected to complete your payment securely
                        </p>
                      </div>
                    )}

                    {/* Security Badge */}
                    <div className="flex items-center justify-center gap-2 pt-4 text-sm text-slate-400">
                      <Shield className="w-4 h-4 text-green-400" />
                      <span>Secured by 256-bit SSL encryption</span>
                    </div>
                  </div>
                </StepCard>
              )}

              {currentStep === 'review' && (
                <StepCard
                  key="review"
                  title="Review Order"
                  description="Confirm your order details before completing purchase"
                  icon={Package}
                >
                  <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-cyan-400" />
                        Contact Information
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="text-slate-300">{customerInfo.firstName} {customerInfo.lastName}</div>
                        <div className="text-slate-400">{customerInfo.email}</div>
                        <div className="text-slate-400">{customerInfo.phone}</div>
                      </div>
                    </div>

                    {/* Shipping Info */}
                    <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-cyan-400" />
                        Shipping Address
                      </h4>
                      <div className="space-y-1 text-sm text-slate-300">
                        <div>{shippingInfo.address}</div>
                        <div>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}</div>
                        <div>{shippingInfo.country}</div>
                        <div className="pt-2 text-cyan-400 font-semibold">
                          {shippingMethods.find(m => m.id === shippingInfo.shippingMethod)?.name}
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-cyan-400" />
                        Payment Method
                      </h4>
                      <div className="text-sm text-slate-300">
                        {paymentMethods.find(m => m.id === paymentMethod)?.name}
                        {paymentMethod === 'card' && paymentInfo.cardNumber && (
                          <div className="text-slate-400 mt-1">
                            •••• •••• •••• {paymentInfo.cardNumber.slice(-4)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </StepCard>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              {currentStep !== 'info' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePreviousStep}
                  className="flex-1 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </motion.button>
              )}

              {currentStep !== 'review' ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextStep}
                  className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/50"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCompleteOrder}
                  disabled={processing}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/50 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Complete Order
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="col-span-12 lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-6 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6"
            >
              <h3 className="text-xl font-black text-white mb-4">Order Summary</h3>

              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden">
                      {item.productImage ? (
                        <img 
                          src={item.productImage} 
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white line-clamp-1">
                        {item.productName}
                      </div>
                      <div className="text-xs text-slate-500">Qty: {item.quantity}</div>
                      <div className="text-sm font-bold text-cyan-400 mt-1">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 py-4 border-t border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span className="font-semibold">${safeCartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Shipping</span>
                  <span className="font-semibold">
                    {calculateShippingCost() === 0 ? 'FREE' : `$${calculateShippingCost().toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tax</span>
                  <span className="font-semibold">${calculateTax().toFixed(2)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-green-400">Secure Checkout</div>
                    <div className="text-xs text-green-300/70 mt-1">
                      Your payment information is encrypted and secure
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step Card Component
function StepCard({ 
  title, 
  description, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  description: string; 
  icon: any; 
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">{title}</h3>
          <p className="text-slate-400 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}
