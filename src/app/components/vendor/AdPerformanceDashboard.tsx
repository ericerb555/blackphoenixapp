/**
 * Ad Performance Dashboard - Complete Ad Tracking System
 * 
 * Tracks the complete customer journey:
 * Impressions → Clicks → Product Views → Add to Cart → Work Order Requests → Completed Work Orders → Revenue
 * 
 * Features:
 * - Real-time performance metrics
 * - Conversion funnel visualization
 * - Individual ad campaign tracking
 * - Work order attribution
 * - ROI and revenue tracking
 * - Date range filtering
 * - Export reports
 * - Deep orange dark theme (#ea580c, #0A0A0A backgrounds)
 * 
 * Access: Vendor portals only
 */

import { useState } from 'react';
import {
  TrendingUp, Eye, MousePointer, ShoppingCart, Wrench, DollarSign, Target,
  Calendar, Download, RefreshCw, ArrowUp, ArrowDown, Activity, Zap,
  CheckCircle, Clock, AlertCircle, BarChart3, PieChart, LineChart as LineChartIcon,
  Filter, Search, ExternalLink, ChevronDown, ChevronUp, Users, Percent,
  TrendingDown, Award, Star, Package, Gift, Megaphone
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '../ChartContainer';
import { toast } from 'sonner@2.0.3';

interface AdCampaign {
  id: string;
  name: string;
  type: 'banner' | 'featured' | 'product' | 'giveaway' | 'promotion';
  status: 'active' | 'paused' | 'ended';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  productViews: number;
  addToCart: number;
  workOrderRequests: number;
  workOrdersCompleted: number;
  revenue: number;
}

interface PerformanceMetrics {
  totalImpressions: number;
  totalClicks: number;
  totalProductViews: number;
  totalAddToCarts: number;
  totalWorkOrderRequests: number;
  totalWorkOrdersCompleted: number;
  totalRevenue: number;
  totalSpend: number;
  ctr: number; // Click-through rate
  cvr: number; // Conversion rate (clicks to work orders)
  roi: number; // Return on investment
  avgRevenuePerWorkOrder: number;
  costPerClick: number;
  costPerWorkOrder: number;
}

export default function AdPerformanceDashboard() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'ended'>('all');

  // Generate unique ID for this component instance using useState for consistency
  const [chartId] = useState(() => `adperf-${Math.random().toString(36).substr(2, 9)}`);

  // Mock campaign data
  const campaigns: AdCampaign[] = [
    {
      id: 'AD-001',
      name: 'Premium Roofing Materials - Banner',
      type: 'banner',
      status: 'active',
      startDate: '2026-02-01',
      endDate: '2026-03-31',
      budget: 5000,
      spent: 2847,
      impressions: 45230,
      clicks: 1892,
      productViews: 1247,
      addToCart: 438,
      workOrderRequests: 127,
      workOrdersCompleted: 89,
      revenue: 134500
    },
    {
      id: 'AD-002',
      name: 'Kitchen Renovation Package - Featured',
      type: 'featured',
      status: 'active',
      startDate: '2026-01-15',
      endDate: '2026-04-15',
      budget: 8000,
      spent: 4521,
      impressions: 67890,
      clicks: 2845,
      productViews: 1989,
      addToCart: 723,
      workOrderRequests: 198,
      workOrdersCompleted: 142,
      revenue: 227600
    },
    {
      id: 'AD-003',
      name: 'Bathroom Fixtures Sale - Product',
      type: 'product',
      status: 'active',
      startDate: '2026-02-10',
      endDate: '2026-03-10',
      budget: 3000,
      spent: 1876,
      impressions: 28450,
      clicks: 1124,
      productViews: 876,
      addToCart: 287,
      workOrderRequests: 67,
      workOrdersCompleted: 52,
      revenue: 68900
    },
    {
      id: 'AD-004',
      name: 'Win $5K Renovation - Giveaway',
      type: 'giveaway',
      status: 'active',
      startDate: '2026-02-01',
      endDate: '2026-03-15',
      budget: 5000,
      spent: 3200,
      impressions: 89670,
      clicks: 4523,
      productViews: 2847,
      addToCart: 892,
      workOrderRequests: 234,
      workOrdersCompleted: 156,
      revenue: 198400
    },
    {
      id: 'AD-005',
      name: '20% Off All Materials - Promotion',
      type: 'promotion',
      status: 'paused',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      budget: 4000,
      spent: 3980,
      impressions: 52340,
      clicks: 2134,
      productViews: 1567,
      addToCart: 534,
      workOrderRequests: 145,
      workOrdersCompleted: 112,
      revenue: 156700
    }
  ];

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate overall metrics
  const calculateMetrics = (): PerformanceMetrics => {
    const activeCampaigns = filteredCampaigns;
    
    const totalImpressions = activeCampaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = activeCampaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalProductViews = activeCampaigns.reduce((sum, c) => sum + c.productViews, 0);
    const totalAddToCarts = activeCampaigns.reduce((sum, c) => sum + c.addToCart, 0);
    const totalWorkOrderRequests = activeCampaigns.reduce((sum, c) => sum + c.workOrderRequests, 0);
    const totalWorkOrdersCompleted = activeCampaigns.reduce((sum, c) => sum + c.workOrdersCompleted, 0);
    const totalRevenue = activeCampaigns.reduce((sum, c) => sum + c.revenue, 0);
    const totalSpend = activeCampaigns.reduce((sum, c) => sum + c.spent, 0);

    return {
      totalImpressions,
      totalClicks,
      totalProductViews,
      totalAddToCarts,
      totalWorkOrderRequests,
      totalWorkOrdersCompleted,
      totalRevenue,
      totalSpend,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cvr: totalClicks > 0 ? (totalWorkOrdersCompleted / totalClicks) * 100 : 0,
      roi: totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0,
      avgRevenuePerWorkOrder: totalWorkOrdersCompleted > 0 ? totalRevenue / totalWorkOrdersCompleted : 0,
      costPerClick: totalClicks > 0 ? totalSpend / totalClicks : 0,
      costPerWorkOrder: totalWorkOrdersCompleted > 0 ? totalSpend / totalWorkOrdersCompleted : 0
    };
  };

  const metrics = calculateMetrics();

  // Conversion funnel data
  const funnelData = [
    { id: 'funnel-1', stage: 'Impressions', value: metrics.totalImpressions, color: '#ea580c', percentage: 100 },
    { id: 'funnel-2', stage: 'Clicks', value: metrics.totalClicks, color: '#3b82f6', percentage: (metrics.totalClicks / metrics.totalImpressions) * 100 },
    { id: 'funnel-3', stage: 'Product Views', value: metrics.totalProductViews, color: '#8b5cf6', percentage: (metrics.totalProductViews / metrics.totalImpressions) * 100 },
    { id: 'funnel-4', stage: 'Add to Cart', value: metrics.totalAddToCarts, color: '#22c55e', percentage: (metrics.totalAddToCarts / metrics.totalImpressions) * 100 },
    { id: 'funnel-5', stage: 'Work Orders', value: metrics.totalWorkOrderRequests, color: '#f59e0b', percentage: (metrics.totalWorkOrderRequests / metrics.totalImpressions) * 100 },
    { id: 'funnel-6', stage: 'Completed', value: metrics.totalWorkOrdersCompleted, color: '#10b981', percentage: (metrics.totalWorkOrdersCompleted / metrics.totalImpressions) * 100 }
  ];

  // Performance over time data (last 30 days)
  const performanceTimeData = [
    { id: 'time-1', date: 'Feb 1', impressions: 6500, clicks: 280, workOrders: 42, revenue: 52000 },
    { id: 'time-2', date: 'Feb 5', impressions: 7200, clicks: 310, workOrders: 48, revenue: 61000 },
    { id: 'time-3', date: 'Feb 10', impressions: 8100, clicks: 345, workOrders: 54, revenue: 68000 },
    { id: 'time-4', date: 'Feb 15', impressions: 7800, clicks: 325, workOrders: 51, revenue: 64500 },
    { id: 'time-5', date: 'Feb 20', impressions: 8900, clicks: 380, workOrders: 62, revenue: 78000 },
    { id: 'time-6', date: 'Feb 25', impressions: 9400, clicks: 405, workOrders: 68, revenue: 86000 },
    { id: 'time-7', date: 'Mar 2', impressions: 10200, clicks: 445, workOrders: 74, revenue: 94000 }
  ];

  // Campaign type breakdown
  const campaignTypeData = [
    { id: 'type-banner', name: 'Banner', count: campaigns.filter(c => c.type === 'banner').length, revenue: campaigns.filter(c => c.type === 'banner').reduce((sum, c) => sum + c.revenue, 0), color: '#ea580c' },
    { id: 'type-featured', name: 'Featured', count: campaigns.filter(c => c.type === 'featured').length, revenue: campaigns.filter(c => c.type === 'featured').reduce((sum, c) => sum + c.revenue, 0), color: '#3b82f6' },
    { id: 'type-product', name: 'Product', count: campaigns.filter(c => c.type === 'product').length, revenue: campaigns.filter(c => c.type === 'product').reduce((sum, c) => sum + c.revenue, 0), color: '#8b5cf6' },
    { id: 'type-giveaway', name: 'Giveaway', count: campaigns.filter(c => c.type === 'giveaway').length, revenue: campaigns.filter(c => c.type === 'giveaway').reduce((sum, c) => sum + c.revenue, 0), color: '#22c55e' },
    { id: 'type-promotion', name: 'Promotion', count: campaigns.filter(c => c.type === 'promotion').length, revenue: campaigns.filter(c => c.type === 'promotion').reduce((sum, c) => sum + c.revenue, 0), color: '#f59e0b' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    toast.success('Performance data refreshed');
  };

  const handleExport = () => {
    const csvContent = [
      ['Campaign', 'Type', 'Status', 'Impressions', 'Clicks', 'CTR', 'Product Views', 'Add to Cart', 'Work Orders', 'Completed', 'Revenue', 'Spent', 'ROI'],
      ...filteredCampaigns.map(c => [
        c.name,
        c.type,
        c.status,
        c.impressions,
        c.clicks,
        `${((c.clicks / c.impressions) * 100).toFixed(2)}%`,
        c.productViews,
        c.addToCart,
        c.workOrderRequests,
        c.workOrdersCompleted,
        `$${c.revenue.toLocaleString()}`,
        `$${c.spent.toLocaleString()}`,
        `${(((c.revenue - c.spent) / c.spent) * 100).toFixed(1)}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Performance report exported');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-500/20' };
      case 'paused': return { bg: 'bg-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-500/20' };
      case 'ended': return { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-500/20' };
      default: return { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-500/20' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'banner': return <Megaphone className="w-4 h-4" />;
      case 'featured': return <Star className="w-4 h-4" />;
      case 'product': return <Package className="w-4 h-4" />;
      case 'giveaway': return <Gift className="w-4 h-4" />;
      case 'promotion': return <Percent className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-orange-400" />
            Ad Performance Dashboard
          </h1>
          <p className="text-gray-400">Track your advertising campaigns from impression to completed work order</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl transition"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-white font-semibold transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <Eye className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">CTR</p>
              <p className="text-sm font-bold text-white">{metrics.ctr.toFixed(2)}%</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Impressions</p>
          <p className="text-2xl font-bold text-white">{metrics.totalImpressions.toLocaleString()}</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-blue-500/30 transition group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <MousePointer className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">Avg CPC</p>
              <p className="text-sm font-bold text-white">${metrics.costPerClick.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Clicks</p>
          <p className="text-2xl font-bold text-white">{metrics.totalClicks.toLocaleString()}</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-green-500/30 transition group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-600/20 border border-green-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <Wrench className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">CVR</p>
              <p className="text-sm font-bold text-white">{metrics.cvr.toFixed(2)}%</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Work Orders</p>
          <p className="text-2xl font-bold text-white">{metrics.totalWorkOrdersCompleted}</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-purple-500/30 transition group">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">ROI</p>
              <p className="text-sm font-bold text-green-400">+{metrics.roi.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-white">${metrics.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-400">Add to Cart</p>
          </div>
          <p className="text-xl font-bold text-white">{metrics.totalAddToCarts}</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-400">Avg Revenue/Order</p>
          </div>
          <p className="text-xl font-bold text-white">${metrics.avgRevenuePerWorkOrder.toLocaleString()}</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-400">Cost/Work Order</p>
          </div>
          <p className="text-xl font-bold text-white">${metrics.costPerWorkOrder.toFixed(2)}</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-400">Total Spend</p>
          </div>
          <p className="text-xl font-bold text-white">${metrics.totalSpend.toLocaleString()}</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-400" />
          Conversion Funnel
        </h2>
        <div className="space-y-3">
          {funnelData.map((stage, index) => (
            <div key={stage.id} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: stage.color }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{stage.stage}</p>
                    <p className="text-xs text-gray-400">{stage.percentage.toFixed(2)}% of total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{stage.value.toLocaleString()}</p>
                  {index > 0 && (
                    <p className="text-xs text-gray-400">
                      {((stage.value / funnelData[index - 1].value) * 100).toFixed(1)}% from previous
                    </p>
                  )}
                </div>
              </div>
              <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stage.percentage}%`,
                    backgroundColor: stage.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <LineChartIcon className="w-6 h-6 text-orange-400" />
            Performance Over Time
          </h2>
          <ChartContainer key="performance-time-chart">
            <AreaChart data={performanceTimeData}>
              <defs>
                <linearGradient id={`${chartId}-colorRevenue`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#ea580c" 
                fillOpacity={1} 
                fill={`url(#${chartId}-colorRevenue)`}
                name="Revenue ($)"
                animationDuration={300}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="workOrders" 
                stroke="#22c55e" 
                fill="transparent" 
                name="Work Orders"
                animationDuration={300}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Campaign Type Performance */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-orange-400" />
            Campaign Type Performance
          </h2>
          <div className="space-y-4">
            {campaignTypeData.map((type) => (
              <div key={type.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <p className="font-semibold text-white">{type.name}</p>
                    <p className="text-xs text-gray-400">{type.count} campaigns</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">${type.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-400" />
            Campaign Performance
          </h2>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const statusColor = getStatusColor(campaign.status);
            const isExpanded = expandedCampaign === campaign.id;
            const campaignROI = ((campaign.revenue - campaign.spent) / campaign.spent) * 100;
            const campaignCTR = (campaign.clicks / campaign.impressions) * 100;
            const campaignCVR = (campaign.workOrdersCompleted / campaign.clicks) * 100;

            return (
              <div key={campaign.id} className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden hover:border-orange-500/30 transition">
                <button
                  onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/20 flex items-center justify-center text-orange-400">
                        {getTypeIcon(campaign.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white">{campaign.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
                            {campaign.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {campaign.id} • {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">${campaign.revenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">Revenue</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 ml-3" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 ml-3" />
                    )}
                  </div>

                  <div className="grid grid-cols-6 gap-3">
                    <div className="bg-[#1A1A1A] rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Impressions</p>
                      <p className="text-lg font-bold text-white">{campaign.impressions.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Clicks</p>
                      <p className="text-lg font-bold text-blue-400">{campaign.clicks.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Cart Adds</p>
                      <p className="text-lg font-bold text-purple-400">{campaign.addToCart}</p>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Work Orders</p>
                      <p className="text-lg font-bold text-green-400">{campaign.workOrdersCompleted}</p>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Spent</p>
                      <p className="text-lg font-bold text-orange-400">${campaign.spent.toLocaleString()}</p>
                    </div>
                    <div className="bg-[#1A1A1A] rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">ROI</p>
                      <p className={`text-lg font-bold ${campaignROI > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {campaignROI > 0 ? '+' : ''}{campaignROI.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[#2A2A2A] pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Detailed Metrics */}
                      <div>
                        <h4 className="text-sm font-bold text-white mb-3">Detailed Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Click-Through Rate (CTR)</span>
                            <span className="font-bold text-white">{campaignCTR.toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Conversion Rate (CVR)</span>
                            <span className="font-bold text-white">{campaignCVR.toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Cost Per Click</span>
                            <span className="font-bold text-white">${(campaign.spent / campaign.clicks).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Cost Per Work Order</span>
                            <span className="font-bold text-white">${(campaign.spent / campaign.workOrdersCompleted).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Avg Revenue Per Order</span>
                            <span className="font-bold text-white">${(campaign.revenue / campaign.workOrdersCompleted).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Budget & Timeline */}
                      <div>
                        <h4 className="text-sm font-bold text-white mb-3">Budget & Timeline</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-400">Budget Used</span>
                              <span className="font-bold text-white">${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}</span>
                            </div>
                            <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-600 to-orange-700 rounded-full transition-all duration-500"
                                style={{ width: `${(campaign.spent / campaign.budget) * 100}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">
                              {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-[#2A2A2A]">
                            <button className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-semibold transition">
                              View Details
                            </button>
                            <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white transition">
                              {campaign.status === 'active' ? 'Pause' : 'Resume'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No campaigns found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}