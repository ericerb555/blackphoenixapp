/**
 * Revenue & Monetization Hub - Consolidated Revenue Management
 * 
 * Central hub for all revenue streams, payments, subscriptions, advertising, and operations
 * Tabs: Payments | Subscriptions | Advertising | Vendor Ops | Subcontractor Ops | Promotions | Referrals | Marketing | Cohorts
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Wallet, TrendingUp, Megaphone, ShoppingCart, Wrench,
  Gift, Award, BarChart3, Users, DollarSign, CreditCard, Package,
  Store, Briefcase, Target, Crown, Layers, Calendar, MapPin,
  MessageSquare, Bell, Settings, Plus, Edit, Trash2, Eye, Copy,
  CheckCircle, XCircle, Clock, TrendingDown, Filter, Search, Download,
  Tag, Percent, Share2, Zap, Star, Heart, Send, ExternalLink,
  Activity, AlertCircle, RefreshCw, Save, ArrowUpRight, Sparkles,
  FileText, Video, Tv, Image, PenTool, Globe, Trophy, Check,
  AlertOctagon, AlertTriangle, Info, Phone, Home, Building2, Hammer
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner@2.0.3';
import {
  ALL_SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  CUSTOMER_PLANS,
  CONSTRUCTION_PLANS,
  PROPERTY_MANAGEMENT_PLANS,
  VENDOR_PLANS,
  SUBCONTRACTOR_PLANS,
  ADVERTISER_PLANS
} from '../config/subscriptionPlans';
import {
  getRevenueAnalytics,
  getCategoryRevenue,
  getRevenueTrends,
  getCohortsHealth,
  getAllCohorts,
  formatCurrency,
  formatNumber,
  initializeCohorts
} from '../lib/services/revenueService';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';

type TabType = 'payments' | 'subscriptions' | 'advertising' | 'vendor-ops' | 'subcontractor-ops' | 'promotions' | 'referrals' | 'marketing' | 'cohorts';

interface RevenueMonetizationHubProps {
  onNavigate?: (page: string) => void;
}

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'sale' | 'coupon' | 'giveaway' | 'vendor-deal' | 'service-deal';
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue: number;
  minPurchase?: number;
  submittedBy: string;
  submittedDate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  conditions?: string;
}

export default function RevenueMonetizationHub({ onNavigate }: RevenueMonetizationHubProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('payments');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showPlanEditModal, setShowPlanEditModal] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(ALL_SUBSCRIPTION_PLANS);
  
  // Real-time revenue data from cohorts system
  const [revenueData, setRevenueData] = useState<any>(null);
  const [cohortHealth, setCohortHealth] = useState<any>(null);
  const [revenueTrends, setRevenueTrends] = useState<any>(null);
  const [allCohorts, setAllCohorts] = useState<any[]>([]);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);

  // Promotions data
  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: 'promo-1',
      name: 'Spring Sale 2026',
      description: 'Limited time flash sale event',
      type: 'sale',
      discountType: 'percentage',
      discountValue: 25,
      submittedBy: 'Marketing Team',
      submittedDate: '2026-05-10',
      priority: 'critical',
      startDate: '2026-05-15',
      endDate: '2026-05-31',
      conditions: 'All products'
    },
    {
      id: 'promo-2',
      name: 'NEWCUSTOMER50',
      description: 'First-time customer discount',
      type: 'coupon',
      discountType: 'fixed',
      discountValue: 50,
      minPurchase: 200,
      submittedBy: 'Sarah Martinez',
      submittedDate: '2026-05-09',
      priority: 'high',
      usageLimit: 100
    },
    {
      id: 'promo-3',
      name: 'VIP Member Rewards',
      description: 'Loyalty program exclusive',
      type: 'giveaway',
      discountType: 'free',
      discountValue: 500,
      submittedBy: 'Marketing Team',
      submittedDate: '2026-05-08',
      priority: 'medium',
      conditions: '$500 service credit'
    },
    {
      id: 'promo-4',
      name: 'Bulk Lumber Deal',
      description: 'Vendor: HD Supply',
      type: 'vendor-deal',
      discountType: 'percentage',
      discountValue: 40,
      submittedBy: 'HD Supply (Vendor)',
      submittedDate: '2026-05-10',
      priority: 'high',
      conditions: 'Bulk orders only'
    },
    {
      id: 'promo-5',
      name: 'HVAC Spring Special',
      description: 'Subcontractor: Premier HVAC',
      type: 'service-deal',
      discountType: 'fixed',
      discountValue: 200,
      submittedBy: 'Premier HVAC (Sub)',
      submittedDate: '2026-05-09',
      priority: 'medium',
      conditions: 'HVAC installations'
    }
  ]);

  const handleEditPromotion = (promo: Promotion) => {
    setEditingPromotion({ ...promo });
    setShowEditModal(true);
  };

  const handleSavePromotion = () => {
    if (editingPromotion) {
      setPromotions(promotions.map(p =>
        p.id === editingPromotion.id ? editingPromotion : p
      ));
      setShowEditModal(false);
      setEditingPromotion(null);
      toast.success('Promotion updated successfully!');
    }
  };

  const handleDeletePromotion = (id: string) => {
    setPromotions(promotions.filter(p => p.id !== id));
    toast.success('Promotion deleted');
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan({ ...plan });
    setShowPlanEditModal(true);
  };

  const handleSavePlan = () => {
    if (editingPlan) {
      setSubscriptionPlans(subscriptionPlans.map(p =>
        p.id === editingPlan.id ? editingPlan : p
      ));
      setShowPlanEditModal(false);
      setEditingPlan(null);
      toast.success('Subscription plan updated successfully!');
    }
  };

  const handleDeletePlan = (id: string) => {
    setSubscriptionPlans(subscriptionPlans.filter(p => p.id !== id));
    toast.success('Subscription plan deleted');
  };

  // Fetch real-time revenue data from cohorts system
  useEffect(() => {
    const fetchRevenueData = async () => {
      setIsLoadingRevenue(true);
      try {
        // Fetch all revenue analytics in parallel
        const [analytics, health, trends, cohorts] = await Promise.all([
          getRevenueAnalytics(),
          getCohortsHealth(),
          getRevenueTrends(),
          getAllCohorts()
        ]);

        if (analytics) setRevenueData(analytics);
        if (health) setCohortHealth(health);
        if (trends) setRevenueTrends(trends);
        if (cohorts) setAllCohorts(cohorts);

        console.log('📊 Revenue Data Loaded:', {
          totalMRR: analytics?.overview?.totalMRR,
          totalARR: analytics?.overview?.totalARR,
          totalSubscribers: analytics?.overview?.totalActiveSubscribers,
          totalCohorts: health?.totalCohorts
        });
      } catch (error) {
        console.error('Error fetching revenue data:', error);
        toast.error('Failed to load revenue data');
      } finally {
        setIsLoadingRevenue(false);
      }
    };

    fetchRevenueData();

    // Refresh data every 60 seconds
    const interval = setInterval(fetchRevenueData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Read tab from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as TabType;
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  };

  const tabs = [
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'subscriptions', label: 'Subscriptions', icon: TrendingUp },
    { id: 'advertising', label: 'Advertising', icon: Megaphone },
    { id: 'vendor-ops', label: 'Vendor Ops', icon: ShoppingCart },
    { id: 'subcontractor-ops', label: 'Subcontractor Ops', icon: Wrench },
    { id: 'promotions', label: 'Promotions', icon: Gift },
    { id: 'referrals', label: 'Referrals', icon: Award },
    { id: 'marketing', label: 'Marketing', icon: Layers },
    { id: 'cohorts', label: 'Cohorts', icon: Layers }
  ];

  // Server-backed operational data (payments, subscriptions, vendors, subcontractors).
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);

  useEffect(() => {
    const base = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
    const getJson = async (path: string) => {
      const res = await fetch(`${base}${path}`, { headers: await authedHeaders() });
      if (!res.ok) throw new Error(`${path} → ${res.status}`);
      return res.json();
    };

    (async () => {
      // Payments come from real store orders.
      try {
        const data = await getJson('/store/orders');
        const orders = Array.isArray(data) ? data : (data.orders || []);
        setPayments(orders.map((o: any) => ({
          id: o.id,
          customer: o.customer_name || o.customer_email || 'Customer',
          amount: o.total ?? 0,
          status: o.payment_status || o.fulfillment_status || 'pending',
          date: (o.created_at || '').slice(0, 10),
        })));
      } catch (err) { console.error('Failed to load payments:', err); }

      try {
        const data = await getJson('/subscriptions');
        const subs = Array.isArray(data) ? data : (data.subscriptions || []);
        setSubscriptions(subs.map((s: any) => ({
          id: s.id,
          plan: s.plan || s.planName || s.tier || '—',
          customer: s.customer || s.customerName || s.customerEmail || '—',
          mrr: s.mrr ?? s.monthlyPrice ?? s.price ?? 0,
          status: s.status || 'active',
          renewalDate: (s.renewalDate || s.nextBillingDate || '').slice(0, 10),
        })));
      } catch (err) { console.error('Failed to load subscriptions:', err); }

      try {
        const data = await getJson('/vendors');
        const list = Array.isArray(data) ? data : (data.vendors || []);
        setVendors(list.map((v: any) => ({
          id: v.id,
          name: v.name || v.vendorName || 'Vendor',
          revenue: v.revenue ?? v.totalSpend ?? 0,
          orders: v.orders ?? v.totalOrders ?? 0,
          rating: v.rating ?? 0,
          status: v.status || 'active',
        })));
      } catch (err) { console.error('Failed to load vendors:', err); }

      try {
        const data = await getJson('/subcontractors');
        const list = Array.isArray(data) ? data : (data.subcontractors || []);
        setSubcontractors(list.map((sc: any) => ({
          id: sc.id,
          name: sc.name || sc.companyName || 'Subcontractor',
          revenue: sc.revenue ?? sc.totalRevenue ?? 0,
          jobs: sc.jobs ?? sc.totalJobs ?? 0,
          rating: sc.rating ?? 0,
          status: sc.status || 'active',
        })));
      } catch (err) { console.error('Failed to load subcontractors:', err); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PageHeader 
        title="Revenue & Monetization Hub"
        description="Comprehensive revenue management, payments, subscriptions, and operations"
        onBack={() => window.location.href = '/unified-dashboard'}
      />

      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-2 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                    : 'bg-[#0A0A0A] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Total Revenue</p>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">$20,500</p>
                <p className="text-sm text-green-300 mt-1">This month</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Pending</p>
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">$12,000</p>
                <p className="text-sm text-blue-300 mt-1">1 payment</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Completed</p>
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">$8,500</p>
                <p className="text-sm text-purple-300 mt-1">2 payments</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-orange-200">Avg Transaction</p>
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">$6,833</p>
                <p className="text-sm text-orange-300 mt-1">Per payment</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Recent Payments</h3>
                <button 
                  onClick={() => window.location.href = '/payment-center'}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg hover:border hover:border-orange-500/30 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{payment.id}</span>
                        <span className={`px-2 py-0.5 rounded text-sm font-semibold ${
                          payment.status === 'completed' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">{payment.customer} • {payment.date}</p>
                    </div>
                    <p className="text-xl font-bold text-green-400">${payment.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Total Plans</p>
                  <Layers className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">{subscriptionPlans.length}</p>
                <p className="text-sm text-purple-300 mt-1">Across all categories</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Categories</p>
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">6</p>
                <p className="text-sm text-green-300 mt-1">Customer, Construction, Property, Vendor, Sub, Ad</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Avg Price</p>
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">${Math.round(subscriptionPlans.reduce((acc, p) => acc + p.regularPrice, 0) / subscriptionPlans.length)}</p>
                <p className="text-sm text-blue-300 mt-1">Per month</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-orange-200">Highlighted</p>
                  <Star className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">{subscriptionPlans.filter(p => p.highlighted).length}</p>
                <p className="text-sm text-orange-300 mt-1">Premium plans</p>
              </div>
            </div>

            {/* Subscription Plans by Category */}
            {[
              { category: 'customer' as const, title: 'Customer Plans', icon: Home, iconClass: 'text-blue-500' },
              { category: 'construction' as const, title: 'Construction Plans', icon: Hammer, iconClass: 'text-orange-500' },
              { category: 'property-management' as const, title: 'Property Management Plans', icon: Building2, iconClass: 'text-purple-500' },
              { category: 'vendor' as const, title: 'Vendor Plans', icon: Store, iconClass: 'text-rose-500' },
              { category: 'subcontractor' as const, title: 'Subcontractor Plans', icon: Wrench, iconClass: 'text-green-500' },
              { category: 'advertiser' as const, title: 'Advertiser Plans', icon: Megaphone, iconClass: 'text-pink-500' }
            ].map(({ category, title, icon: Icon, iconClass }) => {
              const categoryPlans = subscriptionPlans.filter(p => p.category === category);
              if (categoryPlans.length === 0) return null;

              return (
                <div key={category} className="bg-[#1A1A1A] border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A]">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${iconClass}`} />
                      <h3 className="text-xl font-bold">{title}</h3>
                      <span className="ml-auto text-sm text-zinc-400">{categoryPlans.length} plans</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#0A0A0A] border-b border-zinc-800">
                        <tr>
                          <th className="p-4 text-left text-sm font-semibold text-zinc-400">Plan Name</th>
                          <th className="p-4 text-left text-sm font-semibold text-zinc-400">Tier</th>
                          <th className="p-4 text-left text-sm font-semibold text-zinc-400">Price</th>
                          <th className="p-4 text-left text-sm font-semibold text-zinc-400">Founding Price</th>
                          <th className="p-4 text-left text-sm font-semibold text-zinc-400">Status</th>
                          <th className="p-4 text-right text-sm font-semibold text-zinc-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {categoryPlans.map((plan) => (
                          <tr key={plan.id} className="hover:bg-zinc-900/30 transition">
                            <td className="p-4">
                              <div>
                                <div className="font-semibold">{plan.name}</div>
                                <div className="text-sm text-zinc-500">{plan.tagline}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 text-sm font-semibold rounded-full ${
                                plan.tier === 'starter' ? 'bg-blue-600/20 text-blue-400' :
                                plan.tier === 'professional' ? 'bg-purple-600/20 text-purple-400' :
                                'bg-orange-600/20 text-orange-400'
                              }`}>
                                {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-green-400">${plan.regularPrice}/mo</div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-blue-400">${plan.foundingPrice}/mo</div>
                              {plan.foundingPrice < plan.regularPrice && (
                                <div className="text-sm text-zinc-500">
                                  {Math.round(((plan.regularPrice - plan.foundingPrice) / plan.regularPrice) * 100)}% off
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {plan.highlighted && (
                                  <span className="px-2 py-1 bg-orange-600/20 text-orange-400 text-sm font-semibold rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Premium
                                  </span>
                                )}
                                {plan.popular && (
                                  <span className="px-2 py-1 bg-green-600/20 text-green-400 text-sm font-semibold rounded-full flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    Popular
                                  </span>
                                )}
                                {!plan.highlighted && !plan.popular && (
                                  <span className="text-sm text-zinc-500">Standard</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditPlan(plan)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold transition flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Plan Edit Modal */}
            {showPlanEditModal && editingPlan && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800 sticky top-0 bg-[#1A1A1A] z-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold">Edit Subscription Plan</h3>
                      <button
                        onClick={() => {
                          setShowPlanEditModal(false);
                          setEditingPlan(null);
                        }}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4">
                    {/* Plan Name & Tagline */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Plan Name</label>
                        <input
                          type="text"
                          value={editingPlan.name}
                          onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Tagline</label>
                        <input
                          type="text"
                          value={editingPlan.tagline}
                          onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Regular Price ($/mo)</label>
                        <input
                          type="number"
                          value={editingPlan.regularPrice}
                          onChange={(e) => setEditingPlan({ ...editingPlan, regularPrice: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Founding Price ($/mo)</label>
                        <input
                          type="number"
                          value={editingPlan.foundingPrice}
                          onChange={(e) => setEditingPlan({ ...editingPlan, foundingPrice: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    {/* Tier & Status */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Tier</label>
                        <select
                          value={editingPlan.tier}
                          onChange={(e) => setEditingPlan({ ...editingPlan, tier: e.target.value as any })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
                        >
                          <option value="starter">Starter</option>
                          <option value="professional">Professional</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPlan.highlighted || false}
                            onChange={(e) => setEditingPlan({ ...editingPlan, highlighted: e.target.checked })}
                            className="rounded border-zinc-800 bg-[#0A0A0A] text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm font-semibold text-zinc-400">Highlighted</span>
                        </label>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPlan.popular || false}
                            onChange={(e) => setEditingPlan({ ...editingPlan, popular: e.target.checked })}
                            className="rounded border-zinc-800 bg-[#0A0A0A] text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm font-semibold text-zinc-400">Popular</span>
                        </label>
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 mb-2">Features (one per line)</label>
                      <textarea
                        value={editingPlan.features.join('\n')}
                        onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n') })}
                        rows={8}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowPlanEditModal(false);
                        setEditingPlan(null);
                      }}
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePlan}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white font-semibold transition flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'advertising' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 text-center">
            <Megaphone className="w-16 h-16 text-fuchsia-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Vendor Advertising Hub</h3>
            <p className="text-zinc-400 mb-4">Manage vendor advertisements, campaigns, and performance</p>
            <button 
              onClick={() => window.location.href = '/vendor-advertising-hub'}
              className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg font-semibold"
            >
              Open Advertising Hub
            </button>
          </div>
        )}

        {activeTab === 'vendor-ops' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Vendor Operations</h2>
              <button 
                onClick={() => window.location.href = '/vendor-management'}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Vendors
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-rose-600/20 to-rose-700/20 border border-rose-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-rose-200">Total Revenue</p>
                  <DollarSign className="w-5 h-5 text-rose-400" />
                </div>
                <p className="text-3xl font-bold text-white">$105,000</p>
                <p className="text-sm text-rose-300 mt-1">From all vendors</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Active Vendors</p>
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">3</p>
                <p className="text-sm text-blue-300 mt-1">Vendors</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Total Orders</p>
                  <Package className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">280</p>
                <p className="text-sm text-green-300 mt-1">All time</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Top Vendors</h3>
              <div className="space-y-3">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{vendor.name}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm text-yellow-400">{vendor.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400">{vendor.orders} orders</p>
                    </div>
                    <p className="text-xl font-bold text-rose-400">${vendor.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subcontractor-ops' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Subcontractor Operations</h2>
              <button 
                onClick={() => window.location.href = '/subcontractor-enterprise'}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Subcontractors
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-orange-200">Total Paid</p>
                  <DollarSign className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">$169,000</p>
                <p className="text-sm text-orange-300 mt-1">To subcontractors</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Active Subs</p>
                  <Wrench className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">3</p>
                <p className="text-sm text-blue-300 mt-1">Subcontractors</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Jobs Completed</p>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">56</p>
                <p className="text-sm text-green-300 mt-1">All time</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Top Subcontractors</h3>
              <div className="space-y-3">
                {subcontractors.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{sub.name}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm text-yellow-400">{sub.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400">{sub.jobs} jobs completed</p>
                    </div>
                    <p className="text-xl font-bold text-orange-400">${sub.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'promotions' && (
          <div className="space-y-6">
            {/* Promotions Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-pink-200">Pending Approvals</p>
                  <Clock className="w-5 h-5 text-pink-400" />
                </div>
                <p className="text-3xl font-bold text-white">{promotions.length}</p>
                <p className="text-sm text-pink-300 mt-1">Requires action</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Active Promos</p>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">24</p>
                <p className="text-sm text-green-300 mt-1">Currently live</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Total Revenue</p>
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">$128K</p>
                <p className="text-sm text-blue-300 mt-1">From promotions</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Redemption Rate</p>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">67%</p>
                <p className="text-sm text-purple-300 mt-1">Average rate</p>
              </div>
            </div>

            {/* Incoming Promotions for Approval */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-pink-500" />
                    <h3 className="text-xl font-bold">Incoming Promotions - Pending Approval</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.location.href = '/admin-alerts'}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-semibold transition"
                    >
                      <Bell className="w-4 h-4" />
                      View All Alerts
                    </button>
                    <button
                      onClick={() => window.location.href = '/promotions-manager'}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white font-semibold transition"
                    >
                      <Plus className="w-4 h-4" />
                      Create Promotion
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                  <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                  <div className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <span>8 promotions require your approval</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-900/50 border-b border-zinc-800">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-zinc-400">Promotion</th>
                      <th className="text-left p-4 text-sm font-semibold text-zinc-400">Type</th>
                      <th className="text-left p-4 text-sm font-semibold text-zinc-400">Discount</th>
                      <th className="text-left p-4 text-sm font-semibold text-zinc-400">Submitted By</th>
                      <th className="text-left p-4 text-sm font-semibold text-zinc-400">Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-zinc-400">Priority</th>
                      <th className="text-right p-4 text-sm font-semibold text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {promotions.map((promo) => {
                      const getTypeIcon = () => {
                        switch (promo.type) {
                          case 'sale': return <Gift className="w-5 h-5 text-pink-400" />;
                          case 'coupon': return <Tag className="w-5 h-5 text-yellow-400" />;
                          case 'giveaway': return <Star className="w-5 h-5 text-green-400" />;
                          case 'vendor-deal': return <Package className="w-5 h-5 text-blue-400" />;
                          case 'service-deal': return <Wrench className="w-5 h-5 text-orange-400" />;
                          default: return <Gift className="w-5 h-5 text-pink-400" />;
                        }
                      };

                      const getTypeBadge = () => {
                        switch (promo.type) {
                          case 'sale': return { bg: 'bg-purple-600/20', text: 'text-purple-400', label: 'Sale Event' };
                          case 'coupon': return { bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'Coupon Code' };
                          case 'giveaway': return { bg: 'bg-green-600/20', text: 'text-green-400', label: 'Giveaway' };
                          case 'vendor-deal': return { bg: 'bg-cyan-600/20', text: 'text-cyan-400', label: 'Vendor Deal' };
                          case 'service-deal': return { bg: 'bg-orange-600/20', text: 'text-orange-400', label: 'Service Deal' };
                          default: return { bg: 'bg-gray-600/20', text: 'text-gray-400', label: 'Other' };
                        }
                      };

                      const getDiscountDisplay = () => {
                        if (promo.discountType === 'percentage') {
                          return `${promo.discountValue}% OFF`;
                        } else if (promo.discountType === 'fixed') {
                          return `$${promo.discountValue} OFF`;
                        } else {
                          return 'FREE';
                        }
                      };

                      const getPriorityBadge = () => {
                        switch (promo.priority) {
                          case 'critical': return { bg: 'bg-red-600/20', text: 'text-red-400', icon: <AlertOctagon className="w-3 h-3" />, label: 'Critical' };
                          case 'high': return { bg: 'bg-orange-600/20', text: 'text-orange-400', icon: <AlertTriangle className="w-3 h-3" />, label: 'High' };
                          case 'medium': return { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: <Info className="w-3 h-3" />, label: 'Medium' };
                          case 'low': return { bg: 'bg-blue-600/20', text: 'text-blue-400', icon: <Info className="w-3 h-3" />, label: 'Low' };
                          default: return { bg: 'bg-gray-600/20', text: 'text-gray-400', icon: <Info className="w-3 h-3" />, label: 'Unknown' };
                        }
                      };

                      const getIconBackground = () => {
                        switch (promo.type) {
                          case 'sale': return 'bg-pink-600/20';
                          case 'coupon': return 'bg-yellow-600/20';
                          case 'giveaway': return 'bg-green-600/20';
                          case 'vendor-deal': return 'bg-blue-600/20';
                          case 'service-deal': return 'bg-orange-600/20';
                          default: return 'bg-gray-600/20';
                        }
                      };

                      const typeBadge = getTypeBadge();
                      const priorityBadge = getPriorityBadge();

                      return (
                        <tr key={promo.id} className="hover:bg-zinc-900/30 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${getIconBackground()} flex items-center justify-center`}>
                                {getTypeIcon()}
                              </div>
                              <div>
                                <div className="font-semibold">{promo.name}</div>
                                <div className="text-sm text-zinc-500">{promo.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 ${typeBadge.bg} ${typeBadge.text} text-sm font-semibold rounded-full`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-green-400">{getDiscountDisplay()}</div>
                            <div className="text-sm text-zinc-500">
                              {promo.minPurchase ? `Min. purchase $${promo.minPurchase}` : promo.conditions || 'No restrictions'}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-zinc-400">{promo.submittedBy}</td>
                          <td className="p-4 text-sm text-zinc-400">{promo.submittedDate}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 ${priorityBadge.bg} ${priorityBadge.text} text-sm font-semibold rounded-full flex items-center gap-1 w-fit`}>
                              {priorityBadge.icon}
                              {priorityBadge.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditPromotion(promo)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold transition flex items-center gap-1"
                              >
                                <Edit className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => toast.success('Promotion approved and added to admin alerts!')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-semibold transition flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeletePromotion(promo.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
                <div className="text-sm text-zinc-400">
                  Showing {promotions.length} pending promotion{promotions.length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition">
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition">
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.location.href = '/promotions-manager'}
                className="bg-gradient-to-br from-pink-600/10 to-rose-600/10 border border-pink-500/30 rounded-lg p-6 hover:border-pink-500/60 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8 text-pink-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="font-bold mb-1">Promotions Manager</h4>
                      <p className="text-sm text-zinc-400">Manage all promotional campaigns</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-pink-400 transition" />
                </div>
              </button>

              <button
                onClick={() => window.location.href = '/admin-alerts'}
                className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-lg p-6 hover:border-orange-500/60 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="font-bold mb-1">Admin Alerts</h4>
                      <p className="text-sm text-zinc-400">View all system notifications</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-orange-400 transition" />
                </div>
              </button>

              <button
                onClick={() => window.location.href = '/marketing-hub-landing-page'}
                className="bg-gradient-to-br from-purple-600/10 to-indigo-600/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="font-bold mb-1">Preview Live Promos</h4>
                      <p className="text-sm text-zinc-400">See active promotions on site</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 transition" />
                </div>
              </button>
            </div>

            {/* Edit Promotion Modal */}
            {showEditModal && editingPromotion && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Gift className="w-6 h-6 text-pink-500" />
                        <h3 className="text-xl font-bold">Edit Promotion</h3>
                      </div>
                      <button
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingPromotion(null);
                        }}
                        className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center transition"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-6">
                    {/* Promotion Name */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 mb-2">Promotion Name</label>
                      <input
                        type="text"
                        value={editingPromotion.name}
                        onChange={(e) => setEditingPromotion({ ...editingPromotion, name: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 mb-2">Description</label>
                      <textarea
                        value={editingPromotion.description}
                        onChange={(e) => setEditingPromotion({ ...editingPromotion, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                      />
                    </div>

                    {/* Type and Priority Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Type</label>
                        <select
                          value={editingPromotion.type}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, type: e.target.value as any })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        >
                          <option value="sale">Sale Event</option>
                          <option value="coupon">Coupon Code</option>
                          <option value="giveaway">Giveaway</option>
                          <option value="vendor-deal">Vendor Deal</option>
                          <option value="service-deal">Service Deal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Priority</label>
                        <select
                          value={editingPromotion.priority}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, priority: e.target.value as any })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>

                    {/* Discount Type and Value Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Discount Type</label>
                        <select
                          value={editingPromotion.discountType}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, discountType: e.target.value as any })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        >
                          <option value="percentage">Percentage Off</option>
                          <option value="fixed">Fixed Dollar Amount</option>
                          <option value="free">Free/Giveaway</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">
                          {editingPromotion.discountType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                        </label>
                        <input
                          type="number"
                          value={editingPromotion.discountValue}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, discountValue: parseFloat(e.target.value) })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        />
                      </div>
                    </div>

                    {/* Min Purchase and Usage Limit Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Min. Purchase ($)</label>
                        <input
                          type="number"
                          value={editingPromotion.minPurchase || ''}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, minPurchase: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="Optional"
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Usage Limit</label>
                        <input
                          type="number"
                          value={editingPromotion.usageLimit || ''}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, usageLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="Unlimited"
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        />
                      </div>
                    </div>

                    {/* Start and End Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={editingPromotion.startDate || ''}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, startDate: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2">End Date</label>
                        <input
                          type="date"
                          value={editingPromotion.endDate || ''}
                          onChange={(e) => setEditingPromotion({ ...editingPromotion, endDate: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                        />
                      </div>
                    </div>

                    {/* Conditions */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 mb-2">Conditions / Terms</label>
                      <textarea
                        value={editingPromotion.conditions || ''}
                        onChange={(e) => setEditingPromotion({ ...editingPromotion, conditions: e.target.value })}
                        rows={2}
                        placeholder="e.g., All products, Bulk orders only, etc."
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                      />
                    </div>

                    {/* Submitted By */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-400 mb-2">Submitted By</label>
                      <input
                        type="text"
                        value={editingPromotion.submittedBy}
                        onChange={(e) => setEditingPromotion({ ...editingPromotion, submittedBy: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-pink-500 transition"
                      />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingPromotion(null);
                      }}
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePromotion}
                      className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 rounded-lg text-white font-semibold transition flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 text-center">
            <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Referral Rewards</h3>
            <p className="text-zinc-400 mb-4">Track and manage customer referral program</p>
            <button 
              onClick={() => window.location.href = '/referral-rewards'}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold"
            >
              View Referral Program
            </button>
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="space-y-6">
            {/* Marketing Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Content Created</p>
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">247</p>
                <p className="text-sm text-blue-300 mt-1">This month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Social Posts</p>
                  <Share2 className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">1,284</p>
                <p className="text-sm text-purple-300 mt-1">Total engagement</p>
              </div>

              <div className="bg-gradient-to-br from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-pink-200">Video Views</p>
                  <Video className="w-5 h-5 text-pink-400" />
                </div>
                <p className="text-3xl font-bold text-white">45.2K</p>
                <p className="text-sm text-pink-300 mt-1">Total views</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Campaign ROI</p>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">285%</p>
                <p className="text-sm text-green-300 mt-1">Average return</p>
              </div>
            </div>

            {/* Social Media & Content Section */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Share2 className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-bold">Social Media & Content Creation</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => window.location.href = '/social-media'}
                  className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all text-left group"
                >
                  <MessageSquare className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Social Media Manager</h4>
                  <p className="text-sm text-zinc-400">Schedule posts, manage accounts, track engagement</p>
                </button>

                <button
                  onClick={() => window.location.href = '/enterprise-content-center'}
                  className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
                >
                  <FileText className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Content Center</h4>
                  <p className="text-sm text-zinc-400">Manage all marketing content and documents</p>
                </button>

                <button
                  onClick={() => window.location.href = '/enterprise-content-center'}
                  className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-6 hover:border-pink-500/60 transition-all text-left group"
                >
                  <Sparkles className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">AI Content Studio</h4>
                  <p className="text-sm text-zinc-400">Generate AI-powered marketing content</p>
                </button>
              </div>
            </div>

            {/* Video Marketing Section */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Video className="w-6 h-6 text-pink-500" />
                <h3 className="text-xl font-bold">Video Marketing</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/social-media'}
                  className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-6 hover:border-pink-500/60 transition-all text-left group"
                >
                  <Tv className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Video Reels Manager</h4>
                  <p className="text-sm text-zinc-400">Create, edit, and publish short-form video content</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      45.2K views
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      89% engagement
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => window.location.href = '/social-media'}
                  className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all text-left group"
                >
                  <BarChart3 className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Video Analytics</h4>
                  <p className="text-sm text-zinc-400">Track video performance and audience insights</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +42% growth
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      12.5K reach
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Asset Creation Tools Section */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Image className="w-6 h-6 text-orange-500" />
                <h3 className="text-xl font-bold">Marketing Asset Creation</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/10 border border-orange-500/30 rounded-lg p-6">
                  <PenTool className="w-8 h-8 text-orange-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Marketing Assets</h4>
                  <p className="text-sm text-zinc-400 mb-4">Generate product photos, ads, and promotional materials</p>
                  <p className="text-sm text-zinc-500">Available in Product Management</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-600/10 to-cyan-700/10 border border-cyan-500/30 rounded-lg p-6">
                  <Megaphone className="w-8 h-8 text-cyan-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Product Ads</h4>
                  <p className="text-sm text-zinc-400 mb-4">Create professional product advertisements and campaigns</p>
                  <p className="text-sm text-zinc-500">Available in eCommerce Hub</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-700/10 border border-emerald-500/30 rounded-lg p-6">
                  <FileText className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Quote Design Assets</h4>
                  <p className="text-sm text-zinc-400 mb-4">Generate 3D renders and floor plans for quotes</p>
                  <p className="text-sm text-zinc-500">Available in Quote System</p>
                </div>
              </div>
            </div>

            {/* Deals & Offers Management Section */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Gift className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-xl font-bold">Deals & Offers Management</h3>
                </div>
                <button
                  onClick={() => toast.success('Deal creator modal will open here')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-lg text-white font-semibold transition"
                >
                  <Plus className="w-5 h-5" />
                  Create New Deal
                </button>
              </div>

              {/* Deal Type Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-600/10 to-orange-600/10 border border-yellow-500/30 rounded-lg p-6">
                  <Trophy className="w-8 h-8 text-yellow-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Giveaways</h4>
                  <p className="text-sm text-zinc-400 mb-4">Manage active giveaways and prize campaigns</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Active: <span className="text-yellow-400 font-bold">3</span></span>
                    <span className="text-zinc-500">Pending: <span className="text-orange-400 font-bold">2</span></span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-lg p-6">
                  <Package className="w-8 h-8 text-blue-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Product Deals</h4>
                  <p className="text-sm text-zinc-400 mb-4">Featured product discounts and promotions</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Active: <span className="text-blue-400 font-bold">4</span></span>
                    <span className="text-zinc-500">Pending: <span className="text-cyan-400 font-bold">1</span></span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-lg p-6">
                  <Users className="w-8 h-8 text-orange-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Partner Deals</h4>
                  <p className="text-sm text-zinc-400 mb-4">Vendor, subcontractor, and service provider offers</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Active: <span className="text-orange-400 font-bold">3</span></span>
                    <span className="text-zinc-500">Pending: <span className="text-red-400 font-bold">1</span></span>
                  </div>
                </div>
              </div>

              {/* Pending Approvals Table */}
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">Pending Deal Approvals</h4>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filter
                      </button>
                      <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-900/50 border-b border-zinc-800">
                      <tr>
                        <th className="text-left p-4 text-sm font-semibold text-zinc-400">Deal Name</th>
                        <th className="text-left p-4 text-sm font-semibold text-zinc-400">Type</th>
                        <th className="text-left p-4 text-sm font-semibold text-zinc-400">Placement</th>
                        <th className="text-left p-4 text-sm font-semibold text-zinc-400">Value</th>
                        <th className="text-left p-4 text-sm font-semibold text-zinc-400">Submitted By</th>
                        <th className="text-left p-4 text-sm font-semibold text-zinc-400">Date</th>
                        <th className="text-right p-4 text-sm font-semibold text-zinc-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {/* Deal 1 */}
                      <tr className="hover:bg-zinc-900/30 transition">
                        <td className="p-4">
                          <div className="font-semibold">Summer Tool Giveaway</div>
                          <div className="text-sm text-zinc-500">DeWalt Power Tool Set</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-sm font-semibold rounded-full">
                            Giveaway
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">Landing Page</div>
                          <div className="text-sm text-zinc-500">Customer Portal</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-green-400">$2,500</div>
                        </td>
                        <td className="p-4 text-sm text-zinc-400">Marketing Team</td>
                        <td className="p-4 text-sm text-zinc-400">2026-05-08</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toast.success('Deal approved!')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-semibold transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => toast.error('Deal rejected')}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </button>
                            <button className="p-1 hover:bg-zinc-800 rounded transition">
                              <Eye className="w-4 h-4 text-zinc-400" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Deal 2 */}
                      <tr className="hover:bg-zinc-900/30 transition">
                        <td className="p-4">
                          <div className="font-semibold">Lumber Bundle Promotion</div>
                          <div className="text-sm text-zinc-500">40% off Premium Lumber</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-sm font-semibold rounded-full">
                            Product Deal
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">Landing Page</div>
                          <div className="text-sm text-zinc-500">Marketplace Banner</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-green-400">$599</div>
                          <div className="text-sm text-zinc-500 line-through">$999</div>
                        </td>
                        <td className="p-4 text-sm text-zinc-400">Vendor: HD Supply</td>
                        <td className="p-4 text-sm text-zinc-400">2026-05-09</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toast.success('Deal approved!')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-semibold transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => toast.error('Deal rejected')}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </button>
                            <button className="p-1 hover:bg-zinc-800 rounded transition">
                              <Eye className="w-4 h-4 text-zinc-400" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Deal 3 */}
                      <tr className="hover:bg-zinc-900/30 transition">
                        <td className="p-4">
                          <div className="font-semibold">Contractor Launch Special</div>
                          <div className="text-sm text-zinc-500">50% off first 3 months</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-orange-600/20 text-orange-400 text-sm font-semibold rounded-full">
                            Partner Deal
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">Landing Page</div>
                          <div className="text-sm text-zinc-500">Marketing Hub</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-green-400">3 months</div>
                        </td>
                        <td className="p-4 text-sm text-zinc-400">Marketing Team</td>
                        <td className="p-4 text-sm text-zinc-400">2026-05-10</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toast.success('Deal approved!')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-semibold transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => toast.error('Deal rejected')}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </button>
                            <button className="p-1 hover:bg-zinc-800 rounded transition">
                              <Eye className="w-4 h-4 text-zinc-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/enterprise-content-center'}
                  className="bg-gradient-to-br from-purple-600/10 to-indigo-600/10 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/60 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PenTool className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-bold mb-1">Create Deal from Content Center</h4>
                        <p className="text-sm text-zinc-400">Use content creator to design deals and promotions</p>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 transition" />
                  </div>
                </button>

                <button
                  onClick={() => window.location.href = '/marketing-hub-landing-page'}
                  className="bg-gradient-to-br from-pink-600/10 to-rose-600/10 border border-pink-500/30 rounded-lg p-4 hover:border-pink-500/60 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="w-8 h-8 text-pink-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-bold mb-1">Preview Active Deals</h4>
                        <p className="text-sm text-zinc-400">View live deals on Marketing Hub landing page</p>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-pink-400 transition" />
                  </div>
                </button>
              </div>
            </div>

            {/* Marketing Hub Overview */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-bold">Marketing Solutions Overview</h3>
              </div>
              <div className="flex items-center justify-between p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg hover:border-blue-500/60 transition-all">
                <div>
                  <h4 className="font-bold text-lg mb-2">Marketing Hub</h4>
                  <p className="text-sm text-zinc-400 mb-3">View all business solutions and marketing offerings</p>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Trades Worker Portal
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      Vendor Advertising
                    </span>
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      Subcontractor Hub
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/pages/marketing/marketing-hub'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  View Marketing Hub
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Campaign Performance */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-green-500" />
                  <h3 className="text-xl font-bold">Campaign Performance</h3>
                </div>
                <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Top Performing Campaigns</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Spring Product Launch</p>
                        <p className="text-sm text-zinc-500">Social Media • 15 days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+425%</p>
                        <p className="text-sm text-zinc-500">ROI</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Video Marketing Series</p>
                        <p className="text-sm text-zinc-500">Video Reels • 30 days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+312%</p>
                        <p className="text-sm text-zinc-500">ROI</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Email Newsletter Campaign</p>
                        <p className="text-sm text-zinc-500">Email • 7 days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+198%</p>
                        <p className="text-sm text-zinc-500">ROI</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Content Performance Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Total Impressions</span>
                      <span className="font-bold">287.5K</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Engagement Rate</span>
                      <span className="font-bold text-green-400">12.8%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Click-Through Rate</span>
                      <span className="font-bold text-blue-400">8.4%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Conversion Rate</span>
                      <span className="font-bold text-purple-400">5.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Total Revenue Generated</span>
                      <span className="font-bold text-green-400">$142,850</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            {/* Loading State */}
            {isLoadingRevenue ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                <span className="ml-3 text-lg text-zinc-400">Loading revenue data...</span>
              </div>
            ) : (
              <>
                {/* Cohort Overview Stats - REAL DATA */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-blue-200">Total Cohorts</p>
                      <Layers className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {cohortHealth?.totalCohorts || allCohorts.length}
                    </p>
                    <p className="text-sm text-blue-300 mt-1">Active cohorts</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-purple-200">Growth Rate</p>
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {revenueTrends?.averageGrowthRate 
                        ? `${revenueTrends.averageGrowthRate.toFixed(1)}%` 
                        : '+0%'}
                    </p>
                    <p className="text-sm text-purple-300 mt-1">Average monthly</p>
                  </div>

                  <div className="bg-gradient-to-br from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-pink-200">Total Subscribers</p>
                      <Users className="w-5 h-5 text-pink-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {formatNumber(revenueData?.overview?.totalActiveSubscribers || 0)}
                    </p>
                    <p className="text-sm text-pink-300 mt-1">Active subscribers</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-green-200">Monthly Revenue</p>
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(revenueData?.overview?.totalMRR || 0)}
                    </p>
                    <p className="text-sm text-green-300 mt-1">Total MRR</p>
                  </div>
                </div>
              </>
            )}

            {/* Cohort Management Section */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Layers className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-bold">Cohort Management Systems</h3>
                  {revenueData && (
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-sm font-semibold rounded-full flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Live Data
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const success = await initializeCohorts();
                      if (success) {
                        toast.success('Cohorts initialized successfully!');
                        window.location.reload();
                      } else {
                        toast.error('Failed to initialize cohorts');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Initialize System
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
                  <button
                    onClick={() => window.location.href = '/cohort-management'}
                    className="px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-all font-semibold flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Advanced Cohort Manager
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all group">
                  <Home className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Customer Revenue</h4>
                  <p className="text-sm text-zinc-400 mb-3">Customer subscription cohorts</p>
                  <p className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(revenueData?.revenueByCategory?.customer || 0)}
                  </p>
                  <p className="text-sm text-blue-300">Monthly revenue</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all group">
                  <Hammer className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Construction Plans</h4>
                  <p className="text-sm text-zinc-400 mb-3">Build subscriptions revenue</p>
                  <p className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(revenueData?.revenueByCategory?.construction || 0)}
                  </p>
                  <p className="text-sm text-purple-300">Monthly revenue</p>
                </div>

                <div className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-6 hover:border-pink-500/60 transition-all group">
                  <Package className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Vendor Revenue</h4>
                  <p className="text-sm text-zinc-400 mb-3">Vendor subscription tiers</p>
                  <p className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(revenueData?.revenueByCategory?.vendor || 0)}
                  </p>
                  <p className="text-sm text-pink-300">Monthly revenue</p>
                </div>

                <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/10 border border-orange-500/30 rounded-lg p-6 hover:border-orange-500/60 transition-all group">
                  <Megaphone className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Advertiser Revenue</h4>
                  <p className="text-sm text-zinc-400 mb-3">Ad packages & campaigns</p>
                  <p className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(revenueData?.revenueByCategory?.advertiser || 0)}
                  </p>
                  <p className="text-sm text-orange-300">Monthly revenue</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.location.href = '/cohort-management'}
                className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="font-bold text-white">Create New Cohort</h4>
                </div>
                <p className="text-sm text-zinc-400">Segment customers into targeted groups</p>
              </button>

              <button
                onClick={() => window.location.href = '/cohort-management'}
                className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-purple-400" />
                  </div>
                  <h4 className="font-bold text-white">Add Subscription Plan</h4>
                </div>
                <p className="text-sm text-zinc-400">Create maintenance or service plans</p>
              </button>

              <button
                onClick={() => window.location.href = '/cohort-management'}
                className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-pink-400" />
                  </div>
                  <h4 className="font-bold text-white">View Analytics</h4>
                </div>
                <p className="text-sm text-zinc-400">Track cohort performance and insights</p>
              </button>
            </div>

            {/* Cohort Performance */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-green-500" />
                  <h3 className="text-xl font-bold">Cohort Performance Overview</h3>
                </div>
                <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-semibold flex items-center gap-2 transition-all">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Performing Cohorts - REAL DATA */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Top Performing Cohorts
                  </h4>
                  <div className="space-y-4">
                    {(revenueData?.topCohorts || []).slice(0, 5).map((cohort: any) => (
                      <div key={cohort.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-[#ea580c] transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{cohort.name}</p>
                            <p className="text-sm text-zinc-500">
                              {cohort.category} • {cohort.subscribers} subscribers
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold text-lg">
                              {cohort.growthRate > 0 ? '+' : ''}{cohort.growthRate.toFixed(1)}%
                            </p>
                            <p className="text-sm text-zinc-500">Growth</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800">
                          <span className="text-zinc-400">Revenue</span>
                          <span className="font-bold text-white">{formatCurrency(cohort.revenue)}</span>
                        </div>
                      </div>
                    ))}
                    {(!revenueData?.topCohorts || revenueData.topCohorts.length === 0) && (
                      <p className="text-center text-zinc-500 py-8">No cohort data available</p>
                    )}
                  </div>
                </div>

                {/* Revenue Breakdown - REAL DATA */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Revenue Breakdown by Category
                  </h4>
                  <div className="space-y-4">
                    {revenueData?.revenueByCategory && Object.entries(revenueData.revenueByCategory)
                      .filter(([_, amount]: [string, any]) => amount > 0)
                      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b - a)
                      .map(([category, amount]: [string, any]) => {
                        const percentage = revenueData.overview.totalMRR > 0 
                          ? (amount / revenueData.overview.totalMRR) * 100 
                          : 0;
                        const colorMap: Record<string, string> = {
                          customer: 'bg-blue-500',
                          construction: 'bg-orange-500',
                          'property-management': 'bg-purple-500',
                          vendor: 'bg-pink-500',
                          subcontractor: 'bg-green-500',
                          advertiser: 'bg-yellow-500',
                          service_plan: 'bg-cyan-500',
                          other: 'bg-gray-500'
                        };
                        const categoryLabel = category.split('_').map(
                          word => word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-zinc-400">{categoryLabel}</span>
                              <span className="font-bold text-white">{formatCurrency(amount)}/mo</span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-2">
                              <div 
                                className={`${colorMap[category] || 'bg-gray-500'} h-2 rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-sm text-zinc-500 text-right">{percentage.toFixed(1)}%</div>
                          </div>
                        );
                      })}
                    {(!revenueData?.revenueByCategory || 
                      Object.values(revenueData.revenueByCategory).every((v: any) => v === 0)) && (
                      <p className="text-center text-zinc-500 py-8">No revenue data available</p>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Total Revenue</span>
                      <span className="text-2xl font-bold text-green-400">
                        {formatCurrency(revenueData?.overview?.totalMRR || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cohort Performance Metrics */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-purple-500" />
                <h3 className="text-xl font-bold">Performance Metrics</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Impressions', value: '287.5K', icon: Eye, color: 'blue' },
                  { label: 'Engagement Rate', value: '12.8%', icon: Activity, color: 'green' },
                  { label: 'Click-Through Rate', value: '8.4%', icon: Target, color: 'purple' },
                  { label: 'Conversion Rate', value: '5.2%', icon: TrendingUp, color: 'orange' },
                  { label: 'Avg Revenue Per User', value: '$6,742', icon: DollarSign, color: 'green' },
                  { label: 'Lifetime Value', value: '$24,150', icon: Star, color: 'yellow' },
                  { label: 'Churn Rate', value: '2.1%', icon: TrendingDown, color: 'red' },
                  { label: 'Customer Satisfaction', value: '94%', icon: CheckCircle, color: 'green' },
                ].map((metric, idx) => {
                  const Icon = metric.icon;
                  return (
                    <div key={idx} className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-4 hover:border-[#ea580c] transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 text-${metric.color}-400`} />
                        <span className="text-sm text-zinc-500">{metric.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{metric.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}