// Order Detail Modal
// Detailed view of a single order
import { motion } from 'motion/react';
import {
  X,
  Package,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  Download,
  Mail,
  Phone,
  Store
} from 'lucide-react';
import { StandardButton } from './ui/button/StandardButton';
import type { Order } from '../types/ecommerce';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'processing':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'shipped':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'delivered':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'cancelled':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'processing':
        return <Package className="w-5 h-5" />;
      case 'shipped':
        return <Truck className="w-5 h-5" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <X className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-start justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Order #{order.orderNumber}</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border flex items-center gap-2 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#ea580c]" />
              Order Items ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg"
                >
                  {/* Image */}
                  <div className="w-20 h-20 bg-[#1A1A1A] rounded-lg overflow-hidden flex-shrink-0">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{item.productName}</h4>
                    {item.sku && (
                      <div className="text-sm text-gray-400 mb-1">SKU: {item.sku}</div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Qty: {item.quantity}</span>
                      <span>${item.pricePerUnit.toFixed(2)} each</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#ea580c]">
                      ${item.subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipping & Billing */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#ea580c]" />
                  Shipping Address
                </h3>
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <div className="text-white font-semibold">{order.shippingAddress.fullName}</div>
                  {order.shippingAddress.company && (
                    <div className="text-gray-400 text-sm">{order.shippingAddress.company}</div>
                  )}
                  <div className="text-gray-400 text-sm mt-2">
                    {order.shippingAddress.address1}
                    {order.shippingAddress.address2 && (
                      <div>{order.shippingAddress.address2}</div>
                    )}
                    <div>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </div>
                    <div>{order.shippingAddress.country}</div>
                  </div>
                  {order.shippingAddress.phone && (
                    <div className="text-gray-400 text-sm mt-2 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {order.shippingAddress.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#ea580c]" />
                  Payment Method
                </h3>
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-[#ea580c]" />
                    <div>
                      <div className="text-white">{order.paymentMethod}</div>
                      <div className="text-gray-400 text-sm">
                        Payment {order.paymentStatus}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracking */}
              {order.trackingNumber && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#ea580c]" />
                    Tracking
                  </h3>
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                    <div className="text-white font-mono">{order.trackingNumber}</div>
                    {order.shippedAt && (
                      <div className="text-gray-400 text-sm mt-2">
                        Shipped on {new Date(order.shippedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Order Summary</h3>
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-6">
                <div className="space-y-3 mb-4 pb-4 border-b border-[#2A2A2A]">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount</span>
                      <span className="font-semibold">-${order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-300">
                    <span>Tax</span>
                    <span className="font-semibold">${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    {order.shipping === 0 ? (
                      <span className="font-semibold text-green-400">FREE</span>
                    ) : (
                      <span className="font-semibold">${order.shipping.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-white mb-6">
                  <span className="text-xl font-bold">Total</span>
                  <span className="text-2xl font-bold text-[#ea580c]">${order.total.toFixed(2)}</span>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <StandardButton
                    variant="secondary"
                    icon={<Download className="w-4 h-4" />}
                    className="w-full"
                    onClick={() => alert('Invoice download coming soon!')}
                  >
                    Download Invoice
                  </StandardButton>

                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => alert('Order tracking details coming soon!')}
                      className="w-full px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg font-semibold transition-colors"
                    >
                      Track Order
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Notes */}
              {order.customerNotes && (
                <div className="mt-6 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Order Notes</h4>
                  <p className="text-gray-400 text-sm">{order.customerNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-2">Need Help?</h4>
            <p className="text-blue-400 text-sm mb-3">
              If you have any questions about your order, please contact our support team.
            </p>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-colors text-sm">
                <Mail className="w-4 h-4" />
                Email Support
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-colors text-sm">
                <Phone className="w-4 h-4" />
                Call Support
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}