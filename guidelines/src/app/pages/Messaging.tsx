import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Send, Search, Plus, User, Clock, Check, CheckCheck,
  Phone, Mail, X, MoreVertical, RefreshCw, ChevronLeft, Paperclip,
  Building2, Sparkles, Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

const ADMIN_ID = 'blackphoenix-admin';
const ADMIN_NAME = 'Black Phoenix Team';

interface Participant { userId: string; userName: string; userRole: string; userEmail?: string; }
interface Conversation {
  id: string; name: string; type: string;
  participants: Participant[];
  lastMessage: string; lastMessageAt: string;
  unreadCount?: Record<string, number>;
  metadata?: { customerEmail?: string; workRequestId?: string; };
}
interface Message {
  id: string; senderId: string; senderName: string; senderRole: string;
  content: string; timestamp: string; read?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getCustomerParticipant(conv: Conversation) {
  return conv.participants?.find(p => p.userRole !== 'admin') ?? null;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── New Conversation Modal ───────────────────────────────────────────────────

function NewConvModal({ onClose, onCreate }: { onClose: () => void; onCreate: (conv: Conversation) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function create() {
    if (!name.trim() || !email.trim()) { toast.error('Name and email required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/messaging/conversations/direct`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          user1Id: ADMIN_ID, user1Name: ADMIN_NAME,
          user2Id: email.trim().toLowerCase(), user2Name: name.trim(),
          name: `${name.trim()} & Black Phoenix`,
          metadata: { customerEmail: email.trim().toLowerCase() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreate(data.conversation);
      onClose();
      toast.success(`Conversation started with ${name}`);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold">New Conversation</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Customer Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jessica Martinez"
              className="w-full px-3 py-2.5 bg-[#111] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/60 transition" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Customer Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jessica@example.com" type="email"
              onKeyDown={e => e.key === 'Enter' && create()}
              className="w-full px-3 py-2.5 bg-[#111] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/60 transition" />
          </div>
        </div>
        <button onClick={create} disabled={loading}
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-[#2A2A2A] disabled:text-gray-600 text-white text-sm font-semibold rounded-xl transition">
          {loading ? 'Starting…' : 'Start Conversation'}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props { onNavigate?: (page: string) => void; }

export default function Messaging({ onNavigate }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load all admin conversations
  async function loadConversations() {
    try {
      const res = await fetch(`${API}/messaging/conversations/${ADMIN_ID}`, { headers: HEADERS });
      const data = await res.json();
      const sorted = (data.conversations || []).sort((a: Conversation, b: Conversation) =>
        new Date(b.lastMessageAt || b.id).getTime() - new Date(a.lastMessageAt || a.id).getTime()
      );
      setConversations(sorted);
    } catch { /* silent */ }
    setLoading(false);
  }

  // Load messages for selected conversation
  async function loadMessages(convId: string) {
    try {
      const res = await fetch(`${API}/messaging/conversations/${convId}/messages`, { headers: HEADERS });
      const data = await res.json();
      setMessages(data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { /* silent */ }
  }

  useEffect(() => { loadConversations(); }, []);

  // Poll for new messages every 8s when a conversation is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedConv) {
      loadMessages(selectedConv.id);
      pollRef.current = setInterval(() => {
        loadMessages(selectedConv.id);
        loadConversations();
      }, 8000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConv?.id]);

  async function sendMessage() {
    if (!input.trim() || !selectedConv || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic
    const optimistic: Message = {
      id: `tmp_${Date.now()}`, senderId: ADMIN_ID, senderName: ADMIN_NAME,
      senderRole: 'admin', content: text, timestamp: new Date().toISOString(), read: false,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

    try {
      await fetch(`${API}/messaging/messages`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          conversationId: selectedConv.id,
          senderId: ADMIN_ID, senderName: ADMIN_NAME, senderRole: 'admin',
          content: text,
        }),
      });
      await loadMessages(selectedConv.id);
      await loadConversations();
    } catch { toast.error('Failed to send message'); }
    setSending(false);
  }

  function selectConv(conv: Conversation) {
    setSelectedConv(conv);
    setMessages([]);
    setMobileView('chat');
  }

  const filtered = conversations.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.metadata?.customerEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => {
    const u = c.unreadCount;
    if (!u) return sum;
    return sum + Object.values(u).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0);
  }, 0);

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-[#0A0A0A] flex">

      {/* Sidebar — conversation list */}
      <div className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-[#1E1E1E] flex-shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-[#1E1E1E]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-400" />
              <h1 className="text-white font-bold">Messages</h1>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full">{totalUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={loadConversations} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-[#1A1A1A] transition">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNew(true)} className="p-1.5 text-orange-400 hover:text-orange-300 rounded-lg hover:bg-[#1A1A1A] transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 bg-[#111] border border-[#2A2A2A] rounded-xl text-xs text-white placeholder-gray-600 outline-none focus:border-orange-500/40 transition" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading conversations…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <button onClick={() => setShowNew(true)}
                className="mt-3 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 text-xs rounded-xl transition">
                Start one
              </button>
            </div>
          ) : filtered.map(conv => {
            const customer = getCustomerParticipant(conv);
            const unread = conv.unreadCount ? Object.values(conv.unreadCount).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : 0;
            const isSelected = selectedConv?.id === conv.id;
            return (
              <button key={conv.id} onClick={() => selectConv(conv)}
                className={`w-full text-left px-4 py-3 border-b border-[#111] hover:bg-[#141414] transition-colors ${isSelected ? 'bg-[#1A1A1A] border-l-2 border-l-orange-500' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600/40 to-orange-800/40 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0">
                    {getInitials(customer?.userName || conv.name || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${unread > 0 ? 'text-white font-semibold' : 'text-gray-300'}`}>
                        {customer?.userName || conv.name}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {unread > 0 && (
                          <span className="w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>
                        )}
                        <span className="text-[10px] text-gray-600">{timeAgo(conv.lastMessageAt || conv.id)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.metadata?.customerEmail || customer?.userEmail || ''}
                    </p>
                    {conv.lastMessage && (
                      <p className={`text-xs mt-0.5 truncate ${unread > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                        {conv.lastMessage}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat pane */}
      <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Direct Messaging</h2>
            <p className="text-gray-400 text-sm max-w-xs mb-5">
              Select a conversation or start a new one to message a customer directly.
            </p>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition">
              <Plus className="w-4 h-4" /> New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#0D0D0D] flex items-center gap-3">
              <button onClick={() => setMobileView('list')} className="md:hidden text-gray-500 hover:text-white transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              {(() => {
                const c = getCustomerParticipant(selectedConv);
                return (
                  <>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600/40 to-orange-800/40 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0">
                      {getInitials(c?.userName || selectedConv.name || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c?.userName || selectedConv.name}</p>
                      <p className="text-xs text-gray-500 truncate">{selectedConv.metadata?.customerEmail || c?.userEmail || ''}</p>
                    </div>
                  </>
                );
              })()}
              <div className="flex items-center gap-1">
                {selectedConv.metadata?.customerEmail && (
                  <a href={`mailto:${selectedConv.metadata.customerEmail}`}
                    className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-[#1A1A1A] transition">
                    <Mail className="w-4 h-4" />
                  </a>
                )}
                <button onClick={() => { loadMessages(selectedConv.id); loadConversations(); }}
                  className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-[#1A1A1A] transition">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Circle className="w-8 h-8 text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm">No messages yet. Say hello!</p>
                </div>
              ) : messages.map((msg, i) => {
                const isAdmin = msg.senderId === ADMIN_ID || msg.senderRole === 'admin';
                const prevMsg = messages[i - 1];
                const showSender = !prevMsg || prevMsg.senderId !== msg.senderId;
                return (
                  <div key={msg.id} className={`flex gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    {!isAdmin && showSender && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-600/40 to-orange-800/40 border border-orange-500/20 flex items-center justify-center text-orange-400 text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {getInitials(msg.senderName)}
                      </div>
                    )}
                    {!isAdmin && !showSender && <div className="w-7 flex-shrink-0" />}
                    <div className={`max-w-[75%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                      {showSender && (
                        <p className={`text-[10px] text-gray-500 mb-1 ${isAdmin ? 'text-right' : ''}`}>{msg.senderName}</p>
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isAdmin
                        ? 'bg-orange-600 text-white rounded-tr-sm'
                        : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-200 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">{timeAgo(msg.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1E1E1E]">
              <div className="flex gap-2 items-end bg-[#111] border border-[#2A2A2A] focus-within:border-orange-500/50 rounded-2xl p-2 transition">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 outline-none resize-none px-2 py-1.5 max-h-28 overflow-y-auto"
                  style={{ fieldSizing: 'content' } as any}
                />
                <button onClick={sendMessage} disabled={sending || !input.trim()}
                  className="flex-shrink-0 w-9 h-9 bg-orange-600 hover:bg-orange-500 disabled:bg-[#2A2A2A] disabled:text-gray-600 text-white rounded-xl flex items-center justify-center transition">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-600 text-center mt-2">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>

      {showNew && <NewConvModal onClose={() => setShowNew(false)} onCreate={conv => { setConversations(prev => [conv, ...prev]); selectConv(conv); }} />}
    </div>
  );
}
