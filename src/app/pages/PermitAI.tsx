import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Bot, User, MapPin, Wrench, Building, Phone, Globe, Mail,
  Clock, Sparkles, FileText, AlertTriangle, ChevronDown, X, RotateCcw,
  ExternalLink, CheckCircle, Clipboard, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DeptInfo {
  dept: string;
  phone: string;
  web: string;
  email: string;
  addr: string;
  hours: string;
}

const WORK_TYPES = [
  'New Construction', 'Room Addition', 'Deck / Patio', 'Garage / Carport',
  'Roof Replacement', 'Electrical Work', 'Plumbing Work', 'HVAC / Mechanical',
  'Kitchen Remodel', 'Bathroom Remodel', 'Basement Finish', 'ADU / In-Law Suite',
  'Pool / Hot Tub', 'Fence', 'Shed / Accessory Structure', 'Window / Door Replacement',
  'Foundation Work', 'Demolition', 'Commercial Build-Out', 'Sign Installation', 'Other',
];

const QUICK_PROMPTS = [
  'What permits do I need for this project?',
  'Walk me through the full process start to finish',
  'What documents do I need to submit?',
  'How long will permits take to get approved?',
  'What inspections will be required?',
  'What are the fees?',
  'Do I need a licensed contractor for this?',
  'What codes apply to this work?',
];

// ─── Markdown-ish renderer ────────────────────────────────────────────────────

function RenderMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Bold headers: **text** or ## text
        if (line.startsWith('## ') || line.startsWith('### ')) {
          const text = line.replace(/^#{2,3}\s/, '');
          return <p key={i} className="font-bold text-white mt-3 mb-1 text-sm">{renderInline(text)}</p>;
        }
        if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
          return <p key={i} className="font-bold text-white mt-2 text-sm">{line.slice(2, -2)}</p>;
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const [num, ...rest] = line.split('. ');
          return (
            <div key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-orange-400 font-bold flex-shrink-0 w-5 text-right">{num}.</span>
              <span>{renderInline(rest.join('. '))}</span>
            </div>
          );
        }
        // Bullet list
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-orange-400 flex-shrink-0 mt-0.5">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        // Regular paragraph
        return <p key={i} className="text-sm text-gray-300 leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Dept Card ────────────────────────────────────────────────────────────────

