import { useState } from 'react';
import {
  Wrench, DollarSign, TrendingUp, FileText, Clock,
  CheckCircle, AlertTriangle, BarChart3, Calendar, Star,
  ArrowUpRight, ArrowDownRight, Download, Search, Filter,
  Home, MessageSquare, Settings, Bell, ChevronRight, Briefcase,
  HardHat, ClipboardList, Hammer, Users, Award, Package,
  TrendingDown, Palette, Lock, Crown, ExternalLink, Pen
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PrimaryButton, SecondaryButton } from '../ui/button';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import PortalUpgradeModal from './PortalUpgradeModal';
import { useUserData } from '../../lib/hooks/useUserData';
import { useUserProfile } from '../../lib/hooks/useUserProfile';
import { toast } from 'sonner@2.0.3';

interface Job {
  id: string;
  project: string;
  client: string;
  value: number;
  progress: number;
  status: string;
  dueDate: string;
  startDate: string;
}

interface Bid {
  id: string;
  project: string;
  client: string;
  bidAmount: number;
  estimatedValue: number;
  deadline: string;
  status: string;
  submittedDate: string;
}

export default function SubcontractorPortal() {
  const { profile, displayName } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'active-jobs' | 'bids' | 'payments' | 'performance' | 'referrals'>('dashboard');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string>('');

  // User-specific data storage
  const [activeJobs, setActiveJobs] = useUserData<Job[]>('subcontractor_jobs', []);
  const [pendingBids, setPendingBids] = useUserData<Bid[]>('subcontractor_bids', []);

  // Subscription tier - determines feature access
  // Tiers: 'basic', 'pro', 'enterprise'
  const [subscriptionTier, setSubscriptionTier] = useUserData<string>('subcontractor_subscription_tier', 'basic');

  // Check if premium features are accessible based on subscription
  const hasContentCenterAccess = ['pro', 'enterprise'].includes(subscriptionTier);
  const hasDesignStudioAccess = ['pro', 'enterprise'].includes(subscriptionTier);
  const hasAdvancedScheduling = ['pro', 'enterprise'].includes(subscriptionTier);
  const hasGPSTracking = ['pro', 'enterprise'].includes(subscriptionTier);

  // Handle Content Center access
  const handleContentCenterClick = () => {
    if (hasContentCenterAccess) {
      window.location.href = '/enterprise-content-center';
    } else {
      setLockedFeature('Content Center');
      setShowUpgradeModal(true);
    }
  };

  // Handle Design Studio access
  const handleDesignStudioClick = () => {
    if (hasDesignStudioAccess) {
      window.location.href = '/design-studio-pro';
    } else {
      setLockedFeature('Design Studio Pro');
      setShowUpgradeModal(true);
    }
  };

  // Handle advanced scheduling access
  const handleAdvancedSchedulingClick = () => {
    if (hasAdvancedScheduling) {
      window.location.href = '/master-scheduling';
    } else {
      setLockedFeature('Advanced Scheduling');
      setShowUpgradeModal(true);
    }
  };

  // Handle GPS tracking access
  const handleGPSTrackingClick = () => {
    if (!hasGPSTracking) {
      setLockedFeature('GPS Crew Tracking');
      setShowUpgradeModal(true);
    }
  };

  // Mock subcontractor data
  const subcontractorInfo = {
    name: 'Elite Construction Services LLC',
    email: 'contact@eliteconstruction.com',
    phone: '(555) 123-4567',
    specialty: 'Electrical & HVAC',
    memberSince: 'January 2023',
    totalJobs: 127,
    activeJobs: 8,
    rating: 4.9,
    license: 'EC-2023-1842'
  };

  // Revenue data
  const revenueData = [
    { month: 'Jul', revenue: 32000, jobs: 11 },
    { month: 'Aug', revenue: 38000, jobs: 13 },
    { month: 'Sep', revenue: 35000, jobs: 12 },
    { month: 'Oct', revenue: 42000, jobs: 15 },
    { month: 'Nov', revenue: 48000, jobs: 16 },
    { month: 'Dec', revenue: 55000, jobs: 18 },
    { month: 'Jan', revenue: 52000, jobs: 17 }
  ];

  // Stats - calculated from real user data
  const stats = [
    { label: 'Active Jobs', value: activeJobs.length.toString(), change: activeJobs.length > 0 ? `${activeJobs.length} active` : 'No active jobs', trend: 'up', icon: Briefcase, color: 'orange' },
    { label: 'Monthly Revenue', value: '$52,000', change: '+18%', trend: 'up', icon: DollarSign, color: 'green' },
    { label: 'Pending Bids', value: pendingBids.length.toString(), change: pendingBids.length > 0 ? `${pendingBids.length} pending` : 'No bids', trend: 'neutral', icon: FileText, color: 'blue' },
    { label: 'Rating', value: '4.9', change: '+0.2', trend: 'up', icon: Star, color: 'yellow' }
  ];

  // Payment schedule
  const paymentSchedule = [
    {
      id: 'INV-2024-156',
      project: 'Commercial Office HVAC Installation',
      amount: 5000,
      dueDate: '2024-02-05',
      status: 'pending',
      type: 'progress-payment'
    },
    {
      id: 'INV-2024-148',
      project: 'Warehouse Electrical Installation',
      amount: 8500,
      dueDate: '2024-01-30',
      status: 'overdue',
      type: 'final-payment'
    },
    {
      id: 'INV-2024-142',
      project: 'Retail Space Lighting',
      amount: 3200,
      dueDate: '2024-01-25',
      status: 'paid',
      type: 'deposit',
      paidDate: '2024-01-24'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'scheduled': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'submitted': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-400" />;
    return null;
  };

  const getStatColor = (color: string) => {
    switch (color) {
      case 'orange': return 'bg-[#ea580c]/20 text-[#ea580c]';
      case 'green': return 'bg-green-500/20 text-green-400';
      case 'blue': return 'bg-blue-500/20 text-blue-400';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Logo Marquee */}
      <LogoMarquee speed={30} />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="subcontractor-portal" dismissible />

      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Company Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ea580c] to-orange-600 rounded-lg flex items-center justify-center">
                <HardHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{subcontractorInfo.name}</h1>
                <p className="text-xs text-gray-400">{subcontractorInfo.specialty}</p>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#ea580c] rounded-full"></span>
              </button>
              <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'active-jobs', label: 'Active Jobs', icon: Briefcase },
              { id: 'bids', label: 'Bids', icon: FileText },
              { id: 'payments', label: 'Payments', icon: DollarSign },
              { id: 'performance', label: 'Performance', icon: BarChart3 },
              { id: 'referrals', label: 'Referrals', icon: Award }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#ea580c] text-[#ea580c]'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#ea580c] to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome back, {displayName.split(' ')[0]}!</h2>
                  <p className="text-white/90 mb-4">
                    You have {activeJobs.length} active jobs and {pendingBids.length} pending bids
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{subcontractorInfo.rating}</span>
                      <span className="text-white/80">Rating</span>
                    </div>
                    <div className="w-px h-4 bg-white/30" />
                    <div className="text-white/80">
                      License: <span className="font-semibold text-white">{subcontractorInfo.license}</span>
                    </div>
                    <div className="w-px h-4 bg-white/30" />
                    <div className="text-white/80">
                      Member since {subcontractorInfo.memberSince}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <PrimaryButton variant="white">
                    <FileText className="w-4 h-4" />
                    Submit New Bid
                  </PrimaryButton>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${getStatColor(stat.color)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {getTrendIcon(stat.trend)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.change}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revenue Chart */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Revenue Overview</h3>
                  <p className="text-sm text-gray-400">Monthly performance trend</p>
                </div>
                <SecondaryButton size="sm">
                  <Download className="w-4 h-4" />
                  Export Report
                </SecondaryButton>
              </div>
              <ChartContainer>
                <AreaChart data={revenueData} height={300}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ea580c"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Active Jobs & Upcoming Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Jobs Summary */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Active Jobs</h3>
                  <button
                    onClick={() => setActiveTab('active-jobs')}
                    className="text-sm text-[#ea580c] hover:text-orange-400 font-medium flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {activeJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1">{job.project}</h4>
                          <p className="text-xs text-gray-400">{job.client}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{job.id}</span>
                        <span>${job.value.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-[#ea580c] h-2 rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{job.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Payments */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Payment Schedule</h3>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="text-sm text-[#ea580c] hover:text-orange-400 font-medium flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {paymentSchedule.map((payment) => (
                    <div key={payment.id} className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1">{payment.project}</h4>
                          <p className="text-xs text-gray-400 capitalize">{payment.type.replace('-', ' ')}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-white">${payment.amount.toLocaleString()}</span>
                        <span className="text-xs text-gray-500">
                          {payment.status === 'paid' ? `Paid ${payment.paidDate}` : `Due ${payment.dueDate}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Premium Features Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Center Access - Premium Feature */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-6 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl" />

                <div className="relative">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${
                      hasContentCenterAccess
                        ? 'bg-gradient-to-br from-purple-600 to-purple-700'
                        : 'bg-[#2A2A2A]'
                    } flex items-center justify-center flex-shrink-0`}>
                      {hasContentCenterAccess ? (
                        <Palette className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">Content Center</h3>
                        {!hasContentCenterAccess && (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {hasContentCenterAccess
                          ? 'Create marketing materials and proposals'
                          : 'Upgrade for professional content tools'
                        }
                      </p>
                    </div>
                  </div>

                  {hasContentCenterAccess ? (
                    <button
                      onClick={handleContentCenterClick}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 group text-sm"
                    >
                      <Palette className="w-4 h-4" />
                      Open Content Center
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => toast.info('View subscription plans to upgrade')}
                        className="w-full bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm"
                      >
                        <Crown className="w-4 h-4" />
                        Upgrade to Premium
                      </button>
                      <div className="p-3 bg-[#0A0A0A] rounded-lg border border-purple-500/20">
                        <p className="text-xs text-gray-400 mb-1.5">
                          <span className="font-semibold text-purple-300">Includes:</span>
                        </p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-purple-400" />
                            Proposal templates & branding
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-purple-400" />
                            Marketing material creator
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-purple-400" />
                            Professional asset library
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Design Studio Pro Access - Premium Feature */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-6 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-pink-600/10 to-transparent rounded-full blur-3xl" />

                <div className="relative">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${
                      hasDesignStudioAccess
                        ? 'bg-gradient-to-br from-pink-600 to-pink-700'
                        : 'bg-[#2A2A2A]'
                    } flex items-center justify-center flex-shrink-0`}>
                      {hasDesignStudioAccess ? (
                        <Pen className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">Design Studio Pro</h3>
                        {!hasDesignStudioAccess && (
                          <span className="px-2 py-0.5 rounded-lg bg-pink-600/20 border border-pink-500/30 text-pink-300 text-xs font-semibold flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {hasDesignStudioAccess
                          ? 'Create custom project designs & renderings'
                          : 'Upgrade for professional design tools'
                        }
                      </p>
                    </div>
                  </div>

                  {hasDesignStudioAccess ? (
                    <button
                      onClick={handleDesignStudioClick}
                      className="w-full bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 group text-sm"
                    >
                      <Pen className="w-4 h-4" />
                      Open Design Studio
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => toast.info('View subscription plans to upgrade')}
                        className="w-full bg-pink-600/10 hover:bg-pink-600/20 border border-pink-500/30 text-pink-300 font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm"
                      >
                        <Crown className="w-4 h-4" />
                        Upgrade to Premium
                      </button>
                      <div className="p-3 bg-[#0A0A0A] rounded-lg border border-pink-500/20">
                        <p className="text-xs text-gray-400 mb-1.5">
                          <span className="font-semibold text-pink-300">Includes:</span>
                        </p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-pink-400" />
                            Project visualization tools
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-pink-400" />
                            Custom design templates
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-pink-400" />
                            3D rendering & mockups
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Tier Indicator */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Current Subscription Plan</p>
                    <p className="text-xs text-gray-400">Manage your features and access</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-lg bg-orange-600/10 border border-orange-500/30 text-orange-300 font-semibold capitalize">
                    {subscriptionTier}
                  </span>
                  <button
                    onClick={() => {
                      // Cycle through tiers for demo
                      const tiers = ['basic', 'professional', 'premium', 'elite'];
                      const currentIndex = tiers.indexOf(subscriptionTier);
                      const nextTier = tiers[(currentIndex + 1) % tiers.length];
                      setSubscriptionTier(nextTier);
                      toast.success(`Subscription changed to ${nextTier.toUpperCase()}`);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#4A4A4A] text-gray-300 hover:text-white font-semibold text-sm transition"
                  >
                    Change Plan (Demo)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Jobs Tab */}
        {activeTab === 'active-jobs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Active Jobs</h2>
                <p className="text-sm text-gray-400">Manage your current projects and track progress</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Filter className="w-4 h-4" />
                  Filter
                </SecondaryButton>
                <SecondaryButton>
                  <Search className="w-4 h-4" />
                  Search
                </SecondaryButton>
              </div>
            </div>

            <div className="grid gap-4">
              {activeJobs.map((job) => (
                <div key={job.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{job.project}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{job.client}</p>
                      <p className="text-xs text-gray-500">{job.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">${job.value.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Project Value</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Start Date</p>
                      <p className="text-sm text-white">{job.startDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Due Date</p>
                      <p className="text-sm text-white">{job.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Progress</p>
                      <p className="text-sm text-white">{job.progress}%</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Overall Progress</span>
                      <span>{job.progress}% Complete</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-[#ea580c] to-orange-600 h-3 rounded-full transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <PrimaryButton size="sm">
                      <ClipboardList className="w-4 h-4" />
                      View Details
                    </PrimaryButton>
                    <SecondaryButton size="sm">
                      <Clock className="w-4 h-4" />
                      Log Time
                    </SecondaryButton>
                    <SecondaryButton size="sm">
                      <MessageSquare className="w-4 h-4" />
                      Messages
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bids Tab */}
        {activeTab === 'bids' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Bid Management</h2>
                <p className="text-sm text-gray-400">Submit and track your project bids</p>
              </div>
              <PrimaryButton>
                <FileText className="w-4 h-4" />
                Create New Bid
              </PrimaryButton>
            </div>

            <div className="grid gap-4">
              {pendingBids.map((bid) => (
                <div key={bid.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{bid.project}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(bid.status)}`}>
                          {bid.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{bid.description}</p>
                      <p className="text-xs text-gray-500">{bid.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">${bid.bidAmount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Bid Amount</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Bid ID</p>
                      <p className="text-sm text-white">{bid.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Closing Date</p>
                      <p className="text-sm text-white">{bid.closingDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Days Remaining</p>
                      <p className={`text-sm font-semibold ${bid.daysLeft <= 3 ? 'text-red-400' : 'text-white'}`}>
                        {bid.daysLeft} days
                      </p>
                    </div>
                  </div>

                  {bid.daysLeft <= 3 && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">Closing soon! Submit your bid before {bid.closingDate}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {bid.status === 'draft' ? (
                      <>
                        <PrimaryButton size="sm">
                          <CheckCircle className="w-4 h-4" />
                          Submit Bid
                        </PrimaryButton>
                        <SecondaryButton size="sm">
                          <FileText className="w-4 h-4" />
                          Edit Draft
                        </SecondaryButton>
                      </>
                    ) : (
                      <>
                        <SecondaryButton size="sm">
                          <FileText className="w-4 h-4" />
                          View Submission
                        </SecondaryButton>
                        <SecondaryButton size="sm">
                          <MessageSquare className="w-4 h-4" />
                          Contact Client
                        </SecondaryButton>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Payment Management</h2>
                <p className="text-sm text-gray-400">Track invoices and payment schedules</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Filter className="w-4 h-4" />
                  Filter
                </SecondaryButton>
                <PrimaryButton>
                  <Download className="w-4 h-4" />
                  Download Report
                </PrimaryButton>
              </div>
            </div>

            {/* Payment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-400">Total Received</span>
                </div>
                <p className="text-3xl font-bold text-white">$48,200</p>
                <p className="text-xs text-green-400 mt-1">+12% from last month</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-400">Pending</span>
                </div>
                <p className="text-3xl font-bold text-white">$13,700</p>
                <p className="text-xs text-gray-400 mt-1">3 invoices pending</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-sm text-gray-400">Overdue</span>
                </div>
                <p className="text-3xl font-bold text-white">$8,500</p>
                <p className="text-xs text-red-400 mt-1">Requires attention</p>
              </div>
            </div>

            {/* Payment List */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0A0A0A] border-b border-gray-800">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Invoice</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Project</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Amount</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Due Date</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {paymentSchedule.map((payment) => (
                      <tr key={payment.id} className="hover:bg-[#0A0A0A] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-white">{payment.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-white">{payment.project}</p>
                            <p className="text-xs text-gray-500 capitalize">{payment.type.replace('-', ' ')}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-white">${payment.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-400">{payment.dueDate}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <SecondaryButton size="sm">
                            <FileText className="w-4 h-4" />
                            View
                          </SecondaryButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Performance Metrics</h2>
              <p className="text-sm text-gray-400">Track your performance and ratings over time</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-400">Average Rating</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">4.9</p>
                <p className="text-xs text-green-400">+0.2 from last month</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-400">Jobs Completed</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">127</p>
                <p className="text-xs text-green-400">+8 this month</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-400">On-Time Rate</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">96%</p>
                <p className="text-xs text-green-400">+2% improvement</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-400">Bid Win Rate</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">68%</p>
                <p className="text-xs text-green-400">+5% from average</p>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Performance Trends</h3>
              <ChartContainer>
                <AreaChart data={revenueData} height={400}>
                  <defs>
                    <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="jobs"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#jobsGradient)"
                    name="Jobs Completed"
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Referral Program</h2>
              <p className="text-sm text-gray-400">Earn rewards by referring new clients and subcontractors</p>
            </div>
            <ReferralRewards userType="subcontractor" />
          </div>
        )}
      </main>

      {/* Upgrade Modal */}
      <PortalUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        portalType="subcontractor"
        currentTier={subscriptionTier}
        lockedFeature={lockedFeature}
      />
    </div>
  );
}
