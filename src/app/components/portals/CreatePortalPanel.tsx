import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import {
  UserPlus, Mail, Phone, User, Building2, Send, LoaderCircle, CheckCircle,
  ShieldCheck, Clock, Copy, Eye, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const PORTAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'property_manager', label: 'Property Manager' },
  { value: 'condo_manager', label: 'Condo Manager' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'employee', label: 'Employee' },
  { value: 'advertiser', label: 'Advertiser' },
  { value: 'investor', label: 'Investor' },
  { value: 'territory_owner', label: 'Territory Owner' },
];

interface InviteResult {
  name: string; email: string; phone?: string; portalType: string;
  invitationSent: boolean; inviteNotice?: string;
  smsSent?: boolean; smsNotice?: string;
  emailProvider?: string; inviteLink?: string | null;
}

export default function CreatePortalPanel() {
  const { session } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', portalType: 'customer' });
  const [fullAccess, setFullAccess] = useState(true);
  const [trialMonths, setTrialMonths] = useState(6);
  // Delivery channels. Email on by default; SMS opt-in (Twilio must be configured).
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewing, setPreviewing] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openPreview = async () => {
    if (!session?.access_token) { toast.error('Sign in again to preview the email.'); return; }
    setPreviewing(true);
    try {
      const params = new URLSearchParams({
        name: form.name.trim() || 'Jordan Smith',
        portalType: form.portalType,
        fullAccess: String(fullAccess),
        trialMonths: String(trialMonths),
      });
      const response = await fetch(`${SERVER}/owner-provisioning/invite-preview?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not load the preview.');
      setPreviewSubject(payload.subject || '');
      setPreviewHtml(payload.html || '');
    } catch (error: any) {
      console.error('[CreatePortalPanel] Preview error:', error);
      toast.error(error?.message || 'Could not load the email preview.');
    } finally { setPreviewing(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) { toast.error('Full name, email, and phone are all required.'); return; }
    if (!sendEmail && !sendSms) { toast.error('Pick at least one way to send the invite — email or SMS.'); return; }
    if (!session?.access_token) { toast.error('Sign in again before creating a portal.'); return; }
    setSubmitting(true); setResult(null);
    try {
      const response = await fetch(`${SERVER}/owner-provisioning/invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fullAccess, trialMonths, sendEmail, sendSms }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not create the portal.');
      const invite = payload.invite as InviteResult;
      setResult(invite);

      // Report the ACTUAL delivery outcome per channel — don't claim success if
      // nothing was delivered. Surface the server's notice so failures are visible.
      const emailOk = sendEmail && invite.invitationSent;
      const smsOk = sendSms && invite.smsSent;
      const emailFailed = sendEmail && !invite.invitationSent;
      const smsFailed = sendSms && !invite.smsSent;

      if ((sendEmail && emailOk || !sendEmail) && (sendSms && smsOk || !sendSms) && (emailOk || smsOk)) {
        const channels = [emailOk && 'email', smsOk && 'SMS'].filter(Boolean).join(' + ');
        toast.success(`Portal created — invite sent via ${channels} to ${invite.name}.`);
      } else if (emailOk || smsOk) {
        // Partial: one channel worked, the other didn't.
        const okCh = emailOk ? 'email' : 'SMS';
        const badNotice = emailFailed ? (invite.inviteNotice || 'email failed') : (invite.smsNotice || 'SMS failed');
        toast.warning(`Portal created and sent via ${okCh}, but the other channel didn't send: ${badNotice}`, { duration: 9000 });
      } else {
        // Nothing delivered — show why.
        const reason = [emailFailed && `Email: ${invite.inviteNotice || 'not delivered'}`, smsFailed && `SMS: ${invite.smsNotice || 'not delivered'}`].filter(Boolean).join(' · ');
        toast.error(`Portal record created, but the invite did NOT send. ${reason || 'Check email/SMS configuration.'}`, { duration: 12000 });
      }
      setForm({ name: '', email: '', phone: '', portalType: form.portalType });
    } catch (error: any) { toast.error(error?.message || 'Could not create the portal.'); }
    finally { setSubmitting(false); }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900"><UserPlus className="h-5 w-5 text-red-600" /> Create a Portal</h2>
        <p className="mt-1 text-sm text-gray-500">
          Provision any portal for someone with their name, email, and phone. They receive a secure sign-in link, finish a short application on first login, and — if you grant it — get full control of every feature for a trial period before they need to buy a plan.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">Full name</label>
          <div className="relative"><User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jordan Smith" className={`${inputClass} pl-9`} /></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Email</label>
            <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jordan@email.com" className={`${inputClass} pl-9`} /></div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Phone</label>
            <div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" className={`${inputClass} pl-9`} /></div>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">Portal type</label>
          <div className="relative"><Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><select value={form.portalType} onChange={e => set('portalType', e.target.value)} className={`${inputClass} pl-9 appearance-none`}>{PORTAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        </div>

        {/* Trial grant */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={fullAccess} onChange={e => setFullAccess(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900"><ShieldCheck className="h-4 w-4 text-red-600" /> Grant full access to all features</span>
              <span className="mt-0.5 block text-xs text-gray-500">They get complete control of every feature for the trial window, then must choose a plan to keep access.</span>
            </span>
          </label>
          {fullAccess && (
            <div className="mt-3 flex items-center gap-2 pl-7">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Trial length</span>
              <input type="number" min={1} max={24} value={trialMonths} onChange={e => setTrialMonths(Math.min(24, Math.max(1, Number(e.target.value) || 1)))} className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-900 outline-none focus:border-red-500" />
              <span className="text-sm text-gray-600">months</span>
            </div>
          )}
        </div>

        {/* Delivery channels */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">How to send the invite</p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-800">Email the secure sign-in link</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-800">Text the sign-in link via SMS <span className="text-gray-400">(to {form.phone.trim() || 'their phone'})</span></span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={openPreview} disabled={previewing} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 sm:w-auto">
            {previewing ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Loading…</> : <><Eye className="h-4 w-4" /> Preview email</>}
          </button>
          <button type="submit" disabled={submitting} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
            {submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Creating portal & sending link…</> : <><Send className="h-4 w-4" /> Create portal & send sign-in link</>}
          </button>
        </div>
      </form>

      {previewHtml !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewHtml(null)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email preview — exactly what they'll receive</p>
                <p className="truncate text-sm font-bold text-gray-900">Subject: {previewSubject}</p>
              </div>
              <button onClick={() => setPreviewHtml(null)} className="ml-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <iframe title="Invitation email preview" srcDoc={previewHtml} className="h-[70vh] w-full flex-1 border-0 bg-gray-100" sandbox="" />
          </div>
        </div>
      )}

      {result && (() => {
        const emailAttempted = sendEmail;
        const smsAttempted = sendSms;
        const anyDelivered = (emailAttempted && result.invitationSent) || (smsAttempted && result.smsSent);
        const tone = anyDelivered ? 'green' : 'amber';
        const border = tone === 'green' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50';
        const head = tone === 'green' ? 'text-green-800' : 'text-amber-800';
        const bodyText = tone === 'green' ? 'text-green-700' : 'text-amber-800';
        return (
        <div className={`rounded-xl border p-5 ${border}`}>
          <div className={`flex items-center gap-2 text-sm font-bold ${head}`}><CheckCircle className="h-5 w-5" /> Portal created for {result.name}</div>

          {/* Per-channel delivery status */}
          <div className={`mt-3 space-y-1.5 text-sm ${bodyText}`}>
            {emailAttempted && (
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {result.invitationSent
                    ? <>Sign-in email sent to <strong>{result.email}</strong>{result.emailProvider ? ` (via ${result.emailProvider})` : ''}.</>
                    : <>Email did <strong>not</strong> send: {result.inviteNotice || 'delivery failed.'}</>}
                </span>
              </div>
            )}
            {smsAttempted && (
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {result.smsSent
                    ? <>Text message sent to <strong>{result.phone}</strong>.</>
                    : <>SMS did <strong>not</strong> send: {result.smsNotice || 'delivery failed.'}</>}
                </span>
              </div>
            )}
          </div>

          <p className={`mt-3 text-sm ${bodyText}`}>
            On first sign-in they'll complete a short application and land in their {PORTAL_OPTIONS.find(p => p.value === result.portalType)?.label} portal.
          </p>

          <div className="mt-3 flex flex-wrap gap-4">
            <button onClick={() => { navigator.clipboard?.writeText(result.email); toast.success('Email copied.'); }} className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${head}`}><Copy className="h-3.5 w-3.5" /> Copy email</button>
            {result.inviteLink && (
              <button onClick={() => { navigator.clipboard?.writeText(result.inviteLink!); toast.success('Sign-in link copied — you can send it manually.'); }} className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${head}`}><Copy className="h-3.5 w-3.5" /> Copy sign-in link</button>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
