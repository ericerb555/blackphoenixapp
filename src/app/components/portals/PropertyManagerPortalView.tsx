import PortalFeatureGuide from './PortalFeatureGuide';
import { useState, useEffect, Component, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Building2, DollarSign, Users, Wrench, Settings, Bell,
  Home, CreditCard, ChevronRight, ArrowUpRight, CheckCircle, Tag, BarChart3, MessageSquare,
  TrendingUp, Zap, Star, Package, Car, Wifi, Sparkles, LoaderCircle, Plus,
} from 'lucide-react';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import CRMSection from './CRMSection';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import { MessagesTab, usePortalMessages } from './PortalMessagesSystem';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';

class Safe extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  componentDidCatch() { this.setState({ err: true }); }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

const WORK_REQUESTS = [
  { id: 'wr1', title: 'Pool heater malfunction', unit: 'Common Area', priority: 'high', status: 'open' },
  { id: 'wr2', title: 'Water leak Unit 305', unit: 'Unit 305', priority: 'urgent', status: 'open' },
  { id: 'wr3', title: 'Elevator inspection', unit: 'Building B', priority: 'medium', status: 'pending' },
];

const PROPERTIES = [
  { id: 'p1', name: 'Harborview Condos', units: 240, occupied: 228, address: '100 Harbor Blvd' },
  { id: 'p2', name: 'Sunset Towers', units: 180, occupied: 171, address: '500 Sunset Ave' },
];

const PAYMENTS = [
  { id: 'PMT-001', property: 'Harborview Condos', amount: 24000, date: '2026-06-01', status: 'paid' },
  { id: 'PMT-002', property: 'Sunset Towers', amount: 18200, date: '2026-06-01', status: 'paid' },
  { id: 'PMT-003', property: 'Harborview Condos', amount: 3000, date: '2026-06-15', status: 'pending' },
];

function priorityBadge(p: string) {
  if (p === 'urgent') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (p === 'high') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  if (p === 'medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

function statusBadge(s: string) {
  if (s === 'paid' || s === 'approved') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
}

type Tab = 'dashboard' | 'properties' | 'work-requests' | 'plan-tracker' | 'plan-builder' | 'crm' | 'deals' | 'payments' | 'revenue-ai' | 'messages' | 'settings' | 'guide';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'work-requests', label: 'Work Requests', icon: Wrench },
  { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
  { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'deals', label: 'Deals & Reels', icon: Tag },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'revenue-ai', label: 'Revenue AI', icon: TrendingUp, badge: 'NEW' },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
];

const PM_OPPS = [
  { icon: Package, color: 'text-amber-400', name: 'Bulk Maintenance Contracts', rev: '$1,200–$3,600/yr per property', difficulty: 'Easy', nhNote: 'NH RSA 540 allows landlords to pass through documented maintenance costs — bulk contracts improve margins.' },
  { icon: Car, color: 'text-blue-400', name: 'Portfolio Parking Optimization', rev: '$400–$2,400/yr per property', difficulty: 'Easy', nhNote: 'NH has no state cap on parking fees — market rate applies in most municipalities.' },
  { icon: Wifi, color: 'text-purple-400', name: 'Bulk Internet Resale Program', rev: '$600–$1,800/yr per property', difficulty: 'Medium', nhNote: 'Consolidated Communications and Spectrum both offer NH property manager bulk-rate agreements.' },
  { icon: Zap, color: 'text-green-400', name: 'EV Charging Portfolio Rollout', rev: '$800–$2,400/yr per property', difficulty: 'Medium', nhNote: 'Eversource NH offers Level 2 charger rebates up to $500/port — significant cost reduction for managers.' },
  { icon: Star, color: 'text-orange-400', name: 'Maintenance Subscription Plans', rev: '$240–$720/yr per unit', difficulty: 'Easy', nhNote: 'Recurring maintenance contracts reduce RSA 540 habitability risk and improve NOI predictability.' },
  { icon: TrendingUp, color: 'text-teal-400', name: 'Portfolio Performance Reports', rev: '$150–$600/yr per owner', difficulty: 'Easy', nhNote: 'NH property owners increasingly demand data — premium reporting tier adds recurring revenue.' },
];

