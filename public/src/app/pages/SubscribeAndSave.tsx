import { useState, useEffect } from 'react';
import { RefreshCw, Check, ChevronRight, Package, Zap, Shield, Star, ArrowRight, X, Edit2, Pause, Play, Trash2, Bell, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const STORAGE_KEY = 'bp_subscriptions';

type Frequency = 'monthly' | 'bimonthly' | 'quarterly';
type SubStatus = 'active' | 'paused' | 'cancelled';

interface Subscription {
  id: string;
  productId: string;
  productName: string;
  productImg: string;
  price: number;
  discountPct: number;
  frequency: Frequency;
  qty: number;
  status: SubStatus;
  nextOrder: string;
  startedAt: string;
  totalOrders: number;
  totalSaved: number;
  email: string;
}

const FREQ_CONFIG: Record<Frequency, { label: string; days: number; discount: number }> = {
  monthly:   { label: 'Every Month',    days: 30,  discount: 15 },
  bimonthly: { label: 'Every 2 Months', days: 60,  discount: 10 },
  quarterly: { label: 'Every 3 Months', days: 90,  discount: 5  },
};

const SUBSCRIBABLE = [
  {
    id: 'sub-p9',  name: 'Vitamin C + Zinc Gummies (90ct)',
    desc: 'Daily immune support — never run out',
    price: 18.99, img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
    category: 'Health & Beauty', popular: true, badge: 'Most Popular',
  },
  {
    id: 'sub-p2',  name: 'Stainless Steel Water Bottle (32oz)',
    desc: 'Grab one for every member of the family',
    price: 24.99, img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80',
    category: 'Sports & Outdoors', popular: false, badge: '',
  },
  {
    id: 'sub-p3',  name: 'Smart LED Strip Lights (16ft)',
    desc: 'Upgrade room by room every month',
    price: 19.99, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    category: 'Electronics', popular: false, badge: '',
  },
  {
    id: 'sub-clean', name: 'Deep Clean Bundle',
    desc: 'Household cleaning essentials delivered',
    price: 34.99, img: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80',
    category: 'Home', popular: true, badge: 'Staff Pick',
  },
  {
    id: 'sub-p7',  name: 'Graphic Hoodie — Unisex',
    desc: 'New colorway dropped every season',
    price: 39.99, img: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&q=80',
    category: 'Apparel', popular: false, badge: '',
  },
  {
    id: 'sub-pet', name: 'Pet Essentials Box',
    desc: 'Treats, toys & care items monthly',
    price: 29.99, img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
    category: 'Pet Supplies', popular: true, badge: 'Fan Favorite',
  },
];

function nextOrderDate(freq: Frequency, fromNow = true): string {
  const days = FREQ_CONFIG[freq].days;
  const d = new Date(Date.now() + (fromNow ? days : 0) * 86400000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nextOrderISO(freq: Frequency): string {
  return new Date(Date.now() + FREQ_CONFIG[freq].days * 86400000).toISOString();
}

export default function SubscribeAndSave() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [tab, setTab] = useState<'browse' | 'manage'>('browse');
  const [selectedProduct, setSelectedProduct] = useState<typeof SUBSCRIBABLE[0] | null>(null);
  const [freq, setFreq] = useState<Frequency>('monthly');
  const [qty, setQty] = useState(1);
  const [email, setEmail] = useState(user?.email || '');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setSubs(JSON.parse(raw));
  }, []);

  function persist(updated: Subscription[]) {
    setSubs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async function subscribe() {
    if (!email.includes('@')) { toast.error('Valid email required'); return; }
    if (!selectedProduct) return;
    setConfirming(true);

    const discPct = FREQ_CONFIG[freq].discount;
    const sub: Subscription = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productImg: selectedProduct.img,
      price: selectedProduct.price,
      discountPct: discPct,
      frequency: freq,
      qty,
      status: 'active',
      nextOrder: nextOrderISO(freq),
      startedAt: new Date().toISOString(),
      totalOrders: 1,
      totalSaved: parseFloat((selectedProduct.price * qty * (discPct / 100)).toFixed(2)),
      email,
    };

    try {
      await fetch(`${SERVER}/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          email, name: user?.user_metadata?.full_name || '',
          source: 'subscribe_and_save',
          notes: `Subscribed: ${selectedProduct.name} x${qty} ${freq} — ${discPct}% off`,
          intent: 'converted',
        }),
      });
    } catch (_) {}

    await new Promise(r => setTimeout(r, 900));
    persist([sub, ...subs]);
    setConfirming(false);
    setSelectedProduct(null);
    setTab('manage');
    toast.success(`Subscribed! First order placed. Next ships ${nextOrderDate(freq)} 📦`);
  }

  function togglePause(id: string) {
    const updated = subs.map(s =>
      s.id === id ? { ...s, status: s.status === 'active' ? 'paused' as const : 'active' as const } : s
    );
    persist(updated);
    const s = updated.find(s => s.id === id)!;
    toast.success(s.status === 'active' ? 'Subscription resumed!' : 'Subscription paused.');
  }

  function cancel(id: string) {
    persist(subs.filter(s => s.id !== id));
    toast.success('Subscription cancelled.');
  }

  const activeSubs = subs.filter(s => s.status !== 'cancelled');
  const totalMonthlySavings = activeSubs.reduce((acc, s) => {
    const monthly = s.status === 'active' ? (s.price * s.qty * (s.discountPct / 100)) * (30 / FREQ_CONFIG[s.frequency].days) : 0;
    return acc + monthly;
  }, 0);

  const discountedPrice = selectedProduct
    ? selectedProduct.price * qty * (1 - FREQ_CONFIG[freq].discount / 100)
    : 0;
  const savings = selectedProduct
    ? selectedProduct.price * qty * (FREQ_CONFIG[freq].discount / 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-cyan-400" /> Subscribe &amp; Save
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Set it and forget it — save up to 15% on every order</p>
        </div>
        {activeSubs.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-600">Monthly savings</p>
            <p className="text-lg font-black text-cyan-400">${totalMonthlySavings.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Value props */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Shield, color: '#22c55e', label: 'Skip or cancel', desc: 'Anytime, no fees' },
          { icon: Zap,    color: '#f59e0b', label: 'Up to 15% off', desc: 'Every shipment' },
          { icon: Bell,   color: '#06b6d4', label: 'Order reminders', desc: '3 days before ship' },
        ].map(v => (
          <div key={v.label} className="rounded-2xl p-3 text-center" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
            <v.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: v.color }} />
            <p className="text-xs font-black text-white">{v.label}</p>
            <p className="text-[10px] text-gray-600">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        {([['browse', '🛍 Shop Plans'], ['manage', `📦 My Subscriptions ${activeSubs.length > 0 ? `(${activeSubs.length})` : ''}`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition"
            style={tab === id
              ? { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', color: '#fff' }
              : { color: '#6b7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BROWSE ────────────────────────────────────────────────────────── */}
      {tab === 'browse' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUBSCRIBABLE.map(product => (
            <button key={product.id} onClick={() => setSelectedProduct(product)}
              className="group text-left rounded-2xl overflow-hidden transition-all duration-200"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div className="relative h-36 overflow-hidden">
                <img src={product.img} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                {product.badge && (
                  <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: product.popular ? '#0891b2' : 'rgba(0,0,0,0.7)', color: '#fff' }}>
                    {product.badge}
                  </span>
                )}
                <span className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                  Save 15%
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-black text-white mb-0.5 leading-snug">{product.name}</p>
                <p className="text-[11px] text-gray-500 mb-3">{product.desc}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-black text-cyan-400">${(product.price * 0.85).toFixed(2)}</span>
                    <span className="text-xs text-gray-600 line-through ml-1.5">${product.price}</span>
                  </div>
                  <span className="text-xs font-black px-3 py-1.5 rounded-xl text-white transition"
                    style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
                    Subscribe →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── MANAGE ────────────────────────────────────────────────────────── */}
      {tab === 'manage' && (
        <div className="space-y-4 max-w-lg">
          {activeSubs.length === 0 ? (
            <div className="text-center py-16">
              <RefreshCw className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-500">No active subscriptions</p>
              <p className="text-xs text-gray-700 mt-1 mb-4">Subscribe to your favorites and save up to 15% on every order.</p>
              <button onClick={() => setTab('browse')}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
                Browse Plans →
              </button>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="rounded-2xl p-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0c1a2e, #0a1520)', border: '1px solid rgba(6,182,212,0.25)' }}>
                <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at top right, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-3">Your Subscription Summary</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Active Plans', value: activeSubs.filter(s => s.status === 'active').length },
                    { label: 'Total Orders', value: activeSubs.reduce((a, s) => a + s.totalOrders, 0) },
                    { label: 'Total Saved', value: `$${activeSubs.reduce((a, s) => a + s.totalSaved, 0).toFixed(0)}` },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-xl font-black text-white">{s.value}</p>
                      <p className="text-[10px] text-gray-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {activeSubs.map(sub => {
                const fc = FREQ_CONFIG[sub.frequency];
                const nextDate = new Date(sub.nextOrder).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const discounted = sub.price * sub.qty * (1 - sub.discountPct / 100);
                return (
                  <div key={sub.id} className="rounded-2xl border border-[#1e1e1e] bg-[#111] overflow-hidden">
                    <div className="flex gap-3 p-4">
                      <img src={sub.productImg} alt={sub.productName}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-black text-white leading-snug line-clamp-2">{sub.productName}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                            sub.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {sub.status === 'active' ? '● Active' : '⏸ Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Qty {sub.qty} · {fc.label} · <span className="text-cyan-400 font-bold">{sub.discountPct}% off</span>
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <span className="text-sm font-black text-white">${discounted.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-600 ml-1">/{fc.label.toLowerCase()}</span>
                          </div>
                          <p className="text-[10px] text-gray-600">Next: <strong className="text-gray-400">{nextDate}</strong></p>
                        </div>
                      </div>
                    </div>
                    <div className="flex border-t border-[#1a1a1a]">
                      <button onClick={() => togglePause(sub.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition hover:bg-[#1a1a1a]"
                        style={{ color: sub.status === 'active' ? '#f59e0b' : '#22c55e' }}>
                        {sub.status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
                      </button>
                      <div className="w-px bg-[#1a1a1a]" />
                      <button onClick={() => cancel(sub.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-gray-600 hover:text-red-400 transition hover:bg-[#1a1a1a]">
                        <Trash2 className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── SUBSCRIBE MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-md overflow-hidden">
              {/* Product hero */}
              <div className="relative h-36 overflow-hidden">
                <img src={selectedProduct.img} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #111 0%, rgba(0,0,0,0.4) 100%)' }} />
                <button onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h2 className="font-black text-white text-base leading-snug">{selectedProduct.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedProduct.desc}</p>
                </div>

                {/* Frequency */}
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Delivery Frequency</p>
                  <div className="space-y-2">
                    {(Object.entries(FREQ_CONFIG) as [Frequency, typeof FREQ_CONFIG[Frequency]][]).map(([key, cfg]) => (
                      <button key={key} onClick={() => setFreq(key)}
                        className="w-full flex items-center justify-between p-3 rounded-xl transition"
                        style={freq === key
                          ? { background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.4)' }
                          : { background: '#0a0a0a', border: '1px solid #2a2a2a' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{ borderColor: freq === key ? '#06b6d4' : '#4b5563' }}>
                            {freq === key && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-white">{cfg.label}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                          Save {cfg.discount}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Qty */}
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Quantity Per Order</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white transition hover:bg-[#2a2a2a]"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>−</button>
                    <span className="text-xl font-black text-white w-8 text-center">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(10, q + 1))}
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white transition hover:bg-[#2a2a2a]"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>+</button>
                  </div>
                </div>

                {/* Email */}
                {!user?.email && (
                  <div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Your Email</p>
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                      placeholder="you@email.com"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50" />
                  </div>
                )}

                {/* Price summary */}
                <div className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <div>
                    <p className="text-xs text-gray-500">{FREQ_CONFIG[freq].label}</p>
                    <p className="text-xl font-black text-white">${discountedPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 line-through">${(selectedProduct.price * qty).toFixed(2)}</p>
                    <p className="text-sm font-black text-green-400">Save ${savings.toFixed(2)}</p>
                  </div>
                </div>

                <button onClick={subscribe} disabled={confirming || !email.includes('@')}
                  className="w-full py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)' }}>
                  {confirming
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Setting up…</>
                    : <><Check className="w-4 h-4" /> Start My Subscription</>}
                </button>
                <p className="text-[10px] text-gray-600 text-center">Cancel or pause anytime. No hidden fees.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
