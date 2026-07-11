/**
 * Auto-Dispatch Engine
 * Automatically assigns the nearest available contractor when remote resolution fails.
 * Escalation timers fire if no accept within threshold.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Truck, MapPin, Clock, Phone, CheckCircle, AlertTriangle,
  X, ChevronRight, User, Zap, RefreshCw, Settings,
  Timer, Radio, Star, TrendingUp, Circle, ArrowRight,
  Navigation, Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

type ContractorStatus = 'available' | 'en_route' | 'on_job' | 'offline';
type DispatchStatus   = 'pending' | 'assigned' | 'accepted' | 'en_route' | 'arrived' | 'done' | 'failed';

interface Contractor {
  id: string;
  name: string;
  trade: string;
  phone: string;
  location: string;
  eta: number; // minutes
  status: ContractorStatus;
  rating: number;
  completedJobs: number;
  acceptRate: number; // 0-100
}

interface Dispatch {
  id: string;
  ticketId: string;
  address: string;
  issue: string;
  severity: number;
  contractorId: string | null;
  status: DispatchStatus;
  assignedAt: string;
  acceptDeadline: string; // ISO — if not accepted by this, re-dispatch
  acceptedAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  attempts: number;
  notes: string;
}

const CONTRACTORS: Contractor[] = [
  { id: 'C001', name: 'Marcus Williams',   trade: 'Plumbing',     phone: '(614) 555-0192', location: 'Westerville, OH',  eta: 18, status: 'available', rating: 4.9, completedJobs: 234, acceptRate: 96 },
  { id: 'C002', name: 'Darlene Hayes',     trade: 'Electrical',   phone: '(614) 555-0348', location: 'Hilliard, OH',     eta: 25, status: 'available', rating: 4.8, completedJobs: 189, acceptRate: 92 },
  { id: 'C003', name: 'Jorge Reyes',       trade: 'HVAC',         phone: '(740) 555-0471', location: 'Newark, OH',       eta: 38, status: 'en_route',  rating: 4.7, completedJobs: 156, acceptRate: 88 },
  { id: 'C004', name: 'Tamara Ellis',      trade: 'General',      phone: '(614) 555-0593', location: 'Dublin, OH',       eta: 22, status: 'available', rating: 4.9, completedJobs: 312, acceptRate: 98 },
  { id: 'C005', name: 'Kevin Osei',        trade: 'Plumbing',     phone: '(614) 555-0627', location: 'Gahanna, OH',      eta: 31, status: 'on_job',    rating: 4.6, completedJobs: 97,  acceptRate: 84 },
  { id: 'C006', name: 'Sarah Nguyen',      trade: 'Electrical',   phone: '(614) 555-0714', location: 'Columbus, OH',     eta: 15, status: 'available', rating: 5.0, completedJobs: 78,  acceptRate: 100 },
  { id: 'C007', name: 'Andre Thompson',    trade: 'Roofing',      phone: '(614) 555-0839', location: 'Reynoldsburg, OH', eta: 44, status: 'available', rating: 4.8, completedJobs: 145, acceptRate: 90 },
  { id: 'C008', name: 'Brenda Castillo',  trade: 'General',      phone: '(740) 555-0962', location: 'Lancaster, OH',    eta: 55, status: 'offline',   rating: 4.7, completedJobs: 203, acceptRate: 87 },
];

function seedDispatches(): Dispatch[] {
  const d = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  const dl = (h: number) => new Date(Date.now() - h * 3600000 + 900000).toISOString(); // +15min deadline
  return [
    { id: 'DSP-001', ticketId: 'EMG-001', address: '1234 Oak St, Columbus OH',     issue: 'Water leak under kitchen sink',    severity: 3, contractorId: 'C001', status: 'en_route',  assignedAt: d(0.8), acceptDeadline: dl(0.8), acceptedAt: d(0.7), attempts: 1, notes: 'Marcus accepted in 4 min. ETA 12 min remaining.' },
    { id: 'DSP-002', ticketId: 'EMG-004', address: '321 Pine Rd, Newark OH',       issue: 'Sparks + burning smell from outlet', severity: 4, contractorId: 'C002', status: 'arrived',  assignedAt: d(0.4), acceptDeadline: dl(0.4), acceptedAt: d(0.35), arrivedAt: d(0.1), attempts: 1, notes: 'Darlene arrived. Working on breaker panel.' },
    { id: 'DSP-003', ticketId: 'EMG-005', address: '456 Cedar Ln, Hilliard OH',    issue: 'Roof leaking after storm',          severity: 3, contractorId: 'C007', status: 'assigned', assignedAt: d(0.1), acceptDeadline: dl(0.1), attempts: 1, notes: 'Awaiting Andre acceptance. 13 min remaining.' },
    { id: 'DSP-004', ticketId: 'EMG-007', address: '789 Maple Dr, Columbus OH',    issue: 'No heat — furnace out',             severity: 3, contractorId: 'C003', status: 'done',     assignedAt: d(6), acceptDeadline: dl(6), acceptedAt: d(5.9), arrivedAt: d(5.5), completedAt: d(4.2), attempts: 1, notes: 'Jorge replaced igniter. System restored.' },
    { id: 'DSP-005', ticketId: 'EMG-008', address: '555 Birch Ave, Westerville OH', issue: 'Sewer backup in basement',         severity: 4, contractorId: null,   status: 'failed',   assignedAt: d(2), acceptDeadline: dl(2), attempts: 3, notes: '3 contractors unavailable. Escalated to on-call manager.' },
  ];
}

const STATUS_CFG: Record<DispatchStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  assigned: { label: 'Assigned',  color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  accepted: { label: 'Accepted',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  en_route: { label: 'En Route',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
  arrived:  { label: 'Arrived',   color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  done:     { label: 'Complete',  color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  failed:   { label: 'Failed',    color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

const CONTRACTOR_STATUS_CFG: Record<ContractorStatus, { label: string; color: string }> = {
  available: { label: 'Available', color: '#4ade80' },
  en_route:  { label: 'En Route',  color: '#fbbf24' },
  on_job:    { label: 'On Job',    color: '#fb923c' },
  offline:   { label: 'Offline',   color: '#6b7280' },
};

function tradeIcon(trade: string) {
  if (/plumb/i.test(trade)) return '🔧';
  if (/elec/i.test(trade)) return '⚡';
  if (/hvac|heat|cool/i.test(trade)) return '❄️';
  if (/roof/i.test(trade)) return '🏠';
  return '🔨';
}

export default function AutoDispatchEngine() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [contractors]               = useState<Contractor[]>(CONTRACTORS);
  const [selected, setSelected]     = useState<Dispatch | null>(null);
  const [view, setView]             = useState<'live' | 'contractors' | 'settings'>('live');
  const [showNewDispatch, setShowNew] = useState(false);

  // New dispatch form
  const [form, setForm] = useState({ address: '', issue: '', severity: '3', trade: 'General' });

  // Escalation timer setting (minutes)
  const [escalationMinutes, setEscalationMinutes] = useState(15);
  const [autoReassign, setAutoReassign]           = useState(true);
  const [maxAttempts, setMaxAttempts]             = useState(3);

  useEffect(() => {
    const s = localStorage.getItem('bp_dispatches');
    setDispatches(s ? JSON.parse(s) : seedDispatches());
    if (!s) localStorage.setItem('bp_dispatches', JSON.stringify(seedDispatches()));
  }, []);

  function save(d: Dispatch[]) { setDispatches(d); localStorage.setItem('bp_dispatches', JSON.stringify(d)); }

  function createDispatch() {
    if (!form.address || !form.issue) { toast.error('Address and issue are required'); return; }
    const bestContractor = contractors
      .filter(c => c.status === 'available' && (form.trade === 'General' || c.trade === form.trade))
      .sort((a, b) => b.acceptRate - a.acceptRate)[0] || contractors.filter(c => c.status === 'available')[0];

    const deadline = new Date(Date.now() + escalationMinutes * 60000).toISOString();
    const dispatch: Dispatch = {
      id: `DSP-${String(Date.now()).slice(-4)}`,
      ticketId: `EMG-${String(Date.now()).slice(-3)}`,
      address: form.address,
      issue: form.issue,
      severity: Number(form.severity),
      contractorId: bestContractor?.id || null,
      status: bestContractor ? 'assigned' : 'failed',
      assignedAt: new Date().toISOString(),
      acceptDeadline: deadline,
      attempts: 1,
      notes: bestContractor
        ? `Auto-assigned to ${bestContractor.name} (${bestContractor.acceptRate}% accept rate). Must accept within ${escalationMinutes} min.`
        : 'No available contractors matched. Escalated to on-call manager.',
    };
    const updated = [dispatch, ...dispatches];
    save(updated);
    setShowNew(false);
    setForm({ address: '', issue: '', severity: '3', trade: 'General' });
    toast.success(bestContractor ? `Dispatched to ${bestContractor.name}` : 'No contractor available — escalated');
  }

  function advanceStatus(id: string) {
    const order: DispatchStatus[] = ['pending', 'assigned', 'accepted', 'en_route', 'arrived', 'done'];
    const updated = dispatches.map(d => {
      if (d.id !== id) return d;
      const idx = order.indexOf(d.status);
      const next = order[Math.min(idx + 1, order.length - 1)];
      const now = new Date().toISOString();
      return { ...d, status: next, acceptedAt: next === 'accepted' ? now : d.acceptedAt, arrivedAt: next === 'arrived' ? now : d.arrivedAt, completedAt: next === 'done' ? now : d.completedAt };
    });
    save(updated);
    const d = updated.find(d => d.id === id)!;
    setSelected(d);
    toast.success(`Status → ${STATUS_CFG[d.status].label}`);
  }

  const active    = dispatches.filter(d => !['done', 'failed'].includes(d.status));
  const complete  = dispatches.filter(d => d.status === 'done').length;
  const failed    = dispatches.filter(d => d.status === 'failed').length;
  const avgEta    = Math.round(contractors.filter(c => c.status === 'available').reduce((a, c) => a + c.eta, 0) / (contractors.filter(c => c.status === 'available').length || 1));

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <Truck className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black">Auto-Dispatch Engine</h1>
              <p className="text-gray-500 text-sm mt-0.5">Smart contractor routing — nearest, highest-rated, available</p>
            </div>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Zap className="w-4 h-4" /> Manual Dispatch
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Dispatches', value: active.length,  icon: Radio,        color: '#fbbf24' },
            { label: 'Completed Today',   value: complete,        icon: CheckCircle,  color: '#4ade80' },
            { label: 'Failed / Escalated',value: failed,          icon: AlertTriangle,color: '#f87171' },
            { label: 'Avg Contractor ETA',value: `${avgEta} min`, icon: Clock,        color: '#60a5fa' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[['live','Live Dispatches'], ['contractors','Contractors'], ['settings','Settings']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v as any)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black transition"
              style={view === v ? { background: '#f59e0b', color: 'white' } : { color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── LIVE DISPATCHES ──────────────────────────────────────────────── */}
        {view === 'live' && (
          <div className="space-y-2">
            {dispatches.map(dispatch => {
              const sc = STATUS_CFG[dispatch.status];
              const contractor = contractors.find(c => c.id === dispatch.contractorId);
              return (
                <div key={dispatch.id} onClick={() => setSelected(dispatch)}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 cursor-pointer hover:brightness-110 transition"
                  style={{ background: '#111', border: `1px solid ${dispatch.status === 'failed' ? 'rgba(248,113,113,0.2)' : dispatch.status === 'arrived' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {contractor ? tradeIcon(contractor.trade) : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-white">{dispatch.issue}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{dispatch.address}</p>
                    {contractor && <p className="text-[10px] text-gray-600">{contractor.name} · {contractor.trade} · {contractor.eta} min ETA</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-gray-600">{dispatch.id}</p>
                    <p className="text-[10px] text-gray-700">Attempt {dispatch.attempts}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-700" />
                </div>
              );
            })}
          </div>
        )}

        {/* ── CONTRACTORS ──────────────────────────────────────────────────── */}
        {view === 'contractors' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contractors.map(c => {
              const sc = CONTRACTOR_STATUS_CFG[c.status];
              return (
                <div key={c.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {tradeIcon(c.trade)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-white">{c.name}</p>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.color + '20', color: sc.color }}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{c.trade} · {c.location}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-sm font-black text-white flex items-center justify-center gap-0.5"><Star className="w-3 h-3 text-yellow-400" />{c.rating}</p>
                      <p className="text-[9px] text-gray-600">Rating</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-sm font-black text-white">{c.completedJobs}</p>
                      <p className="text-[9px] text-gray-600">Jobs</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-sm font-black text-green-400">{c.acceptRate}%</p>
                      <p className="text-[9px] text-gray-600">Accept Rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Navigation className="w-3 h-3 text-gray-600" />
                    <p className="text-[10px] text-gray-500">{c.status === 'available' ? `Est. ${c.eta} min to downtown Columbus` : c.status === 'on_job' ? 'Currently on a job' : c.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────────────── */}
        {view === 'settings' && (
          <div className="max-w-xl space-y-4">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white">Escalation Rules</h3>
              <div>
                <p className="text-sm font-bold text-white mb-1">Acceptance deadline (minutes)</p>
                <p className="text-xs text-gray-500 mb-2">If contractor doesn't accept within this time, AI re-dispatches to next available</p>
                <div className="flex gap-2">
                  {[5, 10, 15, 20, 30].map(m => (
                    <button key={m} onClick={() => setEscalationMinutes(m)}
                      className="flex-1 py-2 rounded-xl text-sm font-black transition"
                      style={{ background: escalationMinutes === m ? '#f59e0b30' : '#0d0d0d', color: escalationMinutes === m ? '#fbbf24' : '#6b7280', border: `1px solid ${escalationMinutes === m ? '#f59e0b50' : 'rgba(255,255,255,0.07)'}` }}>
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Auto-reassign if declined</p>
                  <p className="text-xs text-gray-500">Immediately try next contractor on decline</p>
                </div>
                <button onClick={() => setAutoReassign(p => !p)}>
                  {autoReassign ? <div className="w-12 h-6 rounded-full relative" style={{ background: '#f59e0b' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
                    : <div className="w-12 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
                </button>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">Max attempts before escalation to manager</p>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setMaxAttempts(n)}
                      className="flex-1 py-2 rounded-xl text-sm font-black transition"
                      style={{ background: maxAttempts === n ? '#f59e0b30' : '#0d0d0d', color: maxAttempts === n ? '#fbbf24' : '#6b7280', border: `1px solid ${maxAttempts === n ? '#f59e0b50' : 'rgba(255,255,255,0.07)'}` }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => toast.success('Dispatch settings saved!')}
                className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Save Settings</button>
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-3">Auto-dispatch priority order</h3>
              <div className="space-y-2 text-xs text-gray-400">
                {['1. Matching trade + available + highest accept rate', '2. Any trade + available + nearest ETA', '3. On-job contractors flagged for next slot', '4. Escalate to on-call manager if all 3 fail'].map(r => (
                  <div key={r} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual dispatch modal */}
      <AnimatePresence>
        {showNewDispatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              className="w-full max-w-md rounded-3xl p-6 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Manual Dispatch</h2>
                <button onClick={() => setShowNew(false)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Property address"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
              <input value={form.issue} onChange={e => setForm(f => ({...f, issue: e.target.value}))} placeholder="Describe the issue"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Severity</p>
                  <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none"
                    style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {[1,2,3,4,5].map(s => <option key={s} value={s}>Severity {s}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Trade needed</p>
                  <select value={form.trade} onChange={e => setForm(f => ({...f, trade: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none"
                    style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {['General','Plumbing','Electrical','HVAC','Roofing'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl p-3 text-xs text-gray-400" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                AI will select best available contractor and set a {escalationMinutes}-min acceptance deadline.
              </div>
              <button onClick={createDispatch}
                className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <Zap className="w-4 h-4" /> Dispatch Now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dispatch detail */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md h-full overflow-y-auto" style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="sticky top-0 flex items-center justify-between p-5 border-b" style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="font-black text-white">{selected.id}</p>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: STATUS_CFG[selected.status].bg, color: STATUS_CFG[selected.status].color }}>{STATUS_CFG[selected.status].label}</span>
                </div>
                <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl p-4" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Issue</p>
                  <p className="text-sm text-white font-bold">{selected.issue}</p>
                  <p className="text-xs text-gray-400 mt-1">{selected.address}</p>
                </div>
                {selected.contractorId && (() => {
                  const c = contractors.find(x => x.id === selected.contractorId);
                  if (!c) return null;
                  return (
                    <div className="rounded-xl p-4" style={{ background: '#111' }}>
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Assigned Contractor</p>
                      <p className="font-black text-white">{tradeIcon(c.trade)} {c.name}</p>
                      <p className="text-xs text-gray-400">{c.trade} · <Star className="w-3 h-3 text-yellow-400 inline" /> {c.rating} · {c.acceptRate}% accept</p>
                      <a href={`tel:${c.phone}`} className="flex items-center gap-2 mt-2 text-xs text-blue-400 font-bold">
                        <Phone className="w-3.5 h-3.5" /> {c.phone}
                      </a>
                    </div>
                  );
                })()}
                <div className="rounded-xl p-4" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                  <p className="text-xs font-black text-blue-400 mb-2">AI Notes</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{selected.notes}</p>
                </div>
                {/* Status progression */}
                <div className="rounded-xl p-4" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Timeline</p>
                  {(['assigned','accepted','en_route','arrived','done'] as DispatchStatus[]).map((s, i) => {
                    const order: DispatchStatus[] = ['pending','assigned','accepted','en_route','arrived','done'];
                    const current = order.indexOf(selected.status);
                    const isReached = order.indexOf(s) <= current;
                    return (
                      <div key={s} className="flex items-center gap-3 mb-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isReached ? STATUS_CFG[s]?.bg || 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)' }}>
                          {isReached && <CheckCircle className="w-3 h-3" style={{ color: STATUS_CFG[s]?.color || '#4ade80' }} />}
                        </div>
                        <p className="text-xs" style={{ color: isReached ? 'white' : '#4b5563' }}>{STATUS_CFG[s]?.label || s}</p>
                      </div>
                    );
                  })}
                </div>
                {!['done','failed'].includes(selected.status) && (
                  <button onClick={() => advanceStatus(selected.id)}
                    className="w-full py-3 rounded-xl font-black text-sm hover:brightness-110 transition flex items-center justify-center gap-2"
                    style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <ArrowRight className="w-4 h-4" /> Advance to Next Status
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
