import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const SAFE_PORTALS = new Set(['customer-portal-app', 'vendor-portal', 'advertiser-portal', 'subcontractor-portal', 'employee-portal', 'investor-portal', 'property-manager-portal', 'condo-manager-portal', 'landlord-portal', 'territory-portal']);

export default function PaymentComplete({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [state, setState] = useState<'checking' | 'paid' | 'processing' | 'error'>('checking');
  const [message, setMessage] = useState('Verifying your secure Stripe payment…');
  const { paymentId, sessionId, returnTo } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('return_to') || 'customer-portal-app';
    return { paymentId: params.get('payment_id') || '', sessionId: params.get('session_id') || '', returnTo: SAFE_PORTALS.has(requested) ? requested : 'customer-portal-app' };
  }, []);

  const verify = async () => {
    if (!paymentId || !sessionId) { setState('error'); setMessage('We could not find a payment confirmation in this link.'); return; }
    setState('checking'); setMessage('Verifying your secure Stripe payment…');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again, then return to your invoice to complete payment confirmation.');
      const response = await fetch(`${SERVER}/payments/complete`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, sessionId }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Stripe could not confirm this payment yet.');
      if (result.processing) { setState('processing'); setMessage(result.message || 'Your bank payment is processing. We will update the invoice when Stripe confirms settlement.'); }
      else { setState('paid'); setMessage('Your payment is confirmed and your invoice has been updated.'); }
    } catch (error: any) { setState('error'); setMessage(error?.message || 'Unable to confirm your payment.'); }
  };

  useEffect(() => { verify(); }, []);
  const continueToPortal = () => onNavigate ? onNavigate(returnTo) : window.location.assign(`/${returnTo}`);

  return <main className="min-h-screen bg-[#080808] px-5 py-20 text-white"><section className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#121212] p-8 text-center shadow-2xl">
    <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${state === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : state === 'processing' ? 'bg-amber-500/15 text-amber-400' : state === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400'}`}>
      {state === 'checking' || state === 'processing' ? <LoaderCircle className={`h-8 w-8 ${state === 'checking' ? 'animate-spin' : ''}`} /> : state === 'paid' ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
    </div>
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Black Phoenix secure payments</p>
    <h1 className="text-2xl font-bold">{state === 'paid' ? 'Payment received' : state === 'processing' ? 'Bank payment processing' : state === 'error' ? 'Payment needs attention' : 'Confirming payment'}</h1>
    <p className="mt-3 leading-6 text-gray-400">{message}</p>
    {(state === 'paid' || state === 'processing') && <div className={`mt-6 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm ${state === 'processing' ? 'border-amber-500/20 bg-amber-500/5 text-amber-300' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'}`}><ShieldCheck className="h-4 w-4" /> Verified directly with Stripe</div>}
    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
      {state === 'error' && <button onClick={verify} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-semibold text-gray-200 transition hover:bg-white/5"><RefreshCw className="h-4 w-4" /> Try again</button>}
      <button onClick={continueToPortal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white transition hover:bg-orange-500">Return to portal <ArrowRight className="h-4 w-4" /></button>
    </div>
  </section></main>;
}
