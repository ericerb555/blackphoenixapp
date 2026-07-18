/**
 * Shared messaging system for all portals.
 * Drop MessagesTab + MessagesBell into any portal to get
 * full messaging with unread badge and push notifications.
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, RefreshCw, X, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';
import { subscribeToPush, isPushSubscribed } from '../../utils/pushNotifications';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
}

// ── Hook: manages unread count + push setup for any portal ───────────────────
export function usePortalMessages(userId: string, userEmail: string) {
  const [unread, setUnread] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!userId && !userEmail) return;
    const fetch = async () => {
      try {
        const token = await getToken();
        const url = new URL(`${SERVER}/messaging/conversations/${userId || 'guest'}`);
        if (userEmail) url.searchParams.set('email', userEmail);
        const res = await window.fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const total = (data.conversations || []).reduce((s: number, c: any) =>
            s + (c.unreadCount?.[userId] || c.unreadCount?.[userEmail?.toLowerCase() || ''] || 0), 0);
          setUnread(total);
        }
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [userId, userEmail]);

  // Browser notification when new message arrives while tab hidden
  useEffect(() => {
    if (unread > prevRef.current && prevRef.current >= 0 && document.hidden) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New message from Black Phoenix', {
          body: 'You have a new message. Tap to view.',
          icon: '/BPB_phoenix_full_color_logo.png',
          tag: 'bp-message',
        });
      }
    }
    prevRef.current = unread;
  }, [unread]);

  return { unread, clearUnread: () => setUnread(0) };
}

// ── Bell Button: enable push + shows unread dot ───────────────────────────────
interface BellProps { userId: string; userEmail: string; userRole?: string; unread: number; }
export function MessagesBell({ userId, userEmail, userRole = 'user', unread }: BellProps) {
  return (
    <button
      onClick={async () => {
        if (isPushSubscribed()) { toast.info('Push notifications are already enabled'); return; }
        const ok = await subscribeToPush(userId, userEmail, userRole);
        if (ok) toast.success('🔔 Notifications enabled!');
        else toast.error('Permission denied or not supported in this browser.');
      }}
      title={isPushSubscribed() ? 'Notifications enabled' : 'Enable push notifications'}
      className={`relative p-2 rounded-lg border transition ${isPushSubscribed() ? 'bg-orange-600/20 border-orange-500/50' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/30'}`}
    >
      <Bell className={`w-5 h-5 ${isPushSubscribed() ? 'text-orange-400' : 'text-gray-400'}`} />
      {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
    </button>
  );
}

// ── Messages Tab badge helper ─────────────────────────────────────────────────
export function MessagesTabBadge({ unread }: { unread: number }) {
  if (unread === 0) return null;
  return (
    <span className="ml-1.5 relative flex">
      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-orange-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 items-center justify-center text-[8px] font-bold text-white">
        {unread > 9 ? '9+' : unread}
      </span>
    </span>
  );
}

// ── Full Messages Tab ─────────────────────────────────────────────────────────
interface TabProps { userId: string; userEmail: string; userName?: string; onTabOpen?: () => void; }
export function MessagesTab({ userId, userEmail, userName, onTabOpen }: TabProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadConversations(); onTabOpen?.(); }, [userId, userEmail]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const url = new URL(`${SERVER}/messaging/conversations/${userId || 'guest'}`);
      if (userEmail) url.searchParams.set('email', userEmail);
      const res = await window.fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setConversations(d.conversations || d || []); }
    } catch {}
    setLoading(false);
  };

  const openConv = async (conv: any) => {
    setSelectedConv(conv);
    const token = await getToken();
    const res = await window.fetch(`${SERVER}/messaging/conversations/${conv.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setMessages(d.messages || d || []); }
    window.fetch(`${SERVER}/messaging/conversations/${conv.id}/read`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId || userEmail }),
    }).catch(() => {});
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await window.fetch(`${SERVER}/messaging/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConv.id, senderId: userId || userEmail, senderName: userName || userEmail?.split('@')[0] || 'User', senderRole: 'customer', content: reply.trim() }),
      });
      if (res.ok) { const d = await res.json(); setMessages(p => [...p, d.message || d]); setReply(''); }
    } catch {}
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (selectedConv) return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex flex-col h-[500px]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2A2A]">
        <button onClick={() => { setSelectedConv(null); loadConversations(); }} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <p className="font-semibold text-white text-sm">{selectedConv.name || 'Black Phoenix Team'}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No messages yet</p>}
        {messages.map((msg: any) => {
          const isMe = msg.senderId === userId || msg.senderId === userEmail || msg.senderRole === 'customer';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-200 rounded-tl-none'}`}>
                {!isMe && <p className="text-xs font-semibold text-orange-400 mb-1">{msg.senderName || 'Black Phoenix'}</p>}
                <p className="leading-relaxed">{msg.content}</p>
                <p className="text-xs opacity-50 mt-1 text-right">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-[#2A2A2A]">
        <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }} placeholder="Type your reply..." className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" />
        <button onClick={sendReply} disabled={!reply.trim() || sending} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 rounded-xl text-white text-sm font-semibold transition">
          {sending ? '...' : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-orange-400" /> Messages</h3>
        <span className="text-sm text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
      </div>
      {conversations.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 font-medium">No messages yet</p>
          <p className="text-sm text-gray-600 mt-1">When Black Phoenix sends you a message it will appear here</p>
        </div>
      ) : (
        conversations.map((conv: any) => {
          const unreadCount = conv.unreadCount?.[userId] || conv.unreadCount?.[userEmail?.toLowerCase() || ''] || 0;
          return (
            <button key={conv.id} onClick={() => openConv(conv)} className="w-full text-left bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 rounded-xl p-4 transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">BP</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{conv.name || 'Black Phoenix Team'}</p>
                      {unreadCount > 0 && <span className="w-5 h-5 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0">{unreadCount}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ''}</span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
