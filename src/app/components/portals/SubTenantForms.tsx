import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ClipboardList, PawPrint, LoaderCircle, PenLine, CheckCircle2, FileText } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

function typeLabel(t: string) {
  return t === 'pet-deposit' ? 'Pet Deposit' : t === 'move-out' ? 'Move-Out Checklist' : 'Move-In Checklist';
}

export default function SubTenantForms({ session }: { session: any }) {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  // Per-form editing state keyed by form id.
  const [drafts, setDrafts] = useState<Record<string, { areas: any[]; signature: string }>>({});

  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;

  const load = async () => {
    if (!authHeaders) { setForms([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/tenant/forms`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load forms.');
      const list = Array.isArray(payload.forms) ? payload.forms : [];
      setForms(list);
      // Seed editable drafts from the landlord's checklist so tenants can confirm/adjust.
      const seed: Record<string, { areas: any[]; signature: string }> = {};
      for (const f of list) {
        if (f.status !== 'completed' && (f.type === 'move-in' || f.type === 'move-out')) {
          seed[f.id] = { areas: (Array.isArray(f.data?.areas) ? f.data.areas : []).map((a: any) => ({ ...a })), signature: '' };
        } else {
          seed[f.id] = { areas: [], signature: '' };
        }
      }
      setDrafts(seed);
    } catch (error: any) { setForms([]); toast.error(error?.message || 'Unable to load forms.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [session?.access_token]);

  const complete = async (form: any) => {
    const draft = drafts[form.id];
    if (!draft?.signature?.trim()) { toast.error('Type your full legal name to sign.'); return; }
    if (!authHeaders) return;
    setSavingId(form.id);
    try {
      const tenantResponses = (form.type === 'move-in' || form.type === 'move-out') ? { areas: draft.areas } : {};
      const res = await fetch(`${SERVER}/tenant/forms/${form.id}/complete`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: draft.signature.trim(), tenantResponses }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to complete the form.');
      setForms(prev => prev.map(f => f.id === form.id ? payload.form : f));
      toast.success('Form completed and signed. Your landlord has been notified.');
    } catch (error: any) { toast.error(error?.message || 'Unable to complete the form.'); }
    finally { setSavingId(null); }
  };

  const field = 'w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500';

  if (loading) {
    return <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading your forms…</div>;
  }
  if (forms.length === 0) {
    return <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1A1A1A] p-8 text-center text-sm text-gray-400"><FileText className="mx-auto mb-2 h-8 w-8 text-gray-600" />No inspection or pet forms have been sent to you yet.</div>;
  }

  return (
    <div className="space-y-4">
      {forms.map(form => {
        const Icon = form.type === 'pet-deposit' ? PawPrint : ClipboardList;
        const draft = drafts[form.id] || { areas: [], signature: '' };
        const done = form.status === 'completed';
        return (
          <div key={form.id} className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white flex items-center gap-2"><Icon className="h-4 w-4 text-indigo-400" /> {form.title}</p>
                <p className="text-sm text-gray-400 mt-1">{[form.propertyAddress, form.unit].filter(Boolean).join(' · ') || typeLabel(form.type)}</p>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-bold border ${done ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{done ? 'Completed' : 'Action needed'}</span>
            </div>

            {/* PET DEPOSIT details */}
            {form.type === 'pet-deposit' && (
              <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4 text-sm text-gray-200 space-y-1">
                {form.data?.petType && <p><span className="text-gray-500">Pet:</span> {[form.data.petType, form.data.breed, form.data.petName].filter(Boolean).join(' · ')}</p>}
                {(form.data?.weight || form.data?.age) && <p><span className="text-gray-500">Details:</span> {[form.data.weight, form.data.age].filter(Boolean).join(' · ')}</p>}
                {form.data?.depositAmount && <p><span className="text-gray-500">Pet deposit:</span> {form.data.depositAmount}</p>}
                {form.data?.monthlyPetRent && <p><span className="text-gray-500">Monthly pet rent:</span> {form.data.monthlyPetRent}</p>}
                {form.data?.terms && <p className="whitespace-pre-wrap pt-2 text-gray-300">{form.data.terms}</p>}
              </div>
            )}

            {/* CHECKLIST — editable when pending, read-only responses when done */}
            {(form.type === 'move-in' || form.type === 'move-out') && (
              <div className="overflow-x-auto rounded-lg border border-[#2A2A2A]">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500"><th className="px-3 py-2">Area</th><th className="px-3 py-2">Condition</th><th className="px-3 py-2">Notes</th></tr></thead>
                  <tbody>
                    {done
                      ? (Array.isArray(form.tenantResponses?.areas) ? form.tenantResponses.areas : form.data?.areas || []).map((a: any, i: number) => (
                        <tr key={i} className="border-t border-[#2A2A2A] text-gray-300"><td className="px-3 py-2">{a.name}</td><td className="px-3 py-2">{a.condition}</td><td className="px-3 py-2">{a.notes || '—'}</td></tr>
                      ))
                      : draft.areas.map((a: any, i: number) => (
                        <tr key={i} className="border-t border-[#2A2A2A]">
                          <td className="px-3 py-2 text-gray-300">{a.name}</td>
                          <td className="px-3 py-2"><select value={a.condition} onChange={e => setDrafts(d => ({ ...d, [form.id]: { ...draft, areas: draft.areas.map((x, j) => j === i ? { ...x, condition: e.target.value } : x) } }))} className={field}>{CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                          <td className="px-3 py-2"><input value={a.notes} onChange={e => setDrafts(d => ({ ...d, [form.id]: { ...draft, areas: draft.areas.map((x, j) => j === i ? { ...x, notes: e.target.value } : x) } }))} placeholder="Add your notes" className={field} /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {done ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-300"><CheckCircle2 className="h-4 w-4" /> Signed by {form.signature}{form.completedAt ? ` on ${new Date(form.completedAt).toLocaleDateString()}` : ''}.</div>
            ) : (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-white flex items-center gap-2"><PenLine className="h-4 w-4 text-indigo-400" /> Review & sign</p>
                <p className="text-xs text-gray-400">Type your full legal name to electronically sign and return this form to your landlord.</p>
                <div className="flex flex-wrap gap-2">
                  <input value={draft.signature} onChange={e => setDrafts(d => ({ ...d, [form.id]: { ...draft, signature: e.target.value } }))} placeholder="Your full legal name" className="flex-1 min-w-[200px] rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
                  <button onClick={() => complete(form)} disabled={savingId === form.id} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60">{savingId === form.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} Complete & sign</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
