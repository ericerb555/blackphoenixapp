/**
 * Revenue & Monetization Hub - Consolidated Revenue Management
 * 
 * Central hub for all revenue streams, payments, subscriptions, advertising, and operations
 * Tabs: Payments | Subscriptions | Advertising | Vendor Ops | Subcontractor Ops | Promotions | Referrals | Marketing | Cohorts
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Wallet, TrendingUp, Megaphone, ShoppingCart, Wrench,
  Gift, Award, BarChart3, Users, DollarSign, CreditCard, Package,
  Store, Briefcase, Target, Crown, Layers, Calendar, MapPin, 
  MessageSquare, Bell, Settings, Plus, Edit, Trash2, Eye, Copy,
  CheckCircle, XCircle, Clock, TrendingDown, Filter, Search, Download, 
  Tag, Percent, Share2, Zap, Star, Heart, Send, ExternalLink, 
  Activity, AlertCircle, RefreshCw, Save, ArrowUpRight, Sparkles,
  FileText, Video, Tv, Image, PenTool, Globe
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { toast } from 'sonner@2.0.3';

type TabType = 'payments' | 'subscriptions' | 'advertising' | 'vendor-ops' | 'subcontractor-ops' | 'promotions' | 'referrals' | 'marketing' | 'cohorts';

interface RevenueMonetizationHubProps {
  onNavigate?: (page: string) => void;
}

export default function RevenueMonetizationHub({ onNavigate }: RevenueMonetizationHubProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('payments');
  const [searchQuery, setSearchQuery] = useState('');

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

  const mockPayments = [
    { id: 'PAY-001', customer: 'John Doe', amount: 5000, status: 'completed', date: '2026-03-12' },
    { id: 'PAY-002', customer: 'Acme Corp', amount: 12000, status: 'pending', date: '2026-03-13' },
    { id: 'PAY-003', customer: 'Jane Smith', amount: 3500, status: 'completed', date: '2026-03-11' }
  ];

  const mockSubscriptions = [
    { id: 'SUB-001', plan: 'Premium', customer: 'Tech Solutions Inc', mrr: 299, status: 'active', renewalDate: '2026-04-01' },
    { id: 'SUB-002', plan: 'Enterprise', customer: 'BuildRight Co', mrr: 599, status: 'active', renewalDate: '2026-03-28' },
    { id: 'SUB-003', plan: 'Starter', customer: 'Small Business LLC', mrr: 99, status: 'expiring', renewalDate: '2026-03-15' }
  ];

  const mockVendors = [
    { id: 'V-001', name: 'HD Supply', revenue: 45000, orders: 127, rating: 4.8, status: 'active' },
    { id: 'V-002', name: 'Ferguson Plumbing', revenue: 32000, orders: 89, rating: 4.6, status: 'active' },
    { id: 'V-003', name: 'Grainger Industrial', revenue: 28000, orders: 64, rating: 4.9, status: 'active' }
  ];

  const mockSubcontractors = [
    { id: 'SC-001', name: 'Elite Electrical', revenue: 67000, jobs: 23, rating: 4.9, status: 'active' },
    { id: 'SC-002', name: 'ProPlumb Services', revenue: 54000, jobs: 18, rating: 4.7, status: 'active' },
    { id: 'SC-003', name: 'Premier HVAC', revenue: 48000, jobs: 15, rating: 4.8, status: 'active' }
  ];

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
                <p className="text-xs text-green-300 mt-1">This month</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Pending</p>
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">$12,000</p>
                <p className="text-xs text-blue-300 mt-1">1 payment</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Completed</p>
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">$8,500</p>
                <p className="text-xs text-purple-300 mt-1">2 payments</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-orange-200">Avg Transaction</p>
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">$6,833</p>
                <p className="text-xs text-orange-300 mt-1">Per payment</p>
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
                {mockPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg hover:border hover:border-orange-500/30 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{payment.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Monthly Recurring</p>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">$997</p>
                <p className="text-xs text-purple-300 mt-1">MRR</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Active Subs</p>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">3</p>
                <p className="text-xs text-green-300 mt-1">Subscriptions</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border border-yellow-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-yellow-200">Expiring Soon</p>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-white">1</p>
                <p className="text-xs text-yellow-300 mt-1">Needs attention</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">ARR</p>
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">$11,964</p>
                <p className="text-xs text-blue-300 mt-1">Annual recurring</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Active Subscriptions</h3>
              <div className="space-y-3">
                {mockSubscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{sub.customer}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          sub.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">{sub.plan} Plan • Renews {sub.renewalDate}</p>
                    </div>
                    <p className="text-xl font-bold text-purple-400">${sub.mrr}/mo</p>
                  </div>
                ))}
              </div>
            </div>
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
                <p className="text-xs text-rose-300 mt-1">From all vendors</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Active Vendors</p>
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">3</p>
                <p className="text-xs text-blue-300 mt-1">Vendors</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Total Orders</p>
                  <Package className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">280</p>
                <p className="text-xs text-green-300 mt-1">All time</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Top Vendors</h3>
              <div className="space-y-3">
                {mockVendors.map((vendor) => (
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
                <p className="text-xs text-orange-300 mt-1">To subcontractors</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Active Subs</p>
                  <Wrench className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">3</p>
                <p className="text-xs text-blue-300 mt-1">Subcontractors</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Jobs Completed</p>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">56</p>
                <p className="text-xs text-green-300 mt-1">All time</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">Top Subcontractors</h3>
              <div className="space-y-3">
                {mockSubcontractors.map((sub) => (
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
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-8 text-center">
            <Gift className="w-16 h-16 text-pink-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Promotions & Coupons</h3>
            <p className="text-zinc-400 mb-4">Manage promotional campaigns, coupon codes, and special offers</p>
            <button 
              onClick={() => window.location.href = '/promotions-manager'}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Open Promotions Manager
            </button>
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
                <p className="text-xs text-blue-300 mt-1">This month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Social Posts</p>
                  <Share2 className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">1,284</p>
                <p className="text-xs text-purple-300 mt-1">Total engagement</p>
              </div>

              <div className="bg-gradient-to-br from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-pink-200">Video Views</p>
                  <Video className="w-5 h-5 text-pink-400" />
                </div>
                <p className="text-3xl font-bold text-white">45.2K</p>
                <p className="text-xs text-pink-300 mt-1">Total views</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Campaign ROI</p>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">285%</p>
                <p className="text-xs text-green-300 mt-1">Average return</p>
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
                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
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
                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
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
                  <p className="text-xs text-zinc-500">Available in Product Management</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-600/10 to-cyan-700/10 border border-cyan-500/30 rounded-lg p-6">
                  <Megaphone className="w-8 h-8 text-cyan-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Product Ads</h4>
                  <p className="text-sm text-zinc-400 mb-4">Create professional product advertisements and campaigns</p>
                  <p className="text-xs text-zinc-500">Available in eCommerce Hub</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-700/10 border border-emerald-500/30 rounded-lg p-6">
                  <FileText className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Quote Design Assets</h4>
                  <p className="text-sm text-zinc-400 mb-4">Generate 3D renders and floor plans for quotes</p>
                  <p className="text-xs text-zinc-500">Available in Quote System</p>
                </div>
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
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
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
                        <p className="text-xs text-zinc-500">Social Media • 15 days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+425%</p>
                        <p className="text-xs text-zinc-500">ROI</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Video Marketing Series</p>
                        <p className="text-xs text-zinc-500">Video Reels • 30 days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+312%</p>
                        <p className="text-xs text-zinc-500">ROI</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Email Newsletter Campaign</p>
                        <p className="text-xs text-zinc-500">Email • 7 days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+198%</p>
                        <p className="text-xs text-zinc-500">ROI</p>
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
            {/* Cohort Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-200">Total Cohorts</p>
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">15</p>
                <p className="text-xs text-blue-300 mt-1">Active cohorts</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">Cohort Growth</p>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">+23%</p>
                <p className="text-xs text-purple-300 mt-1">Year-over-year</p>
              </div>

              <div className="bg-gradient-to-br from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-pink-200">Cohort Retention</p>
                  <CheckCircle className="w-5 h-5 text-pink-400" />
                </div>
                <p className="text-3xl font-bold text-white">85%</p>
                <p className="text-xs text-pink-300 mt-1">Average retention rate</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-green-200">Cohort Revenue</p>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">$500,000</p>
                <p className="text-xs text-green-300 mt-1">Total revenue</p>
              </div>
            </div>

            {/* Cohort Management Section */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Layers className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-bold">Cohort Management Systems</h3>
                </div>
                <button
                  onClick={() => window.location.href = '/cohort-management'}
                  className="px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-all font-semibold flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Advanced Cohort Manager
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-500/30 rounded-lg p-6 hover:border-blue-500/60 transition-all group">
                  <MessageSquare className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Customer Cohorts</h4>
                  <p className="text-sm text-zinc-400 mb-3">Segment and analyze customer groups</p>
                  <p className="text-2xl font-bold text-white mb-1">15</p>
                  <p className="text-xs text-blue-300">Active cohorts</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-6 hover:border-purple-500/60 transition-all group">
                  <Star className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Subscription Plans</h4>
                  <p className="text-sm text-zinc-400 mb-3">Maintenance & service plans</p>
                  <p className="text-2xl font-bold text-white mb-1">347</p>
                  <p className="text-xs text-purple-300">Active subscribers</p>
                </div>

                <div className="bg-gradient-to-br from-pink-600/10 to-pink-700/10 border border-pink-500/30 rounded-lg p-6 hover:border-pink-500/60 transition-all group">
                  <Package className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Vendor Plans</h4>
                  <p className="text-sm text-zinc-400 mb-3">Vendor subscription tiers</p>
                  <p className="text-2xl font-bold text-white mb-1">59</p>
                  <p className="text-xs text-pink-300">Active vendors</p>
                </div>

                <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/10 border border-orange-500/30 rounded-lg p-6 hover:border-orange-500/60 transition-all group">
                  <Megaphone className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-lg mb-2">Advertiser Plans</h4>
                  <p className="text-sm text-zinc-400 mb-3">Ad packages & campaigns</p>
                  <p className="text-2xl font-bold text-white mb-1">57</p>
                  <p className="text-xs text-orange-300">Active advertisers</p>
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
                {/* Top Performing Cohorts */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Top Performing Cohorts
                  </h4>
                  <div className="space-y-4">
                    {[
                      { name: 'Enterprise Tier Clients', date: '2025-11-12', revenue: '$2.8M', roi: '+425%', members: 187 },
                      { name: 'Property Management Groups', date: '2025-09-20', revenue: '$1.4M', roi: '+312%', members: 156 },
                      { name: 'Q1 2026 New Onboards', date: '2026-01-05', revenue: '$876K', roi: '+198%', members: 423 },
                    ].map((cohort, idx) => (
                      <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-[#ea580c] transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{cohort.name}</p>
                            <p className="text-xs text-zinc-500">{cohort.date} • {cohort.members} members</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold text-lg">{cohort.roi}</p>
                            <p className="text-xs text-zinc-500">ROI</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800">
                          <span className="text-zinc-400">Revenue</span>
                          <span className="font-bold text-white">{cohort.revenue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-[#0A0A0A] border border-zinc-800 rounded-lg p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Revenue Breakdown
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Customer Cohorts', amount: '$5.2M', percentage: 65, color: 'bg-blue-500' },
                      { label: 'Subscription Plans', amount: '$2.1M', percentage: 26, color: 'bg-purple-500' },
                      { label: 'Vendor Plans', amount: '$487K', percentage: 6, color: 'bg-pink-500' },
                      { label: 'Advertiser Plans', amount: '$243K', percentage: 3, color: 'bg-orange-500' },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">{item.label}</span>
                          <span className="font-bold text-white">{item.amount}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Total Revenue</span>
                      <span className="text-2xl font-bold text-green-400">$8.03M</span>
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
                        <span className="text-xs text-zinc-500">{metric.label}</span>
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