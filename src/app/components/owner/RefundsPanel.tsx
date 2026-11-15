/**
 * Giving money back on an invoice or a deposit.
 *
 * Eric: "build refunds for invoices and deposits."
 *
 * WHAT WAS MISSING, AND WHY IT MATTERED
 *
 * `returns.tsx` has refunded STORE orders for a while. A services payment — an
 * invoice, a deposit — could only be reversed by hand in the Stripe dashboard,
 * which moved the money and left this platform believing the invoice was still
 * paid. The first customer dispute would have produced a refunded card and an
 * invoice still reading "paid", which is the worst possible pair of facts to
 * have to explain.
 *
 * THE SCREEN IS BUILT AROUND THE TWO MISTAKES THAT COST REAL MONEY
 *
 * Refunding the wrong payment, and refunding more than was taken. So each row
 * states who paid, which invoice, on which Stripe account, and what is still
 * refundable — and the amount box is pre-filled with the full refundable figure
 * rather than left blank, because a blank box invites a typed number and a
 * typed number is where an extra zero comes from.
 *
 * THE GRATUITY IS SHOWN SEPARATELY AND IS OPT-IN
 *
 * A tip is the crew's money, charged as its own line and recorded as owed to
 * named people. A partial refund never touches it; refunding it is a tick the
 * person has to make deliberately, and the screen says what that tick does —
 * the crew stops being owed it.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCcw, AlertTriangle, Receipt, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;
const money = (n: unknown) => `$${(Number(n) || 0).toFixed(2)}`;

interface Payment {
  id: string;
  amount?: number;
  tip?: number;
  refunds?: Array<{ principal?: number; tip?: number }>;
  refundedTotal?: number;
  status?: string;
  customerEmail?: string;
  invoiceId?: string | null;
  paymentRail?: string;
  paymentMethod?: string;
  paidAt?: string;
  createdAt?: string;
  stripePaymentIntentId?: string | null;
}

/** Mirrors refundMath.refundableOf, for display only. The server decides. */
function refundable(p: Payment) {
  const past = Array.isArray(p.refunds) ? p.refunds : [];
  const rp = past.reduce((s, r) => s + (Number(r?.principal) || 0), 0);
  const rt = past.reduce((s, r) => s + (Number(r?.tip) || 0), 0);
  const principal = Math.max(0, (Number(p.amount) || 0) - rp);
  const tip = Math.max(0, (Number(p.tip) || 0) - rt);
  return { principal, tip, total: principal + tip, refunded: rp + rt };
}

