/**
 * AI Email Lead Generation Hub
 * Captures, scores, and auto-emails leads from the store and site.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Mail, Users, Zap, TrendingUp, Send, Flame, Star,
  RefreshCw, X, ChevronRight, BarChart3, Target,
  MessageSquare, Filter, Trash2, Plus, Clock, Check,
  ArrowUp, Eye, MousePointer,
} from 'lucide-react';
import { motion } from 'motion/react';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Lead {
  id: string;
  email: string;
  name: string;
  phone?: string;
  source: string;
  page: string;
  cartValue: number;
  productsViewed: number;
  score: number;
  intent: 'hot' | 'warm' | 'cold';
  aiSummary: string;
  capturedAt: string;
  lastSeen: string;
  emailsSent: number;
  lastEmailSent?: string;
  lastEmailType?: string;
  status: 'new' | 'contacted' | 'converted' | 'unsubscribed';
}

interface Stats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  emailsSent: number;
  avgScore: number;
}

type Tab = 'dashboard' | 'leads' | 'compose' | 'blast' | 'segments';

const INTENT_COLOR: Record<string, string> = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#6b7280',
};

const EMAIL_TYPES = [
  { id: 'welcome',        label: 'Welcome Email',       icon: '👋', desc: 'Friendly intro for new visitors' },
  { id: 'cart_abandon',   label: 'Cart Recovery',       icon: '🛒', desc: 'Bring back abandoned carts' },
  { id: 'hot_follow_up',  label: 'Hot Lead Follow-Up',  icon: '🔥', desc: 'Strike while iron is hot' },
  { id: 'promo',          label: 'Promo / Offer',       icon: '🎁', desc: '10% off code BPBUILDS10' },
  { id: 'review_request', label: 'Review Request',      icon: '⭐', desc: 'Ask happy customers for a Google review' },
  { id: 'custom',         label: 'Custom Message',      icon: '✍️', desc: 'Write your own prompt' },
];

export default function EmailLeadGen() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, hot: 0, warm: 0, cold: 0, emailsSent: 0, avgScore: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailType, setEmailType] = useState('welcome');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [intentFilter, setIntentFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [blasting, setBlasting] = useState(false);
  const [blastType, setBlastType] = useState('promo');
  const [blastFilter, setBlastFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ email: '', name: '', phone: '', source: 'manual' });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/leads`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setStats(data.stats || {});
      }
    } catch { toast.error('Failed to load leads'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function sendEmail(lead: Lead, type: string) {
    setSending(lead.id);
    try {
      const res = await fetch(`${SERVER}/leads/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, emailType: type, customMessage }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Email sent to ${lead.email}!`);
        fetchLeads();
      } else {
        toast.error(data.error || 'Send failed');
      }
    } catch { toast.error('Send failed'); }
    setSending(null);
  }

  async function deleteLead(id: string) {
    try {
      await fetch(`${SERVER}/leads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.info('Lead removed');
    } catch { toast.error('Delete failed'); }
  }

  async function addLead() {
    if (!newLead.email) { toast.error('Email required'); return; }
    try {
      const res = await fetch(`${SERVER}/leads/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLead, page: 'manual-add' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Lead added and AI-scored!');
        setShowAddLead(false);
        setNewLead({ email: '', name: '', phone: '', source: 'manual' });
        fetchLeads();
      }
    } catch { toast.error('Failed to add lead'); }
  }

  async function blastEmails() {
    setBlasting(true);
    try {
      const res = await fetch(`${SERVER}/leads/blast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType: blastType, intentFilter: blastFilter, customMessage }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sent to ${data.sent} leads!`);
        fetchLeads();
      } else {
        toast.error(data.error || 'Blast failed');
      }
    } catch { toast.error('Blast failed'); }
    setBlasting(false);
  }

  const filteredLeads = leads
    .filter(l => intentFilter === 'all' || l.intent === intentFilter)
    .filter(l =>
      !searchQuery ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard',   icon: BarChart3 },
    { id: 'leads',     label: `Leads (${stats.total})`, icon: Users },
    { id: 'segments',  label: 'Segments',    icon: Filter },
    { id: 'compose',   label: 'Send Email',  icon: Send },
    { id: 'blast',     label: 'Email Blast', icon: Zap },
  ];

  // ── Segments: auto-categorize leads by behavior ──────────────────────────────
  const SEGMENTS = [
    {
      id: 'vip',
      label: '🏆 VIP Buyers',
      color: '#f59e0b',
      description: 'High score + high cart value — your best customers',
      filter: (l: Lead) => l.score >= 80 && l.cartValue >= 100,
      suggestedEmail: 'promo',
      emailLabel: 'Exclusive VIP Offer',
    },
    {
      id: 'hot_ready',
      label: '🔥 Ready to Buy',
      color: '#ef4444',
      description: 'Hot intent leads who haven\'t converted yet',
      filter: (l: Lead) => l.intent === 'hot' && l.status !== 'converted',
      suggestedEmail: 'hot_follow_up',
      emailLabel: 'Strike While Hot',
    },
    {
      id: 'cart_left',
      label: '🛒 Cart Abandoners',
      color: '#ea580c',
      description: 'Leads captured from abandoned cart events',
      filter: (l: Lead) => l.source === 'abandoned_cart' || (l.cartValue > 0 && l.status === 'new'),
      suggestedEmail: 'cart_abandon',
      emailLabel: 'Cart Recovery',
    },
    {
      id: 'local',
      label: '📍 Local Neighbors',
      color: '#8b5cf6',
      description: 'Captured from your geo-targeted local ad page',
      filter: (l: Lead) => l.source === 'geo_ad_local' || l.page?.includes('local'),
      suggestedEmail: 'welcome',
      emailLabel: 'Local Welcome',
    },
    {
      id: 'cold_win_back',
      label: '❄️ Win-Back Needed',
      color: '#6b7280',
      description: 'Cold leads who haven\'t heard from you in a while',
      filter: (l: Lead) => l.intent === 'cold' && l.emailsSent === 0,
      suggestedEmail: 'promo',
      emailLabel: 'Win-Back Promo',
    },
    {
      id: 'review_ready',
      label: '⭐ Review Candidates',
      color: '#10b981',
      description: 'Contacted leads likely happy enough to leave a review',
      filter: (l: Lead) => l.status === 'contacted' && l.score >= 60,
      suggestedEmail: 'review_request',
      emailLabel: 'Ask for Review',
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">AI Email Lead Gen</h1>
            <p className="text-gray-400 text-sm">Capture · Score · Convert — automatically</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#ea580c] hover:bg-orange-600 transition">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
          <button onClick={fetchLeads} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-300 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition flex-shrink-0 ${
              tab === t.id
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ──────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Leads', value: stats.total, icon: Users, color: '#3b82f6', glow: 'rgba(59,130,246,0.12)' },
              { label: 'Hot Leads', value: stats.hot, icon: Flame, color: '#ef4444', glow: 'rgba(239,68,68,0.12)' },
              { label: 'Emails Sent', value: stats.emailsSent, icon: Send, color: '#10b981', glow: 'rgba(16,185,129,0.12)' },
              { label: 'Avg AI Score', value: `${stats.avgScore}/100`, icon: Target, color: '#ea580c', glow: 'rgba(234,88,12,0.12)' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-5 border border-[#2A2A2A]"
                style={{ background: `linear-gradient(135deg, ${k.glow}, #111)` }}>
                <k.icon className="w-5 h-5 mb-3" style={{ color: k.color }} />
                <p className="text-2xl font-black text-white">{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Intent breakdown */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-6">
            <h3 className="font-black text-white mb-4">Lead Intent Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: '🔥 Hot Leads', count: stats.hot, color: '#ef4444', desc: 'Ready to buy — contact immediately' },
                { label: '⚡ Warm Leads', count: stats.warm, color: '#f59e0b', desc: 'Interested — nurture with follow-ups' },
                { label: '❄️ Cold Leads', count: stats.cold, color: '#6b7280', desc: 'Early stage — drip email sequence' },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300 font-semibold">{row.label}</span>
                    <span className="font-black text-white">{row.count} <span className="text-gray-500 font-normal text-xs">leads</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-[#2A2A2A]">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: stats.total > 0 ? `${(row.count / stats.total) * 100}%` : '0%', background: row.color, minWidth: row.count > 0 ? 8 : 0 }} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{row.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent leads */}
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h3 className="font-black text-white">Recent Leads</h3>
              <button onClick={() => setTab('leads')} className="text-xs font-bold text-orange-400 flex items-center gap-1">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {leads.length === 0 ? (
              <div className="p-10 text-center">
                <MousePointer className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No leads yet</p>
                <p className="text-gray-600 text-sm mt-1">Leads appear automatically when visitors enter their email in the store</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A1A]">
                {leads.slice(0, 5).map(lead => (
                  <div key={lead.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                      style={{ background: `${INTENT_COLOR[lead.intent]}20`, color: INTENT_COLOR[lead.intent], border: `1px solid ${INTENT_COLOR[lead.intent]}30` }}>
                      {(lead.name || lead.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{lead.name || lead.email}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.email} · {lead.source}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-black" style={{ color: INTENT_COLOR[lead.intent] }}>{lead.score}</span>
                      <button onClick={() => { setSelectedLead(lead); setTab('compose'); }}
                        className="p-1.5 rounded-lg hover:bg-[#2A2A2A] transition text-gray-500 hover:text-orange-400">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setTab('blast')}
              className="flex items-center gap-4 p-5 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/40 hover:bg-orange-500/5 transition text-left">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="font-black text-white">Email Blast</p>
                <p className="text-xs text-gray-500 mt-0.5">Send to all {stats.total} leads at once</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 ml-auto" />
            </button>
            <button onClick={() => setIntentFilter('hot') || setTab('leads')}
              className="flex items-center gap-4 p-5 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] hover:border-red-500/40 hover:bg-red-500/5 transition text-left">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <Flame className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="font-black text-white">Hot Leads</p>
                <p className="text-xs text-gray-500 mt-0.5">{stats.hot} ready-to-buy leads waiting</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 ml-auto" />
            </button>
          </div>
        </div>
      )}

      {/* ── LEADS TAB ──────────────────────────────────────────────────── */}
      {tab === 'leads' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
            <div className="flex gap-2">
              {(['all', 'hot', 'warm', 'cold'] as const).map(f => (
                <button key={f} onClick={() => setIntentFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition flex-1 sm:flex-none ${
                    intentFilter === f ? 'bg-white text-black' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
                  }`}>
                  {f === 'all' ? `All (${stats.total})` : `${f === 'hot' ? '🔥' : f === 'warm' ? '⚡' : '❄️'} ${f}`}
                </button>
              ))}
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-12 text-center">
              <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No leads found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map(lead => (
                <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4 hover:border-[#3A3A3A] transition">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black flex-shrink-0"
                      style={{ background: `${INTENT_COLOR[lead.intent]}20`, color: INTENT_COLOR[lead.intent], border: `1px solid ${INTENT_COLOR[lead.intent]}30` }}>
                      {(lead.name || lead.email).charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white text-sm">{lead.name || '(no name)'}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: `${INTENT_COLOR[lead.intent]}20`, color: INTENT_COLOR[lead.intent], border: `1px solid ${INTENT_COLOR[lead.intent]}30` }}>
                          {lead.intent}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 bg-[#2A2A2A] px-2 py-0.5 rounded-full">{lead.source}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{lead.email}</p>
                      {lead.aiSummary && <p className="text-xs text-gray-600 mt-1 italic">"{lead.aiSummary}"</p>}

                      <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>Score: <strong className="text-white">{lead.score}/100</strong></span>
                        {lead.cartValue > 0 && <span>Cart: <strong className="text-green-400">${lead.cartValue}</strong></span>}
                        <span>Emails sent: <strong className="text-white">{lead.emailsSent}</strong></span>
                        <span>{new Date(lead.capturedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setSelectedLead(lead); setTab('compose'); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition"
                        style={{ background: '#ea580c' }}>
                        <Send className="w-3.5 h-3.5" /> Email
                      </button>
                      <button onClick={() => deleteLead(lead.id)}
                        className="p-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMPOSE TAB ─────────────────────────────────────────────────── */}
      {tab === 'compose' && (
        <div className="space-y-5 max-w-2xl">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-6 space-y-5">
            <h3 className="font-black text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-400" /> Send AI-Written Email
            </h3>

            {/* Lead selector */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Send To</label>
              <select value={selectedLead?.id || ''}
                onChange={e => setSelectedLead(leads.find(l => l.id === e.target.value) || null)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50">
                <option value="">— Select a lead —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name ? `${l.name} (${l.email})` : l.email} · {l.intent} · {l.score}/100
                  </option>
                ))}
              </select>
            </div>

            {selectedLead && (
              <div className="p-4 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black flex-shrink-0"
                  style={{ background: `${INTENT_COLOR[selectedLead.intent]}20`, color: INTENT_COLOR[selectedLead.intent] }}>
                  {(selectedLead.name || selectedLead.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{selectedLead.name || selectedLead.email}</p>
                  <p className="text-xs text-gray-500">Score: {selectedLead.score}/100 · {selectedLead.emailsSent} emails sent · {selectedLead.intent} intent</p>
                  {selectedLead.aiSummary && <p className="text-xs text-gray-600 italic mt-0.5">"{selectedLead.aiSummary}"</p>}
                </div>
              </div>
            )}

            {/* Email type */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Email Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EMAIL_TYPES.map(t => (
                  <button key={t.id} onClick={() => setEmailType(t.id)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition text-left ${
                      emailType === t.id
                        ? 'border-orange-500/50 bg-orange-500/8'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                    }`}>
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                    {emailType === t.id && <Check className="w-4 h-4 text-orange-400 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {emailType === 'custom' && (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Your Prompt / Message Brief</label>
                <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                  placeholder="e.g. Tell them about our new construction tool line, offer 15% off this weekend only…"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/50"
                  rows={4} />
              </div>
            )}

            <button
              onClick={() => selectedLead && sendEmail(selectedLead, emailType)}
              disabled={!selectedLead || sending === selectedLead?.id}
              className="w-full py-4 rounded-2xl font-black text-base text-white transition flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: '#ea580c' }}>
              {sending === selectedLead?.id
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> AI is writing & sending…</>
                : <><Zap className="w-4 h-4" /> AI Write & Send Email</>}
            </button>

            <p className="text-xs text-gray-600 text-center">GPT-4o-mini writes a personalized email based on this lead's behavior, then Resend delivers it from hello@theblackphoenixcompany.com</p>
          </div>
        </div>
      )}

      {/* ── BLAST TAB ────────────────────────────────────────────────────── */}
      {tab === 'blast' && (
        <div className="space-y-5 max-w-2xl">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-6 space-y-5">
            <div>
              <h3 className="font-black text-white flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-orange-400" /> Email Blast
              </h3>
              <p className="text-xs text-gray-500">Send the same campaign to multiple leads at once (up to 50 per blast)</p>
            </div>

            {/* Audience filter */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Send To</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { id: 'all', label: `All Leads`, count: stats.total, emoji: '👥' },
                  { id: 'hot', label: 'Hot Only', count: stats.hot, emoji: '🔥' },
                  { id: 'warm', label: 'Warm Only', count: stats.warm, emoji: '⚡' },
                  { id: 'cold', label: 'Cold Only', count: stats.cold, emoji: '❄️' },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setBlastFilter(f.id)}
                    className={`p-3 rounded-xl border transition text-center ${
                      blastFilter === f.id ? 'border-orange-500/50 bg-orange-500/8' : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                    }`}>
                    <p className="text-lg">{f.emoji}</p>
                    <p className="text-xs font-bold text-white mt-1">{f.label}</p>
                    <p className="text-[10px] text-gray-500">{f.count} leads</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Email type */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Campaign Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EMAIL_TYPES.map(t => (
                  <button key={t.id} onClick={() => setBlastType(t.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                      blastType === t.id ? 'border-orange-500/50 bg-orange-500/8' : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]'
                    }`}>
                    <span className="text-lg">{t.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                    {blastType === t.id && <Check className="w-4 h-4 text-orange-400 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {blastType === 'custom' && (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Campaign Brief</label>
                <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Describe what this email should say…"
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/50"
                  rows={3} />
              </div>
            )}

            {/* Summary */}
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
              <p className="text-sm text-gray-400">
                This will send <strong className="text-white">{blastType === 'all' ? stats.total : blastFilter === 'hot' ? stats.hot : blastFilter === 'warm' ? stats.warm : stats.cold} emails</strong> — one AI-personalized email per lead from <strong className="text-white">hello@theblackphoenixcompany.com</strong>
              </p>
            </div>

            <button onClick={blastEmails} disabled={blasting || stats.total === 0}
              className="w-full py-4 rounded-2xl font-black text-base text-white transition flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626)' }}>
              {blasting
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending blast…</>
                : <><Zap className="w-4 h-4" /> Launch Email Blast</>}
            </button>
          </div>
        </div>
      )}

      {/* ── SEGMENTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'segments' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-lg">Smart Segments</h3>
              <p className="text-xs text-gray-500 mt-0.5">Auto-sorted leads ready for targeted blasts</p>
            </div>
            <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full font-bold">
              {leads.length} total leads
            </span>
          </div>

          {SEGMENTS.map(seg => {
            const matched = leads.filter(seg.filter);
            return (
              <div key={seg.id} className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-white text-sm">{seg.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ color: seg.color, borderColor: seg.color + '40', background: seg.color + '15' }}>
                        {seg.emailLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{seg.description}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                        <span className="text-sm font-bold text-white">{matched.length}</span>
                        <span className="text-xs text-gray-500">leads matched</span>
                      </div>
                      {matched.length > 0 && (
                        <div className="h-1.5 flex-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, (matched.length / leads.length) * 100)}%`, background: seg.color }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBlastType(seg.suggestedEmail as any);
                      setBlastFilter('all');
                      setTab('blast');
                    }}
                    disabled={matched.length === 0}
                    className="shrink-0 px-4 py-2 rounded-xl text-xs font-black text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: matched.length > 0 ? `linear-gradient(135deg, ${seg.color}cc, ${seg.color})` : '#2A2A2A' }}>
                    {matched.length === 0 ? 'No Leads' : 'Blast →'}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl border border-dashed border-[#2A2A2A] p-5 text-center">
            <p className="text-xs text-gray-600">Segments update automatically as leads come in — no setup needed.</p>
          </div>
        </div>
      )}

      {/* ── ADD LEAD MODAL ─────────────────────────────────────────────── */}
      {showAddLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white">Add Lead Manually</h3>
              <button onClick={() => setShowAddLead(false)} className="p-2 rounded-xl hover:bg-[#2A2A2A] transition">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {[
              { key: 'email', label: 'Email *', placeholder: 'customer@email.com', type: 'email' },
              { key: 'name', label: 'Full Name', placeholder: 'John Smith', type: 'text' },
              { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000', type: 'tel' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(newLead as any)[f.key]}
                  onChange={e => setNewLead(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-gray-400 mb-1.5 block">Source</label>
              <select value={newLead.source} onChange={e => setNewLead(prev => ({ ...prev, source: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50">
                {['manual', 'store', 'quote', 'referral', 'social', 'phone', 'walk-in'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <button onClick={addLead}
              className="w-full py-3.5 rounded-2xl font-black text-white transition flex items-center justify-center gap-2"
              style={{ background: '#ea580c' }}>
              <Zap className="w-4 h-4" /> Add & AI Score Lead
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
