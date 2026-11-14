/**
 * Insurance certificates, and the renewal dates nobody remembers.
 *
 * Eric asked for somewhere to hold cyber liability cover, then: "build a spot
 * for when i get it." So this is built for the state he is actually in — not
 * yet bought — rather than assuming a certificate exists. An empty panel that
 * says what is missing and why a client will ask for it is more useful than
 * one that only works once somebody has already solved the problem.
 *
 * IT HOLDS MORE THAN CYBER
 *
 * A commercial client asking for proof of cyber liability asks for general
 * liability and workers' compensation in the same email, and a contractor who
 * cannot produce all three in an afternoon loses the job to one who can. The
 * panel takes any policy; cyber is listed first because it is the one that was
 * missing and the one a software platform is asked about.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not verify anything. It is a filing cabinet with a calendar: what
 * cover is claimed, who wrote it, what it is worth, and when it lapses. Nobody
 * should read a green badge here as evidence that a policy is in force — only
 * the certificate itself is that, which is why uploading the document matters
 * more than filling in the fields.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Loader2, Plus, AlertTriangle, Calendar, Trash2, FileText, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

/**
 * The cover a contracting platform gets asked for, in the order it is asked.
 *
 * Cyber first because it is the one a client procuring SOFTWARE asks about,
 * and the one Eric came looking for.
 */
const KINDS = [
  { id: 'cyber', label: 'Cyber liability', why: 'Data breach, ransomware, business interruption, and claims from customers whose data was exposed. The one a commercial client asks a software platform for.' },
  { id: 'general', label: 'General liability', why: 'Injury and property damage on a job. Asked for on almost every commercial contract.' },
  { id: 'workers-comp', label: "Workers' compensation", why: 'Required in New Hampshire once you have employees. A client will ask before letting a crew on site.' },
  { id: 'auto', label: 'Commercial auto', why: 'The trucks.' },
  { id: 'umbrella', label: 'Umbrella / excess', why: 'Sits above the others when a claim exceeds their limits.' },
];

interface Policy {
  id: string;
  kind: string;
  insurer?: string;
  policyNumber?: string;
  limit?: string;
  expiresOn?: string;
  certificateRef?: string | null;
  certificateUrl?: string | null;
  note?: string;
  updatedAt?: string;
}

const EMPTY = { id: '', kind: 'cyber', insurer: '', policyNumber: '', limit: '', expiresOn: '', note: '' };

/** Days until it lapses. Negative means it already has. */
function daysLeft(expiresOn?: string): number | null {
  if (!expiresOn) return null;
  const when = Date.parse(expiresOn);
  if (Number.isNaN(when)) return null;
  return Math.ceil((when - Date.now()) / 86_400_000);
}

