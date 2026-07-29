/**
 * ShopperAccountPortal — "My Account" for e-commerce shoppers.
 * One unified portal with three tabs:
 *   • Orders   — buying history (GET /store/orders), each order can start a return
 *   • Returns  — RMA requests the shopper has opened (GET/POST /store/returns)
 *   • Rewards  — Phoenix Rewards points summary (loyalty), links to full program
 * Identity is the signed-in Supabase user's email; the server scopes every
 * record to that email so shoppers only ever see their own history.
 */
import { useState, useEffect, useCallback } from 'react';
import { Package, RotateCcw, Star, ChevronDown, ChevronRight, ShoppingBag, Truck, CheckCircle, Clock, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';
import { getLoyaltyAccount, loadLoyaltyFromServer, type LoyaltyAccount } from './LoyaltyProgram';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface OrderItem { id: string; name: string; price: number; qty: number; image?: string; }
interface StoreOrder {
  id: string;
  customer_email: string;
  customer_name: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  amount_total: number;
  fulfillment_status: 'pending' | 'forwarded_to_doba' | 'shipped' | 'delivered';
  tracking_number?: string;
  created_at: string;
}
interface ReturnItem { id: string; name: string; price: number; qty: number; }
interface StoreReturn {
  id: string;
  orderId: string;
  items: ReturnItem[];
  reason: string;
  comment?: string;
  refund_estimate: number;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'closed';
  admin_note?: string;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  defective: 'Arrived damaged / defective',
  wrong_item: 'Received the wrong item',
  not_as_described: "Doesn't match the description",
  no_longer_needed: 'No longer needed',
  arrived_late: 'Arrived too late',
  other: 'Other',
};

const FULFILLMENT_UI: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Processing', color: '#fbbf24', icon: Clock },
  forwarded_to_doba: { label: 'Preparing to ship', color: '#60a5fa', icon: Package },
  shipped: { label: 'Shipped', color: '#818cf8', icon: Truck },
  delivered: { label: 'Delivered', color: '#34d399', icon: CheckCircle },
};

const RETURN_UI: Record<string, { label: string; color: string }> = {
  requested: { label: 'Requested', color: '#fbbf24' },
  approved: { label: 'Approved', color: '#60a5fa' },
  received: { label: 'Item received', color: '#818cf8' },
  refunded: { label: 'Refunded', color: '#34d399' },
  rejected: { label: 'Declined', color: '#f87171' },
  closed: { label: 'Closed', color: '#9ca3af' },
};

const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

