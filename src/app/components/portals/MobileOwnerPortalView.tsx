/**
 * Mobile Owner Portal View
 * Complete mobile-optimized owner dashboard with gift hours and customer management
 */

import { useState, useEffect } from 'react';
import {
  Crown, Gift, Users, TrendingUp, DollarSign, Clock, CheckCircle,
  AlertCircle, Star, Package, FileText, ArrowUpRight, Zap, Filter,
  Search, Plus, BarChart3, Award, Target, Sparkles, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import GiftHoursModal from '../GiftHoursModal';
import * as SupabaseData from '../../lib/supabase-data';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';

export default function MobileOwnerPortalView() {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SupabaseData.Subscription | null>(null);
  const [subscriptions, setSubscriptions] = useState<SupabaseData.Subscription[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'analytics'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Load subscriptions
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const subs = await SupabaseData.getSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleGiftHours = (sub: SupabaseData.Subscription) => {
    setSelectedSubscription(sub);
    setShowGiftModal(true);
  };

  // Mock stats
  const stats = [
    { label: 'Total Customers', value: subscriptions.length, icon: Users, color: 'blue', change: '+12%' },
    { label: 'Active Subscriptions', value: subscriptions.filter(s => s.status === 'active').length, icon: CheckCircle, color: 'green', change: '+8%' },
    { label: 'Monthly Revenue', value: `$${subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'orange', change: '+15%' },
    { label: 'Avg Rating', value: '4.9', icon: Star, color: 'yellow', change: '+0.2' }
  ];

  // Top customers
  const topCustomers = subscriptions
    .filter(s => s.status === 'active')
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);

  // Recent activity
  const recentActivity = [
    { type: 'gift', customer: 'John Smith', action: 'Received 5 bonus hours', time: '2 hours ago', icon: Gift, color: 'purple' },
    { type: 'subscription', customer: 'ABC Corp', action: 'Upgraded to Pro plan', time: '5 hours ago', icon: TrendingUp, color: 'green' },
    { type: 'payment', customer: 'Jane Doe', action: 'Payment received - $299', time: '1 day ago', icon: DollarSign, color: 'orange' },
    { type: 'approval', customer: 'XYZ LLC', action: 'Quote approved - $15,000', time: '2 days ago', icon: CheckCircle, color: 'blue' }
  ];

  const filteredSubscriptions = subscriptions.filter(sub =>
    (sub.stakeholderName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sub.plan || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-600/20 to-blue-700/20 border-blue-500/30 text-blue-400';
      case 'green':
        return 'from-green-600/20 to-green-700/20 border-green-500/30 text-green-400';
      case 'orange':
        return 'from-orange-600/20 to-orange-700/20 border-orange-500/30 text-orange-400';
      case 'purple':
        return 'from-purple-600/20 to-purple-700/20 border-purple-500/30 text-purple-400';
      case 'yellow':
        return 'from-yellow-600/20 to-yellow-700/20 border-yellow-500/30 text-yellow-400';
      default:
        return 'from-gray-600/20 to-gray-700/20 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <SponsoredMarquee />
      <AdvertisingMarquee placement="portal-header" dismissible />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Owner Portal</h1>
            <p className="text-gray-400">Executive control center for gift hours & customer management</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color);
          return (
            <div key={i} className={`bg-[#1A1A1A] rounded-2xl p-6 border ${colors} transition group hover:scale-105`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors} flex items-center justify-center border`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-green-400">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => {
            if (subscriptions.length > 0) {
              handleGiftHours(subscriptions[0]);
            } else {
              toast.info('No subscriptions available');
            }
          }}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-2xl p-6 text-left transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Gift Hours</h3>
              <p className="text-sm text-white/80">Offer free hours to customers</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('customers'); }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl p-6 text-left transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Manage Customers</h3>
              <p className="text-sm text-white/80">View all customer accounts</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('analytics'); }}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-2xl p-6 text-left transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">View Analytics</h3>
              <p className="text-sm text-white/80">Revenue & performance metrics</p>
            </div>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] mb-6">
        <div className="flex gap-2 p-2 border-b border-[#2A2A2A]">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Customers */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-orange-400" />
                  Top Customers
                </h3>
                <div className="space-y-3">
                  {topCustomers.length > 0 ? (
                    topCustomers.map((sub, i) => (
                      <div key={sub.id} className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A] flex items-center justify-between hover:border-purple-500/30 transition group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/20 flex items-center justify-center border border-purple-500/30">
                            <span className="text-lg font-bold text-purple-400">#{i + 1}</span>
                          </div>
                          <div>
                            <p className="font-bold text-white">{sub.stakeholderName}</p>
                            <p className="text-sm text-gray-400">{sub.plan}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">${sub.amount}/mo</p>
                          <button
                            onClick={() => handleGiftHours(sub)}
                            className="text-sm text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
                          >
                            <Gift className="w-4 h-4" />
                            Gift Hours
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-8">No customers yet</p>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {recentActivity.map((activity, i) => {
                    const Icon = activity.icon;
                    const colors = getColorClasses(activity.color);
                    return (
                      <div key={i} className="bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A] flex items-center gap-4 hover:border-purple-500/30 transition">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors} flex items-center justify-center border`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{activity.customer}</p>
                          <p className="text-sm text-gray-400">{activity.action}</p>
                        </div>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="space-y-3">
                {filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((sub) => (
                    <div key={sub.id} className="bg-[#0A0A0A] rounded-xl p-5 border border-[#2A2A2A] hover:border-purple-500/30 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-white mb-1">{sub.stakeholderName}</h4>
                          <p className="text-sm text-gray-400">{sub.plan}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          sub.status === 'active' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {sub.status?.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-[#2A2A2A]">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Monthly Rate</p>
                          <p className="text-lg font-bold text-white">${sub.amount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Hours Included</p>
                          <p className="text-lg font-bold text-white">{sub.hoursIncluded}h</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Gifted Hours</p>
                          <p className="text-lg font-bold text-purple-400">{sub.hoursGifted || 0}h</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGiftHours(sub)}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl py-3 px-4 font-bold text-white transition flex items-center justify-center gap-2"
                        >
                          <Gift className="w-5 h-5" />
                          Gift Hours
                        </button>
                        <button
                          onClick={() => { window.location.href = `/customers?email=${encodeURIComponent(sub.stakeholderEmail || '')}`; }}
                          className="px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white transition"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No customers found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-5">
              <div><h3 className="text-xl font-bold text-white">Subscription analytics</h3><p className="mt-1 text-sm text-gray-400">Live totals based on the subscriptions currently visible to your owner account.</p></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5"><p className="text-sm text-gray-400">Active monthly revenue</p><p className="mt-2 text-3xl font-bold text-green-400">${subscriptions.filter(sub => sub.status === 'active').reduce((sum, sub) => sum + Number(sub.amount || 0), 0).toLocaleString()}</p></div><div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5"><p className="text-sm text-gray-400">Active plans</p><p className="mt-2 text-3xl font-bold text-blue-400">{subscriptions.filter(sub => sub.status === 'active').length}</p></div><div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5"><p className="text-sm text-gray-400">Hours remaining</p><p className="mt-2 text-3xl font-bold text-orange-400">{subscriptions.reduce((sum, sub) => sum + Math.max(0, Number(sub.hoursIncluded || 0) + Number(sub.hoursRollover || 0) + Number(sub.hoursGifted || 0) - Number(sub.hoursUsed || 0)), 0).toFixed(1)}h</p></div></div>
              <div className="rounded-2xl border border-white/10 bg-[#111] p-5"><h4 className="font-semibold text-white">Plan mix</h4><div className="mt-4 space-y-3">{Object.entries(subscriptions.reduce((groups: Record<string, number>, sub) => ({ ...groups, [sub.plan || 'Unassigned']: (groups[sub.plan || 'Unassigned'] || 0) + 1 }), {})).map(([plan, count]) => <div key={plan} className="flex items-center justify-between border-b border-white/5 pb-2 text-sm"><span className="text-gray-300">{plan}</span><span className="font-bold text-white">{count}</span></div>)}</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Gift Hours Modal */}
      {showGiftModal && (
        <GiftHoursModal
          isOpen={showGiftModal}
          onClose={() => {
            setShowGiftModal(false);
            setSelectedSubscription(null);
          }}
          subscription={selectedSubscription}
          onSuccess={() => {
            loadData();
            toast.success('Hours gifted successfully!');
          }}
          userRole="owner"
          userName="Owner"
        />
      )}
    </div>
  );
}
