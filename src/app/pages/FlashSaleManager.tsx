import { useState, useEffect, useCallback } from 'react';
import { Zap, Plus, Trash2, Clock, TrendingUp, Eye, ToggleLeft, ToggleRight, Copy, Check, Flame, Tag, Gift, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const STORAGE_KEY = 'bp_flash_sales';
const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const flashAuthHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

async function fetchSalesFromServer(): Promise<FlashSale[] | null> {
  try {
    const res = await fetch(`${SERVER}/flash-sales`, { headers: flashAuthHeaders });
    const json = await res.json().catch(() => null);
    if (json && json.success && Array.isArray(json.sales)) return json.sales;
    // Flash sales are a public storefront feature. If the endpoint is
    // unavailable (e.g. an auth guard responding "Sign in required." before the
    // public route is deployed), fall back to the locally cached list rather
    // than surfacing an error — the local cache is the graceful degrade path.
    console.warn('Flash sales unavailable from server, using local cache:', json?.error || res.status);
    return null;
  } catch (err) {
    console.warn('Flash sales network fallback to local cache:', err);
    return null;
  }
}

async function saveSalesToServer(sales: FlashSale[]) {
  try {
    const res = await fetch(`${SERVER}/flash-sales`, { method: 'POST', headers: flashAuthHeaders, body: JSON.stringify({ sales }) });
    const json = await res.json().catch(() => null);
    if (!json || !json.success) console.warn('Flash sales not persisted to server (kept locally):', json?.error || res.status);
  } catch (err) {
    console.warn('Flash sales network error (kept locally):', err);
  }
}

interface FlashSale {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrder: number;
  endsAt: string; // ISO string
  active: boolean;
  clickCount: number;
  createdAt: string;
  color: 'orange' | 'red' | 'purple' | 'green';
  emoji: string;
}

const COLOR_MAP = {
  orange: { bg: 'linear-gradient(135deg, #ea580c, #f97316)', glow: 'rgba(234,88,12,0.4)', text: '#fff' },
  red:    { bg: 'linear-gradient(135deg, #dc2626, #ef4444)', glow: 'rgba(220,38,38,0.4)',  text: '#fff' },
  purple: { bg: 'linear-gradient(135deg, #7c3aed, #a855f7)', glow: 'rgba(124,58,237,0.4)', text: '#fff' },
  green:  { bg: 'linear-gradient(135deg, #16a34a, #22c55e)', glow: 'rgba(22,163,74,0.4)',  text: '#fff' },
};

const EMOJIS = ['🔥', '⚡', '🎁', '💥', '🛒', '👑', '🚀', '✨'];

const PRESETS = [
  { title: 'Weekend Flash Sale', subtitle: 'This weekend only — shop fast!', code: 'WEEKEND20', discountType: 'percent' as const, discountValue: 20, minOrder: 0, color: 'orange' as const, emoji: '🔥', hours: 48 },
  { title: 'Summer Blowout', subtitle: 'Biggest sale of the season', code: 'SUMMER25', discountType: 'percent' as const, discountValue: 25, minOrder: 50, color: 'red' as const, emoji: '☀️', hours: 72 },
  { title: '$10 Off Today Only', subtitle: 'One day, one deal', code: 'SAVE10', discountType: 'fixed' as const, discountValue: 10, minOrder: 40, color: 'green' as const, emoji: '💚', hours: 24 },
  { title: 'VIP Flash Deal', subtitle: 'Exclusive — share with friends', code: 'VIP30', discountType: 'percent' as const, discountValue: 30, minOrder: 75, color: 'purple' as const, emoji: '👑', hours: 6 },
];

function endDate(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString();
}

function useCountdown(endsAt: string) {
  const calc = useCallback(() => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, expired: false };
  }, [endsAt]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return time;
}

