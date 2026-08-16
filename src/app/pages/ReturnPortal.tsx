/**
 * ReturnPortal — where a customer starts a return themselves.
 *
 * Public by design: shoppers check out as guests and have no account to log
 * into. The order number alone proves nothing — the email on the order has to
 * match — and the server returns an identical message whether the order is
 * missing or the email is wrong, so this cannot be used to discover which order
 * numbers exist.
 *
 * The screen leads with store credit because it is worth more to the customer
 * and keeps the money in the business. The cash refund sits right beside it; the
 * point is to make the better option obvious, not to hide the other one.
 */
import { useCallback, useState } from 'react';
import { Loader2, Package, Check, AlertTriangle, ArrowLeft, Gift, CreditCard } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const REASONS = [
  'Arrived damaged',
  'Wrong item sent',
  'Not as described',
  'Does not fit',
  'Changed my mind',
  'Arrived too late',
];

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

interface Line { lineId: string; name: string; sku: string; price: number; quantity: number; image?: string }

export default function ReturnPortal() {
  const [step, setStep] = useState<'lookup' | 'choose' | 'done'>('lookup');
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [order, setOrder] = useState<any>(null);
  const [eligible, setEligible] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState<string | null>(null);
  const [bonus, setBonus] = useState(10);

  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [resolution, setResolution] = useState<'store_credit' | 'refund'>('store_credit');
  const [result, setResult] = useState<any>(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey };

  const lookup = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${SERVER}/returns/lookup`, {
        method: 'POST', headers,
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { setError(data?.error || 'We could not find that order.'); return; }
      setOrder(data.order);
      setEligible(data.eligible);
      setIneligibleReason(data.reason);
      setBonus(data.policy?.storeCreditBonusPercent ?? 10);
      setStep('choose');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [orderId, email]);

  const submit = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${SERVER}/returns/request`, {
        method: 'POST', headers,
        body: JSON.stringify({
          orderId: orderId.trim(), email: email.trim(),
          lineIds: selected, reason, detail, resolution, photos: [],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { setError(data?.error || 'We could not submit your return.'); return; }
      setResult(data);
      setStep('done');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [orderId, email, selected, reason, detail, resolution]);

  const lines: Line[] = order?.items || [];
  const chosen = lines.filter(l => selected.includes(l.lineId));
  const refundValue = chosen.reduce((n, l) => n + l.price * l.quantity, 0);
  const creditValue = refundValue * (1 + bonus / 100);

  const input = 'w-full px-4 py-3 bg-white border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900';

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-7 h-7 text-neutral-900" />
          <h1 className="text-2xl font-bold text-neutral-900">Start a return</h1>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {step === 'lookup' && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
            <p className="text-neutral-600">
              Enter the order number from your confirmation email, and the email address you
              ordered with.
            </p>
            <input className={input} placeholder="Order number (e.g. BP-1A2B3C4D)"
              value={orderId} onChange={e => setOrderId(e.target.value)} />
            <input className={input} placeholder="Email address" type="email"
              value={email} onChange={e => setEmail(e.target.value)} />
            <button onClick={lookup} disabled={busy || !orderId.trim() || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold rounded-xl py-3 disabled:opacity-40">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Find my order
            </button>
          </div>
        )}

        {step === 'choose' && order && (
          <div className="space-y-4">
            <button onClick={() => { setStep('lookup'); setError(null); }}
              className="flex items-center gap-1.5 text-sm text-neutral-600">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {!eligible ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                <h2 className="font-bold text-neutral-900 mb-2">This order can’t be returned</h2>
                <p className="text-neutral-600">{ineligibleReason}</p>
                <p className="text-neutral-600 mt-3">
                  If something is wrong with your order, reply to your confirmation email and a
                  person will help.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                  <h2 className="font-bold text-neutral-900 mb-4">What are you returning?</h2>
                  <div className="space-y-2">
                    {lines.map(l => {
                      const on = selected.includes(l.lineId);
                      return (
                        <button key={l.lineId}
                          onClick={() => setSelected(p => on ? p.filter(x => x !== l.lineId) : [...p, l.lineId])}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left"
                          style={{ borderColor: on ? '#171717' : '#e5e5e5' }}>
                          {l.image
                            ? <img src={l.image} alt="" className="w-14 h-14 rounded-lg object-cover" />
                            : <div className="w-14 h-14 rounded-lg bg-neutral-100" />}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-neutral-900 truncate">{l.name}</div>
                            <div className="text-sm text-neutral-500">×{l.quantity} · {money(l.price)}</div>
                          </div>
                          {on && <Check className="w-5 h-5 text-neutral-900 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selected.length > 0 && (
                  <>
                    <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                      <h2 className="font-bold text-neutral-900 mb-4">What went wrong?</h2>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {REASONS.map(r => (
                          <button key={r} onClick={() => setReason(r)}
                            className="px-3 py-2 rounded-lg text-sm border-2 transition"
                            style={{
                              borderColor: reason === r ? '#171717' : '#e5e5e5',
                              color: reason === r ? '#171717' : '#525252',
                              fontWeight: reason === r ? 600 : 400,
                            }}>
                            {r}
                          </button>
                        ))}
                      </div>
                      <textarea className={`${input} min-h-[80px]`} value={detail}
                        onChange={e => setDetail(e.target.value)}
                        placeholder="Anything else we should know (optional)" />
                    </div>

                    <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                      <h2 className="font-bold text-neutral-900 mb-4">How would you like it back?</h2>
                      <div className="space-y-3">
                        <button onClick={() => setResolution('store_credit')}
                          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition"
                          style={{ borderColor: resolution === 'store_credit' ? '#171717' : '#e5e5e5' }}>
                          <Gift className="w-5 h-5 text-neutral-900 shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-neutral-900">
                              {money(creditValue)} store credit
                            </div>
                            <div className="text-sm text-neutral-500">
                              {bonus}% more than a refund · arrives instantly
                            </div>
                          </div>
                          {resolution === 'store_credit' && <Check className="w-5 h-5 shrink-0" />}
                        </button>
                        <button onClick={() => setResolution('refund')}
                          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition"
                          style={{ borderColor: resolution === 'refund' ? '#171717' : '#e5e5e5' }}>
                          <CreditCard className="w-5 h-5 text-neutral-900 shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-neutral-900">
                              {money(refundValue)} back to your card
                            </div>
                            <div className="text-sm text-neutral-500">5–10 business days</div>
                          </div>
                          {resolution === 'refund' && <Check className="w-5 h-5 shrink-0" />}
                        </button>
                      </div>

                      <button onClick={submit} disabled={busy || !reason}
                        className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white font-semibold rounded-xl py-3 mt-5 disabled:opacity-40">
                        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Submit return
                      </button>
                      {!reason && (
                        <p className="text-sm text-neutral-500 mt-2 text-center">Pick a reason to continue.</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {step === 'done' && result && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-700" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">
              {result.request.status === 'approved' ? 'Approved' : 'Return submitted'}
            </h2>
            <p className="text-neutral-600">{result.message}</p>
            <p className="text-sm text-neutral-500 mt-4">
              Reference <span className="font-mono text-neutral-900">{result.request.id}</span>
            </p>
            {result.request.requiresItemBack && (
              <p className="text-sm text-neutral-600 mt-4">
                We’ll email you return instructions shortly.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
