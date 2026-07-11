import { useState, Component, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Building2, DollarSign, Users, Wrench, Settings, Bell,
  Home, CreditCard, ChevronRight, ArrowUpRight, CheckCircle, Tag, BarChart3, MessageSquare,
  TrendingUp, Zap, Star, Package, Car, Wifi,
} from 'lucide-react';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import CRMSection from './CRMSection';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import { MessagesTab, usePortalMessages } from './PortalMessagesSystem';

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

type Tab = 'dashboard' | 'properties' | 'work-requests' | 'plan-tracker' | 'crm' | 'deals' | 'payments' | 'revenue-ai' | 'messages' | 'settings';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'work-requests', label: 'Work Requests', icon: Wrench },
  { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'deals', label: 'Deals & Reels', icon: Tag },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'revenue-ai', label: 'Revenue AI', icon: TrendingUp, badge: 'NEW' },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
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
  const { unread: unreadMessages, clearUnread } = usePortalMessages('', '');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [requests, setRequests] = useState(WORK_REQUESTS);
  const [name, setName] = useState(demoProfile?.name || 'Angela Torres');
  const [email, setEmail] = useState(demoProfile?.email || 'angela@prestigepm.com');

  function approve(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    toast.success('Work request approved.');
  }
  function reject(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    toast.error('Work request rejected.');
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

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Properties', value: '3', icon: Building2 },
                { label: 'Active Tenants', value: '24', icon: Users },
                { label: 'Monthly Revenue', value: '$45,200', icon: DollarSign },
                { label: 'Work Requests', value: String(requests.filter(r => r.status === 'open' || r.status === 'pending').length), icon: Wrench },
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
                  {PROPERTIES.map(p => (
                    <div key={p.id} className="bg-[#0A0A0A] rounded-lg p-4">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-gray-500 text-xs">{p.units} units · {p.occupied} occupied · {p.address}</p>
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
              <div key={p.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-amber-500/30 transition">
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
                <div className="mt-4 flex gap-4 text-sm">
                  <span className="text-green-400 font-semibold"><CheckCircle className="w-4 h-4 inline mr-1" />{p.occupied} Occupied</span>
                  <span className="text-gray-500">{p.units - p.occupied} Vacant</span>
                  <span className="text-amber-400 font-semibold">{Math.round((p.occupied / p.units) * 100)}% Occupancy</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'work-requests' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Work Requests</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {requests.map(r => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{r.title}</p>
                    <p className="text-gray-500 text-sm">{r.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${priorityBadge(r.priority)}`}>{r.priority}</span>
                    {(r.status === 'open' || r.status === 'pending') ? (
                      <>
                        <button onClick={() => approve(r.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition">Approve</button>
                        <button onClick={() => reject(r.id)} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition">Reject</button>
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
        {tab === 'crm' && <CRMSection portalType="property-manager" />}
        {tab === 'deals' && (<>
          <FeaturedDealsReels portalType="property_manager" />
          <DealsOffersSection portalType="advertiser" storageKey="pm_deals_offers" />
        </>)}

        {tab === 'payments' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Payments</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {PAYMENTS.map(p => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{p.id}</p>
                    <p className="text-gray-500 text-sm">{p.property} · {p.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">${p.amount.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(p.status)}`}>{p.status}</span>
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
