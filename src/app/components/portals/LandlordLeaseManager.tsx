import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Sparkles, Upload, Send, FileText, LoaderCircle, CheckCircle2,
  Plus, X, Download, Wand2, PenLine,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

interface Tenant { id: string; name: string; email?: string; unit?: string; rent?: number; }
interface Lease {
  id: string; title: string; tenantName?: string; tenantEmail: string;
  propertyAddress?: string; unit?: string; source: 'ai' | 'upload';
  status: 'sent' | 'signed'; fileName?: string | null; bodyText?: string;
  createdAt: string; signedAt?: string | null; signature?: string | null;
}

type Mode = 'list' | 'ai' | 'upload';

const EMPTY_DRAFT = {
  tenantId: '', tenantName: '', tenantEmail: '', propertyAddress: '', unit: '',
  monthlyRent: '', securityDeposit: '', leaseTerm: '12 months', startDate: '', endDate: '',
  state: 'New Hampshire', petsAllowed: false, utilitiesResponsibility: '', additionalTerms: '',
};

// State-specific statutory guidance fed to the AI so drafts respect local law.
const STATE_PRESETS: Record<string, string> = {
  'New Hampshire': 'NH RSA 540-A: security deposit capped at 1 month rent or $100 (whichever greater); deposit must be returned within 30 days; landlord must give written notice for entry; no statutory grace period but late fees must be reasonable.',
  'Massachusetts': 'MA G.L. c.186 §15B: security deposit capped at 1 month rent, must be held in separate interest-bearing MA bank account with receipt; last month rent handled separately; strict deposit return within 30 days.',
  'Maine': 'ME Title 14 §6031-6038: security deposit capped at 2 months rent; return within 30 days (21 for tenancy-at-will); 15-day notice before late fee, late fee capped at 4% of monthly rent.',
  'Texas': 'TX Property Code Ch.92: no statutory deposit cap; deposit returned within 30 days; late fees must be reasonable and disclosed; specific lock/security-device requirements apply.',
  'California': 'CA Civil Code §1950.5: deposit capped at 1 month (as of 2024 reform); return within 21 days with itemized statement; just-cause and rent-cap (AB 1482) may apply.',
  'Florida': 'FL Statute 83.49: no deposit cap; landlord must disclose where deposit is held; 15/30-day return notice rules; 3-day notice for nonpayment.',
  'New York': 'NY GOL §7-108: deposit capped at 1 month rent; return within 14 days with itemized statement; HSTPA limits fees; late fee capped at $50 or 5% whichever is less.',
  'Other': 'Follow the governing state\'s residential landlord-tenant statutes for deposit caps, return deadlines, entry notice, and late-fee limits.',
};
const STATE_OPTIONS = Object.keys(STATE_PRESETS);

// Standard lease sections offered for targeted regeneration.
const LEASE_SECTIONS = [
  'Rent', 'Security Deposit', 'Late Fees', 'Utilities', 'Pets', 'Maintenance & Repairs',
  'Tenant Obligations', 'Landlord Obligations', 'Entry & Access', 'Termination & Default',
  'Renter\'s Insurance', 'Governing Law',
];

