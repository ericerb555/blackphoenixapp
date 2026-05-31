import { useState } from 'react';
import {
  Building2, Home, Users, Wrench, DollarSign, TrendingUp, Calendar,
  FileText, Clock, CheckCircle, AlertTriangle, BarChart3, Settings,
  Bell, Search, Filter, MapPin, Phone, Mail, Key, Shield, Award,
  ArrowUpRight, ArrowDownRight, AlertCircle, ChevronRight, Tag,
  Zap, Lock, Crown, ExternalLink, Package, Layout
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { ChartContainer } from '../ChartContainer';
import ReferralRewards from '../ReferralRewards';
import { useUserData } from '../../lib/hooks/useUserData';

interface Unit {
  id: string;
  number: string;
  owner: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  monthlyFee: number;
  balanceDue: number;
}

interface WorkRequest {
  id: string;
  unit: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'in-progress' | 'completed';
  requestedDate: string;
  estimatedCost?: number;
}

export default function CondoManagerPortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'units' | 'work-requests' | 'owners' | 'financials' | 'reports' | 'referrals'>('dashboard');

  // User-specific data storage
  const [units, setUnits] = useUserData<Unit[]>('condo_units', [
    {
      id: '1',
      number: '101',
      owner: 'John Smith',
      status: 'occupied',
      monthlyFee: 450,
      balanceDue: 0
    },
    {
      id: '2',
      number: '102',
      owner: 'Jane Doe',
      status: 'occupied',
      monthlyFee: 450,
      balanceDue: 450
    },
    {
      id: '3',
      number: '103',
      owner: 'Bob Johnson',
      status: 'vacant',
      monthlyFee: 450,
      balanceDue: 0
    }
  ]);

  const [workRequests, setWorkRequests] = useUserData<WorkRequest[]>('condo_work_requests', [
    {
      id: '1',
      unit: '101',
      title: 'Hallway light not working',
      priority: 'medium',
      status: 'pending',
      requestedDate: '2026-04-22',
      estimatedCost: 200
    },
    {
      id: '2',
      unit: '102',
      title: 'Common area AC needs service',
      priority: 'high',
      status: 'approved',
      requestedDate: '2026-04-23',
      estimatedCost: 600
    }
  ]);

  // Subscription tier - determines feature access
  const [subscriptionTier, setSubscriptionTier] = useUserData<string>('condo_subscription_tier', 'basic');

  // Check premium feature access
  const hasContentCenterAccess = ['premium', 'elite'].includes(subscriptionTier);
  const hasAdvancedReportsAccess = ['professional', 'premium', 'elite'].includes(subscriptionTier);

  // Handle premium feature access
  const handleContentCenterClick = () => {
    if (hasContentCenterAccess) {
      window.location.href = '/enterprise-content-center';
    } else {
      toast.error('Upgrade to Premium or Elite to access Content Center');
    }
  };

  const handleAdvancedReportsClick = () => {
    if (hasAdvancedReportsAccess) {
      window.location.href = '/enterprise-reporting';
    } else {
      toast.error('Upgrade to Professional or higher to access Advanced Reports');
    }
  };

  // Condo Association info
  const condoInfo = {
    name: 'Sunset Ridge Condominiums',
    email: 'manager@sunsetridge.com',
    phone: '(555) 234-5678',
    accountManager: 'Maria Garcia',
    memberSince: 'March 2024',
    totalUnits: units.length,
    occupiedUnits: units.filter(u => u.status === 'occupied').length,
    rating: 4.7
  };

  // Revenue data with unique IDs
  const revenueData = [
    { id: 'condo-rev-1', month: 'Jul', fees: 13500, expenses: 8500 },
    { id: 'condo-rev-2', month: 'Aug', fees: 14200, expenses: 9200 },
    { id: 'condo-rev-3', month: 'Sep', fees: 13800, expenses: 7800 },
    { id: 'condo-rev-4', month: 'Oct', fees: 14500, expenses: 10500 },
    { id: 'condo-rev-5', month: 'Nov', fees: 14100, expenses: 8900 },
    { id: 'condo-rev-6', month: 'Dec', fees: 15000, expenses: 11500 },
    { id: 'condo-rev-7', month: 'Jan', fees: 14800, expenses: 9300 }
  ];

  // Calculate stats
  const totalMonthlyFees = units.reduce((sum, u) => sum + u.monthlyFee, 0);
  const totalBalanceDue = units.reduce((sum, u) => sum + u.balanceDue, 0);
  const occupancyRate = units.length > 0
    ? Math.round((units.filter(u => u.status === 'occupied').length / units.length) * 100)
    : 0;
  const pendingRequests = workRequests.filter(r => r.status === 'pending').length;
  const urgentRequests = workRequests.filter(r => r.priority === 'urgent').length;

  const stats = [
    { label: 'Monthly Fees', value: `$${totalMonthlyFees.toLocaleString()}`, change: '+5.3%', trend: 'up', icon: DollarSign, color: 'orange' },
    { label: 'Total Units', value: condoInfo.totalUnits.toString(), change: `${occupancyRate}% occupied`, trend: 'up', icon: Building2, color: 'blue' },
    { label: 'Balance Due', value: `$${totalBalanceDue.toLocaleString()}`, change: totalBalanceDue > 0 ? 'Past due' : 'Current', trend: totalBalanceDue > 0 ? 'down' : 'neutral', icon: FileText, color: totalBalanceDue > 0 ? 'red' : 'green' },
    { label: 'Work Requests', value: workRequests.length.toString(), change: `${pendingRequests} pending`, trend: urgentRequests > 0 ? 'down' : 'neutral', icon: Wrench, color: urgentRequests > 0 ? 'red' : 'yellow' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in-progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'approved': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getUnitStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'vacant': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'maintenance': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'units', label: 'Units', icon: Building2 },
    { id: 'work-requests', label: 'Work Requests', icon: Wrench },
    { id: 'owners', label: 'Owners', icon: Users },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'referrals', label: 'Referral Rewards', icon: Award }
  ];

  return (
    <LayoutManager pageName="Condo Manager Portal" enableCustomization={true} showEditButton={true}>
      <div className="w-full min-h-screen bg-[#0A0A0A]">
        {/* Header */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center">
                    <Layout className="w-5 h-5 text-white" />
                  </div>
                  Condo Manager Portal
                </h1>
                <p className="text-gray-400 mt-1">{condoInfo.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-cyan-500/30 transition">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-cyan-500/30 transition">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-400' : stat.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                        {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                        {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                        <span>{stat.change}</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Premium Features Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Content Center Access */}
                <div className={`bg-[#1A1A1A] border rounded-xl p-6 ${hasContentCenterAccess ? 'border-green-500/30' : 'border-[#2A2A2A]'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Content Center</h3>
                        <p className="text-sm text-gray-400">Communication tools</p>
                      </div>
                    </div>
                    {hasContentCenterAccess && (
                      <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </div>
                    )}
                  </div>

                  {hasContentCenterAccess ? (
                    <>
                      <ul className="space-y-2 mb-4 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          HOA newsletter templates
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Board meeting materials
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Owner communication tools
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Community announcements
                        </li>
                      </ul>
                      <PrimaryButton
                        onClick={handleContentCenterClick}
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Content Center
                      </PrimaryButton>
                    </>
                  ) : (
                    <>
                      <ul className="space-y-2 mb-4 text-sm text-gray-400">
                        <li className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          HOA newsletter templates
                        </li>
                        <li className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Board meeting materials
                        </li>
                        <li className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Owner communication tools
                        </li>
                      </ul>
                      <button
                        onClick={handleContentCenterClick}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2A2A2A] border border-[#3A3A3A] text-gray-300 rounded-lg hover:bg-[#3A3A3A] transition"
                      >
                        <Crown className="w-4 h-4 text-cyan-400" />
                        Upgrade to Access
                      </button>
                    </>
                  )}
                </div>

                {/* Advanced Reports */}
                <div className={`bg-[#1A1A1A] border rounded-xl p-6 ${hasAdvancedReportsAccess ? 'border-green-500/30' : 'border-[#2A2A2A]'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Advanced Reports</h3>
                        <p className="text-sm text-gray-400">HOA analytics</p>
                      </div>
                    </div>
                    {hasAdvancedReportsAccess && (
                      <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </div>
                    )}
                  </div>

                  {hasAdvancedReportsAccess ? (
                    <>
                      <ul className="space-y-2 mb-4 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Reserve fund analysis
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Fee collection tracking
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Maintenance cost reports
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Budget vs actual analysis
                        </li>
                      </ul>
                      <PrimaryButton
                        onClick={handleAdvancedReportsClick}
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Advanced Reports
                      </PrimaryButton>
                    </>
                  ) : (
                    <>
                      <ul className="space-y-2 mb-4 text-sm text-gray-400">
                        <li className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Reserve fund analysis
                        </li>
                        <li className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Fee collection tracking
                        </li>
                        <li className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Budget vs actual analysis
                        </li>
                      </ul>
                      <button
                        onClick={handleAdvancedReportsClick}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2A2A2A] border border-[#3A3A3A] text-gray-300 rounded-lg hover:bg-[#3A3A3A] transition"
                      >
                        <Crown className="w-4 h-4 text-cyan-400" />
                        Upgrade to Access
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">HOA Fees & Expenses</h3>
                <ChartContainer>
                  <AreaChart
                    id="condo-revenue-chart"
                    data={revenueData}
                    width={800}
                    height={300}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="condoColorFees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="condoColorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid key="condo-grid" strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis key="condo-xaxis" dataKey="month" stroke="#6b7280" />
                    <YAxis key="condo-yaxis" stroke="#6b7280" />
                    <Tooltip
                      key="condo-tooltip"
                      contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                    <Area
                      key="condo-fees-area"
                      name="HOA Fees"
                      type="monotone"
                      dataKey="fees"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#condoColorFees)"
                      animationDuration={300}
                    />
                    <Area
                      key="condo-expenses-area"
                      name="Expenses"
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#condoColorExpenses)"
                      animationDuration={300}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Recent Work Requests */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recent Work Requests</h3>
                  <button
                    onClick={() => setActiveTab('work-requests')}
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {workRequests.slice(0, 5).map(request => (
                    <div key={request.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 hover:border-cyan-500/30 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(request.priority)}`}>
                              {request.priority.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(request.status)}`}>
                              {request.status.toUpperCase()}
                            </span>
                          </div>
                          <h4 className="font-medium text-white mb-1">{request.title}</h4>
                          <p className="text-sm text-gray-400">
                            Unit {request.unit}
                          </p>
                        </div>
                        {request.estimatedCost && (
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Est. Cost</div>
                            <div className="text-lg font-semibold text-white">${request.estimatedCost}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'units' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Condo Units</h2>
                <PrimaryButton>
                  <Building2 className="w-4 h-4" />
                  Add Unit
                </PrimaryButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {units.map(unit => (
                  <div key={unit.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-cyan-500/30 transition">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">Unit {unit.number}</h3>
                        <div className="text-sm text-gray-400">{unit.owner}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUnitStatusColor(unit.status)}`}>
                        {unit.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Monthly Fee:</span>
                        <span className="text-white font-medium">${unit.monthlyFee}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Balance Due:</span>
                        <span className={`font-medium ${unit.balanceDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          ${unit.balanceDue}
                        </span>
                      </div>
                    </div>

                    <button className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition">
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'work-requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Work Requests</h2>
                <PrimaryButton>
                  <Wrench className="w-4 h-4" />
                  Create Request
                </PrimaryButton>
              </div>

              <div className="space-y-3">
                {workRequests.map(request => (
                  <div key={request.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-cyan-500/30 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(request.priority)}`}>
                            {request.priority.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {request.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">{request.title}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Unit:</span>
                            <span className="ml-2 text-white font-medium">{request.unit}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Requested:</span>
                            <span className="ml-2 text-white font-medium">{request.requestedDate}</span>
                          </div>
                          {request.estimatedCost && (
                            <div>
                              <span className="text-gray-400">Est. Cost:</span>
                              <span className="ml-2 text-white font-medium">${request.estimatedCost}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {request.status === 'pending' && (
                          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">
                            Approve
                          </button>
                        )}
                        <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'owners' && (
            <div className="text-center py-16">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Owner Management</h3>
              <p className="text-gray-400 mb-6">View and manage all condo unit owners</p>
              <PrimaryButton>
                <Users className="w-4 h-4" />
                View Owners
              </PrimaryButton>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="text-center py-16">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Financial Management</h3>
              <p className="text-gray-400 mb-6">Track HOA fees, assessments, and expenses</p>
              <PrimaryButton>
                <FileText className="w-4 h-4" />
                View Financials
              </PrimaryButton>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="text-center py-16">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">Reports & Analytics</h3>
              <p className="text-gray-400 mb-6">Generate HOA reports and analyze association performance</p>
              {hasAdvancedReportsAccess ? (
                <PrimaryButton onClick={handleAdvancedReportsClick}>
                  <ExternalLink className="w-4 h-4" />
                  Open Advanced Reports
                </PrimaryButton>
              ) : (
                <button
                  onClick={handleAdvancedReportsClick}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2A2A2A] border border-[#3A3A3A] text-gray-300 rounded-lg hover:bg-[#3A3A3A] transition"
                >
                  <Crown className="w-5 h-5 text-cyan-400" />
                  Upgrade to Access Advanced Reports
                </button>
              )}
            </div>
          )}

          {activeTab === 'referrals' && (
            <div>
              <ReferralRewards />
            </div>
          )}
        </div>
      </div>
    </LayoutManager>
  );
}
