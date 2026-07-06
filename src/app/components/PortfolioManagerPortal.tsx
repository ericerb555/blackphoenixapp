import { useState } from 'react';
import {
  ArrowLeft, Building, Users, Wrench, DollarSign, Calendar, FileText,
  TrendingUp, AlertCircle, CheckCircle, Clock, Settings, Bell, Home,
  Package, Shield, Target, BarChart3, Activity, MessageSquare, Phone,
  Mail, MapPin, Edit, Plus, Search, Filter, Download, Upload, Eye,
  ClipboardList, Zap, Tag, Star, Gift, CreditCard, User, Briefcase,
  LineChart, Percent, PieChart, Wallet
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PortfolioManagerPortalProps {
  portfolioInfo: {
    name: string;
    portfolioManager: string;
    totalProperties: number;
    totalUnits: number;
    totalValue: number;
    phone: string;
    email: string;
  };
  onClose: () => void;
}

export default function PortfolioManagerPortal({ portfolioInfo, onClose }: PortfolioManagerPortalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'performance' | 'cashflow' | 'acquisitions' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Portfolio Manager specific data
  const managerStats = {
    activeProperties: 24,
    pendingAcquisitions: 3,
    totalPortfolioValue: 125000000,
    monthlyRevenue: 585000,
    monthlyNOI: 376000,
    avgOccupancyRate: 92.3,
    avgCapRate: 5.7,
    totalEquity: 29000000,
    propertiesUnderContract: 2,
    scheduledInspections: 8,
    expiringLeases: 12,
    maintenanceAlerts: 5
  };

  const topProperties = [
    {
      id: 'PROP-001',
      name: 'Oceanview Towers',
      type: 'Residential',
      units: 120,
      occupancy: 96,
      monthlyRevenue: 240000,
      noi: 155000,
      capRate: 5.2,
      performance: 'excellent'
    },
    {
      id: 'PROP-002',
      name: 'Downtown Commerce Center',
      type: 'Commercial',
      units: 45,
      occupancy: 91,
      monthlyRevenue: 185000,
      noi: 123000,
      capRate: 6.1,
      performance: 'excellent'
    },
    {
      id: 'PROP-003',
      name: 'Riverside Mixed-Use',
      type: 'Mixed-Use',
      units: 68,
      occupancy: 88,
      monthlyRevenue: 156000,
      noi: 98000,
      capRate: 5.8,
      performance: 'good'
    }
  ];

  const pendingAcquisitions = [
    {
      id: 'ACQ-001',
      propertyName: 'Sunset Plaza',
      location: 'Miami Beach, FL',
      type: 'Commercial',
      purchasePrice: 18500000,
      closingDate: '2024-03-15',
      status: 'due-diligence',
      daysUntilClosing: 48
    },
    {
      id: 'ACQ-002',
      propertyName: 'Harbor View Apartments',
      location: 'Fort Lauderdale, FL',
      type: 'Residential',
      purchasePrice: 24000000,
      closingDate: '2024-04-01',
      status: 'financing-approval',
      daysUntilClosing: 65
    }
  ];

  const cashFlowSummary = {
    thisMonth: {
      revenue: 585000,
      operatingExpenses: 209000,
      mortgagePayments: 182000,
      netCashFlow: 194000
    },
    lastMonth: {
      revenue: 578000,
      operatingExpenses: 205000,
      mortgagePayments: 182000,
      netCashFlow: 191000
    },
    variance: {
      revenue: 7000,
      netCashFlow: 3000,
      revenuePercent: 1.2,
      cashFlowPercent: 1.6
    }
  };

  const portfolioMetrics = [
    {
      label: 'Total Portfolio Value',
      value: `$${(managerStats.totalPortfolioValue / 1000000).toFixed(1)}M`,
      change: '+3.2%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Monthly NOI',
      value: `$${(managerStats.monthlyNOI / 1000).toFixed(0)}K`,
      change: '+1.8%',
      trend: 'up',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      label: 'Avg Occupancy',
      value: `${managerStats.avgOccupancyRate}%`,
      change: '+0.5%',
      trend: 'up',
      icon: Users,
      color: 'purple'
    },
    {
      label: 'Avg Cap Rate',
      value: `${managerStats.avgCapRate}%`,
      change: 'Stable',
      trend: 'neutral',
      icon: Percent,
      color: 'cyan'
    }
  ];

  const alerts = [
    {
      id: 'ALERT-001',
      type: 'maintenance',
      priority: 'high',
      message: 'Emergency HVAC repair needed at Oceanview Towers',
      property: 'Oceanview Towers',
      timestamp: '2 hours ago'
    },
    {
      id: 'ALERT-002',
      type: 'lease',
      priority: 'medium',
      message: '12 leases expiring within 60 days',
      property: 'Multiple Properties',
      timestamp: '1 day ago'
    },
    {
      id: 'ALERT-003',
      type: 'financial',
      priority: 'low',
      message: 'Insurance renewal due for Harbor View property',
      property: 'Harbor View Apartments',
      timestamp: '3 days ago'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-8 border-b-4 border-purple-500">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Portfolio Manager Portal</h1>
                <p className="text-purple-100">{portfolioInfo.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-white font-bold transition flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to CRM
            </button>
          </div>

          {/* Manager Info */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-100 text-sm mb-1">Portfolio Manager</p>
              <p className="text-white font-bold">{portfolioInfo.portfolioManager}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-100 text-sm mb-1">Active Properties</p>
              <p className="text-white font-bold text-2xl">{managerStats.activeProperties}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-100 text-sm mb-1">Total Units</p>
              <p className="text-white font-bold text-2xl">{portfolioInfo.totalUnits}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-100 text-sm mb-1">Pending Alerts</p>
              <p className="text-white font-bold text-2xl">{managerStats.maintenanceAlerts + managerStats.expiringLeases}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'properties', label: 'Properties', icon: Building },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'cashflow', label: 'Cash Flow', icon: DollarSign },
              { id: 'acquisitions', label: 'Acquisitions', icon: Target },
              { id: 'reports', label: 'Reports', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 font-medium transition flex items-center gap-2 border-b-2 ${
                    activeTab === tab.id
                      ? 'text-purple-400 border-purple-500 bg-purple-500/5'
                      : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Portfolio Metrics */}
            <div className="grid grid-cols-4 gap-6">
              {portfolioMetrics.map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <div key={idx} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${metric.color}-600/20 to-${metric.color}-700/20 flex items-center justify-center border border-${metric.color}-500/30`}>
                        <Icon className={`w-6 h-6 text-${metric.color}-400`} />
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg ${
                        metric.trend === 'up' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        metric.trend === 'down' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {metric.change}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-white">{metric.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Alerts & Top Properties */}
            <div className="grid grid-cols-2 gap-6">
              {/* Recent Alerts */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-400" />
                    Recent Alerts
                  </h3>
                  <button className="text-sm text-purple-400 hover:text-purple-300">View All</button>
                </div>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-3 bg-[#0F0F0F] rounded-lg border border-[#2A2A2A]">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-white font-medium flex-1">{alert.message}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ml-2 ${
                          alert.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          alert.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {alert.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{alert.property}</span>
                        <span>{alert.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performing Properties */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Top Performing Properties
                  </h3>
                  <button className="text-sm text-purple-400 hover:text-purple-300">View All</button>
                </div>
                <div className="space-y-3">
                  {topProperties.map((property) => (
                    <div key={property.id} className="p-3 bg-[#0F0F0F] rounded-lg border border-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-white">{property.name}</p>
                          <p className="text-xs text-gray-400">{property.type} • {property.units} units</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-400">{property.capRate}%</p>
                          <p className="text-xs text-gray-500">Cap Rate</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#2A2A2A] rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-600 to-green-500 h-2 rounded-full"
                            style={{ width: `${property.occupancy}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">{property.occupancy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cash Flow Summary */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Monthly Cash Flow Summary
              </h3>
              <div className="grid grid-cols-5 gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">${(cashFlowSummary.thisMonth.revenue / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-green-400">+${(cashFlowSummary.variance.revenue / 1000).toFixed(0)}K ({cashFlowSummary.variance.revenuePercent}%)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Operating Expenses</p>
                  <p className="text-2xl font-bold text-white">${(cashFlowSummary.thisMonth.operatingExpenses / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-gray-400">35.7% of revenue</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mortgage Payments</p>
                  <p className="text-2xl font-bold text-white">${(cashFlowSummary.thisMonth.mortgagePayments / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-gray-400">31.1% of revenue</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Net Cash Flow</p>
                  <p className="text-2xl font-bold text-green-400">${(cashFlowSummary.thisMonth.netCashFlow / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-green-400">+${(cashFlowSummary.variance.cashFlow / 1000).toFixed(0)}K ({cashFlowSummary.variance.cashFlowPercent}%)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Cash-on-Cash ROI</p>
                  <p className="text-2xl font-bold text-cyan-400">8.2%</p>
                  <p className="text-xs text-gray-400">Annual projected</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Property Portfolio</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white transition flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {topProperties.map((property) => (
                <div key={property.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{property.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {property.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          {property.units} units
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {property.occupancy}% occupied
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Monthly Revenue</p>
                        <p className="text-lg font-bold text-white">${(property.monthlyRevenue / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">NOI</p>
                        <p className="text-lg font-bold text-white">${(property.noi / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Cap Rate</p>
                        <p className="text-lg font-bold text-green-400">{property.capRate}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'acquisitions' && (
          <div className="space-y-6">
            {/* Acquisitions Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-purple-400" />
                  <div className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30 font-bold">
                    Active
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Active Deals</p>
                <p className="text-2xl font-bold text-white">5</p>
                <p className="text-xs text-gray-500 mt-1">Total pipeline value: $98.5M</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-blue-400" />
                  <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30 font-bold">
                    2
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Closing This Quarter</p>
                <p className="text-2xl font-bold text-white">$42.5M</p>
                <p className="text-xs text-gray-500 mt-1">Combined purchase price</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 font-bold">
                    +3
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Closed This Year</p>
                <p className="text-2xl font-bold text-white">8</p>
                <p className="text-xs text-gray-500 mt-1">Total value: $124M</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Search className="w-8 h-8 text-yellow-400" />
                  <div className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30 font-bold">
                    12
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Under Review</p>
                <p className="text-2xl font-bold text-white">$156M</p>
                <p className="text-xs text-gray-500 mt-1">Potential opportunities</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Acquisition Pipeline</h2>
                  <p className="text-sm text-gray-400">Manage deal flow and track due diligence</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none">
                  <option>All Stages</option>
                  <option>Prospecting</option>
                  <option>Under Review</option>
                  <option>Due Diligence</option>
                  <option>Financing</option>
                  <option>Closing</option>
                </select>
                <button 
                  onClick={() => toast.success('Opening new acquisition form...')}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition font-bold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  New Deal
                </button>
              </div>
            </div>

            {/* Deal Pipeline Stages */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {[
                  { stage: 'Prospecting', count: 12, color: 'gray' },
                  { stage: 'Under Review', count: 4, color: 'blue' },
                  { stage: 'Due Diligence', count: 2, color: 'yellow' },
                  { stage: 'Financing', count: 1, color: 'orange' },
                  { stage: 'Closing', count: 2, color: 'green' }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm whitespace-nowrap transition ${
                      idx === 2 ? 
                        `bg-${item.color}-500/10 border-${item.color}-500/30 text-${item.color}-400` :
                        'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'
                    }`}
                  >
                    {item.stage} ({item.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Active Deals - Due Diligence Stage */}
            <div className="space-y-4">
              {[
                {
                  id: 'ACQ-001',
                  propertyName: 'Sunset Plaza',
                  location: 'Miami Beach, FL',
                  type: 'Commercial',
                  purchasePrice: 18500000,
                  closingDate: '2024-03-15',
                  status: 'due-diligence',
                  daysUntilClosing: 18,
                  progress: 65,
                  seller: 'Oceanside Development LLC',
                  broker: 'Marcus & Associates',
                  units: 24,
                  sqft: 42000,
                  proFormaCapRate: 6.4,
                  proFormaNOI: 1184000,
                  financing: 'Secured - 75% LTV',
                  inspectionDate: '2024-02-28',
                  team: {
                    lead: 'Sarah Chen',
                    analyst: 'Mike Rodriguez',
                    legal: 'Patterson & Associates'
                  }
                },
                {
                  id: 'ACQ-002',
                  propertyName: 'Harbor View Apartments',
                  location: 'Fort Lauderdale, FL',
                  type: 'Residential',
                  purchasePrice: 24000000,
                  closingDate: '2024-04-01',
                  status: 'due-diligence',
                  daysUntilClosing: 35,
                  progress: 45,
                  seller: 'Harbor Properties Group',
                  broker: 'Coastal Realty Partners',
                  units: 156,
                  sqft: 124000,
                  proFormaCapRate: 5.8,
                  proFormaNOI: 1392000,
                  financing: 'In Process - 70% LTV',
                  inspectionDate: '2024-03-05',
                  team: {
                    lead: 'David Park',
                    analyst: 'Jennifer Liu',
                    legal: 'Thompson Legal Group'
                  }
                }
              ].map((deal) => (
                <div key={deal.id} className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#3A3A3A] transition">
                  {/* Header */}
                  <div className="p-6 border-b border-[#2A2A2A]">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{deal.propertyName}</h3>
                          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg text-xs font-bold border border-yellow-500/30 uppercase">
                            {deal.status.replace('-', ' ')}
                          </span>
                          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-semibold border border-purple-500/30">
                            {deal.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {deal.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {deal.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-400 font-semibold">{deal.daysUntilClosing} days to closing</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                        <p className="text-3xl font-bold text-white">${(deal.purchasePrice / 1000000).toFixed(1)}M</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Due Diligence Progress</span>
                        <span className="text-xs font-bold text-white">{deal.progress}%</span>
                      </div>
                      <div className="bg-[#0A0A0A] rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all"
                          style={{ width: `${deal.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Property Details */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Property Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Units/Spaces</span>
                          <span className="text-white font-semibold">{deal.units}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Total Sq Ft</span>
                          <span className="text-white font-semibold">{deal.sqft.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Pro Forma Cap Rate</span>
                          <span className="text-green-400 font-semibold">{deal.proFormaCapRate}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Pro Forma NOI</span>
                          <span className="text-green-400 font-semibold">${(deal.proFormaNOI / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Transaction Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Seller</span>
                          <span className="text-white font-semibold text-right">{deal.seller}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Broker</span>
                          <span className="text-white font-semibold text-right">{deal.broker}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Financing</span>
                          <span className="text-blue-400 font-semibold">{deal.financing}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Closing Date</span>
                          <span className="text-white font-semibold">{new Date(deal.closingDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Team */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">Deal Team</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Deal Lead</span>
                          <span className="text-white font-semibold">{deal.team.lead}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Analyst</span>
                          <span className="text-white font-semibold">{deal.team.analyst}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Legal Counsel</span>
                          <span className="text-white font-semibold text-right">{deal.team.legal}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Inspection</span>
                          <span className="text-orange-400 font-semibold">{new Date(deal.inspectionDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Due Diligence Checklist */}
                  <div className="px-6 pb-6">
                    <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-yellow-400" />
                        Due Diligence Checklist
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { item: 'Financial Review', status: 'complete' },
                          { item: 'Property Inspection', status: 'complete' },
                          { item: 'Environmental Report', status: 'in-progress' },
                          { item: 'Title Search', status: 'complete' },
                          { item: 'Lease Review', status: 'in-progress' },
                          { item: 'Zoning Verification', status: 'complete' },
                          { item: 'Insurance Quote', status: 'pending' },
                          { item: 'Appraisal', status: 'in-progress' }
                        ].map((task, idx) => (
                          <div key={idx} className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${
                            task.status === 'complete' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                            task.status === 'in-progress' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                            'bg-gray-500/10 border-gray-500/30 text-gray-400'
                          }`}>
                            {task.status === 'complete' ? <CheckCircle className="w-4 h-4" /> :
                             task.status === 'in-progress' ? <Clock className="w-4 h-4" /> :
                             <AlertCircle className="w-4 h-4" />}
                            <span className="font-medium">{task.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 pb-6 flex gap-2">
                    <button 
                      onClick={() => toast.success('Opening deal room...')}
                      className="flex-1 py-2.5 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Deal Room
                    </button>
                    <button 
                      onClick={() => toast.success('Opening document vault...')}
                      className="flex-1 py-2.5 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Documents
                    </button>
                    <button 
                      onClick={() => toast.success('Opening financial model...')}
                      className="flex-1 py-2.5 bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Financial Model
                    </button>
                    <button 
                      onClick={() => toast.success('Updating deal status...')}
                      className="flex-1 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 rounded-lg text-white transition text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Other Pipeline Stages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Closing Soon */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Closing This Quarter</h3>
                    <p className="text-sm text-gray-400">Final stage deals</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      name: 'Skyline Office Tower',
                      location: 'Downtown Miami, FL',
                      price: 32000000,
                      closing: '2024-03-22',
                      days: 25
                    },
                    {
                      name: 'Lakefront Retail Center',
                      location: 'Orlando, FL',
                      price: 15800000,
                      closing: '2024-03-28',
                      days: 31
                    }
                  ].map((deal, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] border border-green-500/30 rounded-lg p-4 hover:border-green-500/50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{deal.name}</h4>
                        <span className="text-lg font-bold text-green-400">${(deal.price / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {deal.location}
                        </span>
                        <span className="text-green-400 font-semibold">{deal.days} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Under Review */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Search className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Under Review</h3>
                    <p className="text-sm text-gray-400">Initial evaluation phase</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      name: 'Beachside Condominiums',
                      location: 'Key West, FL',
                      price: 28500000,
                      type: 'Residential',
                      units: 84
                    },
                    {
                      name: 'Tech Park Phase II',
                      location: 'Tampa, FL',
                      price: 42000000,
                      type: 'Commercial',
                      units: 156
                    },
                    {
                      name: 'Heritage Village',
                      location: 'Naples, FL',
                      price: 19200000,
                      type: 'Mixed-Use',
                      units: 48
                    },
                    {
                      name: 'Marina Bay Complex',
                      location: 'Fort Myers, FL',
                      price: 31500000,
                      type: 'Commercial',
                      units: 72
                    }
                  ].map((deal, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] border border-blue-500/30 rounded-lg p-3 hover:border-blue-500/50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm mb-1">{deal.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{deal.location}</span>
                            <span>•</span>
                            <span>{deal.type}</span>
                            <span>•</span>
                            <span>{deal.units} units</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-blue-400">${(deal.price / 1000000).toFixed(1)}M</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => toast.success('Loading all opportunities...')}
                  className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  View All (12 total)
                </button>
              </div>
            </div>

            {/* Acquisition Analytics */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Acquisition Analytics</h3>
                    <p className="text-sm text-gray-400">Historical performance and pipeline metrics</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Avg Time to Close', value: '87 days', trend: '-12 days', positive: true },
                  { label: 'Deal Success Rate', value: '73%', trend: '+8%', positive: true },
                  { label: 'Avg Cap Rate', value: '6.1%', trend: '+0.3%', positive: true },
                  { label: 'Pipeline Conversion', value: '42%', trend: '+5%', positive: true }
                ].map((metric, idx) => (
                  <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">{metric.label}</p>
                    <p className="text-2xl font-bold text-white mb-1">{metric.value}</p>
                    <p className={`text-xs font-semibold ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                      {metric.trend} vs last year
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 font-bold">
                    +12.5%
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Portfolio Growth</p>
                <p className="text-2xl font-bold text-white">$125.0M</p>
                <p className="text-xs text-gray-500 mt-1">vs. $111.2M last year</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Percent className="w-8 h-8 text-blue-400" />
                  <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30 font-bold">
                    +2.1%
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Avg Occupancy Rate</p>
                <p className="text-2xl font-bold text-white">92.3%</p>
                <p className="text-xs text-gray-500 mt-1">vs. 90.2% last quarter</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-purple-400" />
                  <div className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30 font-bold">
                    +0.4%
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Avg Cap Rate</p>
                <p className="text-2xl font-bold text-white">5.7%</p>
                <p className="text-xs text-gray-500 mt-1">vs. 5.3% target</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-orange-400" />
                  <div className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30 font-bold">
                    +8.2%
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Monthly NOI</p>
                <p className="text-2xl font-bold text-white">$376K</p>
                <p className="text-xs text-gray-500 mt-1">vs. $348K last month</p>
              </div>
            </div>

            {/* Property Performance Rankings */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Property Performance Rankings</h3>
                    <p className="text-sm text-gray-400">Top and bottom performers by key metrics</p>
                  </div>
                </div>
                <select className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none">
                  <option>By Revenue</option>
                  <option>By NOI</option>
                  <option>By Occupancy</option>
                  <option>By Cap Rate</option>
                  <option>By Growth</option>
                </select>
              </div>

              <div className="space-y-3">
                {[
                  {
                    rank: 1,
                    name: 'Oceanview Towers',
                    type: 'Residential',
                    revenue: 240000,
                    noi: 155000,
                    occupancy: 96,
                    capRate: 5.2,
                    growth: 15.2,
                    status: 'excellent'
                  },
                  {
                    rank: 2,
                    name: 'Downtown Commerce Center',
                    type: 'Commercial',
                    revenue: 185000,
                    noi: 123000,
                    occupancy: 91,
                    capRate: 6.1,
                    growth: 12.8,
                    status: 'excellent'
                  },
                  {
                    rank: 3,
                    name: 'Riverside Mixed-Use',
                    type: 'Mixed-Use',
                    revenue: 156000,
                    noi: 98000,
                    occupancy: 88,
                    capRate: 5.8,
                    growth: 8.5,
                    status: 'good'
                  },
                  {
                    rank: 4,
                    name: 'Metro Business Park',
                    type: 'Commercial',
                    revenue: 142000,
                    noi: 89000,
                    occupancy: 85,
                    capRate: 5.4,
                    growth: 6.2,
                    status: 'good'
                  },
                  {
                    rank: 5,
                    name: 'Parkside Residences',
                    type: 'Residential',
                    revenue: 98000,
                    noi: 61000,
                    occupancy: 79,
                    capRate: 4.9,
                    growth: 2.1,
                    status: 'needs-attention'
                  }
                ].map((property) => (
                  <div key={property.rank} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        property.rank === 1 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white' :
                        property.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' :
                        property.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white' :
                        'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A]'
                      }`}>
                        #{property.rank}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white">{property.name}</h4>
                          <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-xs rounded-full border border-gray-500/30">
                            {property.type}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${
                            property.status === 'excellent' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            property.status === 'good' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {property.status === 'excellent' ? '⭐ Excellent' :
                             property.status === 'good' ? '✓ Good' :
                             '⚠ Needs Attention'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Revenue</p>
                            <p className="text-white font-semibold">${(property.revenue / 1000).toFixed(0)}K</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">NOI</p>
                            <p className="text-white font-semibold">${(property.noi / 1000).toFixed(0)}K</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Occupancy</p>
                            <p className="text-white font-semibold">{property.occupancy}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Cap Rate</p>
                            <p className="text-white font-semibold">{property.capRate}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Growth</p>
                            <p className={`font-semibold ${property.growth > 10 ? 'text-green-400' : property.growth > 5 ? 'text-blue-400' : 'text-yellow-400'}`}>
                              +{property.growth}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <button className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white text-sm transition">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue & Profitability */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Revenue & Profitability</h3>
                    <p className="text-sm text-gray-400">Financial performance metrics</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Total Monthly Revenue', value: '$585,000', change: '+8.2%', positive: true },
                    { label: 'Total Monthly NOI', value: '$376,000', change: '+9.5%', positive: true },
                    { label: 'Operating Expense Ratio', value: '35.7%', change: '-2.1%', positive: true },
                    { label: 'Net Profit Margin', value: '64.3%', change: '+2.1%', positive: true }
                  ].map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                      <div>
                        <p className="text-sm text-gray-400">{metric.label}</p>
                        <p className="text-xl font-bold text-white mt-1">{metric.value}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        metric.positive ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                        'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {metric.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Occupancy & Leasing */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Occupancy & Leasing</h3>
                    <p className="text-sm text-gray-400">Tenant and lease metrics</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Portfolio Occupancy Rate', value: '92.3%', change: '+2.1%', positive: true },
                    { label: 'Avg Days to Lease', value: '18 days', change: '-3 days', positive: true },
                    { label: 'Tenant Retention Rate', value: '87.5%', change: '+1.8%', positive: true },
                    { label: 'Lease Renewals (30d)', value: '24 leases', change: '+4', positive: true }
                  ].map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                      <div>
                        <p className="text-sm text-gray-400">{metric.label}</p>
                        <p className="text-xl font-bold text-white mt-1">{metric.value}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        metric.positive ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                        'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {metric.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance by Property Type */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Performance by Property Type</h3>
                  <p className="text-sm text-gray-400">Comparative analysis across asset classes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    type: 'Residential',
                    properties: 14,
                    units: 856,
                    revenue: 318000,
                    noi: 205000,
                    occupancy: 93.2,
                    capRate: 5.4,
                    color: 'blue'
                  },
                  {
                    type: 'Commercial',
                    properties: 7,
                    units: 142,
                    revenue: 198000,
                    noi: 131000,
                    occupancy: 89.8,
                    capRate: 6.2,
                    color: 'green'
                  },
                  {
                    type: 'Mixed-Use',
                    properties: 3,
                    units: 89,
                    revenue: 69000,
                    noi: 40000,
                    occupancy: 94.1,
                    capRate: 5.1,
                    color: 'purple'
                  }
                ].map((type) => (
                  <div key={type.type} className={`bg-gradient-to-br from-${type.color}-600/10 to-${type.color}-800/5 border border-${type.color}-500/30 rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-white text-lg">{type.type}</h4>
                      <Building className={`w-6 h-6 text-${type.color}-400`} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Properties</p>
                        <p className="text-white font-semibold">{type.properties}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Units</p>
                        <p className="text-white font-semibold">{type.units}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Revenue</p>
                        <p className="text-white font-semibold">${(type.revenue / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">NOI</p>
                        <p className="text-white font-semibold">${(type.noi / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Occupancy</p>
                        <p className="text-white font-semibold">{type.occupancy}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Cap Rate</p>
                        <p className="text-white font-semibold">{type.capRate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quarterly Performance Trends */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                    <LineChart className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Quarterly Performance Trends</h3>
                    <p className="text-sm text-gray-400">Historical performance over the last 12 months</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { quarter: 'Q1 2024', revenue: 1685000, noi: 1082000, occupancy: 92.3, growth: 8.5 },
                  { quarter: 'Q4 2023', revenue: 1625000, noi: 1045000, occupancy: 90.8, growth: 6.2 },
                  { quarter: 'Q3 2023', revenue: 1580000, noi: 1015000, occupancy: 89.5, growth: 5.8 },
                  { quarter: 'Q2 2023', revenue: 1545000, noi: 992000, occupancy: 88.2, growth: 4.1 }
                ].map((quarter, idx) => (
                  <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-3">{quarter.quarter}</h4>
                        <div className="grid grid-cols-4 gap-6">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                            <p className="text-lg font-bold text-green-400">${(quarter.revenue / 1000).toFixed(0)}K</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total NOI</p>
                            <p className="text-lg font-bold text-blue-400">${(quarter.noi / 1000).toFixed(0)}K</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Avg Occupancy</p>
                            <p className="text-lg font-bold text-purple-400">{quarter.occupancy}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">YoY Growth</p>
                            <p className="text-lg font-bold text-orange-400">+{quarter.growth}%</p>
                          </div>
                        </div>
                      </div>
                      {idx === 0 && (
                        <div className="ml-4 px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/30 font-bold">
                          Current
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items & Alerts */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Performance Action Items</h3>
                  <p className="text-sm text-gray-400">Properties requiring attention or improvement</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    property: 'Parkside Residences',
                    issue: 'Low occupancy rate (79%)',
                    recommendation: 'Consider targeted marketing campaign or rent adjustment',
                    priority: 'high',
                    impact: '$12K/month potential revenue loss'
                  },
                  {
                    property: 'Metro Business Park',
                    issue: 'Below-target cap rate (5.4% vs 5.7% target)',
                    recommendation: 'Review operating expenses and identify cost reduction opportunities',
                    priority: 'medium',
                    impact: '$8K/month potential savings'
                  },
                  {
                    property: 'Riverside Mixed-Use',
                    issue: 'Declining occupancy trend (-3% over 90 days)',
                    recommendation: 'Investigate tenant satisfaction and market conditions',
                    priority: 'medium',
                    impact: 'Trend reversal critical'
                  }
                ].map((item, idx) => (
                  <div key={idx} className={`bg-[#0A0A0A] border rounded-xl p-4 ${
                    item.priority === 'high' ? 'border-red-500/30' :
                    item.priority === 'medium' ? 'border-yellow-500/30' :
                    'border-blue-500/30'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{item.property}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                            item.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                            item.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}>
                            {item.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{item.issue}</p>
                      </div>
                    </div>
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">Recommendation:</p>
                      <p className="text-sm text-white">{item.recommendation}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">💰 {item.impact}</p>
                      <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition">
                        Create Action Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="space-y-6">
            {/* Cash Flow Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 font-bold">
                    +12.3%
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Total Inflows (MTD)</p>
                <p className="text-2xl font-bold text-white">$625K</p>
                <p className="text-xs text-gray-500 mt-1">vs. $557K last month</p>
              </div>

              <div className="bg-gradient-to-br from-red-600/20 to-red-800/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-red-400" />
                  <div className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30 font-bold">
                    +5.2%
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Total Outflows (MTD)</p>
                <p className="text-2xl font-bold text-white">$249K</p>
                <p className="text-xs text-gray-500 mt-1">vs. $237K last month</p>
              </div>

              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-blue-400" />
                  <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30 font-bold">
                    +18.5%
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Net Cash Flow (MTD)</p>
                <p className="text-2xl font-bold text-white">$376K</p>
                <p className="text-xs text-gray-500 mt-1">vs. $320K last month</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="w-8 h-8 text-purple-400" />
                  <div className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30 font-bold">
                    Healthy
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-1">Cash Reserves</p>
                <p className="text-2xl font-bold text-white">$2.4M</p>
                <p className="text-xs text-gray-500 mt-1">4.1 months operating expenses</p>
              </div>
            </div>

            {/* Cash Flow by Property */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Cash Flow by Property</h3>
                    <p className="text-sm text-gray-400">Month-to-date financial activity breakdown</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none">
                    <option>This Month</option>
                    <option>Last Month</option>
                    <option>Last 3 Months</option>
                    <option>Year to Date</option>
                  </select>
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: 'Oceanview Towers',
                    type: 'Residential',
                    inflows: 240000,
                    outflows: 85000,
                    netCashFlow: 155000,
                    trend: 'up'
                  },
                  {
                    name: 'Downtown Commerce Center',
                    type: 'Commercial',
                    inflows: 185000,
                    outflows: 62000,
                    netCashFlow: 123000,
                    trend: 'up'
                  },
                  {
                    name: 'Riverside Mixed-Use',
                    type: 'Mixed-Use',
                    inflows: 156000,
                    outflows: 58000,
                    netCashFlow: 98000,
                    trend: 'steady'
                  },
                  {
                    name: 'Metro Business Park',
                    type: 'Commercial',
                    inflows: 142000,
                    outflows: 53000,
                    netCashFlow: 89000,
                    trend: 'up'
                  },
                  {
                    name: 'Parkside Residences',
                    type: 'Residential',
                    inflows: 98000,
                    outflows: 37000,
                    netCashFlow: 61000,
                    trend: 'down'
                  }
                ].map((property, idx) => (
                  <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-semibold text-white">{property.name}</h4>
                          <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-xs rounded-full border border-gray-500/30">
                            {property.type}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full border font-medium flex items-center gap-1 ${
                            property.trend === 'up' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            property.trend === 'down' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}>
                            {property.trend === 'up' ? '↗' : property.trend === 'down' ? '↘' : '→'} {property.trend}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-6">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">💰 Inflows</p>
                            <p className="text-lg font-bold text-green-400">${(property.inflows / 1000).toFixed(0)}K</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">💸 Outflows</p>
                            <p className="text-lg font-bold text-red-400">${(property.outflows / 1000).toFixed(0)}K</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">📊 Net Cash Flow</p>
                            <p className="text-lg font-bold text-blue-400">${(property.netCashFlow / 1000).toFixed(0)}K</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">📈 Margin</p>
                            <p className="text-lg font-bold text-white">{((property.netCashFlow / property.inflows) * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      <button className="ml-4 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-white text-sm transition">
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Income Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Income Breakdown</h3>
                    <p className="text-sm text-gray-400">Revenue sources this month</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { source: 'Rental Income', amount: 585000, percentage: 93.6, color: 'green' },
                    { source: 'Parking Fees', amount: 18500, percentage: 3.0, color: 'blue' },
                    { source: 'Late Fees', amount: 8900, percentage: 1.4, color: 'yellow' },
                    { source: 'Pet Fees', amount: 6200, percentage: 1.0, color: 'purple' },
                    { source: 'Other Income', amount: 6400, percentage: 1.0, color: 'gray' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">{item.source}</span>
                        <span className="text-sm font-bold text-white">${(item.amount / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r from-${item.color}-500 to-${item.color}-600`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Total Income</span>
                    <span className="text-xl font-bold text-green-400">$625.0K</span>
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Expense Breakdown</h3>
                    <p className="text-sm text-gray-400">Operating costs this month</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { category: 'Property Management', amount: 58500, percentage: 23.5, color: 'red' },
                    { category: 'Maintenance & Repairs', amount: 52300, percentage: 21.0, color: 'orange' },
                    { category: 'Utilities', amount: 42800, percentage: 17.2, color: 'yellow' },
                    { category: 'Insurance', amount: 35600, percentage: 14.3, color: 'blue' },
                    { category: 'Property Taxes', amount: 31200, percentage: 12.5, color: 'purple' },
                    { category: 'Marketing & Advertising', amount: 15800, percentage: 6.3, color: 'pink' },
                    { category: 'Legal & Professional', amount: 12800, percentage: 5.2, color: 'cyan' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">{item.category}</span>
                        <span className="text-sm font-bold text-white">${(item.amount / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#1A1A1A] rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r from-${item.color}-500 to-${item.color}-600`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Total Expenses</span>
                    <span className="text-xl font-bold text-red-400">$249.0K</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Flow Forecast */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <LineChart className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">90-Day Cash Flow Forecast</h3>
                    <p className="text-sm text-gray-400">Projected income and expenses</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Adjust Forecast
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { month: 'March 2024', inflows: 625000, outflows: 249000, netCash: 376000, confidence: 95 },
                  { month: 'April 2024', inflows: 638000, outflows: 255000, netCash: 383000, confidence: 88 },
                  { month: 'May 2024', inflows: 642000, outflows: 258000, netCash: 384000, confidence: 75 }
                ].map((forecast, idx) => (
                  <div key={idx} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-white">{forecast.month}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${
                          idx === 0 ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        }`}>
                          {idx === 0 ? 'Current Month' : 'Forecast'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Confidence</p>
                        <p className="text-sm font-bold text-white">{forecast.confidence}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Expected Inflows</p>
                        <p className="text-lg font-bold text-green-400">${(forecast.inflows / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Expected Outflows</p>
                        <p className="text-lg font-bold text-red-400">${(forecast.outflows / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Net Cash Flow</p>
                        <p className="text-lg font-bold text-blue-400">${(forecast.netCash / 1000).toFixed(0)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Cumulative</p>
                        <p className="text-lg font-bold text-purple-400">${((forecast.netCash * (idx + 1)) / 1000).toFixed(0)}K</p>
                      </div>
                    </div>

                    {/* Progress bar for confidence */}
                    <div className="mt-3">
                      <div className="bg-[#1A1A1A] rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{ width: `${forecast.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Payments & Collections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Collections */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Upcoming Collections</h3>
                    <p className="text-sm text-gray-400">Expected incoming payments (30 days)</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { date: 'Mar 1', description: 'Rent payments due', amount: 585000, status: 'pending' },
                    { date: 'Mar 5', description: 'Parking fees (Q2)', amount: 18500, status: 'pending' },
                    { date: 'Mar 15', description: 'Late payment collections', amount: 8900, status: 'pending' },
                    { date: 'Mar 20', description: 'Pet fee renewals', amount: 6200, status: 'pending' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] border border-green-500/30 rounded-lg p-3 hover:border-green-500/50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-green-400">{item.date}</span>
                            <span className="text-sm text-white">{item.description}</span>
                          </div>
                          <p className="text-xs text-gray-500">Status: {item.status}</p>
                        </div>
                        <p className="text-lg font-bold text-green-400">${(item.amount / 1000).toFixed(1)}K</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Total Expected</span>
                    <span className="text-xl font-bold text-green-400">$618.6K</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Payments */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Upcoming Payments</h3>
                    <p className="text-sm text-gray-400">Scheduled outgoing payments (30 days)</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { date: 'Mar 3', description: 'Property management fees', amount: 58500, status: 'scheduled' },
                    { date: 'Mar 7', description: 'Maintenance contractors', amount: 52300, status: 'scheduled' },
                    { date: 'Mar 10', description: 'Utility payments', amount: 42800, status: 'scheduled' },
                    { date: 'Mar 15', description: 'Insurance premiums', amount: 35600, status: 'scheduled' },
                    { date: 'Mar 20', description: 'Property tax payment', amount: 31200, status: 'scheduled' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-[#0A0A0A] border border-red-500/30 rounded-lg p-3 hover:border-red-500/50 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-red-400">{item.date}</span>
                            <span className="text-sm text-white">{item.description}</span>
                          </div>
                          <p className="text-xs text-gray-500">Status: {item.status}</p>
                        </div>
                        <p className="text-lg font-bold text-red-400">${(item.amount / 1000).toFixed(1)}K</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Total Due</span>
                    <span className="text-xl font-bold text-red-400">$220.4K</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Flow Alerts */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cash Flow Alerts & Recommendations</h3>
                  <p className="text-sm text-gray-400">Important notices and optimization opportunities</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    type: 'info',
                    title: 'Strong Cash Position',
                    message: 'Current cash reserves cover 4.1 months of operating expenses, exceeding the recommended 3-month minimum.',
                    action: 'Consider Strategic Investment'
                  },
                  {
                    type: 'warning',
                    title: 'Late Payment Trend',
                    message: 'Late fee collections up 15% from last month. Review tenant payment patterns at Parkside Residences.',
                    action: 'Review Payment Policies'
                  },
                  {
                    type: 'success',
                    title: 'Expense Optimization',
                    message: 'Maintenance costs down 8% through preventive maintenance program. Continue current strategy.',
                    action: 'View Savings Report'
                  }
                ].map((alert, idx) => (
                  <div key={idx} className={`bg-[#0A0A0A] border rounded-xl p-4 ${
                    alert.type === 'success' ? 'border-green-500/30' :
                    alert.type === 'warning' ? 'border-yellow-500/30' :
                    'border-blue-500/30'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                          {alert.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                          {alert.type === 'info' && <Activity className="w-5 h-5 text-blue-400" />}
                          <h4 className="font-semibold text-white">{alert.title}</h4>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{alert.message}</p>
                        <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          alert.type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                          alert.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                          'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}>
                          {alert.action}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <span className="text-2xl font-bold text-blue-400">24</span>
                </div>
                <p className="text-sm text-gray-400">Total Reports Generated</p>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Download className="w-8 h-8 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">156</span>
                </div>
                <p className="text-sm text-gray-400">Reports Downloaded</p>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 text-purple-400" />
                  <span className="text-2xl font-bold text-purple-400">8</span>
                </div>
                <p className="text-sm text-gray-400">Scheduled Reports</p>
              </div>

              <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/10 border border-orange-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-orange-400" />
                  <span className="text-2xl font-bold text-orange-400">3</span>
                </div>
                <p className="text-sm text-gray-400">Reports in Progress</p>
              </div>
            </div>

            {/* Report Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Financial Performance Report */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6 hover:border-green-500/50 transition-all group">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Financial Performance</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Revenue, NOI, expenses, and profitability analysis across all properties
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Includes:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-gray-400">Revenue breakdown by property</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-gray-400">Operating expense analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-gray-400">NOI trends and forecasts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-gray-400">Cap rate comparison</span>
                  </div>
                </div>
                <button 
                  onClick={() => toast.success('Generating Financial Performance Report...')}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </div>

              {/* Occupancy & Leasing Report */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6 hover:border-blue-500/50 transition-all group">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Occupancy & Leasing</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Vacancy rates, lease expirations, tenant demographics, and retention
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Includes:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-gray-400">Occupancy rates by property</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-gray-400">Lease expiration schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-gray-400">Tenant retention metrics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-gray-400">Average lease duration</span>
                  </div>
                </div>
                <button 
                  onClick={() => toast.success('Generating Occupancy & Leasing Report...')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </div>

              {/* Property Valuation Report */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6 hover:border-purple-500/50 transition-all group">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Property Valuation</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Current market values, appreciation trends, and equity position analysis
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Includes:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-gray-400">Market value assessments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-gray-400">Appreciation/depreciation trends</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-gray-400">Loan-to-value ratios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-gray-400">Equity position analysis</span>
                  </div>
                </div>
                <button 
                  onClick={() => toast.success('Generating Property Valuation Report...')}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </div>

              {/* Maintenance & Operations Report */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/50 transition-all group">
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Wrench className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Maintenance & Operations</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Work orders, maintenance costs, vendor performance, and operational efficiency
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Includes:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-gray-400">Work order completion rates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-gray-400">Maintenance cost breakdown</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-gray-400">Vendor performance metrics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-gray-400">Emergency response times</span>
                  </div>
                </div>
                <button 
                  onClick={() => toast.success('Generating Maintenance & Operations Report...')}
                  className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </div>

              {/* Portfolio Comparison Report */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6 hover:border-cyan-500/50 transition-all group">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Portfolio Comparison</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Side-by-side property performance metrics and benchmarking analysis
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Includes:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-gray-400">Property performance ranking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-gray-400">KPI comparison matrix</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-gray-400">Best/worst performers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-gray-400">Market benchmarking</span>
                  </div>
                </div>
                <button 
                  onClick={() => toast.success('Generating Portfolio Comparison Report...')}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </div>

              {/* Executive Summary Report */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6 hover:border-yellow-500/50 transition-all group">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Executive Summary</h3>
                <p className="text-gray-400 text-sm mb-4">
                  High-level overview for investors and stakeholders with key metrics
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Includes:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-gray-400">Portfolio value summary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-gray-400">Key performance indicators</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-gray-400">Strategic highlights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-gray-400">Future outlook</span>
                  </div>
                </div>
                <button 
                  onClick={() => toast.success('Generating Executive Summary Report...')}
                  className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </div>
            </div>

            {/* Scheduled Reports Section */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Scheduled Reports</h3>
                    <p className="text-sm text-gray-400">Automatic report generation on schedule</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Schedule
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: 'Monthly Financial Performance',
                    frequency: 'Monthly - 1st of month',
                    recipients: 3,
                    lastGenerated: '2024-02-01',
                    status: 'active'
                  },
                  {
                    name: 'Weekly Occupancy Report',
                    frequency: 'Weekly - Mondays',
                    recipients: 5,
                    lastGenerated: '2024-02-19',
                    status: 'active'
                  },
                  {
                    name: 'Quarterly Valuation Report',
                    frequency: 'Quarterly - End of quarter',
                    recipients: 8,
                    lastGenerated: '2024-01-01',
                    status: 'active'
                  }
                ].map((schedule, index) => (
                  <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-white">{schedule.name}</h4>
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/30">
                            {schedule.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Frequency</p>
                            <p className="text-gray-300">{schedule.frequency}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Recipients</p>
                            <p className="text-gray-300">{schedule.recipients} users</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Last Generated</p>
                            <p className="text-gray-300">{schedule.lastGenerated}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reports Section */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Recent Reports</h3>
                    <p className="text-sm text-gray-400">Previously generated reports ready for download</p>
                  </div>
                </div>
                <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                  View All
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: 'Financial Performance - February 2024',
                    type: 'Financial',
                    date: '2024-02-20',
                    size: '2.4 MB',
                    downloads: 12,
                    format: 'PDF'
                  },
                  {
                    name: 'Occupancy Analysis - Week 7',
                    type: 'Occupancy',
                    date: '2024-02-19',
                    size: '1.8 MB',
                    downloads: 8,
                    format: 'XLSX'
                  },
                  {
                    name: 'Property Valuation - Q1 2024',
                    type: 'Valuation',
                    date: '2024-02-15',
                    size: '3.1 MB',
                    downloads: 24,
                    format: 'PDF'
                  },
                  {
                    name: 'Maintenance Summary - January 2024',
                    type: 'Operations',
                    date: '2024-02-01',
                    size: '1.2 MB',
                    downloads: 5,
                    format: 'PDF'
                  }
                ].map((report, index) => (
                  <div key={index} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-1">{report.name}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {report.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {report.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {report.size}
                            </span>
                            <span className="flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {report.downloads} downloads
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/30 font-medium">
                          {report.format}
                        </span>
                        <button 
                          onClick={() => toast.success(`Downloading ${report.name}...`)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Report Builder */}
            <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Custom Report Builder</h3>
                  <p className="text-sm text-gray-400">Create customized reports with specific metrics and date ranges</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Report Name</label>
                    <input
                      type="text"
                      placeholder="Enter report name"
                      className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                    <select className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:outline-none">
                      <option>Last 30 Days</option>
                      <option>Last 90 Days</option>
                      <option>Year to Date</option>
                      <option>Last Year</option>
                      <option>Custom Range</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Properties</label>
                    <select className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-orange-500 focus:outline-none">
                      <option>All Properties</option>
                      <option>Residential Only</option>
                      <option>Commercial Only</option>
                      <option>Mixed-Use Only</option>
                      <option>Select Specific Properties</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Include Metrics</label>
                    <div className="space-y-2">
                      {[
                        'Financial Performance',
                        'Occupancy Rates',
                        'Maintenance Costs',
                        'Tenant Demographics',
                        'Property Valuations',
                        'Cash Flow Analysis'
                      ].map((metric, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={idx < 3}
                            className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0A0A0A] text-orange-500 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-300">{metric}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button 
                  onClick={() => toast.success('Generating custom report...')}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Generate Custom Report
                </button>
                <button className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-xl font-semibold transition">
                  Save Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