async function authFetch(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to view your account.');
  const res = await fetch(`${SERVER}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || 'Request failed.');
  return json;
}

export default function ShopperAccountPortal() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'orders' | 'returns' | 'rewards'>('orders');
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [returns, setReturns] = useState<StoreReturn[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [returnFor, setReturnFor] = useState<StoreOrder | null>(null);

  const loadAll = useCallback(async () => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    try {
      const [o, r] = await Promise.all([
        authFetch('/store/orders').catch(err => { console.error('Load orders failed:', err); return { orders: [] }; }),
        authFetch('/store/returns').catch(err => { console.error('Load returns failed:', err); return { returns: [] }; }),
      ]);
      setOrders(Array.isArray(o.orders) ? o.orders : []);
      setReturns(Array.isArray(r.returns) ? r.returns : []);
    } finally {
      setLoading(false);
    }
    // Loyalty: show cache instantly, reconcile with server.
    const cached = getLoyaltyAccount(user.email);
    if (cached) setLoyalty(cached);
    loadLoyaltyFromServer(user.email).then(acc => { if (acc) setLoyalty(acc); }).catch(() => {});
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Order ids that already have an open return, so we hide the button.
  const openReturnOrderIds = new Set(returns.filter(r => !['rejected', 'refunded', 'closed'].includes(r.status)).map(r => r.orderId));

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6">
        <div className="rounded-3xl p-8 text-center max-w-md w-full" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black mb-2">Your Account</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to see your orders, start a return, and check your Phoenix Rewards points.</p>
          <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white" style={{ background: '#ea580c' }}>Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src={companyLogo} alt="Black Phoenix" style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(234,88,12,0.5))' }} />
          <div>
            <h1 className="text-2xl font-black">My Account</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
          <a href="/store" className="ml-auto text-sm font-semibold text-gray-400 hover:text-white transition flex items-center gap-1">
            <ShoppingBag className="w-4 h-4" /> <span className="hidden sm:inline">Continue shopping</span>
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { id: 'orders', label: 'Orders', icon: Package, count: orders.length },
            { id: 'returns', label: 'Returns', icon: RotateCcw, count: returns.length },
            { id: 'rewards', label: 'Rewards', icon: Star, count: loyalty?.points },
          ] as const).map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition"
                style={{ background: active ? '#ea580c' : 'transparent', color: active ? '#fff' : '#9ca3af' }}>
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {typeof t.count === 'number' && t.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)' }}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading your account…</div>
        ) : (
          <>
            {/* ORDERS */}
            {tab === 'orders' && (
              <div className="space-y-3">
                {orders.length === 0 && (
                  <EmptyState icon={Package} title="No orders yet" body="When you place an order it'll show up here with tracking and receipts." cta="Start shopping" href="/store" />
                )}
                {orders.map(order => {
                  const ui = FULFILLMENT_UI[order.fulfillment_status] || FULFILLMENT_UI.pending;
                  const StatusIcon = ui.icon;
                  const isOpen = expanded === order.id;
                  const hasOpenReturn = openReturnOrderIds.has(order.id);
                  return (
                    <div key={order.id} className="rounded-2xl overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <button onClick={() => setExpanded(isOpen ? null : order.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm">{order.id}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${ui.color}22`, color: ui.color }}>
                              <StatusIcon className="w-3 h-3" /> {ui.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}</p>
                        </div>
                        <span className="font-black text-sm">{money(order.amount_total)}</span>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3">
                          <div className="space-y-2 mb-3">
                            {(order.items || []).map(it => (
                              <div key={it.id} className="flex items-center gap-3">
                                {it.image ? <img src={it.image} alt={it.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Package className="w-4 h-4 text-gray-600" /></div>}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white truncate">{it.name}</p>
                                  <p className="text-xs text-gray-500">Qty {it.qty} · {money(it.price)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {order.tracking_number && (
                            <p className="text-xs text-gray-400 mb-3">Tracking: <span className="text-white font-mono">{order.tracking_number}</span></p>
                          )}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>Subtotal {money(order.subtotal)} · Shipping {money(order.shipping)} · Tax {money(order.tax)}</span>
                          </div>
                          {hasOpenReturn ? (
                            <button onClick={() => setTab('returns')} className="text-xs font-bold text-orange-400 hover:underline">View return status →</button>
                          ) : (
                            <button onClick={() => setReturnFor(order)} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition" style={{ background: 'rgba(234,88,12,0.12)', color: '#fb923c', border: '1px solid rgba(234,88,12,0.25)' }}>
                              <RotateCcw className="w-3.5 h-3.5" /> Request a return
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* RETURNS */}
            {tab === 'returns' && (
              <div className="space-y-3">
                {returns.length === 0 && (
                  <EmptyState icon={RotateCcw} title="No returns" body="Started a return? Track its status here. Open a return from any delivered order." />
                )}
                {returns.map(r => {
                  const ui = RETURN_UI[r.status] || RETURN_UI.requested;
                  return (
                    <div key={r.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-black text-sm">{r.id}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${ui.color}22`, color: ui.color }}>{ui.label}</span>
                        <span className="text-xs text-gray-500 ml-auto">Order {r.orderId}</span>
                      </div>
                      <div className="space-y-1 mb-2">
                        {r.items.map(it => (
                          <p key={it.id} className="text-sm text-gray-300">{it.qty}× {it.name}</p>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">Reason: {REASON_LABELS[r.reason] || r.reason}</p>
                      {r.comment && <p className="text-xs text-gray-500 mt-1 italic">"{r.comment}"</p>}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1a1a1a]">
                        <span className="text-xs text-gray-500">Est. refund</span>
                        <span className="text-sm font-black text-white">{money(r.refund_estimate)}</span>
                      </div>
                      {r.admin_note && (
                        <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: '#d1d5db' }}>Note from support: {r.admin_note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* REWARDS */}
            {tab === 'rewards' && (
              <div className="space-y-3">
                {loyalty ? (
                  <>
                    <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(234,88,12,0.15), #111)', border: '1px solid rgba(234,88,12,0.25)' }}>
                      <p className="text-xs font-black tracking-widest uppercase text-orange-400 mb-1">🔥 {loyalty.tier} Member</p>
                      <p className="text-5xl font-black">{loyalty.points.toLocaleString()}</p>
                      <p className="text-sm text-gray-400">points available</p>
                      <div className="grid grid-cols-3 gap-3 mt-5">
                        {[
                          { label: 'Lifetime pts', value: loyalty.lifetimePoints.toLocaleString() },
                          { label: 'Total spent', value: money(loyalty.lifetimeSpend) },
                          { label: 'Redeemed', value: loyalty.redeemedCodes.length },
                        ].map((s, i) => (
                          <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <p className="text-base font-black">{s.value}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <a href="/loyalty" className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white transition hover:brightness-110" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
                      Redeem points & view perks <ArrowRight className="w-4 h-4" />
                    </a>
                  </>
                ) : (
                  <div className="rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #111, #1a0800)', border: '1px solid rgba(234,88,12,0.2)' }}>
                    <div className="text-5xl mb-3">🎁</div>
                    <h3 className="text-xl font-black mb-2">Join Phoenix Rewards</h3>
                    <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto">Earn points on every order and redeem for discounts, free shipping, and VIP perks.</p>
                    <a href="/loyalty" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-white" style={{ background: '#ea580c' }}>Join free — get 50 points</a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {returnFor && (
        <ReturnModal
          order={returnFor}
          onClose={() => setReturnFor(null)}
          onSubmitted={(rec) => { setReturns(prev => [rec, ...prev]); setReturnFor(null); setTab('returns'); }}
        />
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, cta, href }: { icon: any; title: string; body: string; cta?: string; href?: string }) {
  return (
    <div className="rounded-2xl p-10 text-center" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Icon className="w-10 h-10 mx-auto mb-3 text-gray-600" />
      <h3 className="font-black text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">{body}</p>
      {cta && href && <a href={href} className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#ea580c' }}>{cta}</a>}
    </div>
  );
}

function ReturnModal({ order, onClose, onSubmitted }: { order: StoreOrder; onClose: () => void; onSubmitted: (r: StoreReturn) => void }) {
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    Object.fromEntries((order.items || []).map(it => [it.id, it.qty]))
  );
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((order.items || []).map(it => [it.id, false]))
  );
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const chosen = (order.items || []).filter(it => picked[it.id]);
  const estRefund = chosen.reduce((sum, it) => sum + it.price * (selected[it.id] || 1), 0);

  async function submit() {
    if (chosen.length === 0) { toast.error('Select at least one item to return.'); return; }
    if (!reason) { toast.error('Pick a reason for the return.'); return; }
    setSubmitting(true);
    try {
      const json = await authFetch('/store/returns', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          reason,
          comment,
          items: chosen.map(it => ({ id: it.id, qty: selected[it.id] || 1 })),
        }),
      });
      toast.success('Return request submitted — we\'ll email you the next steps.');
      onSubmitted(json.return);
    } catch (err: any) {
      toast.error(err.message || 'Unable to submit return.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[#1a1a1a]" style={{ background: '#111' }}>
          <div>
            <h3 className="font-black">Request a return</h3>
            <p className="text-xs text-gray-500">Order {order.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Which items?</p>
            <div className="space-y-2">
              {(order.items || []).map(it => (
                <label key={it.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition" style={{ background: picked[it.id] ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${picked[it.id] ? 'rgba(234,88,12,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                  <input type="checkbox" checked={!!picked[it.id]} onChange={e => setPicked(p => ({ ...p, [it.id]: e.target.checked }))} className="accent-orange-500 w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{it.name}</p>
                    <p className="text-xs text-gray-500">{money(it.price)} · ordered {it.qty}</p>
                  </div>
                  {picked[it.id] && it.qty > 1 && (
                    <select value={selected[it.id]} onChange={e => setSelected(s => ({ ...s, [it.id]: Number(e.target.value) }))} onClick={e => e.stopPropagation()} className="text-sm bg-black/40 rounded-lg px-2 py-1 text-white">
                      {Array.from({ length: it.qty }, (_, i) => i + 1).map(n => <option key={n} value={n}>Qty {n}</option>)}
                    </select>
                  )}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Reason</p>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => setReason(key)} className="text-left text-sm px-3 py-2.5 rounded-xl transition" style={{ background: reason === key ? 'rgba(234,88,12,0.12)' : 'rgba(255,255,255,0.03)', color: reason === key ? '#fb923c' : '#d1d5db', border: `1px solid ${reason === key ? 'rgba(234,88,12,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Anything else? (optional)</p>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Tell us more…" className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        </div>
        <div className="sticky bottom-0 p-4 border-t border-[#1a1a1a]" style={{ background: '#111' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Estimated refund</span>
            <span className="font-black">{money(estRefund)}</span>
          </div>
          <button onClick={submit} disabled={submitting || chosen.length === 0 || !reason} className="w-full py-3.5 rounded-2xl font-black text-white transition hover:brightness-110 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}>
            {submitting ? 'Submitting…' : 'Submit return request'}
          </button>
        </div>
      </div>
    </div>
  );
}
