import PortalFeatureGuide from './PortalFeatureGuide';
import { useState, useEffect, Component, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Building2, DollarSign, Users, Wrench, Settings, Bell,
  Home, BarChart3, ChevronRight, ArrowUpRight, CheckCircle, Tag, MessageSquare,
  TrendingUp, Zap, Star, Package, Car, Sparkles, LoaderCircle, Plus, FileText,
} from 'lucide-react';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import CRMSection from './CRMSection';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import InvestmentTab from './InvestmentTab';
import { MessagesTab, usePortalMessages } from './PortalMessagesSystem';
import { PortalDocumentVault } from './PortalDocumentVault';
import { useAuth } from '../../contexts/AuthContext';
import CondoMasterAccount from './CondoMasterAccount';
import { projectId } from '../../utils/supabase/info';

class Safe extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  componentDidCatch() { this.setState({ err: true }); }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

const WORK_REQUESTS = [
  { id: 'wr1', title: 'Lobby AC not cooling', unit: 'Lobby', priority: 'high', status: 'open' },
  { id: 'wr2', title: 'Parking gate broken', unit: 'Garage', priority: 'urgent', status: 'open' },
  { id: 'wr3', title: 'Roof drain clogged', unit: 'Rooftop', priority: 'medium', status: 'pending' },
];

const UNITS = [
  { id: 'u1', number: '101', owner: 'James Park', status: 'occupied', dues: 'current' },
  { id: 'u2', number: '202', owner: 'Sandra Lee', status: 'occupied', dues: 'current' },
  { id: 'u3', number: '305', owner: 'Tom Rivera', status: 'occupied', dues: 'overdue' },
  { id: 'u4', number: '410', owner: 'Vacant', status: 'vacant', dues: 'n/a' },
];

const DUES = [
  { id: 'D-001', unit: 'Unit 101', owner: 'James Park', amount: 850, date: '2026-06-01', status: 'paid' },
  { id: 'D-002', unit: 'Unit 202', owner: 'Sandra Lee', amount: 850, date: '2026-06-01', status: 'paid' },
  { id: 'D-003', unit: 'Unit 305', owner: 'Tom Rivera', amount: 850, date: '2026-05-01', status: 'overdue' },
];

function priorityBadge(p: string) {
  if (p === 'urgent') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (p === 'high') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  if (p === 'medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

function statusBadge(s: string) {
  if (s === 'paid' || s === 'approved' || s === 'current' || s === 'occupied') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'overdue' || s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (s === 'vacant') return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
}

type Tab = 'dashboard' | 'associations' | 'units' | 'owners' | 'work-requests' | 'plan-tracker' | 'plan-builder' | 'crm' | 'deals' | 'financials' | 'investments' | 'revenue-ai' | 'messages' | 'documents' | 'settings' | 'guide';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'associations', label: 'Associations', icon: Building2 },
  { id: 'units', label: 'Units', icon: Building2 },
  { id: 'owners', label: 'Owners', icon: Users },
  { id: 'work-requests', label: 'Work Requests', icon: Wrench },
  { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
  { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'deals', label: 'Deals & Reels', icon: Tag },
  { id: 'financials', label: 'Financials', icon: BarChart3 },
  { id: 'investments', label: 'Investments', icon: DollarSign },
  { id: 'revenue-ai', label: 'Revenue AI', icon: TrendingUp, badge: 'NEW' },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
];

const CONDO_MGR_OPPS = [
  { icon: Car, color: 'text-blue-400', name: 'Reserved Parking Revenue', rev: '$600–$2,400/yr', difficulty: 'Easy', nhNote: 'NH RSA 356-B allows associations to allocate parking as a chargeable amenity — coordinate with board for policy update.' },
  { icon: Zap, color: 'text-green-400', name: 'EV Charging Stations', rev: '$1,200–$3,600/yr', difficulty: 'Medium', nhNote: 'Eversource NH rebates up to $500/port — condo manager can coordinate bulk install across the portfolio.' },
  { icon: Package, color: 'text-amber-400', name: 'Package Locker Systems', rev: '$800–$2,000/yr', difficulty: 'Medium', nhNote: 'Package theft is a growing NH complaint — locker systems reduce liability and generate subscription revenue.' },
  { icon: Star, color: 'text-orange-400', name: 'Vendor Referral Program', rev: '$500–$2,000/yr', difficulty: 'Easy', nhNote: 'NH contractors often offer referral fees — structure a transparent program disclosed per RSA 356-B fiduciary rules.' },
  { icon: TrendingUp, color: 'text-teal-400', name: 'Reserve Fund Optimization', rev: '$1,000–$4,000 saved/yr', difficulty: 'Easy', nhNote: 'NH-compliant reserve study + bulk vendor contracts can significantly reduce annual operating drain.' },
  { icon: BarChart3, color: 'text-purple-400', name: 'Owner Reporting Premium Tier', rev: '$120–$480/yr per owner', difficulty: 'Easy', nhNote: 'NH condo owners increasingly expect digital dashboards — premium reporting is a chargeable management add-on.' },
];

function getDemoProfile() {
  try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; }
}

