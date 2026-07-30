import { useState, useEffect, Component, ReactNode, useRef } from 'react';
import { toast } from 'sonner';
import {
  Home, Wrench, DollarSign, MessageSquare, Settings, Bell,
  Upload, Camera, Send, CheckCircle, Clock, AlertCircle,
  ChevronRight, ArrowUpRight, Tag, Star, Gift, Users,
  ShoppingCart, ExternalLink, Sparkles, Package, FileText,
  Plus, X, Image, Video, LoaderCircle, Phone, Mail, Building2,
  FileSignature, Download, PenLine, CheckCircle2, CreditCard,
} from 'lucide-react';
import SponsoredMarquee from '../SponsoredMarquee';
import PortalTrialBanner from './PortalTrialBanner';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import { MessagesTab, usePortalMessages } from './PortalMessagesSystem';
import InvestmentTab from './InvestmentTab';
import SubTenantForms from './SubTenantForms';
import NotificationBell from './NotificationBell';
import NotificationPreferences from './NotificationPreferences';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';

class Safe extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  componentDidCatch() { this.setState({ err: true }); }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

type Tab = 'dashboard' | 'work-requests' | 'lease' | 'rent' | 'deals' | 'shop' | 'investments' | 'referrals' | 'messages' | 'settings';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: Home },
  { id: 'work-requests', label: 'Work Requests',  icon: Wrench },
  { id: 'lease',         label: 'Lease',          icon: FileSignature },
  { id: 'rent',          label: 'Rent & Payments', icon: DollarSign },
  { id: 'deals',         label: 'Deals & Offers',  icon: Tag },
  { id: 'shop',          label: 'Online Shop',     icon: ShoppingCart },
  { id: 'investments',   label: 'Investments',     icon: DollarSign },
  { id: 'referrals',     label: 'Referrals',       icon: Gift, badge: 'EARN' },
  { id: 'messages',      label: 'Messages',        icon: MessageSquare },
  { id: 'settings',      label: 'Settings',        icon: Settings },
];

