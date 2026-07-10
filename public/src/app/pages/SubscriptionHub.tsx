/**
 * Subscription Hub - Central Control for ALL Subscriptions & Plans
 * 
 * Manages:
 * - Customer maintenance plans & seasonal packages
 * - Subcontractor subscriptions
 * - Vendor directory subscriptions
 * - Advertiser placement packages
 * - Referral tracking & rewards
 * - Gift cards & gifting system
 * - Hour banking (rollover, gifted, promotional)
 * - Owner-initiated giveaways
 */

import { useState, useEffect } from 'react';
import {
  Crown, Users, Wrench, Store, Megaphone, Gift, TrendingUp, DollarSign,
  Calendar, Clock, Star, Award, ArrowRight, Plus, Search, Filter, Download,
  Eye, Edit, Trash2, RefreshCw, Send, Check, X, AlertCircle, TrendingDown,
  Package, Zap, Activity, BarChart3, CreditCard, Ticket, Heart, Sparkles,
  ArrowUpRight, ChevronDown, ChevronRight, Building2, Phone, Mail, MapPin,
  CheckCircle, XCircle, Timer, PlayCircle, PauseCircle, Settings, History,
  FileText, MessageSquare, Bell, Share2, Copy, ExternalLink, Percent,
  Target, Briefcase, ShoppingCart, Coins, Wallet, ArrowDownRight, TrendingRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer } from '../components/ChartContainer';
import { PageHeader } from '../components/PageHeader';
import * as SupabaseData from '../lib/supabase-data';
import GiftHoursModal from '../components/GiftHoursModal';
import EditSubscriptionModal from '../components/EditSubscriptionModalUnified';
import HourTransferModal from '../components/HourTransferModal';
import SubscriptionPaymentDashboard from '../components/SubscriptionPaymentDashboard';
import SubscriptionPaymentPage from '../components/SubscriptionPaymentPage';
import SubscriptionHubSettings from '../components/SubscriptionHubSettings';
import VendorAdvertisingManagement from '../components/VendorAdvertisingManagement';

type TabView = 'overview' | 'customer-subs' | 'subcontractor-subs' | 'vendor-subs' | 'advertiser-subs' | 'referrals' | 'gift-cards' | 'hour-banking' | 'analytics';

type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'pending';

interface Subscription {
  id: string;
  type: 'customer' | 'subcontractor' | 'vendor' | 'advertiser';
  stakeholderName: string;
  stakeholderEmail: string;
  plan: string;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  amount: number;
  startDate: string;
  renewalDate: string;
  hoursIncluded?: number;
  hoursUsed?: number;
  hoursRollover?: number;
  hoursGifted?: number;
  autoRenew: boolean;
  paymentMethod: string;
}

interface Referral {
  id: string;
  referrerType: string;
  referrerName: string;
  referredType: string;
  referredName: string;
  status: 'pending' | 'completed' | 'paid';
  rewardAmount: number;
  dateReferred: string;
  dateCompleted?: string;
  conversionValue?: number;
}

interface GiftCard {
  id: string;
  code: string;
  type: 'dollar' | 'hours' | 'subscription';
  value: number;
  balance: number;
  purchasedBy: string;
  recipientEmail?: string;
  recipientName?: string;
  status: 'active' | 'redeemed' | 'expired';
  purchaseDate: string;
  expiryDate: string;
  redeemedDate?: string;
}

interface SubscriptionHubProps {
  onNavigate?: (page: string) => void;
}

