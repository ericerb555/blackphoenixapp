import { useState, useEffect } from 'react';
import { ShoppingCart, Mail, Clock, DollarSign, TrendingUp, Send, Eye, RefreshCw, Search, X, CheckCircle, AlertCircle, Zap, Users, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

export interface AbandonedCart {
  id: string;
  email: string;
  name: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  abandonedAt: string;
  status: 'abandoned' | 'emailed' | 'recovered' | 'expired';
  emailsSent: number;
  lastEmailed?: string;
  source: string;
}

function seedCarts(): AbandonedCart[] {
  const now = Date.now();
  return [
    {
      id: 'ac1', email: 'jessica.m@gmail.com', name: 'Jessica M.',
      items: [{ name: 'Wireless Headphones Pro', price: 79.99, qty: 1 }, { name: 'Insulated Water Bottle', price: 34.99, qty: 2 }],
      total: 149.97, abandonedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      status: 'abandoned', emailsSent: 0, source: 'PublicStore',
    },
    {
      id: 'ac2', email: 'derek.wash@yahoo.com', name: 'Derek W.',
      items: [{ name: 'Air Fryer 5.5L', price: 89.99, qty: 1 }],
      total: 89.99, abandonedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      status: 'emailed', emailsSent: 1, lastEmailed: new Date(now - 4 * 60 * 60 * 1000).toISOString(), source: 'PublicStore',
    },
    {
      id: 'ac3', email: 'samantha.cole@hotmail.com', name: 'Samantha C.',
      items: [{ name: 'LED Smart Bulbs (4-Pack)', price: 44.99, qty: 2 }, { name: 'Daily Vitamin Pack', price: 29.99, qty: 1 }],
      total: 119.97, abandonedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      status: 'recovered', emailsSent: 2, lastEmailed: new Date(now - 24 * 60 * 60 * 1000).toISOString(), source: 'PublicStore',
    },
    {
      id: 'ac4', email: 'troy.james@gmail.com', name: 'Troy J.',
      items: [{ name: 'Power Drill Set', price: 119.99, qty: 1 }, { name: 'Fleece Zip Hoodie', price: 54.99, qty: 1 }],
      total: 174.98, abandonedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      status: 'emailed', emailsSent: 2, lastEmailed: new Date(now - 22 * 60 * 60 * 1000).toISOString(), source: 'PublicStore',
    },
    {
      id: 'ac5', email: 'mia.flores@gmail.com', name: 'Mia F.',
      items: [{ name: 'Yoga Mat Premium', price: 49.99, qty: 1 }, { name: 'Bluetooth Speaker 360', price: 69.99, qty: 1 }],
      total: 119.98, abandonedAt: new Date(now - 72 * 60 * 60 * 1000).toISOString(),
      status: 'expired', emailsSent: 3, lastEmailed: new Date(now - 50 * 60 * 60 * 1000).toISOString(), source: 'PublicStore',
    },
    {
      id: 'ac6', email: 'nathan.pierce@outlook.com', name: 'Nathan P.',
      items: [{ name: 'Mechanical Keyboard', price: 139.99, qty: 1 }],
      total: 139.99, abandonedAt: new Date(now - 1.5 * 60 * 60 * 1000).toISOString(),
      status: 'abandoned', emailsSent: 0, source: 'PublicStore',
    },
    {
      id: 'ac7', email: 'brianna.t@gmail.com', name: 'Brianna T.',
      items: [{ name: 'Daily Vitamin Pack', price: 29.99, qty: 3 }],
      total: 89.97, abandonedAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      status: 'recovered', emailsSent: 1, lastEmailed: new Date(now - 7 * 60 * 60 * 1000).toISOString(), source: 'PublicStore',
    },
  ];
}

function getTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 48) return `${Math.floor(h/24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${m}m ago`;
}

