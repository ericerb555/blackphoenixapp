import { useState } from 'react';
import {
  CreditCard, Check, X, Edit2, Plus, Trash2, Clock, Calendar,
  DollarSign, TrendingUp, Package, Shield, Crown, Award, Medal,
  Users, CheckCircle, XCircle, Zap, Star, FileText, Download,
  RefreshCw, AlertCircle, Settings, Play, Pause, Ban, Activity,
  ArrowRight, ChevronRight, Mail, Phone, Building2, FolderOpen
} from 'lucide-react';
import { ConfirmModal } from './ui/modal/ConfirmModal';
import { DangerButton } from './ui/button/DangerButton';
import { PrimaryButton } from './ui/button/PrimaryButton';

type SubscriptionStatus = 'pending' | 'active' | 'paused' | 'cancelled' | 'expired';
type BillingCycle = 'monthly' | 'quarterly' | 'annual';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: BillingCycle;
  features: string[];
  icon: any;
  color: string;
  popular?: boolean;
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
}

interface CustomerSubscription {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  nextBillingDate: string;
  autoRenew: boolean;
  usageThisMonth: number;
  usageLimit: number;
  amountPaid: number;
  needsApproval: boolean;
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
  folderId?: string;
}

interface CustomerSubscriptionManagerProps {
  customerId?: string;
  showAllCustomers?: boolean;
  onSubscriptionChange?: (subscription: CustomerSubscription) => void;
}