function priorityBadge(p: string) {
  if (p === 'urgent') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (p === 'high')   return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  if (p === 'medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

function statusBadge(s: string) {
  if (s === 'approved' || s === 'completed' || s === 'resolved') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (s === 'scheduled' || s === 'in_progress') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
}

function getDemoProfile() {
  try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; }
}

interface SubTenantPortalProps {
  onNavigate?: (page: string) => void;
  landlordId?: string;
  propertyAddress?: string;
  unitLabel?: string;
}

export default function SubTenantPortal({ onNavigate, landlordId, propertyAddress, unitLabel }: SubTenantPortalProps) {
  const demoProfile = getDemoProfile();
  const { user, session } = useAuth();
  const accountEmail = user?.email || demoProfile?.email || '';
  const { unread: unreadMessages, clearUnread } = usePortalMessages(user?.id || '', accountEmail);

  const tenantName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || demoProfile?.name || 'Tenant');
  const tenantUnit = unitLabel || demoProfile?.unit || '— Unit not set —';
  const tenantAddress = propertyAddress || demoProfile?.address || '— Address not set —';

  const [tab, setTab] = useState<Tab>('dashboard');
  const [workRequests, setWorkRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New work request form
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', priority: 'medium', category: 'general' });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [settingsName, setSettingsName] = useState(tenantName);
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsEmail, setSettingsEmail] = useState(accountEmail);

  const loadWorkRequests = async () => {
    if (!session?.access_token) { setWorkRequests([]); setLoadingRequests(false); return; }
    setLoadingRequests(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/tenant/work-requests`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load work requests.');
      setWorkRequests(Array.isArray(payload.workRequests) ? payload.workRequests : []);
    } catch {
      setWorkRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => { void loadWorkRequests(); }, [session?.access_token]);

  // ── Leases ────────────────────────────────────────────────────────────────
  const [leases, setLeases] = useState<any[]>([]);
  const [loadingLeases, setLoadingLeases] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');

  const loadLeases = async () => {
    if (!session?.access_token) { setLeases([]); setLoadingLeases(false); return; }
    setLoadingLeases(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/tenant/leases`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load leases.');
      setLeases(Array.isArray(payload.leases) ? payload.leases : []);
    } catch { setLeases([]); }
    finally { setLoadingLeases(false); }
  };

  useEffect(() => { void loadLeases(); }, [session?.access_token]);

  const signLease = async (leaseId: string) => {
    if (!session?.access_token) { toast.error('Sign in to sign this lease.'); return; }
    if (!signatureName.trim()) { toast.error('Type your full legal name to sign.'); return; }
    setSigningId(leaseId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/tenant/leases/${leaseId}/sign`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ signature: signatureName.trim() }) }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to sign the lease.');
      setLeases(prev => prev.map(l => l.id === leaseId ? payload.lease : l));
      setSignatureName('');
      toast.success('Lease signed. Your landlord has been notified.');
    } catch (error: any) { toast.error(error?.message || 'Unable to sign the lease.'); }
    finally { setSigningId(null); }
  };

  const downloadLease = async (leaseId: string) => {
    if (!session?.access_token) { toast.error('Sign in to download this lease.'); return; }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/leases/${leaseId}/download`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to download the lease.');
      window.open(payload.url, '_blank');
    } catch (error: any) { toast.error(error?.message || 'Unable to download the lease.'); }
  };

  // ── Rent & payments ────────────────────────────────────────────────────────
  const [rentInfo, setRentInfo] = useState<{ rent: number; unit: string; landlordEmail: string; landlordAcceptsOnline: boolean; history: any[] } | null>(null);
  const [loadingRent, setLoadingRent] = useState(true);
  const [payingRent, setPayingRent] = useState(false);

  const loadRent = async () => {
    if (!session?.access_token) { setRentInfo(null); setLoadingRent(false); return; }
    setLoadingRent(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/tenant/rent`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load rent details.');
      setRentInfo({ rent: payload.rent || 0, unit: payload.unit || '', landlordEmail: payload.landlordEmail || '', landlordAcceptsOnline: !!payload.landlordAcceptsOnline, history: Array.isArray(payload.history) ? payload.history : [] });
    } catch { setRentInfo(null); }
    finally { setLoadingRent(false); }
  };

  useEffect(() => { void loadRent(); }, [session?.access_token]);

  // Confirm a rent payment when returning from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('rent_payment');
    if (!paymentId || !session?.access_token) return;
    (async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/tenant/rent/confirm`,
          { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId }) }
        );
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.success && payload.payment?.status === 'paid') { toast.success('Rent payment received. Thank you!'); void loadRent(); }
      } catch { /* ignore */ }
      finally { const url = new URL(window.location.href); url.searchParams.delete('rent_payment'); url.searchParams.delete('session_id'); window.history.replaceState({}, '', url.toString()); }
    })();
  }, [session?.access_token]);

  const payRent = async (method: 'card' | 'ach' | 'both' = 'both') => {
    if (!session?.access_token) { toast.error('Sign in to pay rent.'); return; }
    setPayingRent(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/tenant/rent/pay`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ method }) }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to start rent payment.');
      window.location.href = payload.checkoutUrl;
    } catch (error: any) { toast.error(error?.message || 'Unable to start rent payment.'); setPayingRent(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 5));
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const submitWorkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) { toast.error('Please enter a title for your request.'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', draft.title);
      formData.append('description', draft.description);
      formData.append('priority', draft.priority);
      formData.append('category', draft.category);
      formData.append('unit', tenantUnit);
      formData.append('address', tenantAddress);
      attachments.forEach((file, i) => formData.append(`attachment_${i}`, file));

      if (session?.access_token) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/tenant/work-requests`,
          { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Submission failed.');
        if (payload.workRequest) setWorkRequests(prev => [payload.workRequest, ...prev]);
      } else {
        // Local demo fallback
        setWorkRequests(prev => [{
          id: `local-${Date.now()}`,
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          category: draft.category,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }, ...prev]);
      }

      toast.success('Work request submitted! Your landlord has been notified.');
      setDraft({ title: '', description: '', priority: 'medium', category: 'general' });
      setAttachments([]);
      setShowForm(false);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to submit work request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openRequests  = workRequests.filter(r => ['pending', 'pending_approval', 'open'].includes(r.status));
  const activeRequests = workRequests.filter(r => ['approved', 'scheduled', 'in_progress'].includes(r.status));
  const closedRequests = workRequests.filter(r => ['completed', 'resolved', 'rejected'].includes(r.status));

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>
      <Safe><SponsoredMarquee /></Safe>
      <Safe><PortalTrialBanner /></Safe>

      {/* Portal Header */}
      <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 64, zIndex: 30 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Home className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{tenantName} — Tenant Portal</h1>
                <p className="text-xs text-gray-500 font-medium">{tenantUnit} · {tenantAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell session={session} accent="indigo" />
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TABS.map(t => {
              const Icon = t.icon;
              const isMessages = t.id === 'messages';
              return (
                <button key={t.id}
                  onClick={() => { setTab(t.id); if (isMessages) clearUnread(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition flex-shrink-0 ${
                    tab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-indigo-500/30'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.badge && <span className="text-[8px] font-black px-1 py-0.5 rounded bg-green-500 text-black ml-1">{t.badge}</span>}
                  {isMessages && unreadMessages > 0 && (
                    <span className="w-4 h-4 bg-indigo-500 rounded-full text-[9px] font-black text-white flex items-center justify-center ml-1">{unreadMessages}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Open Requests',   value: String(openRequests.length),   icon: Clock,       color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/20' },
                { label: 'In Progress',      value: String(activeRequests.length), icon: Wrench,      color: 'text-blue-400',   bg: 'bg-blue-600/10 border-blue-500/20' },
                { label: 'Completed',        value: String(closedRequests.length), icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-600/10 border-green-500/20' },
                { label: 'Total Submitted',  value: String(workRequests.length),   icon: FileText,    color: 'text-indigo-400', bg: 'bg-indigo-600/10 border-indigo-500/20' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5 hover:border-indigo-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${s.bg}`}>
                        <Icon className={`w-5 h-5 ${s.color}`} />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-600" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => { setShowForm(true); setTab('work-requests'); }}
                className="flex items-center gap-4 p-5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-indigo-500/40 rounded-xl transition group text-left">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="font-bold text-white group-hover:text-indigo-300 transition">Submit Work Request</p>
                  <p className="text-xs text-gray-400 mt-0.5">Report a maintenance issue</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 ml-auto group-hover:text-indigo-400 transition" />
              </button>

              <button
                onClick={() => setTab('rent')}
                className="flex items-center gap-4 p-5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-green-500/40 rounded-xl transition group text-left">
                <div className="w-12 h-12 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-white group-hover:text-green-300 transition">Pay Rent</p>
                  <p className="text-xs text-gray-400 mt-0.5">Secure online payment</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 ml-auto group-hover:text-green-400 transition" />
              </button>

              <button
                onClick={() => setTab('messages')}
                className="flex items-center gap-4 p-5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-teal-500/40 rounded-xl transition group text-left">
                <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <p className="font-bold text-white group-hover:text-teal-300 transition">Message Landlord</p>
                  <p className="text-xs text-gray-400 mt-0.5">Direct communication</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 ml-auto group-hover:text-teal-400 transition" />
              </button>
            </div>

            {/* Recent requests */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Recent Work Requests</h3>
                <button onClick={() => setTab('work-requests')} className="text-indigo-400 text-sm font-semibold flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {loadingRequests ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4"><LoaderCircle className="w-4 h-4 animate-spin" /> Loading requests…</div>
              ) : workRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No work requests yet.</p>
                  <button onClick={() => { setShowForm(true); setTab('work-requests'); }} className="mt-3 text-indigo-400 text-sm font-semibold hover:underline">Submit your first request →</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {workRequests.slice(0, 4).map(req => (
                    <div key={req.id} className="bg-[#0A0A0A] rounded-lg p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{req.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{new Date(req.createdAt || req.created_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityBadge(req.priority)}`}>{req.priority}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(req.status)}`}>{String(req.status || 'pending').replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WORK REQUESTS */}
        {tab === 'work-requests' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Work Requests</h2>
                <p className="text-sm text-gray-400 mt-0.5">Submit and track maintenance issues for your unit.</p>
              </div>
              <button
                onClick={() => setShowForm(f => !f)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition">
                <Plus className="w-4 h-4" /> New Request
              </button>
            </div>

            {/* New request form */}
            {showForm && (
              <form onSubmit={submitWorkRequest} className="bg-[#151515] border border-indigo-500/25 rounded-xl p-5 space-y-4">
                <h3 className="text-base font-bold text-indigo-300">New Maintenance Request</h3>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Issue Title *</label>
                  <input
                    required value={draft.title}
                    onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                    placeholder="e.g. Leaking faucet in kitchen"
                    className="w-full bg-[#0A0A0A] border border-[#363636] focus:border-indigo-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Priority</label>
                    <select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#363636] focus:border-indigo-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none">
                      <option value="low">Low — Not urgent</option>
                      <option value="medium">Medium — Soon</option>
                      <option value="high">High — This week</option>
                      <option value="urgent">Urgent — Today</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Category</label>
                    <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                      className="w-full bg-[#0A0A0A] border border-[#363636] focus:border-indigo-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none">
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="hvac">HVAC / Heating & Cooling</option>
                      <option value="appliance">Appliance</option>
                      <option value="structural">Structural / Doors / Windows</option>
                      <option value="pest">Pest Control</option>
                      <option value="general">General Maintenance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Description</label>
                  <textarea
                    rows={3} value={draft.description}
                    onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    placeholder="Describe the issue in detail — when it started, how severe it is, etc."
                    className="w-full bg-[#0A0A0A] border border-[#363636] focus:border-indigo-500 rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none" />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Photos / Videos (up to 5)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((file, i) => (
                      <div key={i} className="relative flex items-center gap-2 bg-[#0A0A0A] border border-[#363636] rounded-lg px-3 py-2 text-xs text-gray-300">
                        {file.type.startsWith('video/') ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <Image className="w-3.5 h-3.5 text-indigo-400" />}
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-300 ml-1"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
                  {attachments.length < 5 && (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 bg-[#0A0A0A] border border-dashed border-[#363636] hover:border-indigo-500/50 rounded-lg text-xs text-gray-400 hover:text-indigo-300 transition">
                      <Upload className="w-4 h-4" /> Add photo or video
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition">
                    {submitting ? <><LoaderCircle className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Request</>}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 border border-[#363636] rounded-lg text-sm font-semibold text-gray-300 hover:text-white transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Request list */}
            {loadingRequests ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 flex items-center justify-center gap-2 text-sm text-gray-400">
                <LoaderCircle className="w-4 h-4 animate-spin" /> Loading your requests…
              </div>
            ) : workRequests.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-dashed border-[#3a3a3a] rounded-xl p-10 text-center">
                <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No work requests yet</p>
                <p className="text-sm text-gray-600 mt-1">Submit a request above and your landlord will be notified right away.</p>
              </div>
            ) : (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
                {workRequests.map(req => (
                  <div key={req.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{req.title}</p>
                      {req.description && <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{req.description}</p>}
                      <p className="text-gray-600 text-xs mt-1">{new Date(req.createdAt || req.created_at || Date.now()).toLocaleDateString()} · {req.category || 'general'}</p>
                      {/* Tenant sees tech notes but NOT cost/financial details */}
                      {req.techNote && <p className="text-indigo-300 text-xs mt-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-1">Tech note: {req.techNote}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityBadge(req.priority)}`}>{req.priority}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(req.status)}`}>{String(req.status || 'pending').replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEASE */}
        {tab === 'lease' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Your Lease</h2>
              <p className="mt-1 text-sm text-gray-400">Review and sign the lease your landlord sent to your portal.</p>
            </div>
            {loadingLeases ? (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading your leases…</div>
            ) : leases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">No leases have been sent to you yet. When your landlord sends a lease, it will appear here.</div>
            ) : leases.map(lease => (
              <div key={lease.id} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white flex items-center gap-2"><FileSignature className="h-4 w-4 text-indigo-400" /> {lease.title || 'Lease Agreement'}</p>
                    <p className="text-sm text-gray-400 mt-1">{[lease.propertyAddress, lease.unit].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold border ${lease.status === 'signed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{lease.status === 'signed' ? 'Signed' : 'Awaiting signature'}</span>
                </div>

                {lease.bodyText && (
                  <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4 text-sm text-gray-200">{lease.bodyText}</div>
                )}

                {lease.fileName && (
                  <button onClick={() => downloadLease(lease.id)} className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 px-4 py-2 text-sm font-bold text-indigo-300 transition hover:bg-indigo-500/10"><Download className="h-4 w-4" /> Download {lease.fileName}</button>
                )}

                {lease.status === 'signed' ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300"><CheckCircle2 className="h-4 w-4" /> Signed by {lease.signature}{lease.signedAt ? ` on ${new Date(lease.signedAt).toLocaleDateString()}` : ''}.</div>
                ) : (
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                    <p className="text-sm font-semibold text-white flex items-center gap-2"><PenLine className="h-4 w-4 text-indigo-400" /> Sign this lease</p>
                    <p className="text-xs text-gray-400">Type your full legal name to electronically sign. This is legally binding.</p>
                    <div className="flex flex-wrap gap-2">
                      <input value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Your full legal name" className="flex-1 min-w-[200px] rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                      <button onClick={() => signLease(lease.id)} disabled={signingId === lease.id} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{signingId === lease.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} Sign lease</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-[#2A2A2A] pt-5">
              <h2 className="text-xl font-bold text-white">Inspection & Pet Forms</h2>
              <p className="mb-4 mt-1 text-sm text-gray-400">Complete and sign any move-in/out checklists or pet deposit agreements your landlord sent.</p>
              <SubTenantForms session={session} />
            </div>
          </div>
        )}

        {/* RENT & PAYMENTS */}
        {tab === 'rent' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Rent & Payments</h2>
              <p className="text-sm text-gray-400 mt-0.5">Pay your rent securely online — no check needed.</p>
            </div>

            {/* Payment info card */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-bold">Rent Payment Portal</p>
                  <p className="text-xs text-gray-400">Secure · Fast · Trackable</p>
                </div>
              </div>

              {loadingRent ? (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-400"><LoaderCircle className="w-4 h-4 animate-spin" /> Loading rent details…</div>
              ) : !rentInfo?.landlordEmail ? (
                <p className="text-sm text-gray-400">Your account isn't linked to a landlord yet. Once your landlord adds you, your rent will appear here.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-[#0A0A0A] p-4">
                    <div>
                      <p className="text-xs text-gray-400">Monthly rent due{rentInfo.unit ? ` · Unit ${rentInfo.unit}` : ''}</p>
                      <p className="text-3xl font-bold text-white">${Number(rentInfo.rent || 0).toLocaleString()}</p>
                    </div>
                    {rentInfo.landlordAcceptsOnline
                      ? <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-bold text-green-300"><CheckCircle className="w-3.5 h-3.5" /> Online payments enabled</span>
                      : <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-300"><AlertCircle className="w-3.5 h-3.5" /> Setup pending</span>}
                  </div>

                  {rentInfo.landlordAcceptsOnline ? (
                    <>
                      <p className="text-sm text-gray-300 leading-relaxed">Choose how you'd like to pay. Funds go directly to your landlord via Stripe.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onClick={() => payRent('ach')} disabled={payingRent || !(rentInfo.rent > 0)} className="flex flex-col items-start gap-1 rounded-xl border border-green-500/30 bg-green-600/10 p-4 text-left transition hover:bg-green-600/20 disabled:opacity-60 disabled:cursor-not-allowed">
                          <span className="flex items-center gap-2 font-bold text-green-300"><Building2 className="w-4 h-4" /> Bank transfer (ACH)</span>
                          <span className="text-xs text-gray-400">Lowest fees · takes 1–3 business days</span>
                        </button>
                        <button onClick={() => payRent('card')} disabled={payingRent || !(rentInfo.rent > 0)} className="flex flex-col items-start gap-1 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 text-left transition hover:border-gray-500 disabled:opacity-60 disabled:cursor-not-allowed">
                          <span className="flex items-center gap-2 font-bold text-white"><CreditCard className="w-4 h-4" /> Debit / credit card</span>
                          <span className="text-xs text-gray-400">Instant · standard card fees apply</span>
                        </button>
                      </div>
                      <button onClick={() => payRent('both')} disabled={payingRent || !(rentInfo.rent > 0)} className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                        {payingRent ? <><LoaderCircle className="w-5 h-5 animate-spin" /> Redirecting to secure checkout…</> : <><DollarSign className="w-5 h-5" /> Pay ${Number(rentInfo.rent || 0).toLocaleString()} — choose at checkout</>}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-amber-300/90">Your landlord hasn't finished setting up online rent collection yet. Please check back soon or contact them directly.</p>
                  )}
                </>
              )}
            </div>

            {/* Payment history — tenant sees own payment status only */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="font-bold text-base mb-4">My Payment History</h3>
              {rentInfo?.history && rentInfo.history.length > 0 ? (
                <div className="divide-y divide-[#2A2A2A]">
                  {rentInfo.history.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">${Number(p.amount || 0).toLocaleString()}{p.unit ? ` · Unit ${p.unit}` : ''}</p>
                        <p className="text-xs text-gray-500">{new Date(p.paidAt || p.createdAt).toLocaleDateString()} {new Date(p.paidAt || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${p.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{p.status === 'paid' ? 'Paid' : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Payment history will appear here after your first online payment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEALS & OFFERS */}
        {tab === 'deals' && (
          <>
            <Safe><FeaturedDealsReels portalType="tenant" /></Safe>
            <Safe><DealsOffersSection portalType="advertiser" storageKey="tenant_deals_offers" /></Safe>
          </>
        )}

        {/* ONLINE SHOP */}
        {tab === 'shop' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Online Shop</h2>
              <p className="text-sm text-gray-400 mt-0.5">Home supplies, tools, and more — delivered to your door.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Home Supplies', desc: 'Cleaning, storage, organization', icon: Package, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/20' },
                { label: 'Tools & Hardware', desc: 'DIY tools, fasteners, safety gear', icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/20' },
                { label: 'Smart Home', desc: 'Lights, locks, thermostats', icon: Building2, color: 'text-purple-400', bg: 'bg-purple-600/10 border-purple-500/20' },
                { label: 'Seasonal', desc: 'Weather, lawn, garden', icon: Star, color: 'text-green-400', bg: 'bg-green-600/10 border-green-500/20' },
              ].map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.label}
                    onClick={() => onNavigate?.('public-store')}
                    className="flex items-center gap-4 p-5 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-indigo-500/30 rounded-xl transition group text-left">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                      <Icon className={`w-6 h-6 ${cat.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white group-hover:text-indigo-300 transition">{cat.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition" />
                  </button>
                );
              })}
            </div>
            <button onClick={() => onNavigate?.('public-store')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Browse Full Store
            </button>
          </div>
        )}

        {/* REFERRALS & GIFT CARDS */}
        {tab === 'referrals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Referrals & Gift Cards</h2>
              <p className="text-sm text-gray-400 mt-0.5">Earn rewards by referring friends to Black Phoenix services.</p>
            </div>

            {/* Referral program */}
            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <p className="font-bold text-indigo-200">Refer a Friend</p>
                  <p className="text-xs text-indigo-400/80">Earn $25 credit for every successful referral</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">Share your referral link. When a friend signs up for any Black Phoenix service, you both get rewarded.</p>
              <div className="flex gap-2">
                <input readOnly value={`https://blackphoenixbuilds.com/ref/${user?.id?.slice(0, 8) || 'demo'}`}
                  className="flex-1 bg-[#0A0A0A] border border-[#363636] rounded-lg px-3 py-2 text-sm text-gray-300 outline-none" />
                <button onClick={() => { navigator.clipboard.writeText(`https://blackphoenixbuilds.com/ref/${user?.id?.slice(0, 8) || 'demo'}`); toast.success('Referral link copied!'); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition">Copy</button>
              </div>
            </div>

            {/* Gift cards */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-bold">Gift Cards</p>
                  <p className="text-xs text-gray-400">Give the gift of home services</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">Purchase or redeem gift cards for Black Phoenix handyman, maintenance, and home improvement services.</p>
              <div className="flex gap-2">
                <button className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition">Buy a Gift Card</button>
                <button className="flex-1 py-2.5 border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 rounded-lg text-sm font-bold transition">Redeem a Code</button>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <div className="p-1">
            <MessagesTab userId={user?.id || ''} userEmail={accountEmail} userName={tenantName} onTabOpen={clearUnread} />
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'investments' && <InvestmentTab portalType="tenant" ownerName={tenantName} />}

        {tab === 'settings' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-xl font-bold">My Settings</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name</label>
                <input value={settingsName} onChange={e => setSettingsName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-indigo-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input value={settingsEmail} onChange={e => setSettingsEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-indigo-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Phone</label>
                <input value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} placeholder="(603) 555-0100"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-indigo-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-400 mb-1">Your Unit</p>
                <p className="text-white font-medium">{tenantUnit}</p>
                <p className="text-gray-500 text-sm">{tenantAddress}</p>
                <p className="text-xs text-gray-600 mt-1.5">Unit details are managed by your landlord. Contact them to update.</p>
              </div>
              <button onClick={() => toast.success('Settings saved!')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition">
                Save Changes
              </button>
            </div>

            <NotificationPreferences session={session} accent="indigo" />

            {/* Contact info */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="font-bold text-base mb-4">Emergency Contacts</h3>
              <div className="space-y-3">
                {[
                  { label: 'Black Phoenix Emergency Line', value: '(603) 555-0199', icon: Phone },
                  { label: 'Support Email', value: 'support@blackphoenixbuilds.com', icon: Mail },
                ].map(contact => {
                  const Icon = contact.icon;
                  return (
                    <div key={contact.label} className="flex items-center gap-3 bg-[#0A0A0A] rounded-lg p-3">
                      <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">{contact.label}</p>
                        <p className="text-white text-sm font-medium">{contact.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      <Safe><AdvertisingMarquee /></Safe>
    </div>
  );
}