export default function InsurancePanel() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [uploadingFor, setUploadingFor] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER}/insurance`, { headers: await authedHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not read the policies (${res.status}).`);
      setPolicies(Array.isArray(data.policies) ? data.policies : []);
    } catch (err: any) {
      setError(err?.message || 'Could not read the policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.insurer.trim() && !form.policyNumber.trim()) {
      toast.error('Add at least the insurer or the policy number, or there is nothing to find it by.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/insurance`, {
        method: 'POST',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...form, id: form.id || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `That did not save (${res.status}).`);
      setPolicies(data.policies || []);
      setShowForm(false);
      setForm(EMPTY);
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err?.message || 'Could not save that.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (policy: Policy) => {
    if (!confirm(`Remove the ${KINDS.find(k => k.id === policy.kind)?.label || policy.kind} record?`)) return;
    try {
      const res = await fetch(`${SERVER}/insurance/${policy.id}`, {
        method: 'DELETE', headers: await authedHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not remove it.');
      setPolicies(data.policies || []);
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove it.');
    }
  };

  /**
   * The certificate itself, which is the only thing that actually proves
   * anything. Uploaded straight to private storage the way job media is.
   */
  const uploadCertificate = async (policy: Policy, file: File) => {
    setUploadingFor(policy.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${user?.id || 'owner'}/insurance/${Date.now()}_${file.name.replace(/[^\w.-]+/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('project-blueprints')
        .upload(path, file, { contentType: file.type || 'application/pdf' });
      if (upErr) throw new Error(upErr.message);

      const res = await fetch(`${SERVER}/insurance`, {
        method: 'POST',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: policy.id, certificateRef: `storage://project-blueprints/${path}` }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Uploaded, but could not be filed.');
      setPolicies(data.policies || []);
      toast.success('Certificate filed');
    } catch (err: any) {
      toast.error(err?.message || 'Could not upload that.');
    } finally {
      setUploadingFor('');
    }
  };

  const missing = useMemo(
    () => KINDS.filter(k => !policies.some(p => p.kind === k.id)),
    [policies],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400" style={{ padding: '24px' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Reading the policies…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl" style={{ padding: '20px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="flex items-center gap-2 text-lg font-black text-white">
          <ShieldCheck className="w-5 h-5 text-orange-400" /> Insurance
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          What you carry, what it is worth, when it lapses, and the certificate itself —
          so a client asking for proof gets it the same day rather than next week.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          This is a filing cabinet with a calendar. Nothing here verifies that a policy is in
          force; only the certificate does, which is why uploading it matters more than filling
          in the boxes.
        </p>
        <button
          onClick={() => { setForm(EMPTY); setShowForm(true); }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl text-sm font-black text-black"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '12px 18px' }}
        >
          <Plus className="w-4 h-4" /> Add a policy
        </button>
      </div>

      {error && (
        <div className="rounded-xl" style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p className="text-sm font-bold text-red-400">{error}</p>
          <button onClick={() => void load()} className="mt-2 text-xs font-bold text-orange-400">Try again</button>
        </div>
      )}

      {/* What is not on file. The reason this panel exists before any policy does. */}
      {missing.length > 0 && (
        <div className="rounded-2xl" style={{ padding: '20px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)' }}>
          <p className="flex items-center gap-2 text-sm font-black text-yellow-400">
            <AlertTriangle className="w-4 h-4" /> Nothing on file for these
          </p>
          <div className="mt-3 space-y-3">
            {missing.map(k => (
              <div key={k.id}>
                <p className="text-sm font-bold text-gray-200">{k.label}</p>
                <p className="text-xs leading-relaxed text-gray-500">{k.why}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-yellow-200/60">
            Add a record as soon as you have a quote — the renewal reminder is worth having even
            before the certificate arrives.
          </p>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl space-y-3" style={{ padding: '20px', background: '#0d0d0d', border: '1px solid rgba(234,88,12,0.3)' }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-gray-400">Cover</span>
              <select
                value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="mt-1 w-full rounded-lg text-sm text-white"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 12px' }}
              >
                {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>
            {([
              ['insurer', 'Insurer'],
              ['policyNumber', 'Policy number'],
              ['limit', 'Limit (e.g. $1M / $2M)'],
              ['expiresOn', 'Expires'],
            ] as Array<[keyof typeof EMPTY, string]>).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs text-gray-400">{label}</span>
                <input
                  type={key === 'expiresOn' ? 'date' : 'text'}
                  value={form[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="mt-1 w-full rounded-lg text-sm text-white bg-transparent"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '10px 12px' }}
                />
              </label>
            ))}
          </div>
          <textarea
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={2} placeholder="Broker, what it excludes, anything worth remembering at renewal"
            className="w-full rounded-lg text-sm text-white bg-transparent"
            style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '10px 12px' }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => void save()} disabled={saving}
              className="flex-1 rounded-xl text-sm font-black text-black disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '12px' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY); }}
              className="rounded-xl text-sm font-black text-gray-300"
              style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '12px 20px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {policies.map(policy => {
        const kind = KINDS.find(k => k.id === policy.kind);
        const left = daysLeft(policy.expiresOn);
        const lapsed = left !== null && left < 0;
        const soon = left !== null && left >= 0 && left <= 45;
        return (
          <div key={policy.id} className="rounded-2xl" style={{
            padding: '18px',
            background: '#0d0d0d',
            border: `1px solid ${lapsed ? 'rgba(239,68,68,0.4)' : soon ? 'rgba(234,179,8,0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{kind?.label || policy.kind}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {[policy.insurer, policy.policyNumber, policy.limit].filter(Boolean).join(' · ') || 'No details yet'}
                </p>
              </div>
              {policy.expiresOn && (
                <span className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-black" style={{
                  padding: '6px 12px',
                  background: lapsed ? 'rgba(239,68,68,0.15)' : soon ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.12)',
                  color: lapsed ? '#f87171' : soon ? '#facc15' : '#4ade80',
                }}>
                  <Calendar className="w-3 h-3" />
                  {lapsed ? `Lapsed ${Math.abs(left!)} days ago` : `${left} days left`}
                </span>
              )}
            </div>

            {policy.note && <p className="mt-2 text-xs text-gray-400">{policy.note}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {policy.certificateUrl ? (
                <a
                  href={policy.certificateUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-orange-400"
                  style={{ border: '1px solid rgba(234,88,12,0.35)', padding: '8px 12px' }}
                >
                  <FileText className="w-3.5 h-3.5" /> View certificate
                </a>
              ) : (
                <span className="text-xs text-yellow-500/80">No certificate on file</span>
              )}

              <label
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg text-xs font-bold text-gray-300"
                style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '8px 12px' }}
              >
                {uploadingFor === policy.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Upload className="w-3.5 h-3.5" />}
                {policy.certificateUrl ? 'Replace' : 'Upload certificate'}
                <input
                  type="file" accept="application/pdf,image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadCertificate(policy, file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>

              <button
                onClick={() => { setForm({ ...EMPTY, ...policy, note: policy.note || '' } as any); setShowForm(true); }}
                className="rounded-lg text-xs font-bold text-gray-400"
                style={{ border: '1px solid rgba(255,255,255,0.12)', padding: '8px 12px' }}
              >
                Edit
              </button>
              <button
                onClick={() => void remove(policy)}
                aria-label="Remove this policy record"
                className="rounded-lg text-gray-500"
                style={{ border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