export default function CondoManagerPortalView() {
  const demoProfile = getDemoProfile();
  const { user, session } = useAuth();
  const accountEmail = user?.email || '';
  const { unread: unreadMessages, clearUnread } = usePortalMessages(user?.id || '', accountEmail);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showPortalSettings, setShowPortalSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'account' | 'notifications'>('account');
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [financials, setFinancials] = useState({ paidTotal: 0, pendingTotal: 0, openInvoiceTotal: 0, payments: [] as any[], invoices: [] as any[] });
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [unitDraft, setUnitDraft] = useState({ number: '', owner: '', status: 'occupied', dues: 'current' });
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || demoProfile?.name || 'Condo Manager');
  const email = accountEmail || demoProfile?.email || '';

  const loadRequests = async () => {
    if (!session?.access_token) { setRequests([]); setRequestsLoading(false); return; }
    setRequestsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/condo-manager/work-requests`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load work requests.');
      setRequests(Array.isArray(payload.workRequests) ? payload.workRequests : []);
    } catch (error: any) { setRequests([]); toast.error(error?.message || 'Unable to load condo work requests.'); }
    finally { setRequestsLoading(false); }
  };
  useEffect(() => { void loadRequests(); }, [session?.access_token]);

  const loadUnits = async () => {
    if (!session?.access_token) { setUnits([]); setUnitsLoading(false); return; }
    setUnitsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/condo-manager/units`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load association units.');
      setUnits(Array.isArray(payload.units) ? payload.units : []);
    } catch (error: any) { setUnits([]); toast.error(error?.message || 'Unable to load association units.'); } finally { setUnitsLoading(false); }
  };
  useEffect(() => { void loadUnits(); }, [session?.access_token]);

  async function addUnit(event: React.FormEvent) {
    event.preventDefault(); if (!session?.access_token || savingUnit) return; setSavingUnit(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/condo-manager/units`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(unitDraft) });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to add unit.');
      setUnits(current => [payload.unit, ...current]); setUnitDraft({ number: '', owner: '', status: 'occupied', dues: 'current' }); setShowUnitForm(false); toast.success('Unit added to the association roster.');
    } catch (error: any) { toast.error(error?.message || 'Unable to add unit.'); } finally { setSavingUnit(false); }
  }

  useEffect(() => {
    if (tab !== 'financials' || !session?.access_token) return;
    let cancelled = false;
    const loadFinancials = async () => {
      setFinancialsLoading(true);
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/condo-manager/financials`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load financial records.');
        if (!cancelled) setFinancials({ ...payload.summary, payments: Array.isArray(payload.payments) ? payload.payments : [], invoices: Array.isArray(payload.invoices) ? payload.invoices : [] });
      } catch (error: any) { if (!cancelled) { setFinancials({ paidTotal: 0, pendingTotal: 0, openInvoiceTotal: 0, payments: [], invoices: [] }); toast.error(error?.message || 'Unable to load financial records.'); } }
      finally { if (!cancelled) setFinancialsLoading(false); }
    };
    void loadFinancials();
    return () => { cancelled = true; };
  }, [tab, session?.access_token]);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    if (!session?.access_token || decisionId) return; setDecisionId(id);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/condo-manager/work-requests/${id}/decision`, { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to update work request.');
      setRequests(current => current.map(request => request.id === id ? payload.workRequest : request)); toast.success(decision === 'approved' ? 'Work request approved and saved.' : 'Work request rejected and saved.');
    } catch (error: any) { toast.error(error?.message || 'Unable to update work request.'); } finally { setDecisionId(null); }
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>
      <Safe><SponsoredMarquee /></Safe>

      <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 64, zIndex: 30 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{demoProfile?.company || 'Lakewood Heights HOA'}</h1>
                <p className="text-xs text-gray-500 font-medium">{name} · {email} · Condo Manager</p>
              </div>
            </div>
            <button aria-label="Notifications" onClick={() => { setSettingsSection('notifications'); setShowPortalSettings(true); }} className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
              <Bell className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition flex-shrink-0 ${
                    tab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-indigo-500/30'
                  }`}>
                  <Icon className="w-4 h-4" />{t.label}
                  {t.badge && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{t.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {tab === 'guide' && <PortalFeatureGuide portal="condo_manager" />}
        {tab === 'associations' && <CondoMasterAccount session={session} />}

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Units', value: String(units.length), icon: Building2 },
                { label: 'Occupancy Rate', value: units.length ? `${Math.round((units.filter(unit => unit.status === 'occupied').length / units.length) * 100)}%` : '—', icon: CheckCircle },
                { label: 'HOA Dues Collected', value: '$48K', icon: DollarSign },
                { label: 'Open Requests', value: String(requests.filter(r => ['open', 'pending', 'pending_approval'].includes(r.status)).length), icon: Wrench },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5 hover:border-indigo-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Recent Work Requests</h3>
                  <button onClick={() => setTab('work-requests')} className="text-indigo-400 text-sm font-semibold flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {requests.map(r => (
                    <div key={r.id} className="bg-[#0A0A0A] rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{r.title}</p>
                        <p className="text-gray-500 text-xs">{r.unit}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityBadge(r.priority)}`}>{r.priority}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Recent HOA Dues</h3>
                  <button onClick={() => setTab('financials')} className="text-indigo-400 text-sm font-semibold flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {DUES.map(d => (
                    <div key={d.id} className="bg-[#0A0A0A] rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{d.unit} · {d.owner}</p>
                        <p className="text-gray-500 text-xs">{d.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">${d.amount}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(d.status)}`}>{d.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'units' && (
          <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Units</h2><p className="mt-1 text-sm text-gray-400">Your saved association unit and owner roster.</p></div><button type="button" onClick={() => setShowUnitForm(value => !value)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500"><Plus className="h-4 w-4" /> Add unit</button></div>
            {showUnitForm && <form onSubmit={addUnit} className="grid grid-cols-1 gap-3 rounded-xl border border-indigo-500/25 bg-[#151515] p-5 sm:grid-cols-2"><input required value={unitDraft.number} onChange={event => setUnitDraft(value => ({ ...value, number: event.target.value }))} placeholder="Unit number" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" /><input required={unitDraft.status === 'occupied'} value={unitDraft.owner} onChange={event => setUnitDraft(value => ({ ...value, owner: event.target.value }))} placeholder="Owner name" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" /><select value={unitDraft.status} onChange={event => setUnitDraft(value => ({ ...value, status: event.target.value }))} className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"><option value="occupied">Occupied</option><option value="vacant">Vacant</option></select><select disabled={unitDraft.status === 'vacant'} value={unitDraft.status === 'vacant' ? 'n/a' : unitDraft.dues} onChange={event => setUnitDraft(value => ({ ...value, dues: event.target.value }))} className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-60"><option value="current">Dues current</option><option value="overdue">Dues overdue</option></select><div className="flex gap-2 sm:col-span-2"><button disabled={savingUnit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingUnit ? 'Saving…' : 'Save unit'}</button><button type="button" onClick={() => setShowUnitForm(false)} className="rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300">Cancel</button></div></form>}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">{unitsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading association units…</div> : units.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No units have been added to this association yet.</div> : units.map(u => <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold">Unit {u.number}</p><p className="text-gray-500 text-sm">{u.owner}</p></div><div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(u.status)}`}>{u.status}</span>{u.dues !== 'n/a' && <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(u.dues)}`}>dues {u.dues}</span>}</div></div>)}</div>
          </div>
        )}

        {tab === 'owners' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Owners</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {units.filter(u => u.owner !== 'Vacant').map(u => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{u.owner}</p>
                    <p className="text-gray-500 text-sm">Unit {u.number}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(u.dues)}`}>dues {u.dues}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'work-requests' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Work Requests</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {requestsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading assigned requests…</div> : requests.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No work requests are currently assigned to this condo-management account.</div> : requests.map(r => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{r.title}</p>
                    <p className="text-gray-500 text-sm">{r.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityBadge(r.priority)}`}>{r.priority}</span>
                    {(['open', 'pending', 'pending_approval'].includes(r.status)) ? (
                      <>
                        <button disabled={decisionId === r.id} onClick={() => decide(r.id, 'approved')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg text-xs font-bold transition">{decisionId === r.id ? 'Saving…' : 'Approve'}</button>
                        <button disabled={decisionId === r.id} onClick={() => decide(r.id, 'rejected')} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg text-xs font-bold transition">Reject</button>
                      </>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(r.status)}`}>{r.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'plan-tracker' && <MaintenancePlanTracker portalRole="condo_manager" ownerName={name} />}
        {tab === 'plan-builder' && <PlanBuilderTab portalType="condo_manager" ownerName={name} />}
        {tab === 'crm' && <CRMSection portalType="condo-manager" />}
        {tab === 'investments' && <InvestmentTab portalType="condo_manager" ownerName={name} />}
        {tab === 'deals' && (<>
          <FeaturedDealsReels portalType="condo_manager" />
          <DealsOffersSection portalType="advertiser" storageKey="condo_deals_offers" />
        </>)}

        {tab === 'financials' && (
          <div className="space-y-4">
            <div><h2 className="text-xl font-bold">Account Financials</h2><p className="mt-1 text-sm text-gray-400">Verified invoice and payment activity for this condo-management account.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">{[{ label: 'Verified Payments', value: financials.paidTotal, color: 'text-green-400' }, { label: 'Pending Payments', value: financials.pendingTotal, color: 'text-amber-400' }, { label: 'Open Invoice Balance', value: financials.openInvoiceTotal, color: 'text-red-400' }].map((item, i) => <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"><p className={`text-2xl font-bold ${item.color}`}>${Number(item.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-sm text-gray-400 mt-1">{item.label}</p></div>)}</div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">{financialsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading financial activity…</div> : financials.payments.length === 0 && financials.invoices.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No invoices or payment activity are available for this account yet.</div> : <>{financials.payments.map((payment: any) => <div key={`payment-${payment.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold">Payment</p><p className="text-gray-500 text-sm">{new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className="text-lg font-bold">${Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(payment.status)}`}>{String(payment.status || 'pending').replace(/_/g, ' ')}</span></div></div>)}{financials.invoices.filter((invoice: any) => !financials.payments.some((payment: any) => payment.invoiceId === invoice.id)).map((invoice: any) => <div key={`invoice-${invoice.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold">{invoice.invoice_number || invoice.description || 'Invoice'}</p><p className="text-gray-500 text-sm">{new Date(invoice.due_date || invoice.dueDate || invoice.createdAt || invoice.created_at || Date.now()).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className="text-lg font-bold">${Number(invoice.balance_due ?? invoice.balanceDue ?? invoice.amountDue ?? invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(invoice.status)}`}>{String(invoice.status || 'open').replace(/_/g, ' ')}</span></div></div>)}</>}</div>
          </div>
        )}

        {tab === 'revenue-ai' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" /> Revenue AI — Condo Portfolio
                </h2>
                <p className="text-sm text-gray-400 mt-1">Identify common area revenue and cost-reduction opportunities across your managed associations.</p>
              </div>
              <button
                onClick={() => { try { (window as any).__navigateApp('property-revenue'); } catch { toast.success('Navigate to Property Revenue Intelligence'); } }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Full Portfolio Analysis
              </button>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-indigo-400 mb-1">NH RSA 356-B — Condo Manager Authority</p>
              <p className="text-sm text-gray-300">Under NH RSA 356-B, condo managers can propose and implement association revenue programs with proper board approval. Common area amenities, vendor programs, and parking allocation changes all fall within manageable scope — each opportunity below includes board approval guidance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONDO_MGR_OPPS.map((opp, i) => {
                const Icon = opp.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-indigo-500/30 rounded-xl p-5 transition space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-5 h-5 ${opp.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{opp.name}</p>
                        <p className="text-xs text-gray-400">{opp.rev}</p>
                      </div>
                      <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${opp.difficulty === 'Easy' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}`}>
                        {opp.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{opp.nhNote}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#1A1A1A] border border-indigo-500/20 rounded-xl p-6">
              <p className="text-sm font-semibold text-indigo-400 mb-3">Condo Fee Impact — 180 Units × 2 Programs</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'EV Charging (8 ports)', annual: '$9,600/yr', perUnit: '−$53/unit/yr in dues' },
                  { label: 'Package Lockers (3 bays)', annual: '$6,000/yr', perUnit: '−$33/unit/yr in dues' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                    <p className="text-sm font-bold text-indigo-300">{item.annual}</p>
                    <p className="text-xs text-green-400 mt-0.5">{item.perUnit}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <span className="text-sm font-semibold text-gray-300">Combined Annual Association Revenue</span>
                <span className="text-xl font-bold text-indigo-400">+$15,600/yr</span>
              </div>
            </div>

            <button
              onClick={() => { try { (window as any).__navigateApp('property-revenue'); } catch { toast.success('Navigate to Property Revenue Intelligence'); } }}
              className="w-full py-4 rounded-xl border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 transition text-sm font-semibold flex items-center justify-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Open Full AI Revenue Analysis →
            </button>
          </div>
        )}

        {tab === 'messages' && (
          <div className="p-6">
            <MessagesTab userId="" userEmail={email} userName={name} onTabOpen={clearUnread} />
          </div>
        )}
        {tab === 'documents' && <PortalDocumentVault session={session} accent="indigo" />}
        {tab === 'settings' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-xl font-bold">Settings</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Condo Manager Name</label>
                <input value={name} readOnly
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-indigo-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input value={email} readOnly
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-indigo-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <button /* The fields above are readOnly, so there was never anything to save — this
                  button announced success for work it never did. It now opens the
                  panel where things can actually be changed. */
              onClick={() => { setSettingsSection('account'); setShowPortalSettings(true); }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition">
                Save Changes
              </button>
            </div>
          </div>
        )}

      </div>

      <Safe><AdvertisingMarquee /></Safe>
      <PortalSettings
        open={showPortalSettings}
        onClose={() => setShowPortalSettings(false)}
        initialSection={settingsSection}
        portalName="Condo manager portal"
      />
    </div>
  );
}
