import { useState, useEffect } from 'react';
import {
  Building2, Users, DollarSign, Wrench, FileText, Key,
  Calendar, AlertTriangle, TrendingUp, Home, MessageSquare,
  Settings, Bell, ChevronRight, CheckCircle, Clock, Receipt,
  Phone, Mail, MapPin, ArrowUpRight, Download, Upload, Filter,
  Share2, Camera, Image, Eye, Target, PieChart, TrendingDown,
  Plus, Edit, Trash2, BarChart3, FileSpreadsheet, Award,
  Facebook, Twitter, Instagram, Linkedin, Send, Video, Lock, Star
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import SocialMediaManager from '../SocialMediaManager';
import { LandlordService } from '../../lib/services/propertyManagementService';
import { useUserData } from '../../lib/hooks/useUserData';

export default function LandlordPortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'tenants' | 'maintenance' | 'financials' | 'leases' | 'referrals' | 'portfolio' | 'budget' | 'marketing'>('dashboard');
  const [subscriptionTier, setSubscriptionTier] = useUserData<string>('landlord_subscription_tier', 'basic');
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [landlordData, setLandlordData] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [workRequests, setWorkRequests] = useState<any[]>([]);

  // Get landlord ID from localStorage or URL params
  const landlordId = localStorage.getItem('current_landlord_id') || 'demo-landlord';

  // Subscription access checks
  const hasContentCenterAccess = ['premium', 'elite'].includes(subscriptionTier);
  const hasAdvancedReportsAccess = ['professional', 'premium', 'elite'].includes(subscriptionTier);

  useEffect(() => {
    loadLandlordData();
  }, [landlordId]);

  const loadLandlordData = async () => {
    setLoading(true);
    try {
      // Try to load existing landlord, or create demo landlord
      let landlordResponse = await LandlordService.getById(landlordId);
      
      if (!landlordResponse.success || !landlordResponse.data) {
        // Create demo landlord if it doesn't exist
        const demoLandlordResponse = await LandlordService.create({
          name: 'David Thompson',
          email: 'david@thompsonproperties.com',
          phone: '(555) 345-6789',
          company: 'Thompson Properties LLC',
          memberSince: 'January 2020',
          totalProperties: 8,
          totalUnits: 24,
          occupancyRate: 95.8,
          portfolioValue: 3200000,
          totalEquity: 1800000
        });
        
        if (demoLandlordResponse.success) {
          setLandlordData(demoLandlordResponse.data);
          localStorage.setItem('current_landlord_id', demoLandlordResponse.data.id);
          
          // Create demo properties
          await createDemoProperties(demoLandlordResponse.data.id);
          // Create demo work requests
          await createDemoWorkRequests(demoLandlordResponse.data.id);
        }
      } else {
        setLandlordData(landlordResponse.data);
      }

      // Load properties
      const propertiesResponse = await LandlordService.getProperties(landlordId);
      if (propertiesResponse.success) {
        setProperties(propertiesResponse.data);
      }

      // Load work requests
      const workRequestsResponse = await LandlordService.getWorkRequests(landlordId);
      if (workRequestsResponse.success) {
        setWorkRequests(workRequestsResponse.data);
      }
    } catch (error) {
      // Silently handle error - backend may not be available
      console.log('[LandlordPortal] Using demo data (backend not available)');
    } finally {
      setLoading(false);
    }
  };

  const createDemoProperties = async (landlordId: string) => {
    const demoProperties = [
      {
        address: '123 Oak Street',
        city: 'Portland',
        state: 'OR',
        units: 4,
        type: 'Multi-Family',
        monthlyRent: 7200,
        occupancy: 100,
        status: 'active'
      },
      {
        address: '456 Maple Avenue',
        city: 'Portland',
        state: 'OR',
        units: 1,
        type: 'Single Family',
        monthlyRent: 2400,
        occupancy: 100,
        status: 'active'
      },
      {
        address: '789 Pine Drive',
        city: 'Portland',
        state: 'OR',
        units: 6,
        type: 'Multi-Family',
        monthlyRent: 12000,
        occupancy: 83.3,
        status: 'active'
      }
    ];

    for (const property of demoProperties) {
      await LandlordService.createProperty(landlordId, property);
    }
  };

  const createDemoWorkRequests = async (landlordId: string) => {
    const demoRequests = [
      {
        title: 'HVAC repair needed',
        description: 'Heating system not working in unit 2B',
        category: 'HVAC',
        priority: 'high',
        unitNumber: '2B',
        propertyName: '123 Oak Street',
        residentName: 'Sarah Johnson',
        status: 'pending_approval'
      },
      {
        title: 'Leaky faucet',
        description: 'Kitchen faucet dripping constantly',
        category: 'Plumbing',
        priority: 'medium',
        unitNumber: '3A',
        propertyName: '789 Pine Drive',
        residentName: 'Mike Chen',
        status: 'pending_approval'
      }
    ];

    for (const request of demoRequests) {
      await LandlordService.createWorkRequest(landlordId, request);
    }
  };

  const submitWorkRequest = async (requestData: any) => {
    try {
      const response = await LandlordService.createWorkRequest(landlordId, {
        ...requestData,
        status: 'pending_approval'
      });
      
      if (response.success) {
        toast.success('Work request submitted for landlord approval');
        loadLandlordData(); // Reload data
      } else {
        toast.error('Failed to submit work request');
      }
    } catch (error) {
      console.error('Error submitting work request:', error);
      toast.error('Failed to submit work request');
    }
  };

  // Mock landlord data - use loaded data or defaults
  const landlordInfo = landlordData || {
    name: 'David Thompson',
    email: 'david@thompsonproperties.com',
    phone: '(555) 345-6789',
    company: 'Thompson Properties LLC',
    memberSince: 'January 2020',
    totalProperties: 8,
    totalUnits: 24,
    occupancyRate: 95.8,
    portfolioValue: 3200000,
    totalEquity: 1800000
  };

  // Revenue data
  const revenueData = [
    { id: 'jul-2024', month: 'Jul', rent: 42000, expenses: 12000, net: 30000 },
    { id: 'aug-2024', month: 'Aug', rent: 42000, expenses: 11500, net: 30500 },
    { id: 'sep-2024', month: 'Sep', rent: 43500, expenses: 13200, net: 30300 },
    { id: 'oct-2024', month: 'Oct', rent: 43500, expenses: 11800, net: 31700 },
    { id: 'nov-2024', month: 'Nov', rent: 45000, expenses: 14500, net: 30500 },
    { id: 'dec-2024', month: 'Dec', rent: 45000, expenses: 12200, net: 32800 },
    { id: 'jan-2025', month: 'Jan', rent: 46500, expenses: 13100, net: 33400 }
  ];

  // Portfolio breakdown
  const portfolioData = [
    { id: 'residential', name: 'Residential', value: 65, amount: 2080000 },
    { id: 'multi-family', name: 'Multi-Family', value: 30, amount: 960000 },
    { id: 'commercial', name: 'Commercial', value: 5, amount: 160000 }
  ];

  const COLORS = ['#ea580c', '#3b82f6', '#10b981'];

  // Budget data
  const budgetCategories = [
    { category: 'Mortgage Payments', budgeted: 18000, actual: 18000, variance: 0 },
    { category: 'Property Maintenance', budgeted: 5000, actual: 4200, variance: 800 },
    { category: 'Property Management', budgeted: 3000, actual: 3000, variance: 0 },
    { category: 'Insurance', budgeted: 2500, actual: 2450, variance: 50 },
    { category: 'Property Taxes', budgeted: 4000, actual: 4000, variance: 0 },
    { category: 'Utilities', budgeted: 1800, actual: 2100, variance: -300 },
    { category: 'HOA Fees', budgeted: 800, actual: 800, variance: 0 },
    { category: 'Marketing', budgeted: 1200, actual: 950, variance: 250 },
    { category: 'Legal & Accounting', budgeted: 1000, actual: 850, variance: 150 },
    { category: 'Repairs & Emergency', budgeted: 3000, actual: 1750, variance: 1250 }
  ];

  // Stats
  const stats = [
    { label: 'Monthly Rent', value: '$46.5K', change: '+3.3%', trend: 'up', icon: DollarSign, color: 'orange' },
    { label: 'Occupancy Rate', value: '95.8%', change: '+2.1%', trend: 'up', icon: Building2, color: 'green' },
    { label: 'Active Tenants', value: '23', change: '23/24 units', trend: 'neutral', icon: Users, color: 'blue' },
    { label: 'Open Requests', value: '4', change: '2 urgent', trend: 'attention', icon: Wrench, color: 'yellow' }
  ];

  // Recent tenants
  const tenants = [
    {
      id: 'TEN-045',
      name: 'Sarah Williams',
      property: 'Oakwood Apartments',
      unit: '2B',
      rent: 1800,
      leaseEnd: '2024-12-31',
      status: 'current',
      paymentStatus: 'paid'
    },
    {
      id: 'TEN-046',
      name: 'James Martinez',
      property: 'Downtown Condos',
      unit: '4A',
      rent: 2100,
      leaseEnd: '2024-06-30',
      status: 'current',
      paymentStatus: 'paid'
    },
    {
      id: 'TEN-047',
      name: 'Emily Chen',
      property: 'Riverside Duplex',
      unit: '1',
      rent: 2100,
      leaseEnd: '2024-09-15',
      status: 'current',
      paymentStatus: 'pending'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'good': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'attention': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'paid': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'assigned': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'in-progress': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'portfolio', label: 'Portfolio Tracker', icon: PieChart },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'budget', label: 'Budget Manager', icon: FileSpreadsheet },
    { id: 'marketing', label: 'Social Marketing', icon: Share2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'leases', label: 'Leases', icon: FileText },
    { id: 'referrals', label: 'Referral Rewards', icon: Award }
  ];

  return (
    <LayoutManager pageName="Landlord Portal" enableCustomization={true} showEditButton={true}>
      <div className="w-full min-h-screen bg-[#0A0A0A]">
        {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                Landlord Portal
              </h1>
              <p className="text-gray-400 mt-1">{landlordInfo.company}</p>
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
                      <div className={`text-sm ${
                        stat.trend === 'up' ? 'text-green-400' : stat.trend === 'attention' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {stat.change}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('portfolio')}
                className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 border border-orange-500/30 rounded-xl p-6 hover:border-orange-500/50 transition group text-left"
              >
                <PieChart className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Portfolio Tracker</h3>
                <p className="text-sm text-gray-400">Track portfolio performance and property values</p>
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/50 transition group text-left"
              >
                <FileSpreadsheet className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Budget Manager</h3>
                <p className="text-sm text-gray-400">Manage budgets and track expenses</p>
              </button>
              <button
                onClick={() => setActiveTab('marketing')}
                className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition group text-left"
              >
                <Share2 className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Social Marketing</h3>
                <p className="text-sm text-gray-400">Market rentals on social media platforms</p>
              </button>
            </div>

            {/* Content Center - Premium Feature */}
            <div className={`rounded-xl border p-6 ${hasContentCenterAccess ? 'bg-gradient-to-br from-yellow-600/10 to-orange-600/10 border-yellow-500/30' : 'bg-[#1A1A1A] border-[#2A2A2A]'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasContentCenterAccess ? 'bg-yellow-600/20' : 'bg-[#0A0A0A]'}`}>
                    <FileText className={`w-6 h-6 ${hasContentCenterAccess ? 'text-yellow-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Content Center
                      {hasContentCenterAccess && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                    </h3>
                    <p className="text-sm text-gray-400">Professional property marketing templates and tools</p>
                  </div>
                </div>
                {!hasContentCenterAccess && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 rounded-lg">
                    <Lock className="w-3 h-3 text-orange-400" />
                    <span className="text-xs font-semibold text-orange-400">Premium/Elite</span>
                  </div>
                )}
              </div>

              {hasContentCenterAccess ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button className="bg-[#0A0A0A] border border-yellow-500/30 rounded-lg p-4 hover:border-yellow-500/50 transition text-left group">
                    <FileText className="w-5 h-5 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold text-white mb-1">Lease Templates</p>
                    <p className="text-xs text-gray-400">Professional lease agreements</p>
                  </button>
                  <button className="bg-[#0A0A0A] border border-yellow-500/30 rounded-lg p-4 hover:border-yellow-500/50 transition text-left group">
                    <Bell className="w-5 h-5 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold text-white mb-1">Tenant Notices</p>
                    <p className="text-xs text-gray-400">Legal notice templates</p>
                  </button>
                  <button className="bg-[#0A0A0A] border border-yellow-500/30 rounded-lg p-4 hover:border-yellow-500/50 transition text-left group">
                    <Camera className="w-5 h-5 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold text-white mb-1">Property Marketing</p>
                    <p className="text-xs text-gray-400">Listing photos and ads</p>
                  </button>
                </div>
              ) : (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <p className="text-sm text-gray-400 mb-3">
                    Unlock professional templates and marketing tools with Premium or Elite subscription:
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Professional lease agreement templates
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Tenant notice and legal document templates
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Property listing marketing materials
                    </li>
                  </ul>
                  <PrimaryButton
                    onClick={() => toast.info('Subscription upgrade feature coming soon!')}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Upgrade to Premium
                  </PrimaryButton>
                </div>
              )}
            </div>

            {/* Revenue Chart */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Revenue & Expenses</h2>
                  <p className="text-sm text-gray-400">Monthly rent collection vs expenses</p>
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
                <BarChart data={revenueData} width={800} height={256}>
                  <CartesianGrid key="revenue-grid" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="revenue-xaxis" dataKey="month" stroke="#6B7280" />
                  <YAxis key="revenue-yaxis" stroke="#6B7280" />
                  <Tooltip
                    key="revenue-tooltip"
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar key="rent-bar" id="rent-bar" dataKey="rent" fill="#ea580c" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  <Bar key="expenses-bar" id="expenses-bar" dataKey="expenses" fill="#3b82f6" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Properties Overview */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Properties Overview</h2>
                <button
                  onClick={() => setActiveTab('properties')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {properties.map(property => (
                  <div key={property.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white mb-1">{property.name}</h3>
                        <p className="text-sm text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {property.address}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(property.status)}`}>
                        {property.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Units</p>
                        <p className="text-white font-semibold">{property.occupied}/{property.units}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Monthly Rent</p>
                        <p className="text-white font-semibold">${property.monthlyRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expenses</p>
                        <p className="text-white font-semibold">${property.expenses.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Next Inspection</p>
                        <p className="text-white font-semibold">{property.nextInspection}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Requests */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Recent Maintenance Requests</h2>
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {workRequests.map(request => (
                  <div key={request.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{request.id}</h3>
                          <span className={`text-xs font-semibold ${getPriorityColor(request.priority)}`}>
                            {request.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{request.property} - Unit {request.unitNumber}</p>
                        <p className="text-sm text-white">{request.issue}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(request.status)}`}>
                        {request.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t border-[#2A2A2A]">
                      <div>
                        <p className="text-gray-500">Tenant</p>
                        <p className="text-white font-semibold">{request.tenant}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Assigned To</p>
                        <p className="text-white font-semibold">{request.assignedTo}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Submitted</p>
                        <p className="text-white font-semibold">{request.submitted}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Portfolio Tracker Tab */}
        {activeTab === 'portfolio' && (
          <>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Portfolio Overview</h2>
                  <p className="text-sm text-gray-400">Track your entire property portfolio performance</p>
                </div>
                <PrimaryButton
                  onClick={() => toast.success('Exporting portfolio report...')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </PrimaryButton>
              </div>

              {/* Key Portfolio Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-orange-400" />
                    <p className="text-sm text-gray-400">Portfolio Value</p>
                  </div>
                  <p className="text-2xl font-bold text-white">${(landlordInfo.portfolioValue / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-green-400 mt-1">+12.3% YoY</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <p className="text-sm text-gray-400">Total Equity</p>
                  </div>
                  <p className="text-2xl font-bold text-white">${(landlordInfo.totalEquity / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-green-400 mt-1">56.3% of value</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <p className="text-sm text-gray-400">Annual ROI</p>
                  </div>
                  <p className="text-2xl font-bold text-white">8.7%</p>
                  <p className="text-xs text-green-400 mt-1">Above market avg</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <p className="text-sm text-gray-400">Cash Flow</p>
                  </div>
                  <p className="text-2xl font-bold text-white">$33.4K</p>
                  <p className="text-xs text-green-400 mt-1">+5.8% vs last mo</p>
                </div>
              </div>

              {/* Portfolio Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Portfolio Distribution</h3>
                  <ChartContainer height={256} minHeight={256} dependencies={[activeTab]}>
                    <RechartsPie width={400} height={256}>
                      <Pie
                        key="portfolio-pie"
                        id="portfolio-pie"
                        data={portfolioData}
                        cx={200}
                        cy={128}
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {portfolioData.map((entry, index) => (
                          <Cell key={`portfolio-cell-${entry.id}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        key="portfolio-tooltip"
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                      />
                    </RechartsPie>
                  </ChartContainer>
                </div>

                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Property Type Breakdown</h3>
                  <div className="space-y-4">
                    {portfolioData.map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">{item.name}</span>
                          <span className="text-sm font-semibold text-white">${(item.amount / 1000000).toFixed(2)}M ({item.value}%)</span>
                        </div>
                        <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${item.value}%`,
                              backgroundColor: COLORS[index]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Property Performance Table */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white mb-6">Individual Property Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Property</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Units</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Occupancy</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Monthly Income</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Expenses</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Net Cash Flow</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map(property => {
                      const netCashFlow = property.monthlyRent - property.expenses;
                      const roi = ((netCashFlow * 12) / (property.monthlyRent * 100)) * 100;
                      return (
                        <tr key={property.id} className="border-b border-[#2A2A2A] hover:bg-[#0A0A0A] transition">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-semibold text-white">{property.name}</p>
                              <p className="text-xs text-gray-400">{property.address}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-white">{property.units}</td>
                          <td className="py-4 px-4">
                            <span className="text-white">{((property.occupied / property.units) * 100).toFixed(0)}%</span>
                          </td>
                          <td className="py-4 px-4 text-green-400 font-semibold">${property.monthlyRent.toLocaleString()}</td>
                          <td className="py-4 px-4 text-red-400 font-semibold">${property.expenses.toLocaleString()}</td>
                          <td className="py-4 px-4 text-white font-semibold">${netCashFlow.toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <span className="text-green-400 font-semibold">{roi.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Budget Manager Tab */}
        {activeTab === 'budget' && (
          <>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Budget Manager</h2>
                  <p className="text-sm text-gray-400">Track expenses against budgeted amounts</p>
                </div>
                <div className="flex items-center gap-3">
                  <select className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white text-sm">
                    <option>January 2024</option>
                    <option>December 2023</option>
                    <option>November 2023</option>
                  </select>
                  <PrimaryButton
                    onClick={() => toast.success('Exporting budget report...')}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </PrimaryButton>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <p className="text-sm text-gray-400 mb-2">Total Budgeted</p>
                  <p className="text-2xl font-bold text-white">$40,300</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <p className="text-sm text-gray-400 mb-2">Total Actual</p>
                  <p className="text-2xl font-bold text-white">$38,100</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <p className="text-sm text-gray-400 mb-2">Variance</p>
                  <p className="text-2xl font-bold text-green-400">$2,200</p>
                  <p className="text-xs text-green-400">5.5% under budget</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <p className="text-sm text-gray-400 mb-2">Budget Used</p>
                  <p className="text-2xl font-bold text-white">94.5%</p>
                </div>
              </div>

              {/* Budget Categories */}
              <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Budget Categories</h3>
                <div className="space-y-4">
                  {budgetCategories.map((item, index) => (
                    <div key={index} className="pb-4 border-b border-[#2A2A2A] last:border-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-white mb-1">{item.category}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-400">Budget: <span className="text-white font-semibold">${item.budgeted.toLocaleString()}</span></span>
                            <span className="text-gray-400">Actual: <span className="text-white font-semibold">${item.actual.toLocaleString()}</span></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${item.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.variance >= 0 ? '+' : ''}{item.variance >= 0 ? '$' : '-$'}{Math.abs(item.variance).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {((item.actual / item.budgeted) * 100).toFixed(0)}% used
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.actual > item.budgeted ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((item.actual / item.budgeted) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Top Savings</h3>
                <div className="space-y-3">
                  {budgetCategories
                    .filter(item => item.variance > 0)
                    .sort((a, b) => b.variance - a.variance)
                    .slice(0, 3)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-green-500/20">
                        <p className="text-white">{item.category}</p>
                        <p className="text-green-400 font-semibold">+${item.variance.toLocaleString()}</p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-4">Budget Overruns</h3>
                <div className="space-y-3">
                  {budgetCategories
                    .filter(item => item.variance < 0)
                    .sort((a, b) => a.variance - b.variance)
                    .slice(0, 3)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-red-500/20">
                        <p className="text-white">{item.category}</p>
                        <p className="text-red-400 font-semibold">-${Math.abs(item.variance).toLocaleString()}</p>
                      </div>
                    ))}
                  {budgetCategories.filter(item => item.variance < 0).length === 0 && (
                    <p className="text-gray-400 text-center py-4">No budget overruns this month! 🎉</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Social Marketing Tab */}
        {activeTab === 'marketing' && (
          <>
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Social Media Marketing</h2>
                  <p className="text-sm text-gray-400">Market your rental properties on social media platforms</p>
                </div>
                <PrimaryButton
                  onClick={() => {
                    setSelectedProperty(null);
                    setShowMarketingModal(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </PrimaryButton>
              </div>

              {/* Marketing Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <p className="text-sm text-gray-400">Total Views</p>
                  </div>
                  <p className="text-2xl font-bold text-white">434</p>
                  <p className="text-xs text-green-400 mt-1">+23% this week</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    <p className="text-sm text-gray-400">Inquiries</p>
                  </div>
                  <p className="text-2xl font-bold text-white">20</p>
                  <p className="text-xs text-green-400 mt-1">+5 this week</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="w-5 h-5 text-orange-400" />
                    <p className="text-sm text-gray-400">Active Campaigns</p>
                  </div>
                  <p className="text-2xl font-bold text-white">2</p>
                  <p className="text-xs text-gray-400 mt-1">of 3 properties</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-400" />
                    <p className="text-sm text-gray-400">Conversion Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-white">4.6%</p>
                  <p className="text-xs text-green-400 mt-1">Above average</p>
                </div>
              </div>

              {/* Active Campaigns */}
              <h3 className="text-lg font-bold text-white mb-4">Active Marketing Campaigns</h3>
              <div className="space-y-4">
                {properties.filter(p => p.marketingActive).map(property => (
                  <div key={property.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-1">{property.name}</h4>
                        <p className="text-sm text-gray-400 mb-3">{property.address}</p>
                        <div className="flex items-center gap-4">
                          <span className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20">
                            ACTIVE
                          </span>
                          <span className="text-sm text-gray-400">
                            {property.photos} photos · {property.videos} videos
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SecondaryButton
                          onClick={() => {
                            setSelectedProperty(property);
                            setShowMarketingModal(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </SecondaryButton>
                        <button className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-[#1A1A1A] rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Views</p>
                        <p className="text-xl font-bold text-white">{property.views}</p>
                      </div>
                      <div className="bg-[#1A1A1A] rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Inquiries</p>
                        <p className="text-xl font-bold text-white">{property.inquiries}</p>
                      </div>
                      <div className="bg-[#1A1A1A] rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Shares</p>
                        <p className="text-xl font-bold text-white">{Math.floor(property.views / 10)}</p>
                      </div>
                      <div className="bg-[#1A1A1A] rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Conversion</p>
                        <p className="text-xl font-bold text-white">{((property.inquiries / property.views) * 100).toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Social Platforms */}
                    <div className="flex items-center gap-2 pt-4 border-t border-[#2A2A2A]">
                      <p className="text-sm text-gray-400 mr-2">Posted on:</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Facebook className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                          <Twitter className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                          <Instagram className="w-4 h-4 text-pink-400" />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center">
                          <Linkedin className="w-4 h-4 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Properties */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4">Available Properties (Not Marketed)</h3>
              <div className="space-y-3">
                {properties.filter(p => !p.marketingActive).map(property => (
                  <div key={property.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white mb-1">{property.name}</h4>
                      <p className="text-sm text-gray-400">{property.address}</p>
                      <p className="text-xs text-gray-500 mt-1">{property.photos} photos · {property.videos} videos available</p>
                    </div>
                    <PrimaryButton
                      onClick={() => {
                        setSelectedProperty(property);
                        setShowMarketingModal(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Start Marketing
                    </PrimaryButton>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media Manager Integration */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Share2 className="w-6 h-6 text-orange-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Full Social Media Manager</h3>
                  <p className="text-sm text-gray-400">Access advanced social media management tools</p>
                </div>
              </div>
              <SocialMediaManager />
            </div>
          </>
        )}

        {activeTab === 'properties' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Property Management</h2>
            <p className="text-gray-400">Complete property details and management tools would be displayed here.</p>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Tenant Directory</h2>
            <p className="text-gray-400">Tenant management and communication tools would be displayed here.</p>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Maintenance Requests</h2>
            <p className="text-gray-400">Full maintenance request management would be displayed here.</p>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Financial Reports</h2>
            <p className="text-gray-400">Detailed financial reports and analytics would be displayed here.</p>
          </div>
        )}

        {activeTab === 'leases' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Lease Management</h2>
            <p className="text-gray-400">Lease documents and management tools would be displayed here.</p>
          </div>
        )}

        {activeTab === 'referrals' && (
          <ReferralRewards />
        )}
      </div>
    </div>
    </LayoutManager>
  );
}