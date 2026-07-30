import PortalFeatureGuide from './PortalFeatureGuide';
import { useState, useEffect, Component, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';
import SponsoredMarquee from '../SponsoredMarquee';
import PortalTrialBanner from './PortalTrialBanner';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import InvestmentTab from './InvestmentTab';
import phoenixLogo from '../../../imports/BPB_phoenix_full_color_logo.png';
import { supabase } from '../../lib/supabase';
import { projectId } from '../../utils/supabase/info';

// Wrap marquee so if it crashes it doesn't take the whole portal down
class MarqueeSafe extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  componentDidCatch() { this.setState({ err: true }); }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}
import {
  HardHat, DollarSign, FileText, BarChart3, Star, Award,
  MessageSquare, Settings, Bell, Home, Briefcase, Megaphone,
  Plus, Download, ChevronRight, ArrowUpRight, CheckCircle,
  Clock, TrendingUp, Target, Send, AlertCircle, Building2,
  Image, Video, X, Paperclip, Play, Sparkles,
} from 'lucide-react';

// Static bid room data — no hooks to cause loops
const BID_ROOM_JOBS = [
  {
    id: 'br-001', title: 'Master Bathroom Renovation', category: 'Plumbing & Tile',
    description: 'Full bathroom gut and remodel — plumbing rough-in, tile work, fixture install.',
    location: 'Dallas, TX 75201', budget: { min: 8000, max: 14000 }, deadline: '2026-07-15',
    priority: 'high', requirements: ['Licensed plumber', 'Tile experience'], requestedFromMe: true,
  },
  {
    id: 'br-002', title: 'Electrical Panel Upgrade — 200A', category: 'Electrical',
    description: 'Upgrade from 100A to 200A service, new sub-panel in garage.',
    location: 'Plano, TX 75024', budget: { min: 3500, max: 6000 }, deadline: '2026-07-10',
    priority: 'urgent', requirements: ['Licensed electrician'], requestedFromMe: false,
  },
  {
    id: 'br-003', title: 'HVAC System Replacement', category: 'HVAC',
    description: 'Replace 5-ton split system, ductwork inspection and sealing.',
    location: 'Irving, TX 75039', budget: { min: 7000, max: 12000 }, deadline: '2026-07-20',
    priority: 'medium', requirements: ['HVAC certified', 'EPA 608'], requestedFromMe: true,
  },
];

const OPEN_JOBS = [
  { id: 'j1', title: 'Office HVAC Installation', client: 'Commercial Properties LLC', value: 18500, progress: 65, status: 'in-progress', due: '2024-02-15' },
  { id: 'j2', title: 'Warehouse Electrical', client: 'Metro Logistics Inc.', value: 24000, progress: 30, status: 'in-progress', due: '2024-03-01' },
  { id: 'j3', title: 'Retail Lighting Install', client: 'Fashion District Co.', value: 8200, progress: 90, status: 'in-progress', due: '2024-01-30' },
];

const REVENUE_MONTHS = [
  { month: 'Jul', amount: 32000 }, { month: 'Aug', amount: 38000 }, { month: 'Sep', amount: 35000 },
  { month: 'Oct', amount: 42000 }, { month: 'Nov', amount: 48000 }, { month: 'Dec', amount: 55000 }, { month: 'Jan', amount: 52000 },
];

const PAYMENTS = [
  { id: 'INV-2024-156', project: 'Commercial HVAC', amount: 5000, due: '2024-02-05', status: 'pending' },
  { id: 'INV-2024-148', project: 'Warehouse Electrical', amount: 8500, due: '2024-01-30', status: 'overdue' },
  { id: 'INV-2024-142', project: 'Retail Lighting', amount: 3200, due: '2024-01-25', status: 'paid' },
];

const LOGO_URL = phoenixLogo;

function badge(s: string) {
  if (s === 'paid' || s === 'completed') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'overdue') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (s === 'pending' || s === 'submitted' || s === 'in-progress') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

type Tab = 'dashboard' | 'jobs' | 'bids' | 'payments' | 'investments' | 'plan-tracker' | 'plan-builder' | 'performance' | 'messages' | 'guide';

