import { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, Zap, Plus, X, Phone, Check, Clock, TrendingUp, ChevronRight, Sparkles, RefreshCw, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  optedIn: boolean;
  lastTexted?: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  sentTo: number;
  sentAt: string;
  status: 'sent' | 'draft' | 'scheduled';
  replies: number;
  clicks: number;
}

const TEMPLATES = [
  { id: 'promo', label: '🔥 Flash Promo', body: "Hey {name}! 🔥 Don't miss our limited-time offer — {discount}% OFF sitewide. Shop now: theblackphoenixcompany.com/public-store" },
  { id: 'local', label: '📍 Local Offer', body: "Hi {name}, your neighbor exclusive: {discount}% off + free shipping with code BPLOCAL15. theblackphoenixcompany.com/local" },
  { id: 'cart', label: '🛒 Cart Recovery', body: "Hey {name} — you left something behind! Your cart is waiting 🛒 Grab it before it sells out: theblackphoenixcompany.com/public-store" },
  { id: 'review', label: '⭐ Review Ask', body: "Hi {name}! How was your Black Phoenix order? We'd love a quick review — takes 60 sec: g.page/r/your-review-link" },
  { id: 'vip', label: '👑 VIP Exclusive', body: "Exclusive for our VIPs only 👑 — early access to new drops + 25% OFF. You earned it, {name}! theblackphoenixcompany.com" },
  { id: 'custom', label: '✏️ Custom', body: '' },
];

const SMS_CHAR_LIMIT = 160;

type Tab = 'dashboard' | 'compose' | 'contacts' | 'campaigns';