export default function RefundsPanel() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openFor, setOpenFor] = useState('');
  const [amount, setAmount] = useState('');
  const [includeTip, setIncludeTip] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER}/payments`, { headers: await authedHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not read payments (${res.status}).`);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err: any) {
      setError(err?.message || 'Could not read payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  /*
   * Only captured payments, newest first. A pending checkout cannot be
   * refunded and listing it invites somebody to try.
   */
  const refundablePayments = useMemo(
    () => payments
      .filter((p) => String(p.status || '') === 'paid')
      .sort((a, b) => String(b.paidAt || b.createdAt || '').localeCompare(String(a.paidAt || a.createdAt || ''))),
    [payments],
  );

  const start = (p: Payment) => {
    const left = refundable(p);
    setOpenFor(p.id);
    // Pre-filled with the whole job amount. A blank box is where a typo lives.
    setAmount(left.principal.toFixed(2));
    setIncludeTip(false);
    setNote('');
  };

  const submit = async (p: Payment) => {
    setBusy(true);
    try {
      const res = await fetch(`${SERVER}/payments/${p.id}/refund`, {
        method: 'POST',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          amount: Number(amount),
          includeTip,
          note,
          reason: 'requested_by_customer',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `The refund did not go through (${res.status}).`);

      toast.success(`Refunded ${money(data.refund?.total)}`, {
        description: data.invoice
          ? `Invoice reopened — ${money(data.invoice.balance_due)} now due.`
          : 'No invoice attached to reopen.',
      });
      setOpenFor('');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not refund that payment.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400" style={{ padding: '24px' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Reading payments…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl" style={{ padding: '20px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="flex items-center gap-2 text-lg font-black text-white">
          <RotateCcw className="w-5 h-5 text-orange-400" /> Refunds
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Invoices and deposits. The money goes back on the Stripe account that took it, and the
          invoice reopens with the balance owing again.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          Store orders are refunded through the returns portal instead, which handles postage and
          store credit. This screen is for services payments.
        </p>
      </div>

      {error && (
        <div className="rounded-xl" style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-sm font-bold text-red-400">{error}</p>
          <button onClick={() => void load()} className="mt-2 text-xs font-bold text-orange-400">Try again</button>
        </div>
      )}

      {refundablePayments.length === 0 && !error && (
        <div className="rounded-2xl text-center" style={{ padding: '32px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm text-gray-400">No captured payments yet.</p>
          <p className="mt-1 text-xs text-gray-600">
            Anything a customer pays through the portal will appear here, refundable.
          </p>
        </div>
      )}

      {refundablePayments.map((p) => {
        const left = refundable(p);
        const spent = left.total <= 0;
        const store = p.paymentRail === 'tbpco_ecommerce';
        return (
          <div key={p.id} className="rounded-2xl" style={{
            padding: '18px',
            background: '#0d0d0d',
            border: `1px solid ${spent ? 'rgba(255,255,255,0.08)' : 'rgba(234,88,12,0.25)'}`,
          }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-black text-white tabular-nums">
                  {money(p.amount)}
                  {Number(p.tip) > 0 && (
                    <span className="ml-2 text-sm font-bold text-orange-300">+ {money(p.tip)} tip</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {p.customerEmail || 'unknown'} · {String(p.paidAt || p.createdAt || '').slice(0, 10)}
                  {' · '}{store ? 'TBPCO' : 'Black Phoenix Builds'}
                  {p.paymentMethod === 'us_bank_account' ? ' · bank' : ' · card'}
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {p.invoiceId
                    ? <span className="inline-flex items-center gap-1"><Receipt className="w-3 h-3" /> invoice {p.invoiceId}</span>
                    : 'deposit or ad-hoc — no invoice attached'}
                </p>
              </div>
              <div className="text-right">
                {left.refunded > 0 && (
                  <p className="text-[11px] font-bold text-gray-400">{money(left.refunded)} already refunded</p>
                )}
                <p className={`text-[11px] font-black ${spent ? 'text-gray-500' : 'text-orange-400'}`}>
                  {spent ? 'fully refunded' : `${money(left.total)} refundable`}
                </p>
              </div>
            </div>

            {!p.stripePaymentIntentId && (
              <p className="mt-3 flex items-start gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                No Stripe payment intent recorded, so this one cannot be refunded automatically.
                It would have to be done in the Stripe dashboard.
              </p>
            )}

            {!spent && p.stripePaymentIntentId && openFor !== p.id && (
              <button
                onClick={() => start(p)}
                className="mt-3 rounded-xl text-sm font-black text-black"
                style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '10px 16px' }}
              >
                Refund…
              </button>
            )}

            {openFor === p.id && (
              <div className="mt-3 rounded-xl space-y-3" style={{ padding: '14px', background: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.3)' }}>
                <label className="block">
                  <span className="text-xs font-bold text-gray-300">Amount to refund</span>
                  <input
                    type="number" inputMode="decimal" min={0} step="0.01"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg text-sm text-white bg-transparent"
                    style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '10px 12px' }}
                  />
                  <span className="mt-1 block text-[11px] text-gray-500">
                    Up to {money(left.principal)} of the job
                    {left.tip > 0 && `, plus ${money(left.tip)} of gratuity if you include it below`}.
                  </span>
                </label>

                {left.tip > 0 && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox" checked={includeTip}
                      onChange={(e) => setIncludeTip(e.target.checked)}
                      className="mt-0.5 accent-orange-500"
                    />
                    <span className="text-xs leading-relaxed text-gray-300">
                      <span className="inline-flex items-center gap-1 font-bold text-orange-300">
                        <Heart className="w-3 h-3" /> Also refund the {money(left.tip)} gratuity
                      </span>
                      <span className="block text-gray-500">
                        The crew stops being owed it. Leave this unticked and their tip is untouched.
                      </span>
                    </span>
                  </label>
                )}

                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  placeholder="Why, for the record"
                  className="w-full rounded-lg text-sm text-white bg-transparent"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '10px 12px' }}
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => void submit(p)} disabled={busy || !(Number(amount) > 0)}
                    className="flex-1 rounded-xl text-sm font-black text-black disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '12px' }}
                  >
                    {busy
                      ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Refunding…</span>
                      : `Refund ${money(Number(amount) + (includeTip ? left.tip : 0))}`}
                  </button>
                  <button
                    onClick={() => setOpenFor('')} disabled={busy}
                    className="rounded-xl text-sm font-black text-gray-300"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '12px 20px' }}
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-gray-600">
                  This moves money on Stripe immediately and cannot be undone from here.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
