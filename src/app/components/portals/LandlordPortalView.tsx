import PortalFeatureGuide from './PortalFeatureGuide';
import TenantPortalManager from './TenantPortalManager';
import { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { toast } from 'sonner';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Home, DollarSign, Users, Wrench, Settings, Bell,
  Building2, BarChart3, ChevronRight, ArrowUpRight, Tag, MessageSquare,
  TrendingUp, Zap, Package, Droplets, Car, Wifi, Star, Sparkles, LoaderCircle, Plus, FileText, CircleDollarSign, ShieldCheck, Gauge, CalendarClock,
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

const TENANTS = [
  { id: 't1', name: 'Alice Monroe', unit: '12A - Oak St', rent: 1800, status: 'current' },
  { id: 't2', name: 'Brian Walsh', unit: '3B - Maple Ave', rent: 1500, status: 'current' },
  { id: 't3', name: 'Carmen Diaz', unit: '7 - Pine Rd', rent: 2100, status: 'late' },
];

const MAINTENANCE = [
  { id: 'm1', title: 'Dishwasher leaking', unit: '12A - Oak St', priority: 'high', status: 'open' },
  { id: 'm2', title: 'Broken window latch', unit: '3B - Maple Ave', priority: 'medium', status: 'open' },
  { id: 'm3', title: 'HVAC filter replacement', unit: '7 - Pine Rd', priority: 'low', status: 'scheduled' },
];

const PROPERTIES = [
  { id: 'p1', name: 'Oak Street Duplex', address: '14 Oak St', units: 8, vacancies: 1 },
  { id: 'p2', name: 'Maple Avenue Flats', address: '201 Maple Ave', units: 12, vacancies: 0 },
  { id: 'p3', name: 'Pine Road House', address: '7 Pine Rd', units: 6, vacancies: 1 },
  { id: 'p4', name: 'Cedar Complex', address: '55 Cedar Blvd', units: 6, vacancies: 0 },
];

function priorityBadge(p: string) {
  if (p === 'urgent') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (p === 'high') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  if (p === 'medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

function rentBadge(s: string) {
  if (s === 'current') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'late') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
}

function statusBadge(s: string) {
  if (s === 'approved' || s === 'scheduled') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
}

type Tab = 'dashboard' | 'properties' | 'tenants' | 'maintenance' | 'plan-tracker' | 'plan-builder' | 'crm' | 'deals' | 'financials' | 'messages' | 'settings' | 'revenue-ai' | 'guide';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
  { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'deals', label: 'Deals & Reels', icon: Tag },
  { id: 'financials', label: 'Financials', icon: BarChart3 },
  { id: 'revenue-ai', label: 'Revenue AI', icon: TrendingUp, badge: 'NEW' },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'guide', label: 'Portal Guide', icon: FileText },
];

// Lightweight revenue opportunities for the landlord portal preview
const LANDLORD_OPPS = [
  { icon: Package,  color: '#fbbf24', name: 'Storage Locker Rentals',       rev: '$420–$900/yr per unit',  diff: 'Easy',   risk: 'Low',    nhNote: 'NH RSA 540: no restrictions on storage fees.' },
  { icon: Car,      color: '#60a5fa', name: 'Reserved Parking Rentals',      rev: '$480–$1,440/yr per space',diff: 'Easy',  risk: 'Low',    nhNote: 'Verify leases do not include free parking.' },
  { icon: Droplets, color: '#34d399', name: 'Laundry Room Upgrade',          rev: '$18–$42/unit/mo',        diff: 'Easy',   risk: 'Low',    nhNote: 'CSC ServiceWorks & WASH operate in NH.' },
  { icon: Wifi,     color: '#818cf8', name: 'Bulk Internet Package',         rev: '$12–$30/unit/mo net',    diff: 'Easy',   risk: 'Low',    nhNote: 'Consolidated Communications offers NH bulk rates.' },
  { icon: Zap,      color: '#a78bfa', name: 'EV Charging Stations',          rev: '$1,920–$9,600/yr',       diff: 'Medium', risk: 'Low',    nhNote: 'Eversource NH rebates up to $2,500/charger available.' },
  { icon: Star,     color: '#fb923c', name: 'Maintenance Memberships',       rev: '$8–$25/unit/mo',         diff: 'Easy',   risk: 'Low',    nhNote: 'Black Phoenix service integration — no subcontracting needed.' },
];