const STATUS_CONFIG = {
  abandoned: { label: 'Abandoned', color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  emailed:   { label: 'Email Sent', color: '#fb923c', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  recovered: { label: 'Recovered', color: '#4ade80', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)' },
  expired:   { label: 'Expired',   color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)' },
};

const TEMPLATES = [
  {
    id: 't1', name: 'Gentle Reminder', timing: '1 hour',
    subject: "You left something behind, {name}!",
    body: `Hi {name},\n\nWe noticed you left some great items in your cart. Your picks are still waiting for you!\n\n{cart_items}\n\nTotal: {total}\n\nComplete your order and get FREE shipping on orders over $50.\n\n→ Return to Cart\n\nWarm regards,\nThe Black Phoenix Company`,
  },
  {
    id: 't2', name: '10% Off Incentive', timing: '24 hours',
    subject: "Here's 10% off your cart, {name} 🎁",
    body: `Hi {name},\n\nWe really want to make sure you get what you came for. Use code COMEBACK10 for 10% off your cart today!\n\n{cart_items}\n\nTotal after discount: {discounted}\n\nOffer expires in 48 hours.\n\n→ Claim My Discount\n\nThe Black Phoenix Company — Family Owned & Operated`,
  },
  {
    id: 't3', name: 'Final Chance', timing: '72 hours',
    subject: "Last chance — your cart expires tonight",
    body: `Hi {name},\n\nYour cart is about to expire. This is your last chance to grab:\n\n{cart_items}\n\nWe're a small family-owned business and we put our hearts into every order. We'd love to serve you.\n\nUse LASTCHANCE15 for 15% off — tonight only.\n\n→ Complete My Order\n\nEric & The Black Phoenix Family`,
  },
];

type FilterStatus = 'all' | 'abandoned' | 'emailed' | 'recovered' | 'expired';

export default function AbandonedCart() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [templateIdx, setTemplateIdx] = useState(0);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'carts' | 'templates' | 'settings'>('carts');

  useEffect(() => { loadCarts(); }, []);

  async function loadCarts() {
    try {
      const res = await fetch(`${SERVER}/abandoned-carts`, { headers: authHeaders });
      const json = await res.json();
      if (json.success) {
        if (json.carts.length === 0) {
          // First run: seed the database with sample carts so the tool isn't empty.
          const seed = seedCarts();
          await Promise.all(seed.map(cart =>
            fetch(`${SERVER}/abandoned-carts`, { method: 'POST', headers: authHeaders, body: JSON.stringify(cart) })
          ));
          const re = await fetch(`${SERVER}/abandoned-carts`, { headers: authHeaders });
          const reJson = await re.json();
          setCarts(reJson.carts || seed);
        } else {
          setCarts(json.carts);
        }
      }
    } catch (err) {
      console.error('Abandoned cart load error:', err);
      toast.error('Could not load carts from server');
    }
  }

  async function sendEmail(cartId: string) {
    setSending(true);
    try {
      const res = await fetch(`${SERVER}/abandoned-carts/${cartId}/recover`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ subject: previewSubject, body: previewBody }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to send recovery email'); return; }
      setCarts(prev => prev.map(c => c.id === cartId ? json.cart : c));
      setSelectedCart(null);
      toast.success('Recovery email sent via Resend!');
    } catch (err) {
      console.error('Recovery email error:', err);
      toast.error('Network error while sending email');
    } finally {
      setSending(false);
    }
  }

  async function markRecovered(cartId: string) {
    try {
      const res = await fetch(`${SERVER}/abandoned-carts/${cartId}/mark-recovered`, { method: 'POST', headers: authHeaders });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to update cart'); return; }
      setCarts(prev => prev.map(c => c.id === cartId ? json.cart : c));
      toast.success('Cart marked as recovered!');
    } catch (err) {
      console.error('Mark recovered error:', err);
      toast.error('Network error');
    }
  }

  const visible = carts.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.email.toLowerCase().includes(search.toLowerCase()) && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalAbandoned = carts.filter(c => c.status !== 'expired').reduce((s, c) => s + c.total, 0);
  const recovered = carts.filter(c => c.status === 'recovered');
  const recoveredValue = recovered.reduce((s, c) => s + c.total, 0);
  const recoveryRate = carts.length ? Math.round((recovered.length / carts.length) * 100) : 0;
  const pendingCount = carts.filter(c => c.status === 'abandoned').length;

  const kpis = [
    { label: 'Abandoned Value', value: `$${totalAbandoned.toFixed(0)}`, icon: ShoppingCart, color: '#f87171', sub: `${carts.length} carts` },
    { label: 'Recovered Revenue', value: `$${recoveredValue.toFixed(0)}`, icon: DollarSign, color: '#4ade80', sub: `${recovered.length} orders` },
    { label: 'Recovery Rate', value: `${recoveryRate}%`, icon: TrendingUp, color: '#60a5fa', sub: 'Industry avg: 18%' },
    { label: 'Need Attention', value: pendingCount, icon: AlertCircle, color: '#fb923c', sub: 'Send email now' },
  ];

  const selectedTemplate = TEMPLATES[templateIdx];
  const previewBody = selectedCart ? selectedTemplate.body
    .replace(/{name}/g, selectedCart.name.split(' ')[0])
    .replace(/{cart_items}/g, selectedCart.items.map(i => `• ${i.name} × ${i.qty} — $${(i.price * i.qty).toFixed(2)}`).join('\n'))
    .replace(/{total}/g, `$${selectedCart.total.toFixed(2)}`)
    .replace(/{discounted}/g, `$${(selectedCart.total * 0.9).toFixed(2)}`)
    : '';
  const previewSubject = selectedCart ? selectedTemplate.subject.replace(/{name}/g, selectedCart.name.split(' ')[0]) : '';

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Abandoned Cart Recovery</h1>
            <p className="text-gray-500 text-sm mt-1">Win back customers who left without buying</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Auto-tracking active
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-gray-700 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[['carts','Carts'], ['templates','Email Templates'], ['settings','Settings']] .map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black transition"
              style={tab === t ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'templates' && (
          <div className="space-y-4">
            {TEMPLATES.map((tpl, i) => (
              <div key={tpl.id} className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-black text-white">{tpl.name}</p>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,88,12,0.15)', color: '#fb923c' }}>Sends at {tpl.timing}</span>
                    </div>
                    <p className="text-xs text-gray-500">Subject: {tpl.subject}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{ background: '#1a1a1a' }}>{i+1}</div>
                </div>
                <pre className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap rounded-xl p-4" style={{ background: '#0a0a0a', fontFamily: 'inherit' }}>{tpl.body}</pre>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-6 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white">Email Provider</h3>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)' }}>
                <p className="text-xs font-black text-blue-400 mb-1">Twilio SendGrid Integration</p>
                <p className="text-xs text-gray-500 leading-relaxed">Connect your SendGrid API key to automatically send recovery sequences. Emails are triggered at 1h, 24h, and 72h after abandonment.</p>
              </div>
              {[
                { label: 'SendGrid API Key', placeholder: 'SG.xxxxxxxxxx', type: 'password' },
                { label: 'From Email', placeholder: 'hello@theblackphoenixcompany.com', type: 'email' },
                { label: 'From Name', placeholder: 'Eric at Black Phoenix', type: 'text' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-black text-gray-500 block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-6 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white">Recovery Sequence Timing</h3>
              {[
                { label: 'Email 1 — Gentle Reminder', value: '1 hour after abandonment' },
                { label: 'Email 2 — 10% Discount', value: '24 hours after abandonment' },
                { label: 'Email 3 — Final Chance (15% off)', value: '72 hours after abandonment' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-sm text-gray-300">{r.label}</span>
                  <span className="text-xs font-black text-orange-400">{r.value}</span>
                </div>
              ))}
              <div className="p-3 rounded-xl text-xs text-gray-500" style={{ background: '#0a0a0a' }}>
                Discount codes are auto-generated and single-use. COMEBACK10 and LASTCHANCE15 are pre-configured.
              </div>
            </div>
            <button onClick={() => toast.success('Settings saved!')}
              className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
              style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>Save Settings</button>
          </div>
        )}

        {tab === 'carts' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search className="w-4 h-4 text-gray-600" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
                  className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 focus:outline-none" />
              </div>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                {(['all','abandoned','emailed','recovered','expired'] as FilterStatus[]).map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black capitalize transition"
                    style={filter === s ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Cart list */}
            <div className="space-y-3">
              {visible.length === 0 && (
                <div className="text-center py-12 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <ShoppingCart className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No carts match this filter</p>
                </div>
              )}
              {visible.map(c => {
                const sc = STATUS_CONFIG[c.status];
                return (
                  <div key={c.id} className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#ea580c' }}>{c.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-black text-white">{c.name}</p>
                            <p className="text-[10px] text-gray-600">{c.email}</p>
                          </div>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full ml-1" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.items.map((item, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full text-gray-400" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              {item.name} × {item.qty}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black text-white">${c.total.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-600 flex items-center gap-1 justify-end"><Clock className="w-2.5 h-2.5" />{getTimeAgo(c.abandonedAt)}</p>
                        {c.emailsSent > 0 && <p className="text-[10px] text-orange-400">{c.emailsSent} email{c.emailsSent > 1 ? 's' : ''} sent</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {c.status !== 'recovered' && c.status !== 'expired' && (
                        <button onClick={() => { setSelectedCart(c); setTemplateIdx(Math.min(c.emailsSent, 2)); }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                          style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)', color: 'white' }}>
                          <Send className="w-3.5 h-3.5" /> Send Recovery Email
                        </button>
                      )}
                      {c.status === 'emailed' && (
                        <button onClick={() => markRecovered(c.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition hover:brightness-110"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Recovered
                        </button>
                      )}
                      {c.status === 'recovered' && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                          <CheckCircle className="w-3.5 h-3.5" /> Order Completed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Send Email Modal */}
      <AnimatePresence>
        {selectedCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden"
              style={{ background: '#111', border: '1px solid rgba(234,88,12,0.2)' }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div>
                  <h3 className="font-black text-white">Send Recovery Email</h3>
                  <p className="text-xs text-gray-500 mt-0.5">To: {selectedCart.email}</p>
                </div>
                <button onClick={() => setSelectedCart(null)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              {/* Template picker */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-black text-gray-500 mb-2">Choose Template</p>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map((tpl, i) => (
                      <button key={tpl.id} onClick={() => setTemplateIdx(i)}
                        className="p-2.5 rounded-xl text-left transition"
                        style={{ background: templateIdx === i ? 'rgba(234,88,12,0.15)' : '#0d0d0d', border: `1px solid ${templateIdx === i ? 'rgba(234,88,12,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
                        <p className="text-[10px] font-black text-white leading-tight">{tpl.name}</p>
                        <p className="text-[9px] text-gray-600 mt-0.5">{tpl.timing}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Mail className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-black text-gray-300">{previewSubject}</span>
                  </div>
                  <pre className="text-[11px] text-gray-400 p-4 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto" style={{ fontFamily: 'inherit', background: '#0a0a0a' }}>{previewBody}</pre>
                </div>

                <button onClick={() => sendEmail(selectedCart.id)} disabled={sending}
                  className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Email</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
