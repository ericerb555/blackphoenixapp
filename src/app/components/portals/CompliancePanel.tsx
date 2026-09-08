/**
 * Insurance and licences, and how long they have left.
 *
 * WHY IT LEADS WITH THE DATE
 *
 * A certificate of insurance is not a document to file — it is a date that
 * decides whether somebody may be on a site tomorrow. Nothing in this system
 * tracked them, so a subcontractor whose general liability lapsed last month
 * looked exactly like one covered through next year, and the expensive way to
 * find out is a claim on a job where nobody was insured.
 *
 * So the expiry is the loudest thing on each row, the ones running out come
 * first, and "no expiry recorded" is shown as a problem rather than as a blank.
 * A certificate whose expiry nobody wrote down cannot be confirmed current, and
 * treating unknown as fine is how somebody ends up on a roof uninsured.
 */
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const KINDS: Array<{ kind: string; label: string; required: boolean; hint: string }> = [
  { kind: 'general_liability', label: 'General liability insurance', required: true, hint: 'Your certificate of insurance' },
  { kind: 'workers_comp', label: "Workers' compensation", required: true, hint: 'Or your exemption, if you have no employees' },
  { kind: 'auto_liability', label: 'Commercial auto liability', required: false, hint: 'If you drive to site' },
  { kind: 'trade_license', label: 'Trade licence', required: false, hint: 'Electrical, plumbing, gas — whichever applies' },
  { kind: 'bond', label: 'Surety bond', required: false, hint: 'If you carry one' },
];

const TONE: Record<string, { box: string; text: string }> = {
  valid:    { box: 'border-green-500/20 bg-green-500/5',   text: 'text-green-400' },
  expiring: { box: 'border-yellow-500/25 bg-yellow-500/5', text: 'text-yellow-400' },
  expired:  { box: 'border-red-500/25 bg-red-500/5',       text: 'text-red-400' },
  undated:  { box: 'border-red-500/25 bg-red-500/5',       text: 'text-red-400' },
  missing:  { box: 'border-[#2A2A2A] bg-[#0A0A0A]',        text: 'text-gray-500' },
};

interface Props {
  orgId: string;
  apiBase: string;
  headers: () => Record<string, string>;
  /** Staff viewing somebody else's see it read-only. */
  readOnly?: boolean;
}

export default function CompliancePanel({ orgId, apiBase, headers, readOnly = false }: Props) {
  const [rows, setRows] = useState<Record<string, any>>({});
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const url = `${apiBase}/compliance/${encodeURIComponent(orgId)}`;

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const res = await fetch(url, { headers: headers() });
      const json = await res.json().catch(() => ({}));
      const map: Record<string, any> = {};
      for (const r of json?.records || []) map[r.kind] = r;
      setRows(map);
      setSummary(json);
    } catch { /* an empty panel is still usable */ }
    finally { setLoading(false); }
  }, [url, orgId]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      // Only rows the company actually filled in are sent. An untouched
      // optional line should stay absent rather than being stored blank.
      const records = KINDS
        .map((k) => rows[k.kind])
        .filter((r) => r && (r.issuer || r.reference || r.expiresOn));
      const res = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify({ records }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.error || `The server responded ${res.status}`);
      setSummary(json);
      if (json.rejected?.length) {
        toast.error(`${json.rejected[0].reason}`);
      } else {
        toast.success('Saved.');
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save that.');
    } finally { setSaving(false); }
  };

  const set = (kind: string, field: string, value: string) =>
    setRows((r) => ({ ...r, [kind]: { ...(r[kind] || { kind }), kind, [field]: value } }));

  const statusOf = (kind: string) =>
    (summary?.statuses || []).find((s: any) => s.kind === kind);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 text-sm text-gray-400">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading your cover…
      </div>
    );
  }

  const input = 'w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white';

  return (
    <div className="space-y-4">
      {/* The headline answer, before any of the detail. */}
      {summary && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${
          summary.clearToWork ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/25 bg-red-500/5'
        }`}>
          {summary.clearToWork
            ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
            : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />}
          <div className="min-w-0">
            <p className={`font-semibold ${summary.clearToWork ? 'text-green-400' : 'text-red-400'}`}>
              {summary.clearToWork ? 'Cover is current' : 'Cover is not current'}
            </p>
            {(summary.blockers || []).map((b: string, i: number) => (
              <p key={i} className="mt-0.5 text-sm text-red-200/80">{b}</p>
            ))}
            {(summary.warnings || []).map((w: string, i: number) => (
              <p key={i} className="mt-0.5 flex items-center gap-1.5 text-sm text-yellow-200/80">
                <Clock className="h-3.5 w-3.5" /> {w}
              </p>
            ))}
            {summary.clearToWork && !(summary.warnings || []).length && (
              <p className="mt-0.5 text-sm text-green-200/70">
                Nothing expires in the next 30 days.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {KINDS.map(({ kind, label, required, hint }) => {
          const st = statusOf(kind);
          const tone = TONE[st?.state || 'missing'] || TONE.missing;
          const row = rows[kind] || {};
          return (
            <div key={kind} className={`rounded-xl border p-4 ${tone.box}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {label}{required && <span className="ml-1 text-orange-400">*</span>}
                  </p>
                  <p className="text-[11px] text-gray-500">{hint}</p>
                </div>
                {st && st.state !== 'missing' && (
                  <span className={`text-xs font-semibold ${tone.text}`}>{st.message}</span>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label>
                  <span className="mb-1 block text-[11px] text-gray-500">Insurer or issuer</span>
                  <input className={input} disabled={readOnly} value={row.issuer || ''}
                    onChange={(e) => set(kind, 'issuer', e.target.value)} />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] text-gray-500">Policy or licence number</span>
                  <input className={input} disabled={readOnly} value={row.reference || ''}
                    onChange={(e) => set(kind, 'reference', e.target.value)} />
                </label>
                <label>
                  {/* The field that actually matters, so it is never optional
                      once anything else on the row is filled in. */}
                  <span className="mb-1 block text-[11px] text-gray-500">Expires</span>
                  <input className={input} disabled={readOnly} type="date" value={row.expiresOn || ''}
                    onChange={(e) => set(kind, 'expiresOn', e.target.value)} />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save cover
          </button>
          <p className="text-[11px] text-gray-600">
            Keep these current — we check them when awarding work.
          </p>
        </div>
      )}
    </div>
  );
}
