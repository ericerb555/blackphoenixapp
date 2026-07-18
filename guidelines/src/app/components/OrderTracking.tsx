/**
 * Order Tracking Component
 * Track eCommerce orders and subscription payments separately
 */

import { useState } from 'react';
import { Search, Package, CreditCard, CheckCircle, Truck, Clock, MapPin, User, Mail, Phone, ArrowRight, Box, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

type TrackingType = 'order' | 'payment';

export default function OrderTracking() {
  const [trackingType, setTrackingType] = useState<TrackingType>('order');
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handleTrack = async () => {
    if (!trackingCode.trim()) {
      toast.error('Please enter a tracking code');
      return;
    }

    setLoading(true);
    setOrderData(null);
    setPaymentData(null);

    try {
      let endpoint = '';
      
      // Determine endpoint based on code prefix
      if (trackingCode.startsWith('ORD-') || trackingCode.startsWith('TXN-')) {
        endpoint = `/payment/ecommerce/order/${trackingCode}`;
      } else if (trackingCode.startsWith('PAY-')) {
        endpoint = `/payment/subscription/payment/${trackingCode}`;
      } else {
        toast.error('Invalid tracking code format. Use ORD-XXX, PAY-XXX, or TXN-XXX');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tracking information');
      }

      if (data.order) {
        setOrderData(data.order);
        setTrackingType('order');
      } else if (data.payment) {
        setPaymentData(data.payment);
        setTrackingType('payment');
      }

      toast.success('Tracking information loaded!');
    } catch (error: any) {
      console.error('Tracking error:', error);
      toast.error(error.message || 'Failed to track order');
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'processing': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'shipped': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'delivered': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'refunded': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">Track Your Order</h1>
          <p className="text-gray-400">Enter your order code, payment code, or transaction ID</p>
        </div>

        {/* Search Box */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                placeholder="ORD-XXX-XXX, PAY-XXX-XXX, or TXN-XXX-XXX"
                className="w-full pl-12 pr-4 py-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c] text-lg"
              />
            </div>
            <button
              onClick={handleTrack}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Track
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span>ORD-XXX = eCommerce Order</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              <span>PAY-XXX = Subscription Payment</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              <span>TXN-XXX = Transaction ID</span>
            </div>
          </div>
        </div>

        {/* eCommerce Order Details */}
        {orderData && (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="bg-gradient-to-r from-[#ea580c]/20 to-purple-600/20 border border-[#ea580c]/30 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-8 h-8 text-[#ea580c]" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">eCommerce Order</h2>
                      <p className="text-gray-400">Order Code: {orderData.orderCode}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Transaction ID: {orderData.transactionId}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border font-bold uppercase text-sm ${getOrderStatusColor(orderData.status)}`}>
                  {orderData.status}
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Order Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${orderData.status !== 'cancelled' ? 'bg-green-500' : 'bg-gray-600'}`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">Order Placed</div>
                    <div className="text-sm text-gray-400">{new Date(orderData.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' ? 'bg-blue-500' : 'bg-gray-600'}`}>
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">Processing</div>
                    <div className="text-sm text-gray-400">
                      {orderData.status === 'processing' || orderData.status === 'shipped' || orderData.status === 'delivered' ? 'Order is being processed' : 'Waiting...'}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${orderData.status === 'shipped' || orderData.status === 'delivered' ? 'bg-purple-500' : 'bg-gray-600'}`}>
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">Shipped</div>
                    <div className="text-sm text-gray-400">
                      {orderData.tracking?.trackingNumber ? `Tracking: ${orderData.tracking.trackingNumber}` : 'Waiting for shipment...'}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${orderData.status === 'delivered' ? 'bg-green-500' : 'bg-gray-600'}`}>
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">Delivered</div>
                    <div className="text-sm text-gray-400">
                      {orderData.status === 'delivered' ? 'Order delivered!' : `Est: ${orderData.tracking?.estimatedDelivery || 'TBD'}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-[#ea580c]" />
                    <div className="text-sm text-gray-400">Name</div>
                  </div>
                  <div className="text-white font-semibold">{orderData.customer.fullName}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-[#ea580c]" />
                    <div className="text-sm text-gray-400">Email</div>
                  </div>
                  <div className="text-white font-semibold">{orderData.customer.email}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-[#ea580c]" />
                    <div className="text-sm text-gray-400">Phone</div>
                  </div>
                  <div className="text-white font-semibold">{orderData.customer.phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#ea580c]" />
                    <div className="text-sm text-gray-400">Shipping Address</div>
                  </div>
                  <div className="text-white font-semibold">
                    {orderData.shippingAddress.address}<br />
                    {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.zipCode}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Order Items ({orderData.items.length})</h3>
              <div className="space-y-3">
                {orderData.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                        <Box className="w-6 h-6 text-[#ea580c]" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{item.productName}</div>
                        <div className="text-sm text-gray-400">Qty: {item.quantity} × ${item.price.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="text-white font-bold">
                      ${(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Summary */}
              <div className="mt-6 pt-6 border-t border-[#2A2A2A] space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${orderData.pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax</span>
                  <span>${orderData.pricing.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Shipping</span>
                  <span>{orderData.pricing.shipping === 0 ? 'FREE' : `$${orderData.pricing.shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-white text-xl font-bold pt-2 border-t border-[#2A2A2A]">
                  <span>Total</span>
                  <span className="text-[#ea580c]">${orderData.pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Payment Details */}
        {paymentData && (
          <div className="space-y-6">
            {/* Payment Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-8 h-8 text-purple-400" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">Subscription Payment</h2>
                      <p className="text-gray-400">Payment Code: {paymentData.paymentCode}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Transaction ID: {paymentData.transactionId}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border font-bold uppercase text-sm ${getPaymentStatusColor(paymentData.payment.status)}`}>
                  {paymentData.payment.status}
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Payment Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Subscription</span>
                  <span className="text-white font-semibold">{paymentData.subscriptionName}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Plan</span>
                  <span className="text-white font-semibold">{paymentData.planName}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Billing Cycle</span>
                  <span className="text-white font-semibold capitalize">{paymentData.billingCycle}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-[#ea580c] text-2xl font-bold">${paymentData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Payment Method</span>
                  <span className="text-white font-semibold">{paymentData.payment.method} •••• {paymentData.payment.last4}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-lg">
                  <span className="text-gray-400">Payment Date</span>
                  <span className="text-white font-semibold">{new Date(paymentData.createdAt).toLocaleDateString()}</span>
                </div>
                {paymentData.paidDate && (
                  <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-lg">
                    <span className="text-gray-400">Paid Date</span>
                    <span className="text-green-400 font-semibold">{new Date(paymentData.paidDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <div className="text-sm text-gray-400">Name</div>
                  </div>
                  <div className="text-white font-semibold">{paymentData.customer.name}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <div className="text-sm text-gray-400">Email</div>
                  </div>
                  <div className="text-white font-semibold">{paymentData.customer.email}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !orderData && !paymentData && trackingCode && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No results found. Please check your tracking code and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}