import PortalFeatureGuide from './PortalFeatureGuide';
import { useState, useEffect, Component, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Home, DollarSign, Users, Wrench, Settings, Bell,
  Building2, BarChart3, ChevronRight, ArrowUpRight, Tag, MessageSquare,
  TrendingUp, Zap, Package, Droplets, Car, Wifi, Star, Sparkles, LoaderCircle, Plus,
  FileText, FileSignature, Send, CreditCard, CheckCircle, ExternalLink,
  Image as ImageIcon, Video, Upload, AlertTriangle, Trash2, Pencil,
} from 'lucide-react';
import LandlordLeaseManager from './LandlordLeaseManager';
import LandlordFormsManager from './LandlordFormsManager';
import UnitTurnoverChecklist from './UnitTurnoverChecklist';
import NotificationBell from './NotificationBell';
import NotificationPreferences from './NotificationPreferences';
import MarketRentWidget from './MarketRentWidget';
import SponsoredMarquee from '../SponsoredMarquee';
import PortalTrialBanner, { FeatureGate } from './PortalTrialBanner';
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

type Tab = 'dashboard' | 'properties' | 'tenants' | 'leases' | 'maintenance' | 'plan-tracker' | 'plan-builder' | 'crm' | 'deals' | 'financials' | 'messages' | 'settings' | 'revenue-ai' | 'guide';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'leases', label: 'Leases', icon: FileSignature },
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
  const [propertyDraft, setPropertyDraft] = useState({ name: '', address: '', units: '1', vacancies: '0', propertyType: 'single-family', yearBuilt: '', squareFootage: '', bedrooms: '', bathrooms: '', lotSize: '', parkingSpaces: '', heatingType: '', monthlyRent: '', purchasePrice: '', currentValue: '', amenities: '', conditionNotes: '' });
  const [propertyMedia, setPropertyMedia] = useState<File[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingOrdersId, setCreatingOrdersId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantDraft, setTenantDraft] = useState({ name: '', email: '', unit: '', rent: '', status: 'current' });
  const [tenantQuota, setTenantQuota] = useState<{ planId: string; limit: number; used: number; remaining: number } | null>(null);
  const [stripeStatus, setStripeStatus] = useState<{ connected: boolean; chargesEnabled: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || demoProfile?.name || 'Landlord');
  const email = accountEmail || demoProfile?.email || '';

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
      if (payload.quota) setTenantQuota(payload.quota);
    } catch (error: any) { setTenants([]); toast.error(error?.message || 'Unable to load tenants.'); }
    finally { setTenantsLoading(false); }
  };
  useEffect(() => { void loadTenants(); }, [session?.access_token]);

  const loadStripeStatus = async () => {
    if (!session?.access_token) { setStripeStatus(null); setStripeLoading(false); return; }
    setStripeLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/stripe/status`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load payout status.');
      setStripeStatus({ connected: !!payload.connected, chargesEnabled: !!payload.chargesEnabled, payoutsEnabled: !!payload.payoutsEnabled, detailsSubmitted: !!payload.detailsSubmitted });
    } catch { setStripeStatus({ connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }); }
    finally { setStripeLoading(false); }
  };
  useEffect(() => { void loadStripeStatus(); }, [session?.access_token]);

  // Return from Stripe onboarding → refresh status and clean URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'connected') {
      toast.success('Stripe account connected. Verifying payout status…');
      void loadStripeStatus();
      params.delete('stripe');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, []);

  const connectStripe = async () => {
    if (!session?.access_token || stripeConnecting) return;
    setStripeConnecting(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/stripe/connect`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || !payload.url) throw new Error(payload?.error || 'Unable to start Stripe onboarding.');
      window.location.href = payload.url;
    } catch (error: any) { toast.error(error?.message || 'Unable to start Stripe onboarding.'); setStripeConnecting(false); }
  };

  async function addTenant(event: React.FormEvent) {
    event.preventDefault(); if (!session?.access_token || savingTenant) return; setSavingTenant(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/tenants`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tenantDraft, rent: Number(tenantDraft.rent) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) { if (payload?.quota) setTenantQuota(payload.quota); throw new Error(payload?.error || 'Unable to add tenant.'); }
      setTenants(current => [payload.tenant, ...current]); if (payload.quota) setTenantQuota(payload.quota); setTenantDraft({ name: '', email: '', unit: '', rent: '', status: 'current' }); setShowTenantForm(false); toast.success('Tenant sub-portal created.');
    } catch (error: any) { toast.error(error?.message || 'Unable to add tenant.'); } finally { setSavingTenant(false); }
  }

  const [invitingId, setInvitingId] = useState<string | null>(null);
  async function inviteTenant(tenant: any) {
    if (!session?.access_token || invitingId) return;
    if (!tenant.email) { toast.error('Add an email to this tenant first, then invite them.'); return; }
    setInvitingId(tenant.id);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/tenants/${tenant.id}/invite`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to invite tenant.');
      setTenants(current => current.map(t => t.id === tenant.id ? payload.tenant : t));
      if (payload.created && payload.tempPassword) {
        toast.success(`Portal created for ${tenant.email}. Temp password: ${payload.tempPassword}`, { duration: 12000 });
      } else if (payload.alreadyHadAccount) {
        toast.success(`${tenant.email} already has an account — their portal is linked to you.`);
      } else {
        toast.success('Tenant invited to their portal.');
      }
    } catch (error: any) { toast.error(error?.message || 'Unable to invite tenant.'); } finally { setInvitingId(null); }
  }

  const emptyPropertyDraft = { name: '', address: '', units: '1', vacancies: '0', propertyType: 'single-family', yearBuilt: '', squareFootage: '', bedrooms: '', bathrooms: '', lotSize: '', parkingSpaces: '', heatingType: '', monthlyRent: '', purchasePrice: '', currentValue: '', amenities: '', conditionNotes: '' };

  function resetPropertyForm() { setPropertyDraft(emptyPropertyDraft); setPropertyMedia([]); setEditingPropertyId(null); setShowPropertyForm(false); }

  function startEditProperty(p: any) {
    setEditingPropertyId(p.id);
    setPropertyDraft({
      name: p.name ?? '', address: p.address ?? '', units: String(p.units ?? '1'), vacancies: String(p.vacancies ?? '0'),
      propertyType: p.propertyType || 'single-family', yearBuilt: p.yearBuilt != null ? String(p.yearBuilt) : '', squareFootage: p.squareFootage != null ? String(p.squareFootage) : '',
      bedrooms: p.bedrooms != null ? String(p.bedrooms) : '', bathrooms: p.bathrooms != null ? String(p.bathrooms) : '', lotSize: p.lotSize || '',
      parkingSpaces: p.parkingSpaces != null ? String(p.parkingSpaces) : '', heatingType: p.heatingType || '',
      monthlyRent: p.monthlyRent != null ? String(p.monthlyRent) : '', purchasePrice: p.purchasePrice != null ? String(p.purchasePrice) : '', currentValue: p.currentValue != null ? String(p.currentValue) : '',
      amenities: p.amenities || '', conditionNotes: p.conditionNotes || '',
    });
    setPropertyMedia([]); setShowPropertyForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }

  async function addProperty(event: React.FormEvent) {
    event.preventDefault(); if (!session?.access_token || savingProperty) return; setSavingProperty(true);
    const isEdit = !!editingPropertyId;
    try {
      const fd = new FormData();
      Object.entries(propertyDraft).forEach(([k, v]) => fd.append(k, String(v ?? '')));
      propertyMedia.forEach((file, i) => fd.append(`media_${i}`, file));
      const url = isEdit
        ? `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/properties/${editingPropertyId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/properties`;
      const response = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: fd });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save property.');
      setProperties(current => isEdit ? current.map(p => p.id === editingPropertyId ? payload.property : p) : [payload.property, ...current]);
      resetPropertyForm();
      toast.success(isEdit ? 'Property updated.' : 'Property added to your portfolio.');
    } catch (error: any) { toast.error(error?.message || 'Unable to save property.'); } finally { setSavingProperty(false); }
  }

  async function deleteProperty(id: string) {
    if (!session?.access_token || deletingId) return;
    if (!window.confirm('Delete this property and its uploaded photos/videos? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/properties/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to delete property.');
      setProperties(current => current.filter(p => p.id !== id));
      if (editingPropertyId === id) resetPropertyForm();
      toast.success('Property deleted.');
    } catch (error: any) { toast.error(error?.message || 'Unable to delete property.'); } finally { setDeletingId(null); }
  }

  async function createWorkOrders(id: string) {
    if (!session?.access_token || creatingOrdersId) return; setCreatingOrdersId(id);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/properties/${id}/create-work-orders`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to create work orders.');
      toast.success(`Created ${payload.created} work order${payload.created === 1 ? '' : 's'} from the AI report.`);
      void loadMaintenance();
    } catch (error: any) { toast.error(error?.message || 'Unable to create work orders.'); } finally { setCreatingOrdersId(null); }
  }

  async function analyzeProperty(id: string) {
    if (!session?.access_token || analyzingId) return; setAnalyzingId(id);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/landlord/properties/${id}/analyze`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to analyze property.');
      setProperties(current => current.map(p => p.id === id ? { ...p, aiCondition: payload.aiCondition } : p));
      toast.success('AI condition assessment complete.');
    } catch (error: any) { toast.error(error?.message || 'Unable to analyze property.'); } finally { setAnalyzingId(null); }
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
      <Safe><PortalTrialBanner /></Safe>

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
            <NotificationBell session={session} accent="teal" />
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
          </div>
        )}

        {tab === 'properties' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Properties</h2><p className="mt-1 text-sm text-gray-400">Your saved landlord portfolio.</p></div><button type="button" onClick={() => { if (showPropertyForm) { resetPropertyForm(); } else { setEditingPropertyId(null); setPropertyDraft(emptyPropertyDraft); setPropertyMedia([]); setShowPropertyForm(true); } }} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-500"><Plus className="h-4 w-4" /> Add property</button></div>
            <FeatureGate feature="Market Rent Finder"><MarketRentWidget session={session} initialAddress={properties[0]?.address || ''} /></FeatureGate>
            {showPropertyForm && <form onSubmit={addProperty} className="space-y-5 rounded-xl border border-teal-500/25 bg-[#151515] p-5">
              <p className="text-sm font-bold text-teal-300">{editingPropertyId ? 'Edit property' : 'New property'}</p>
              {(() => {
                const field = "rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 w-full";
                const label = "block text-xs font-semibold text-gray-400 mb-1";
                const set = (k: string) => (e: any) => setPropertyDraft(v => ({ ...v, [k]: e.target.value }));
                return <>
                  <div>
                    <p className="text-sm font-bold text-white mb-2">Property basics</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><label className={label}>Property name</label><input required value={propertyDraft.name} onChange={set('name')} placeholder="e.g. Maple Street Duplex" className={field} /></div>
                      <div className="sm:col-span-2"><label className={label}>Street address</label><input required value={propertyDraft.address} onChange={set('address')} placeholder="123 Maple St, City, ST" className={field} /></div>
                      <div><label className={label}>Property type</label><select value={propertyDraft.propertyType} onChange={set('propertyType')} className={field}><option value="single-family">Single-family</option><option value="multi-family">Multi-family</option><option value="condo">Condo</option><option value="townhouse">Townhouse</option><option value="apartment">Apartment building</option><option value="commercial">Commercial</option><option value="other">Other</option></select></div>
                      <div><label className={label}>Year built</label><input type="number" value={propertyDraft.yearBuilt} onChange={set('yearBuilt')} placeholder="1998" className={field} /></div>
                      <div><label className={label}>Total units</label><input required min="1" type="number" value={propertyDraft.units} onChange={set('units')} placeholder="1" className={field} /></div>
                      <div><label className={label}>Vacant units</label><input required min="0" type="number" value={propertyDraft.vacancies} onChange={set('vacancies')} placeholder="0" className={field} /></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-2">Specs</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div><label className={label}>Bedrooms</label><input type="number" value={propertyDraft.bedrooms} onChange={set('bedrooms')} placeholder="3" className={field} /></div>
                      <div><label className={label}>Bathrooms</label><input type="number" step="0.5" value={propertyDraft.bathrooms} onChange={set('bathrooms')} placeholder="2" className={field} /></div>
                      <div><label className={label}>Square footage</label><input type="number" value={propertyDraft.squareFootage} onChange={set('squareFootage')} placeholder="1500" className={field} /></div>
                      <div><label className={label}>Lot size</label><input value={propertyDraft.lotSize} onChange={set('lotSize')} placeholder="0.25 acre" className={field} /></div>
                      <div><label className={label}>Parking spaces</label><input type="number" value={propertyDraft.parkingSpaces} onChange={set('parkingSpaces')} placeholder="2" className={field} /></div>
                      <div><label className={label}>Heating type</label><input value={propertyDraft.heatingType} onChange={set('heatingType')} placeholder="Forced air" className={field} /></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-2">Financials</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div><label className={label}>Monthly rent ($)</label><input type="number" step="0.01" value={propertyDraft.monthlyRent} onChange={set('monthlyRent')} placeholder="1800" className={field} /></div>
                      <div><label className={label}>Purchase price ($)</label><input type="number" step="0.01" value={propertyDraft.purchasePrice} onChange={set('purchasePrice')} placeholder="250000" className={field} /></div>
                      <div><label className={label}>Current value ($)</label><input type="number" step="0.01" value={propertyDraft.currentValue} onChange={set('currentValue')} placeholder="320000" className={field} /></div>
                    </div>
                  </div>
                  <div>
                    <label className={label}>Amenities</label><input value={propertyDraft.amenities} onChange={set('amenities')} placeholder="In-unit laundry, dishwasher, central A/C, fenced yard" className={field} />
                  </div>
                  <div>
                    <label className={label}>Condition notes (for AI context)</label><textarea value={propertyDraft.conditionNotes} onChange={set('conditionNotes')} rows={3} placeholder="Describe known issues, recent renovations, or areas to inspect…" className={field} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Upload className="h-4 w-4 text-teal-400" /> Photos & video</p>
                    <p className="text-xs text-gray-500 mb-2">{editingPropertyId ? 'Add more photos/videos — existing media is kept.' : 'Upload photos and short videos so AI can assess the property’s condition.'} Up to 12 files, 100MB each.</p>
                    <input type="file" accept="image/*,video/*" multiple onChange={e => setPropertyMedia(Array.from(e.target.files || []))} className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-teal-500" />
                    {propertyMedia.length > 0 && <p className="mt-2 text-xs text-teal-300">{propertyMedia.length} file{propertyMedia.length === 1 ? '' : 's'} selected</p>}
                  </div>
                  <div className="flex gap-2"><button disabled={savingProperty} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingProperty ? 'Saving…' : editingPropertyId ? 'Save changes' : 'Save property'}</button><button type="button" onClick={resetPropertyForm} className="rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300">Cancel</button></div>
                </>;
              })()}
            </form>}
            {propertiesLoading ? <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">Loading property portfolio…</div> : properties.length === 0 ? <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400">No properties have been added to this account yet.</div> : properties.map(p => {
              const media = Array.isArray(p.media) ? p.media : [];
              const photos = media.filter((m: any) => m.kind !== 'video');
              const ai = p.aiCondition;
              return <div key={p.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-teal-500/30 transition">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-lg">{p.name}</p><p className="text-gray-400 text-sm">{p.address}</p>{p.propertyType && <span className="mt-1 inline-block rounded border border-[#363636] px-2 py-0.5 text-[11px] uppercase tracking-wide text-gray-400">{String(p.propertyType).replace(/-/g, ' ')}</span>}</div>
                  <div className="flex items-start gap-3">
                    <div className="text-right"><p className="text-2xl font-bold">{p.units}</p><p className="text-gray-500 text-xs">Total Units</p></div>
                    <div className="flex flex-col gap-1.5">
                      <button type="button" onClick={() => startEditProperty(p)} title="Edit property" className="rounded-lg border border-[#363636] p-1.5 text-gray-400 transition hover:border-teal-500/40 hover:text-teal-300"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => deleteProperty(p.id)} disabled={deletingId === p.id} title="Delete property" className="rounded-lg border border-[#363636] p-1.5 text-gray-400 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-40">{deletingId === p.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm"><span className="text-green-400 font-semibold">{Math.max(0, Number(p.units || 0) - Number(p.vacancies || 0))} Occupied</span>{Number(p.vacancies || 0) > 0 ? <span className="text-red-400 font-semibold">{p.vacancies} Vacant</span> : <span className="text-gray-500">Fully Occupied</span>}</div>
                {(p.bedrooms || p.bathrooms || p.squareFootage || p.yearBuilt || p.monthlyRent || p.currentValue) && <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-400 sm:grid-cols-3">
                  {p.bedrooms != null && <span>{p.bedrooms} bd</span>}
                  {p.bathrooms != null && <span>{p.bathrooms} ba</span>}
                  {p.squareFootage != null && <span>{Number(p.squareFootage).toLocaleString()} sq ft</span>}
                  {p.yearBuilt != null && <span>Built {p.yearBuilt}</span>}
                  {p.monthlyRent != null && <span className="text-white">${Number(p.monthlyRent).toLocaleString()}/mo</span>}
                  {p.currentValue != null && <span className="text-white">${Number(p.currentValue).toLocaleString()} value</span>}
                </div>}
                {media.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {media.slice(0, 8).map((m: any, i: number) => <div key={i} className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#0A0A0A]">
                    {m.kind === 'video'
                      ? (m.url ? <video src={m.url} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-gray-600"><Video className="h-6 w-6" /></div>)
                      : (m.url ? <img src={m.url} alt={m.name || 'Property photo'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-gray-600"><ImageIcon className="h-6 w-6" /></div>)}
                    {m.kind === 'video' && <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1"><Video className="h-3 w-3 text-white" /></span>}
                  </div>)}
                </div>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => analyzeProperty(p.id)} disabled={analyzingId === p.id || photos.length === 0} title={photos.length === 0 ? 'Add photos to enable AI assessment' : ''} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 px-3 py-1.5 text-xs font-bold text-teal-300 transition hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-40">{analyzingId === p.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{ai ? 'Re-run AI assessment' : 'AI condition assessment'}</button>
                  {ai?.analyzedAt && <span className="text-[11px] text-gray-500">Last analyzed {new Date(ai.analyzedAt).toLocaleDateString()}</span>}
                </div>
                {ai && <div className="mt-3 rounded-lg border border-teal-500/20 bg-[#101816] p-4">
                  <div className="flex items-center justify-between"><p className="text-sm font-bold text-teal-300 flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Condition Report</p>{ai.overallScore != null && <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-sm font-bold text-teal-300">{ai.overallScore}/10</span>}</div>
                  {ai.summary && <p className="mt-2 text-sm text-gray-300">{ai.summary}</p>}
                  {Array.isArray(ai.issues) && ai.issues.length > 0 && <div className="mt-3 space-y-1.5">{ai.issues.map((iss: any, i: number) => <div key={i} className="flex items-start gap-2 text-xs"><AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${iss.severity === 'high' ? 'text-red-400' : iss.severity === 'medium' ? 'text-amber-400' : 'text-gray-400'}`} /><span className="text-gray-300"><span className="font-semibold text-white">{iss.area}:</span> {iss.description}</span></div>)}</div>}
                  {Array.isArray(ai.recommendations) && ai.recommendations.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-400">{ai.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>}
                  {Array.isArray(ai.issues) && ai.issues.length > 0 && <button type="button" onClick={() => createWorkOrders(p.id)} disabled={creatingOrdersId === p.id} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-500 disabled:opacity-50">{creatingOrdersId === p.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}Create {ai.issues.length} work order{ai.issues.length === 1 ? '' : 's'}</button>}
                </div>}
              </div>;
            })}
          </div>
        )}

        {tab === 'tenants' && (
          <FeatureGate feature="Tenant Sub-Portals">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Tenant Sub-Portals</h2><p className="mt-1 text-sm text-gray-400">Each tenant you add gets their own maintenance & rent sub-portal.</p></div><button type="button" disabled={!!tenantQuota && Number.isFinite(tenantQuota.limit) && tenantQuota.used >= tenantQuota.limit} onClick={() => setShowTenantForm(value => !value)} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" /> Add tenant</button></div>
            {tenantQuota && Number.isFinite(tenantQuota.limit) && (
              <div className="rounded-xl border border-teal-500/25 bg-[#151515] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{tenantQuota.used} of {tenantQuota.limit} tenant sub-portals used</p>
                  <span className="rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-teal-300">{tenantQuota.planId?.replace(/-/g, ' ')} plan</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0A0A0A]">
                  <div className={`h-full rounded-full transition-all ${tenantQuota.used >= tenantQuota.limit ? 'bg-red-500' : tenantQuota.used / tenantQuota.limit >= 0.8 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${Math.min(100, (tenantQuota.used / tenantQuota.limit) * 100)}%` }} />
                </div>
                {tenantQuota.used >= tenantQuota.limit
                  ? <p className="mt-2 text-xs text-red-400">You've reached your plan limit. Upgrade your plan to add more tenant sub-portals.</p>
                  : <p className="mt-2 text-xs text-gray-400">{tenantQuota.remaining} sub-portal{tenantQuota.remaining === 1 ? '' : 's'} remaining on your plan.</p>}
              </div>
            )}
            {showTenantForm && <form onSubmit={addTenant} className="grid grid-cols-1 gap-3 rounded-xl border border-teal-500/25 bg-[#151515] p-5 sm:grid-cols-2"><input required value={tenantDraft.name} onChange={event => setTenantDraft(value => ({ ...value, name: event.target.value }))} placeholder="Tenant full name" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><input type="email" value={tenantDraft.email} onChange={event => setTenantDraft(value => ({ ...value, email: event.target.value }))} placeholder="Tenant email (for portal login)" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><input required value={tenantDraft.unit} onChange={event => setTenantDraft(value => ({ ...value, unit: event.target.value }))} placeholder="Unit / address" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><input required min="0" step="0.01" type="number" value={tenantDraft.rent} onChange={event => setTenantDraft(value => ({ ...value, rent: event.target.value }))} placeholder="Monthly rent" className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" /><select value={tenantDraft.status} onChange={event => setTenantDraft(value => ({ ...value, status: event.target.value }))} className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500"><option value="current">Current</option><option value="late">Late</option><option value="pending">Pending</option></select><div className="flex gap-2 sm:col-span-2"><button disabled={savingTenant} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingTenant ? 'Saving…' : 'Save tenant'}</button><button type="button" onClick={() => setShowTenantForm(false)} className="rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300">Cancel</button></div></form>}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">{tenantsLoading ? <div className="p-8 flex items-center justify-center gap-2 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading tenants…</div> : tenants.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No tenants have been added to this account yet.</div> : tenants.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="font-bold">{t.name}{t.invited && <span className="ml-2 inline-flex items-center rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-300">Portal active</span>}</p><p className="text-gray-500 text-sm">{t.unit}{t.email ? ` · ${t.email}` : ''}</p></div><div className="flex items-center gap-3"><span className="text-lg font-bold">${Number(t.rent || 0).toLocaleString()}/mo</span><span className={`px-2 py-0.5 rounded text-xs font-bold border ${rentBadge(t.status)}`}>{t.status}</span><button type="button" onClick={() => inviteTenant(t)} disabled={invitingId === t.id || !t.email} title={t.email ? '' : 'Add an email to invite this tenant'} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 px-3 py-1.5 text-xs font-bold text-teal-300 transition hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-40">{invitingId === t.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}{t.invited ? 'Resend' : 'Invite'}</button></div></div>)}</div>
          </div>
          </FeatureGate>
        )}

        {tab === 'leases' && <FeatureGate feature="AI Lease Builder"><div className="space-y-6"><LandlordLeaseManager session={session} tenants={tenants} /><div className="border-t border-[#2A2A2A] pt-6"><LandlordFormsManager session={session} tenants={tenants} /></div></div></FeatureGate>}

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

            <div className="pt-2">
              <UnitTurnoverChecklist session={session} properties={properties} onCreated={loadMaintenance} />
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
          <FeatureGate feature="Revenue AI">
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
          </FeatureGate>
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

            <NotificationPreferences session={session} accent="teal" />

            {/* Stripe Connect — collect rent directly to the landlord's own account */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="font-bold">Online Rent Collection</p>
                  <p className="text-xs text-gray-400">Powered by Stripe — funds go straight to your bank.</p>
                </div>
              </div>

              {stripeLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-gray-400"><LoaderCircle className="w-4 h-4 animate-spin" /> Checking payout status…</div>
              ) : stripeStatus?.chargesEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-sm text-green-300">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" /> Connected — you're ready to accept rent payments online.
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded border ${stripeStatus.payoutsEnabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>Payouts {stripeStatus.payoutsEnabled ? 'enabled' : 'pending'}</span>
                    <span className={`px-2 py-0.5 rounded border ${stripeStatus.detailsSubmitted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>Details {stripeStatus.detailsSubmitted ? 'submitted' : 'incomplete'}</span>
                  </div>
                  <button onClick={connectStripe} disabled={stripeConnecting} className="inline-flex items-center gap-2 rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:text-white disabled:opacity-60">
                    {stripeConnecting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Manage Stripe account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {stripeStatus?.connected
                      ? 'Your Stripe account needs a few more details before you can accept payments. Finish onboarding to go live.'
                      : 'Connect a Stripe account to let your tenants pay rent by card. You keep 100% of the rent — payouts land directly in your bank account.'}
                  </p>
                  <button onClick={connectStripe} disabled={stripeConnecting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60">
                    {stripeConnecting ? <><LoaderCircle className="w-4 h-4 animate-spin" /> Opening Stripe…</> : <><CreditCard className="w-4 h-4" /> {stripeStatus?.connected ? 'Finish Stripe setup' : 'Connect Stripe'}</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <Safe><AdvertisingMarquee /></Safe>
    </div>
  );
}
