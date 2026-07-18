import { useState, Component, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Home, DollarSign, Users, Wrench, Settings, Bell,
  Building2, BarChart3, ChevronRight, ArrowUpRight, Tag, MessageSquare,
  TrendingUp, Zap, Package, Droplets, Car, Wifi, Star, Sparkles,
} from 'lucide-react';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import CRMSection from './CRMSection';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import { MessagesTab, usePortalMessages } from './PortalMessagesSystem';

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

type Tab = 'dashboard' | 'properties' | 'tenants' | 'maintenance' | 'plan-tracker' | 'plan-builder' | 'crm' | 'deals' | 'financials' | 'messages' | 'settings' | 'revenue-ai';

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
  const { unread: unreadMessages, clearUnread } = usePortalMessages('', '');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [maintenance, setMaintenance] = useState(MAINTENANCE);
  const [name, setName] = useState(demoProfile?.name || 'Patricia Nguyen');
  const [email, setEmail] = useState(demoProfile?.email || 'patricia@nguyenrentals.com');

  function approve(id: string) {
    setMaintenance(prev => prev.map(m => m.id === id ? { ...m, status: 'approved' } : m));
    toast.success('Maintenance request approved.');
  }
  function reject(id: string) {
    setMaintenance(prev => prev.map(m => m.id === id ? { ...m, status: 'rejected' } : m));
    toast.error('Maintenance request rejected.');
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

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Properties', value: String(PROPERTIES.length), icon: Building2 },
                { label: 'Total Units', value: '32', icon: Home },
                { label: 'Monthly Revenue', value: '$28,400', icon: DollarSign },
                { label: 'Vacancies', value: String(PROPERTIES.reduce((a, p) => a + p.vacancies, 0)), icon: Wrench },
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
                  {TENANTS.map(t => (
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
                  {maintenance.map(m => (
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
            <h2 className="text-xl font-bold">Properties</h2>
            {PROPERTIES.map(p => (
              <div key={p.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-teal-500/30 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg">{p.name}</p>
                    <p className="text-gray-400 text-sm">{p.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{p.units}</p>
                    <p className="text-gray-500 text-xs">Total Units</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-green-400 font-semibold">{p.units - p.vacancies} Occupied</span>
                  {p.vacancies > 0
                    ? <span className="text-red-400 font-semibold">{p.vacancies} Vacant</span>
                    : <span className="text-gray-500">Fully Occupied</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tenants' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Tenants</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {TENANTS.map(t => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{t.name}</p>
                    <p className="text-gray-500 text-sm">{t.unit}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">${t.rent.toLocaleString()}/mo</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${rentBadge(t.status)}`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
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
                    {(m.status === 'open' || m.status === 'scheduled') ? (
                      <>
                        <button onClick={() => approve(m.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition">Approve</button>
                        <button onClick={() => reject(m.id)} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition">Reject</button>
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
            <h2 className="text-xl font-bold">Financials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Monthly Income', value: '$28,400', color: 'text-green-400' },
                { label: 'Monthly Expenses', value: '$6,800', color: 'text-red-400' },
                { label: 'Net Cash Flow', value: '$21,600', color: 'text-teal-400' },
              ].map((item, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {TENANTS.map(t => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{t.name}</p>
                    <p className="text-gray-500 text-sm">{t.unit}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">${t.rent.toLocaleString()}/mo</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${rentBadge(t.status)}`}>{t.status}</span>
                  </div>
                </div>
              ))}
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
