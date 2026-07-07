import { useState, Component, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  MapPin, Users, DollarSign, Briefcase, Shield, AlertCircle,
  CheckCircle, Search, Home, MessageSquare, Award, ChevronRight,
  ArrowUpRight, Bell, Star, Tag, Plus, CreditCard, Trash2,
  FileText, Phone, Mail, Settings, BarChart3, Send, TrendingUp,
  Clock, CheckSquare, Gift, Target,
} from 'lucide-react';
import SponsoredMarquee from '../SponsoredMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import CRMSection from './CRMSection';
import ReferralRewards from '../ReferralRewards';
import MaintenancePlanTracker from './MaintenancePlanTracker';

class Safe extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

const DEMO_CUSTOMERS = [
  { id: 'c1', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '(214) 555-0101', serviceType: 'Handyman', status: 'active', totalSpent: 2400 },
  { id: 'c2', name: 'Mike Thompson', email: 'mike@example.com', phone: '(214) 555-0202', serviceType: 'Construction', status: 'active', totalSpent: 8900 },
  { id: 'c3', name: 'Lisa Chen', email: 'lisa@example.com', phone: '(972) 555-0303', serviceType: 'Trash Removal', status: 'pending', totalSpent: 0 },
];
const DEMO_SUBS = [
  { id: 's1', name: 'ABC Plumbing', trade: 'Plumbing', status: 'active', rating: 4.8, jobs: 45 },
  { id: 's2', name: 'Elite Electrical', trade: 'Electrical', status: 'active', rating: 4.9, jobs: 62 },
  { id: 's3', name: 'Dallas HVAC', trade: 'HVAC', status: 'pending', rating: 0, jobs: 0 },
];
const DEMO_SUBS_WITH_PRICE = [
  { id: 'sb1', customer: 'Sarah Johnson', plan: 'Basic Handyman', price: 149, status: 'active' },
  { id: 'sb2', customer: 'Mike Thompson', plan: 'Pro Construction', price: 2199, status: 'active' },
  { id: 'sb3', customer: 'James Wilson', plan: 'Basic Handyman', price: 149, status: 'paused' },
];

const DEMO_PIPELINE = [
  { id: 'wr1', customer: 'Sarah Johnson', service: 'Bathroom Remodel', status: 'new', priority: 'high', submitted: '2026-06-20', budget: '$4,000–$8,000', description: 'Full bathroom gut and remodel, new tile, vanity, fixtures.' },
  { id: 'wr2', customer: 'Mike Thompson', service: 'Kitchen Renovation', status: 'quoted', priority: 'medium', submitted: '2026-06-18', budget: '$12,000–$20,000', description: 'Open concept kitchen, new cabinets, countertops, appliances.' },
  { id: 'wr3', customer: 'Lisa Chen', service: 'Trash Removal', status: 'new', priority: 'low', submitted: '2026-06-22', budget: '$200–$500', description: 'Garage cleanout, approx 2 truckloads.' },
];

const DEMO_REVENUE = [
  { month: 'Jan', revenue: 12400 }, { month: 'Feb', revenue: 15200 }, { month: 'Mar', revenue: 18900 },
  { month: 'Apr', revenue: 22100 }, { month: 'May', revenue: 28400 }, { month: 'Jun', revenue: 34800 },
];

const DEMO_MESSAGES = [
  { id: 'm1', from: 'Sarah Johnson', preview: 'Hi, when can you start on the bathroom?', time: '2h ago', unread: true, type: 'customer' },
  { id: 'm2', from: 'ABC Plumbing', preview: 'I can take the Johnson job on Thursday.', time: '4h ago', unread: true, type: 'sub' },
  { id: 'm3', from: 'Mike Thompson', preview: 'Thanks for the quote! Looks good.', time: '1d ago', unread: false, type: 'customer' },
  { id: 'm4', from: 'Elite Electrical', preview: 'Available next week for any electrical work.', time: '2d ago', unread: false, type: 'sub' },
];

