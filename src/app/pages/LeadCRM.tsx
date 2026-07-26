import { useState, useEffect } from 'react';
import {
  Users, TrendingUp, Phone, Mail, MessageSquare, Star, Clock,
  Filter, Search, ChevronDown, ChevronRight, X, Plus, Edit3,
  Flame, Zap, Circle, CheckCircle, AlertCircle, Calendar,
  DollarSign, BarChart2, Tag, ArrowRight, RefreshCw, MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadSource = 'booking' | 'chat' | 'email' | 'affiliate' | 'subscription' | 'review' | 'walk-in' | 'referral' | 'social';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  source: LeadSource;
  service?: string;
  stage: LeadStage;
  score: number;
  value: number;
  createdAt: string;
  lastContact?: string;
  tags: string[];
  urgent: boolean;
}

interface Note { id: string; leadId: string; body: string; at: string; }

// ─── Seed data ────────────────────────────────────────────────────────────────
function seed(): Lead[] {
  const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  return [
    { id: 'l1',  name: 'Marcus Thompson',   email: 'marcus.t@gmail.com',     phone: '(614) 555-0192', city: 'Columbus',    source: 'booking',      service: 'Lawn Care',         stage: 'qualified', score: 88, value: 480,  createdAt: d(3),  lastContact: d(1),  tags: ['high-value','repeat'],    urgent: true  },
    { id: 'l2',  name: 'Jessica Morales',   email: 'jess.morales@yahoo.com', phone: '(614) 555-0341', city: 'Westerville', source: 'chat',         service: 'Pressure Washing',  stage: 'contacted', score: 72, value: 250,  createdAt: d(1),  lastContact: d(1),  tags: ['new'],                    urgent: false },
    { id: 'l3',  name: 'Derek Washington',  email: 'derek.wash@yahoo.com',   phone: '(740) 555-0287', city: 'Newark',      source: 'email',        service: 'General Cleaning',  stage: 'new',       score: 55, value: 180,  createdAt: d(0),                      tags: [],                         urgent: false },
    { id: 'l4',  name: 'Samantha Cole',     email: 'samantha@hotmail.com',   phone: '(614) 555-0419', city: 'Dublin',      source: 'affiliate',    service: 'Landscaping',       stage: 'proposal',  score: 94, value: 1200, createdAt: d(7),  lastContact: d(2),  tags: ['high-value','vip'],       urgent: true  },
    { id: 'l5',  name: 'Troy James',        email: 'troy.james@gmail.com',   phone: '(614) 555-0573', city: 'Columbus',    source: 'booking',      service: 'Snow Removal',      stage: 'won',       score: 91, value: 650,  createdAt: d(14), lastContact: d(5),  tags: ['repeat','seasonal'],      urgent: false },
    { id: 'l6',  name: 'Mia Flores',        email: 'mia.flores@gmail.com',   phone: '(614) 555-0628', city: 'Hilliard',    source: 'subscription', service: 'Vitamins Bundle',   stage: 'won',       score: 78, value: 360,  createdAt: d(30), lastContact: d(10), tags: ['subscriber'],             urgent: false },
    { id: 'l7',  name: 'Nathan Pierce',     email: 'nathan.pierce@outlook.com',               phone: '(740) 555-0731', city: 'Lancaster',   source: 'social',       service: 'Handyman',          stage: 'new',       score: 42, value: 120,  createdAt: d(0),                      tags: [],                         urgent: false },
    { id: 'l8',  name: 'Brianna Turner',    email: 'brianna.t@gmail.com',    phone: '(614) 555-0862', city: 'Gahanna',     source: 'referral',     service: 'Deep Clean',        stage: 'contacted', score: 67, value: 320,  createdAt: d(2),  lastContact: d(2),  tags: ['referral'],               urgent: false },
    { id: 'l9',  name: 'Parker Chen',       email: 'parker.c@gmail.com',     phone: '(614) 555-0944', city: 'Columbus',    source: 'email',        service: 'Pest Control',       stage: 'qualified', score: 80, value: 540,  createdAt: d(4),  lastContact: d(1),  tags: ['high-value'],             urgent: false },
    { id: 'l10', name: 'Riley Hoffman',     email: 'riley.h@gmail.com',      phone: '(614) 555-1023', city: 'Worthington', source: 'chat',         service: 'Lawn Care',         stage: 'lost',      score: 30, value: 0,    createdAt: d(10), lastContact: d(8),  tags: ['price-sensitive'],        urgent: false },
    { id: 'l11', name: 'Avery Johnson',     email: 'avery.j@yahoo.com',      phone: '(614) 555-1105', city: 'Powell',      source: 'booking',      service: 'Landscaping',       stage: 'proposal',  score: 85, value: 900,  createdAt: d(5),  lastContact: d(1),  tags: ['high-value'],             urgent: true  },
    { id: 'l12', name: 'Morgan Fields',     email: 'morgan.f@gmail.com',     phone: '(614) 555-1248', city: 'Columbus',    source: 'walk-in',      service: 'General Cleaning',  stage: 'contacted', score: 61, value: 200,  createdAt: d(1),  lastContact: d(1),  tags: [],                         urgent: false },
  ];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STAGES: { key: LeadStage; label: string; color: string; bg: string }[] = [
  { key: 'new',       label: 'New',       color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  { key: 'contacted', label: 'Contacted', color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  { key: 'qualified', label: 'Qualified', color: '#fb923c', bg: 'rgba(249,115,22,0.12)'  },
  { key: 'proposal',  label: 'Proposal',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  { key: 'won',       label: 'Won',       color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  { key: 'lost',      label: 'Lost',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
];

const SOURCE_ICONS: Record<LeadSource, { icon: any; color: string; label: string }> = {
  booking:      { icon: Calendar,    color: '#60a5fa', label: 'Booking'      },
  chat:         { icon: MessageSquare, color: '#c084fc', label: 'Chat'       },
  email:        { icon: Mail,        color: '#fb923c', label: 'Email'        },
  affiliate:    { icon: Users,       color: '#fbbf24', label: 'Affiliate'    },
  subscription: { icon: RefreshCw,   color: '#34d399', label: 'Subscribe'   },
  review:       { icon: Star,        color: '#f472b6', label: 'Review'       },
  'walk-in':    { icon: MapPin,      color: '#a78bfa', label: 'Walk-In'      },
  referral:     { icon: ArrowRight,  color: '#f97316', label: 'Referral'     },
  social:       { icon: Zap,         color: '#22d3ee', label: 'Social'       },
};

function scoreColor(s: number) {
  if (s >= 80) return '#4ade80';
  if (s >= 60) return '#fb923c';
  return '#f87171';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  return `${m}m ago`;
}

type ViewMode = 'pipeline' | 'list' | 'analytics';

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeadCRM() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [notes, setNotes]         = useState<Note[]>([]);
  const [view,  setView]          = useState<ViewMode>('pipeline');
  const [search, setSearch]       = useState('');
  const [filterStage, setFilterStage] = useState<LeadStage | 'all'>('all');
  const [filterSource, setFilterSource] = useState<LeadSource | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNote, setNewNote]     = useState('');
  const [dragging, setDragging]   = useState<string | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState({ name: '', email: '', phone: '', city: '', service: '', source: 'email' as LeadSource, stage: 'new' as LeadStage, value: '' });

  async function loadData() {
    try {
      const [lr, nr] = await Promise.all([
        fetch(`${SERVER}/crm/leads`, { headers: authHeaders }),
        fetch(`${SERVER}/crm/notes`, { headers: authHeaders }),
      ]);
      const lj = await lr.json();
      const nj = await nr.json();
      if (lj.success) {
        if (lj.leads.length === 0) {
          // First run: seed the CRM so the pipeline isn't empty, then reload.
          await Promise.all(seed().map(s => fetch(`${SERVER}/crm/leads`, {
            method: 'POST', headers: authHeaders,
            body: JSON.stringify({ name: s.name, email: s.email, phone: s.phone, city: s.city, source: s.source, service: s.service, stage: s.stage, score: s.score, value: s.value, tags: s.tags, urgent: s.urgent }),
          })));
          const rr = await fetch(`${SERVER}/crm/leads`, { headers: authHeaders });
          const rj = await rr.json();
          if (rj.success) setLeads(rj.leads);
        } else {
          setLeads(lj.leads);
        }
      } else {
        console.error('Failed to load CRM leads:', lj.error);
      }
      if (nj.success) setNotes(nj.notes);
    } catch (err) {
      console.error('Network error loading CRM data:', err);
      toast.error('Could not load leads from server');
    }
  }

  useEffect(() => { loadData(); }, []);

  async function moveStage(id: string, stage: LeadStage) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, lastContact: new Date().toISOString() } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, stage } : null);
    try {
      await fetch(`${SERVER}/crm/leads/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ stage }) });
    } catch (err) { console.error('Failed to update lead stage:', err); }
  }

  async function addNote() {
    if (!newNote.trim() || !selectedLead) return;
    const body = newNote.trim();
    setNewNote('');
    try {
      const res = await fetch(`${SERVER}/crm/notes`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ leadId: selectedLead.id, body }) });
      const json = await res.json();
      if (json.success) { setNotes(prev => [json.note, ...prev]); toast.success('Note saved'); }
      else toast.error(json.error || 'Could not save note');
    } catch (err) { console.error('Failed to save note:', err); toast.error('Network error saving note'); }
  }

  async function addLead() {
    if (!addForm.name.trim() || !addForm.email.trim()) { toast.error('Name and email required'); return; }
    try {
      const res = await fetch(`${SERVER}/crm/leads`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          name: addForm.name, email: addForm.email, phone: addForm.phone, city: addForm.city,
          source: addForm.source, service: addForm.service, stage: addForm.stage, value: Number(addForm.value) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setLeads(prev => [json.lead, ...prev]);
        setShowAdd(false);
        setAddForm({ name: '', email: '', phone: '', city: '', service: '', source: 'email', stage: 'new', value: '' });
        toast.success('Lead added!');
      } else toast.error(json.error || 'Could not add lead');
    } catch (err) { console.error('Failed to add lead:', err); toast.error('Network error adding lead'); }
  }

  async function toggleUrgent(id: string) {
    const target = leads.find(l => l.id === id);
    const next = !target?.urgent;
    setLeads(prev => prev.map(l => l.id === id ? { ...l, urgent: next } : l));
    if (selectedLead?.id === id) setSelectedLead(p => p ? { ...p, urgent: next } : null);
    try {
      await fetch(`${SERVER}/crm/leads/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ urgent: next }) });
    } catch (err) { console.error('Failed to toggle urgent:', err); }
  }

  const filteredLeads = leads.filter(l => {
    if (filterStage !== 'all' && l.stage !== filterStage) return false;
    if (filterSource !== 'all' && l.source !== filterSource) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase()) && !l.service?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPipelineValue = leads.filter(l => l.stage !== 'lost').reduce((s, l) => s + l.value, 0);
  const wonValue           = leads.filter(l => l.stage === 'won').reduce((s, l) => s + l.value, 0);
  const urgentCount        = leads.filter(l => l.urgent && l.stage !== 'won' && l.stage !== 'lost').length;
  const convRate           = leads.length ? Math.round((leads.filter(l => l.stage === 'won').length / leads.length) * 100) : 0;

  const leadNotes = notes.filter(n => n.leadId === selectedLead?.id).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black">Lead CRM</h1>
            <p className="text-gray-500 text-sm mt-1">Every lead across every touchpoint — scored and tracked</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
            style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pipeline Value',   value: `$${totalPipelineValue.toLocaleString()}`, icon: DollarSign,  color: '#60a5fa' },
            { label: 'Closed Won',       value: `$${wonValue.toLocaleString()}`,           icon: CheckCircle, color: '#4ade80' },
            { label: 'Conversion Rate',  value: `${convRate}%`,                            icon: TrendingUp,  color: '#fb923c' },
            { label: 'Need Attention',   value: urgentCount,                               icon: Flame,       color: '#f87171' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['pipeline','Pipeline'], ['list','List'], ['analytics','Analytics']] as [ViewMode,string][]).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black transition"
              style={view === v ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── PIPELINE VIEW ─────────────────────────────────────────────────── */}
        {view === 'pipeline' && (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage.key);
                const stageValue = stageLeads.reduce((s, l) => s + l.value, 0);
                return (
                  <div key={stage.key} className="w-56 flex-shrink-0"
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={() => { if (dragging) { moveStage(dragging, stage.key); setDragging(null); } }}>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black" style={{ color: stage.color }}>{stage.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black" style={{ background: stage.bg, color: stage.color }}>{stageLeads.length}</span>
                      </div>
                      {stageValue > 0 && <span className="text-[10px] text-gray-600">${stageValue.toLocaleString()}</span>}
                    </div>
                    <div className="space-y-2">
                      {stageLeads.map(lead => {
                        const src = SOURCE_ICONS[lead.source];
                        return (
                          <div key={lead.id}
                            draggable onDragStart={() => setDragging(lead.id)} onDragEnd={() => setDragging(null)}
                            onClick={() => setSelectedLead(lead)}
                            className="rounded-xl p-3 cursor-pointer hover:brightness-110 transition select-none"
                            style={{ background: '#111', border: `1px solid ${lead.urgent ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                            <div className="flex items-start justify-between gap-1 mb-2">
                              <p className="text-xs font-black text-white leading-tight">{lead.name}</p>
                              {lead.urgent && <Flame className="w-3 h-3 text-red-400 flex-shrink-0" />}
                            </div>
                            {lead.service && <p className="text-[10px] text-gray-500 mb-2">{lead.service}</p>}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <src.icon className="w-3 h-3" style={{ color: src.color }} />
                                <span className="text-[9px] text-gray-600">{src.label}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: scoreColor(lead.score) }} />
                                <span className="text-[10px] font-black" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                              </div>
                            </div>
                            {lead.value > 0 && <p className="text-[10px] font-black text-white mt-1.5">${lead.value.toLocaleString()}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
        {view === 'list' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search className="w-4 h-4 text-gray-600" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
                  className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 focus:outline-none" />
              </div>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value as any)}
                className="bg-[#111] text-sm text-gray-300 rounded-xl px-4 py-2.5 border focus:outline-none"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="all">All Stages</option>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)}
                className="bg-[#111] text-sm text-gray-300 rounded-xl px-4 py-2.5 border focus:outline-none"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="all">All Sources</option>
                {(Object.entries(SOURCE_ICONS) as [LeadSource, any][]).map(([s, cfg]) => <option key={s} value={s}>{cfg.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              {filteredLeads.length === 0 && (
                <div className="text-center py-12 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Users className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No leads match your filters</p>
                </div>
              )}
              {filteredLeads.map(lead => {
                const stage = STAGES.find(s => s.key === lead.stage)!;
                const src = SOURCE_ICONS[lead.source];
                return (
                  <div key={lead.id} onClick={() => setSelectedLead(lead)}
                    className="flex items-center gap-4 rounded-2xl px-5 py-4 cursor-pointer hover:brightness-110 transition"
                    style={{ background: '#111', border: `1px solid ${lead.urgent ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: '#ea580c' }}>{lead.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">{lead.name}</p>
                        {lead.urgent && <Flame className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{lead.service || lead.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                      <src.icon className="w-3.5 h-3.5" style={{ color: src.color }} />
                      <span className="text-xs text-gray-500">{src.label}</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 rounded-full hidden sm:block" style={{ background: stage.bg, color: stage.color }}>{stage.label}</span>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black" style={{ color: scoreColor(lead.score) }}>{lead.score}</p>
                      <p className="text-[10px] text-gray-600">{lead.value > 0 ? `$${lead.value}` : '—'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── ANALYTICS VIEW ────────────────────────────────────────────────── */}
        {view === 'analytics' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Stage funnel */}
              <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-orange-400" /> Pipeline Funnel</h3>
                <div className="space-y-2.5">
                  {STAGES.map(stage => {
                    const count = leads.filter(l => l.stage === stage.key).length;
                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <span className="text-xs font-black w-20" style={{ color: stage.color }}>{stage.label}</span>
                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                          <div className="h-full rounded-full" style={{ width: leads.length ? `${(count/leads.length)*100}%` : '0%', background: stage.color }} />
                        </div>
                        <span className="text-xs font-black text-gray-400 w-5 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Source breakdown */}
              <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-white mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Lead Sources</h3>
                <div className="space-y-2.5">
                  {(Object.entries(SOURCE_ICONS) as [LeadSource, any][]).map(([src, cfg]) => {
                    const count = leads.filter(l => l.source === src).length;
                    if (!count) return null;
                    return (
                      <div key={src} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-24">
                          <cfg.icon className="w-3 h-3" style={{ color: cfg.color }} />
                          <span className="text-[10px] font-black text-gray-400">{cfg.label}</span>
                        </div>
                        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                          <div className="h-full rounded-full" style={{ width: `${(count/leads.length)*100}%`, background: cfg.color }} />
                        </div>
                        <span className="text-xs font-black text-gray-400 w-4 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Score distribution */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-1 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> Lead Score Distribution</h3>
              <p className="text-xs text-gray-600 mb-4">80+ Hot · 60–79 Warm · Below 60 Cold</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Hot (80+)',    count: leads.filter(l => l.score >= 80).length, color: '#4ade80' },
                  { label: 'Warm (60–79)', count: leads.filter(l => l.score >= 60 && l.score < 80).length, color: '#fb923c' },
                  { label: 'Cold (<60)',   count: leads.filter(l => l.score < 60).length,  color: '#f87171' },
                ].map(b => (
                  <div key={b.label} className="rounded-xl p-4 text-center" style={{ background: '#0d0d0d' }}>
                    <p className="text-3xl font-black" style={{ color: b.color }}>{b.count}</p>
                    <p className="text-xs text-gray-500 mt-1">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LEAD DETAIL PANEL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLead && (() => {
          const lead = leads.find(l => l.id === selectedLead.id) ?? selectedLead;
          const stage = STAGES.find(s => s.key === lead.stage)!;
          const src = SOURCE_ICONS[lead.source];
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex justify-end"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={e => { if (e.target === e.currentTarget) setSelectedLead(null); }}>
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-md h-full overflow-y-auto"
                style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Top bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b" style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black" style={{ background: '#ea580c' }}>{lead.name.charAt(0)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-white">{lead.name}</p>
                        {lead.urgent && <Flame className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLead(null)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Score + Stage */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 text-center" style={{ background: '#111' }}>
                      <p className="text-3xl font-black" style={{ color: scoreColor(lead.score) }}>{lead.score}</p>
                      <p className="text-xs text-gray-500 mt-1">Lead Score</p>
                    </div>
                    <div className="rounded-xl p-4 text-center" style={{ background: '#111' }}>
                      <p className="text-lg font-black" style={{ color: stage.color }}>{stage.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{lead.value > 0 ? `$${lead.value.toLocaleString()} value` : 'No value set'}</p>
                    </div>
                  </div>

                  {/* Stage mover */}
                  <div>
                    <p className="text-xs font-black text-gray-500 mb-2">Move to Stage</p>
                    <div className="grid grid-cols-3 gap-2">
                      {STAGES.map(s => (
                        <button key={s.key} onClick={() => moveStage(lead.id, s.key)}
                          className="py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                          style={{ background: lead.stage === s.key ? s.bg : 'rgba(255,255,255,0.04)', color: lead.stage === s.key ? s.color : '#6b7280', border: `1px solid ${lead.stage === s.key ? s.color + '40' : 'transparent'}` }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="rounded-xl p-4 space-y-2.5" style={{ background: '#111' }}>
                    {[
                      { icon: src.icon, label: 'Source', value: src.label, color: src.color },
                      lead.service ? { icon: Tag, label: 'Service', value: lead.service, color: '#9ca3af' } : null,
                      lead.phone ? { icon: Phone, label: 'Phone', value: lead.phone, color: '#9ca3af' } : null,
                      lead.city ? { icon: MapPin, label: 'City', value: lead.city, color: '#9ca3af' } : null,
                      { icon: Clock, label: 'Added', value: timeAgo(lead.createdAt), color: '#9ca3af' },
                      lead.lastContact ? { icon: Calendar, label: 'Last Contact', value: timeAgo(lead.lastContact), color: '#9ca3af' } : null,
                    ].filter(Boolean).map((row: any, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <row.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: row.color }} />
                        <span className="text-xs text-gray-600 w-24 flex-shrink-0">{row.label}</span>
                        <span className="text-xs text-white font-bold">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: Mail,    label: 'Email',  color: '#fb923c', action: () => toast.info(`Opening email to ${lead.email}`) },
                      { icon: Phone,   label: 'Call',   color: '#4ade80', action: () => toast.info(`Calling ${lead.phone || 'no phone on file'}`) },
                      { icon: Flame,   label: lead.urgent ? 'Unmark' : 'Urgent', color: '#f87171', action: () => toggleUrgent(lead.id) },
                    ].map(a => (
                      <button key={a.label} onClick={a.action}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-black transition hover:brightness-110"
                        style={{ background: 'rgba(255,255,255,0.04)', color: a.color, border: '1px solid rgba(255,255,255,0.07)' }}>
                        <a.icon className="w-4 h-4" /> {a.label}
                      </button>
                    ))}
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-xs font-black text-gray-500 mb-2">Notes</p>
                    <div className="flex gap-2 mb-3">
                      <input value={newNote} onChange={e => setNewNote(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                        placeholder="Add a note…"
                        className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                      <button onClick={addNote} className="px-3 rounded-xl text-orange-400 hover:text-orange-300 transition" style={{ background: 'rgba(234,88,12,0.1)' }}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {leadNotes.length === 0 && <p className="text-xs text-gray-700 text-center py-3">No notes yet</p>}
                    <div className="space-y-2">
                      {leadNotes.map(n => (
                        <div key={n.id} className="rounded-xl p-3" style={{ background: '#111' }}>
                          <p className="text-xs text-gray-300 leading-relaxed">{n.body}</p>
                          <p className="text-[10px] text-gray-700 mt-1">{timeAgo(n.at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── ADD LEAD MODAL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: '#111', border: '1px solid rgba(234,88,12,0.2)' }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-white">Add Lead</h3>
                <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
                {[
                  { key: 'name',    label: 'Name *',    placeholder: 'Full name',    type: 'text'  },
                  { key: 'email',   label: 'Email *',   placeholder: 'Email address',type: 'email' },
                  { key: 'phone',   label: 'Phone',     placeholder: '(614) 555-…',  type: 'tel'   },
                  { key: 'city',    label: 'City',      placeholder: 'Columbus, OH', type: 'text'  },
                  { key: 'service', label: 'Service',   placeholder: 'e.g. Lawn Care', type: 'text'},
                  { key: 'value',   label: 'Deal Value', placeholder: '0',           type: 'number'},
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-black text-gray-500 block mb-1">{f.label}</label>
                    <input type={f.type} value={(addForm as any)[f.key]} placeholder={f.placeholder}
                      onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1">Source</label>
                    <select value={addForm.source} onChange={e => setAddForm(p => ({ ...p, source: e.target.value as LeadSource }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none">
                      {(Object.entries(SOURCE_ICONS) as [LeadSource,any][]).map(([s, cfg]) => <option key={s} value={s}>{cfg.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1">Stage</label>
                    <select value={addForm.stage} onChange={e => setAddForm(p => ({ ...p, stage: e.target.value as LeadStage }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none">
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={addLead}
                  className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>Add Lead</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
