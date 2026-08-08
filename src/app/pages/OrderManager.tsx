import { useState, useEffect } from 'react';
import {
  ShoppingBag, RefreshCw, Search, Package, Truck, CheckCircle,
  Clock, AlertCircle, DollarSign, X, ExternalLink,
  ChevronRight, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import FulfillmentAutomationPanel from '../components/FulfillmentAutomationPanel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Order {
  id: string;
  stripe_session_id?: string;
  stripe_payment_intent?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: string;
  items: { id: string; name: string; price: number; qty: number }[];
  amount_total: number;
  currency: string;
  status: 'paid' | 'refunded' | 'disputed';
  fulfillment_status: 'pending' | 'forwarded_to_doba' | 'shipped' | 'delivered';
  tracking_number?: string;
  created_at: string;
  updated_at?: string;
  fulfillment_error?: string;
  fulfillment_skipped?: string[];
  fulfillment_attempts?: number;
  fulfillment_hold_reason?: string;
}

const FULFILLMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:           { label: 'Pending',          color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  icon: Clock        },
  forwarded_to_doba: { label: 'Sent to Doba',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  icon: Package      },
  shipped:           { label: 'Shipped',           color: '#c084fc', bg: 'rgba(192,132,252,0.1)', icon: Truck        },
  delivered:         { label: 'Delivered',         color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  icon: CheckCircle  },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${m}m ago`;
}

/**
 * Marketplace orders use different field names than main-store orders
 * (`total` vs `amount_total`, `quantity` vs `qty`, `unfulfilled` vs `pending`).
 * Present one shape to the UI.
 */
function normalizeOrder(o: any): Order {
  const rawFulfillment = String(o.fulfillment_status || 'pending');
  return {
    ...o,
    customer_name: o.customer_name || o.customer?.name || 'Unknown customer',
    customer_email: o.customer_email || o.customer?.email || '',
    amount_total: Number(o.amount_total ?? o.amount_paid ?? o.total ?? 0) || 0,
    currency: o.currency || 'usd',
    status: o.status || (o.payment_status === 'paid' ? 'paid' : o.payment_status || 'paid'),
    fulfillment_status: (rawFulfillment === 'unfulfilled' || rawFulfillment === ''
      ? 'pending'
      : rawFulfillment) as Order['fulfillment_status'],
    items: (Array.isArray(o.items) ? o.items : []).map((it: any, i: number) => ({
      id: it.id ?? it.productId ?? it.sku ?? String(i),
      name: it.name ?? it.title ?? 'Item',
      price: Number(it.price ?? it.unitPrice ?? 0) || 0,
      qty: Number(it.qty ?? it.quantity ?? 1) || 1,
    })),
  };
}

/** Seeded sample records that are in the live database, not real sales. */
function isSampleOrder(o: Order): boolean {
  return /^BP-DEMO-/i.test(o.id)
    || String((o as any).source || '').toLowerCase().includes('demo')
    || /@example\.com$/i.test(o.customer_email || '');
}

export default function OrderManager() {
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected]     = useState<Order | null>(null);
  const [copiedId, setCopied]       = useState<string | null>(null);
  const [updatingId, setUpdating]   = useState<string | null>(null);
  const [trackingInput, setTracking] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendingId, setSending]     = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [showDemo, setShowDemo]     = useState(false);

  /**
   * Orders live under TWO key prefixes on the server: `store:order:` (main store
   * checkout, served by /store/orders) and `store_order:` (marketplace/digital
   * checkout, served by /marketplace/orders). Reading only the first is why a
   * paid marketplace order never appeared here. Merge both.
   *
   * The server-side merge is the real fix, but it needs a deploy — this client
   * merge makes the orders visible against the currently deployed backend.
   */
  async function loadOrders() {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setOrders([]); return; }
      const auth = { apikey: publicAnonKey, Authorization: `Bearer ${token}` };

      const [storeRes, marketRes] = await Promise.allSettled([
        fetch(`${SERVER}/store/orders`, { headers: auth }),
        fetch(`${SERVER}/marketplace/orders`, { headers: auth }),
      ]);

      const collected: Order[] = [];
      const problems: string[] = [];

      if (storeRes.status === 'fulfilled' && storeRes.value.ok) {
        const data = await storeRes.value.json().catch(() => null);
        for (const o of (data?.orders || [])) collected.push(normalizeOrder(o));
      } else {
        const detail = storeRes.status === 'fulfilled'
          ? (await storeRes.value.json().catch(() => null))?.error || `HTTP ${storeRes.value.status}`
          : String(storeRes.reason);
        problems.push(`Store orders: ${detail}`);
      }

      if (marketRes.status === 'fulfilled' && marketRes.value.ok) {
        const data = await marketRes.value.json().catch(() => null);
        for (const o of (data?.orders || [])) collected.push(normalizeOrder(o));
      } else {
        const detail = marketRes.status === 'fulfilled'
          ? (await marketRes.value.json().catch(() => null))?.error || `HTTP ${marketRes.value.status}`
          : String(marketRes.reason);
        problems.push(`Marketplace orders: ${detail}`);
      }

      // De-duplicate by id — once the server-side merge deploys, both endpoints
      // will report the same order and we must not show it twice.
      const byId = new Map<string, Order>();
      for (const o of collected) if (o.id && !byId.has(o.id)) byId.set(o.id, o);
      const merged = [...byId.values()].sort(
        (a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || ''),
      );

      setOrders(merged);
      // Only a total failure is an error; one source failing still shows the other.
      setLoadError(problems.length === 2 ? problems.join(' · ') : null);
      if (problems.length === 1) console.warn('[OrderManager] one order source failed:', problems[0]);
      return;
    } catch (err: any) {
      // Say so rather than showing an empty list that looks like "no sales".
      console.error('[OrderManager] could not load orders:', err);
      setLoadError(err?.message || 'Orders could not be loaded.');
    }
    setOrders([]);
  }

  useEffect(() => { loadOrders().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
    toast.success('Orders refreshed');
  }

  /**
   * Recover paid checkouts that never became orders. If a customer paid via
   * Stripe but the webhook/redirect never fired, Stripe has the money yet no
   * order exists here. This re-verifies every unconverted checkout against
   * Stripe and creates the missing orders. Safe to run repeatedly.
   */
  async function recoverOrders() {
    setRecovering(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required');
      const res = await fetch(`${SERVER}/store/orders/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: publicAnonKey, Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => null);
      if (res.status === 404) {
        throw new Error('The recovery endpoint isn\'t live yet — click Publish to deploy the backend, then try again.');
      }
      if (!res.ok || !data?.success) throw new Error(data?.error || `Recovery failed (${res.status}).`);
      const pendingList: Array<{ checkoutId: string; reason: string }> = data.stillPending || [];
      if (data.recoveredCount > 0) {
        toast.success(`Recovered ${data.recoveredCount} paid order${data.recoveredCount === 1 ? '' : 's'} from Stripe.`);
        await loadOrders();
        if (pendingList.length) {
          toast.info(`${pendingList.length} other checkout${pendingList.length === 1 ? '' : 's'} still couldn't be recovered — see below.`);
        }
      } else if (data.scanned === 0) {
        toast.info('No store checkouts exist yet. If Stripe charged a card, the payment may have gone through a different checkout flow — tell me and I\'ll trace it.');
      } else if (pendingList.length) {
        // Show the actual Stripe reason for the first stranded checkout so the
        // problem is diagnosable instead of a silent "nothing happened".
        toast.error(`Couldn't recover ${pendingList.length} checkout${pendingList.length === 1 ? '' : 's'}. First reason: ${pendingList[0].reason}`, { duration: 10000 });
      } else {
        toast.info('No unconverted checkouts found — every paid order is already recorded.');
      }
      if (pendingList.length) console.warn('[OrderManager] checkouts still pending:', pendingList);
    } catch (error: any) {
      console.error('[OrderManager] recover error:', error);
      toast.error(error?.message || 'Could not recover orders.');
    } finally {
      setRecovering(false);
    }
  }

  async function updateFulfillment(orderId: string, fulfillment_status: string, tracking_number?: string) {
    setUpdating(orderId);
    try {
      const body: any = { fulfillment_status };
      if (tracking_number) body.tracking_number = tracking_number;
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required');
      const res = await fetch(`${SERVER}/store/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: publicAnonKey, Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        if (selected?.id === orderId) setSelected(updated);
        toast.success('Order updated');
      } else {
        const error = await res.json().catch(() => ({ error: 'Order update failed.' }));
        throw new Error(error.error || 'Order update failed.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not update order');
    }
    setUpdating(null);
  }

  /** Push one paid order to its dropship supplier right now. */
  async function sendToSupplier(orderId: string) {
    setSending(orderId);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in required');
      const res = await fetch(`${SERVER}/dropshipper/orders/${orderId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: publicAnonKey, Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `The supplier did not accept this order (${res.status}).`);
      toast.success('Order sent to the supplier');
      await loadOrders();
    } catch (error: any) {
      console.error('[OrderManager] send to supplier failed:', error);
      toast.error(error?.message || 'Could not send this order to the supplier');
    }
    setSending(null);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  // Two seeded sample records ("Affiliate Demo") live in the database itself, so
  // no code change removes them. Keep them out of revenue and counts, and show
  // them behind a toggle so the numbers on this page are real sales only.
  const sampleOrders = orders.filter(isSampleOrder);
  const realOrders = orders.filter(o => !isSampleOrder(o));
  const scoped = showDemo ? orders : realOrders;

  const visible = scoped.filter(o => {
    if (filterStatus !== 'all' && o.fulfillment_status !== filterStatus) return false;
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) &&
        !o.customer_email.toLowerCase().includes(search.toLowerCase()) &&
        !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRevenue = realOrders.reduce((s, o) => s + o.amount_total, 0);
  const pendingCount = realOrders.filter(o => o.fulfillment_status === 'pending').length;
  const shippedCount = realOrders.filter(o => o.fulfillment_status === 'shipped' || o.fulfillment_status === 'delivered').length;

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black">Orders</h1>
            <p className="text-gray-500 text-sm mt-1">Every paid order — real-time from Stripe</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Stripe Connected
            </div>
            <button onClick={recoverOrders} disabled={recovering}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm text-white hover:brightness-110 transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
              title="Re-check Stripe for paid checkouts that never became orders and create the missing ones.">
              <RefreshCw className={`w-4 h-4 ${recovering ? 'animate-spin' : ''}`} /> {recovering ? 'Recovering…' : 'Recover paid orders'}
            </button>
            <button onClick={refresh} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm text-white hover:brightness-110 transition disabled:opacity-50"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue',   value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign,  color: '#ea580c' },
            { label: 'Total Orders',    value: realOrders.length,             icon: ShoppingBag, color: '#60a5fa' },
            { label: 'Need Fulfillment',value: pendingCount,                  icon: AlertCircle, color: '#fbbf24' },
            { label: 'Shipped / Done',  value: shippedCount,                  icon: Truck,       color: '#4ade80' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {loadError && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-red-400 text-sm">Orders could not be loaded</p>
              <p className="text-xs text-gray-400 mt-1">{loadError}</p>
            </div>
          </div>
        )}

        <FulfillmentAutomationPanel onOrdersChanged={loadOrders} />

        {sampleOrders.length > 0 && (
          <div className="rounded-2xl p-4 flex items-start gap-3 flex-wrap"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-[240px]">
              <p className="font-black text-amber-400 text-sm">
                {sampleOrders.length} sample order{sampleOrders.length !== 1 ? 's' : ''} in the database
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {sampleOrders.map(o => o.id).join(', ')} — seeded test records, not real sales. They're
                excluded from the totals above. Removing them means deleting live database rows, so
                say the word and I'll add that.
              </p>
            </div>
            <button onClick={() => setShowDemo(v => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-black text-amber-300 hover:brightness-125 transition flex-shrink-0"
              style={{ border: '1px solid rgba(251,191,36,0.3)' }}>
              {showDemo ? 'Hide' : 'Show'} samples
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search className="w-4 h-4 text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or order ID…"
              className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 focus:outline-none" />
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            {['all', 'pending', 'forwarded_to_doba', 'shipped', 'delivered'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-black capitalize transition"
                style={filterStatus === s ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
                {s === 'all' ? 'All' : s === 'forwarded_to_doba' ? 'Sent to Doba' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Order list */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ShoppingBag className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No orders match this filter</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(order => {
              const fc = FULFILLMENT_CONFIG[order.fulfillment_status];
              return (
                <div key={order.id} onClick={() => setSelected(order)}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4 cursor-pointer hover:brightness-110 transition"
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black flex-shrink-0 text-sm" style={{ background: '#ea580c' }}>{order.customer_name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white">{order.customer_name}</p>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: fc.bg, color: fc.color }}>{fc.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{order.items.map(i => i.name).join(', ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-white">${order.amount_total.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-600">{timeAgo(order.created_at)}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); copyId(order.id); }} className="flex items-center gap-1 text-[10px] font-black text-gray-600 hover:text-gray-400 flex-shrink-0 transition">
                    {copiedId === order.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span className="hidden sm:inline">{order.id}</span>
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Detail Slide-in */}
      {selected && (() => {
        const order = orders.find(o => o.id === selected.id) ?? selected;
        const fc = FULFILLMENT_CONFIG[order.fulfillment_status];
        return (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div className="w-full max-w-md h-full overflow-y-auto"
              style={{ background: '#0d0d0d', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b"
                style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.07)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-white">{order.id}</p>
                    <button onClick={() => copyId(order.id)} className="text-gray-600 hover:text-gray-400">
                      {copiedId === order.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Status */}
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: fc.bg, border: `1px solid ${fc.color}30` }}>
                  <fc.icon className="w-5 h-5" style={{ color: fc.color }} />
                  <div>
                    <p className="text-sm font-black" style={{ color: fc.color }}>{fc.label}</p>
                    <p className="text-xs text-gray-500">Fulfillment status</p>
                  </div>
                  <span className="ml-auto text-xs font-black px-2 py-1 rounded-full text-white" style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80' }}>PAID</span>
                </div>

                {/* Customer */}
                <div className="rounded-xl p-4 space-y-2" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Customer</p>
                  <p className="text-sm font-black text-white">{order.customer_name}</p>
                  <p className="text-xs text-gray-400">{order.customer_email}</p>
                  {order.customer_phone && <p className="text-xs text-gray-400">{order.customer_phone}</p>}
                  {order.shipping_address && <p className="text-xs text-gray-400 mt-1">{order.shipping_address}</p>}
                </div>

                {/* Items */}
                <div className="rounded-xl p-4" style={{ background: '#111' }}>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Items Ordered</p>
                  <div className="space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.name} × {item.qty}</span>
                        <span className="font-black text-white">${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-black" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      <span className="text-gray-400">Total Paid</span>
                      <span className="text-orange-400">${order.amount_total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Tracking */}
                {order.tracking_number && (
                  <div className="rounded-xl p-4" style={{ background: '#111' }}>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Tracking</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white font-mono">{order.tracking_number}</p>
                      <button onClick={() => window.open(`https://www.google.com/search?q=${order.tracking_number}`, '_blank')} className="text-gray-600 hover:text-orange-400">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Supplier handoff */}
                {order.fulfillment_status === 'pending' && (
                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Not sent to a supplier yet</p>
                    {order.fulfillment_hold_reason && (
                      <p className="text-xs text-gray-400 leading-snug">{order.fulfillment_hold_reason}</p>
                    )}
                    {order.fulfillment_error && (
                      <p className="text-xs text-red-400 leading-snug">
                        Last attempt failed: {order.fulfillment_error}
                      </p>
                    )}
                    {order.fulfillment_skipped && order.fulfillment_skipped.length > 0 && (
                      <ul className="space-y-0.5">
                        {order.fulfillment_skipped.map((reason, i) => (
                          <li key={i} className="text-[11px] text-gray-500 leading-snug">• {reason}</li>
                        ))}
                      </ul>
                    )}
                    <button onClick={() => sendToSupplier(order.id)} disabled={sendingId === order.id}
                      className="w-full py-2.5 rounded-xl text-sm font-black text-white hover:brightness-110 transition disabled:opacity-50"
                      style={{ background: '#ea580c' }}>
                      {sendingId === order.id ? 'Sending…' : 'Send to supplier now'}
                    </button>
                    {typeof order.fulfillment_attempts === 'number' && order.fulfillment_attempts > 0 && (
                      <p className="text-[11px] text-gray-600">{order.fulfillment_attempts} previous attempt(s).</p>
                    )}
                  </div>
                )}

                {/* Update fulfillment */}
                <div className="space-y-3">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Update Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(FULFILLMENT_CONFIG) as any[]).map(([status, cfg]) => (
                      <button key={status} onClick={() => updateFulfillment(order.id, status)}
                        disabled={updatingId === order.id || order.fulfillment_status === status}
                        className="py-2.5 rounded-xl text-xs font-black transition hover:brightness-110 disabled:opacity-40"
                        style={{ background: order.fulfillment_status === status ? cfg.bg : '#161616', color: cfg.color, border: `1px solid ${order.fulfillment_status === status ? cfg.color + '40' : 'rgba(255,255,255,0.07)'}` }}>
                        {cfg.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input value={trackingInput} onChange={e => setTracking(e.target.value)}
                      placeholder="Add tracking number…"
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-700 focus:outline-none"
                      style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)' }} />
                    <button onClick={() => { if (trackingInput.trim()) { updateFulfillment(order.id, 'shipped', trackingInput.trim()); setTracking(''); } }}
                      className="px-4 py-2.5 rounded-xl text-sm font-black text-white hover:brightness-110 transition"
                      style={{ background: '#ea580c' }}>
                      Save
                    </button>
                  </div>
                </div>

                {/* Stripe link */}
                {order.stripe_payment_intent && (
                  <a href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-black transition hover:brightness-110"
                    style={{ background: 'rgba(99,91,255,0.1)', color: '#818cf8', border: '1px solid rgba(99,91,255,0.2)' }}>
                    <ExternalLink className="w-4 h-4" /> View in Stripe Dashboard
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
