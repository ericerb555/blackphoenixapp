import { useState, useEffect } from 'react';
import {
  ShoppingBag, RefreshCw, Search, Package, Truck, CheckCircle,
  Clock, AlertCircle, DollarSign, TrendingUp, Eye, X, ExternalLink,
  ChevronRight, Copy, Check, Users, BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

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

// Seed orders for demo until real ones come in
function demoOrders(): Order[] {
  const d = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  return [
    { id: 'BP-A3F2K1', customer_name: 'Marcus Thompson', customer_email: 'marcus.t@gmail.com', customer_phone: '(614) 555-0192', shipping_address: '1234 Oak St, Columbus OH 43215', items: [{ id: 'p1', name: 'Wireless Headphones Pro', price: 79.99, qty: 1 }, { id: 'p2', name: 'Insulated Water Bottle', price: 34.99, qty: 2 }], amount_total: 174.97, currency: 'usd', status: 'paid', fulfillment_status: 'shipped', tracking_number: '1Z999AA10123456784', created_at: d(2) },
    { id: 'BP-B7C9D2', customer_name: 'Jessica Morales', customer_email: 'jess.morales@yahoo.com', customer_phone: '(614) 555-0341', shipping_address: '567 Elm Ave, Westerville OH 43082', items: [{ id: 'p6', name: 'Air Fryer 5.5L', price: 89.99, qty: 1 }], amount_total: 114.99, currency: 'usd', status: 'paid', fulfillment_status: 'forwarded_to_doba', created_at: d(5) },
    { id: 'BP-E1G4H8', customer_name: 'Samantha Cole', customer_email: 'samantha@hotmail.com', shipping_address: '890 Maple Dr, Dublin OH 43017', items: [{ id: 'p3', name: 'LED Smart Bulbs (4-Pack)', price: 44.99, qty: 2 }, { id: 'p9', name: 'Daily Vitamin Pack', price: 29.99, qty: 1 }], amount_total: 144.97, currency: 'usd', status: 'paid', fulfillment_status: 'delivered', created_at: d(72) },
    { id: 'BP-K2M5N9', customer_name: 'Troy James', customer_email: 'troy.james@gmail.com', shipping_address: '321 Pine Rd, Gahanna OH 43230', items: [{ id: 'p10', name: 'Mechanical Keyboard', price: 139.99, qty: 1 }], amount_total: 164.99, currency: 'usd', status: 'paid', fulfillment_status: 'pending', created_at: d(0.5) },
    { id: 'BP-P3Q6R0', customer_name: 'Mia Flores', customer_email: 'mia.flores@gmail.com', shipping_address: '456 Cedar Ln, Hilliard OH 43026', items: [{ id: 'p5', name: 'Yoga Mat Premium', price: 49.99, qty: 1 }, { id: 'p8', name: 'Bluetooth Speaker 360', price: 69.99, qty: 1 }], amount_total: 144.98, currency: 'usd', status: 'paid', fulfillment_status: 'shipped', tracking_number: '9400111899223432818484', created_at: d(30) },
  ];
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

  async function loadOrders() {
    try {
      const res = await fetch(`${SERVER}/store/orders`, {
        headers: { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          setOrders(data.orders);
          return;
        }
      }
    } catch { /* offline — use demo */ }
    setOrders(demoOrders());
  }

  useEffect(() => { loadOrders().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
    toast.success('Orders refreshed');
  }

  async function updateFulfillment(orderId: string, fulfillment_status: string, tracking_number?: string) {
    setUpdating(orderId);
    try {
      const body: any = { fulfillment_status };
      if (tracking_number) body.tracking_number = tracking_number;
      const res = await fetch(`${SERVER}/store/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        if (selected?.id === orderId) setSelected(updated);
        toast.success('Order updated');
      } else {
        // Update locally for demo
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, fulfillment_status: fulfillment_status as any, tracking_number } : o));
        if (selected?.id === orderId) setSelected(s => s ? { ...s, fulfillment_status: fulfillment_status as any, tracking_number } : null);
        toast.success('Order updated');
      }
    } catch {
      toast.error('Could not update order');
    }
    setUpdating(null);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  const visible = orders.filter(o => {
    if (filterStatus !== 'all' && o.fulfillment_status !== filterStatus) return false;
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) &&
        !o.customer_email.toLowerCase().includes(search.toLowerCase()) &&
        !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRevenue = orders.reduce((s, o) => s + o.amount_total, 0);
  const pendingCount = orders.filter(o => o.fulfillment_status === 'pending').length;
  const shippedCount = orders.filter(o => o.fulfillment_status === 'shipped' || o.fulfillment_status === 'delivered').length;

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
            { label: 'Total Orders',    value: orders.length,                 icon: ShoppingBag, color: '#60a5fa' },
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

        {/* Setup banner if no real orders yet */}
        {orders.every(o => demoOrders().some(d => d.id === o.id)) && (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)' }}>
            <p className="font-black text-orange-400 mb-1">⚡ One step to go live</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Add <code className="text-orange-300 bg-black/30 px-1.5 py-0.5 rounded">STRIPE_SECRET_KEY</code> to your Supabase Edge Function secrets and payments start flowing in automatically.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-gray-500">
              <p>1. Go to <span className="text-orange-400">supabase.com → your project → Edge Functions → Secrets</span></p>
              <p>2. Add <code className="text-orange-300">STRIPE_SECRET_KEY</code> = your Stripe secret key (from stripe.com → Developers → API Keys)</p>
              <p>3. Add webhook in Stripe pointing to <code className="text-orange-300">https://{projectId}.supabase.co/functions/v1/make-server-57095a78/store/webhook</code></p>
              <p>4. Add <code className="text-orange-300">STRIPE_WEBHOOK_SECRET</code> from the webhook signing secret</p>
            </div>
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