export default function SubscriptionHub({ onNavigate }: SubscriptionHubProps = {}) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Supabase data state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [giftRequests, setGiftRequests] = useState<SupabaseData.GiftHoursRequest[]>([]);
  
  // Gift hours modal
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftTargetSub, setGiftTargetSub] = useState<Subscription | null>(null);
  
  // Edit subscription modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetSub, setEditTargetSub] = useState<Subscription | null>(null);
  
  // Payment dashboard
  const [showPaymentDashboard, setShowPaymentDashboard] = useState(false);
  
  // Payment page
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [paymentTargetSub, setPaymentTargetSub] = useState<Subscription | null>(null);
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  
  // Hour transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceSub, setTransferSourceSub] = useState<Subscription | null>(null);
  
  // Vendor Advertising Management
  const [showVendorAdvertising, setShowVendorAdvertising] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  
  // User role (in production, get from auth context)
  const [userRole] = useState<'owner' | 'assignee' | 'employee'>('owner'); // Change to test
  const [userName] = useState('John Smith');

  // Mount state for chart rendering - reset on tab change
  useEffect(() => {
    setMounted(false);
    // Small delay to ensure DOM is fully rendered before charts mount
    const timer = setTimeout(() => {
      setMounted(true);
    }, 150);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, [activeTab]);

  // Load data from Supabase
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [subsData, refsData, giftCardsData, analyticsData, requestsData] = await Promise.all([
        SupabaseData.getSubscriptions(),
        SupabaseData.getReferrals(),
        SupabaseData.getGiftCards(),
        SupabaseData.getSubscriptionAnalytics(),
        SupabaseData.getGiftHoursRequests()
      ]);
      
      setSubscriptions(subsData);
      setReferrals(refsData);
      setGiftCards(giftCardsData);
      setAnalytics(analyticsData);
      setGiftRequests(requestsData);
      
      // Add sample data if empty (for demo purposes)
      if (subsData.length === 0) {
        await addSampleData();
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }

  async function addSampleData() {
    try {
      // Add sample subscriptions
      const sampleSubs = [
        {
          type: 'customer' as const,
          stakeholderId: 'CUST-001',
          stakeholderName: 'Sarah Johnson',
          stakeholderEmail: 'sarah.j@email.com',
          plan: 'Premium Maintenance Plan',
          status: 'active' as const,
          billingCycle: 'monthly' as const,
          amount: 299,
          startDate: '2024-01-15',
          renewalDate: '2024-02-15',
          hoursIncluded: 8,
          hoursUsed: 3.5,
          hoursRollover: 2,
          hoursGifted: 1,
          autoRenew: true,
          paymentMethod: 'Credit Card ****1234'
        },
        {
          type: 'customer' as const,
          stakeholderId: 'CUST-002',
          stakeholderName: 'Michael Chen',
          stakeholderEmail: 'mchen@email.com',
          plan: 'Basic Maintenance Plan',
          status: 'active' as const,
          billingCycle: 'monthly' as const,
          amount: 149,
          startDate: '2023-11-01',
          renewalDate: '2024-02-01',
          hoursIncluded: 4,
          hoursUsed: 4,
          hoursRollover: 0,
          hoursGifted: 0,
          autoRenew: true,
          paymentMethod: 'Credit Card ****5678'
        },
        {
          type: 'subcontractor' as const,
          stakeholderId: 'SUB-001',
          stakeholderName: 'Elite Plumbing Co',
          stakeholderEmail: 'contact@eliteplumbing.com',
          plan: 'Pro Subcontractor Plan',
          status: 'active' as const,
          billingCycle: 'monthly' as const,
          amount: 99,
          startDate: '2024-01-01',
          renewalDate: '2024-02-01',
          autoRenew: true,
          paymentMethod: 'ACH Bank Transfer'
        }
      ];

      for (const sub of sampleSubs) {
        await SupabaseData.createSubscription(sub);
      }

      // Add sample referral
      await SupabaseData.createReferral({
        referrerId: 'CUST-001',
        referrerType: 'Customer',
        referrerName: 'Sarah Johnson',
        referredId: 'CUST-003',
        referredType: 'Customer',
        referredName: 'Emily Davis',
        status: 'completed',
        rewardAmount: 100,
        dateReferred: '2024-01-10',
        dateCompleted: '2024-01-15',
        conversionValue: 299
      });

      // Add sample gift card
      await SupabaseData.createGiftCard({
        type: 'dollar',
        value: 500,
        purchasedBy: 'Corporate Account',
        recipientEmail: 'winner@email.com',
        recipientName: 'Contest Winner',
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Reload data
      await loadData();
      toast.success('Sample data added successfully');
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  }

  // Handle approve gift request
  async function handleApproveGiftRequest(requestId: string) {
    try {
      await SupabaseData.approveGiftHoursRequest(requestId, userName, 'Approved');
      toast.success('✅ Gift hours request approved!');
      await loadData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  }

  // Handle reject gift request
  async function handleRejectGiftRequest(requestId: string) {
    const notes = prompt('Enter rejection reason:');
    if (!notes) return;
    
    try {
      await SupabaseData.rejectGiftHoursRequest(requestId, userName, notes);
      toast.success('Request rejected');
      await loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  }

  // Open gift modal
  function openGiftModal(subscription?: Subscription) {
    setGiftTargetSub(subscription || null);
    setShowGiftModal(true);
  }

  // Open transfer modal
  function openTransferModal(subscription: Subscription) {
    setTransferSourceSub(subscription);
    setShowTransferModal(true);
  }

  // Open edit modal
  function openEditModal(subscription: Subscription) {
    setEditTargetSub(subscription);
    setShowEditModal(true);
  }

  // Open payment page
  function openPaymentPage(subscription: Subscription) {
    setPaymentTargetSub(subscription);
    setShowPaymentPage(true);
  }

  // Handle process rollovers
  async function handleProcessRollovers() {
    try {
      const result = await SupabaseData.processRollovers();
      toast.success(`Processed ${result.processed} rollovers (${result.totalHours} hours)`);
      await loadData();
    } catch (error) {
      console.error('Error processing rollovers:', error);
      toast.error('Failed to process rollovers');
    }
  }

  // Stats calculations (using real data or analytics)
  const totalRevenue = analytics?.totalRevenue || subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const activeSubscriptions = analytics?.activeSubscriptions || subscriptions.filter(s => s.status === 'active').length;
  const totalReferralValue = referrals.reduce((sum, ref) => sum + (ref.conversionValue || 0), 0);
  const totalGiftCardValue = giftCards.reduce((sum, gc) => sum + gc.balance, 0);

  const revenueData = analytics?.revenueGrowth || [
    { month: 'Aug', revenue: totalRevenue * 0.6, subscriptions: Math.floor(activeSubscriptions * 0.6) },
    { month: 'Sep', revenue: totalRevenue * 0.7, subscriptions: Math.floor(activeSubscriptions * 0.7) },
    { month: 'Oct', revenue: totalRevenue * 0.8, subscriptions: Math.floor(activeSubscriptions * 0.8) },
    { month: 'Nov', revenue: totalRevenue * 0.9, subscriptions: Math.floor(activeSubscriptions * 0.9) },
    { month: 'Dec', revenue: totalRevenue * 0.95, subscriptions: Math.floor(activeSubscriptions * 0.95) },
    { month: 'Jan', revenue: totalRevenue, subscriptions: activeSubscriptions }
  ];

  const subscriptionBreakdown = [
    { name: 'Customer Plans', value: subscriptions.filter(s => s.type === 'customer' && s.status === 'active').length, color: '#3b82f6' },
    { name: 'Subcontractor', value: subscriptions.filter(s => s.type === 'subcontractor' && s.status === 'active').length, color: '#ea580c' },
    { name: 'Vendor', value: subscriptions.filter(s => s.type === 'vendor' && s.status === 'active').length, color: '#8b5cf6' },
    { name: 'Advertiser', value: subscriptions.filter(s => s.type === 'advertiser' && s.status === 'active').length, color: '#10b981' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-400">Loading subscription data...</div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">${totalRevenue.toLocaleString()}</div>
          <div className="text-sm opacity-90">Monthly Recurring Revenue</div>
          <div className="mt-2 text-sm opacity-75">↑ 18% from last month</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
            <Activity className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">{activeSubscriptions}</div>
          <div className="text-sm opacity-90">Active Subscriptions</div>
          <div className="mt-2 text-sm opacity-75">↑ 12 new this month</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Gift className="w-8 h-8 opacity-80" />
            <Star className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">{referrals.length}</div>
          <div className="text-sm opacity-90">Active Referrals</div>
          <div className="mt-2 text-sm opacity-75">${totalReferralValue} in conversions</div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Ticket className="w-8 h-8 opacity-80" />
            <Sparkles className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">{giftCards.length}</div>
          <div className="text-sm opacity-90">Active Gift Cards</div>
          <div className="mt-2 text-sm opacity-75">${totalGiftCardValue} balance</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Growth</h3>
          {mounted && (
          <div className="h-[250px]" style={{ minHeight: '250px' }}>
          <ChartContainer>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#ea580c" fillOpacity={1} fill="url(#revenueGradient)" />
            </AreaChart>
          </ChartContainer>
          </div>
          )}
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Subscription Distribution</h3>
          <div className="flex items-center justify-between">
            {mounted && (
            <div className="h-[200px] w-1/2" style={{ minHeight: '200px' }}>
            <ChartContainer>
              <PieChart>
                <Pie
                  data={subscriptionBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subscriptionBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ChartContainer>
            </div>
            )}
            <div className="space-y-3">
              {subscriptionBreakdown.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <div>
                    <div className="text-sm text-white font-medium">{item.name}</div>
                    <div className="text-sm text-gray-400">{item.value} active</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={() => window.location.hash = '#subscription-plans'}
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] border border-orange-600/20 rounded-lg transition"
          >
            <div className="p-2 bg-white/10 rounded-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">Manage Plans</div>
              <div className="text-sm text-orange-100">Create & edit plans</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('customer-subs');
              setShowAddModal(true);
            }}
            className="flex items-center gap-3 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 rounded-lg transition"
          >
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">Add Customer Plan</div>
              <div className="text-sm text-gray-400">Create maintenance plan</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('gift-cards');
              setShowAddModal(true);
            }}
            className="flex items-center gap-3 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 rounded-lg transition"
          >
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">Issue Gift Card</div>
              <div className="text-sm text-gray-400">Create gift card/hours</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('hour-banking')}
            className="flex items-center gap-3 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 rounded-lg transition"
          >
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">Manage Hours</div>
              <div className="text-sm text-gray-400">Rollover & gifting</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center gap-3 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-gray-700 rounded-lg transition"
          >
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">View Analytics</div>
              <div className="text-sm text-gray-400">Performance metrics</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="text-sm text-white font-medium">New subscription activated</div>
                <div className="text-sm text-gray-400">Sarah Johnson - Premium Plan</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">2 hours ago</div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Gift className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-white font-medium">Gift card redeemed</div>
                <div className="text-sm text-gray-400">10 hours - GIFT-HOURS-XYZ789</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">5 hours ago</div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Star className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-white font-medium">Referral completed</div>
                <div className="text-sm text-gray-400">Elite Plumbing → Quick Fix HVAC</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">1 day ago</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubscriptionList = (type: string) => {
    const filteredSubs = subscriptions.filter(sub => {
      if (sub.type !== type) return false;
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (searchQuery && !sub.stakeholderName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add Subscription
          </button>
        </div>

        {/* Subscription Cards */}
        <div className="space-y-3">
          {filteredSubs.map((sub) => (
            <div key={sub.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#ea580c]/10 rounded-lg">
                    <Crown className="w-6 h-6 text-[#ea580c]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{sub.stakeholderName}</h3>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                        sub.status === 'active' ? 'bg-green-500/10 text-green-400' :
                        sub.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                        sub.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {sub.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">{sub.stakeholderEmail}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {sub.plan}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {sub.billingCycle}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ${sub.amount}/{sub.billingCycle === 'monthly' ? 'mo' : sub.billingCycle === 'quarterly' ? 'qtr' : 'yr'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white mb-1">${sub.amount}</div>
                  <div className="text-sm text-gray-500">per {sub.billingCycle.replace('ly', '')}</div>
                </div>
              </div>

              {/* Hours tracking (for customer subscriptions) */}
              {sub.hoursIncluded !== undefined && (
                <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-[#2a2a2a] rounded-lg">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Hours Included</div>
                    <div className="text-lg font-semibold text-white">{sub.hoursIncluded}h</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Hours Used</div>
                    <div className="text-lg font-semibold text-orange-400">{sub.hoursUsed}h</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Hours Rollover</div>
                    <div className="text-lg font-semibold text-blue-400">{sub.hoursRollover}h</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Hours Gifted</div>
                    <div className="text-lg font-semibold text-purple-400">{sub.hoursGifted}h</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Renews: {new Date(sub.renewalDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    {sub.autoRenew ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Auto-renew ON</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">Auto-renew OFF</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-4 h-4" />
                    {sub.paymentMethod}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sub.type === 'vendor' && (
                    <button
                      onClick={() => {
                        setSelectedVendorId(sub.id);
                        setShowVendorAdvertising(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                      <Megaphone className="w-4 h-4" />
                      Manage Advertising
                    </button>
                  )}
                  {sub.hoursIncluded && sub.hoursIncluded > 0 && (
                    <button
                      onClick={() => openTransferModal(sub)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Transfer Hours
                    </button>
                  )}
                  <button
                    onClick={() => openPaymentPage(sub)}
                    className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Now
                  </button>
                  <button
                    onClick={() => setSelectedItem(sub)}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => openEditModal(sub)}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => toast.success('Subscription paused')}
                    className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"
                  >
                    <PauseCircle className="w-4 h-4 text-yellow-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredSubs.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-gray-400">No subscriptions found</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReferrals = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg flex items-center gap-2 transition">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl p-6 text-white shadow-lg shadow-[#ea580c]/20">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8 opacity-80" />
            <ArrowUpRight className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">{referrals.length}</div>
          <div className="text-sm opacity-90">Total Referrals</div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg shadow-green-600/20">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">${totalReferralValue}</div>
          <div className="text-sm opacity-90">Conversion Value</div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-6 text-white shadow-lg shadow-amber-600/20">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 opacity-80" />
            <Sparkles className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">${referrals.reduce((sum, r) => sum + r.rewardAmount, 0)}</div>
          <div className="text-sm opacity-90">Rewards Pending</div>
        </div>
      </div>

      <div className="space-y-3">
        {referrals.map((ref) => (
          <div key={ref.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c]/50 transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#ea580c]/10 rounded-lg border border-[#ea580c]/20">
                  <Share2 className="w-6 h-6 text-[#ea580c]" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">Referral #{ref.id}</h3>
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      ref.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      ref.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {ref.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <span className="text-white font-medium">{ref.referrerName}</span>
                    <span className="text-gray-500">({ref.referrerType})</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-white font-medium">{ref.referredName}</span>
                    <span className="text-gray-500">({ref.referredType})</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Referred: {new Date(ref.dateReferred).toLocaleDateString()}
                    {ref.dateCompleted && ` • Completed: ${new Date(ref.dateCompleted).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#ea580c] mb-1">${ref.rewardAmount}</div>
                <div className="text-sm text-gray-500">Reward</div>
                {ref.conversionValue && (
                  <div className="text-sm text-gray-400 mt-1">${ref.conversionValue} value</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-[#2A2A2A]">
              {ref.status === 'completed' && (
                <button
                  onClick={() => toast.success('Reward payment processed')}
                  className="px-4 py-2 bg-[#ea580c]/10 hover:bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/20 rounded-lg flex items-center gap-2 transition"
                >
                  <DollarSign className="w-4 h-4" />
                  Process Payment
                </button>
              )}
              <button className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg flex items-center gap-2 transition">
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGiftCards = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gift cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]"
            />
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Issue Gift Card
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl p-6 text-white shadow-lg shadow-[#ea580c]/20">
          <Gift className="w-8 h-8 opacity-80 mb-2" />
          <div className="text-3xl font-bold mb-1">{giftCards.filter(gc => gc.type === 'dollar').length}</div>
          <div className="text-sm opacity-90">Dollar Gift Cards</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg shadow-purple-600/20">
          <Clock className="w-8 h-8 opacity-80 mb-2" />
          <div className="text-3xl font-bold mb-1">{giftCards.filter(gc => gc.type === 'hours').length}</div>
          <div className="text-sm opacity-90">Hour Gift Cards</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg shadow-blue-600/20">
          <Crown className="w-8 h-8 opacity-80 mb-2" />
          <div className="text-3xl font-bold mb-1">{giftCards.filter(gc => gc.type === 'subscription').length}</div>
          <div className="text-sm opacity-90">Subscription Gifts</div>
        </div>
      </div>

      <div className="space-y-3">
        {giftCards.map((gc) => (
          <div key={gc.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c]/50 transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg border ${
                  gc.type === 'dollar' ? 'bg-[#ea580c]/10 border-[#ea580c]/20' :
                  gc.type === 'hours' ? 'bg-purple-500/10 border-purple-500/20' :
                  'bg-blue-500/10 border-blue-500/20'
                }`}>
                  {gc.type === 'dollar' ? <DollarSign className="w-6 h-6 text-[#ea580c]" /> :
                   gc.type === 'hours' ? <Clock className="w-6 h-6 text-purple-400" /> :
                   <Crown className="w-6 h-6 text-blue-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{gc.code}</h3>
                    <span className={`px-2 py-1 rounded-full text-sm font-medium border ${
                      gc.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      gc.status === 'redeemed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {gc.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    Type: <span className="text-white font-medium capitalize">{gc.type}</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    Purchased by: <span className="text-white font-medium">{gc.purchasedBy}</span>
                  </div>
                  {gc.recipientName && (
                    <div className="text-sm text-gray-400 mb-1">
                      Recipient: <span className="text-white font-medium">{gc.recipientName}</span> ({gc.recipientEmail})
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mt-2">
                    Purchased: {new Date(gc.purchaseDate).toLocaleDateString()} • 
                    Expires: {new Date(gc.expiryDate).toLocaleDateString()}
                    {gc.redeemedDate && ` • Redeemed: ${new Date(gc.redeemedDate).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Balance</div>
                <div className="text-2xl font-bold text-[#ea580c] mb-1">
                  {gc.type === 'dollar' ? `$${gc.balance}` : 
                   gc.type === 'hours' ? `${gc.balance}h` : 
                   `$${gc.balance}`}
                </div>
                <div className="text-sm text-gray-500">
                  of {gc.type === 'dollar' ? `$${gc.value}` : gc.type === 'hours' ? `${gc.value}h` : `$${gc.value}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gc.code);
                  toast.success('Code copied to clipboard');
                }}
                className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg flex items-center gap-2 transition"
              >
                <Copy className="w-4 h-4" />
                Copy Code
              </button>
              <button className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg flex items-center gap-2 transition">
                <Send className="w-4 h-4" />
                Resend Email
              </button>
              <button className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg flex items-center gap-2 transition">
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHourBanking = () => {
    const hourBankingData = subscriptions
      .filter(sub => sub.hoursIncluded !== undefined)
      .map(sub => ({
        ...sub,
        hoursRemaining: (sub.hoursIncluded || 0) - (sub.hoursUsed || 0) + (sub.hoursRollover || 0) + (sub.hoursGifted || 0)
      }));

    const totalHoursIncluded = hourBankingData.reduce((sum, sub) => sum + (sub.hoursIncluded || 0), 0);
    const totalHoursUsed = hourBankingData.reduce((sum, sub) => sum + (sub.hoursUsed || 0), 0);
    const totalHoursRollover = hourBankingData.reduce((sum, sub) => sum + (sub.hoursRollover || 0), 0);
    const totalHoursGifted = hourBankingData.reduce((sum, sub) => sum + (sub.hoursGifted || 0), 0);
    const totalHoursRemaining = hourBankingData.reduce((sum, sub) => sum + sub.hoursRemaining, 0);

    return (
      <div className="space-y-6">
        {/* Hour Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl p-6 text-white shadow-lg shadow-[#ea580c]/20">
            <Clock className="w-8 h-8 opacity-80 mb-2" />
            <div className="text-3xl font-bold mb-1">{totalHoursIncluded}h</div>
            <div className="text-sm opacity-90">Total Included</div>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-6 text-white shadow-lg shadow-amber-600/20">
            <Activity className="w-8 h-8 opacity-80 mb-2" />
            <div className="text-3xl font-bold mb-1">{totalHoursUsed}h</div>
            <div className="text-sm opacity-90">Hours Used</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg shadow-purple-600/20">
            <RefreshCw className="w-8 h-8 opacity-80 mb-2" />
            <div className="text-3xl font-bold mb-1">{totalHoursRollover}h</div>
            <div className="text-sm opacity-90">Rollover Hours</div>
          </div>

          <div className="bg-gradient-to-br from-pink-600 to-pink-700 rounded-xl p-6 text-white shadow-lg shadow-pink-600/20">
            <Gift className="w-8 h-8 opacity-80 mb-2" />
            <div className="text-3xl font-bold mb-1">{totalHoursGifted}h</div>
            <div className="text-sm opacity-90">Gifted Hours</div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg shadow-green-600/20">
            <CheckCircle className="w-8 h-8 opacity-80 mb-2" />
            <div className="text-3xl font-bold mb-1">{totalHoursRemaining}h</div>
            <div className="text-sm opacity-90">Total Available</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Hour Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => openGiftModal()}
              className="flex items-center gap-3 p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg transition"
            >
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Gift className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">Gift Hours to Customer</div>
                <div className="text-sm text-gray-400">Owner giveaway</div>
              </div>
            </button>

            <button
              onClick={handleProcessRollovers}
              className="flex items-center gap-3 p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg transition"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">Process Rollovers</div>
                <div className="text-sm text-gray-400">End-of-month automation</div>
              </div>
            </button>

            <button
              onClick={() => toast.success('Promotional hours modal opened')}
              className="flex items-center gap-3 p-4 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg transition"
            >
              <div className="p-2 bg-[#ea580c]/10 rounded-lg border border-[#ea580c]/20">
                <Sparkles className="w-5 h-5 text-[#ea580c]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">Advertiser Promo Hours</div>
                <div className="text-sm text-gray-400">Partner giveaways</div>
              </div>
            </button>
          </div>
        </div>

        {/* Pending Gift Hours Approvals */}
        {giftRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#c2410c]/10 border border-[#ea580c]/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#ea580c]/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-[#ea580c]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Pending Gift Hours Approvals</h3>
                <p className="text-sm text-gray-400">
                  {giftRequests.filter(r => r.status === 'pending').length} request{giftRequests.filter(r => r.status === 'pending').length !== 1 ? 's' : ''} awaiting owner approval
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {giftRequests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.id} className="bg-[#1A1A1A] border border-[#ea580c]/20 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-white font-medium">{request.customerName}</div>
                        {request.urgency === 'urgent' && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-sm font-medium rounded-full border border-red-500/30">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mb-2">{request.customerEmail}</div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Requested by {request.requestedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[#ea580c]">{request.hours}h</div>
                      <div className="text-sm text-gray-500">to gift</div>
                    </div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3 mb-3">
                    <div className="text-sm text-gray-500 mb-1">Reason:</div>
                    <div className="text-sm text-gray-300">{request.reason}</div>
                  </div>
                  {userRole === 'owner' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveGiftRequest(request.id)}
                        className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve & Gift
                      </button>
                      <button
                        onClick={() => handleRejectGiftRequest(request.id)}
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                  {userRole !== 'owner' && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      ⏳ Waiting for owner approval
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Hour Details */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Customer Hour Banking</h3>
          <div className="space-y-3">
            {hourBankingData.map((sub) => (
              <div key={sub.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-medium">{sub.stakeholderName}</div>
                    <div className="text-sm text-gray-400">{sub.plan}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#ea580c]">{sub.hoursRemaining}h</div>
                    <div className="text-sm text-gray-500">Available</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Included</div>
                    <div className="text-lg font-semibold text-blue-400">{sub.hoursIncluded}h</div>
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Used</div>
                    <div className="text-lg font-semibold text-[#ea580c]">{sub.hoursUsed}h</div>
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Rollover</div>
                    <div className="text-lg font-semibold text-purple-400">{sub.hoursRollover}h</div>
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Gifted</div>
                    <div className="text-lg font-semibold text-pink-400">{sub.hoursGifted}h</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => openGiftModal(sub)}
                    className="flex-1 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-sm transition"
                  >
                    <Gift className="w-4 h-4 inline mr-1" />
                    Gift Hours
                  </button>
                  <button
                    onClick={() => toast.success('Adjust rollover for ' + sub.stakeholderName)}
                    className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-sm transition"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-1" />
                    Adjust Rollover
                  </button>
                  <button className="flex-1 px-3 py-2 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 rounded-lg text-sm transition">
                    <History className="w-4 h-4 inline mr-1" />
                    View History
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Type */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue by Subscription Type</h3>
          {mounted && (
          <div className="h-[250px]" style={{ minHeight: '250px' }}>
          <ChartContainer>
            <BarChart data={[
              { type: 'Customer', revenue: 12450 },
              { type: 'Subcontractor', revenue: 2178 },
              { type: 'Vendor', revenue: 1200 },
              { type: 'Advertiser', revenue: 750 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="type" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="revenue" fill="#ea580c" />
            </BarChart>
          </ChartContainer>
          </div>
          )}
        </div>

        {/* Subscription Growth */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Subscription Growth</h3>
          {mounted && (
          <div className="h-[250px]" style={{ minHeight: '250px' }}>
          <ChartContainer>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="subscriptions" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
          </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-2">Churn Rate</div>
            <div className="text-3xl font-bold text-green-400 mb-1">2.3%</div>
            <div className="text-sm text-gray-500">↓ 0.8% from last month</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2">Average Revenue Per User</div>
            <div className="text-3xl font-bold text-blue-400 mb-1">$187</div>
            <div className="text-sm text-gray-500">↑ $12 from last month</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-2">Customer Lifetime Value</div>
            <div className="text-3xl font-bold text-purple-400 mb-1">$2,244</div>
            <div className="text-sm text-gray-500">↑ $156 from last month</div>
          </div>
        </div>
      </div>

      {/* Top Plans */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Performing Plans</h3>
        <div className="space-y-3">
          {[
            { plan: 'Premium Maintenance Plan', subscribers: 28, revenue: 8372, growth: 15 },
            { plan: 'Basic Maintenance Plan', subscribers: 42, revenue: 6258, growth: 8 },
            { plan: 'Pro Subcontractor Plan', subscribers: 22, revenue: 2178, growth: 12 },
            { plan: 'Featured Vendor Directory', subscribers: 18, revenue: 1800, growth: 5 }
          ].map((plan, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-gray-600">#{index + 1}</div>
                <div>
                  <div className="text-white font-medium">{plan.plan}</div>
                  <div className="text-sm text-gray-400">{plan.subscribers} subscribers</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">${plan.revenue.toLocaleString()}</div>
                <div className="text-sm text-green-400">↑ {plan.growth}% growth</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <PageHeader 
        title="Subscription Hub"
        description="Central control for all subscriptions, referrals & gift cards"
        onBack={() => window.location.href = '/unified-dashboard'}
      />

      <div className="max-w-[1800px] mx-auto px-6 py-4">
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mb-4">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-lg flex items-center gap-2 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setShowPaymentDashboard(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg flex items-center gap-2 transition font-medium"
          >
            <DollarSign className="w-4 h-4" />
            Payment Tracking
          </button>
          <button className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-lg flex items-center gap-2 transition">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'customer-subs', label: 'Customer Plans', icon: Users },
            { id: 'subcontractor-subs', label: 'Subcontractors', icon: Wrench },
            { id: 'vendor-subs', label: 'Vendors', icon: Store },
            { id: 'advertiser-subs', label: 'Advertisers', icon: Megaphone },
            { id: 'referrals', label: 'Referrals', icon: Star },
            { id: 'gift-cards', label: 'Gift Cards', icon: Gift },
            { id: 'hour-banking', label: 'Hour Banking', icon: Clock },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabView)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[#ea580c] text-white'
                  : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'customer-subs' && renderSubscriptionList('customer')}
          {activeTab === 'subcontractor-subs' && renderSubscriptionList('subcontractor')}
          {activeTab === 'vendor-subs' && renderSubscriptionList('vendor')}
          {activeTab === 'advertiser-subs' && renderSubscriptionList('advertiser')}
          {activeTab === 'referrals' && renderReferrals()}
          {activeTab === 'gift-cards' && renderGiftCards()}
          {activeTab === 'hour-banking' && renderHourBanking()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      </div>

      {/* Gift Hours Modal */}
      <GiftHoursModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        subscription={giftTargetSub}
        onSuccess={loadData}
        userRole={userRole}
        userName={userName}
      />

      {/* Edit Subscription Modal */}
      {editTargetSub && (
        <EditSubscriptionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          subscription={editTargetSub}
          onSuccess={loadData}
        />
      )}

      {/* Subscription Payment Dashboard */}
      <SubscriptionPaymentDashboard
        isOpen={showPaymentDashboard}
        onClose={() => setShowPaymentDashboard(false)}
      />

      {/* Subscription Payment Page */}
      {paymentTargetSub && (
        <SubscriptionPaymentPage
          isOpen={showPaymentPage}
          onClose={() => setShowPaymentPage(false)}
          subscription={{
            id: paymentTargetSub.id,
            name: paymentTargetSub.stakeholderName,
            plan: paymentTargetSub.plan,
            type: paymentTargetSub.type,
            amount: paymentTargetSub.amount,
            billingCycle: paymentTargetSub.billingCycle,
            status: paymentTargetSub.status,
            nextBillingDate: paymentTargetSub.renewalDate,
            hoursIncluded: paymentTargetSub.hoursIncluded,
            hoursUsed: paymentTargetSub.hoursUsed,
            hoursRemaining: (paymentTargetSub.hoursIncluded || 0) - (paymentTargetSub.hoursUsed || 0)
          }}
          onPaymentSuccess={loadData}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SubscriptionHubSettings
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Hour Transfer Modal */}
      {transferSourceSub && (
        <HourTransferModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setTransferSourceSub(null);
          }}
          sourceSubscription={transferSourceSub}
          onSuccess={loadData}
        />
      )}

      {/* Vendor Advertising Management Modal */}
      {showVendorAdvertising && selectedVendorId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <VendorAdvertisingManagement
              vendorId={selectedVendorId}
              onClose={() => {
                setShowVendorAdvertising(false);
                setSelectedVendorId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
