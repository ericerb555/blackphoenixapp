/**
 * PipelineMessagePanel — Admin sends messages to a customer directly
 * from the pipeline while working on their quote.
 * Messages appear instantly in the customer's dashboard Messages tab.
 */

import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

interface Props {
  workRequestId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string; // for SMS notifications
  adminName?: string;
  onClose?: () => void;
}

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

export default function PipelineMessagePanel({ workRequestId, customerName, customerEmail, customerPhone, adminName = 'Black Phoenix Team', onClose }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [convId, setConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { initConversation(); }, [workRequestId, customerEmail]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || publicAnonKey;
  };

  const initConversation = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const { data: { user } } = await supabase.auth.getUser(token === publicAnonKey ? undefined : token);
      const adminId = user?.id || 'admin';

      // Find or create a direct conversation with this customer for this work request
      const res = await fetch(`${SERVER}/messaging/conversations/direct`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1Id: adminId,
          user1Name: adminName,
          user2Id: customerEmail,
          user2Name: customerName,
          name: `Work Request: ${workRequestId.substring(0, 12)}`,
          metadata: { workRequestId, customerEmail, customerPhone: customerPhone || '' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const conversation = data.conversation || data;
        setConvId(conversation.id);
        await loadMessages(conversation.id, token);
      }
    } catch (err) {
      console.warn('[PipelineMsg] Failed to init conversation:', err);
    }
    setLoading(false);
  };

  const loadMessages = async (cId: string, token?: string) => {
    const t = token || await getToken();
    const res = await fetch(`${SERVER}/messaging/conversations/${cId}/messages`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || data || []);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !convId) return;
    setSending(true);
    try {
      const token = await getToken();
      const { data: { user } } = await supabase.auth.getUser(token === publicAnonKey ? undefined : token);

      const res = await fetch(`${SERVER}/messaging/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          senderId: user?.id || 'admin',
          senderName: adminName,
          senderRole: 'admin',
          content: text.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message || data]);
        setText('');
        toast.success('Message sent to customer!');
      } else {
        toast.error('Failed to send message');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setSending(false);
  };

  const quickMessages = [
    `Hi ${customerName}! I'm reviewing your work request and have a quick question.`,
    'Could you clarify the scope of work you need done?',
    'Do you have a preferred start date for this project?',
    'Can you share more photos of the area that needs work?',
    'Your quote is almost ready — any specific materials preferences?',
  ];

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-xs font-bold text-white">
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{customerName}</p>
            <p className="text-xs text-gray-500">{customerEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => convId && loadMessages(convId)} className="p-1.5 hover:bg-white/10 rounded-lg transition">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-orange-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-600 mt-1">Send the customer a message about their request</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isAdmin = msg.senderRole === 'admin' || msg.senderName === adminName;
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isAdmin
                    ? 'bg-orange-600 text-white rounded-tr-none'
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-200 rounded-tl-none'
                }`}>
                  {!isAdmin && <p className="text-xs font-semibold text-orange-400 mb-1">{msg.senderName || customerName}</p>}
                  <p>{msg.content}</p>
                  <p className="text-xs opacity-50 mt-1 text-right">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick message chips */}
      <div className="px-3 py-2 border-t border-[#1A1A1A] flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
        {quickMessages.map((q, i) => (
          <button key={i} onClick={() => setText(q)} className="flex-shrink-0 text-xs px-2.5 py-1.5 bg-white/5 hover:bg-orange-500/20 border border-[#2A2A2A] hover:border-orange-500/40 text-gray-400 hover:text-orange-300 rounded-full transition whitespace-nowrap">
            {q.length > 40 ? q.substring(0, 38) + '…' : q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-[#2A2A2A] flex-shrink-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={`Message ${customerName}...`}
          disabled={loading || !convId}
          className="flex-1 px-3 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending || loading || !convId}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white transition"
        >
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