function DeptCard({ dept, town }: { dept: DeptInfo; town: string }) {
  return (
    <div className="mt-4 p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Building className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <p className="text-sm font-bold text-blue-300">{dept.dept}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a href={`tel:${dept.phone.replace(/\D/g, '')}`}
          className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition">
          <Phone className="w-3 h-3 text-blue-400 flex-shrink-0" />{dept.phone}
        </a>
        <a href={`mailto:${dept.email}`}
          className="flex items-center gap-2 text-xs text-gray-300 hover:text-white transition">
          <Mail className="w-3 h-3 text-blue-400 flex-shrink-0" />{dept.email}
        </a>
        <a href={`https://${dept.web}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-teal-400 hover:text-teal-300 transition">
          <Globe className="w-3 h-3 flex-shrink-0" />{dept.web} <ExternalLink className="w-3 h-3" />
        </a>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />{dept.hours}
        </div>
      </div>
      <div className="flex items-start gap-2 mt-2 text-xs text-gray-400">
        <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />{dept.addr}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialAddress?: string;
  initialWorkType?: string;
  initialWorkOrderId?: string;
  onNavigate?: (page: string) => void;
}

export default function PermitAI({ initialAddress = '', initialWorkType = '', initialWorkOrderId, onNavigate }: Props) {
  const [address, setAddress] = useState(initialAddress);
  const [workType, setWorkType] = useState(initialWorkType);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deptInfo, setDeptInfo] = useState<DeptInfo | null>(null);
  const [detectedTown, setDetectedTown] = useState('');
  const [showWorkTypes, setShowWorkTypes] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasSetup = address && workType;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-start if address + workType provided (from work order)
  useEffect(() => {
    if (initialAddress && initialWorkType && messages.length === 0) {
      sendMessage(`What permits do I need for ${initialWorkType} at this address? Please give me the complete process from application to final inspection.`);
    }
  }, []);

  async function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${API}/permit-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ message: msg, address, workType, history }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.error?.includes('ANTHROPIC_API_KEY')) {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(), role: 'assistant',
            content: '⚠️ **Setup Required**\n\nTo activate PermitAI, add your `ANTHROPIC_API_KEY` to Supabase Edge Function secrets:\n\n1. Go to Supabase Dashboard → Edge Functions → Secrets\n2. Add key: `ANTHROPIC_API_KEY`\n3. Value: your Anthropic API key (get one at console.anthropic.com)\n\nOnce configured, PermitAI will provide real-time permit guidance for any NH address.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMsg]);
        } else {
          toast.error(data.error || 'Failed to get response');
        }
        setLoading(false);
        return;
      }

      if (data.deptInfo) { setDeptInfo(data.deptInfo); setDetectedTown(data.town); }

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      toast.error('Connection error. Check your internet and try again.');
    }
    setLoading(false);
  }

  function copyMessage(content: string, id: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
      toast.success('Copied to clipboard');
    });
  }

  function reset() {
    setMessages([]);
    setDeptInfo(null);
    setDetectedTown('');
    setInput('');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">

      {/* Header */}
      <div className="border-b border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          {onNavigate && (
            <button onClick={() => onNavigate('owners-dashboard')} className="text-gray-500 hover:text-white transition">
              <Home className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">PermitAI</p>
              <p className="text-[10px] text-gray-500">NH Building Permits & Codes</p>
            </div>
          </div>
          {initialWorkOrderId && (
            <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-xs text-orange-300 font-semibold">
              Work Order {initialWorkOrderId}
            </span>
          )}
          <div className="flex-1" />
          {messages.length > 0 && (
            <button onClick={reset} className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-[#1A1A1A] text-xs transition">
              <RotateCcw className="w-3.5 h-3.5" /> New Chat
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-4">

        {/* Address + Work Type Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Project address (e.g. 47 Maple St, Concord, NH)"
              className="w-full pl-9 pr-3 py-2.5 bg-[#111] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500/60 transition"
            />
          </div>
          <div className="relative">
            <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <button
              onClick={() => setShowWorkTypes(s => !s)}
              className="w-full pl-9 pr-8 py-2.5 bg-[#111] border border-[#2A2A2A] rounded-xl text-sm text-left transition focus:border-violet-500/60 outline-none hover:border-[#3A3A3A]"
            >
              <span className={workType ? 'text-white' : 'text-gray-600'}>{workType || 'Select work type…'}</span>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </button>
            <AnimatePresence>
              {showWorkTypes && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                  {WORK_TYPES.map(type => (
                    <button key={type} onClick={() => { setWorkType(type); setShowWorkTypes(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-[#2A2A2A] ${workType === type ? 'text-violet-400 font-semibold' : 'text-gray-300'}`}>
                      {type}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dept info banner (appears when town detected) */}
        <AnimatePresence>
          {deptInfo && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <DeptCard dept={deptInfo} town={detectedTown} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">NH Permit & Code Assistant</h2>
            <p className="text-gray-400 text-sm max-w-md mb-6">
              Enter your project address and work type, then ask any permit question.
              I'll tell you exactly what to file, where to go, and the full process — with real department contacts.
            </p>

            {/* Quick start prompts */}
            {hasSetup && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {QUICK_PROMPTS.map(prompt => (
                  <button key={prompt} onClick={() => sendMessage(prompt)}
                    className="flex items-center gap-2 px-3 py-2.5 bg-[#111] border border-[#2A2A2A] hover:border-violet-500/40 hover:bg-[#1A1A1A] rounded-xl text-xs text-gray-400 hover:text-white text-left transition">
                    <FileText className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {!hasSetup && (
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Fill in the address and work type above to get started
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-4 pb-2">
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                    ? 'bg-violet-600 text-white ml-auto rounded-tr-sm'
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] rounded-tl-sm'
                  }`}>
                    {msg.role === 'user'
                      ? <p className="text-sm">{msg.content}</p>
                      : <RenderMessage content={msg.content} />
                    }
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-1.5 ml-1">
                      <span className="text-[10px] text-gray-600">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => copyMessage(msg.content, msg.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition">
                        {copied === msg.id ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Clipboard className="w-3 h-3" />}
                        {copied === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-violet-400 rounded-full"
                        animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
                    ))}
                    <span className="text-xs text-gray-500 ml-2">Researching permit requirements…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Quick follow-up chips (after first response) */}
        {messages.length > 0 && !loading && (
          <div className="flex gap-2 flex-wrap">
            {['What documents do I need?', 'What inspections are required?', 'How much will permits cost?', 'How long will this take?'].map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="px-3 py-1.5 bg-[#111] border border-[#2A2A2A] hover:border-violet-500/40 text-xs text-gray-400 hover:text-white rounded-full transition">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 items-end bg-[#111] border border-[#2A2A2A] focus-within:border-violet-500/60 rounded-2xl p-2 transition">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={hasSetup ? 'Ask about permits, codes, inspections, fees…' : 'Enter address and work type first…'}
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none resize-none px-2 py-1.5 max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' } as any}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-9 h-9 bg-violet-600 hover:bg-violet-500 disabled:bg-[#2A2A2A] disabled:text-gray-600 text-white rounded-xl flex items-center justify-center transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-600">
          PermitAI provides guidance based on NH RSA, IBC, IRC, and NEC. Always verify requirements with your local building department before filing.
        </p>
      </div>
    </div>
  );
}
