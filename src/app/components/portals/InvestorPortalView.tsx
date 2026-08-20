import PortalFeatureGuide from './PortalFeatureGuide';
import { MessagesTab, MessagesBell, MessagesTabBadge, usePortalMessages } from './PortalMessagesSystem';
import SponsoredMarquee from '../SponsoredMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, Building2, PieChart, BarChart3, FileText,
  Calendar, Target, Award, ArrowUpRight, ArrowDownRight, Download,
  Home, MessageSquare, Settings, Bell, ChevronRight, Briefcase,
  Activity, Clock, CheckCircle, AlertCircle, Percent, Wallet, X,
  Users, MapPin, TrendingDown, Calculator, Shield, Info, ExternalLink,
  Megaphone, Sparkles
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import LayoutManager from '../layout-editor/LayoutManager';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { ChartContainer } from '../ChartContainer';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import InvestmentApplication from './InvestmentApplication';
import InvestmentContract from './InvestmentContract';
import PlanBuilderTab from './PlanBuilderTab';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const INVEST_API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/investments`;

export default function InvestorPortalView() {
  
  // Messages system
  const { unread: unreadMessages, clearUnread } = usePortalMessages('', '');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'opportunities' | 'reports' | 'distributions' | 'documents' | 'plan-tracker' | 'plan-builder' | 'referrals' | 'messages'>('dashboard');
  const [opportunityFilter, setOpportunityFilter] = useState<'all' | 'company' | 'property'>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [showApplication, setShowApplication] = useState(false);
  const [applicationData, setApplicationData] = useState<any>(null);
  const [showContract, setShowContract] = useState(false);

  // ---------------------------------------------------------------------------
  // Real data. Every figure below comes from the investments API.
  //
  // This screen used to be 543 lines of object literals — a portfolio worth
  // $3.25M, twelve properties, a seven-month performance curve, all invented.
  // That was survivable while nobody could reach it. It is not survivable for a
  // screen whose whole job is to show real performance to someone deciding
  // whether to put money in, so the literals are gone and nothing renders unless
  // the server returned it.
  //
  // The backend for this already existed and was simply never called:
  //   GET /investments/analytics/portfolio/:email  -> summary + commitments + payouts
  //   GET /investments/opportunities               -> open deals
  // ---------------------------------------------------------------------------
  const { user, session } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [allOpportunities, setAllOpportunities] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const investorEmail = String(user?.email || '').toLowerCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
          'Content-Type': 'application/json',
        };

        // Opportunities are public to any signed-in investor; the portfolio is
        // per-person and needs an email, so it is skipped when we do not have one
        // rather than being requested for nobody.
        const oppRes = await fetch(`${INVEST_API}/opportunities`, { headers });
        const oppJson = await oppRes.json().catch(() => ({}));
        if (!cancelled) setAllOpportunities(Array.isArray(oppJson.opportunities) ? oppJson.opportunities : []);

        if (investorEmail) {
          const portRes = await fetch(`${INVEST_API}/analytics/portfolio/${encodeURIComponent(investorEmail)}`, { headers });
          const portJson = await portRes.json().catch(() => ({}));
          if (!cancelled) {
            setSummary(portJson.summary || null);
            setCommitments(Array.isArray(portJson.commitments) ? portJson.commitments : []);
            setPayouts(Array.isArray(portJson.recentPayouts) ? portJson.recentPayouts : []);
          }

          const mine = Array.isArray(portJson.commitments) ? portJson.commitments : [];

          // Documents are stored against the opportunity, so an investor's
          // documents are the ones attached to deals they actually committed to.
          // Fetched together rather than in sequence; one failing opportunity
          // should not cost the others their paperwork.
          const oppIds = [...new Set(mine.map((x: any) => String(x.opportunity_id || '')).filter(Boolean))];
          const docSets = await Promise.all(
            oppIds.map(async (oid) => {
              try {
                const r = await fetch(`${INVEST_API}/documents/opportunity/${encodeURIComponent(oid)}`, { headers });
                const j = await r.json().catch(() => ({}));
                const opp = mine.find((x: any) => String(x.opportunity_id) === oid)?.opportunity;
                return (Array.isArray(j.documents) ? j.documents : []).map((d: any) => ({
                  ...d, opportunityId: oid, opportunityTitle: opp?.title || '',
                }));
              } catch { return []; }
            }),
          );
          if (!cancelled) setDocuments(docSets.flat());

          try {
            const repRes = await fetch(`${INVEST_API}/ai-reports/${encodeURIComponent(investorEmail)}`, { headers });
            const repJson = await repRes.json().catch(() => ({}));
            if (!cancelled) setReports(Array.isArray(repJson.reports) ? repJson.reports : []);
          } catch { /* reports are an extra, not a reason to fail the page */ }
        }
      } catch (error: any) {
        if (!cancelled) setLoadError(error?.message || 'Could not load your portfolio.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [investorEmail, session?.access_token]);

  // Compact form for the stat tiles, where "$3,250,000" would wrap.
  /** Full precision, for tables where the exact figure is the point. */
  const money = (n: number) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
  const compact = (n: number) => {
    const v = Number(n || 0);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
    return `$${v}`;
  };

  const totalInvested = Number(summary?.totalInvested || 0);
  const totalReceived = Number(summary?.totalReceived || 0);
  const currentValue = Number(summary?.currentValue || 0);

  const investorInfo = {
    name: String(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Investor'),
    email: investorEmail,
    phone: String(user?.user_metadata?.phone || ''),
    company: String(user?.user_metadata?.company || ''),
    accountManager: '',
    memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '',
    totalInvested,
    currentValue,
    totalROI: Number(summary?.totalROI || 0),
  };

  // Performance over time, built from actual completed payouts rather than a
  // drawn curve. With no payouts yet there is no line, which is the truth.
  const performanceData = (() => {
    const done = [...payouts]
      .filter((p) => p?.payout_date)
      .sort((a, b) => String(a.payout_date).localeCompare(String(b.payout_date)));
    if (!done.length) return [];
    let running = totalInvested;
    return done.map((p) => {
      running += Number(p.amount || 0);
      return {
        month: new Date(p.payout_date).toLocaleDateString(undefined, { month: 'short' }),
        value: running,
        roi: totalInvested > 0 ? Number((((running - totalInvested) / totalInvested) * 100).toFixed(1)) : 0,
      };
    });
  })();

  const stats = [
    { label: 'Portfolio Value', value: compact(currentValue), change: totalReceived > 0 ? `+${compact(totalReceived)} received` : 'No distributions yet', trend: 'up', icon: Wallet, color: 'orange' },
    { label: 'Total ROI', value: `${summary?.totalROI ?? 0}%`, change: totalInvested > 0 ? `on ${compact(totalInvested)} invested` : 'No capital committed yet', trend: 'up', icon: TrendingUp, color: 'green' },
    { label: 'Active Investments', value: String(summary?.activeInvestments ?? 0), change: `${summary?.completedInvestments ?? 0} completed`, trend: 'up', icon: Building2, color: 'blue' },
    { label: 'Distributions', value: String(summary?.totalPayouts ?? 0), change: totalReceived > 0 ? `${compact(totalReceived)} total` : 'None yet', trend: 'up', icon: DollarSign, color: 'yellow' },
  ];

  // The portfolio list is the investor's own commitments, each carrying the
  // opportunity it was made against (hydrated server-side).
  const properties = commitments.map((commit: any) => {
    const opp = commit.opportunity || {};
    const invested = Number(commit.commitment_amount || 0);
    const received = Number(commit.total_received || 0);
    return {
      id: commit.id,
      name: String(opp.title || 'Investment'),
      type: String(opp.category || 'Investment'),
      location: String(opp.location || ''),
      invested,
      currentValue: invested + received,
      roi: invested > 0 ? Number((((received) / invested) * 100).toFixed(1)) : 0,
      monthlyIncome: 0,
      status: String(commit.status || 'pending'),
      occupancy: null,
    };
  });

  // The mock data stored `funded` as a percentage; the server stores it as the
  // dollars actually raised, with `targetRaise` alongside. Rendering the raw
  // field with a % sign produced "Funded 400000%" — believable-looking nonsense
  // on the one screen that has to look credible to someone with money.
  const fundedPct = (o: any) => {
    const raised = Number(o?.funded || 0);
    const target = Number(o?.targetRaise || 0);
    if (!target) return 0;
    return Math.min(100, Math.round((raised / target) * 100));
  };

  // The screen shows company deals and property deals separately, so split on
  // the category the opportunity was published with.
  const isCompanyDeal = (o: any) => /company|equity|revenue|partnership/i.test(String(o?.category || ''));
  const companyOpportunities = allOpportunities.filter(isCompanyDeal);
  const propertyOpportunities = allOpportunities.filter((o) => !isCompanyDeal(o));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'performing': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'attention': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'open': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'distributions', label: 'Distributions', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'plan-tracker', label: 'Fee Tracker', icon: BarChart3 },
    { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
    { id: 'deals', label: 'Deals & Reels', icon: Megaphone },
    { id: 'referrals', label: 'Referral Rewards', icon: Award },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
  ];

  const handleOpenOpportunity = (opportunity: any) => {
    setSelectedOpportunity(opportunity);
    setInvestmentAmount(opportunity.minInvestment.toString());
    setShowOpportunityModal(true);
  };

  const handleInvest = () => {
    const amount = parseFloat(investmentAmount);
    if (amount < selectedOpportunity.minInvestment) {
      toast.error(`Minimum investment is $${selectedOpportunity.minInvestment.toLocaleString()}`);
      return;
    }
    if (selectedOpportunity.maxInvestment && amount > selectedOpportunity.maxInvestment) {
      toast.error(`Maximum investment is $${selectedOpportunity.maxInvestment.toLocaleString()}`);
      return;
    }

    // Close the opportunity modal and open the application
    setShowOpportunityModal(false);
    setShowApplication(true);
  };

  const handleApplicationSubmit = (appData: any) => {
    setApplicationData(appData);
    setShowApplication(false);
    setShowContract(true);
    toast.success('Application submitted! Review your investment contract below.');
  };

  const calculateProjectedReturn = () => {
    if (!selectedOpportunity || !investmentAmount) return 0;
    const amount = parseFloat(investmentAmount);
    return (amount * selectedOpportunity.projectedROI) / 100;
  };

  return (
    <LayoutManager pageName="Investor Portal" enableCustomization={true} showEditButton={true}>
      <div className="min-h-screen bg-[#0A0A0A]" style={{ display: 'block', width: '100%' }}>
        <SponsoredMarquee />
        {/* Investment Application */}
        {showApplication && selectedOpportunity && (
          <InvestmentApplication
            opportunity={selectedOpportunity}
            investmentAmount={parseFloat(investmentAmount)}
            onClose={() => setShowApplication(false)}
            onSubmit={handleApplicationSubmit}
          />
        )}

        {/* Investment Contract */}
        {showContract && applicationData && selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
            <div className="my-8 w-full flex items-center justify-center">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowContract(false);
                    setApplicationData(null);
                    toast.success('Contract saved to your documents!');
                  }}
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-red-500/30 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <InvestmentContract
                  applicationData={applicationData}
                  opportunity={selectedOpportunity}
                />
              </div>
            </div>
          </div>
        )}

        {/* Opportunity Detail Modal */}
        {showOpportunityModal && selectedOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-start justify-between z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{selectedOpportunity.title}</h2>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      selectedOpportunity.category === 'Company Equity'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}>
                      {selectedOpportunity.highlight}
                    </span>
                  </div>
                  <p className="text-gray-400">{selectedOpportunity.category}</p>
                  {selectedOpportunity.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {selectedOpportunity.location}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowOpportunityModal(false)}
                  className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-red-500/30 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Projected ROI</p>
                    <p className="text-2xl font-bold text-green-400">{selectedOpportunity.projectedROI}%</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Min Investment</p>
                    <p className="text-xl font-bold text-white">${(selectedOpportunity.minInvestment / 1000)}K</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Term</p>
                    <p className="text-xl font-bold text-white">{selectedOpportunity.term}</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Funded</p>
                    <p className="text-xl font-bold text-blue-400">{fundedPct(selectedOpportunity)}%</p>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-xs text-gray-500 mb-1">Investors</p>
                    <p className="text-xl font-bold text-white">{selectedOpportunity.investors}</p>
                  </div>
                </div>

                {/* Funding Progress */}
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">Funding Progress</p>
                    <p className="text-sm text-gray-400">
                      ${((selectedOpportunity.targetRaise * selectedOpportunity.funded) / 100).toLocaleString()} of ${selectedOpportunity.targetRaise.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full bg-[#1A1A1A] rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all"
                      style={{ width: `${fundedPct(selectedOpportunity)}%` }}
                    />
                  </div>
                </div>

                {/* Project Funding Counter - Only for specific opportunities */}
                {selectedOpportunity.needsMoreFunding && (
                  <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-400" />
                          Project Funding Counter
                        </h3>
                        <p className="text-sm text-gray-400">Minimum needed to begin project execution</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="text-sm font-semibold text-yellow-400">Fundraising</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Minimum to Start</p>
                        <p className="text-xl font-bold text-white">${(selectedOpportunity.minimumToStart / 1000000).toFixed(1)}M</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-green-500/20 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Committed So Far</p>
                        <p className="text-xl font-bold text-green-400">${(selectedOpportunity.currentCommitments / 1000000).toFixed(1)}M</p>
                      </div>
                      <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Still Needed</p>
                        <p className="text-xl font-bold text-orange-400">
                          ${((selectedOpportunity.minimumToStart - selectedOpportunity.currentCommitments) / 1000000).toFixed(1)}M
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-white">Progress to Project Start</p>
                        <p className="text-sm text-gray-400">
                          {((selectedOpportunity.currentCommitments / selectedOpportunity.minimumToStart) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-full bg-[#1A1A1A] rounded-full h-4">
                        <div
                          className="h-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(selectedOpportunity.currentCommitments / selectedOpportunity.minimumToStart) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            {((selectedOpportunity.currentCommitments / selectedOpportunity.minimumToStart) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">Committed Investors</p>
                        <p className="text-xs text-gray-400">
                          <strong className="text-white">{selectedOpportunity.investors} investors</strong> have committed ${(selectedOpportunity.currentCommitments / 1000000).toFixed(1)}M.
                          Once we reach ${(selectedOpportunity.minimumToStart / 1000000).toFixed(1)}M, the project will begin immediately.
                          Your investment is held in escrow until the minimum is reached.
                        </p>
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3 mt-4">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">Silent Investment Structure</p>
                        <p className="text-xs text-gray-400">
                          This is a <strong className="text-white">passive, silent investment</strong>. You will have full access to all financial reports
                          and performance data, but <strong className="text-white">no operational control or decision-making authority</strong>. All
                          project decisions are made by the professional management team.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-orange-400" />
                    Investment Overview
                  </h3>
                  <p className="text-gray-300 leading-relaxed mb-4">{selectedOpportunity.detailedDescription}</p>

                  {/* Property Details if applicable */}
                  {selectedOpportunity.propertyDetails && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#2A2A2A]">
                      <div>
                        <p className="text-xs text-gray-500">Property Type</p>
                        <p className="text-white font-semibold">{selectedOpportunity.propertyDetails.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Bedrooms</p>
                        <p className="text-white font-semibold">{selectedOpportunity.propertyDetails.bedrooms} BR</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Square Feet</p>
                        <p className="text-white font-semibold">{selectedOpportunity.propertyDetails.sqft.toLocaleString()} sqft</p>
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <p className="text-xs text-gray-500 mb-2">Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOpportunity.propertyDetails.amenities.map((amenity: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-gray-300">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Key Benefits */}
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Key Benefits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(selectedOpportunity.benefits || []).map((benefit: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-[#1A1A1A] border border-green-500/20 rounded-lg p-3">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-300">{benefit}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Projections */}
                {selectedOpportunity.projections && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Financial Projections
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2A2A2A]">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Year</th>
                            {selectedOpportunity.projections[0].propertyValue !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Property Value</th>
                            )}
                            {selectedOpportunity.projections[0].revenue !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Revenue</th>
                            )}
                            {selectedOpportunity.projections[0].rentalIncome !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Rental Income</th>
                            )}
                            {selectedOpportunity.projections[0].distribution !== undefined && (
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Distribution</th>
                            )}
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Cumulative ROI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOpportunity.projections.map((proj: any, idx: number) => (
                            <tr key={idx} className="border-b border-[#2A2A2A]">
                              <td className="py-3 px-4 text-white font-semibold">Year {proj.year}</td>
                              {proj.propertyValue !== undefined && (
                                <td className="py-3 px-4 text-white">${(proj.propertyValue / 1000000).toFixed(2)}M</td>
                              )}
                              {proj.revenue !== undefined && (
                                <td className="py-3 px-4 text-white">${(proj.revenue / 1000000).toFixed(2)}M</td>
                              )}
                              {proj.rentalIncome !== undefined && (
                                <td className="py-3 px-4 text-green-400">${proj.rentalIncome.toLocaleString()}</td>
                              )}
                              {proj.distribution !== undefined && (
                                <td className="py-3 px-4 text-green-400">${proj.distribution.toLocaleString()}</td>
                              )}
                              <td className="py-3 px-4 text-green-400 font-semibold">{proj.roi}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {selectedOpportunity.timeline && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      Investment Timeline
                    </h3>
                    <div className="space-y-3">
                      {selectedOpportunity.timeline.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            item.status === 'current' ? 'bg-orange-500' :
                            item.status === 'upcoming' ? 'bg-blue-500' :
                            'bg-gray-600'
                          }`} />
                          <div className="flex-1">
                            <p className="text-white font-semibold">{item.milestone}</p>
                            <p className="text-sm text-gray-400">{item.date}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.status === 'current' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                            item.status === 'upcoming' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Factors */}
                {selectedOpportunity.risks && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-red-500/20 p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-400" />
                      Risk Factors
                    </h3>
                    <div className="space-y-2">
                      {selectedOpportunity.risks.map((risk: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-300">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team */}
                {selectedOpportunity.team && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Team & Management
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOpportunity.team.map((member: any, idx: number) => (
                        <div key={idx} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4">
                          <p className="font-semibold text-white mb-1">{member.name}</p>
                          <p className="text-sm text-gray-400 mb-1">{member.role}</p>
                          <p className="text-xs text-gray-500">{member.experience}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {selectedOpportunity.documents && (
                  <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      Investment Documents
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedOpportunity.documents.map((doc: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => toast.info(`Downloading ${doc.name}...`)}
                          className="flex items-center justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 hover:border-blue-500/30 transition group"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-white">{doc.name}</p>
                              <p className="text-xs text-gray-500">{doc.type} • {doc.size}</p>
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Investment Calculator */}
                <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-orange-400" />
                    Investment Calculator
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Enter Your Investment Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={investmentAmount}
                          onChange={(e) => {
                            // Only allow numbers and remove any non-numeric characters
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setInvestmentAmount(value);
                          }}
                          className="w-full bg-[#0A0A0A] border-2 border-orange-500/30 rounded-lg pl-10 pr-4 py-4 text-white text-2xl font-bold focus:outline-none focus:border-orange-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="100000"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          Minimum: <span className="text-white font-semibold">${selectedOpportunity.minInvestment.toLocaleString()}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          Maximum: <span className="text-white font-semibold">${selectedOpportunity.maxInvestment?.toLocaleString() || 'No limit'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Projected Return ({selectedOpportunity.projectedROI}%)</p>
                        <p className="text-2xl font-bold text-green-400">
                          ${calculateProjectedReturn().toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Value at Maturity</p>
                        <p className="text-2xl font-bold text-white">
                          ${(parseFloat(investmentAmount || '0') + calculateProjectedReturn()).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <PrimaryButton
                      onClick={handleInvest}
                      className="w-full py-4 text-lg font-bold"
                    >
                      Submit Investment
                    </PrimaryButton>

                    <p className="text-xs text-gray-500 text-center">
                      By submitting, you agree to our investment terms and acknowledge you've reviewed all risk disclosures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-16 z-30" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className="px-6 py-4" style={{ maxWidth: '80rem', width: '100%', display: 'block' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                Investor Portal
              </h1>
              <p className="text-gray-400 mt-1">{investorInfo.company} · {investorInfo.name} · {investorInfo.email}</p>
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
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div className="px-6 py-6 space-y-6" style={{ maxWidth: '80rem', width: '100%', display: 'block' }}>
        {activeTab === 'guide' && <PortalFeatureGuide portal="investor" />}

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
                  <h2 className="text-lg font-bold text-white">Portfolio Performance</h2>
                  <p className="text-sm text-gray-400">Total value and ROI over time</p>
                </div>
                <PrimaryButton
                  onClick={() => toast.success('Downloading report...')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Report
                </PrimaryButton>
              </div>
              {/* A performance chart with no distributions behind it would draw
                  a flat line at zero, which looks like a loss rather than an
                  account that has not started. Say so instead. */}
              {performanceData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] text-center">
                  <BarChart3 className="mb-3 h-8 w-8 text-gray-600" />
                  <p className="font-semibold text-white">No performance history yet</p>
                  <p className="mt-1 max-w-sm text-sm text-gray-400">
                    This chart plots portfolio value as distributions are paid. It fills in
                    from the first one.
                  </p>
                </div>
              ) : (
              <ChartContainer height={256} minHeight={256} dependencies={[activeTab]}>
                <AreaChart data={performanceData} width={800} height={256}>
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop key="investor-stop1" offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                      <stop key="investor-stop2" offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="investor-grid" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="investor-xaxis" dataKey="month" stroke="#6B7280" />
                  <YAxis key="investor-yaxis" stroke="#6B7280" />
                  <Tooltip
                    key="investor-tooltip"
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area key="investor-area" type="monotone" dataKey="value" stroke="#ea580c" fillOpacity={1} fill="url(#valueGradient)" strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ChartContainer>
              )}
            </div>

            {/* Properties Grid */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Investment Properties</h2>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {/* An investor with no commitments yet should see a deliberate
                  screen, not an empty grid that reads as a broken page. */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                  <Clock className="w-4 h-4 animate-spin" /> Loading your portfolio…
                </div>
              ) : loadError ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-400" />
                  <p className="text-sm text-red-300">{loadError}</p>
                </div>
              ) : properties.length === 0 ? (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                  <Briefcase className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                  <p className="font-semibold text-white">No investments yet</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                    Once a commitment is made against an opportunity it appears here, with the
                    capital invested, distributions received and return to date.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('opportunities')}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500"
                  >
                    <Target className="h-4 w-4" /> Browse opportunities
                  </button>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {properties.map(property => (
                  <div key={property.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-5 hover:border-orange-500/30 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white mb-1">{property.name}</h3>
                        <p className="text-sm text-gray-400">{property.type} • {property.location}</p>
                      </div>
                      {/* Occupancy is a property-level figure we do not hold for
                          a commitment, so the badge shows the commitment's own
                          status instead of an invented percentage. */}
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(property.status)}`}>
                        {property.occupancy != null ? `${property.occupancy}%` : property.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Invested</span>
                        <span className="text-white font-semibold">${(property.invested / 1000)}K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Value</span>
                        <span className="text-white font-semibold">${(property.currentValue / 1000)}K</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">ROI</span>
                        <span className="text-green-400 font-semibold">+{property.roi}%</span>
                      </div>
                    </div>
                    {/* Monthly income is only shown when a distribution schedule
                        actually reports one — a hard $0 reads as a bad investment
                        rather than as a figure we do not yet hold. */}
                    {property.monthlyIncome > 0 && (
                      <div className="pt-3 border-t border-[#2A2A2A]">
                        <p className="text-xs text-gray-400 mb-1">Monthly Income</p>
                        <p className="text-lg font-bold text-orange-400">${property.monthlyIncome.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Investment Opportunities */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">New Investment Opportunities</h2>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Company Opportunities Preview */}
              <div className="mb-6">
                <h3 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-400" />
                  Company Equity Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {companyOpportunities.slice(0, 2).map(opp => (
                    <div key={opp.id} className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{opp.title}</h3>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {opp.highlight}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{opp.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Funded</p>
                          <p className="text-white font-semibold">{fundedPct(opp)}%</p>
                        </div>
                      </div>
                      <PrimaryButton
                        onClick={() => handleOpenOpportunity(opp)}
                        className="w-full text-sm py-2"
                      >
                        Learn More
                      </PrimaryButton>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property Opportunities Preview */}
              <div>
                <h3 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-400" />
                  Property Investment Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {propertyOpportunities.slice(0, 2).map(opp => (
                    <div key={opp.id} className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-lg p-4 hover:border-orange-500/50 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-white">{opp.title}</h3>
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              {opp.highlight}
                            </span>
                            {opp.needsMoreFunding && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Fundraising
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{opp.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Funded</p>
                          <p className="text-white font-semibold">{fundedPct(opp)}%</p>
                        </div>
                      </div>
                      <PrimaryButton
                        onClick={() => handleOpenOpportunity(opp)}
                        className="w-full text-sm py-2"
                      >
                        Learn More
                      </PrimaryButton>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'portfolio' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Portfolio Details</h2>
                <p className="mt-1 text-sm text-gray-400">Every commitment, what it has returned, and where it stands.</p>
              </div>
              {commitments.length > 0 && (
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Invested</p>
                    <p className="text-lg font-bold text-white tabular-nums">{compact(totalInvested)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Received</p>
                    <p className="text-lg font-bold text-green-400 tabular-nums">{compact(totalReceived)}</p>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <Clock className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : commitments.length === 0 ? (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                <Briefcase className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="font-semibold text-white">Nothing committed yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                  Each commitment appears here with the capital placed, distributions received to date and the return that implies.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="pb-3 pr-4 font-semibold">Investment</th>
                      <th className="pb-3 pr-4 font-semibold">Committed</th>
                      <th className="pb-3 pr-4 text-right font-semibold">Invested</th>
                      <th className="pb-3 pr-4 text-right font-semibold">Received</th>
                      <th className="pb-3 pr-4 text-right font-semibold">Return</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {commitments.map((commit: any) => {
                      const invested = Number(commit.commitment_amount || 0);
                      const received = Number(commit.total_received || 0);
                      const pct = invested > 0 ? ((received / invested) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={commit.id} className="text-gray-300">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-white">{commit.opportunity?.title || 'Investment'}</p>
                            <p className="text-xs text-gray-500">{commit.opportunity?.category || ''}{commit.opportunity?.location ? ` · ${commit.opportunity.location}` : ''}</p>
                          </td>
                          <td className="py-3 pr-4">{String(commit.commitment_date || '').slice(0, 10) || '—'}</td>
                          <td className="py-3 pr-4 text-right font-semibold tabular-nums text-white">{money(invested)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-green-400">{money(received)}</td>
                          <td className="py-3 pr-4 text-right tabular-nums">{pct}%</td>
                          <td className="py-3">
                            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${getStatusColor(commit.status)}`}>{commit.status || 'pending'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'opportunities' && (
          <>
            {/* Header with Filters */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Investment Opportunities</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpportunityFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      opportunityFilter === 'all'
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:border-orange-500/30'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setOpportunityFilter('company')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      opportunityFilter === 'company'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:border-purple-500/30'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Company Equity
                  </button>
                  <button
                    onClick={() => setOpportunityFilter('property')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      opportunityFilter === 'property'
                        ? 'bg-orange-600 text-white'
                        : 'bg-[#0A0A0A] text-gray-400 border border-[#2A2A2A] hover:border-orange-500/30'
                    }`}
                  >
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Real Estate
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {opportunityFilter === 'all' && 'Browse all company equity and real estate investment opportunities'}
                {opportunityFilter === 'company' && 'Invest directly in company growth through equity partnerships'}
                {opportunityFilter === 'property' && 'Build wealth through diverse real estate investment vehicles'}
              </p>
            </div>

            {/* Company Opportunities */}
            {(opportunityFilter === 'all' || opportunityFilter === 'company') && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  Company Equity Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyOpportunities.map(opp => (
                    <div
                      key={opp.id}
                      onClick={() => handleOpenOpportunity(opp)}
                      className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/20 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">{opp.title}</h3>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {opp.highlight}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{opp.category}</p>
                          <p className="text-sm text-gray-300 mb-3">{opp.description}</p>
                        </div>
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {fundedPct(opp)}% FUNDED
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Term</p>
                          <p className="text-white font-semibold">{opp.term}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Investors</p>
                          <p className="text-white font-semibold">{opp.investors}</p>
                        </div>
                      </div>

                      <div className="bg-[#0A0A0A] rounded-lg border border-purple-500/20 p-3 mb-4">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Key Benefits:</p>
                        <ul className="space-y-1">
                          {(opp.benefits || []).map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                              <CheckCircle className="w-3 h-3 text-purple-400 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-purple-400 font-semibold text-sm group-hover:text-purple-300 transition">
                        <span>View Full Details & Invest</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Property Opportunities */}
            {(opportunityFilter === 'all' || opportunityFilter === 'property') && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-orange-400" />
                  Real Estate Investment Opportunities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {propertyOpportunities.map(opp => (
                    <div
                      key={opp.id}
                      onClick={() => handleOpenOpportunity(opp)}
                      className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-xl p-6 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/20 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-orange-300 transition">{opp.title}</h3>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              {opp.highlight}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{opp.category}</p>
                          <p className="text-sm text-gray-300 mb-3">{opp.description}</p>
                        </div>
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {fundedPct(opp)}% FUNDED
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Min Investment</p>
                          <p className="text-white font-semibold">${(opp.minInvestment / 1000)}K</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Projected ROI</p>
                          <p className="text-green-400 font-semibold">{opp.projectedROI}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Term</p>
                          <p className="text-white font-semibold">{opp.term}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Investors</p>
                          <p className="text-white font-semibold">{opp.investors}</p>
                        </div>
                      </div>

                      <div className="bg-[#0A0A0A] rounded-lg border border-orange-500/20 p-3 mb-4">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Key Benefits:</p>
                        <ul className="space-y-1">
                          {(opp.benefits || []).map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                              <CheckCircle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-orange-400 font-semibold text-sm group-hover:text-orange-300 transition">
                        <span>View Full Details & Invest</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* A summary built from the same figures as everything else, so a
                report can never disagree with the dashboard. */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white">Position Summary</h2>
              <p className="mt-1 mb-5 text-sm text-gray-400">As at today, from your commitments and distributions.</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Capital invested', value: money(totalInvested) },
                  { label: 'Distributions received', value: money(totalReceived) },
                  { label: 'Current value', value: money(currentValue) },
                  { label: 'Return to date', value: `${summary?.totalROI ?? 0}%` },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{row.label}</p>
                    <p className="mt-1 text-xl font-bold text-white tabular-nums">{row.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'Active investments', value: String(summary?.activeInvestments ?? 0) },
                  { label: 'Completed', value: String(summary?.completedInvestments ?? 0) },
                  { label: 'Distributions paid', value: String(summary?.totalPayouts ?? 0) },
                  { label: 'Documents', value: String(documents.length) },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{row.label}</p>
                    <p className="mt-1 text-xl font-bold text-white tabular-nums">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h2 className="text-lg font-bold text-white">Analysis Reports</h2>
              <p className="mt-1 mb-5 text-sm text-gray-400">Property and portfolio analyses prepared for your account.</p>
              {reports.length === 0 ? (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                  <BarChart3 className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                  <p className="font-semibold text-white">No analysis reports yet</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                    Reports commissioned for your account appear here. The summary above is always current regardless.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#2A2A2A] rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
                  {reports.map((r: any, i: number) => (
                    <div key={r.id || i} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{r.title || r.property_address || 'Analysis report'}</p>
                        <p className="text-xs text-gray-500">{String(r.created_at || '').slice(0, 10)}</p>
                      </div>
                      <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${getStatusColor(r.status)}`}>{r.status || 'ready'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'distributions' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Distribution History</h2>
                <p className="mt-1 text-sm text-gray-400">Every payment made against your commitments.</p>
              </div>
              {payouts.length > 0 && (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total received</p>
                  <p className="text-lg font-bold text-green-400 tabular-nums">{money(totalReceived)}</p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <Clock className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : payouts.length === 0 ? (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                <DollarSign className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="font-semibold text-white">No distributions yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                  Payments appear here as they are made, newest first, with the date and status of each.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="pb-3 pr-4 font-semibold">Date</th>
                      <th className="pb-3 pr-4 font-semibold">Description</th>
                      <th className="pb-3 pr-4 text-right font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {[...payouts]
                      .sort((a, b) => String(b.payout_date || '').localeCompare(String(a.payout_date || '')))
                      .map((p: any) => (
                        <tr key={p.id} className="text-gray-300">
                          <td className="py-3 pr-4">{String(p.payout_date || '').slice(0, 10) || '—'}</td>
                          <td className="py-3 pr-4">{p.description || 'Distribution'}</td>
                          <td className="py-3 pr-4 text-right font-semibold tabular-nums text-green-400">{money(p.amount)}</td>
                          <td className="py-3">
                            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${getStatusColor(p.status)}`}>{p.status || 'pending'}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h2 className="text-lg font-bold text-white">Investment Documents</h2>
            <p className="mt-1 mb-5 text-sm text-gray-400">
              Paperwork attached to the deals you have committed to.
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <Clock className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                <p className="font-semibold text-white">No documents yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                  {commitments.length === 0
                    ? 'Documents are attached to the deals you invest in, so they appear once you have a commitment.'
                    : 'Nothing has been attached to your commitments yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A2A] rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
                {documents.map((d: any, i: number) => (
                  <div key={d.id || i} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{d.name || d.title || d.document_type || 'Document'}</p>
                      <p className="text-xs text-gray-500">
                        {d.opportunityTitle || ''}
                        {d.created_at ? ` · ${String(d.created_at).slice(0, 10)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Signature state is worth showing plainly — an unsigned
                          document is an action, not a filing. */}
                      {d.signed || d.signed_at ? (
                        <span className="inline-flex items-center gap-1 rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">
                          <CheckCircle className="h-3 w-3" /> Signed
                        </span>
                      ) : (
                        <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-400">
                          Awaiting signature
                        </span>
                      )}
                      {d.url && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-orange-500/40 hover:text-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === 'messages' && (
          <div className="p-6">
            <MessagesTab userId="" userEmail="" userName="Portal User" onTabOpen={clearUnread} />
          </div>
        )}

                
        {activeTab === 'deals' && (
          <>
          <FeaturedDealsReels portalType="investor" />
          <DealsOffersSection portalType="advertiser" storageKey="investor_deals" />
          </>
        )}

        {activeTab === 'plan-tracker' && <MaintenancePlanTracker portalRole="investor" ownerName={investorInfo.name} />}
        {activeTab === 'plan-builder' && <PlanBuilderTab portalType="investor" ownerName={investorInfo.name} />}
        {activeTab === 'referrals' && (
          <ReferralRewards />
        )}
      </div>
      </div>
    </div>
    </LayoutManager>
  );
}
