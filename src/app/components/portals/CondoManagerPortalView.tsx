import { useState, Component, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  Building2, DollarSign, Users, Wrench, Settings, Bell,
  Home, BarChart3, ChevronRight, ArrowUpRight, CheckCircle, Tag, MessageSquare,
  TrendingUp, Zap, Star, Package, Car, Sparkles,
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

type Tab = 'dashboard' | 'units' | 'owners' | 'work-requests' | 'plan-tracker' | 'plan-builder' | 'crm' | 'deals' | 'financials' | 'revenue-ai' | 'messages' | 'settings';

const TABS: { id: Tab; label: string; icon: any; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'units', label: 'Units', icon: Building2 },
  { id: 'owners', label: 'Owners', icon: Users },
  { id: 'work-requests', label: 'Work Requests', icon: Wrench },
  { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
  { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'deals', label: 'Deals & Reels', icon: Tag },
  { id: 'financials', label: 'Financials', icon: BarChart3 },
  { id: 'revenue-ai', label: 'Revenue AI', icon: TrendingUp, badge: 'NEW' },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
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
  const { unread: unreadMessages, clearUnread } = usePortalMessages('', '');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [requests, setRequests] = useState(WORK_REQUESTS);
  const [name, setName] = useState(demoProfile?.name || 'Brian Foster');
  const [email, setEmail] = useState(demoProfile?.email || 'bfoster@lakewoodhoa.com');

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
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{demoProfile?.company || 'Lakewood Heights HOA'}</h1>
                <p className="text-xs text-gray-500 font-medium">{name} · {email} · Condo Manager</p>
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

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Units', value: '180', icon: Building2 },
                { label: 'Occupancy Rate', value: '96%', icon: CheckCircle },
                { label: 'HOA Dues Collected', value: '$48K', icon: DollarSign },
                { label: 'Open Requests', value: String(requests.filter(r => r.status === 'open' || r.status === 'pending').length), icon: Wrench },
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
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Units</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {UNITS.map(u => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">Unit {u.number}</p>
                    <p className="text-gray-500 text-sm">{u.owner}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(u.status)}`}>{u.status}</span>
                    {u.dues !== 'n/a' && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(u.dues)}`}>dues {u.dues}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'owners' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Owners</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {UNITS.filter(u => u.owner !== 'Vacant').map(u => (
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

        {tab === 'plan-tracker' && <MaintenancePlanTracker portalRole="condo_manager" ownerName={name} />}
        {tab === 'plan-builder' && <PlanBuilderTab portalType="condo_manager" ownerName={name} />}
        {tab === 'crm' && <CRMSection portalType="condo-manager" />}
        {tab === 'deals' && (<>
          <FeaturedDealsReels portalType="condo_manager" />
          <DealsOffersSection portalType="advertiser" storageKey="condo_deals_offers" />
        </>)}

        {tab === 'financials' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Financials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[
                { label: 'HOA Dues Collected', value: '$47,600', color: 'text-green-400' },
                { label: 'Operating Expenses', value: '$12,300', color: 'text-red-400' },
                { label: 'Reserve Fund', value: '$35,300', color: 'text-indigo-400' },
              ].map((item, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {DUES.map(d => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-bold">{d.id}</p>
                    <p className="text-gray-500 text-sm">{d.unit} · {d.owner} · {d.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">${d.amount}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge(d.status)}`}>{d.status}</span>
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
        {tab === 'settings' && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-xl font-bold">Settings</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Condo Manager Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-indigo-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-indigo-500 rounded-lg px-4 py-3 text-white text-sm outline-none" />
              </div>
              <button onClick={() => toast.success('Settings saved!')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition">
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
