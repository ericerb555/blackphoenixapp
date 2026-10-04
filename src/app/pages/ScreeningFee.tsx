/**
 * The screening fee disclosure, for an applicant with no account.
 *
 * This page exists because `RSA 540-A:3 VIII` requires the amount and the
 * satisfactory-check requirement to be disclosed in writing *before* any fee is
 * collected. So there is no payment button until the server has returned the
 * disclosure, and the Stripe session does not exist until the applicant has
 * acknowledged it — the accept call is what creates it.
 *
 * Every word shown here comes from the server, which also stores it against the
 * order. What the applicant saw and what we kept cannot drift apart.
 */
import { useEffect, useState } from 'react';
import { Home, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from '../utils/authHeaders';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

function getToken() {
  const p = new URLSearchParams(window.location.search);
  return p.get('t') || p.get('token') || '';
}

export default function ScreeningFee() {
  const [token] = useState(getToken());
  const [state, setState] = useState<'loading' | 'ready' | 'paid' | 'error'>('loading');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [disclosure, setDisclosure] = useState<any>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!token) { setState('error'); setError('This payment link is missing its access token.'); return; }
      try {
        const res = await fetch(`${API}/screening/fee/${token}`, { headers: await authedHeadersOrAnon(publicAnonKey) });
        const data = await res.json();
        if (!live) return;
        if (!data.success) throw new Error(data.error || 'This payment link is invalid or has expired.');
        if (data.alreadyPaid) { setState('paid'); return; }
        setName(data.applicantName || '');
        setDisclosure(data.disclosure);
        setState('ready');
      } catch (e: any) {
        if (live) { setState('error'); setError(e.message || 'This payment link is invalid or has expired.'); }
      }
    })();
    return () => { live = false; };
  }, [token]);

  const pay = async () => {
    try {
      setBusy(true); setError('');
      const res = await fetch(`${API}/screening/fee/${token}/accept`, {
        method: 'POST',
        headers: await authedHeadersOrAnon(publicAnonKey),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unable to start the payment.');
      if (data.alreadyPaid) { setState('paid'); return; }
      if (!data.checkoutUrl) throw new Error('Unable to start the payment.');
      window.location.href = data.checkoutUrl;
    } catch (e: any) { setError(e.message || 'Unable to start the payment.'); }
    finally { setBusy(false); }
  };

  const shell = (children: any) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>
    </div>
  );

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>;
  }

  if (state === 'error') {
    return shell(
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-semibold text-slate-900">Payment unavailable</h1>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
      </div>,
    );
  }

  if (state === 'paid') {
    return shell(
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
        <h1 className="text-lg font-semibold text-slate-900">Already paid</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your screening fee has been received and your application is moving forward. You can close this page.
        </p>
      </div>,
    );
  }

  const amount = `$${((disclosure?.amountCents ?? 0) / 100).toFixed(2)}`;

  return shell(
    <>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white"><Home className="h-6 w-6" /></div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Screening fee</h1>
          <p className="text-sm text-slate-500">{name ? `For ${name}'s rental application` : 'For your rental application'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-3xl font-semibold text-slate-900">{amount}</div>
        <div className="text-xs text-slate-500">due before the background and credit check is run</div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {(disclosure?.statements || []).map((s: string, i: number) => (
          <li key={i} className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            <span>{s}</span>
          </li>
        ))}
      </ul>

      <label className="mt-5 flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600"
        />
        I have read the above and agree to pay the screening fee.
      </label>

      {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <button
        onClick={pay}
        disabled={!acknowledged || busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue to payment
      </button>

      <p className="mt-3 text-center text-xs text-slate-400">
        Payment is handled by Stripe. Your card details are never seen by the landlord or by this site.
      </p>
    </>,
  );
}
