/**
 * LiveChatWidget — floating chat bubble for public pages.
 * Provides AI-powered instant responses + lead capture + escalation to human.
 * Config stored in localStorage key 'live_chat_config'.
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Bot, Phone, Mail, ChevronDown, Minimize2, Maximize2, CheckCircle } from 'lucide-react';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const chatAuthHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

interface ChatConfig {
  enabled: boolean;
  businessName: string;
  welcomeMessage: string;
  accentColor: string;
  position: 'bottom-right' | 'bottom-left';
  agentName: string;
  agentAvatar: string;
  collectLeads: boolean;
  aiEnabled: boolean;
  offlineMessage: string;
  businessHours: { start: number; end: number };
  quickReplies: string[];
}

interface Message {
  id: string;
  role: 'user' | 'bot' | 'system';
  text: string;
  ts: number;
}

const DEFAULT_CONFIG: ChatConfig = {
  enabled: true,
  businessName: 'Black Phoenix Builds',
  welcomeMessage: "Hi there! 👋 How can we help you today? Ask us anything about our services, pricing, or availability.",
  accentColor: '#ea580c',
  position: 'bottom-right',
  agentName: 'Phoenix Support',
  agentAvatar: '',
  collectLeads: true,
  aiEnabled: true,
  offlineMessage: "We're offline right now but will get back to you within a few hours. Leave your email and we'll reach out!",
  businessHours: { start: 8, end: 18 },
  quickReplies: ['Get a free estimate', 'What services do you offer?', 'How much does it cost?', 'Schedule a call'],
};

function getConfig(): ChatConfig {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('live_chat_config') || '{}') }; } catch { return DEFAULT_CONFIG; }
}

function isBusinessHours(config: ChatConfig) {
  const h = new Date().getHours();
  return h >= config.businessHours.start && h < config.businessHours.end;
}

const AI_RESPONSES: Record<string, string> = {
  estimate: "We'd love to give you a free estimate! You can fill out our quick form at the top of the page, or leave your phone number here and we'll call you within 24 hours. What type of work are you looking to get done?",
  services: "We offer a wide range of services: roofing, siding, gutters, windows, doors, decks, additions, remodeling, electrical, plumbing, HVAC, painting, flooring, and more. What project are you planning?",
  cost: "Pricing varies by project scope, materials, and location. Most of our jobs range from a few hundred to tens of thousands of dollars. The best way to get an accurate number is a free on-site estimate — no obligation. Want us to set that up?",
  schedule: "We can get you on the calendar quickly! What's your availability this week or next? We do estimates Mon–Sat, 8am–6pm. Leave your name and number and we'll reach out to confirm.",
  hello: "Hey there! Thanks for reaching out. I'm the Phoenix virtual assistant — I can answer questions about our services, pricing, or schedule a call with our team. What can I help with?",
  hi: "Hey there! Thanks for reaching out. What can I help you with today?",
  hours: "We're open Monday through Saturday, 8am to 6pm. For emergencies, we also have an after-hours line — just mention it and we'll get you the number.",
  location: "We serve all of New Hampshire and parts of southern Maine and Vermont. Where is your project located?",
  warranty: "We stand behind our work with a 1-year labor warranty on all projects, and manufacturer warranties on materials (which range from 10 years to lifetime depending on the product). Would you like more details?",
  insurance: "Yes — we're fully licensed and insured in New Hampshire. We carry general liability and workers' compensation insurance. We're happy to provide a certificate of insurance before any job starts.",
};

function aiReply(text: string): string {
  const t = text.toLowerCase();
  if (/estimate|quote|bid|price it|how much/.test(t)) return AI_RESPONSES.estimate;
  if (/service|offer|do you do|can you|what do/.test(t)) return AI_RESPONSES.services;
  if (/cost|price|charge|rate|how much|expensive/.test(t)) return AI_RESPONSES.cost;
  if (/schedule|call|appointment|book|availability|come out/.test(t)) return AI_RESPONSES.schedule;
  if (/hour|open|close|available|when/.test(t)) return AI_RESPONSES.hours;
  if (/where|location|area|serve|nh|new hampshire/.test(t)) return AI_RESPONSES.location;
  if (/warrant|guarantee/.test(t)) return AI_RESPONSES.warranty;
  if (/insur|licensed|bonded/.test(t)) return AI_RESPONSES.insurance;
  if (/^hi|^hello|^hey|^good/.test(t)) return AI_RESPONSES.hi;
  return "Great question! I want to make sure you get the right answer. Let me connect you with our team — can you leave your name and best contact number? Someone will reach out within a few hours. Or call us directly at (603) 555-0100.";
}

function recordChatLead(email: string, name: string) {
  const capturedAt = new Date().toISOString();
  // Keep a localStorage copy as offline fallback…
  try {
    const leads = JSON.parse(localStorage.getItem('chat_leads') || '[]');
    leads.push({ email, name, capturedAt, source: 'live-chat' });
    localStorage.setItem('chat_leads', JSON.stringify(leads));
  } catch {}
  // …and persist to the server so it shows up in the Live Chat Manager for all admins.
  fetch(`${SERVER}/chat/leads`, {
    method: 'POST', headers: chatAuthHeaders,
    body: JSON.stringify({ email, name, source: 'live-chat', capturedAt }),
  }).catch(err => console.error('Failed to persist chat lead to server:', err));
}

export default function LiveChatWidget() {
  const [config] = useState(getConfig);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [leadStep, setLeadStep] = useState<'none' | 'name' | 'email' | 'done'>('none');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const online = isBusinessHours(config);

  useEffect(() => {
    if (!config.enabled) return;
    const t = setTimeout(() => {
      if (!open) setUnread(1);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: '0', role: 'bot',
        text: config.welcomeMessage,
        ts: Date.now(),
      }]);
      setUnread(0);
    }
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  if (!config.enabled) return null;

  function addMsg(role: Message['role'], text: string) {
    setMessages(m => [...m, { id: String(Date.now()), role, text, ts: Date.now() }]);
  }

  async function send(text?: string) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    addMsg('user', msg);
    setTyping(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    setTyping(false);

    if (leadStep === 'name') {
      setLeadName(msg);
      setLeadStep('email');
      addMsg('bot', `Nice to meet you, ${msg}! What's the best email to reach you at?`);
      return;
    }
    if (leadStep === 'email') {
      setLeadEmail(msg);
      setLeadStep('done');
      recordChatLead(msg, leadName);
      addMsg('bot', `Perfect! We've got your info, ${leadName}. Someone from our team will reach out to ${msg} within a few hours. Is there anything else I can help you with in the meantime?`);
      return;
    }

    const reply = aiReply(msg);
    addMsg('bot', reply);

    if (/schedule|call|reach|contact|number|name/.test(reply.toLowerCase()) && leadStep === 'none') {
      setTimeout(() => {
        setLeadStep('name');
        addMsg('bot', "What's your name so I can pass it along to our team?");
      }, 1200);
    }
  }

  const positionClass = config.position === 'bottom-left' ? 'left-5' : 'right-5';

  return (
    <div className={`fixed bottom-5 ${positionClass} z-[9998] flex flex-col items-end gap-3`}>
      {/* Chat window */}
      {open && !minimized && (
        <div
          className="w-[340px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ background: '#111', border: '1px solid #222', maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: config.accentColor }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
                {config.agentName[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{config.agentName}</p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-300' : 'bg-gray-300'}`} />
                  <p className="text-[10px] text-white/80">{online ? 'Online now' : 'Offline — replies within a few hours'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(true)} className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition">
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 200 }}>
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {m.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: config.accentColor }}>
                    {config.agentName[0]}
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'text-white rounded-tr-sm'
                      : 'text-gray-100 rounded-tl-sm'
                  }`}
                  style={{
                    background: m.role === 'user' ? config.accentColor : '#1e1e1e',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: config.accentColor }}>
                  {config.agentName[0]}
                </div>
                <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[#1e1e1e] flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && config.quickReplies.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {config.quickReplies.map(qr => (
                <button key={qr} onClick={() => send(qr)}
                  className="text-xs px-3 py-1.5 rounded-full border transition hover:opacity-80"
                  style={{ borderColor: `${config.accentColor}66`, color: config.accentColor, background: `${config.accentColor}11` }}>
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t border-[#1e1e1e]">
            <div className="flex gap-2 items-center bg-[#1a1a1a] rounded-xl px-3 py-2">
              <input
                type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <button onClick={() => send()} disabled={!input.trim()}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition disabled:opacity-40"
                style={{ background: config.accentColor }}>
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <p className="text-center text-[9px] text-gray-700 mt-1.5">Powered by Phoenix AI · We typically reply in minutes</p>
          </div>
        </div>
      )}

      {/* Minimized banner */}
      {open && minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: config.accentColor }}
        >
          <MessageCircle className="w-4 h-4" />
          {config.agentName}
          <Maximize2 className="w-3.5 h-3.5 ml-1" />
        </button>
      )}

      {/* Bubble trigger */}
      {!open && (
        <div className="relative">
          {unread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-10">
              {unread}
            </div>
          )}
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{ background: config.accentColor }}
            aria-label="Open chat"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
