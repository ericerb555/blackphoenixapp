/**
 * ReturnsAdmin — the queue where returns get settled.
 *
 * Two things about this screen are load-bearing.
 *
 * Settling moves real money, so the button says which account it draws from and
 * how much, and asks for confirmation. A refund issued from the wrong Stripe
 * account moves money between two businesses and reconciles to nothing.
 *
 * Store credit is presented first and priced higher than the refund, because
 * that is the outcome worth steering toward — it keeps the money in the
 * business and the customer usually prefers it. The cash refund stays plainly
 * available; this is a default, not a trap.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Loader2, Package, Check, X, AlertTriangle, Image as ImageIcon,
  CreditCard, Gift, Settings2, Clock, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ReturnLine { lineId: string; name: string; sku: string; price: number; quantity: number; image?: string }
interface ReturnRequest {
  id: string;
  orderId: string;
  email: string;
  customerName?: string;
  lines: ReturnLine[];
  reason: string;
  detail?: string;
  photos: string[];
  resolution: 'refund' | 'store_credit';
  refundValue: number;
  creditValue: number;
  requiresItemBack: boolean;
  status: 'pending' | 'approved' | 'settled' | 'denied';
  autoApproved?: boolean;
  stripeAccount: string;
  paymentIntent?: string | null;
  createdAt: string;
  outcome?: any;
  denyReason?: string;
  returnLabel?: any;
}

interface Policy {
  windowDays: number;
  keepItThreshold: number;
  storeCreditBonusPercent: number;
  autoApproveEnabled: boolean;
  requirePhotoForDamage: boolean;
}

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: 'rgba(234,179,8,0.15)', fg: '#facc15', label: 'Needs review' },
  approved: { bg: 'rgba(59,130,246,0.15)', fg: '#60a5fa', label: 'Approved' },
  settled: { bg: 'rgba(22,163,74,0.15)', fg: '#4ade80', label: 'Settled' },
  denied: { bg: 'rgba(239,68,68,0.15)', fg: '#f87171', label: 'Denied' },
};

export default function ReturnsAdmin() {
  const [rows, setRows] = useState<ReturnRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [showPolicy, setShowPolicy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await headers();
      const [r, p] = await Promise.all([
        fetch(`${SERVER}/returns`, { headers: h }),
        fetch(`${SERVER}/returns/policy`, { headers: h }),
      ]);
      const rd = await r.json().catch(() => null);
      const pd = await p.json().catch(() => null);
      if (!r.ok || !rd?.success) {
        toast.error(rd?.error || `Could not load returns (${r.status})`);
      } else {
        setRows(rd.returns || []);
        setCounts(rd.counts || {});
      }
      if (pd?.success) setPolicy(pd.policy);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load returns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const settle = useCallback(async (row: ReturnRequest, resolution: 'refund' | 'store_credit') => {
    const amount = resolution === 'refund' ? row.refundValue : row.creditValue;
    const where = resolution === 'refund'
      ? `refund ${money(amount)} to the customer's card via ${row.stripeAccount === 'tbpco_ecommerce' ? 'TBPCO' : 'Black Phoenix Builds'}`
      : `issue ${money(amount)} in store credit`;
    // Money is about to move and it cannot be undone from here.
    if (!confirm(`Settle ${row.id}?\n\nThis will ${where}.`)) return;

    setBusyId(row.id);
    try {
      const res = await fetch(`${SERVER}/returns/${row.id}/settle`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ resolution }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || `Settle failed (${res.status})`); return; }
      toast.success(
        data.outcome?.type === 'store_credit'
          ? `Store credit issued — code ${data.outcome.code}`
          : `Refunded ${money(data.outcome?.amount)}`,
      );
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not settle the return.');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const deny = useCallback(async (row: ReturnRequest) => {
    const reason = prompt('Why is this being denied? The customer sees this.');
    if (reason === null) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`${SERVER}/returns/${row.id}/deny`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || `Deny failed (${res.status})`); return; }
      toast.success('Return denied.');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not deny the return.');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const savePolicy = useCallback(async (next: Policy) => {
    try {
      const res = await fetch(`${SERVER}/returns/policy`, {
        method: 'PUT',
        headers: await headers(),
        body: JSON.stringify(next),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || 'Could not save the policy.'); return; }
      setPolicy(data.policy);
      toast.success('Policy saved.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not save the policy.');
    }
  }, []);

  const visible = useMemo(
    () => (filter ? rows.filter(r => r.status === filter) : rows),
    [rows, filter],
  );

  const input = 'px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#ea580c]" /> Returns
          </h3>
          <p className="text-sm text-gray-400">
            Refund or credit a customer. Low-value returns are approved automatically without
            asking for the item back — posting it costs more than the refund.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPolicy(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-300 border border-[#2A2A2A]">
            <Settings2 className="w-4 h-4" /> Policy
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
          </button>
        </div>
      </div>

      {showPolicy && policy && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs text-gray-400">
            Return window (days)
            <input type="number" className={`${input} w-full mt-1`} value={policy.windowDays}
              onChange={e => setPolicy({ ...policy, windowDays: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-gray-400">
            Keep-it threshold ($)
            <input type="number" className={`${input} w-full mt-1`} value={policy.keepItThreshold}
              onChange={e => setPolicy({ ...policy, keepItThreshold: Number(e.target.value) })} />
            <span className="block mt-1 text-[10px] text-gray-600">Below this, refund without asking for the item back.</span>
          </label>
          <label className="text-xs text-gray-400">
            Store credit bonus (%)
            <input type="number" className={`${input} w-full mt-1`} value={policy.storeCreditBonusPercent}
              onChange={e => setPolicy({ ...policy, storeCreditBonusPercent: Number(e.target.value) })} />
            <span className="block mt-1 text-[10px] text-gray-600">Extra given when they take credit instead of cash.</span>
          </label>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" className="accent-[#ea580c]" checked={policy.autoApproveEnabled}
                onChange={e => setPolicy({ ...policy, autoApproveEnabled: e.target.checked })} />
              Auto-approve under threshold
            </label>
            <button onClick={() => savePolicy(policy)}
              className="px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'rgba(234,88,12,0.9)' }}>
              Save policy
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {[['', 'All'], ['pending', 'Needs review'], ['approved', 'Approved'], ['settled', 'Settled'], ['denied', 'Denied']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === id ? 'bg-[#ea580c] text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400'
            }`}>
            {label}{id && counts[id] ? ` (${counts[id]})` : ''}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading returns…
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          {filter ? 'Nothing in this state.' : 'No returns yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(row => {
            const style = STATUS_STYLE[row.status] || STATUS_STYLE.pending;
            const open = row.status === 'pending' || row.status === 'approved';
            return (
              <div key={row.id} className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{row.id}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                        style={{ background: style.bg, color: style.fg }}>{style.label}</span>
                      {row.autoApproved && (
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border border-[#2A2A2A] text-gray-400">
                          auto
                        </span>
                      )}
                      {!row.requiresItemBack && (
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border border-[#2A2A2A] text-gray-400"
                          title="Return postage would cost more than the refund">
                          keep item
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Order {row.orderId} · {row.customerName || row.email}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-white font-bold">{money(row.refundValue)}</div>
                    <div className="text-xs text-gray-500">or {money(row.creditValue)} credit</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-300">
                  <span className="text-gray-500">Reason:</span> {row.reason}
                  {row.detail && <div className="text-gray-400 mt-1">{row.detail}</div>}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {row.lines.map(l => (
                    <div key={l.lineId} className="flex items-center gap-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-2 py-1.5">
                      {l.image
                        ? <img src={l.image} alt="" className="w-8 h-8 rounded object-cover" />
                        : <ImageIcon className="w-4 h-4 text-gray-600" />}
                      <div className="text-xs">
                        <div className="text-gray-200 max-w-[220px] truncate">{l.name}</div>
                        <div className="text-gray-500">×{l.quantity} · {money(l.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {row.photos?.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {row.photos.map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noreferrer" className="block">
                        <img src={p} alt={`Evidence ${i + 1}`}
                          className="w-16 h-16 rounded-lg object-cover border border-[#2A2A2A]" />
                      </a>
                    ))}
                  </div>
                )}

                {row.status === 'settled' && row.outcome && (
                  <div className="mt-3 text-sm text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {row.outcome.type === 'store_credit'
                      ? <>Credit issued — code <code className="text-white">{row.outcome.code}</code></>
                      : <>Refunded {money(row.outcome.amount)} via {row.outcome.account === 'tbpco_ecommerce' ? 'TBPCO' : 'Black Phoenix Builds'}</>}
                  </div>
                )}

                {row.status === 'denied' && (
                  <div className="mt-3 text-sm text-red-400 flex items-start gap-2">
                    <X className="w-4 h-4 mt-0.5" /> {row.denyReason}
                  </div>
                )}

                {row.returnLabel?.labelUrl && (
                  <a href={row.returnLabel.labelUrl} target="_blank" rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-400">
                    <ExternalLink className="w-3.5 h-3.5" /> Return label ({row.returnLabel.tracking})
                  </a>
                )}

                {open && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {/* Credit first and worth more — the outcome that keeps the
                        money in the business, and the one customers usually take. */}
                    <button onClick={() => settle(row, 'store_credit')} disabled={busyId === row.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                      style={{ background: 'rgba(22,163,74,0.9)' }}>
                      {busyId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                      Give {money(row.creditValue)} credit
                    </button>
                    <button onClick={() => settle(row, 'refund')} disabled={busyId === row.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <CreditCard className="w-4 h-4" /> Refund {money(row.refundValue)}
                    </button>
                    <button onClick={() => deny(row)} disabled={busyId === row.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-300 disabled:opacity-40"
                      style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                      <X className="w-4 h-4" /> Deny
                    </button>
                    {!row.paymentIntent && (
                      <span className="flex items-center gap-1.5 text-xs text-yellow-400 self-center">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No payment intent recorded — cash refund unavailable, credit still works.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