export default function SMSMarketing() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cRes, campRes] = await Promise.all([
        fetch(`${SERVER}/sms/contacts`, { headers: authHeaders }),
        fetch(`${SERVER}/sms/campaigns`, { headers: authHeaders }),
      ]);
      const cJson = await cRes.json();
      const campJson = await campRes.json();
      if (cJson.success) {
        setContacts(cJson.contacts.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone, tags: c.tags || [], optedIn: c.optedIn, lastTexted: c.lastTexted,
        })));
      }
      if (campJson.success) {
        setCampaigns(campJson.campaigns.map((c: any) => ({
          id: c.id, name: c.name, message: c.message,
          sentTo: c.sentTo || 0, sentAt: c.sentAt ? new Date(c.sentAt).toLocaleDateString() : '',
          status: c.status === 'failed' ? 'draft' : c.status, replies: c.replies || 0, clicks: c.clicks || 0,
        })));
      }
    } catch (err) {
      console.error('SMS Marketing load error:', err);
      toast.error('Could not load SMS data from server');
    } finally {
      setLoading(false);
    }
  }
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [sendTo, setSendTo] = useState<'all' | 'vip' | 'local' | 'new'>('all');
  const [sending, setSending] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', tags: '' });
  const [filterTag, setFilterTag] = useState<string>('all');

  const optedInContacts = contacts.filter(c => c.optedIn);
  const audienceMap = {
    all: optedInContacts,
    vip: optedInContacts.filter(c => c.tags.includes('vip')),
    local: optedInContacts.filter(c => c.tags.includes('local')),
    new: optedInContacts.filter(c => c.tags.includes('new')),
  };
  const audience = audienceMap[sendTo];

  const totalSent = campaigns.filter(c => c.status === 'sent').reduce((s, c) => s + c.sentTo, 0);
  const totalClicks = campaigns.filter(c => c.status === 'sent').reduce((s, c) => s + c.clicks, 0);
  const avgCTR = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0';

  function applyTemplate(id: string) {
    const t = TEMPLATES.find(t => t.id === id);
    if (!t) return;
    setSelectedTemplate(id);
    setMessageBody(t.body.replace('{discount}', '20'));
  }

  async function sendCampaign() {
    if (!messageBody.trim()) { toast.error('Write a message first'); return; }
    if (audience.length === 0) { toast.error('No opted-in contacts in this audience'); return; }
    setSending(true);
    try {
      const res = await fetch(`${SERVER}/sms/send`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ name: campaignName || 'Untitled Campaign', message: messageBody, audience: sendTo }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to send campaign');
        return;
      }
      toast.success(`Campaign sent to ${json.sent} contact${json.sent === 1 ? '' : 's'}${json.errors?.length ? ` (${json.errors.length} failed)` : ''}!`);
      setMessageBody('');
      setCampaignName('');
      setSelectedTemplate('');
      await loadData();
      setTab('campaigns');
    } catch (err) {
      console.error('SMS send error:', err);
      toast.error('Network error while sending campaign');
    } finally {
      setSending(false);
    }
  }

  async function addContact() {
    if (!newContact.phone.trim()) { toast.error('Phone number required'); return; }
    const tags = newContact.tags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const res = await fetch(`${SERVER}/sms/contacts`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ name: newContact.name || 'Unknown', phone: newContact.phone, tags, optedIn: true }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to add contact'); return; }
      setNewContact({ name: '', phone: '', tags: '' });
      setShowAddContact(false);
      await loadData();
      toast.success('Contact added!');
    } catch (err) {
      console.error('Add contact error:', err);
      toast.error('Network error while adding contact');
    }
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Overview', icon: TrendingUp },
    { id: 'compose', label: 'Send Text', icon: Send },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'campaigns', label: 'History', icon: Clock },
  ];

  const filteredContacts = filterTag === 'all' ? contacts : contacts.filter(c => c.tags.includes(filterTag));

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-400" />
            SMS Marketing
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Text your customers directly — 98% open rate</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
            {optedInContacts.length} Opted In
          </span>
        </div>
      </div>

      {/* Notice banner */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-blue-300">Live — sending real SMS via Twilio</p>
          <p className="text-xs text-gray-500 mt-0.5">Contacts and campaigns are saved to your database and texts are delivered through your connected Twilio number. Standard carrier rates apply per message.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition"
            style={tab === t.id
              ? { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff' }
              : { color: '#6b7280' }}>
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Sent', value: totalSent, icon: Send, color: '#22c55e' },
              { label: 'Avg CTR', value: `${avgCTR}%`, icon: TrendingUp, color: '#3b82f6' },
              { label: 'Opted In', value: optedInContacts.length, icon: Users, color: '#f59e0b' },
              { label: 'Campaigns', value: campaigns.filter(c => c.status === 'sent').length, icon: Zap, color: '#a855f7' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: stat.color + '18' }}>
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Recent campaigns */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
            <h3 className="font-black text-white text-sm">Recent Campaigns</h3>
            {campaigns.filter(c => c.status === 'sent').map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#0d0d0d' }}>
                <div>
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="text-xs text-gray-600">{c.sentAt} · {c.sentTo} texts</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-green-400">{c.clicks} clicks</p>
                  <p className="text-[10px] text-gray-600">{c.replies} replies</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick action */}
          <button onClick={() => setTab('compose')}
            className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <Send className="w-4 h-4" /> Send a Text Blast →
          </button>
        </div>
      )}

      {/* ── COMPOSE ───────────────────────────────────────────────────────── */}
      {tab === 'compose' && (
        <div className="space-y-5 max-w-2xl">
          {/* Campaign name */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-4">
            <h3 className="font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-400" /> Compose Message
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Campaign Name</label>
              <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. July Flash Sale"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50" />
            </div>

            {/* Templates */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Quick Templates</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t.id)}
                    className="p-2.5 rounded-xl text-xs font-bold text-left transition"
                    style={selectedTemplate === t.id
                      ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac' }
                      : { background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#9ca3af' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message</label>
                <span className={`text-[10px] font-bold ${messageBody.length > SMS_CHAR_LIMIT ? 'text-red-400' : 'text-gray-600'}`}>
                  {messageBody.length}/{SMS_CHAR_LIMIT}
                </span>
              </div>
              <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)}
                placeholder="Type your message… Use {name} to personalize"
                rows={5}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-green-500/50" />
              <p className="text-[10px] text-gray-600 mt-1">Tip: <strong className="text-gray-500">{"{name}"}</strong> is replaced with each contact's first name automatically.</p>
            </div>
          </div>

          {/* Audience picker */}
          <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5 space-y-3">
            <h3 className="font-black text-white text-sm">Send To</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(audienceMap) as [string, Contact[]][]).map(([key, list]) => (
                <button key={key} onClick={() => setSendTo(key as any)}
                  className="p-3 rounded-xl text-left transition"
                  style={sendTo === key
                    ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)' }
                    : { background: '#0a0a0a', border: '1px solid #2a2a2a' }}>
                  <p className="text-xs font-black text-white capitalize">{key === 'all' ? 'All Opted-In' : key.toUpperCase() + ' Contacts'}</p>
                  <p className="text-[11px] text-gray-500">{list.length} contacts</p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {messageBody && (
            <div className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Preview</p>
              <div className="flex justify-end">
                <div className="max-w-xs p-3 rounded-2xl rounded-br-sm text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                  {messageBody.replace('{name}', audience[0]?.name?.split(' ')[0] || 'Marcus')}
                </div>
              </div>
              <p className="text-[10px] text-gray-600 text-right mt-2">From: Black Phoenix Company</p>
            </div>
          )}

          <button onClick={sendCampaign} disabled={sending || !messageBody.trim()}
            className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition hover:brightness-110 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            {sending
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send to {audience.length} Contacts</>}
          </button>
        </div>
      )}

      {/* ── CONTACTS ──────────────────────────────────────────────────────── */}
      {tab === 'contacts' && (
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {['all', 'vip', 'local', 'new'].map(tag => (
                <button key={tag} onClick={() => setFilterTag(tag)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition"
                  style={filterTag === tag
                    ? { background: '#22c55e', color: '#fff' }
                    : { background: '#111', border: '1px solid #2a2a2a', color: '#6b7280' }}>
                  {tag}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAddContact(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white transition"
              style={{ background: '#16a34a' }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {filteredContacts.map(c => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl"
                style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                    style={{ background: c.optedIn ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)' }}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-xs text-gray-600">{c.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-black px-2 py-0.5 rounded-full capitalize"
                      style={{ background: tag === 'vip' ? 'rgba(245,158,11,0.15)' : tag === 'local' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                               color: tag === 'vip' ? '#fbbf24' : tag === 'local' ? '#a78bfa' : '#60a5fa' }}>
                      {tag}
                    </span>
                  ))}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${c.optedIn ? 'bg-green-500/15 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {c.optedIn ? 'Opted In' : 'Opted Out'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CAMPAIGN HISTORY ─────────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <div className="space-y-3 max-w-2xl">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-white text-sm">{c.name}</h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      c.status === 'sent' ? 'bg-green-500/15 text-green-400' :
                      c.status === 'scheduled' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-gray-800 text-gray-500'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                  {c.sentAt && <p className="text-xs text-gray-600">{c.sentAt} · {c.sentTo} texts sent</p>}
                </div>
              </div>
              <p className="text-xs text-gray-500 italic mb-4 line-clamp-2">"{c.message}"</p>
              {c.status === 'sent' && (
                <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid #1e1e1e' }}>
                  {[
                    { label: 'Sent', value: c.sentTo, color: '#22c55e' },
                    { label: 'Clicks', value: c.clicks, color: '#3b82f6' },
                    { label: 'Replies', value: c.replies, color: '#f59e0b' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <p className="text-base font-black" style={{ color: stat.color }}>{stat.value}</p>
                      <p className="text-[10px] text-gray-600">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {c.status === 'draft' && (
                <button onClick={() => { setTab('compose'); setCampaignName(c.name); setMessageBody(c.message); }}
                  className="text-xs font-black px-4 py-2 rounded-xl text-white transition hover:brightness-110"
                  style={{ background: '#16a34a' }}>
                  Edit &amp; Send →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ADD CONTACT MODAL ─────────────────────────────────────────────── */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white">Add Contact</h3>
              <button onClick={() => setShowAddContact(false)} className="p-2 rounded-xl hover:bg-[#2a2a2a] transition">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            {[
              { key: 'name', label: 'Full Name', placeholder: 'John Smith', type: 'text' },
              { key: 'phone', label: 'Phone Number *', placeholder: '+1 (555) 000-0000', type: 'tel' },
              { key: 'tags', label: 'Tags (comma separated)', placeholder: 'vip, local, new', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(newContact as any)[f.key]}
                  onChange={e => setNewContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50" />
              </div>
            ))}
            <p className="text-xs text-gray-600">By adding this contact you confirm they have opted in to receive SMS from Black Phoenix Company.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddContact(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-400 transition hover:bg-[#1a1a1a]">Cancel</button>
              <button onClick={addContact}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white transition hover:brightness-110"
                style={{ background: '#16a34a' }}>Add Contact</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
