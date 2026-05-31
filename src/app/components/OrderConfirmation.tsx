/**
 * Order Confirmation Component
 * Shows after successful checkout with tracking codes
 */

import { motion } from 'motion/react';
import { CheckCircle, Package, Mail, Download, ExternalLink, ArrowRight, Copy, Truck, Calendar, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../utils/clipboard';

interface OrderConfirmationProps {
  orderCode: string;
  transactionId: string;
  orderId: string;
  total: number;
  email: string;
  itemCount: number;
  estimatedDelivery?: string;
  onContinueShopping: () => void;
  onTrackOrder: () => void;
}

export default function OrderConfirmation({
  orderCode,
  transactionId,
  orderId,
  total,
  email,
  itemCount,
  estimatedDelivery = '3-5 business days',
  onContinueShopping,
  onTrackOrder
}: OrderConfirmationProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedCode(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedCode(null), 2000);
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute inset-0 rounded-full bg-green-500/30"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-3">Order Confirmed!</h1>
          <p className="text-gray-400 text-lg">
            Thank you for your purchase. We've sent a confirmation email to <span className="text-white font-semibold">{email}</span>
          </p>
        </motion.div>

        {/* Order Summary Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[#2A2A2A]">
            <div className="text-center md:text-left">
              <div className="text-sm text-gray-400 mb-1">Order Total</div>
              <div className="text-3xl font-bold text-[#ea580c]">${total.toFixed(2)}</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-sm text-gray-400 mb-1">Items</div>
              <div className="text-3xl font-bold text-white">{itemCount}</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-sm text-gray-400 mb-1">Estimated Delivery</div>
              <div className="text-lg font-bold text-white">{estimatedDelivery}</div>
            </div>
          </div>

          {/* Tracking Codes */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#ea580c]" />
              Your Tracking Information
            </h3>

            {/* Order Code */}
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Order Code</div>
                    <div className="text-sm text-gray-500 mt-0.5">Use this to track your order</div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(orderCode, 'Order Code')}
                  className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                >
                  {copiedCode === 'Order Code' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  )}
                </button>
              </div>
              <div className="font-mono text-2xl font-bold text-white tracking-wider bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                {orderCode}
              </div>
            </div>

            {/* Transaction ID */}
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Transaction ID</div>
                    <div className="text-sm text-gray-500 mt-0.5">Payment reference number</div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(transactionId, 'Transaction ID')}
                  className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors group"
                >
                  {copiedCode === 'Transaction ID' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  )}
                </button>
              </div>
              <div className="font-mono text-lg font-bold text-white tracking-wider bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
                {transactionId}
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-[#0A0A0A] border border-green-500/20 rounded-lg p-4 text-center">
              <Mail className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400">Confirmation Sent</div>
              <div className="text-xs text-gray-500 mt-1">Check your email</div>
            </div>
            <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4 text-center">
              <Truck className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400">Processing</div>
              <div className="text-xs text-gray-500 mt-1">Order is being prepared</div>
            </div>
            <div className="bg-[#0A0A0A] border border-purple-500/20 rounded-lg p-4 text-center">
              <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400">Delivery</div>
              <div className="text-xs text-gray-500 mt-1">{estimatedDelivery}</div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <button
            onClick={onTrackOrder}
            className="px-6 py-4 bg-gradient-to-r from-[#ea580c] to-orange-700 hover:from-orange-700 hover:to-[#ea580c] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ea580c]/20"
          >
            <Package className="w-5 h-5" />
            Track Your Order
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onContinueShopping}
            className="px-6 py-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ExternalLink className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          <p>Questions about your order? Contact support with your order code.</p>
          <p className="mt-2">You can track your order anytime using the order code above.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