function getDemoProfile() {
  try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; }
}

export default function LandlordPortalView() {
  const demoProfile = getDemoProfile();
  const { user, session } = useAuth();
  const accountEmail = user?.email || '';
  const { unread: unreadMessages, clearUnread } = usePortalMessages(user?.id || '', accountEmail);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [financials, setFinancials] = useState({ paidTotal: 0, pendingTotal: 0, openInvoiceTotal: 0, payments: [] as any[], invoices: [] as any[] });
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [savingProperty, setSavingProperty] = useState(false);
  const [propertyDraft, setPropertyDraft] = useState({ name: '', address: '', units: '1', vacancies: '0' });
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantDraft, setTenantDraft] = useState({ name: '', unit: '', rent: '', status: 'current' });
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || demoProfile?.name || 'Landlord');
  const email = accountEmail || demoProfile?.email || '';

  // This is intentionally calculated from the landlord's saved live records—no marketing-only metrics.
  const portfolioPulse = useMemo(() => {
    const totalUnits = properties.reduce((sum, property) => sum + Math.max(0, Number(property.units || 0)), 0);
    const vacancies = properties.reduce((sum, property) => sum + Math.max(0, Number(property.vacancies || 0)), 0);
    const occupiedUnits = Math.max(0, totalUnits - vacancies);
    const occupancy = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const scheduledRent = tenants.reduce((sum, tenant) => sum + Math.max(0, Number(tenant.rent || 0)), 0);
    const currentTenants = tenants.filter(tenant => String(tenant.status || '').toLowerCase() === 'current').length;
    const collectionRate = tenants.length ? Math.round((currentTenants / tenants.length) * 100) : 0;
    const averageRent = tenants.length ? Math.round(scheduledRent / tenants.length) : 0;
    const urgentRequests = maintenance.filter(request => ['urgent', 'high'].includes(String(request.priority || '').toLowerCase()) && !['completed', 'rejected'].includes(String(request.status || '').toLowerCase())).length;
    const openRequests = maintenance.filter(request => !['completed', 'rejected'].includes(String(request.status || '').toLowerCase())).length;
    const vacancyExposure = totalUnits ? Math.round(scheduledRent * (vacancies / Math.max(occupiedUnits, 1))) : 0;

    return {
      totalUnits, vacancies, occupiedUnits, occupancy, scheduledRent, currentTenants,
      collectionRate, averageRent, urgentRequests, openRequests, vacancyExposure,
      occupancyData: [
        { name: 'Occupied', value: occupiedUnits },
        { name: 'Available', value: vacancies },
      ],
      healthData: [
        { label: 'Occupancy', value: occupancy },
        { label: 'Collections', value: collectionRate },
        { label: 'Maintenance', value: openRequests ? Math.max(25, 100 - (urgentRequests * 20) - (openRequests * 6)) : 100 },
      ],
    };
  }, [properties, tenants, maintenance]);

  const loadMaintenance = async () => {
    if (!session?.access_token) { setMaintenance([]); setMaintenanceLoading(false); return; }
    setMaintenanceLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/work-requests`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load maintenance requests.');
      setMaintenance(Array.isArray(payload.workRequests) ? payload.workRequests : []);
    } catch (error: any) { setMaintenance([]); toast.error(error?.message || 'Unable to load maintenance requests.'); }
    finally { setMaintenanceLoading(false); }
  };

  useEffect(() => { void loadMaintenance(); }, [session?.access_token]);

  const loadProperties = async () => {
    if (!session?.access_token) { setProperties([]); setPropertiesLoading(false); return; }
    setPropertiesLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/properties`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load properties.');
      setProperties(Array.isArray(payload.properties) ? payload.properties : []);
    } catch (error: any) { setProperties([]); toast.error(error?.message || 'Unable to load landlord properties.'); }
    finally { setPropertiesLoading(false); }
  };
  useEffect(() => { void loadProperties(); }, [session?.access_token]);

  const loadTenants = async () => {
    if (!session?.access_token) { setTenants([]); setTenantsLoading(false); return; }
    setTenantsLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/tenants`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load tenants.');
      setTenants(Array.isArray(payload.tenants) ? payload.tenants : []);
    } catch (error: any) { setTenants([]); toast.error(error?.message || 'Unable to load tenants.'); }
    finally { setTenantsLoading(false); }
  };
  useEffect(() => { void loadTenants(); }, [session?.access_token]);

  async function addTenant(event: React.FormEvent) {
    event.preventDefault(); if (!session?.access_token || savingTenant) return; setSavingTenant(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/tenants`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tenantDraft, rent: Number(tenantDraft.rent) }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to add tenant.');
      setTenants(current => [payload.tenant, ...current]); setTenantDraft({ name: '', unit: '', rent: '', status: 'current' }); setShowTenantForm(false); toast.success('Tenant saved to your roster.');
    } catch (error: any) { toast.error(error?.message || 'Unable to add tenant.'); } finally { setSavingTenant(false); }
  }

  async function addProperty(event: React.FormEvent) {
    event.preventDefault(); if (!session?.access_token || savingProperty) return; setSavingProperty(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/properties`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...propertyDraft, units: Number(propertyDraft.units), vacancies: Number(propertyDraft.vacancies) }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to add property.');
      setProperties(current => [payload.property, ...current]); setPropertyDraft({ name: '', address: '', units: '1', vacancies: '0' }); setShowPropertyForm(false); toast.success('Property added to your portfolio.');
    } catch (error: any) { toast.error(error?.message || 'Unable to add property.'); } finally { setSavingProperty(false); }
  }

  useEffect(() => {
    if (tab !== 'financials' || !session?.access_token) return;
    let cancelled = false;
    const loadFinancials = async () => {
      setFinancialsLoading(true);
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/financials`, { headers: { Authorization: `Bearer ${session.access_token}` } });
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
    if (!session?.access_token || decisionId) return;
    setDecisionId(id);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/work-requests/${id}/decision`, { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to update maintenance request.');
      setMaintenance(current => current.map(request => request.id === id ? payload.workRequest : request));
      toast.success(decision === 'approved' ? 'Maintenance request approved and saved.' : 'Maintenance request rejected and saved.');
    } catch (error: any) { toast.error(error?.message || 'Unable to update maintenance request.'); }
    finally { setDecisionId(null); }
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>
      <Safe><SponsoredMarquee /></Safe>

      <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 64, zIndex: 30 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center">
                <Home className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{demoProfile?.company || 'Nguyen Rental Properties'}</h1>
                <p className="text-xs text-gray-500 font-medium">{name} · {email} · Landlord</p>
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
                      ? 'bg-teal-600 text-white'
                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-teal-500/30'
                  }`}>
                  <Icon className="w-4 h-4" />{t.label}
                  {t.badge && <span className="text-[8px] font-black px-1 py-0.5 rounded bg-yellow-500 text-black ml-1">{t.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {tab === 'guide' && <PortalFeatureGuide portal="landlord" />}

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Properties', value: String(properties.length), icon: Building2 },
                { label: 'Total Units', value: String(properties.reduce((sum, property) => sum + Number(property.units || 0), 0)), icon: Home },
                { label: 'Monthly Revenue', value: '$28,400', icon: DollarSign },
                { label: 'Vacancies', value: String(properties.reduce((sum, property) => sum + Number(property.vacancies || 0), 0)), icon: Wrench },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5 hover:border-teal-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-teal-400" />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                  </div>
                );
              })}
            </div>

            <TenantPortalManager parentPortalType="landlord" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Tenants</h3>
                  <button onClick={() => setTab('tenants')} className="text-teal-400 text-sm font-semibold flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {tenantsLoading ? <div className="py-4 text-sm text-gray-500">Loading tenant roster…</div> : tenants.length === 0 ? <div className="py-4 text-sm text-gray-500">Add tenants from the Tenants tab to track them here.</div> : tenants.slice(0, 3).map(t => (
                    <div key={t.id} className="bg-[#0A0A0A] rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-gray-500 text-xs">{t.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">${t.rent.toLocaleString()}/mo</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${rentBadge(t.status)}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Maintenance Requests</h3>
                  <button onClick={() => setTab('maintenance')} className="text-teal-400 text-sm font-semibold flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {maintenanceLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading maintenance requests…</div> : maintenance.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No maintenance requests are currently assigned to this landlord account.</div> : maintenance.map(m => (
                    <div key={m.id} className="bg-[#0A0A0A] rounded-lg p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{m.title}</p>
                        <p className="text-gray-500 text-xs">{m.unit}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityBadge(m.priority)}`}>{m.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-teal-500/20 bg-[#131817] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
              <div className="border-b border-white/5 bg-[radial-gradient(ellipse_at_top_left,_rgba(20,184,166,0.15),_transparent_42%)] px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-300">
                      <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.9)]" />
                      Live portfolio pulse
                    </div>
                    <h2 className="text-xl font-bold text-white sm:text-2xl">Know what needs attention before it costs you.</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">A live operating view built from your properties, tenant roster, and maintenance requests.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-teal-400/15 bg-black/20 px-3 py-2 text-xs text-teal-100">
                    <Gauge className="h-4 w-4 text-teal-400" />
                    Updates as your records change
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px bg-white/5 xl:grid-cols-[1.05fr_1.35fr_1fr]">
                <div className="bg-[#111514] p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-semibold text-white">Occupancy map</p><p className="mt-1 text-xs text-slate-500">Physical portfolio utilization</p></div>
                    <button onClick={() => setTab('properties')} className="text-xs font-semibold text-teal-300 hover:text-teal-200">Manage properties</button>
                  </div>
                  {portfolioPulse.totalUnits > 0 ? (
                    <div className="relative mt-4 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={portfolioPulse.occupancyData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={77} startAngle={90} endAngle={-270} paddingAngle={4} stroke="none">
                            <Cell fill="#2dd4bf" />
                            <Cell fill="#273331" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-white">{portfolioPulse.occupancy}%</span><span className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">occupied</span></div>
                    </div>
                  ) : (
                    <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 px-5 text-center"><Building2 className="mb-3 h-6 w-6 text-teal-400" /><p className="text-sm font-semibold text-white">Start your portfolio map</p><p className="mt-1 text-xs leading-5 text-slate-500">Add a property and its unit count to activate occupancy analytics.</p></div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-3 border-t border-white/5 pt-4"><div><p className="text-lg font-bold text-white">{portfolioPulse.occupiedUnits}</p><p className="text-xs text-slate-500">Occupied units</p></div><div><p className="text-lg font-bold text-white">{portfolioPulse.vacancies}</p><p className="text-xs text-slate-500">Available units</p></div></div>
                </div>

                <div className="bg-[#111514] p-5 sm:p-6">
                  <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Portfolio health</p><p className="mt-1 text-xs text-slate-500">The three signals that protect NOI</p></div><ShieldCheck className="h-5 w-5 text-teal-400" /></div>
                  {portfolioPulse.totalUnits || tenants.length || maintenance.length ? (
                    <div className="mt-5 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={portfolioPulse.healthData} layout="vertical" margin={{ top: 2, right: 18, left: 6, bottom: 2 }}>
                          <CartesianGrid horizontal={false} stroke="#25302e" strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis type="category" dataKey="label" width={78} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(45,212,191,0.05)' }} contentStyle={{ background: '#0b100f', border: '1px solid #2d4b45', borderRadius: 10, color: '#f8fafc' }} formatter={(value: number) => [`${value}%`, 'Health']} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#14b8a6" barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="mt-5 flex h-56 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/10 px-6 text-center text-sm leading-6 text-slate-500">Your health score will light up when property, tenant, or maintenance data is added.</div>}
                  <p className="mt-3 border-t border-white/5 pt-3 text-xs leading-5 text-slate-500">Maintenance health weighs open requests and urgent issues, so your next decision is visible at a glance.</p>
                </div>

                <div className="bg-[#111514] p-5 sm:p-6">
                  <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10"><CircleDollarSign className="h-5 w-5 text-amber-300" /></div><div><p className="text-sm font-semibold text-white">Revenue guardrails</p><p className="text-xs text-slate-500">Actions that protect cash flow</p></div></div>
                  <div className="mt-5 space-y-3">
                    <button onClick={() => setTab('tenants')} className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-teal-400/30 hover:bg-teal-400/5"><span><span className="block text-lg font-bold text-white">{portfolioPulse.collectionRate}%</span><span className="block text-xs text-slate-500">Tenant accounts current</span></span><ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-teal-300" /></button>
                    <button onClick={() => setTab('maintenance')} className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-teal-400/30 hover:bg-teal-400/5"><span><span className="block text-lg font-bold text-white">{portfolioPulse.urgentRequests}</span><span className="block text-xs text-slate-500">Urgent maintenance items</span></span><ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-teal-300" /></button>
                    <button onClick={() => setTab('plan-builder')} className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3 text-left transition hover:border-teal-400/30 hover:bg-teal-400/5"><span><span className="block text-lg font-bold text-white">{portfolioPulse.averageRent ? `$${portfolioPulse.averageRent.toLocaleString()}` : '—'}</span><span className="block text-xs text-slate-500">Average monthly rent</span></span><ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-teal-300" /></button>
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-teal-500/8 p-3 text-xs leading-5 text-teal-100"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />Review the portfolio pulse before approving work or planning a unit turn.</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === 'properties' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Properties</h2><p className="mt-1 text-sm text-gray-400">Your saved landlord portfolio.</p></div><button type="button" onClick={() => setShowPropertyForm(value => !value)} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-500"><Plus className="h-4 w-4" /> Add property</button></div>
            {showPropertyForm && <form onSubmit={addProperty} className="grid grid-cols-1 gap-3 rounded-xl border border-teal-500/25 bg-[#151515] p-5 sm:grid-cols-2"><input required value={propertyDraft.name} onChange={event => setPropertyDraft(value => ({ ...value, name: event.target.value }))} placeholder="Property name" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 sm:col-span-2" /><input required value={propertyDraft.address} onChange={event => setPropertyDraft(value => ({ ...value, address: event.target.value }))} placeholder="Street address" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 sm:col-span-2" /><input required min="1" type="number" value={propertyDraft.units} onChange={event => setPropertyDraft(value => ({ ...value, units: event.target.value }))} placeholder="Total units" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><input required min="0" type="number" value={propertyDraft.vacancies} onChange={event => setPropertyDraft(value => ({ ...value, vacancies: event.target.value }))} placeholder="Vacant units" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><div className="flex gap-2 sm:col-span-2"><button disabled={savingProperty} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingProperty ? 'Saving…' : 'Save property'}</button><button type="button" onClick={() => setShowPropertyForm(false)} className="rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300">Cancel</button></div></form>}
            {propertiesLoading ? <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">Loading property portfolio…</div> : properties.length === 0 ? <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">No properties have been added to this account yet.</div> : properties.map(p => <div key={p.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-teal-500/30 transition"><div className="flex items-start justify-between"><div><p className="font-bold text-lg">{p.name}</p><p className="text-gray-400 text-sm">{p.address}</p></div><div className="text-right"><p className="text-2xl font-bold">{p.units}</p><p className="text-gray-500 text-xs">Total Units</p></div></div><div className="mt-3 flex gap-4 text-sm"><span className="text-green-400 font-semibold">{Math.max(0, Number(p.units || 0) - Number(p.vacancies || 0))} Occupied</span>{Number(p.vacancies || 0) > 0 ? <span className="text-red-400 font-semibold">{p.vacancies} Vacant</span> : <span className="text-gray-500">Fully Occupied</span>}</div></div>)}
          </div>
        )}

        {tab === 'tenants' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Tenants</h2><p className="mt-1 text-sm text-gray-400">Your saved tenant roster and monthly rent status.</p></div><button type="button" onClick={() => setShowTenantForm(value => !value)} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-500"><Plus className="h-4 w-4" /> Add tenant</button></div>
            {showTenantForm && <form onSubmit={addTenant} className="grid grid-cols-1 gap-3 rounded-xl border border-teal-500/25 bg-[#151515] p-5 sm:grid-cols-2"><input required value={tenantDraft.name} onChange={event => setTenantDraft(value => ({ ...value, name: event.target.value }))} placeholder="Tenant full name" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><input required value={tenantDraft.unit} onChange={event => setTenantDraft(value => ({ ...value, unit: event.target.value }))} placeholder="Unit / address" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><input required min="0" step="0.01" type="number" value={tenantDraft.rent} onChange={event => setTenantDraft(value => ({ ...value, rent: event.target.value }))} placeholder="Monthly rent" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><select value={tenantDraft.status} onChange={event => setTenantDraft(value => ({ ...value, status: event.target.value }))} className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"><option value="current">Current</option><option value="late">Late</option><option value="pending">Pending</option></select><div className="flex gap-2 sm:col-span-2"><button disabled={savingTenant} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingTenant ? 'Saving…' : 'Save tenant'}</button><button type="button" onClick={() => setShowTenantForm(false)} className="rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300">Cancel</button></div></form>}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">{tenantsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading tenants…</div> : tenants.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No tenants have been added to this account yet.</div> : tenants.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold">{t.name}</p><p className="text-gray-500 text-sm">{t.unit}</p></div><div className="flex items-center gap-3"><span className="text-lg font-bold">${Number(t.rent || 0).toLocaleString()}/mo</span><span className={`px-2 py-0.5 rounded text-xs font-bold border ${rentBadge(t.status)}`}>{t.status}</span></div></div>)}</div>
          </div>
        )}

        {tab === 'maintenance' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Maintenance Requests</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {maintenance.map(m => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{m.title}</p>
                    <p className="text-gray-500 text-sm">{m.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityBadge(m.priority)}`}>{m.priority}</span>
                    {(['open', 'pending', 'pending_approval', 'scheduled'].includes(m.status)) ? (
                      <>
                        <button disabled={decisionId === m.id} onClick={() => decide(m.id, 'approved')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg text-xs font-bold transition">{decisionId === m.id ? 'Saving…' : 'Approve'}</button>
                        <button disabled={decisionId === m.id} onClick={() => decide(m.id, 'rejected')} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg text-xs font-bold transition">Reject</button>
                      </>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(m.status)}`}>{m.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'plan-tracker' && <MaintenancePlanTracker portalRole="landlord" ownerName={name} />}
        {tab === 'plan-builder' && <PlanBuilderTab portalType="landlord" ownerName={name} />}
        {tab === 'crm' && <CRMSection portalType="landlord" />}
        {tab === 'deals' && (<>
          <FeaturedDealsReels portalType="landlord" />
          <DealsOffersSection portalType="advertiser" storageKey="landlord_deals_offers" />
        </>)}

        {tab === 'financials' && (
          <div className="space-y-4">
            <div><h2 className="text-xl font-bold">Account Financials</h2><p className="mt-1 text-sm text-gray-400">Verified payment and invoice activity for this landlord account.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[{ label: 'Verified Payments', value: financials.paidTotal, color: 'text-green-400' }, { label: 'Pending Payments', value: financials.pendingTotal, color: 'text-amber-400' }, { label: 'Open Invoice Balance', value: financials.openInvoiceTotal, color: 'text-red-400' }].map((item, i) => <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"><p className={`text-2xl font-bold ${item.color}`}>${Number(item.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-sm text-gray-400 mt-1">{item.label}</p></div>)}
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {financialsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading financial activity…</div> : financials.payments.length === 0 && financials.invoices.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No invoices or payment activity are available for this account yet.</div> : <>
                {financials.payments.map((payment: any) => <div key={`payment-${payment.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold">{payment.invoice?.invoice_number || payment.subscription?.plan || 'Payment'}</p><p className="text-gray-500 text-sm">Payment · {new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className="text-lg font-bold">${Number(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(payment.status)}`}>{String(payment.status || 'pending').replace(/_/g, ' ')}</span></div></div>)}
                {financials.invoices.filter((invoice: any) => !financials.payments.some((payment: any) => payment.invoiceId === invoice.id)).map((invoice: any) => <div key={`invoice-${invoice.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold">{invoice.invoice_number || invoice.description || 'Invoice'}</p><p className="text-gray-500 text-sm">Invoice · {new Date(invoice.due_date || invoice.dueDate || invoice.createdAt || invoice.created_at || Date.now()).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className="text-lg font-bold">${Number(invoice.balance_due ?? invoice.balanceDue ?? invoice.amountDue ?? invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(invoice.status)}`}>{String(invoice.status || 'open').replace(/_/g, ' ')}</span></div></div>)}
              </>}
            </div>
          </div>
        )}

        {tab === 'revenue-ai' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Revenue Intelligence</h2>
                  <p className="text-xs text-gray-500">AI-identified income opportunities for your properties</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const ctx = (window as any).__navigateApp;
                  if (ctx) ctx('property-revenue');
                  else window.location.hash = '#property-revenue';
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Full Analysis <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* NH alert */}
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span className="text-xl flex-shrink-0">🏔</span>
              <div>
                <p className="text-xs font-black text-indigo-400">New Hampshire — Key Advantages</p>
                <p className="text-xs text-gray-400 mt-0.5">NH RSA 540 imposes no rent control and no caps on ancillary fees (storage, parking, pets, amenities). You have more revenue flexibility than most states. Verify existing lease terms before adding new fees.</p>
              </div>
            </div>

            {/* Opportunity cards */}
            <div>
              <p className="text-sm font-bold text-white mb-3">Top Revenue Opportunities — Your Property Type</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LANDLORD_OPPS.map((o, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: o.color + '18' }}>
                        <o.icon className="w-4 h-4" style={{ color: o.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{o.name}</p>
                        <p className="text-xs font-black mt-0.5" style={{ color: '#4ade80' }}>{o.rev}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>{o.diff}</span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.07)', color: '#6b7280' }}>{o.risk} Risk</span>
                        </div>
                        <p className="text-[10px] text-indigo-400 mt-1.5">🏔 {o.nhNote}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario teaser */}
            <div className="rounded-xl p-5" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
              <p className="text-sm font-bold text-white mb-1">Example: 12-unit property adding 3 quick wins</p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'Storage (6 units)', value: '+$3,240/yr' },
                  { label: 'Laundry upgrade', value: '+$3,024/yr' },
                  { label: 'Bulk internet', value: '+$2,160/yr' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-lg p-3" style={{ background: '#0A0A0A' }}>
                    <p className="text-sm font-black text-green-400">{s.value}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-400 font-black mt-3 text-center">Combined: +$8,424/year — zero new tenants needed</p>
              <p className="text-[10px] text-gray-600 text-center mt-1">Estimates only. Open Full Analysis to model your actual property.</p>
            </div>

            <button
              onClick={() => {
                const ctx = (window as any).__navigateApp;
                if (ctx) ctx('property-revenue');
                else window.location.hash = '#property-revenue';
              }}
              className="w-full py-4 rounded-xl font-black text-sm text-white hover:brightness-110 transition flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <TrendingUp className="w-4 h-4" /> Open Full AI Revenue Analysis →
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
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Landlord Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-teal-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-teal-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <button onClick={() => toast.success('Settings saved!')}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition">
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
