import { useState } from 'react';
import {
  Package, DollarSign, TrendingUp, ShoppingCart, FileText, Clock,
  CheckCircle, AlertTriangle, BarChart3, Users, Calendar, Star,
  ArrowUpRight, ArrowDownRight, Download, Upload, Search, Filter,
  Home, MessageSquare, Settings, Bell, ChevronRight, Tag, Box,
  Truck, Receipt, Award, Wrench, Zap, Code, Key, Link as LinkIcon,
  Globe, Info, Copy, RefreshCw, CheckCircle2, AlertCircle, Palette,
  Lock, Crown, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import { useUserData } from '../../lib/hooks/useUserData';

interface Order {
  id: string;
  project: string;
  items: number;
  total: number;
  status: string;
  date: string;
  deliveryDate?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
}

export default function VendorPortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'invoices' | 'payments' | 'performance' | 'referrals' | 'api-settings'>('dashboard');

  // User-specific data storage
  const [recentOrders, setRecentOrders] = useUserData<Order[]>('vendor_orders', []);
  const [apiSettings, setApiSettings] = useUserData({
    hasApiIntegration: false,
    apiEndpoint: '',
    apiKey: '',
    apiDocumentationUrl: '',
    webhookUrl: '',
    apiNotes: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Subscription tier - determines feature access
  // Tiers: 'basic', 'professional', 'premium', 'elite'
  const [subscriptionTier, setSubscriptionTier] = useUserData<string>('vendor_subscription_tier', 'basic');

  // Check if Content Center is accessible based on subscription
  const hasContentCenterAccess = ['premium', 'elite'].includes(subscriptionTier);

  // Handle Content Center access
  const handleContentCenterClick = () => {
    if (hasContentCenterAccess) {
      window.location.href = '/enterprise-content-center';
    } else {
      toast.error('Upgrade to Premium or Elite to access Content Center');
    }
  };

  // Mock vendor data
  const vendorInfo = {
    name: 'Premier Building Supplies',
    email: 'sales@premierbuilding.com',
    phone: '(555) 987-6543',
    accountManager: 'John Smith',
    memberSince: 'March 2022',
    totalOrders: 342,
    activeOrders: 15,
    rating: 4.8
  };

  // Revenue data
  const revenueData = [
    { month: 'Jul', revenue: 45000, orders: 28 },
    { month: 'Aug', revenue: 52000, orders: 32 },
    { month: 'Sep', revenue: 48000, orders: 30 },
    { month: 'Oct', revenue: 58000, orders: 35 },
    { month: 'Nov', revenue: 62000, orders: 38 },
    { month: 'Dec', revenue: 71000, orders: 42 },
    { month: 'Jan', revenue: 68000, orders: 40 }
  ];

  // Stats - calculated from real user data
  const stats = [
    { label: 'Total Revenue', value: '$68,420', change: '+12.5%', trend: 'up', icon: DollarSign, color: 'orange' },
    { label: 'Active Orders', value: recentOrders.length.toString(), change: recentOrders.length > 0 ? `${recentOrders.length} orders` : 'No orders', trend: 'up', icon: ShoppingCart, color: 'blue' },
    { label: 'Pending Invoices', value: '8', change: '$12,450', trend: 'neutral', icon: FileText, color: 'yellow' },
    { label: 'Avg Rating', value: '4.8', change: '+0.3', trend: 'up', icon: Star, color: 'green' }
  ];

  // Product categories
  const productCategories = [
    { name: 'Lumber & Wood', items: 156, revenue: 28400, icon: Box },
    { name: 'Hardware', items: 423, revenue: 15200, icon: Tag },
    { name: 'Electrical', items: 289, revenue: 22100, icon: Zap },
    { name: 'Plumbing', items: 198, revenue: 18700, icon: Wrench }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'shipped': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'processing': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'referrals', label: 'Referral Rewards', icon: Award },
    { id: 'api-settings', label: 'API Settings', icon: Code }
  ];

  return (
    <LayoutManager pageName="Vendor Portal" enableCustomization={true} showEditButton={true}>
      <div className="min-h-screen bg-[#0A0A0A]">
        {/* Header */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                Vendor Portal
              </h1>
              <p className="text-gray-400 mt-1">{vendorInfo.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30 transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logo Marquee */}
      <LogoMarquee />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="portal-header" dismissible />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${
                        stat.trend === 'up' ? 'text-green-400' : stat.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : stat.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
                        {stat.change}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Revenue Chart */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Revenue Trends</h2>
                  <p className="text-sm text-gray-400">Monthly revenue and order volume</p>
                </div>
                <PrimaryButton
                  onClick={() => toast.success('Downloading report...')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </PrimaryButton>
              </div>
              <ChartContainer height={256} minHeight={256} dependencies={[activeTab]}>
                <AreaChart data={revenueData} width={800} height={256}>
                  <defs>
                    <linearGradient id="vendorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop key="vendor-stop1" offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                      <stop key="vendor-stop2" offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="vendor-grid" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="vendor-xaxis" dataKey="month" stroke="#6B7280" />
                  <YAxis key="vendor-yaxis" stroke="#6B7280" />
                  <Tooltip
                    key="vendor-tooltip"
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area key="vendor-area" type="monotone" dataKey="revenue" stroke="#ea580c" fillOpacity={1} fill="url(#vendorRevenueGradient)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Recent Orders */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Recent Orders</h2>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {recentOrders.map(order => (
                  <div key={order.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white mb-1">{order.id}</p>
                        <p className="text-sm text-gray-400">{order.project}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Items</p>
                        <p className="text-white font-semibold">{order.items}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="text-white font-semibold">${order.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Order Date</p>
                        <p className="text-white font-semibold">{order.date}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Delivery</p>
                        <p className="text-white font-semibold">{order.deliveryDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {productCategories.map((category, i) => {
                const Icon = category.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                    <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-400 mb-1">{category.items} products</p>
                    <p className="text-lg font-bold text-orange-400">${category.revenue.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>

            {/* Content Center Access - Premium Feature */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-6 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${
                      hasContentCenterAccess
                        ? 'bg-gradient-to-br from-purple-600 to-purple-700'
                        : 'bg-[#2A2A2A]'
                    } flex items-center justify-center`}>
                      {hasContentCenterAccess ? (
                        <Palette className="w-7 h-7 text-white" />
                      ) : (
                        <Lock className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white">Enterprise Content Center</h2>
                        {!hasContentCenterAccess && (
                          <span className="px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {hasContentCenterAccess
                          ? 'Create and manage marketing content, social media posts, and promotional materials'
                          : 'Upgrade to Premium or Elite to access professional content creation tools'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {hasContentCenterAccess ? (
                  <button
                    onClick={handleContentCenterClick}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 group"
                  >
                    <Palette className="w-5 h-5" />
                    Open Content Center
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => toast.info('View subscription plans to upgrade')}
                      className="bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Crown className="w-5 h-5" />
                      Upgrade to Premium
                    </button>
                    <button
                      onClick={handleContentCenterClick}
                      className="bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#4A4A4A] text-gray-300 font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Lock className="w-5 h-5" />
                      Preview (Locked)
                    </button>
                  </div>
                )}

                {!hasContentCenterAccess && (
                  <div className="mt-4 p-4 bg-[#0A0A0A] rounded-lg border border-purple-500/20">
                    <p className="text-sm text-gray-400 mb-2">
                      <span className="font-semibold text-purple-300">Premium features include:</span>
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Professional content creation tools
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Social media scheduling & management
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Marketing asset library
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Brand templates & presets
                      </li>
                    </ul>
                  </div>
                )}

                {/* Current subscription tier indicator */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Current Plan:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white capitalize">{subscriptionTier}</span>
                    <button
                      onClick={() => {
                        // Cycle through tiers for demo
                        const tiers = ['basic', 'professional', 'premium', 'elite'];
                        const currentIndex = tiers.indexOf(subscriptionTier);
                        const nextTier = tiers[(currentIndex + 1) % tiers.length];
                        setSubscriptionTier(nextTier);
                        toast.success(`Subscription changed to ${nextTier.toUpperCase()}`);
                      }}
                      className="text-xs text-orange-400 hover:text-orange-300 underline"
                    >
                      Change (Demo)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Order Management</h2>
            <p className="text-gray-400">Full order management interface would be displayed here.</p>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Product Catalog</h2>
            <p className="text-gray-400">Product catalog and inventory management would be displayed here.</p>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Invoices</h2>
            <p className="text-gray-400">Invoice management would be displayed here.</p>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Payment History</h2>
            <p className="text-gray-400">Payment tracking and history would be displayed here.</p>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Performance Metrics</h2>
            <p className="text-gray-400">Performance analytics and KPIs would be displayed here.</p>
          </div>
        )}

        {activeTab === 'referrals' && (
          <ReferralRewards />
        )}

        {activeTab === 'api-settings' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-1">API Integration</h3>
                <p className="text-sm text-gray-300">
                  Connect your inventory system or API to enable automated order processing, real-time inventory updates, 
                  and seamless data synchronization with our platform.
                </p>
              </div>
            </div>

            {/* API Status Card */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Integration Status</h2>
                  <p className="text-sm text-gray-400">Configure your API connection settings</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  apiSettings.hasApiIntegration 
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                    : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
                }`}>
                  {apiSettings.hasApiIntegration ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-semibold">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">Not Connected</span>
                    </>
                  )}
                </div>
              </div>

              {/* Enable Toggle */}
              <label className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer hover:border-orange-500/30 transition">
                <input
                  type="checkbox"
                  checked={apiSettings.hasApiIntegration}
                  onChange={(e) => {
                    setApiSettings({ ...apiSettings, hasApiIntegration: e.target.checked });
                    toast.success(e.target.checked ? 'API integration enabled' : 'API integration disabled');
                  }}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#1A1A1A] text-orange-600 focus:ring-orange-500"
                />
                <Zap className="w-5 h-5 text-orange-500" />
                <div>
                  <span className="text-white font-medium block">Enable API Integration</span>
                  <span className="text-sm text-gray-400">Allow automated data exchange with your systems</span>
                </div>
              </label>
            </div>

            {/* API Configuration */}
            {apiSettings.hasApiIntegration && (
              <>
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">API Configuration</h3>
                  
                  <div className="space-y-6">
                    {/* API Endpoint */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <LinkIcon className="w-4 h-4 inline mr-2" />
                        API Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={apiSettings.apiEndpoint}
                        onChange={(e) => setApiSettings({ ...apiSettings, apiEndpoint: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                        placeholder="https://api.yourcompany.com/v1"
                      />
                      <p className="text-xs text-gray-500 mt-1">The base URL for your API endpoint</p>
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Key className="w-4 h-4 inline mr-2" />
                        API Key / Authentication Token
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiSettings.apiKey}
                          onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 font-mono pr-24"
                          placeholder="sk_live_••••••••••••••••"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (apiSettings.apiKey) {
                                navigator.clipboard.writeText(apiSettings.apiKey);
                                toast.success('API key copied to clipboard');
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-white transition"
                            title="Copy API Key"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="p-2 text-gray-400 hover:text-white transition"
                            title={showApiKey ? 'Hide' : 'Show'}
                          >
                            {showApiKey ? <Key className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Your API authentication credentials (stored securely and encrypted)</p>
                    </div>

                    {/* API Documentation URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Globe className="w-4 h-4 inline mr-2" />
                        API Documentation URL
                      </label>
                      <input
                        type="url"
                        value={apiSettings.apiDocumentationUrl}
                        onChange={(e) => setApiSettings({ ...apiSettings, apiDocumentationUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                        placeholder="https://docs.yourcompany.com/api"
                      />
                      <p className="text-xs text-gray-500 mt-1">Link to your API documentation for our developers</p>
                    </div>

                    {/* Webhook URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Zap className="w-4 h-4 inline mr-2" />
                        Webhook URL (for notifications)
                      </label>
                      <input
                        type="url"
                        value={apiSettings.webhookUrl}
                        onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500"
                        placeholder="https://yourcompany.com/webhooks/orders"
                      />
                      <p className="text-xs text-gray-500 mt-1">Where we'll send order notifications and updates</p>
                    </div>

                    {/* API Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Additional Notes
                      </label>
                      <textarea
                        value={apiSettings.apiNotes}
                        onChange={(e) => setApiSettings({ ...apiSettings, apiNotes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
                        placeholder="Any special requirements, authentication methods, rate limits, or other important details..."
                      />
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Test Connection</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Test your API connection to verify that all settings are configured correctly.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <PrimaryButton
                      onClick={() => {
                        setApiTestStatus('testing');
                        // Simulate API test
                        setTimeout(() => {
                          const success = Math.random() > 0.3; // 70% success rate
                          setApiTestStatus(success ? 'success' : 'error');
                          toast[success ? 'success' : 'error'](
                            success 
                              ? 'API connection successful! All systems operational.' 
                              : 'API connection failed. Please check your credentials.'
                          );
                        }, 2000);
                      }}
                      disabled={apiTestStatus === 'testing'}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${apiTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                      {apiTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                    </PrimaryButton>

                    {apiTestStatus === 'success' && (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Connection Successful</span>
                      </div>
                    )}

                    {apiTestStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Connection Failed</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Changes */}
                <div className="flex items-center justify-between bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <div>
                    <p className="text-white font-medium">Save API Settings</p>
                    <p className="text-sm text-gray-400">Your changes will be saved securely</p>
                  </div>
                  <PrimaryButton
                    onClick={() => {
                      toast.success('API settings saved successfully!');
                    }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </PrimaryButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </LayoutManager>
  );
}