function getDemoProfile() {
  try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; }
}

export default function SubcontractorPortal() {
  const demoProfile = getDemoProfile();
  const subName = demoProfile?.name || 'Carlos Rivera';
  const subCompany = demoProfile?.company || 'Elite Construction LLC';
  const subEmail = demoProfile?.email || 'carlos@eliteconstruct.com';
  const subPhone = demoProfile?.phone || '(817) 555-0163';

  const [tab, setTab] = useState<Tab>('dashboard');
  const [submittedBids, setSubmittedBids] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [bidDuration, setBidDuration] = useState('');
  const [bidMedia, setBidMedia] = useState<{ id: string; type: 'image' | 'video'; url: string; name: string }[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [logo, setLogo] = useState(LOGO_URL);
  const [companyName, setCompanyName] = useState(subCompany);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/subcontractor/bids`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (active && response.ok && payload.success) setSubmittedBids(payload.bids || []);
      } catch { /* Keep the portal usable if history is temporarily unavailable. */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const branding = localStorage.getItem('company_branding_profile');
      if (branding) {
        const b = JSON.parse(branding);
        if (b.logo_url?.startsWith('https://')) setLogo(b.logo_url);
      }
      const variants = localStorage.getItem('company_logo_variants');
      if (variants) {
        const v = JSON.parse(variants);
        if (v.logo_primary?.startsWith('https://')) setLogo(v.logo_primary);
      }
    } catch {}
  }, []);

  const requestedJobs = BID_ROOM_JOBS.filter(j => j.requestedFromMe);
  const openBidRoomJobs = BID_ROOM_JOBS.filter(j => !j.requestedFromMe);
  const maxRevenue = Math.max(...REVENUE_MONTHS.map(r => r.amount));

  function openBid(job: any) { setSelectedJob(job); setShowModal(true); }
  async function closeModal() {
    const pendingMedia = [...bidMedia];
    setShowModal(false); setSelectedJob(null); setBidAmount(''); setBidNotes(''); setBidDuration(''); setBidMedia([]); setPlayingVideo(null);
    for (const item of pendingMedia) {
      URL.revokeObjectURL(item.url);
      try { const { data: { session } } = await supabase.auth.getSession(); if (session?.access_token) await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/subcontractor/bid-attachments/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } }); } catch { /* Submitted files return 409 and remain protected. */ }
    }
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setMediaUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in before uploading bid attachments.');
      for (const file of files) {
        const isVideo = file.type.startsWith('video/'); const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) { toast.error(`${file.name} is not a supported image or video`); continue; }
        if (file.size > 50 * 1024 * 1024) { toast.error(`${file.name} is too large (max 50MB)`); continue; }
        const form = new FormData(); form.set('file', file);
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/subcontractor/bid-attachments`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: form });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) throw new Error(payload.error || `Could not upload ${file.name}.`);
        setBidMedia((current) => [...current, { id: payload.attachment.id, type: payload.attachment.type, url: URL.createObjectURL(file), name: payload.attachment.name }]);
      }
    } catch (error: any) { toast.error(error.message || 'Could not upload attachment.'); }
    finally { setMediaUploading(false); }
  }

  async function removeMedia(idx: number) {
    const target = bidMedia[idx]; if (!target) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in before removing an attachment.');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/subcontractor/bid-attachments/${encodeURIComponent(target.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not remove attachment.');
      URL.revokeObjectURL(target.url); setBidMedia((current) => current.filter((_, itemIndex) => itemIndex !== idx));
    } catch (error: any) { toast.error(error.message || 'Could not remove attachment.'); }
  }

  async function openBidAttachment(attachmentId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error('Sign in to open bid attachments.');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/subcontractor/bid-attachments/${encodeURIComponent(attachmentId)}/download`, { headers: { Authorization: `Bearer ${session.access_token}` } }); const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not open attachment.'); window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (error: any) { toast.error(error.message || 'Could not open attachment.'); }
  }

  async function submitBid() {
    if (!bidAmount || !selectedJob) { toast.error('Please enter a bid amount.'); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in before submitting a bid.');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/subcontractor/bids`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ jobId: selectedJob.id, jobTitle: selectedJob.title, amount: Number(bidAmount), notes: bidNotes, duration: bidDuration, attachments: bidMedia.map((item) => ({ id: item.id })) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not submit your bid.');
      setSubmittedBids((current) => [payload.bid, ...current]);
      toast.success(`Bid submitted${bidMedia.length ? ` with ${bidMedia.length} attachment${bidMedia.length > 1 ? 's' : ''}` : ''}! The owner will review it shortly.`);
      closeModal();
    } catch (error: any) { toast.error(error.message || 'Could not submit your bid.'); }
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'jobs', label: 'Active Jobs', icon: Briefcase },
    { id: 'bids', label: 'My Bids', icon: FileText },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'investments', label: 'Investments', icon: DollarSign },
    { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
    { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
  ];

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white">

      <PortalTrialBanner />

      {/* Rolling Sponsored Marquee */}
      <MarqueeSafe>
        <SponsoredMarquee />
      <AdvertisingMarquee placement="portal-header" dismissible />
      </MarqueeSafe>

      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Logo + company name */}
            <div className="flex items-center gap-3">
              <img src={logo} alt={companyName} className="w-10 h-10 object-contain rounded-xl bg-[#0A0A0A] p-1 border border-[#2A2A2A]"
                onError={e => { e.currentTarget.src = LOGO_URL; }} />
              <div>
                <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-orange-500" /> {companyName}
                </h1>
                <p className="text-xs text-gray-500 font-medium">{subName} · {subEmail} · Subcontractor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {requestedJobs.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-bold text-red-400 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {requestedJobs.length} bid request{requestedJobs.length > 1 ? 's' : ''}
                </div>
              )}
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition flex-shrink-0 ${
                    tab === t.id ? 'bg-orange-600 text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-orange-500/30'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* DASHBOARD */}
        {tab === 'guide' && <PortalFeatureGuide portal="subcontractor" />}

        {tab === 'dashboard' && (
          <div className="space-y-6">

            {/* ── BID ROOM ALERT SECTION ── */}
            {(requestedJobs.length > 0 || openBidRoomJobs.length > 0) && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A2A] bg-[#111]">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-400" /> Bid Room
                    {requestedJobs.length > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-black animate-pulse">{requestedJobs.length} for you</span>
                    )}
                  </h3>
                  <span className="text-xs text-gray-500">{BID_ROOM_JOBS.length} open project{BID_ROOM_JOBS.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-[#2A2A2A]">
                  {BID_ROOM_JOBS.map(job => (
                    <div key={job.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${job.requestedFromMe ? 'bg-red-500/5' : ''}`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${job.requestedFromMe ? 'bg-red-400' : 'bg-gray-600'}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm text-white truncate">{job.title}</p>
                            {job.requestedFromMe && <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-bold border border-red-500/20 flex-shrink-0">Requested from you</span>}
                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${job.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : job.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{job.priority}</span>
                          </div>
                          <p className="text-gray-500 text-xs">{job.category} · {job.location} · ${job.budget.min.toLocaleString()}–${job.budget.max.toLocaleString()} · Deadline {job.deadline}</p>
                        </div>
                      </div>
                      <button onClick={() => openBid(job)}
                        disabled={!!submittedBids.find(b => b.jobId === job.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0 ${
                          submittedBids.find(b => b.jobId === job.id)
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }`}>
                        {submittedBids.find(b => b.jobId === job.id)
                          ? <><CheckCircle className="w-3 h-3" /> Bid Sent</>
                          : <><Send className="w-3 h-3" /> Submit Bid</>
                        }
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Jobs', value: String(OPEN_JOBS.length), change: 'In progress', icon: Briefcase },
                { label: 'Monthly Revenue', value: '$52,000', change: '+18% this month', icon: DollarSign },
                { label: 'Bids Submitted', value: String(submittedBids.length + 3), change: 'Awaiting response', icon: FileText },
                { label: 'Avg Rating', value: '4.9 ★', change: '127 jobs completed', icon: Star },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5 hover:border-orange-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{s.change}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue bar chart — no recharts to avoid crashes */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold">Revenue Overview</h3>
                    <p className="text-sm text-gray-400">Monthly performance</p>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white text-xs transition">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="flex items-end gap-2 h-36">
                  {REVENUE_MONTHS.map((r, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t opacity-80 hover:opacity-100 transition"
                        style={{ height: `${Math.round((r.amount / maxRevenue) * 100)}%` }} />
                      <span className="text-xs text-gray-500">{r.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-gray-500">This Month</span>
                  <span className="text-white font-bold">$52,000 <span className="text-green-400 text-xs">+18%</span></span>
                </div>
              </div>

              {/* Open Jobs */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Open Jobs</h3>
                  <button onClick={() => setTab('jobs')} className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  {OPEN_JOBS.map(job => (
                    <div key={job.id} className="bg-[#0A0A0A] rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{job.title}</p>
                          <p className="text-gray-500 text-xs">{job.client} · Due {job.due}</p>
                        </div>
                        <span className="text-white font-bold text-sm">${job.value.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#2A2A2A] rounded-full h-1.5">
                          <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${job.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{job.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent payments */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Recent Payments</h3>
                <button onClick={() => setTab('payments')} className="text-orange-400 text-sm font-semibold flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {PAYMENTS.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-[#0A0A0A] rounded-lg p-4">
                    <div>
                      <p className="font-semibold text-sm">{p.id}</p>
                      <p className="text-gray-500 text-xs">{p.project} · Due {p.due}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">${p.amount.toLocaleString()}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${badge(p.status)}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FEATURED DEALS & REELS ── shown right on the dashboard */}
            <FeaturedDealsReels portalType="subcontractor" />

          </div>
        )}

        {/* JOBS */}
        {tab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Active Jobs</h2>
            <div className="space-y-4">
              {OPEN_JOBS.map(job => (
                <div key={job.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-lg">{job.title}</p>
                      <p className="text-gray-400 text-sm">{job.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${job.value.toLocaleString()}</p>
                      <p className="text-gray-500 text-xs">Due {job.due}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 bg-[#2A2A2A] rounded-full h-2">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">{job.progress}%</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${badge(job.status)}`}>{job.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BIDS */}
        {tab === 'bids' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">My Bids</h2>
            </div>
            {submittedBids.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium mb-1">No bids submitted yet</p>
                <p className="text-gray-600 text-sm mb-4">Use the Bid Room section on your dashboard to submit bids</p>
                <button onClick={() => setTab('dashboard')} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition">
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
                {submittedBids.map(s => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-bold">{s.jobTitle}</p>
                      <p className="text-gray-500 text-sm">Submitted {s.submittedAt} {s.duration && `· Est. ${s.duration}`}</p>
                      {s.notes && <p className="text-gray-600 text-xs mt-1">{s.notes}</p>}
                      {Array.isArray(s.attachments) && s.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{s.attachments.map((attachment: any) => <button key={attachment.id} type="button" onClick={() => void openBidAttachment(attachment.id)} className="rounded border border-orange-500/30 px-2 py-1 text-xs text-orange-200 transition hover:bg-orange-500/10"><Download className="mr-1 inline h-3 w-3" />{attachment.name || 'Secure attachment'}</button>)}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold">${s.amount.toLocaleString()}</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${badge(s.status)}`}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS */}
        {tab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Payment Schedule</h2>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-400 hover:text-white text-sm transition">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {PAYMENTS.map(p => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{p.id}</p>
                    <p className="text-gray-400 text-sm">{p.project} · Due {p.due}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold">${p.amount.toLocaleString()}</p>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${badge(p.status)}`}>{p.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PERFORMANCE */}
        {tab === 'plan-tracker' && <MaintenancePlanTracker portalRole="subcontractor" ownerName={subName} />}
        {tab === 'plan-builder' && <PlanBuilderTab portalType="subcontractor" ownerName={subCompany} />}
        {tab === 'investments' && <InvestmentTab portalType="subcontractor" ownerName={subName} />}
        {tab === 'performance' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Performance Metrics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Avg Rating', value: '4.9', sub: 'Out of 5.0', icon: Star },
                { label: 'Jobs Done', value: '127', sub: '+8 this month', icon: CheckCircle },
                { label: 'On-Time Rate', value: '96%', sub: '+2% improvement', icon: Clock },
                { label: 'Bid Win Rate', value: '68%', sub: '+5% from avg', icon: TrendingUp },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                    <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                    <p className="text-xs text-green-400 mt-0.5">{s.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-medium mb-1">No messages yet</p>
              <p className="text-gray-600 text-sm">Messages from Black Phoenix will appear here</p>
            </div>
          </div>
        )}

      </div>

      {/* BID MODAL */}
      {showModal && selectedJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-[#2A2A2A] flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Submit Your Bid</h3>
                <p className="text-gray-400 text-sm">{selectedJob.title}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Location</span><span>{selectedJob.location}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Budget</span><span>${selectedJob.budget.min.toLocaleString()}–${selectedJob.budget.max.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Deadline</span><span>{selectedJob.deadline}</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bid Amount ($) <span className="text-orange-500">*</span></label>
                <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder="e.g. 9500"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Estimated Duration</label>
                <input type="text" value={bidDuration} onChange={e => setBidDuration(e.target.value)} placeholder="e.g. 3-4 days"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Proposal Notes</label>
                <textarea value={bidNotes} onChange={e => setBidNotes(e.target.value)} rows={3}
                  placeholder="Your approach, materials, warranty..."
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-4 py-3 text-white text-sm outline-none resize-none" />
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">
                  Photos & Videos <span className="text-gray-600 font-normal">(optional — attach work samples, site photos, etc.)</span>
                </label>

                {/* Upload button */}
                <label className="flex items-center gap-3 w-full cursor-pointer px-4 py-3 bg-[#0A0A0A] border-2 border-dashed border-[#2A2A2A] hover:border-orange-500/50 hover:bg-orange-500/5 rounded-xl transition group">
                  <Paperclip className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition flex-shrink-0" />
                  <span className="text-sm text-gray-500 group-hover:text-gray-300 transition">
                    Attach photos or videos
                  </span>
                  <span className="ml-auto text-xs text-gray-600">JPG, PNG, MP4, MOV · max 50MB each</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleMediaUpload(event)}
                  />
                </label>

                {/* Preview grid */}
                {mediaUploading && <p className="text-xs text-orange-300">Uploading attachment…</p>}
                {bidMedia.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {bidMedia.map((m, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden bg-[#0A0A0A] border border-[#2A2A2A] group aspect-square">
                        {m.type === 'image' ? (
                          <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                            {playingVideo === m.url ? (
                              <video src={m.url} autoPlay controls className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <button onClick={() => setPlayingVideo(m.url)}
                                  className="w-10 h-10 bg-orange-600/80 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                                  <Play className="w-5 h-5 text-white ml-0.5" />
                                </button>
                                <p className="text-xs text-gray-500 px-1 truncate w-full text-center">{m.name}</p>
                              </>
                            )}
                          </div>
                        )}
                        {/* Type badge */}
                        <div className="absolute top-1.5 left-1.5">
                          {m.type === 'image'
                            ? <Image className="w-3.5 h-3.5 text-white drop-shadow" />
                            : <Video className="w-3.5 h-3.5 text-orange-400 drop-shadow" />}
                        </div>
                        {/* Remove button */}
                        <button onClick={() => void removeMedia(i)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {bidMedia.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {bidMedia.length} file{bidMedia.length > 1 ? 's' : ''} attached · {bidMedia.filter(m => m.type === 'image').length} photo{bidMedia.filter(m => m.type === 'image').length !== 1 ? 's' : ''}, {bidMedia.filter(m => m.type === 'video').length} video{bidMedia.filter(m => m.type === 'video').length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={closeModal} className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg text-sm font-semibold transition">Cancel</button>
                <button onClick={() => void submitBid()} className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Submit Bid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
