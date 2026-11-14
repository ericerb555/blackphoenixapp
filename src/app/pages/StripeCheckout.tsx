/**
 * Stripe Elements Checkout
 *
 * Secure, PCI-compliant card entry (Stripe Payment Element). The card details
 * never touch our server — Stripe collects them directly. We create a
 * PaymentIntent server-side that routes funds to the selected company's
 * connected bank account and tags the charge with the company code
 * (BPB-8544 / TBPC-9922), then confirm it here in the browser.
 */
import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements, PaymentElement, useStripe, useElements,
} from '@stripe/react-stripe-js';
import { Building2, CreditCard, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import { cardFeeFor, CARD_FEE_LINE, CARD_FEE_LABEL, CARD_FEE_NOTICE } from '../lib/cardFee';
import { STRIPE_PUBLISHABLE_KEY } from '../utils/stripe/config';
import { API_BASE_URL } from '../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface Company {
  id: string;
  name: string;
  code: string;
  stripeKeyEnv?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: await authedHeadersOrAnon(publicAnonKey),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Inner form (must be inside <Elements>) ──────────────────────────────────
function CheckoutForm({
  paymentId, companyCode, amount, onDone,
}: { paymentId: string; companyCode: string; amount: number; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message || 'Card details are incomplete');
      setProcessing(false);
      return;
    }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmErr) {
      setError(confirmErr.message || 'Payment failed');
      setProcessing(false);
      return;
    }

    // Sync final status to our records (best-effort).
    try { await api(`/stripe/finalize/${paymentId}`, 'POST'); } catch { /* non-fatal */ }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      toast.success(`Payment ${paymentIntent.status} — routed to ${companyCode}`);
      onDone();
    } else {
      setError('Payment did not complete. Please try again.');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#ea580c] hover:bg-[#dc2626] disabled:opacity-50 rounded-lg font-semibold"
      >
        <Lock className="w-4 h-4" />
        {processing ? 'Processing…' : `Pay $${amount.toFixed(2)}`}
      </button>
      {/*
        THE DISCLAIMER, at the moment of paying.
        Eric: "add a disclaimer that 3percent will be added when using a card
        to process payment checks and cash are accepted as well."
        A surcharge has to be disclosed before the customer commits, and the
        alternatives named — a fee you cannot avoid is a charge, a fee you can
        is a choice.
      */}
      <p className="text-xs text-amber-300/90 text-center">{CARD_FEE_NOTICE}</p>
      <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Secured by Stripe · funds route to {companyCode}
      </p>
    </form>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function StripeCheckout() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [amount, setAmount] = useState('49.99');
  const [description, setDescription] = useState('Order payment');
  const [email, setEmail] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let list = (await api('/stripe/companies')).companies as Company[];
        if (!list || list.length === 0) {
          list = (await api('/stripe/seed', 'POST')).companies;
        }
        setCompanies(list || []);
        const ready = (list || []).find((co) => co.chargesEnabled);
        if (ready) setCompanyId(ready.id);
        else if (list?.[0]) setCompanyId(list[0].id);
      } catch (err: any) {
        toast.error(`Failed to load companies: ${err.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selected = useMemo(() => companies.find((c) => c.id === companyId), [companies, companyId]);

  const startCheckout = async () => {
    const amt = parseFloat(amount);
    if (!companyId) { toast.error('Select a company'); return; }
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (selected && !selected.chargesEnabled) {
      toast.error(`${selected.name}'s Stripe account isn't active yet — check it on the Company Bank Routing page first.`);
      return;
    }
    try {
      setStarting(true);
      /*
       * THE CARD FEE IS PART OF WHAT IS CHARGED, not a note beside it.
       *
       * Eric: "3percent will be added when using a card to process payment".
       * This screen only ever takes a card — Stripe's Payment Element is the
       * whole of it — so the fee always applies here, and the figure sent to
       * Stripe is the one the customer's statement will show.
       *
       * The description carries it too. A cardholder reading "Order payment
       * $1,030" against a $1,000 invoice disputes it; one reading "Order
       * payment (incl. 3% card fee)" does not.
       */
      const fee = cardFeeFor(amt, 'card');
      const charged = Math.round((amt + fee) * 100) / 100;
      const res = await api('/stripe/create-payment-intent', 'POST', {
        companyId,
        amount: charged,
        description: fee > 0
          ? `${description} (incl. ${CARD_FEE_LABEL} card fee $${fee.toFixed(2)})`
          : description,
        customerEmail: email || undefined,
      });
      setClientSecret(res.clientSecret);
      setPaymentId(res.paymentId);
      setCompanyCode(res.companyCode);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setClientSecret(null); setPaymentId(null); setDone(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] text-gray-500 flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#ea580c]" /> Checkout
          </h1>
          <p className="text-gray-400 text-sm mt-1">Secure card payment routed to the selected company's bank.</p>
        </div>

        {done ? (
          <div className="bg-[#1A1A1A] border border-green-500/30 rounded-xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto" />
            <h2 className="text-xl font-bold">Payment complete</h2>
            <p className="text-gray-400 text-sm">${parseFloat(amount).toFixed(2)} routed to {companyCode}.</p>
            <button onClick={reset} className="px-4 py-2 bg-[#ea580c] hover:bg-[#dc2626] rounded-lg font-medium">
              New Payment
            </button>
          </div>
        ) : clientSecret ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
            {/*
              The breakdown the cardholder is entitled to before they pay:
              what the work cost, what the fee is, and what will leave their
              account. A single "Paying $1,030" over a $1,000 invoice is the
              line that generates the chargeback.
            */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Amount</span>
                <span>${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{CARD_FEE_LINE}</span>
                <span>${cardFeeFor(parseFloat(amount), 'card').toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#2A2A2A]">
                <span className="font-semibold">Total charged</span>
                <span className="font-semibold">
                  ${(parseFloat(amount) + cardFeeFor(parseFloat(amount), 'card')).toFixed(2)} → {companyCode}
                </span>
              </div>
            </div>
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#ea580c' } } }}
            >
              <CheckoutForm
                paymentId={paymentId!}
                companyCode={companyCode}
                /*
                 * THE AMOUNT THAT WILL ACTUALLY BE CHARGED, fee included.
                 * This passed the pre-fee figure, so the button would have
                 * read "Pay $1,000.00" while Stripe took $1,030.00 — the
                 * button saying one thing and the money doing another, which
                 * is the whole of what went wrong on the quote PDF this week.
                 */
                amount={parseFloat(amount) + cardFeeFor(parseFloat(amount), 'card')}
                onDone={() => setDone(true)}
              />
            </Elements>
            <button onClick={reset} className="w-full py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
            {/* Company selector */}
            <div>
              <label className="text-xs text-gray-400">Company (receives funds)</label>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {companies.map((co) => {
                  const ready = !!co.chargesEnabled;
                  return (
                    <button
                      key={co.id}
                      onClick={() => setCompanyId(co.id)}
                      className={`flex items-center justify-between px-3 py-3 rounded-lg border text-left ${
                        companyId === co.id ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-[#2A2A2A] bg-[#0A0A0A]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#ea580c]" />
                        <span>
                          <span className="block text-sm">{co.name}</span>
                          <span className="block text-xs font-mono text-[#ea580c]">{co.code}</span>
                        </span>
                      </span>
                      <span className={`text-xs ${ready ? 'text-green-400' : 'text-yellow-400'}`}>
                        {ready ? 'Bank ready' : 'No bank yet'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                {/*
                  LABELLED "BEFORE THE CARD FEE" because the fee is added
                  below. Without that word somebody types the figure they
                  intend to collect, the 3% goes on top, and the customer is
                  charged more than they were quoted — or it gets added by
                  hand here and charged twice.
                */}
                <label className="text-xs text-gray-400">Amount before card fee (USD)</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
                  className="w-full mt-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Email (receipt)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="optional"
                  className="w-full mt-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm" />
            </div>

            <button onClick={startCheckout} disabled={starting}
              className="w-full py-3 bg-[#ea580c] hover:bg-[#dc2626] disabled:opacity-50 rounded-lg font-semibold">
              {starting ? 'Starting…' : 'Continue to Payment'}
            </button>

            <div className="text-xs text-gray-500 bg-[#0A0A0A] rounded-lg p-3">
              <strong className="text-gray-400">Test card:</strong> 4242 4242 4242 4242 · any future date · any CVC · any ZIP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