function statusBadge(s: string) {
  return s === 'signed'
    ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

export default function LandlordLeaseManager({ session, tenants }: { session: any; tenants: Tenant[] }) {
  const [mode, setMode] = useState<Mode>('list');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [title, setTitle] = useState('Residential Lease Agreement');
  const [generating, setGenerating] = useState(false);
  const [leaseText, setLeaseText] = useState('');
  const [sending, setSending] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTenant, setUploadTenant] = useState({ tenantId: '', tenantName: '', tenantEmail: '', propertyAddress: '', unit: '' });

  const [regenSection, setRegenSection] = useState(LEASE_SECTIONS[0]);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;

  const loadLeases = async () => {
    if (!authHeaders) { setLeases([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/landlord/leases`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load leases.');
      setLeases(Array.isArray(payload.leases) ? payload.leases : []);
    } catch (error: any) { setLeases([]); toast.error(error?.message || 'Unable to load leases.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadLeases(); }, [session?.access_token]);

  const pickTenant = (id: string, apply: (t: Tenant) => void) => {
    const t = tenants.find(x => x.id === id);
    if (t) apply(t);
  };

  const generateDraft = async () => {
    if (!draft.tenantName.trim() || !draft.propertyAddress.trim()) {
      toast.error('Enter at least the tenant name and property address.');
      return;
    }
    if (!authHeaders) { toast.error('Sign in to use the AI assistant.'); return; }
    setGenerating(true);
    try {
      const res = await fetch(`${SERVER}/landlord/leases/draft`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, stateGuidance: STATE_PRESETS[draft.state] || STATE_PRESETS.Other }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'AI drafting failed.');
      setLeaseText(payload.draft);
      toast.success('Draft ready — review and edit before sending.');
    } catch (error: any) { toast.error(error?.message || 'AI drafting failed.'); }
    finally { setGenerating(false); }
  };

  const regenerateSection = async () => {
    if (!leaseText.trim()) { toast.error('Generate a draft first.'); return; }
    if (!authHeaders) { toast.error('Sign in to use the AI assistant.'); return; }
    setRegenerating(true);
    try {
      const res = await fetch(`${SERVER}/landlord/leases/regenerate-section`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseText, section: regenSection, instruction: regenInstruction }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to revise the section.');
      setLeaseText(payload.draft);
      setRegenInstruction('');
      toast.success(`"${regenSection}" section updated.`);
    } catch (error: any) { toast.error(error?.message || 'Unable to revise the section.'); }
    finally { setRegenerating(false); }
  };

  const sendAiLease = async () => {
    if (!draft.tenantEmail.trim()) { toast.error("Enter the tenant's email to deliver the lease."); return; }
    if (!leaseText.trim()) { toast.error('Generate or write the lease text first.'); return; }
    if (!authHeaders) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append('tenantEmail', draft.tenantEmail);
      form.append('tenantName', draft.tenantName);
      form.append('title', title);
      form.append('propertyAddress', draft.propertyAddress);
      form.append('unit', draft.unit);
      form.append('bodyText', leaseText);
      const res = await fetch(`${SERVER}/landlord/leases`, { method: 'POST', headers: authHeaders, body: form });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to send the lease.');
      setLeases(prev => [payload.lease, ...prev]);
      toast.success(`Lease sent to ${draft.tenantEmail}'s portal.`);
      setDraft({ ...EMPTY_DRAFT }); setLeaseText(''); setTitle('Residential Lease Agreement'); setMode('list');
    } catch (error: any) { toast.error(error?.message || 'Unable to send the lease.'); }
    finally { setSending(false); }
  };

  const sendUploadedLease = async () => {
    if (!uploadFile) { toast.error('Choose a lease file to upload.'); return; }
    if (!uploadTenant.tenantEmail.trim()) { toast.error("Enter the tenant's email to deliver the lease."); return; }
    if (!authHeaders) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append('tenantEmail', uploadTenant.tenantEmail);
      form.append('tenantName', uploadTenant.tenantName);
      form.append('title', uploadFile.name.replace(/\.[^.]+$/, '') || 'Lease Agreement');
      form.append('propertyAddress', uploadTenant.propertyAddress);
      form.append('unit', uploadTenant.unit);
      form.append('file', uploadFile);
      const res = await fetch(`${SERVER}/landlord/leases`, { method: 'POST', headers: authHeaders, body: form });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to send the lease.');
      setLeases(prev => [payload.lease, ...prev]);
      toast.success(`Lease sent to ${uploadTenant.tenantEmail}'s portal.`);
      setUploadFile(null); setUploadTenant({ tenantId: '', tenantName: '', tenantEmail: '', propertyAddress: '', unit: '' }); setMode('list');
    } catch (error: any) { toast.error(error?.message || 'Unable to send the lease.'); }
    finally { setSending(false); }
  };

  const downloadLease = async (lease: Lease) => {
    if (!authHeaders) return;
    try {
      const res = await fetch(`${SERVER}/leases/${lease.id}/download`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to open the file.');
      window.open(payload.url, '_blank', 'noopener');
    } catch (error: any) { toast.error(error?.message || 'Unable to open the file.'); }
  };

  const inputClass = 'w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500';
  const labelClass = 'block text-xs font-semibold text-gray-400 mb-1.5';

  const tenantSelect = (value: string, onPick: (t: Tenant) => void) => (
    tenants.length > 0 ? (
      <div>
        <label className={labelClass}>Choose from your roster (optional)</label>
        <select value={value} onChange={e => pickTenant(e.target.value, onPick)} className={inputClass}>
          <option value="">— Select a saved tenant —</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}{t.unit ? ` · ${t.unit}` : ''}{t.email ? ` · ${t.email}` : ''}</option>)}
        </select>
      </div>
    ) : null
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Leases</h2>
          <p className="mt-1 text-sm text-gray-400">Build a lease with the AI assistant or upload one, then send it straight to your tenant's portal.</p>
        </div>
        {mode === 'list' ? (
          <div className="flex gap-2">
            <button onClick={() => setMode('ai')} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-500"><Wand2 className="h-4 w-4" /> AI Lease Builder</button>
            <button onClick={() => setMode('upload')} className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 px-4 py-2 text-sm font-bold text-teal-300 transition hover:bg-teal-500/10"><Upload className="h-4 w-4" /> Upload Lease</button>
          </div>
        ) : (
          <button onClick={() => setMode('list')} className="inline-flex items-center gap-2 rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white"><X className="h-4 w-4" /> Cancel</button>
        )}
      </div>

      {/* AI BUILDER */}
      {mode === 'ai' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-teal-500/25 bg-[#151515] p-5">
            <div className="flex items-center gap-2 text-teal-300"><Sparkles className="h-4 w-4" /><span className="text-sm font-bold">Lease details</span></div>
            {tenantSelect(draft.tenantId, t => setDraft(d => ({ ...d, tenantId: t.id, tenantName: t.name, tenantEmail: t.email || d.tenantEmail, unit: t.unit || d.unit, monthlyRent: t.rent ? String(t.rent) : d.monthlyRent })))}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className={labelClass}>Tenant name *</label><input value={draft.tenantName} onChange={e => setDraft(d => ({ ...d, tenantName: e.target.value }))} className={inputClass} placeholder="Jane Tenant" /></div>
              <div><label className={labelClass}>Tenant email *</label><input value={draft.tenantEmail} onChange={e => setDraft(d => ({ ...d, tenantEmail: e.target.value }))} className={inputClass} placeholder="jane@email.com" /></div>
              <div className="sm:col-span-2"><label className={labelClass}>Property address *</label><input value={draft.propertyAddress} onChange={e => setDraft(d => ({ ...d, propertyAddress: e.target.value }))} className={inputClass} placeholder="14 Oak St, Manchester, NH" /></div>
              <div><label className={labelClass}>Unit</label><input value={draft.unit} onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))} className={inputClass} placeholder="12A" /></div>
              <div><label className={labelClass}>Lease term</label><input value={draft.leaseTerm} onChange={e => setDraft(d => ({ ...d, leaseTerm: e.target.value }))} className={inputClass} placeholder="12 months" /></div>
              <div><label className={labelClass}>Monthly rent</label><input value={draft.monthlyRent} onChange={e => setDraft(d => ({ ...d, monthlyRent: e.target.value }))} className={inputClass} placeholder="$1,800" /></div>
              <div><label className={labelClass}>Security deposit</label><input value={draft.securityDeposit} onChange={e => setDraft(d => ({ ...d, securityDeposit: e.target.value }))} className={inputClass} placeholder="$1,800" /></div>
              <div><label className={labelClass}>Start date</label><input type="date" value={draft.startDate} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>End date</label><input type="date" value={draft.endDate} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} className={inputClass} /></div>
              <div><label className={labelClass}>State / governing law</label><select value={draft.state} onChange={e => setDraft(d => ({ ...d, state: e.target.value }))} className={inputClass}>{STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="flex items-end"><label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={draft.petsAllowed} onChange={e => setDraft(d => ({ ...d, petsAllowed: e.target.checked }))} className="h-4 w-4 rounded border-[#363636] bg-[#0A0A0A]" /> Pets allowed</label></div>
              <div className="sm:col-span-2"><label className={labelClass}>Utilities responsibility</label><input value={draft.utilitiesResponsibility} onChange={e => setDraft(d => ({ ...d, utilitiesResponsibility: e.target.value }))} className={inputClass} placeholder="Tenant pays electric & internet; landlord pays water & trash" /></div>
              <div className="sm:col-span-2"><label className={labelClass}>Additional terms</label><textarea rows={3} value={draft.additionalTerms} onChange={e => setDraft(d => ({ ...d, additionalTerms: e.target.value }))} className={`${inputClass} resize-none`} placeholder="Quiet hours, parking, renter's insurance requirement, etc." /></div>
            </div>
            <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 text-xs text-gray-400"><span className="font-semibold text-teal-300">{draft.state} law applied:</span> {STATE_PRESETS[draft.state] || STATE_PRESETS.Other}</div>
            <button onClick={generateDraft} disabled={generating} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60">
              {generating ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Drafting…</> : <><Wand2 className="h-4 w-4" /> Generate lease with AI</>}
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-[#2A2A2A] bg-[#151515] p-5">
            <div className="flex items-center gap-2 text-gray-300"><PenLine className="h-4 w-4" /><span className="text-sm font-bold">Review & edit</span></div>
            <div><label className={labelClass}>Lease title</label><input value={title} onChange={e => setTitle(e.target.value)} className={inputClass} /></div>
            <textarea rows={16} value={leaseText} onChange={e => setLeaseText(e.target.value)} placeholder="Your generated lease will appear here. You can edit it freely before sending." className={`${inputClass} resize-none font-mono text-xs leading-relaxed`} />

            {leaseText.trim() && (
              <div className="space-y-2 rounded-lg border border-teal-500/20 bg-[#0F0F0F] p-3">
                <div className="flex items-center gap-2 text-teal-300"><Wand2 className="h-3.5 w-3.5" /><span className="text-xs font-bold">Regenerate a section with AI</span></div>
                <div className="flex flex-wrap gap-2">
                  <select value={regenSection} onChange={e => setRegenSection(e.target.value)} className={`${inputClass} sm:max-w-[45%]`}>{LEASE_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <input value={regenInstruction} onChange={e => setRegenInstruction(e.target.value)} placeholder="Optional: e.g. late fee $75 after a 5-day grace period" className={`${inputClass} flex-1 min-w-[180px]`} />
                </div>
                <button onClick={regenerateSection} disabled={regenerating} className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 px-3 py-2 text-xs font-bold text-teal-300 transition hover:bg-teal-500/10 disabled:opacity-60">
                  {regenerating ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Revising…</> : <><Wand2 className="h-3.5 w-3.5" /> Regenerate “{regenSection}”</>}
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500">This AI draft is a starting point. Have it reviewed by a licensed attorney before it is signed.</p>
            <button onClick={sendAiLease} disabled={sending || !leaseText.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-60">
              {sending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send to tenant portal</>}
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD */}
      {mode === 'upload' && (
        <div className="space-y-3 rounded-xl border border-teal-500/25 bg-[#151515] p-5">
          <div className="flex items-center gap-2 text-teal-300"><Upload className="h-4 w-4" /><span className="text-sm font-bold">Upload an existing lease</span></div>
          {tenantSelect(uploadTenant.tenantId, t => setUploadTenant(u => ({ ...u, tenantId: t.id, tenantName: t.name, tenantEmail: t.email || u.tenantEmail, unit: t.unit || u.unit })))}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className={labelClass}>Tenant name</label><input value={uploadTenant.tenantName} onChange={e => setUploadTenant(u => ({ ...u, tenantName: e.target.value }))} className={inputClass} placeholder="Jane Tenant" /></div>
            <div><label className={labelClass}>Tenant email *</label><input value={uploadTenant.tenantEmail} onChange={e => setUploadTenant(u => ({ ...u, tenantEmail: e.target.value }))} className={inputClass} placeholder="jane@email.com" /></div>
            <div><label className={labelClass}>Property address</label><input value={uploadTenant.propertyAddress} onChange={e => setUploadTenant(u => ({ ...u, propertyAddress: e.target.value }))} className={inputClass} placeholder="14 Oak St" /></div>
            <div><label className={labelClass}>Unit</label><input value={uploadTenant.unit} onChange={e => setUploadTenant(u => ({ ...u, unit: e.target.value }))} className={inputClass} placeholder="12A" /></div>
          </div>
          <div>
            <label className={labelClass}>Lease file (PDF, DOC, up to 15 MB)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#363636] px-3 py-3 text-sm text-gray-400 transition hover:border-teal-500/50 hover:text-teal-300">
              <Upload className="h-4 w-4" />
              {uploadFile ? uploadFile.name : 'Choose a lease document…'}
              <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <button onClick={sendUploadedLease} disabled={sending || !uploadFile} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-60">
            {sending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send to tenant portal</>}
          </button>
        </div>
      )}

      {/* LIST */}
      {mode === 'list' && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] divide-y divide-[#2A2A2A]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading leases…</div>
          ) : leases.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p className="text-sm text-gray-400">No leases yet. Use the AI Lease Builder or upload one to get started.</p>
            </div>
          ) : leases.map(lease => (
            <div key={lease.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{lease.title}</p>
                  <span className="inline-flex items-center gap-1 rounded border border-teal-500/20 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-300">{lease.source === 'ai' ? <><Sparkles className="h-3 w-3" /> AI</> : <><Upload className="h-3 w-3" /> Upload</>}</span>
                </div>
                <p className="text-sm text-gray-500">{lease.tenantName || lease.tenantEmail}{lease.unit ? ` · ${lease.unit}` : ''}{lease.propertyAddress ? ` · ${lease.propertyAddress}` : ''}</p>
                <p className="mt-0.5 text-xs text-gray-600">Sent {new Date(lease.createdAt).toLocaleDateString()}{lease.signedAt ? ` · Signed ${new Date(lease.signedAt).toLocaleDateString()} by ${lease.signature}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${statusBadge(lease.status)}`}>{lease.status === 'signed' ? <><CheckCircle2 className="h-3 w-3" /> Signed</> : 'Awaiting signature'}</span>
                {lease.source === 'upload' && <button onClick={() => downloadLease(lease)} className="inline-flex items-center gap-1 rounded-lg border border-[#3a3a3a] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white"><Download className="h-3.5 w-3.5" /> File</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
