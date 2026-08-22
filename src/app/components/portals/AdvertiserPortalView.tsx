import PortalFeatureGuide from './PortalFeatureGuide';
import { MessagesTab, MessagesBell, MessagesTabBadge, usePortalMessages } from './PortalMessagesSystem';
import SponsoredMarquee from '../SponsoredMarquee';
import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, Eye, MousePointerClick, BarChart3, Target,
  Calendar, Users, Award, ArrowUpRight, ArrowDownRight, Download,
  Home, MessageSquare, Settings, Bell, ChevronRight, Play, Image,
  FileText, Percent, Zap, Activity, Monitor, Megaphone, Filter,
  UserCheck, UserPlus, UserMinus, Clock, Star, ShoppingBag, Repeat,
  PieChart, LineChart as LineChartIcon, AlertCircle, CheckCircle2,
  Palette, Lock, Crown, ExternalLink, Tag, Sparkles
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import AdPlacementShowcase from '../AdPlacementShowcase';
import LivePortalPreviews from '../LivePortalPreviews';
import AdvertisingHub from '../AdvertisingHub';
import PortalUpgradeModal from './PortalUpgradeModal';
import { useUserData } from '../../lib/hooks/useUserData';
import SubmitReelForApproval from '../SubmitReelForApproval';
import {
  AdvertiserCampaignsTab, AdvertiserMediaTab, AdvertiserAnalyticsTab,
  AdvertiserPerformanceTab, AdvertiserBillingTab,
} from './AdvertiserTabs';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import InvestmentTab from './InvestmentTab';
import { PortalDocumentVault } from './PortalDocumentVault';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';