function CountdownDisplay({ endsAt, size = 'sm' }: { endsAt: string; size?: 'sm' | 'lg' }) {
  const { h, m, s, expired } = useCountdown(endsAt);
  if (expired) return <span className="text-gray-500 text-xs">Expired</span>;
  const pad = (n: number) => String(n).padStart(2, '0');
  const cls = size === 'lg'
    ? 'text-3xl font-black tabular-nums'
    : 'text-sm font-black tabular-nums';
  return (
    <div className={`flex items-center gap-1 ${cls}`}>
      <span>{pad(h)}</span><span className="opacity-50">:</span>
      <span>{pad(m)}</span><span className="opacity-50">:</span>
      <span>{pad(s)}</span>
    </div>
  );
}

export function ActiveFlashBanner() {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setSales(JSON.parse(raw));
    // Server is the source of truth; mirror into localStorage for offline/live sync.
    fetchSalesFromServer().then(serverSales => {
      if (serverSales) {
        setSales(serverSales);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSales));
      }
    });
    const handler = () => {
      const raw2 = localStorage.getItem(STORAGE_KEY);
      if (raw2) setSales(JSON.parse(raw2));
    };
    window.addEventListener('bp_flash_update', handler);
    return () => window.removeEventListener('bp_flash_update', handler);
  }, []);

  const active = sales.find(s => s.active && new Date(s.endsAt) > new Date());
  if (!active || dismissed) return null;

  const c = COLOR_MAP[active.color];

  function copy() {
    navigator.clipboard.writeText(active!.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 relative overflow-hidden"
      style={{ background: c.bg, boxShadow: `0 4px 24px ${c.glow}` }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 50%)' }} />
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base flex-shrink-0">{active.emoji}</span>
        <div className="min-w-0">
          <p className="text-xs font-black text-white leading-none truncate">{active.title}</p>
          <p className="text-[10px] text-white/70 leading-none mt-0.5 hidden sm:block">{active.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <CountdownDisplay endsAt={active.endsAt} />
        <button onClick={copy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-xs transition"
          style={{ background: 'rgba(0,0,0,0.25)', color: '#fff' }}>
          {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> {active.code}</>}
        </button>
        <button onClick={() => setDismissed(true)}
          className="text-white/60 hover:text-white transition text-lg leading-none px-1">×</button>
      </div>
    </motion.div>
  );
}

export default function FlashSaleManager() {
  const [sales, setSales] = useState<FlashSale[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  });
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchSalesFromServer().then(serverSales => {
      if (serverSales) {
        setSales(serverSales);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverSales));
        window.dispatchEvent(new Event('bp_flash_update'));
      }
    });
  }, []);
  const [preview, setPreview] = useState<FlashSale | null>(null);
  const [form, setForm] = useState({
    title: '', subtitle: '', code: '', discountType: 'percent' as 'percent' | 'fixed',
    discountValue: 20, minOrder: 0, hours: 24, color: 'orange' as FlashSale['color'], emoji: '🔥',
  });

  function persist(updated: FlashSale[]) {
    setSales(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('bp_flash_update'));
    saveSalesToServer(updated);
  }

  function setF(key: string, val: any) { setForm(p => ({ ...p, [key]: val })); }

  function applyPreset(p: typeof PRESETS[0]) {
    setForm({ title: p.title, subtitle: p.subtitle, code: p.code, discountType: p.discountType, discountValue: p.discountValue, minOrder: p.minOrder, hours: p.hours, color: p.color, emoji: p.emoji });
  }

  function createSale() {
    if (!form.title || !form.code) { toast.error('Title and code are required'); return; }
    const sale: FlashSale = {
      id: crypto.randomUUID(), title: form.title, subtitle: form.subtitle,
      code: form.code.toUpperCase(), discountType: form.discountType, discountValue: form.discountValue,
      minOrder: form.minOrder, endsAt: endDate(form.hours), active: true,
      clickCount: 0, createdAt: new Date().toISOString(), color: form.color, emoji: form.emoji,
    };
    // Deactivate others when creating a new active sale
    const updated = [sale, ...sales.map(s => ({ ...s, active: false }))];
    persist(updated);
    setShowCreate(false);
    toast.success('Flash sale is LIVE on your store! 🔥');
  }

  function toggle(id: string) {
    const updated = sales.map(s =>
      s.id === id ? { ...s, active: !s.active } : { ...s, active: false }
    );
    persist(updated);
  }

  function remove(id: string) {
    persist(sales.filter(s => s.id !== id));
    toast.success('Sale removed');
  }

  const activeSale = sales.find(s => s.active && new Date(s.endsAt) > new Date());

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" /> Flash Sale Manager
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Create timed promo banners that appear live on your store</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm text-white transition hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
          <Plus className="w-4 h-4" /> New Sale
        </button>
      </div>

      {/* Live status */}
      {activeSale ? (
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: COLOR_MAP[activeSale.color].bg }}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)' }} />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{activeSale.emoji}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white animate-pulse">● LIVE ON STORE</span>
              </div>
              <h2 className="text-xl font-black text-white">{activeSale.title}</h2>
              <p className="text-sm text-white/70 mt-0.5">{activeSale.subtitle}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-black bg-black/30 text-white px-3 py-1 rounded-lg font-mono">{activeSale.code}</span>
                <span className="text-xs text-white/70">
                  {activeSale.discountType === 'percent' ? `${activeSale.discountValue}% off` : `$${activeSale.discountValue} off`}
                  {activeSale.minOrder > 0 ? ` · $${activeSale.minOrder} min` : ''}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-white/60 mb-1">Ends in</p>
              <CountdownDisplay endsAt={activeSale.endsAt} size="lg" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 text-center" style={{ background: '#111', border: '2px dashed #2a2a2a' }}>
          <Zap className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-500">No active flash sale</p>
          <p className="text-xs text-gray-700 mt-0.5">Create one and it appears instantly on your store</p>
        </div>
      )}

      {/* Presets */}
      <div>
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Quick Launch Presets</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map(p => (
            <button key={p.code} onClick={() => { applyPreset(p); setShowCreate(true); }}
              className="p-3 rounded-2xl text-left transition hover:brightness-110"
              style={{ background: COLOR_MAP[p.color].bg }}>
              <p className="text-lg mb-1">{p.emoji}</p>
              <p className="text-xs font-black text-white leading-snug">{p.title}</p>
              <p className="text-[10px] text-white/70 mt-1">{p.discountValue}{p.discountType === 'percent' ? '%' : '$'} off · {p.hours}h</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sales list */}
      {sales.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">All Sales</p>
          {sales.map(sale => {
            const expired = new Date(sale.endsAt) <= new Date();
            const c = COLOR_MAP[sale.color];
            return (
              <div key={sale.id} className="rounded-2xl border border-[#1e1e1e] bg-[#111] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: c.bg }}>
                      {sale.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-black text-white truncate">{sale.title}</p>
                        {sale.active && !expired && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 flex-shrink-0">LIVE</span>
                        )}
                        {expired && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 flex-shrink-0">EXPIRED</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono">{sale.code} · {sale.discountType === 'percent' ? `${sale.discountValue}%` : `$${sale.discountValue}`} off</p>
                      <div className="mt-1">
                        {expired
                          ? <span className="text-xs text-gray-600">Ended</span>
                          : <CountdownDisplay endsAt={sale.endsAt} />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setPreview(sale)} className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    {!expired && (
                      <button onClick={() => toggle(sale.id)} className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition">
                        {sale.active
                          ? <ToggleRight className="w-5 h-5 text-green-400" />
                          : <ToggleLeft className="w-5 h-5 text-gray-600" />}
                      </button>
                    )}
                    <button onClick={() => remove(sale.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition">
                      <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 flex items-center justify-between p-5 bg-[#111]" style={{ borderBottom: '1px solid #2a2a2a' }}>
                <h2 className="font-black text-white flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Create Flash Sale</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition text-xl leading-none">×</button>
              </div>
              <div className="p-5 space-y-4">
                {/* Presets */}
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Start from a preset</p>
                  <div className="flex gap-2 flex-wrap">
                    {PRESETS.map(p => (
                      <button key={p.code} onClick={() => applyPreset(p)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition hover:brightness-110"
                        style={{ background: COLOR_MAP[p.color].bg }}>
                        {p.emoji} {p.title.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 block">Sale Title *</label>
                  <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Weekend Flash Sale"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 block">Subtitle</label>
                  <input value={form.subtitle} onChange={e => setF('subtitle', e.target.value)} placeholder="This weekend only — shop fast!"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
                </div>

                {/* Discount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 block">Discount Type</label>
                    <div className="flex">
                      {(['percent', 'fixed'] as const).map(t => (
                        <button key={t} onClick={() => setF('discountType', t)}
                          className="flex-1 py-2.5 text-xs font-black transition first:rounded-l-xl last:rounded-r-xl"
                          style={form.discountType === t
                            ? { background: '#ea580c', color: '#fff' }
                            : { background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#6b7280' }}>
                          {t === 'percent' ? '% Off' : '$ Off'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 block">Amount</label>
                    <input type="number" min="1" value={form.discountValue} onChange={e => setF('discountValue', +e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 block">Promo Code *</label>
                    <input value={form.code} onChange={e => setF('code', e.target.value.toUpperCase())} placeholder="SAVE20"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 block">Min Order ($)</label>
                    <input type="number" min="0" value={form.minOrder} onChange={e => setF('minOrder', +e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Duration</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 6, 24, 48, 72, 96, 168].map(h => (
                      <button key={h} onClick={() => setF('hours', h)}
                        className="py-2 rounded-xl text-xs font-bold transition"
                        style={form.hours === h
                          ? { background: '#ea580c', color: '#fff' }
                          : { background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#6b7280' }}>
                        {h < 24 ? `${h}h` : `${h / 24}d`}
                      </button>
                    ))}
                    <input type="number" min="1" value={form.hours} onChange={e => setF('hours', +e.target.value)} placeholder="hrs"
                      className="py-2 rounded-xl text-xs text-center text-white bg-[#0a0a0a] border border-[#2a2a2a] focus:outline-none focus:border-orange-500/50" />
                  </div>
                </div>

                {/* Color + emoji */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Banner Color</label>
                    <div className="flex gap-2">
                      {(Object.keys(COLOR_MAP) as FlashSale['color'][]).map(c => (
                        <button key={c} onClick={() => setF('color', c)}
                          className="w-8 h-8 rounded-lg transition"
                          style={{ background: COLOR_MAP[c].bg, outline: form.color === c ? '2px solid #fff' : 'none', outlineOffset: 2 }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Emoji</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {EMOJIS.map(e => (
                        <button key={e} onClick={() => setF('emoji', e)}
                          className="w-8 h-8 rounded-lg text-base transition"
                          style={{ background: form.emoji === e ? 'rgba(234,88,12,0.2)' : '#0a0a0a', border: `1px solid ${form.emoji === e ? '#ea580c' : '#2a2a2a'}` }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview strip */}
                <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Banner Preview</p>
                  <div className="rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5"
                      style={{ background: COLOR_MAP[form.color].bg }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{form.emoji || '🔥'}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{form.title || 'Your Sale Title'}</p>
                          <p className="text-[10px] text-white/70 truncate">{form.subtitle || 'Your subtitle here'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-black tabular-nums text-white">00:00:00</span>
                        <span className="text-[10px] font-black bg-black/30 text-white px-2 py-1 rounded-lg font-mono">{form.code || 'CODE'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={createSale}
                  className="w-full py-4 rounded-2xl font-black text-sm text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  🚀 Launch Flash Sale
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
