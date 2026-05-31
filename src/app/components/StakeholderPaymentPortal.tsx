/**
 * Stakeholder Payment Portal
 * 
 * Simplified payment interface for stakeholders accessing from their portal:
 * - View subscription details
 * - Make payments
 * - View payment history
 * - Download invoices
 * - Manage payment methods
 */

import { useState } from 'react';
import {
  CreditCard, DollarSign, Calendar, CheckCircle, Download, Lock,
  Shield, X, ArrowRight, RefreshCw, Receipt, History, Package,
  Clock, Star, TrendingUp, AlertCircle, Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import SubscriptionPaymentPage from './SubscriptionPaymentPage';

interface StakeholderPaymentPortalProps {
  stakeholderName: string;
  stakeholderType: string;
  subscriptions: any[];
}

export default function StakeholderPaymentPortal({
  stakeholderName,
  stakeholderType,
  subscriptions
}: StakeholderPaymentPortalProps) {
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [showPaymentPage, setShowPaymentPage] = useState(false);

  function handlePayNow(subscription: any) {
    setSelectedSubscription(subscription);
    setShowPaymentPage(true);
  }

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalMonthlyAmount = activeSubscriptions.reduce((sum, sub) => {
    if (sub.billingCycle === 'monthly') return sum + sub.amount;
    if (sub.billingCycle === 'quarterly') return sum + (sub.amount / 3);
    if (sub.billingCycle === 'annual') return sum + (sub.amount / 12);
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Payment Center</h2>
            <p className="text-orange-100">
              Manage your {stakeholderType} subscription payments
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-orange-100 mb-1">Monthly Total</div>
            <div className="text-3xl font-bold">
              ${totalMonthlyAmount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Active Plans</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{activeSubscriptions.length}</div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Next Payment</span>
            <Calendar className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-sm font-semibold text-white">
            {activeSubscriptions.length > 0
              ? new Date(
                  Math.min(...activeSubscriptions.map(s => new Date(s.renewalDate).getTime()))
                ).toLocaleDateString()
              : 'N/A'
            }
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Status</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-sm font-semibold text-green-400">All Current</div>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Your Subscriptions</h3>
        
        {activeSubscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-semibold text-white">{subscription.plan}</h4>
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                    {subscription.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  {subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)} Plan
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Amount</div>
                    <div className="text-white font-medium">
                      ${subscription.amount}/<span className="text-gray-400">
                        {subscription.billingCycle === 'monthly' ? 'mo' : 
                         subscription.billingCycle === 'quarterly' ? 'qtr' : 'yr'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Next Billing</div>
                    <div className="text-white">{new Date(subscription.renewalDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Payment Method</div>
                    <div className="text-white">{subscription.paymentMethod}</div>
                  </div>
                </div>
              </div>
              <div className="text-right ml-6">
                <div className="text-3xl font-bold text-white mb-2">
                  ${subscription.amount}
                </div>
                <button
                  onClick={() => handlePayNow(subscription)}
                  className="px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay Now
                </button>
              </div>
            </div>

            {/* Hours Tracking (if applicable) */}
            {subscription.hoursIncluded && (
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Service Hours</span>
                  <span className="text-sm text-white font-medium">
                    {subscription.hoursUsed || 0} / {subscription.hoursIncluded} used
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ea580c] to-[#c2410c]"
                    style={{
                      width: `${((subscription.hoursUsed || 0) / subscription.hoursIncluded) * 100}%`
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{subscription.hoursIncluded - (subscription.hoursUsed || 0)} hours remaining</span>
                  {subscription.hoursRollover > 0 && (
                    <span className="text-blue-400">+{subscription.hoursRollover} rollover</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {activeSubscriptions.length === 0 && (
          <div className="text-center py-12 bg-[#1a1a1a] border border-gray-800 rounded-xl">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <div className="text-gray-400">No active subscriptions</div>
          </div>
        )}
      </div>

      {/* Payment Methods Quick Access */}
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Secure Payments</h3>
            <p className="text-sm text-gray-400 mb-4">
              All payments are encrypted and processed securely. You can manage your payment methods and view transaction history in the Payment Center.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (activeSubscriptions.length > 0) {
                    handlePayNow(activeSubscriptions[0]);
                  }
                }}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Manage Payment Methods
              </button>
              <button
                onClick={() => {
                  if (activeSubscriptions.length > 0) {
                    setSelectedSubscription(activeSubscriptions[0]);
                    setShowPaymentPage(true);
                  }
                }}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                View Payment History
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Benefits */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Benefits</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg mt-0.5">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white mb-1">Auto-Pay Available</div>
              <div className="text-xs text-gray-400">Set it and forget it - never miss a payment</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg mt-0.5">
              <Receipt className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white mb-1">Instant Receipts</div>
              <div className="text-xs text-gray-400">Download invoices anytime</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg mt-0.5">
              <Lock className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white mb-1">Secure Processing</div>
              <div className="text-xs text-gray-400">Bank-level encryption</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg mt-0.5">
              <Star className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white mb-1">Rewards Points</div>
              <div className="text-xs text-gray-400">Earn with every payment</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Page Modal */}
      {selectedSubscription && (
        <SubscriptionPaymentPage
          isOpen={showPaymentPage}
          onClose={() => setShowPaymentPage(false)}
          subscription={{
            id: selectedSubscription.id,
            name: stakeholderName,
            plan: selectedSubscription.plan,
            type: stakeholderType,
            amount: selectedSubscription.amount,
            billingCycle: selectedSubscription.billingCycle,
            status: selectedSubscription.status,
            nextBillingDate: selectedSubscription.renewalDate,
            hoursIncluded: selectedSubscription.hoursIncluded,
            hoursUsed: selectedSubscription.hoursUsed,
            hoursRemaining: (selectedSubscription.hoursIncluded || 0) - (selectedSubscription.hoursUsed || 0)
          }}
          onPaymentSuccess={() => {
            setShowPaymentPage(false);
            toast.success('Payment processed successfully!');
          }}
        />
      )}
    </div>
  );
}
