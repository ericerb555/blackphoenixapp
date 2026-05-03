/**
 * Unified Payment Center
 * 
 * Complete consolidated payment system:
 * - All payment types in one place
 * - Manage subscriptions, invoices, one-time payments
 * - Configure payment gateways (Stripe, PayPal, Square, Stellar, XDC, Bank of America)
 * - View analytics and reports
 * - Process refunds and manage payment methods
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Settings,
  Plus,
  Eye,
  BarChart3,
  Activity,
  Repeat,
  Star,
  Shield,
  Globe,
  Package,
  Megaphone,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  Key,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import UnifiedPaymentService from '../lib/services/unifiedPaymentService';
import type {
  UnifiedPayment,
  UnifiedSubscription,
  PaymentStats,
  PaymentType,
  PaymentStatus,
  PaymentGateway,
  GatewayConfig
} from '../lib/services/unifiedPaymentService';
import { PrimaryButton, SecondaryButton } from '../components/ui/button';
import { Card } from '../components/ui/Card';

type TabType = 'all' | 'gateways' | 'analytics';

// Payment Gateway Configuration
interface PaymentGatewayInfo {
  id: PaymentGateway;
  name: string;
  logo: string;
  description: string;
  features: string[];
  isAvailable: boolean;
}

const PAYMENT_GATEWAYS: PaymentGatewayInfo[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    logo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop',
    description: 'Industry-leading online payment processor',
    features: ['Credit cards', 'ACH transfers', 'International payments', 'Subscriptions'],
    isAvailable: true
  },
  {
    id: 'paypal',
    name: 'PayPal',
    logo: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100&h=100&fit=crop',
    description: 'Trusted digital wallet and payment platform',
    features: ['PayPal wallet', 'Credit cards', 'Venmo', 'International'],
    isAvailable: true
  },
  {
    id: 'square',
    name: 'Square',
    logo: 'https://images.unsplash.com/photo-1556740772-1a741367b93e?w=100&h=100&fit=crop',
    description: 'Complete payment and business solutions',
    features: ['Credit cards', 'In-person', 'Invoicing', 'Cash App'],
    isAvailable: true
  },
  {
    id: 'bank_of_america',
    name: 'Bank of America',
    logo: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=100&h=100&fit=crop',
    description: 'Bank of America Merchant Services',
    features: ['Credit & debit cards', 'ACH processing', 'Wire transfers', 'Business accounts'],
    isAvailable: true
  },
  {
    id: 'stellar',
    name: 'Stellar',
    logo: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=100&h=100&fit=crop',
    description: 'Fast, low-cost blockchain payments',
    features: ['Cryptocurrency', 'Cross-border', 'Smart contracts', 'Instant settlement'],
    isAvailable: true
  },
  {
    id: 'xdc',
    name: 'XDC Network',
    logo: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=100&h=100&fit=crop',
    description: 'Enterprise-grade blockchain network',
    features: ['XDC tokens', 'Smart contracts', 'Low fees', 'High throughput'],
    isAvailable: true
  }
];

export default function UnifiedPaymentCenter() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<UnifiedSubscription[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PaymentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [gatewayConfigs, setGatewayConfigs] = useState<Record<string, GatewayConfig>>({});
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [gatewayFormData, setGatewayFormData] = useState({
    api_key: '',
    api_secret: '',
    webhook_secret: '',
    test_mode: true
  });

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load stats
      const { data: statsData } = await UnifiedPaymentService.getPaymentStats(timeRange);
      if (statsData) setStats(statsData);

      // Load payments
      const { data: paymentsData } = await UnifiedPaymentService.getPayments();
      setPayments(paymentsData);

      // Load subscriptions
      const { data: subsData } = await UnifiedPaymentService.getSubscriptions();
      setSubscriptions(subsData);

      // Load gateway configs
      loadGatewayConfigs();
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGatewayConfigs = () => {
    const configs: Record<string, GatewayConfig> = {};
    PAYMENT_GATEWAYS.forEach(gateway => {
      const saved = localStorage.getItem(`gateway_config_${gateway.id}`);
      if (saved) {
        configs[gateway.id] = JSON.parse(saved);
      } else {
        configs[gateway.id] = {
          gateway_name: gateway.id,
          is_active: false,
          test_mode: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    });
    setGatewayConfigs(configs);
  };

  const saveGatewayConfig = (gateway: PaymentGateway) => {
    const config: GatewayConfig = {
      gateway_name: gateway,
      is_active: gatewayConfigs[gateway]?.is_active || false,
      api_key: gatewayFormData.api_key,
      api_secret: gatewayFormData.api_secret,
      webhook_secret: gatewayFormData.webhook_secret,
      test_mode: gatewayFormData.test_mode,
      created_at: gatewayConfigs[gateway]?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(`gateway_config_${gateway}`, JSON.stringify(config));
    setGatewayConfigs(prev => ({ ...prev, [gateway]: config }));
    setEditingGateway(null);
    toast.success(`${gateway} configuration saved`);
  };

  const toggleGatewayActive = (gateway: PaymentGateway) => {
    const config = gatewayConfigs[gateway];
    const updated = { ...config, is_active: !config.is_active, updated_at: new Date().toISOString() };
    localStorage.setItem(`gateway_config_${gateway}`, JSON.stringify(updated));
    setGatewayConfigs(prev => ({ ...prev, [gateway]: updated }));
    toast.success(`${gateway} ${updated.is_active ? 'enabled' : 'disabled'}`);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || payment.type === filterType;
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredSubscriptions = subscriptions.filter(sub => {
    return !searchTerm || 
      sub.plan_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusBadge = (status: PaymentStatus | string) => {
    const configs: Record<string, { bg: string; text: string; icon: any }> = {
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2 },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: RefreshCw },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
      cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: XCircle },
      refunded: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: AlertCircle },
      active: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle2 },
      paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      expired: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: XCircle },
      trial: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Star }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeIcon = (type: PaymentType | string) => {
    const icons: Record<string, any> = {
      invoice: DollarSign,
      subscription: Repeat,
      advertising_subscription: Megaphone,
      one_time: Zap,
      service_plan: Package,
      advertising: Megaphone,
      platform_access: Building2,
      support: Users
    };
    return icons[type] || DollarSign;
  };

  const renderAllPayments = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${stats.total_revenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-green-400">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>+12% from last period</span>
            </div>
          </Card>

          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-white">{stats.total_transactions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-400">
              <span>{stats.successful_payments} successful, {stats.failed_payments} failed</span>
            </div>
          </Card>

          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Active Subscriptions</p>
                <p className="text-2xl font-bold text-white">{stats.active_subscriptions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Repeat className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-purple-400">
              <span>MRR: ${stats.mrr.toLocaleString()}</span>
            </div>
          </Card>

          <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Annual Revenue</p>
                <p className="text-2xl font-bold text-white">${stats.arr.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#ea580c]" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-[#ea580c]">
              <span>ARR projected growth</span>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 bg-[#1a1a1a] border-[#2a2a2a]">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search payments..."
                className="w-full bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-[#ea580c] focus:outline-none"
              />
            </div>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white focus:border-[#ea580c] focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="invoice">Invoices</option>
            <option value="subscription">Subscriptions</option>
            <option value="advertising_subscription">Advertising</option>
            <option value="one_time">One-time</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white focus:border-[#ea580c] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white focus:border-[#ea580c] focus:outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          <SecondaryButton onClick={loadData} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </SecondaryButton>
        </div>
      </Card>

      {/* Recent Payments */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <div className="p-6 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recent Payments</h3>
            <SecondaryButton className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </SecondaryButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#2a2a2a]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Gateway</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filteredPayments.slice(0, 20).map((payment) => {
                const TypeIcon = getTypeIcon(payment.type);
                return (
                  <tr key={payment.id} className="hover:bg-[#0A0A0A] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-[#ea580c]" />
                        <span className="text-sm text-gray-300 capitalize">{payment.type.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">{payment.customer_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{payment.customer_email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">
                      {payment.gateway === 'bank_of_america' ? 'Bank of America' : payment.gateway}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-[#ea580c] hover:text-[#f97316] mr-3">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Active Subscriptions */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <div className="p-6 border-b border-[#2a2a2a]">
          <h3 className="text-lg font-bold text-white">Active Subscriptions</h3>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {filteredSubscriptions.filter(s => s.status === 'active').slice(0, 10).map((sub) => {
              const TypeIcon = getTypeIcon(sub.type);
              return (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg border border-[#2a2a2a]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#ea580c]/20 rounded-lg flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-[#ea580c]" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{sub.plan_name}</div>
                      <div className="text-sm text-gray-400 capitalize">{sub.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">${sub.amount.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">per {sub.billing_cycle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Next billing</div>
                      <div className="text-xs text-white">{sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    {getStatusBadge(sub.status)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderGateways = () => (
    <div className="space-y-6">
      <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Payment Gateway Configuration</h3>
          <p className="text-gray-400">Manage and configure payment processors for your business</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {PAYMENT_GATEWAYS.map((gateway) => {
            const config = gatewayConfigs[gateway.id];
            const isActive = config?.is_active;
            const isEditing = editingGateway === gateway.id;

            return (
              <motion.div
                key={gateway.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative bg-[#0A0A0A] border-2 rounded-xl overflow-hidden transition-all ${
                  isActive ? 'border-green-500' : 'border-[#2a2a2a]'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => toggleGatewayActive(gateway.id)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {isActive ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="p-6">
                  {/* Gateway Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={gateway.logo}
                      alt={gateway.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-1">{gateway.name}</h4>
                      <p className="text-sm text-gray-400">{gateway.description}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {gateway.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-gray-400"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Configuration Form */}
                  {isEditing ? (
                    <div className="space-y-3 mt-4 pt-4 border-t border-[#2a2a2a]">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">API Key</label>
                        <input
                          type="text"
                          value={gatewayFormData.api_key}
                          onChange={(e) => setGatewayFormData(prev => ({ ...prev, api_key: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#ea580c] focus:outline-none"
                          placeholder="pk_live_..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">API Secret</label>
                        <input
                          type="password"
                          value={gatewayFormData.api_secret}
                          onChange={(e) => setGatewayFormData(prev => ({ ...prev, api_secret: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#ea580c] focus:outline-none"
                          placeholder="sk_live_..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Webhook Secret</label>
                        <input
                          type="password"
                          value={gatewayFormData.webhook_secret}
                          onChange={(e) => setGatewayFormData(prev => ({ ...prev, webhook_secret: e.target.value }))}
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#ea580c] focus:outline-none"
                          placeholder="whsec_..."
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={gatewayFormData.test_mode}
                          onChange={(e) => setGatewayFormData(prev => ({ ...prev, test_mode: e.target.checked }))}
                          className="w-4 h-4 rounded border-[#2a2a2a] text-[#ea580c] focus:ring-[#ea580c]"
                        />
                        Test Mode
                      </label>

                      <div className="flex gap-2">
                        <PrimaryButton
                          onClick={() => saveGatewayConfig(gateway.id)}
                          className="flex-1 text-sm"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </PrimaryButton>
                        <SecondaryButton
                          onClick={() => setEditingGateway(null)}
                          className="text-sm"
                        >
                          Cancel
                        </SecondaryButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <SecondaryButton
                        onClick={() => {
                          setEditingGateway(gateway.id);
                          setGatewayFormData({
                            api_key: config?.api_key || '',
                            api_secret: config?.api_secret || '',
                            webhook_secret: config?.webhook_secret || '',
                            test_mode: config?.test_mode ?? true
                          });
                        }}
                        className="flex-1 text-sm"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </SecondaryButton>
                    </div>
                  )}

                  {/* Configuration Status */}
                  {!isEditing && config && (config.api_key || config.api_secret) && (
                    <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Configured</span>
                        {config.test_mode && (
                          <span className="ml-auto px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">TEST MODE</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Gateway Stats */}
      {stats && (
        <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
          <h3 className="text-lg font-bold text-white mb-4">Payment Distribution by Gateway</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(stats.by_gateway).map(([gateway, amount]) => {
              const gatewayInfo = PAYMENT_GATEWAYS.find(g => g.id === gateway);
              const percentage = stats.total_revenue > 0 ? ((amount / stats.total_revenue) * 100).toFixed(1) : '0';
              
              return (
                <div key={gateway} className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2a2a2a]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white capitalize">
                      {gateway === 'bank_of_america' ? 'Bank of America' : gateway}
                    </span>
                    <span className="text-xs text-gray-400">{percentage}%</span>
                  </div>
                  <div className="text-xl font-bold text-[#ea580c]">${amount.toLocaleString()}</div>
                  <div className="mt-2 w-full bg-[#2a2a2a] rounded-full h-2">
                    <div
                      className="bg-[#ea580c] h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <Card className="p-6 bg-[#1a1a1a] border-[#2a2a2a]">
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Advanced Analytics</h3>
        <p className="text-gray-400 mb-6">Detailed payment analytics and reports coming soon</p>
        <div className="flex justify-center gap-4">
          <SecondaryButton>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </SecondaryButton>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Unified Payment Center</h1>
            </div>
          </div>
          <p className="text-gray-400 ml-14">Complete payment management and gateway configuration</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2a2a2a]">
          {[
            { id: 'all' as TabType, label: 'All Payments', icon: CreditCard },
            { id: 'gateways' as TabType, label: 'Payment Gateways', icon: Settings },
            { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-[#ea580c] border-[#ea580c]'
                    : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <Card className="p-12 bg-[#1a1a1a] border-[#2a2a2a]">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-[#ea580c] animate-spin" />
            </div>
          </Card>
        ) : (
          <>
            {activeTab === 'all' && renderAllPayments()}
            {activeTab === 'gateways' && renderGateways()}
            {activeTab === 'analytics' && renderAnalytics()}
          </>
        )}
      </div>
    </div>
  );
}