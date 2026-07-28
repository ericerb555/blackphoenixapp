/**
 * FulfillmentManager — admin panel for order fulfillment & stock.
 * Lists orders, lets admins set status/tracking (auto-notifying the customer
 * by email + SMS), and shows a low-stock report with inline editing.
 * Lives in the Content Center. All writes require an admin session.
 */
import { useState, useEffect, useCallback } from 'react';
import { Truck, PackageCheck, RefreshCw, Loader2, Send, Boxes, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const STATUS_COLOR: Record<string, string> = {
  pending: '#a1a1aa', processing: '#3b82f6', shipped: '#ea580c', delivered: '#22c55e', cancelled: '#ef4444',
};

interface OrderRow {
  id: string; orderNumber: string; customerName?: string; customerEmail: string;
  status: string; total: number; trackingNumber?: string | null; carrier?: string | null;
  createdAt: string; itemCount: number;
}
interface LowStock { id: string; name: string; inventoryQuantity: number }

async function adminToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export default function FulfillmentManager() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; trackingNumber: string; carrier: string }>>({});
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = await adminToken();
      if (!token) { toast.error('Sign in as an admin to manage fulfillment.'); return; }
      const res = await fetch(`${SERVER}/fulfillment/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Load failed (${res.status})`);
      setOrders(data.orders || []);
      const d: Record<string, any> = {};
      (data.orders || []).forEach((o: OrderRow) => { d[o.id] = { status: o.status, trackingNumber: o.trackingNumber || '', carrier: o.carrier || '' }; });
      setDrafts(d);
    } catch (err: any) {
      console.error('Failed to load orders for fulfillment:', err);
      toast.error(err.message || 'Could not load orders.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const saveOrder = async (id: string) => {
    setBusyId(id);
    try {
      const token = await adminToken();
      if (!token) { toast.error('Sign in as an admin.'); return; }
      const draft = drafts[id];
      const res = await fetch(`${SERVER}/fulfillment/orders/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...draft, notify: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Save failed (${res.status})`);
      const emailSent = data.notifications?.email?.sent;
      const smsSent = data.notifications?.sms?.sent;
      toast.success(`Order updated. Customer notified${emailSent ? ' by email' : ''}${smsSent ? ' + SMS' : ''}.`);
      loadOrders();
    } catch (err: any) {
      console.error('Failed to update order fulfillment:', err);
      toast.error(err.message || 'Could not update order.');
    } finally { setBusyId(null); }
  };

  const syncStock = async (updates: LowStock[] = []) => {
    setStockLoading(true);
    try {
      const token = await adminToken();
      if (!token) { toast.error('Sign in as an admin.'); return; }
      const res = await fetch(`${SERVER}/fulfillment/sync-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates: updates.map(u => ({ id: u.id, inventoryQuantity: u.inventoryQuantity })) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Sync failed (${res.status})`);
      setLowStock(data.lowStock || []);
      setStockEdits({});
      toast.success(`Stock synced. ${data.updated} updated · ${data.lowStock?.length || 0} low-stock items across ${data.totalProducts} products.`);
    } catch (err: any) {
      console.error('Failed to sync stock:', err);
      toast.error(err.message || 'Could not sync stock.');
    } finally { setStockLoading(false); }
  };

  const inputCls = 'px-2.5 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-orange-400" />
            <div>
              <h3 className="text-lg font-black text-white">Order Fulfillment</h3>
              <p className="text-xs text-gray-500">Set status &amp; tracking — the customer is auto-notified by email &amp; SMS.</p>
            </div>
          </div>
          <button onClick={loadOrders} className="px-3 py-2 rounded-xl text-sm text-gray-300 bg-white/5 hover:bg-white/10 transition flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reload</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading orders…</div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500 py-10 text-center">No orders yet. When customers check out, they'll appear here for fulfillment.</p>
        ) : (
          <div className="space-y-3">
            {orders.map(o => {
              const d = drafts[o.id] || { status: o.status, trackingNumber: '', carrier: '' };
              return (
                <div key={o.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{o.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${STATUS_COLOR[o.status] || '#666'}22`, color: STATUS_COLOR[o.status] || '#aaa' }}>{o.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{o.customerName || o.customerEmail} · {o.itemCount} item{o.itemCount !== 1 ? 's' : ''} · ${Number(o.total || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select className={inputCls} value={d.status} onChange={e => setDrafts(s => ({ ...s, [o.id]: { ...d, status: e.target.value } }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input className={`${inputCls} w-36`} placeholder="Tracking #" value={d.trackingNumber} onChange={e => setDrafts(s => ({ ...s, [o.id]: { ...d, trackingNumber: e.target.value } }))} />
                      <input className={`${inputCls} w-28`} placeholder="Carrier" value={d.carrier} onChange={e => setDrafts(s => ({ ...s, [o.id]: { ...d, carrier: e.target.value } }))} />
                      <button onClick={() => saveOrder(o.id)} disabled={busyId === o.id} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: '#ea580c' }}>
                        {busyId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Update &amp; notify
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stock */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Boxes className="w-5 h-5 text-orange-400" /><h4 className="text-white font-bold text-sm">Inventory & low-stock</h4></div>
          <button onClick={() => syncStock()} disabled={stockLoading} className="px-3 py-2 rounded-xl text-sm text-white flex items-center gap-2" style={{ background: '#ea580c' }}>
            {stockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync stock report
          </button>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">Click "Sync stock report" to pull current inventory and see items at or below 10 units.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-400 mb-2"><AlertTriangle className="w-4 h-4" /> {lowStock.length} item{lowStock.length !== 1 ? 's' : ''} low on stock</div>
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 flex-1 truncate">{p.name}</span>
                <input type="number" className={`${inputCls} w-24`} value={stockEdits[p.id] ?? p.inventoryQuantity} onChange={e => setStockEdits(s => ({ ...s, [p.id]: Number(e.target.value) }))} />
                <button
                  onClick={() => syncStock([{ id: p.id, name: p.name, inventoryQuantity: stockEdits[p.id] ?? p.inventoryQuantity }])}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: 'rgba(234,88,12,0.9)' }}
                ><Save className="w-3.5 h-3.5" /> Set</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