function getDemoProfile() {
  try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; }
}

export default function PropertyManagerPortalView() {
  const demoProfile = getDemoProfile();
  const { user, session } = useAuth();
  const accountEmail = user?.email || '';
  const { unread: unreadMessages, clearUnread } = usePortalMessages(user?.id || '', accountEmail);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [propertyDraft, setPropertyDraft] = useState({ name: '', address: '', units: '1', occupied: '0' });
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || demoProfile?.name || 'Property Manager');
  const email = accountEmail || demoProfile?.email || '';

  const loadRequests = async () => {
    if (!session?.access_token) { setRequests([]); setRequestsLoading(false); return; }
    setRequestsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-manager/work-requests`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load work requests.');
      setRequests(Array.isArray(payload.workRequests) ? payload.workRequests : []);
    } catch (error: any) {
      setRequests([]);
      toast.error(error?.message || 'Unable to load property work requests.');
    } finally { setRequestsLoading(false); }
  };

  useEffect(() => { void loadRequests(); }, [session?.access_token]);

  const loadProperties = async () => {
    if (!session?.access_token) { setProperties([]); setPropertiesLoading(false); return; }
    setPropertiesLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-manager/properties`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load properties.');
      setProperties(Array.isArray(payload.properties) ? payload.properties : []);
    } catch (error: any) { setProperties([]); toast.error(error?.message || 'Unable to load property portfolio.'); }
    finally { setPropertiesLoading(false); }
  };

  useEffect(() => { void loadProperties(); }, [session?.access_token]);

  async function addProperty(event: React.FormEvent) {
    event.preventDefault();
    if (!session?.access_token || savingProperty) return;
    setSavingProperty(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-manager/properties`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...propertyDraft, units: Number(propertyDraft.units), occupied: Number(propertyDraft.occupied) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to add property.');
      setProperties(current => [payload.property, ...current]);
      setPropertyDraft({ name: '', address: '', units: '1', occupied: '0' });
      setShowPropertyForm(false);
      toast.success('Property added to your portfolio.');
    } catch (error: any) { toast.error(error?.message || 'Unable to add property.'); }
    finally { setSavingProperty(false); }
  }

  useEffect(() => {
    if (tab !== 'payments' || !session?.access_token) return;
    let cancelled = false;
    const loadPayments = async () => {
      setPaymentsLoading(true);
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-manager/payments`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load payment records.');
        const paymentRows = (Array.isArray(payload.payments) ? payload.payments : []).map((payment: any) => ({
          id: payment.id,
          label: payment.invoice?.invoice_number || payment.subscription?.plan || payment.invoice?.description || 'Payment',
          amount: Number(payment.amount || 0),
          date: payment.paidAt || payment.createdAt,
          status: payment.status || 'pending_confirmation',
          invoiceId: payment.invoice?.id || payment.invoiceId || null,
          kind: 'payment',
        }));
        const invoicesWithPayments = new Set(paymentRows.map((payment: any) => payment.invoiceId).filter(Boolean));
        const invoiceRows = (Array.isArray(payload.invoices) ? payload.invoices : [])
          .filter((invoice: any) => !invoicesWithPayments.has(invoice.id))
          .map((invoice: any) => ({
            id: invoice.id,
            label: invoice.invoice_number || invoice.description || 'Invoice',
            amount: Number(invoice.balance_due ?? invoice.balanceDue ?? invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0),
            date: invoice.due_date || invoice.dueDate || invoice.createdAt || invoice.created_at,
            status: invoice.status || 'open',
            kind: 'invoice',
          }));
        if (!cancelled) setPayments([...paymentRows, ...invoiceRows].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
      } catch (error: any) {
        if (!cancelled) { setPayments([]); toast.error(error?.message || 'Unable to load payment records.'); }
      } finally { if (!cancelled) setPaymentsLoading(false); }
    };
    void loadPayments();
    return () => { cancelled = true; };
  }, [tab, session?.access_token]);

  async function decide(id: string, decision: 'approved' | 'rejected') {
    if (!session?.access_token || decisionId) return;
    setDecisionId(id);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/property-manager/work-requests/${id}/decision`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to update the work request.');
      setRequests(prev => prev.map(request => request.id === id ? payload.workRequest : request));
      toast.success(decision === 'approved' ? 'Work request approved and saved.' : 'Work request rejected and saved.');
    } catch (error: any) { toast.error(error?.message || 'Unable to update the work request.'); }
    finally { setDecisionId(null); }
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>
      <Safe><SponsoredMarquee /></Safe>

      <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 64, zIndex: 30 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{demoProfile?.company || 'Prestige Property Management'}</h1>
                <p className="text-xs text-gray-500 font-medium">{name} · {email} · Property Manager</p>
              </div>
            </div>
            <button className="p-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white transition">
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
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-amber-500/30'
                  }`}>
                  <Icon className="w-4 h-4" />{t.label}
                  {t.badge && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">{t.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {tab === 'guide' && <PortalFeatureGuide portal="property_manager" />}

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Properties', value: String(properties.length), icon: Building2 },
                { label: 'Active Tenants', value: String(properties.reduce((sum, property) => sum + Number(property.occupied || 0), 0)), icon: Users },
                { label: 'Monthly Revenue', value: '$45,200', icon: DollarSign },
                { label: 'Work Requests', value: String(requests.filter(r => ['open', 'pending', 'pending_approval'].includes(r.status)).length), icon: Wrench },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5 hover:border-amber-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-amber-400" />
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
                  <button onClick={() => setTab('work-requests')} className="text-amber-400 text-sm font-semibold flex items-center gap-1">
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
                  <h3 className="text-lg font-bold">Properties</h3>
                  <button onClick={() => setTab('properties')} className="text-amber-400 text-sm font-semibold flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {propertiesLoading ? <div className="py-4 text-sm text-gray-500">Loading portfolio…</div> : properties.length === 0 ? <div className="py-4 text-sm text-gray-500">Add your first managed property to begin tracking it here.</div> : properties.slice(0, 3).map(p => (
                    <div key={p.id} className="bg-[#0A0A0A] rounded-lg p-4">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-gray-500 text-xs">{p.units} units · {p.occupied || 0} occupied · {p.address}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'properties' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Properties</h2><p className="mt-1 text-sm text-gray-400">Your saved property-management portfolio.</p></div><button type="button" onClick={() => setShowPropertyForm(value => !value)} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-500"><Plus className="h-4 w-4" /> Add property</button></div>
            {showPropertyForm && <form onSubmit={addProperty} className="grid grid-cols-1 gap-3 rounded-xl border border-amber-500/25 bg-[#151515] p-5 sm:grid-cols-2"><input required value={propertyDraft.name} onChange={event => setPropertyDraft(value => ({ ...value, name: event.target.value }))} placeholder="Property name" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 sm:col-span-2" /><input required value={propertyDraft.address} onChange={event => setPropertyDraft(value => ({ ...value, address: event.target.value }))} placeholder="Street address" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 sm:col-span-2" /><input required min="1" type="number" value={propertyDraft.units} onChange={event => setPropertyDraft(value => ({ ...value, units: event.target.value }))} placeholder="Total units" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /><input required min="0" type="number" value={propertyDraft.occupied} onChange={event => setPropertyDraft(value => ({ ...value, occupied: event.target.value }))} placeholder="Occupied units" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" /><div className="flex gap-2 sm:col-span-2"><button disabled={savingProperty} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingProperty ? 'Saving…' : 'Save property'}</button><button type="button" onClick={() => setShowPropertyForm(false)} className="rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300">Cancel</button></div></form>}
            {propertiesLoading ? <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">Loading property portfolio…</div> : properties.length === 0 ? <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">No properties have been added to this account yet.</div> : properties.map(p => (
              <div key={p.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-amber-500/30 transition">
                <div className="flex items-start justify-between"><div><p className="font-bold text-lg">{p.name}</p><p className="text-gray-400 text-sm">{p.address}</p></div><div className="text-right"><p className="text-2xl font-bold">{p.units}</p><p className="text-gray-500 text-xs">Total Units</p></div></div>
                <div className="mt-4 flex gap-4 text-sm"><span className="text-green-400 font-semibold"><CheckCircle className="w-4 h-4 inline mr-1" />{p.occupied || 0} Occupied</span><span className="text-gray-500">{Math.max(0, Number(p.units || 0) - Number(p.occupied || 0))} Vacant</span><span className="text-amber-400 font-semibold">{Number(p.units) ? Math.round((Number(p.occupied || 0) / Number(p.units)) * 100) : 0}% Occupancy</span></div>
              </div>
            ))}
          </div>
        )}

        {tab === 'work-requests' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Work Requests</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {requestsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading assigned requests…</div> : requests.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No work requests are currently assigned to this property-management account.</div> : requests.map(r => (
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

        {tab === 'plan-tracker' && <MaintenancePlanTracker portalRole="property_manager" ownerName={name} />}
        {tab === 'plan-builder' && <PlanBuilderTab portalType="property_manager" ownerName={name} />}
        {tab === 'crm' && <CRMSection portalType="property-manager" />}
        {tab === 'deals' && (<>
          <FeaturedDealsReels portalType="property_manager" />
          <DealsOffersSection portalType="advertiser" storageKey="pm_deals_offers" />
        </>)}

        {tab === 'payments' && (
          <div className="space-y-4">
            <div><h2 className="text-xl font-bold">Payments & Invoices</h2><p className="mt-1 text-sm text-gray-400">Your property-management account’s verified payment and invoice activity.</p></div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {paymentsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading payment activity…</div> : payments.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No invoices or payment activity are available for this account yet.</div> : payments.map(p => (
                <div key={`${p.kind}-${p.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{p.label}</p>
                    <p className="text-gray-500 text-sm">{p.kind === 'invoice' ? 'Invoice' : 'Payment'} · {p.date ? new Date(p.date).toLocaleDateString() : 'Date pending'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(p.status)}`}>{String(p.status).replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'revenue-ai' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" /> Revenue AI — Portfolio Intelligence
                </h2>
                <p className="text-sm text-gray-400 mt-1">Identify revenue opportunities across your managed properties.</p>
              </div>
              <button
                onClick={() => { try { (window as any).__navigateApp('property-revenue'); } catch { toast.success('Navigate to Property Revenue Intelligence'); } }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Full Portfolio Analysis
              </button>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
              <p className="text-sm font-semibold text-amber-400 mb-1">NH Property Manager Advantage</p>
              <p className="text-sm text-gray-300">As a NH property manager, you operate under RSA 540 (landlord-tenant) with flexibility to structure fee programs, bulk vendor contracts, and value-add amenities that generate recurring revenue across your entire managed portfolio — not just one property.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PM_OPPS.map((opp, i) => {
                const Icon = opp.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-amber-500/30 rounded-xl p-5 transition space-y-3">
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

            <div className="bg-[#1A1A1A] border border-amber-500/20 rounded-xl p-6">
              <p className="text-sm font-semibold text-amber-400 mb-3">Portfolio Scenario — 3 Properties × 3 Programs</p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Bulk Internet Resale', value: '+$4,800/yr' },
                  { label: 'EV Charging (6 ports)', value: '+$7,200/yr' },
                  { label: 'Maintenance Plans', value: '+$8,640/yr' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 text-center">
                    <p className="text-lg font-bold text-amber-400">{item.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <span className="text-sm font-semibold text-gray-300">Combined Portfolio Uplift</span>
                <span className="text-xl font-bold text-amber-400">+$20,640/yr</span>
              </div>
            </div>

            <button
              onClick={() => { try { (window as any).__navigateApp('property-revenue'); } catch { toast.success('Navigate to Property Revenue Intelligence'); } }}
              className="w-full py-4 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition text-sm font-semibold flex items-center justify-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Open Full AI Revenue Analysis →
            </button>
          </div>
        )}

        {tab === 'messages' && (
          <div className="p-6">
            <MessagesTab userId="" userEmail={email} userName={name} onTabOpen={clearUnread} />
          </div>
        )}
        {tab === 'settings' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-xl font-bold">Settings</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Property Manager Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-amber-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-amber-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <button onClick={() => toast.success('Settings saved!')}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition">
                Save Changes
              </button>
            </div>
          </div>
        )}

      </div>

      <Safe><AdvertisingMarquee /></Safe>
    </div>
  );
}