export default function CustomerSubscriptionManager({
  customerId,
  showAllCustomers = true,
  onSubscriptionChange
}: CustomerSubscriptionManagerProps) {
  const [selectedTab, setSelectedTab] = useState<'active' | 'pending' | 'history'>('active');
  const [showNewSubscription, setShowNewSubscription] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscription | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<{ isOpen: boolean; subscription: CustomerSubscription | null }>({
    isOpen: false,
    subscription: null
  });

  // Available subscription plans
  const [plans] = useState<SubscriptionPlan[]>([
    {
      id: 'PLAN-001',
      name: 'Basic Service',
      description: 'Essential maintenance and support',
      price: 79,
      billingCycle: 'monthly',
      features: ['1 service visit/month', 'Email support', 'Basic diagnostics', '24-hour response time'],
      icon: Package,
      color: 'blue',
      tier: 'basic'
    },
    {
      id: 'PLAN-002',
      name: 'Standard Service',
      description: 'Regular maintenance with priority support',
      price: 149,
      billingCycle: 'monthly',
      features: ['2 service visits/month', 'Priority phone support', 'Advanced diagnostics', '4-hour response time', 'Parts discount 10%'],
      icon: Award,
      color: 'purple',
      popular: true,
      tier: 'standard'
    },
    {
      id: 'PLAN-003',
      name: 'Premium Service',
      description: 'Comprehensive coverage with VIP treatment',
      price: 299,
      billingCycle: 'monthly',
      features: ['4 service visits/month', '24/7 emergency support', 'Complete diagnostics', 'Same-day response', 'Parts discount 25%', 'Annual equipment upgrades'],
      icon: Crown,
      color: 'yellow',
      tier: 'premium'
    },
    {
      id: 'PLAN-004',
      name: 'Enterprise Service',
      description: 'Custom solutions for large properties',
      price: 599,
      billingCycle: 'monthly',
      features: ['Unlimited visits', 'Dedicated account manager', '24/7 priority support', 'Instant response', 'Parts included', 'Equipment replacement program', 'Preventive maintenance'],
      icon: Shield,
      color: 'red',
      tier: 'enterprise'
    }
  ]);

  // Mock customer subscriptions
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([
    {
      id: 'SUB-001',
      customerId: 'CUS-2451',
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah.johnson@email.com',
      plan: plans[1], // Standard Service
      status: 'active',
      startDate: '2025-11-15',
      nextBillingDate: '2026-02-15',
      autoRenew: true,
      usageThisMonth: 1,
      usageLimit: 2,
      amountPaid: 447, // 3 months
      needsApproval: false,
      approvedBy: 'Admin User',
      approvedDate: '2025-11-15',
      folderId: 'F-001'
    },
    {
      id: 'SUB-002',
      customerId: 'CUS-2892',
      customerName: 'Robert Chen',
      customerEmail: 'robert.chen@email.com',
      plan: plans[0], // Basic Service
      status: 'pending',
      startDate: '2026-01-20',
      nextBillingDate: '2026-02-20',
      autoRenew: true,
      usageThisMonth: 0,
      usageLimit: 1,
      amountPaid: 0,
      needsApproval: true,
      folderId: 'F-004'
    },
    {
      id: 'SUB-003',
      customerId: 'CUS-2156',
      customerName: 'David Anderson',
      customerEmail: 'david.a@email.com',
      plan: plans[3], // Enterprise Service
      status: 'active',
      startDate: '2024-06-15',
      nextBillingDate: '2026-02-15',
      autoRenew: true,
      usageThisMonth: 8,
      usageLimit: -1, // unlimited
      amountPaid: 11980, // 20 months
      needsApproval: false,
      approvedBy: 'Admin User',
      approvedDate: '2024-06-15',
      folderId: 'F-011',
      notes: 'VIP customer - multi-property owner. Priority service at all times.'
    },
    {
      id: 'SUB-004',
      customerId: 'CUS-3124',
      customerName: 'Emily Williams',
      customerEmail: 'emily.w@email.com',
      plan: plans[1], // Standard Service
      status: 'pending',
      startDate: '2026-01-21',
      nextBillingDate: '2026-02-21',
      autoRenew: false,
      usageThisMonth: 0,
      usageLimit: 2,
      amountPaid: 0,
      needsApproval: true,
      folderId: 'F-008',
      notes: 'Requested subscription as part of commercial proposal.'
    }
  ]);

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (customerId && sub.customerId !== customerId) return false;
    
    if (selectedTab === 'active') return sub.status === 'active';
    if (selectedTab === 'pending') return sub.status === 'pending';
    if (selectedTab === 'history') return sub.status === 'cancelled' || sub.status === 'expired';
    
    return true;
  });

  const handleApproveSubscription = (subscription: CustomerSubscription) => {
    const updated = {
      ...subscription,
      status: 'active' as SubscriptionStatus,
      needsApproval: false,
      approvedBy: 'Admin User',
      approvedDate: new Date().toISOString().split('T')[0]
    };

    setSubscriptions(subscriptions.map(sub => 
      sub.id === subscription.id ? updated : sub
    ));

    if (onSubscriptionChange) {
      onSubscriptionChange(updated);
    }

    setShowApprovalModal(false);
    setSelectedSubscription(null);
  };

  const handleRejectSubscription = (subscription: CustomerSubscription) => {
    const updated = {
      ...subscription,
      status: 'cancelled' as SubscriptionStatus,
      needsApproval: false,
      notes: (subscription.notes || '') + ' [REJECTED by admin]'
    };

    setSubscriptions(subscriptions.map(sub => 
      sub.id === subscription.id ? updated : sub
    ));

    if (onSubscriptionChange) {
      onSubscriptionChange(updated);
    }

    setShowApprovalModal(false);
    setSelectedSubscription(null);
  };

  const handlePauseSubscription = (subscription: CustomerSubscription) => {
    const updated = {
      ...subscription,
      status: 'paused' as SubscriptionStatus
    };

    setSubscriptions(subscriptions.map(sub => 
      sub.id === subscription.id ? updated : sub
    ));

    if (onSubscriptionChange) {
      onSubscriptionChange(updated);
    }
  };

  const handleResumeSubscription = (subscription: CustomerSubscription) => {
    const updated = {
      ...subscription,
      status: 'active' as SubscriptionStatus
    };

    setSubscriptions(subscriptions.map(sub => 
      sub.id === subscription.id ? updated : sub
    ));

    if (onSubscriptionChange) {
      onSubscriptionChange(updated);
    }
  };

  const handleCancelSubscription = (subscription: CustomerSubscription) => {
    setCancelConfirm({ isOpen: true, subscription });
  };

  const confirmCancelSubscription = () => {
    if (!cancelConfirm.subscription) return;

    const updated = {
      ...cancelConfirm.subscription,
      status: 'cancelled' as SubscriptionStatus,
      autoRenew: false,
      endDate: new Date().toISOString().split('T')[0]
    };

    setSubscriptions(subscriptions.map(sub => 
      sub.id === cancelConfirm.subscription!.id ? updated : sub
    ));

    if (onSubscriptionChange) {
      onSubscriptionChange(updated);
    }

    setCancelConfirm({ isOpen: false, subscription: null });
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active': return 'green';
      case 'pending': return 'yellow';
      case 'paused': return 'orange';
      case 'cancelled': return 'red';
      case 'expired': return 'gray';
    }
  };

  const getStatusIcon = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'pending': return Clock;
      case 'paused': return Pause;
      case 'cancelled': return XCircle;
      case 'expired': return Ban;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic': return 'blue';
      case 'standard': return 'purple';
      case 'premium': return 'yellow';
      case 'enterprise': return 'red';
      default: return 'gray';
    }
  };

  const stats = {
    totalActive: subscriptions.filter(s => s.status === 'active').length,
    totalPending: subscriptions.filter(s => s.needsApproval).length,
    monthlyRevenue: subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.plan.price, 0),
    averageValue: subscriptions.length > 0
      ? subscriptions.reduce((sum, s) => sum + s.amountPaid, 0) / subscriptions.length
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{stats.totalActive}</p>
          <p className="text-sm text-green-700">Active Subscriptions</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            {stats.totalPending > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                {stats.totalPending}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-yellow-900">{stats.totalPending}</p>
          <p className="text-sm text-yellow-700">Pending Approval</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border-2 border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-indigo-900">${stats.monthlyRevenue.toLocaleString()}</p>
          <p className="text-sm text-indigo-700">Monthly Revenue</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">${Math.round(stats.averageValue).toLocaleString()}</p>
          <p className="text-sm text-purple-700">Avg Customer Value</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setSelectedTab('active')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              selectedTab === 'active'
                ? 'bg-green-50 text-green-900 border-b-2 border-green-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Active ({subscriptions.filter(s => s.status === 'active').length})
          </button>
          <button
            onClick={() => setSelectedTab('pending')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors relative ${
              selectedTab === 'pending'
                ? 'bg-yellow-50 text-yellow-900 border-b-2 border-yellow-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pending Approval ({subscriptions.filter(s => s.status === 'pending').length})
            {stats.totalPending > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {stats.totalPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedTab('history')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              selectedTab === 'history'
                ? 'bg-slate-50 text-slate-900 border-b-2 border-slate-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            History
          </button>
        </div>

        {/* Subscription List */}
        <div className="p-6 space-y-4">
          {filteredSubscriptions.map((subscription) => {
            const Icon = subscription.plan.icon;
            const StatusIcon = getStatusIcon(subscription.status);
            const statusColor = getStatusColor(subscription.status);
            const tierColor = getTierColor(subscription.plan.tier);

            return (
              <div
                key={subscription.id}
                className={`border-2 border-${statusColor}-200 rounded-xl p-6 bg-${statusColor}-50/30`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-${tierColor}-500 to-${tierColor}-600 flex items-center justify-center text-white`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{subscription.plan.name}</h3>
                      <p className="text-sm text-slate-600">{subscription.customerName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full bg-${statusColor}-100 text-${statusColor}-700 flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {subscription.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">ID: {subscription.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">${subscription.plan.price}</p>
                    <p className="text-sm text-slate-600">per month</p>
                  </div>
                </div>

                {/* Subscription Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Start Date</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Next Billing</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(subscription.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Usage This Month</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {subscription.usageThisMonth} / {subscription.usageLimit === -1 ? '∞' : subscription.usageLimit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Total Paid</p>
                    <p className="text-sm font-semibold text-green-900">${subscription.amountPaid.toLocaleString()}</p>
                  </div>
                </div>

                {/* Approval Section */}
                {subscription.needsApproval && (
                  <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-700" />
                      <p className="font-bold text-yellow-900">Requires Admin Approval</p>
                    </div>
                    <p className="text-sm text-yellow-800 mb-3">
                      Customer has requested this subscription plan. Review and approve or reject.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowApprovalModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Subscription
                      </button>
                      <DangerButton
                        onClick={() => handleRejectSubscription(subscription)}
                        icon={<XCircle />}
                        size="md"
                      >
                        Reject
                      </DangerButton>
                    </div>
                  </div>
                )}

                {/* Approved Info */}
                {subscription.approvedBy && !subscription.needsApproval && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-green-700">
                      ✓ Approved by {subscription.approvedBy} on {subscription.approvedDate}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {subscription.notes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-slate-600 mb-1 font-semibold">Notes:</p>
                    <p className="text-sm text-slate-700">{subscription.notes}</p>
                  </div>
                )}

                {/* Quick Links */}
                <div className="flex items-center gap-2 mb-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => window.location.href = `/personal-folder-system`}
                    className="flex items-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 text-xs font-semibold"
                  >
                    <FolderOpen className="w-3 h-3" />
                    View Folder
                  </button>
                  <button
                    onClick={() => window.location.href = '/messaging'}
                    className="flex items-center gap-1 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-700 text-xs font-semibold"
                  >
                    <Mail className="w-3 h-3" />
                    Message Customer
                  </button>
                  <button className="flex items-center gap-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg text-purple-700 text-xs font-semibold">
                    <FileText className="w-3 h-3" />
                    View Contract
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {subscription.status === 'active' && (
                    <>
                      <button
                        onClick={() => handlePauseSubscription(subscription)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-semibold"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                      <button
                        onClick={() => handleCancelSubscription(subscription)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold"
                      >
                        <Ban className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}

                  {subscription.status === 'paused' && (
                    <button
                      onClick={() => handleResumeSubscription(subscription)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </button>
                  )}

                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold ml-auto">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}

          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No subscriptions found</h3>
              <p className="text-slate-600">
                {selectedTab === 'pending' && 'No subscriptions waiting for approval'}
                {selectedTab === 'active' && 'No active subscriptions'}
                {selectedTab === 'history' && 'No historical subscriptions'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowApprovalModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
              <h2 className="text-2xl font-bold">Approve Subscription</h2>
              <p className="text-sm opacity-90">Review and approve customer subscription request</p>
            </div>

            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-slate-900 mb-4">Subscription Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Customer</p>
                    <p className="font-semibold text-slate-900">{selectedSubscription.customerName}</p>
                    <p className="text-sm text-slate-600">{selectedSubscription.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Plan</p>
                    <p className="font-semibold text-slate-900">{selectedSubscription.plan.name}</p>
                    <p className="text-sm text-slate-600">${selectedSubscription.plan.price}/month</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Start Date</p>
                    <p className="font-semibold text-slate-900">
                      {new Date(selectedSubscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Auto Renew</p>
                    <p className="font-semibold text-slate-900">
                      {selectedSubscription.autoRenew ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-slate-900 mb-3">Plan Features</h3>
                <ul className="space-y-2">
                  {selectedSubscription.plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApproveSubscription(selectedSubscription)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve & Activate
                </button>
                <DangerButton
                  onClick={() => handleRejectSubscription(selectedSubscription)}
                  icon={<XCircle />}
                  fullWidth
                  size="lg"
                >
                  Reject Request
                </DangerButton>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelConfirm.isOpen}
        onClose={() => setCancelConfirm({ isOpen: false, subscription: null })}
        onConfirm={confirmCancelSubscription}
        title="Cancel Subscription"
        message={`Are you sure you want to cancel ${cancelConfirm.subscription?.customerName}'s subscription to ${cancelConfirm.subscription?.plan.name}? This will stop all future billing and service visits.`}
        variant="danger"
        confirmText="Cancel Subscription"
      />
    </div>
  );
}
