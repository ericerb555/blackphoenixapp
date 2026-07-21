/**
 * Subscription Payment Dashboard Component
 * Comprehensive payment tracking and analytics dashboard
 */

import { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Search,
  Building2,
  User,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface SubscriptionPaymentDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentRecord {
  id: string;
  stakeholderName: string;
  stakeholderType: string;
  subscriptionPlan: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId: string;
  date: string;
  billingCycle: string;
}

interface PaymentStats {
  totalRevenue: number;
  revenueChange: number;
  totalTransactions: number;
  transactionsChange: number;
  successRate: number;
  successRateChange: number;
  averagePayment: number;
  averagePaymentChange: number;
  pendingAmount: number;
  failedAmount: number;
}

export default function SubscriptionPaymentDashboard({
  isOpen,
  onClose,
}: SubscriptionPaymentDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'year'>('30days');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setLoadingPayments(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sign in with an administrator account to view payments.');
        const response = await fetch(`${SERVER}/payments`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load payment records.');
        const mapped = (result.payments || []).map((payment: any): PaymentRecord => ({
          id: String(payment.id),
          stakeholderName: payment.subscription?.stakeholderName || payment.invoice?.customer_name || payment.customerEmail || 'Customer',
          stakeholderType: payment.subscription?.type || (payment.invoice ? 'Invoice customer' : 'Customer'),
          subscriptionPlan: payment.subscription?.plan || payment.invoice?.description || 'Payment',
          amount: Number(payment.amount || 0),
          status: payment.status === 'paid' ? 'completed' : payment.status === 'failed' ? 'failed' : payment.status === 'refunded' ? 'refunded' : 'pending',
          paymentMethod: payment.status === 'paid' ? 'Stripe Checkout' : 'Stripe Checkout — awaiting confirmation',
          transactionId: String(payment.stripePaymentIntentId || payment.stripeCheckoutSessionId || payment.id),
          date: payment.paidAt || payment.createdAt || new Date().toISOString(),
          billingCycle: payment.subscription?.billingCycle || 'one-time',
        }));
        if (!cancelled) setPayments(mapped);
      } catch (error: any) { if (!cancelled) { setPayments([]); toast.error(error.message || 'Unable to load payment records.'); } }
      finally { if (!cancelled) setLoadingPayments(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [isOpen]);

  const filteredPayments = useMemo(() => {
    const rangeDays = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : 365;
    const cutoff = Date.now() - rangeDays * 86400000;
    return payments.filter(payment => (new Date(payment.date).getTime() >= cutoff) && (payment.stakeholderName.toLowerCase().includes(searchTerm.toLowerCase()) || payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase())) && (filterStatus === 'all' || payment.status === filterStatus));
  }, [payments, dateRange, searchTerm, filterStatus]);

  const stats: PaymentStats = useMemo(() => {
    const completed = filteredPayments.filter(payment => payment.status === 'completed');
    const attempted = filteredPayments.filter(payment => payment.status !== 'pending');
    const totalRevenue = completed.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingAmount = filteredPayments.filter(payment => payment.status === 'pending').reduce((sum, payment) => sum + payment.amount, 0);
    const failedAmount = filteredPayments.filter(payment => payment.status === 'failed').reduce((sum, payment) => sum + payment.amount, 0);
    return { totalRevenue, revenueChange: 0, totalTransactions: filteredPayments.length, transactionsChange: 0, successRate: attempted.length ? Math.round((completed.length / attempted.length) * 1000) / 10 : 0, successRateChange: 0, averagePayment: completed.length ? totalRevenue / completed.length : 0, averagePaymentChange: 0, pendingAmount, failedAmount };
  }, [filteredPayments]);
  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'failed':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'refunded':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'refunded':
        return <ArrowDownRight className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-[#1a1a1a] p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#ea580c]" />
              Payment Tracking Dashboard
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Monitor subscription payments, revenue, and transaction analytics
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a1a] rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Revenue */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Total Revenue</span>
                <DollarSign className="w-4 h-4 text-[#ea580c]" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${stats.totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {stats.revenueChange >= 0 ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">+{stats.revenueChange}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{stats.revenueChange}%</span>
                  </>
                )}
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>

            {/* Total Transactions */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Transactions</span>
                <Receipt className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {stats.totalTransactions}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {stats.transactionsChange >= 0 ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">+{stats.transactionsChange}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{stats.transactionsChange}%</span>
                  </>
                )}
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Success Rate</span>
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {stats.successRate}%
              </div>
              <div className="flex items-center gap-1 text-xs">
                {stats.successRateChange >= 0 ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">+{stats.successRateChange}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{stats.successRateChange}%</span>
                  </>
                )}
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>

            {/* Average Payment */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Avg Payment</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${stats.averagePayment.toFixed(2)}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {stats.averagePaymentChange >= 0 ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">+{stats.averagePaymentChange}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{stats.averagePaymentChange}%</span>
                  </>
                )}
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(stats.pendingAmount > 0 || stats.failedAmount > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {stats.pendingAmount > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-yellow-300">Pending Payments</div>
                      <div className="text-xs text-yellow-400/80 mt-1">
                        ${stats.pendingAmount.toFixed(2)} in pending transactions requiring attention
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {stats.failedAmount > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-300">Failed Payments</div>
                      <div className="text-xs text-red-400/80 mt-1">
                        ${stats.failedAmount.toFixed(2)} in failed transactions need retry
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              {/* Date Range */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-2 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a] bg-[#0F0F0F]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Stakeholder
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Transaction ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-[#1a1a1a]/50 transition">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {payment.stakeholderType === 'Vendor' ? (
                              <Building2 className="w-4 h-4 text-blue-400" />
                            ) : (
                              <User className="w-4 h-4 text-purple-400" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-white">{payment.stakeholderName}</div>
                              <div className="text-xs text-gray-500">{payment.stakeholderType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-white">{payment.subscriptionPlan}</div>
                          <div className="text-xs text-gray-500 capitalize">{payment.billingCycle}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-white">
                            ${payment.amount.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            <span className="capitalize">{payment.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <CreditCard className="w-4 h-4 text-gray-500" />
                            {payment.paymentMethod}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-300">
                            {new Date(payment.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(payment.date).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-mono text-gray-400">
                            {payment.transactionId}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-white rounded-lg flex items-center gap-2 transition font-medium">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