type Tab = 'dashboard' | 'pipeline' | 'analytics' | 'messages' | 'customers' | 'subcontractors' | 'subscriptions' | 'plan-tracker' | 'crm' | 'deals' | 'referrals' | 'settings';

interface Props { onNavigate: (page: string) => void; }

// Read mock profile injected by RoleSwitcher (if present)
function getDemoProfile() {
  try {
    const raw = localStorage.getItem('demo_role_profile');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function TerritoryPortalView({ onNavigate }: Props) {
  const demoProfile = getDemoProfile();
  const territoryName = demoProfile?.territory || 'Dallas Metro';
  const ownerName = demoProfile?.name || 'Marcus Johnson';
  const ownerEmail = demoProfile?.email || 'marcus@dallasmhs.com';

  const [tab, setTab] = useState<Tab>('dashboard');
  const [customers, setCustomers] = useState(DEMO_CUSTOMERS);
  const [subs, setSubs] = useState(DEMO_SUBS);
  const [pipeline, setPipeline] = useState(DEMO_PIPELINE);
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [msgReply, setMsgReply] = useState('');
  const [search, setSearch] = useState('');
  const unreadCount = messages.filter(m => m.unread).length;
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [cForm, setCForm] = useState({ name: '', email: '', phone: '', serviceType: '' });
  const [sForm, setSForm] = useState({ name: '', trade: '', email: '', phone: '' });

  const mrr = DEMO_SUBS_WITH_PRICE.filter(s => s.status === 'active').reduce((a, s) => a + s.price, 0);

  function addCustomer() {
    if (!cForm.name || !cForm.email) { toast.error('Name and email required'); return; }
    setCustomers(prev => [...prev, { id: `c${Date.now()}`, ...cForm, status: 'active', totalSpent: 0 }]);
    toast.success('Customer added!');
    setShowAddCustomer(false);
    setCForm({ name: '', email: '', phone: '', serviceType: '' });
  }

  function addSub() {
    if (!sForm.name || !sForm.trade) { toast.error('Name and trade required'); return; }
    setSubs(prev => [...prev, { id: `s${Date.now()}`, ...sForm, status: 'pending', rating: 0, jobs: 0 }]);
    toast.success('Sub added — pending approval');
    setShowAddSub(false);
    setSForm({ name: '', trade: '', email: '', phone: '' });
  }

  const statusBadge = (s: string) =>
    s === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
    s === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
    'bg-gray-500/20 text-gray-400 border border-gray-500/30';

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'pipeline', label: 'Pipeline', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'customers', label: 'My Customers', icon: Users },
    { id: 'subcontractors', label: 'Subcontractors', icon: Briefcase },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'crm', label: 'CRM', icon: Tag },
    { id: 'plan-tracker', label: 'Plan Tracker', icon: BarChart3 },
    { id: 'deals', label: 'Deals & Reels', icon: Star },
    { id: 'referrals', label: 'Referrals', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0A0A0A', color: '#fff' }}>
      <Safe><SponsoredMarquee /></Safe>
      <Safe><AdvertisingMarquee placement="territory-portal" dismissible /></Safe>

      {/* Header */}
      <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 64, zIndex: 30 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{territoryName} Territory</h1>
                <p className="text-gray-400 text-sm">{ownerName} · Territory Admin · TX</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate('unified-dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#353535] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition">
                <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Command Center
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id as Tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition flex-shrink-0 ${
                    tab === t.id ? 'bg-cyan-600 text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-cyan-500/30'
                  }`}>
                  <Icon className="w-4 h-4" />{t.label}
                  {(t as any).badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">{(t as any).badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'My Customers', value: customers.length, change: 'In territory', icon: Users },
                { label: 'Active Subs', value: subs.filter(s => s.status === 'active').length, change: `${subs.filter(s => s.status === 'pending').length} pending`, icon: Briefcase },
                { label: 'Monthly MRR', value: `$${mrr.toLocaleString()}`, change: 'Recurring', icon: DollarSign },
                { label: 'Pending', value: [...customers, ...subs].filter(x => x.status === 'pending').length, change: 'Need approval', icon: AlertCircle },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-cyan-500/30 transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-cyan-400" />
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

            {/* Pending approvals */}
            {[...customers, ...subs].filter(x => x.status === 'pending').length > 0 && (
              <div className="bg-[#1A1A1A] border border-yellow-500/30 rounded-xl p-5">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" /> Pending Approvals
                </h3>
                <div className="space-y-2">
                  {[...customers.filter(c => c.status === 'pending'), ...subs.filter(s => s.status === 'pending')].map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-[#0A0A0A] rounded-lg p-3">
                      <div>
                        <p className="text-white text-sm font-medium">{item.name}</p>
                        <p className="text-gray-500 text-xs">{item.serviceType || item.trade}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          setCustomers(prev => prev.map(c => c.id === item.id ? { ...c, status: 'active' } : c));
                          setSubs(prev => prev.map(s => s.id === item.id ? { ...s, status: 'active' } : s));
                          toast.success('Approved!');
                        }} className="px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-bold transition">Approve</button>
                        <button onClick={() => toast.error('Rejected')} className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-bold transition">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscriptions summary */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">Active Subscriptions</h3>
                <button onClick={() => setTab('subscriptions')} className="text-cyan-400 text-sm flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {DEMO_SUBS_WITH_PRICE.filter(s => s.status === 'active').map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-[#0A0A0A] rounded-lg p-3">
                    <div>
                      <p className="text-white text-sm font-medium">{s.customer}</p>
                      <p className="text-gray-500 text-xs">{s.plan}</p>
                    </div>
                    <span className="text-white font-bold text-sm">${s.price}/mo</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total MRR</span>
                <span className="text-cyan-400 text-lg font-black">${mrr.toLocaleString()}/mo</span>
              </div>
            </div>

            {/* New messages alert */}
            {unreadCount > 0 && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <p className="text-white text-sm font-semibold">{unreadCount} unread message{unreadCount > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setTab('messages')} className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold flex items-center gap-1">
                  View <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* New pipeline work requests alert */}
            {pipeline.filter(w => w.status === 'new').length > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-orange-400" />
                  <p className="text-white text-sm font-semibold">{pipeline.filter(w => w.status === 'new').length} new work request{pipeline.filter(w => w.status === 'new').length > 1 ? 's' : ''} need quotes</p>
                </div>
                <button onClick={() => setTab('pipeline')} className="text-orange-400 hover:text-orange-300 text-sm font-semibold flex items-center gap-1">
                  Open Pipeline <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Platform owner note */}
            <div className="bg-[#1A1A1A] border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-400 text-sm"><strong className="text-white">Platform Owner manages:</strong> Ads, vendor partnerships, subscription pricing. You control your customers, subcontractors, and territory operations.</p>
            </div>
          </div>
        )}

        {/* ── PIPELINE ── */}
        {tab === 'pipeline' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Territory Pipeline</h2>
              <p className="text-gray-400 text-sm mt-0.5">Work requests from your customers — assign subs and track progress</p>
            </div>
            {pipeline.map(wr => (
              <div key={wr.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-cyan-500/30 transition">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-white">{wr.service}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${wr.priority === 'high' ? 'bg-red-500/20 text-red-400' : wr.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{wr.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${wr.status === 'new' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{wr.status}</span>
                    </div>
                    <p className="text-gray-400 text-sm">From: {wr.customer} · Submitted {wr.submitted}</p>
                    <p className="text-gray-500 text-xs mt-1">{wr.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-white font-bold text-sm">{wr.budget}</p>
                    <div className="flex gap-2">
                      <button onClick={() => toast.success('Quote builder opening…')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition">
                        <FileText className="w-3 h-3" /> Build Quote
                      </button>
                      <button onClick={() => toast.info('Assign sub coming soon')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#353535] text-gray-300 rounded-lg text-xs font-medium transition">
                        <Briefcase className="w-3 h-3" /> Assign Sub
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {pipeline.length === 0 && (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No work requests yet — they'll appear when your customers submit them</p>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Territory Analytics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue YTD', value: '$131,800', change: '+34% vs last year', icon: DollarSign, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                { label: 'Active Customers', value: String(customers.filter(c => c.status === 'active').length), change: 'In your territory', icon: Users, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { label: 'Jobs Completed', value: String(subs.reduce((a, s) => a + s.jobs, 0)), change: 'By your subs', icon: CheckSquare, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
                { label: 'Avg Job Value', value: '$1,240', change: '+8% this month', icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-3 ${s.color}`}><Icon className="w-5 h-5" /></div>
                    <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
                    <p className="text-sm text-gray-400">{s.label}</p>
                    <p className="text-xs text-green-400 mt-0.5">{s.change}</p>
                  </div>
                );
              })}
            </div>

            {/* Revenue Bar Chart */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-5">Monthly Revenue — {territoryName} Territory</h3>
              <div className="flex items-end gap-3 h-40">
                {DEMO_REVENUE.map((r, i) => {
                  const maxRev = Math.max(...DEMO_REVENUE.map(x => x.revenue));
                  const pct = Math.round((r.revenue / maxRev) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <p className="text-xs text-gray-500">${(r.revenue / 1000).toFixed(0)}k</p>
                      <div className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t opacity-80 hover:opacity-100 transition"
                        style={{ height: `${pct}%` }} />
                      <span className="text-xs text-gray-500">{r.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2A2A]">
                <span className="text-gray-500 text-sm">6-Month Total</span>
                <span className="text-cyan-400 text-xl font-black">${DEMO_REVENUE.reduce((a, r) => a + r.revenue, 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Top Subs */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Top Subcontractors by Jobs</h3>
              <div className="space-y-3">
                {subs.filter(s => s.jobs > 0).sort((a, b) => b.jobs - a.jobs).map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-[#0A0A0A] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                        <p className="text-gray-500 text-xs">{s.trade}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs">{s.jobs} jobs</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-sm font-bold">{s.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        {tab === 'messages' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Messages</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Conversation list */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="p-3 border-b border-[#2A2A2A]">
                  <p className="text-sm font-bold text-white">Conversations ({unreadCount} unread)</p>
                </div>
                <div className="divide-y divide-[#2A2A2A]">
                  {messages.map(msg => (
                    <button key={msg.id} onClick={() => { setSelectedMsg(msg); setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, unread: false } : m)); }}
                      className={`w-full text-left p-3 hover:bg-[#111] transition ${selectedMsg?.id === msg.id ? 'bg-cyan-600/10 border-l-2 border-cyan-500' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                          {msg.from}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${msg.type === 'customer' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{msg.type}</span>
                        </p>
                        {msg.unread && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{msg.preview}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{msg.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message thread */}
              <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex flex-col">
                {selectedMsg ? (
                  <>
                    <div className="p-4 border-b border-[#2A2A2A]">
                      <p className="font-bold text-white">{selectedMsg.from}</p>
                      <p className="text-gray-500 text-xs capitalize">{selectedMsg.type}</p>
                    </div>
                    <div className="flex-1 p-4 space-y-3 min-h-48">
                      <div className="flex justify-start">
                        <div className="bg-[#2A2A2A] rounded-2xl rounded-tl-none px-4 py-2.5 max-w-xs">
                          <p className="text-white text-sm">{selectedMsg.preview}</p>
                          <p className="text-gray-600 text-xs mt-1">{selectedMsg.time}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t border-[#2A2A2A] flex gap-2">
                      <input value={msgReply} onChange={e => setMsgReply(e.target.value)}
                        placeholder="Type a reply…"
                        onKeyDown={e => { if (e.key === 'Enter' && msgReply.trim()) { toast.success('Message sent!'); setMsgReply(''); } }}
                        className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] focus:border-cyan-500 rounded-lg px-3 py-2 text-white text-sm outline-none placeholder-gray-600" />
                      <button onClick={() => { if (msgReply.trim()) { toast.success('Message sent!'); setMsgReply(''); } }}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-1.5">
                        <Send className="w-4 h-4" /> Send
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium mb-1">Select a conversation</p>
                      <p className="text-gray-600 text-sm">Click a message on the left to open it</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS */}
        {tab === 'customers' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">My Customers</h2>
              <button onClick={() => setShowAddCustomer(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-bold transition hover:opacity-90">
                <Plus className="w-4 h-4" /> Add Customer
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…"
                className="w-full pl-9 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm outline-none focus:border-cyan-500 placeholder-gray-600" />
            </div>
            <div className="space-y-3">
              {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                <div key={c.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-cyan-500/30 transition">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{c.name}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                        <span>{c.serviceType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.totalSpent > 0 && <span className="text-green-400 text-sm font-bold">${c.totalSpent.toLocaleString()}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(c.status)}`}>{c.status}</span>
                      {c.status === 'pending' && (
                        <button onClick={() => { setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active' } : x)); toast.success('Approved!'); }}
                          className="px-2.5 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">Approve</button>
                      )}
                      <button onClick={() => { if(confirm('Remove?')) setCustomers(prev => prev.filter(x => x.id !== c.id)); }}
                        className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBCONTRACTORS */}
        {tab === 'subcontractors' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">My Subcontractors</h2>
              <button onClick={() => setShowAddSub(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg text-sm font-bold transition hover:opacity-90">
                <Plus className="w-4 h-4" /> Add Subcontractor
              </button>
            </div>
            <div className="space-y-3">
              {subs.map(s => (
                <div key={s.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-orange-500/30 transition">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-gray-400 text-sm">{s.trade} · {s.jobs} jobs completed</p>
                      {s.rating > 0 && <p className="text-yellow-400 text-xs mt-0.5">{'★'.repeat(Math.round(s.rating))} {s.rating}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(s.status)}`}>{s.status}</span>
                      {s.status === 'pending' && (
                        <button onClick={() => { setSubs(prev => prev.map(x => x.id === s.id ? { ...x, status: 'active' } : x)); toast.success('Approved!'); }}
                          className="px-2.5 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">Approve</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS */}
        {tab === 'subscriptions' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Customer Subscriptions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-green-400">{DEMO_SUBS_WITH_PRICE.filter(s => s.status === 'active').length}</p>
                <p className="text-gray-500 text-sm">Active</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-cyan-400">${mrr.toLocaleString()}</p>
                <p className="text-gray-500 text-sm">Monthly MRR</p>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-yellow-400">{DEMO_SUBS_WITH_PRICE.filter(s => s.status !== 'active').length}</p>
                <p className="text-gray-500 text-sm">Paused</p>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl divide-y divide-[#2A2A2A]">
              {DEMO_SUBS_WITH_PRICE.map(s => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-white">{s.customer}</p>
                    <p className="text-gray-500 text-sm">{s.plan}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">${s.price}/mo</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <p className="text-gray-400 text-sm">Subscription plan pricing is set by Black Phoenix HQ. You can view and manage your customers' subscription status here.</p>
            </div>
          </div>
        )}

        {/* CRM */}
        {tab === 'plan-tracker' && <MaintenancePlanTracker portalRole="territory" />}
        {tab === 'crm' && <CRMSection portalType="property-manager" />}

        {/* DEALS & REELS */}
        {tab === 'deals' && (<>
          <FeaturedDealsReels portalType="territory" />
          <DealsOffersSection portalType="advertiser" storageKey="territory_deals_offers" />
        </>)}

        {/* ── REFERRALS ── */}
        {tab === 'referrals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Gift className="w-6 h-6 text-orange-400" /> Referral Rewards
              </h2>
              <p className="text-gray-400 text-sm mt-0.5">Earn bonuses by growing your territory — refer customers, subcontractors, and new territory partners</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Referral Bonus — Customer', reward: '$50', desc: 'When a customer you refer completes their first paid job', icon: Users, color: 'from-blue-600 to-cyan-600' },
                { label: 'Referral Bonus — Sub', reward: '$100', desc: 'When a subcontractor you bring in completes 5 jobs', icon: Briefcase, color: 'from-orange-600 to-red-600' },
                { label: 'Territory Referral', reward: '$500', desc: 'When someone you refer opens their own territory', icon: MapPin, color: 'from-purple-600 to-indigo-600' },
              ].map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-black text-white mb-1">{r.reward}</p>
                    <p className="text-sm font-semibold text-white mb-2">{r.label}</p>
                    <p className="text-gray-500 text-xs">{r.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">Your Referral Link</h3>
              <div className="flex items-center gap-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-3">
                <p className="flex-1 text-gray-300 text-sm font-mono truncate">https://theblackphoenixcompany.com/?ref=TERR-001</p>
                <button onClick={() => { navigator.clipboard.writeText('https://theblackphoenixcompany.com/?ref=TERR-001').catch(()=>{}); toast.success('Copied!'); }}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold transition">
                  Copy
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-2">Share this link — when someone signs up through it, you automatically get credit.</p>
            </div>
            <Safe><ReferralRewards userType="territory" /></Safe>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Territory Settings</h2>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
              {[{ label: 'Territory Name', value: territoryName }, { label: 'State', value: 'TX' }, { label: 'Territory ID', value: 'TERR-001', disabled: true }, { label: 'Owner', value: ownerName }, { label: 'Email', value: ownerEmail }].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">{f.label}</label>
                  <input defaultValue={f.value} disabled={(f as any).disabled}
                    className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-cyan-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none disabled:opacity-50" />
                </div>
              ))}
              <button onClick={() => toast.success('Settings saved!')}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-bold transition hover:opacity-90">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Add Customer</h3>
            {[{ l: 'Name *', k: 'name', p: 'Jane Smith' }, { l: 'Email *', k: 'email', p: 'jane@example.com' }, { l: 'Phone', k: 'phone', p: '(214) 555-0000' }, { l: 'Service Type', k: 'serviceType', p: 'Handyman, Construction…' }].map(({ l, k, p }) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-400 mb-1">{l}</label>
                <input value={(cForm as any)[k]} onChange={e => setCForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-cyan-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddCustomer(false)} className="flex-1 py-2.5 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg text-sm font-semibold transition">Cancel</button>
              <button onClick={addCustomer} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-sm font-bold transition">Add Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SUB MODAL */}
      {showAddSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Add Subcontractor</h3>
            {[{ l: 'Company/Name *', k: 'name', p: 'ABC Plumbing' }, { l: 'Trade *', k: 'trade', p: 'Plumbing, Electrical, HVAC…' }, { l: 'Email', k: 'email', p: 'contact@company.com' }, { l: 'Phone', k: 'phone', p: '(214) 555-0000' }].map(({ l, k, p }) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-400 mb-1">{l}</label>
                <input value={(sForm as any)[k]} onChange={e => setSForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] focus:border-orange-500 rounded-lg px-3 py-2.5 text-white text-sm outline-none" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddSub(false)} className="flex-1 py-2.5 bg-[#2A2A2A] hover:bg-[#353535] rounded-lg text-sm font-semibold transition">Cancel</button>
              <button onClick={addSub} className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg text-sm font-bold transition">Add Sub</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