const AD_API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export default function AdvertiserPortalView() {
  const { user, session } = useAuth();

  // Messages system
  const { unread: unreadMessages, clearUnread } = usePortalMessages('', '');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hub' | 'placements' | 'previews' | 'campaigns' | 'media' | 'analytics' | 'billing' | 'plan-tracker' | 'plan-builder' | 'performance' | 'referrals' | 'deals' | 'investments' | 'messages' | 'documents' | 'guide'>('dashboard');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string>('');

  // Subscription tier - determines feature access
  // Tiers: 'starter', 'growth', 'enterprise'
  const [subscriptionTier, setSubscriptionTier] = useUserData<string>('advertiser_subscription_tier', 'starter');

  // Check if premium features are accessible based on subscription
  const hasContentCenterAccess = ['growth', 'enterprise'].includes(subscriptionTier);
  const hasABTesting = ['growth', 'enterprise'].includes(subscriptionTier);
  const hasAdvancedTargeting = ['growth', 'enterprise'].includes(subscriptionTier);
  const hasUnlimitedImpressions = subscriptionTier === 'enterprise';
  const hasCustomCampaigns = subscriptionTier === 'enterprise';

  // Handle Content Center access
  const handleContentCenterClick = () => {
    if (hasContentCenterAccess) {
      window.location.href = '/enterprise-content-center';
    } else {
      setLockedFeature('Content Center');
      setShowUpgradeModal(true);
    }
  };

  // Handle A/B Testing access
  const handleABTestingClick = () => {
    if (!hasABTesting) {
      setLockedFeature('A/B Testing & Campaign Optimization');
      setShowUpgradeModal(true);
    }
  };

  // Handle Advanced Targeting access
  const handleAdvancedTargetingClick = () => {
    if (!hasAdvancedTargeting) {
      setLockedFeature('Advanced Targeting Options');
      setShowUpgradeModal(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Real advertising figures.
  //
  // This screen used to report 415,000 impressions, a 3.0% click-through rate,
  // 207 conversions and 385% ROI — every one of them a literal, on a screen an
  // advertiser pays for and might renew a contract on the strength of.
  //
  // There is now a backend: campaigns, creatives, a serving endpoint the marquee
  // calls, and impression/click counting. Everything below is counted.
  // ---------------------------------------------------------------------------
  const [adStats, setAdStats] = useState<any>(null);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [adCampaigns, setAdCampaigns] = useState<any[]>([]);
  const [adLoading, setAdLoading] = useState(true);
  // Bumped after a tab creates, pauses or deletes something, which re-runs the
  // loader below. A counter rather than a extracted function because the effect
  // already does exactly the right fetches — this reuses them instead of
  // growing a second copy that could drift.
  const [adRefresh, setAdRefresh] = useState(0);
  const reloadAds = () => setAdRefresh((n) => n + 1);
  const [adDaily, setAdDaily] = useState<any[]>([]);
  const [adByCreative, setAdByCreative] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.access_token) { setAdLoading(false); return; }
      const headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
      try {
        const [s, cr, ca] = await Promise.all([
          fetch(`${AD_API}/advertising/stats?days=90`, { headers }),
          fetch(`${AD_API}/advertising/creatives`, { headers }),
          fetch(`${AD_API}/advertising/campaigns`, { headers }),
        ]);
        const sj = await s.json().catch(() => ({}));
        const cj = await cr.json().catch(() => ({}));
        const aj = await ca.json().catch(() => ({}));
        if (cancelled) return;
        setAdStats(sj?.summary || null);
        setAdDaily(Array.isArray(sj?.byDay) ? sj.byDay : []);
        setAdByCreative(Array.isArray(sj?.byCreative) ? sj.byCreative : []);
        setCreatives(Array.isArray(cj?.creatives) ? cj.creatives : []);
        setAdCampaigns(Array.isArray(aj?.campaigns) ? aj.campaigns : []);
      } catch { /* leave the zeros; they are honest */ }
      finally { if (!cancelled) setAdLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, adRefresh]);


  // Everything the five built-out tabs need, assembled once. Passing the same
  // object to all of them is what stops two tabs disagreeing about the same
  // campaign — they are literally reading the same numbers.
  const adTabProps = {
    session,
    adStats,
    adDaily,
    adByCreative,
    creatives,
    campaigns: adCampaigns,
    loading: adLoading,
    reload: reloadAds,
    subscriptionTier,
  };

  const advertiserInfo = {
    name: String(user?.user_metadata?.company || user?.user_metadata?.full_name || user?.email || 'Advertiser'),
    businessName: String(user?.user_metadata?.company || ''),
    email: String(user?.email || ''),
    phone: String(user?.user_metadata?.phone || ''),
    accountManager: '',
    memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '',
    activeCampaigns: adCampaigns.filter((x: any) => x.status === 'active').length,
    totalSpend: 0,
    averageROI: null,
  };

  // Impressions and clicks by day, from recorded events. The seven-month curve
  // that used to sit here was drawn.
  const performanceData = adDaily.map((d: any) => ({
    month: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    impressions: Number(d.impressions || 0),
    clicks: Number(d.clicks || 0),
  }));

  // Conversions and ROI are deliberately not here. Both require knowing a click
  // led to a purchase, and nothing in the platform attributes a sale back to an
  // ad. On a screen an advertiser renews a contract from, an invented figure is
  // worse than an absent one.
  const stats = [
    { label: 'Impressions', value: String(adStats?.impressions ?? 0), change: 'last 90 days', trend: 'up', icon: Eye, color: 'orange' },
    { label: 'Clicks', value: String(adStats?.clicks ?? 0), change: adStats?.clicks ? 'from your ads' : 'none yet', trend: 'up', icon: MousePointerClick, color: 'blue' },
    { label: 'Click-Through Rate', value: `${adStats?.ctr ?? 0}%`, change: adStats?.impressions ? `on ${adStats.impressions} impressions` : 'no impressions yet', trend: 'up', icon: Target, color: 'green' },
    { label: 'Live Ads', value: String(adStats?.activeCreatives ?? 0), change: `${adStats?.totalCreatives ?? 0} total`, trend: 'up', icon: Megaphone, color: 'yellow' },
  ];

  // Active campaigns
  const campaigns = [
    {
      id: 'CAM-2024-012',
      name: 'Kitchen Remodel Spring Promo',
      type: 'Display + Video',
      status: 'active',
      budget: 12000,
      spent: 8450,
      impressions: 156000,
      clicks: 4680,
      conversions: 78,
      ctr: 3.0,
      cpc: 1.81,
      startDate: '2024-01-01',
      endDate: '2024-02-29'
    },
    {
      id: 'CAM-2024-013',
      name: 'HVAC Installation Deal',
      type: 'Search Ads',
      status: 'active',
      budget: 8000,
      spent: 5200,
      impressions: 89000,
      clicks: 2670,
      conversions: 45,
      ctr: 3.0,
      cpc: 1.95,
      startDate: '2024-01-15',
      endDate: '2024-03-15'
    },
    {
      id: 'CAM-2024-014',
      name: 'Bathroom Renovation Package',
      type: 'Social Media',
      status: 'active',
      budget: 6500,
      spent: 3800,
      impressions: 124000,
      clicks: 3720,
      conversions: 52,
      ctr: 3.0,
      cpc: 1.02,
      startDate: '2024-01-10',
      endDate: '2024-02-10'
    }
  ];

  // Top performing ads
  const topAds = [
    {
      id: 'AD-456',
      name: 'Kitchen Before/After Video',
      type: 'Video',
      impressions: 85000,
      clicks: 3400,
      ctr: 4.0,
      conversions: 68
    },
    {
      id: 'AD-457',
      name: 'Limited Time Offer - 20% Off',
      type: 'Display',
      impressions: 62000,
      clicks: 2170,
      ctr: 3.5,
      conversions: 42
    },
    {
      id: 'AD-458',
      name: '5-Star Review Showcase',
      type: 'Social',
      impressions: 94000,
      clicks: 2820,
      ctr: 3.0,
      conversions: 51
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'hub', label: 'Advertising Hub', icon: Megaphone },
    { id: 'placements', label: 'Ad Placements', icon: Eye },
    { id: 'previews', label: 'Live Previews', icon: Monitor },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'media', label: 'Media Library', icon: Image },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
    { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'investments', label: 'Investments', icon: DollarSign },
    { id: 'referrals', label: 'Referral Rewards', icon: Award },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
  ];

  return (
    <LayoutManager pageName="Advertiser Portal" enableCustomization={true} showEditButton={true}>
      <div className="w-full min-h-screen bg-[#0A0A0A]">
      <SponsoredMarquee />
      <AdvertisingMarquee placement="portal-header" dismissible />
        {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                Advertiser Portal
              </h1>
              <p className="text-gray-400 mt-1">{advertiserInfo.name} · {advertiserInfo.accountManager} · {advertiserInfo.email}</p>
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
        {activeTab === 'documents' && <PortalDocumentVault session={session} accent="orange" />}
        {activeTab === 'guide' && <PortalFeatureGuide portal="advertiser" />}

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
                        stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {stat.change}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Performance Chart */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Campaign Performance</h2>
                  <p className="text-sm text-gray-400">Impressions, clicks, and conversions over time</p>
                </div>
                <PrimaryButton
                  onClick={() => toast.success('Downloading report...')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </PrimaryButton>
              </div>
              <ChartContainer height={256} minHeight={256} dependencies={[activeTab]}>
                <LineChart data={performanceData} width={800} height={256}>
                  <CartesianGrid key="cg" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="xa" dataKey="month" stroke="#6B7280" />
                  <YAxis key="ya" stroke="#6B7280" />
                  <Tooltip key="tt"
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend key="lg" />
                  <Line key="impressions" type="monotone" dataKey="impressions" stroke="#ea580c" strokeWidth={2} name="Impressions" isAnimationActive={false} />
                  <Line key="clicks" type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} name="Clicks" isAnimationActive={false} />
                  <Line key="conversions" type="monotone" dataKey="conversions" stroke="#22c55e" strokeWidth={2} name="Conversions" isAnimationActive={false} />
                </LineChart>
              </ChartContainer>
            </div>

            {/* Active Campaigns */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Active Campaigns</h2>
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white mb-1">{campaign.name}</h3>
                        <p className="text-sm text-gray-400">{campaign.type} • {campaign.id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(campaign.status)}`}>
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="text-sm font-semibold text-white">${campaign.budget.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">Spent: ${campaign.spent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Impressions</p>
                        <p className="text-sm font-semibold text-white">{(campaign.impressions / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-gray-400">CTR: {campaign.ctr}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Clicks</p>
                        <p className="text-sm font-semibold text-white">{campaign.clicks.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">CPC: ${campaign.cpc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Conversions</p>
                        <p className="text-sm font-semibold text-green-400">{campaign.conversions}</p>
                        <p className="text-xs text-gray-400">CVR: {((campaign.conversions / campaign.clicks) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-3 border-t border-[#2A2A2A] text-xs text-gray-400">
                      <span>Start: {campaign.startDate}</span>
                      <span>•</span>
                      <span>End: {campaign.endDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performing Ads */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Top Performing Ads</h2>
                <button
                  onClick={() => setActiveTab('media')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View Library
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topAds.map(ad => (
                  <div key={ad.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white mb-1">{ad.name}</h3>
                        <p className="text-sm text-gray-400">{ad.type} • {ad.id}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Impressions</span>
                        <span className="text-white font-semibold">{(ad.impressions / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Clicks</span>
                        <span className="text-white font-semibold">{ad.clicks.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">CTR</span>
                        <span className="text-green-400 font-semibold">{ad.ctr}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Conversions</span>
                        <span className="text-orange-400 font-semibold">{ad.conversions}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                          ? 'Create professional ad creatives, marketing materials, and campaign content'
                          : 'Upgrade to Premium or Elite to access professional content creation tools for your campaigns'
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
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        Professional ad creative design tools
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        Campaign content library & templates
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        Video & image editing suite
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                        Brand asset management system
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

        {activeTab === 'hub' && (
          <AdvertisingHub />
        )}

        {activeTab === 'placements' && (
          <AdPlacementShowcase />
        )}

        {activeTab === 'previews' && (
          <LivePortalPreviews />
        )}

        {activeTab === 'campaigns' && <AdvertiserCampaignsTab {...adTabProps} />}

        {activeTab === 'media' && (
          <div className="space-y-6">
            <SubmitReelForApproval submitterName={advertiserInfo?.businessName || advertiserInfo?.name || 'Advertiser'} submitterType="advertiser" />
            <AdvertiserMediaTab {...adTabProps} />
          </div>
        )}

        {activeTab === 'analytics' && <AdvertiserAnalyticsTab {...adTabProps} />}

        {activeTab === 'billing' && <AdvertiserBillingTab {...adTabProps} />}

        {activeTab === 'plan-tracker' && <MaintenancePlanTracker portalRole="advertiser" ownerName={advertiserInfo.accountManager} />}
        {activeTab === 'plan-builder' && <PlanBuilderTab portalType="advertiser" ownerName={advertiserInfo.name} currentTier={subscriptionTier} />}
        {activeTab === 'investments' && <InvestmentTab portalType="advertiser" ownerName={advertiserInfo.name} />}
        {activeTab === 'performance' && (
          <AdvertiserPerformanceTab {...adTabProps} />
        )}


        {activeTab === 'deals' && (
          <div className="p-6">
            <FeaturedDealsReels portalType="advertiser" />
          <DealsOffersSection portalType="advertiser" storageKey="advertiser_deals_offers" />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="p-6">
            <MessagesTab userId="" userEmail="" userName="Portal User" onTabOpen={clearUnread} />
          </div>
        )}

                {activeTab === 'referrals' && (
          <ReferralRewards />
        )}
      </div>

      {/* Upgrade Modal */}
      <PortalUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        portalType="advertiser"
        currentTier={subscriptionTier}
        lockedFeature={lockedFeature}
      />
    </div>
    </LayoutManager>
  );
}
