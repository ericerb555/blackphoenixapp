import { useEffect, useState } from 'react';
import { Home, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

function getToken() {
  const p = new URLSearchParams(window.location.search);
  return p.get('t') || p.get('token') || '';
}

export default function TenantApplication() {
  const [token] = useState(getToken());
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState<any>({
    name: '', email: '', phone: '', currentAddress: '', employer: '', income: '',
    creditScore: '', householdSize: '', pets: '', moveIn: '', desiredUnit: '',
    desiredRent: '', notes: '', consentBackground: false,
  });
  const set = (k: string) => (e: any) => setF((cur: any) => ({ ...cur, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    let live = true;
    (async () => {
      if (!token) { setValid(false); setError('This application link is missing its access token.'); return; }
      try {
        const res = await fetch(`${API}/screening/${token}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
        const data = await res.json();
        if (!live) return;
        if (!data.success) throw new Error(data.error || 'Invalid link');
        setValid(true);
      } catch (e: any) {
        if (live) { setValid(false); setError(e.message || 'This application link is invalid or has expired.'); }
      }
    })();
    return () => { live = false; };
  }, [token]);

  const submit = async (e: any) => {
    e.preventDefault();
    try {
      setSubmitting(true); setError('');
      const res = await fetch(`${API}/screening/${token}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unable to submit your application.');
      setDone(true);
    } catch (e: any) { setError(e.message || 'Unable to submit your application.'); }
    finally { setSubmitting(false); }
  };

  if (valid === null) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>;
  }
  if (valid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h1 className="text-lg font-semibold text-slate-900">Application unavailable</h1>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <h1 className="text-lg font-semibold text-slate-900">Application submitted</h1>
          <p className="mt-1 text-sm text-slate-500">Thank you, {f.name.split(' ')[0] || 'applicant'}! The landlord has received your application and will be in touch.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white"><Home className="h-6 w-6" /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Rental application</h1>
            <p className="text-sm text-slate-500">Complete the form below to apply.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelCls}>Full name *</label><input required className={inputCls} value={f.name} onChange={set('name')} /></div>
            <div><label className={labelCls}>Email *</label><input required type="email" className={inputCls} value={f.email} onChange={set('email')} /></div>
            <div><label className={labelCls}>Phone</label><input className={inputCls} value={f.phone} onChange={set('phone')} /></div>
            <div><label className={labelCls}>Desired move-in date</label><input type="date" className={inputCls} value={f.moveIn} onChange={set('moveIn')} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Current address</label><input className={inputCls} value={f.currentAddress} onChange={set('currentAddress')} /></div>
            <div><label className={labelCls}>Employer</label><input className={inputCls} value={f.employer} onChange={set('employer')} /></div>
            <div><label className={labelCls}>Annual income ($)</label><input type="number" className={inputCls} value={f.income} onChange={set('income')} /></div>
            <div><label className={labelCls}>Credit score (est.)</label><input className={inputCls} value={f.creditScore} onChange={set('creditScore')} /></div>
            <div><label className={labelCls}>Household size</label><input type="number" className={inputCls} value={f.householdSize} onChange={set('householdSize')} /></div>
            <div><label className={labelCls}>Desired unit</label><input className={inputCls} value={f.desiredUnit} onChange={set('desiredUnit')} /></div>
            <div><label className={labelCls}>Desired rent ($)</label><input type="number" className={inputCls} value={f.desiredRent} onChange={set('desiredRent')} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Pets</label><input className={inputCls} value={f.pets} onChange={set('pets')} placeholder="e.g. 1 cat" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Anything else?</label><textarea rows={3} className={inputCls} value={f.notes} onChange={set('notes')} /></div>
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={f.consentBackground} onChange={set('consentBackground')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600" />
            I consent to a background and credit check as part of this application.
          </label>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit application
          </button>
        </form>
      </div>
    </div>
  );
}
