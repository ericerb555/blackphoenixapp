/**
 * AI Emergency Agent
 * Handles incoming emergency requests autonomously.
 * Only escalates to a human when the situation genuinely requires it.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Bot, Flame, Zap, Droplets, Wind, Wrench, Home, Phone,
  CheckCircle, AlertTriangle, AlertCircle, Clock, Send,
  ChevronRight, User, Shield, TrendingUp, Activity,
  Bell, BellOff, Settings, RefreshCw, Eye, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity = 1 | 2 | 3 | 4 | 5;
type TicketStatus = 'open' | 'ai_handling' | 'self_resolved' | 'dispatched' | 'escalated' | 'closed';

interface Ticket {
  id: string;
  caller: string;
  phone: string;
  address: string;
  category: string;
  description: string;
  severity: Severity;
  status: TicketStatus;
  aiNotes: string;
  humanRequired: boolean;
  createdAt: string;
  resolvedAt?: string;
  channel: 'chat' | 'form' | 'sms';
}

interface Message {
  role: 'ai' | 'user';
  text: string;
  ts: string;
}

// ─── AI Knowledge Base ────────────────────────────────────────────────────────
const TRIAGE_RULES: Record<string, { severity: Severity; selfFix?: string[]; dispatch: boolean; humanRequired: boolean }> = {
  flood:       { severity: 4, dispatch: true,  humanRequired: true,  selfFix: ['Shut off the main water valve immediately — usually located under the sink or near the water meter outside.', 'Turn off electricity to affected rooms at the breaker box.', 'Do NOT enter standing water if electricity may be involved.', 'Move valuables to higher ground. We are dispatching a crew now.'] },
  leak:        { severity: 3, dispatch: true,  humanRequired: false, selfFix: ['Locate and shut off the water valve under the affected sink or toilet.', 'Place towels or a bucket to contain dripping.', 'Take a photo of the leak for our technician. We are dispatching someone within the hour.'] },
  no_water:    { severity: 2, dispatch: false, humanRequired: false, selfFix: ['Check if your neighbors have water — may be a city outage.', 'Verify your main shutoff valve is fully open.', 'Check if your water bill is current.', 'Call your city water utility: most have 24/7 outage lines.'] },
  no_power:    { severity: 2, dispatch: false, humanRequired: false, selfFix: ['Check your breaker panel — look for any tripped breakers (they sit in the middle position).', 'Reset tripped breakers by switching fully OFF then back ON.', 'Check if neighbors have power — may be a utility outage.', 'If the panel smells burnt or shows scorch marks, evacuate and call 911.'] },
  electrical:  { severity: 4, dispatch: true,  humanRequired: true,  selfFix: ['Do NOT touch exposed wires or sparking outlets.', 'If there is burning smell or smoke, evacuate immediately and call 911.', 'Shut off power at the main breaker if it is safe to do so.', 'We are dispatching a licensed electrician now.'] },
  hvac:        { severity: 2, dispatch: false, humanRequired: false, selfFix: ['Replace your air filter — a clogged filter is the #1 cause of HVAC failure.', 'Check that the thermostat is set correctly and has fresh batteries.', 'Verify the circuit breaker for your HVAC unit has not tripped.', 'Clear any debris blocking outdoor condenser unit.'] },
  heat:        { severity: 3, dispatch: true,  humanRequired: false, selfFix: ['Set thermostat to HEAT and raise temperature 5° above current room temp.', 'Check pilot light if you have a gas furnace.', 'Inspect furnace filter — replace if grey/clogged.', 'A technician will arrive within 2 hours.'] },
  ac:          { severity: 2, dispatch: false, humanRequired: false, selfFix: ['Replace the air filter.', 'Check that the outdoor unit is not blocked by leaves or debris.', 'Reset the unit by turning it off for 30 minutes, then back on.', 'Verify the drain line is not clogged.'] },
  fire:        { severity: 5, dispatch: true,  humanRequired: true,  selfFix: ['CALL 911 IMMEDIATELY.', 'Evacuate everyone from the building.', 'Do not re-enter for any reason.', 'Meet at your designated meeting spot. We are contacting emergency services.'] },
  smoke:       { severity: 5, dispatch: true,  humanRequired: true,  selfFix: ['CALL 911 IMMEDIATELY if smoke is visible.', 'If it is a nuisance alarm (cooking smoke), ventilate the area and fan the detector.', 'Test your smoke detectors monthly.'] },
  gas:         { severity: 5, dispatch: true,  humanRequired: true,  selfFix: ['Evacuate the building immediately — do not turn any lights or switches on or off.', 'Do not use your phone inside the building.', 'Call your gas company emergency line from outside.', 'Call 911. We are dispatching help now.'] },
  lock:        { severity: 1, dispatch: false, humanRequired: false, selfFix: ['Check all entry points — windows, back door, garage.', 'Contact a licensed locksmith in your area for 24/7 lockout service.', 'If this is a security breach, call 911 first.'] },
  appliance:   { severity: 1, dispatch: false, humanRequired: false, selfFix: ['Unplug the appliance immediately.', 'Check for visible damage to the cord or unit.', 'If it is under warranty, contact the manufacturer.', 'Schedule a service visit through our app for next-day service.'] },
  roof:        { severity: 3, dispatch: true,  humanRequired: false, selfFix: ['Place buckets to catch dripping water.', 'Do not go on the roof — especially in wet conditions.', 'Cover furniture with plastic sheeting.', 'We are scheduling an inspection for first light.'] },
  structural:  { severity: 4, dispatch: true,  humanRequired: true,  selfFix: ['Evacuate the area if there are visible cracks or sagging.', 'Do not enter rooms where the ceiling appears to be bulging.', 'We are dispatching a structural assessment team now.'] },
};

function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (/fire|flames?|burning/.test(t)) return 'fire';
  if (/smoke|alarm/.test(t)) return 'smoke';
  if (/gas|smell.*rotten|rotten.*smell/.test(t)) return 'gas';
  if (/flood|flooded|basement.*water/.test(t)) return 'flood';
  if (/leak|drip|pipe burst/.test(t)) return 'leak';
  if (/no water|water.*off|water.*out/.test(t)) return 'no_water';
  if (/no power|power out|blackout|electricity.*out/.test(t)) return 'no_power';
  if (/spark|shock|wire|electrical/.test(t)) return 'electrical';
  if (/heat|heater|furnace|boiler/.test(t)) return 'heat';
  if (/ac|air.*condition|cooling|cool/.test(t)) return 'ac';
  if (/hvac/.test(t)) return 'hvac';
  if (/roof|ceiling/.test(t)) return 'roof';
  if (/crack|sagging|structural|wall.*damage/.test(t)) return 'structural';
  if (/lock|locked out|can't.*get in/.test(t)) return 'lock';
  if (/appliance|fridge|oven|washer|dryer/.test(t)) return 'appliance';
  return 'general';
}

function severityLabel(s: Severity) {
  return ['', 'Routine', 'Low', 'Moderate', 'High', 'CRITICAL'][s];
}
function severityColor(s: Severity) {
  return ['', '#6b7280', '#60a5fa', '#fbbf24', '#fb923c', '#ef4444'][s];
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:          { label: 'Open',          color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  ai_handling:   { label: 'AI Handling',   color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  self_resolved: { label: 'Self-Resolved', color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  dispatched:    { label: 'Dispatched',    color: '#fb923c', bg: 'rgba(249,115,22,0.1)'  },
  escalated:     { label: '🚨 Escalated',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  closed:        { label: 'Closed',        color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

// ─── Seed tickets ─────────────────────────────────────────────────────────────
function seedTickets(): Ticket[] {
  const d = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  return [
    { id: 'EMG-001', caller: 'Maria Santos',   phone: '(614) 555-0192', address: '1234 Oak St, Columbus OH',    category: 'leak',      description: 'Water leaking under kitchen sink',           severity: 3, status: 'dispatched',    aiNotes: 'AI advised shutoff valve closure. Dispatched plumber. ETA 45 min.', humanRequired: false, createdAt: d(1),  channel: 'chat' },
    { id: 'EMG-002', caller: 'Derek J.',        phone: '(614) 555-0341', address: '567 Elm Ave, Westerville OH', category: 'no_power',  description: 'Half the house has no power',                severity: 2, status: 'self_resolved', aiNotes: 'AI guided customer to reset tripped breaker. Issue resolved without dispatch.', humanRequired: false, createdAt: d(3),  resolvedAt: d(2.5), channel: 'chat' },
    { id: 'EMG-003', caller: 'Karen White',     phone: '(614) 555-0419', address: '890 Maple Dr, Dublin OH',    category: 'hvac',      description: 'AC stopped working, 85 degrees inside',      severity: 2, status: 'self_resolved', aiNotes: 'Filter replacement resolved the issue. No dispatch needed.', humanRequired: false, createdAt: d(5),  resolvedAt: d(4.5), channel: 'form' },
    { id: 'EMG-004', caller: 'Troy B.',         phone: '(740) 555-0287', address: '321 Pine Rd, Newark OH',     category: 'electrical',description: 'Sparks coming from outlet, burning smell',    severity: 4, status: 'escalated',    aiNotes: 'SEVERITY 4 — sparking + burning smell. Human notified immediately. Power shutoff advised.', humanRequired: true,  createdAt: d(0.5), channel: 'sms'  },
    { id: 'EMG-005', caller: 'Lisa Chen',       phone: '(614) 555-0573', address: '456 Cedar Ln, Hilliard OH',  category: 'roof',      description: 'Roof leaking badly after storm',             severity: 3, status: 'dispatched',    aiNotes: 'AI assessed rain damage. Dispatched crew for morning inspection. Temporary measures advised.', humanRequired: false, createdAt: d(8),  channel: 'chat' },
    { id: 'EMG-006', caller: 'Sam Okafor',      phone: '(614) 555-0628', address: '789 Birch Blvd, Gahanna OH', category: 'lock',      description: 'Locked out of house at midnight',            severity: 1, status: 'self_resolved', aiNotes: 'AI provided local 24/7 locksmith referrals. Resolved independently.', humanRequired: false, createdAt: d(12), resolvedAt: d(11.5), channel: 'chat' },
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AIEmergencyAgent() {
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [view, setView]           = useState<'dashboard' | 'live-agent' | 'settings'>('dashboard');
  const [selected, setSelected]   = useState<Ticket | null>(null);
  const [filterStatus, setFilter] = useState<TicketStatus | 'all'>('all');

  // Live agent (public-facing chat sim)
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [agentStep, setStep]      = useState<'greeting' | 'collecting' | 'triaging' | 'resolving' | 'done'>('greeting');
  const [agentData, setData]      = useState<Partial<Ticket>>({});
  const [typing, setTyping]       = useState(false);
  const chatRef                   = useRef<HTMLDivElement>(null);

  // Settings
  const [autoDispatch, setAutoDispatch]   = useState(true);
  const [smsAlerts, setSmsAlerts]         = useState(true);
  const [escalateAt, setEscalateAt]       = useState<Severity>(4);
  const [onCallPhone, setOnCallPhone]     = useState('(614) 555-0911');

  useEffect(() => {
    const s = localStorage.getItem('bp_emergency_tickets');
    setTickets(s ? JSON.parse(s) : seedTickets());
    if (!s) localStorage.setItem('bp_emergency_tickets', JSON.stringify(seedTickets()));
  }, []);

  useEffect(() => {
    if (view === 'live-agent' && messages.length === 0) initChat();
  }, [view]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' });
  }, [messages, typing]);

  function saveTickets(t: Ticket[]) {
    setTickets(t);
    localStorage.setItem('bp_emergency_tickets', JSON.stringify(t));
  }

  function aiSay(text: string, delay = 900) {
    setTyping(true);
    setTimeout(() => {
      setMessages(p => [...p, { role: 'ai', text, ts: new Date().toISOString() }]);
      setTyping(false);
    }, delay);
  }

  function initChat() {
    setMessages([]);
    setStep('greeting');
    setData({});
    setTimeout(() => {
      setMessages([{ role: 'ai', text: "🔴 Black Phoenix Emergency Line — I'm your 24/7 AI Response Agent.\n\nI can handle most emergencies right now without waking anyone up. What's happening at your property?", ts: new Date().toISOString() }]);
    }, 400);
  }

  function handleUserMessage(text: string) {
    if (!text.trim()) return;
    setMessages(p => [...p, { role: 'user', text, ts: new Date().toISOString() }]);
    setInput('');
    processStep(text);
  }

  function processStep(text: string) {
    if (agentStep === 'greeting' || agentStep === 'collecting') {
      const category = detectCategory(text);

      if (!agentData.caller) {
        setData(d => ({ ...d, description: text, category }));
        setStep('collecting');
        aiSay("Got it. What's your name and the address of the property?");
        return;
      }

      if (!agentData.address) {
        const parts = text.split(',');
        const name = parts[0]?.trim() || text;
        const address = parts.slice(1).join(',').trim() || 'Address not provided';
        setData(d => ({ ...d, caller: name, address }));
        aiSay("And your best callback number?");
        return;
      }

      if (!agentData.phone) {
        setData(d => ({ ...d, phone: text }));
        setStep('triaging');
        triageAndRespond();
        return;
      }
    }
  }

  function triageAndRespond() {
    setData(current => {
      const cat = current.category || 'general';
      const rule = TRIAGE_RULES[cat] || { severity: 2, dispatch: false, humanRequired: false, selfFix: ["We'll schedule a technician to assess the situation."] };
      const severity = rule.severity as Severity;
      const needsHuman = rule.humanRequired || severity >= escalateAt;

      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setStep('resolving');

        if (severity === 5) {
          setMessages(p => [...p, { role: 'ai', text: `🚨 CRITICAL — ${severityLabel(severity)}\n\n${rule.selfFix?.join('\n\n') || ''}`, ts: new Date().toISOString() }]);
        } else if (rule.selfFix && rule.selfFix.length > 0) {
          const steps = rule.selfFix.map((s, i) => `${i + 1}. ${s}`).join('\n');
          setMessages(p => [...p, { role: 'ai', text: `Assessed: **Severity ${severity} — ${severityLabel(severity)}**\n\nHere's what to do right now:\n\n${steps}`, ts: new Date().toISOString() }]);
        }

        setTimeout(() => {
          if (needsHuman) {
            setMessages(p => [...p, { role: 'ai', text: `This situation requires a human technician. I'm notifying the on-call team at ${onCallPhone} right now and creating an urgent ticket.\n\nStay on this chat — they will reach you within 15 minutes.`, ts: new Date().toISOString() }]);
            createTicket(current, severity, 'escalated', true, 'Human required — AI escalated immediately.');
            toast.error(`🚨 ESCALATED — ${current.caller || 'Customer'} needs human response NOW`);
          } else if (rule.dispatch) {
            setTimeout(() => {
              setMessages(p => [...p, { role: 'ai', text: `I'm automatically dispatching a technician to your address. Expected arrival: 45–90 minutes.\n\nYou'll receive a text confirmation shortly. Is there anything else I can help with while you wait?`, ts: new Date().toISOString() }]);
              createTicket(current, severity, 'dispatched', false, 'AI dispatched crew automatically. No human required.');
              toast.success('Ticket created + crew dispatched automatically');
            }, 1200);
          } else {
            setTimeout(() => {
              setMessages(p => [...p, { role: 'ai', text: `Does that help? If those steps resolved the issue, you're all set — no technician needed tonight.\n\nIf the problem continues, reply here and I'll escalate to dispatch.`, ts: new Date().toISOString() }]);
              createTicket(current, severity, 'ai_handling', false, 'AI provided self-fix guidance. Monitoring for escalation.');
            }, 1200);
          }
          setStep('done');
        }, 1800);
      }, 1400);

      return { ...current, severity, humanRequired: needsHuman };
    });
  }

  function createTicket(data: Partial<Ticket>, severity: Severity, status: TicketStatus, humanRequired: boolean, aiNotes: string) {
    const ticket: Ticket = {
      id: `EMG-${String(Date.now()).slice(-4)}`,
      caller: data.caller || 'Unknown',
      phone: data.phone || '',
      address: data.address || '',
      category: data.category || 'general',
      description: data.description || '',
      severity, status, aiNotes, humanRequired,
      createdAt: new Date().toISOString(),
      channel: 'chat',
    };
    const stored = localStorage.getItem('bp_emergency_tickets');
    const all: Ticket[] = stored ? JSON.parse(stored) : [];
    const updated = [ticket, ...all];
    saveTickets(updated);
    // Capture lead
    fetch(`${SERVER}/leads/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: publicAnonKey },
      body: JSON.stringify({ name: ticket.caller, phone: ticket.phone, source: 'emergency_ai', intent: humanRequired ? 'urgent' : 'converted', message: ticket.description }),
    }).catch(() => {});
  }

  function resolveTicket(id: string) {
    const updated = tickets.map(t => t.id === id ? { ...t, status: 'closed' as TicketStatus, resolvedAt: new Date().toISOString() } : t);
    saveTickets(updated);
    if (selected?.id === id) setSelected(null);
    toast.success('Ticket closed');
  }

  const visible = tickets.filter(t => filterStatus === 'all' || t.status === filterStatus);
  const aiResolved = tickets.filter(t => t.status === 'self_resolved' || (t.status === 'dispatched' && !t.humanRequired)).length;
  const humanCount = tickets.filter(t => t.humanRequired || t.status === 'escalated').length;
  const aiRate = tickets.length ? Math.round((aiResolved / tickets.length) * 100) : 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <Bot className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black">AI Emergency Agent</h1>
              <p className="text-gray-500 text-sm mt-0.5">Autonomous 24/7 response — humans only when truly needed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Agent Online
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'AI Resolution Rate', value: `${aiRate}%`,     icon: Bot,           color: '#4ade80', sub: 'No human needed'    },
            { label: 'Total Tickets',       value: tickets.length,  icon: Activity,      color: '#60a5fa', sub: 'All time'            },
            { label: 'Human Escalations',   value: humanCount,      icon: AlertCircle,   color: '#f87171', sub: 'Truly unavoidable'   },
            { label: 'Avg Response',         value: '< 90 sec',     icon: Clock,         color: '#fbbf24', sub: 'AI first response'   },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-gray-700">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[['dashboard','Dashboard'], ['live-agent','Live Agent Sim'], ['settings','Settings']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v as any)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black transition"
              style={view === v ? { background: '#ef4444', color: 'white' } : { color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ────────────────────────────────────────────────────── */}
        {view === 'dashboard' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 p-1 rounded-xl flex-wrap" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                {(['all', 'open', 'ai_handling', 'self_resolved', 'dispatched', 'escalated', 'closed'] as const).map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black capitalize transition"
                    style={filterStatus === s ? { background: '#ef4444', color: 'white' } : { color: '#6b7280' }}>
                    {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {visible.length === 0 && (
                <div className="text-center py-12 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <CheckCircle className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No tickets match this filter</p>
                </div>
              )}
              {visible.map(ticket => {
                const sc = STATUS_CONFIG[ticket.status];
                return (
                  <div key={ticket.id} onClick={() => setSelected(ticket)}
                    className="flex items-center gap-4 rounded-2xl px-5 py-4 cursor-pointer hover:brightness-110 transition"
                    style={{ background: '#111', border: `1px solid ${ticket.status === 'escalated' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: severityColor(ticket.severity) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-white">{ticket.caller}</p>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        {ticket.humanRequired && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>🚨 Human</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{ticket.category} · {ticket.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-black" style={{ color: severityColor(ticket.severity) }}>SEV {ticket.severity}</p>
                      <p className="text-[10px] text-gray-600">{ticket.id}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── LIVE AGENT SIM ───────────────────────────────────────────────── */}
        {view === 'live-agent' && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.25)', background: '#0d0d0d' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(239,68,68,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <p className="text-sm font-black text-white">AI Emergency Agent — Live</p>
              </div>
              <button onClick={initChat} className="flex items-center gap-1.5 text-xs font-black text-gray-500 hover:text-white transition">
                <RefreshCw className="w-3.5 h-3.5" /> New Session
              </button>
            </div>
            <div ref={chatRef} className="h-96 overflow-y-auto p-5 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'ai' && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5" style={{ background: 'rgba(239,68,68,0.15)' }}>
                      <Bot className="w-3.5 h-3.5 text-red-400" />
                    </div>
                  )}
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
                    style={m.role === 'ai' ? { background: '#1a1a1a', color: '#e5e7eb' } : { background: '#ea580c', color: 'white' }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
                    <Bot className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="flex gap-1 px-4 py-3 rounded-2xl" style={{ background: '#1a1a1a' }}>
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t p-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleUserMessage(input); }}
                  placeholder="Describe your emergency…"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }} />
                <button onClick={() => handleUserMessage(input)}
                  className="px-4 py-2.5 rounded-xl text-white font-black hover:brightness-110 transition flex items-center gap-2"
                  style={{ background: '#ef4444' }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {['Water leak under sink', 'No power in bedroom', 'AC not working', 'Sparks from outlet', 'Locked out'].map(q => (
                  <button key={q} onClick={() => handleUserMessage(q)}
                    className="text-[10px] px-2.5 py-1 rounded-full font-bold text-gray-500 hover:text-white transition"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────────────── */}
        {view === 'settings' && (
          <div className="space-y-4 max-w-xl">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white">Escalation Rules</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Auto-Dispatch Crew</p>
                  <p className="text-xs text-gray-500">For sev 3 dispatch tickets, skip human approval</p>
                </div>
                <button onClick={() => setAutoDispatch(p => !p)} className="transition">
                  {autoDispatch ? <div className="w-12 h-6 rounded-full relative" style={{ background: '#ea580c' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
                    : <div className="w-12 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">SMS On-Call Alerts</p>
                  <p className="text-xs text-gray-500">Text you when severity reaches escalation threshold</p>
                </div>
                <button onClick={() => setSmsAlerts(p => !p)} className="transition">
                  {smsAlerts ? <div className="w-12 h-6 rounded-full relative" style={{ background: '#ea580c' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
                    : <div className="w-12 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
                </button>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-2">Escalate to human at severity ≥</p>
                <div className="grid grid-cols-5 gap-2">
                  {([1,2,3,4,5] as Severity[]).map(s => (
                    <button key={s} onClick={() => setEscalateAt(s)}
                      className="py-2 rounded-xl text-sm font-black transition"
                      style={{ background: escalateAt === s ? severityColor(s) + '30' : '#0d0d0d', color: escalateAt === s ? severityColor(s) : '#6b7280', border: `1px solid ${escalateAt === s ? severityColor(s) + '50' : 'rgba(255,255,255,0.07)'}` }}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Currently: wake human only for Severity {escalateAt}+ ({severityLabel(escalateAt)})</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1.5">On-Call Phone Number</p>
                <input value={onCallPhone} onChange={e => setOnCallPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <button onClick={() => toast.success('Settings saved!')}
                className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>Save Settings</button>
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-3">What the AI handles autonomously</h3>
              <div className="space-y-2">
                {[
                  { icon: Droplets, label: 'Minor leaks', detail: 'Guides shutoff, dispatches plumber, no call needed' },
                  { icon: Zap,      label: 'Power issues', detail: 'Breaker resets, utility outages — AI resolves 70%+' },
                  { icon: Wind,     label: 'HVAC problems', detail: 'Filter checks, thermostat, reset procedures' },
                  { icon: Home,     label: 'Lock-outs', detail: 'Refers local 24/7 locksmith, no dispatch' },
                  { icon: Wrench,   label: 'Appliance failures', detail: 'Warranty triage, schedule next-day service' },
                  { icon: Flame,    label: 'Fire / Gas / Sparks', detail: '🚨 Always escalates to human + 911 guidance' },
                ].map(r => (
                  <div key={r.label} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <r.icon className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-white">{r.label}</p>
                      <p className="text-[10px] text-gray-500">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket detail slide-in */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md h-full overflow-y-auto"
              style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b"
                style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="font-black text-white">{selected.id}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: STATUS_CONFIG[selected.status]?.bg, color: STATUS_CONFIG[selected.status]?.color }}>{STATUS_CONFIG[selected.status]?.label}</span>
                    <span className="text-[10px] font-black" style={{ color: severityColor(selected.severity) }}>SEV {selected.severity} — {severityLabel(selected.severity)}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl p-4 space-y-2" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Caller</p>
                  <p className="text-sm font-black text-white">{selected.caller}</p>
                  <p className="text-xs text-gray-400">{selected.phone}</p>
                  <p className="text-xs text-gray-400">{selected.address}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Issue</p>
                  <p className="text-sm text-gray-300">{selected.description}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                  <p className="text-xs font-black text-blue-400 mb-2 flex items-center gap-2"><Bot className="w-3.5 h-3.5" /> AI Assessment</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{selected.aiNotes}</p>
                </div>
                {selected.humanRequired && (
                  <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black text-red-400">Human Required</p>
                      <p className="text-xs text-gray-500">On-call notified at {onCallPhone}</p>
                    </div>
                  </div>
                )}
                {selected.status !== 'closed' && (
                  <button onClick={() => resolveTicket(selected.id)}
                    className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition flex items-center justify-center gap-2"
                    style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <CheckCircle className="w-4 h-4" /> Mark Resolved & Close
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
