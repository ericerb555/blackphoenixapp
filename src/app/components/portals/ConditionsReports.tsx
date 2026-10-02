/**
 * ConditionsReports — what changed between a tenant moving in and moving out.
 *
 * Presentation over logic that is already tested. `conditionDiff` decided what
 * is wear and what is damage, `depositMath` worked out the deposit, and
 * `conditionsReport` holds the record and its life — none of that is repeated
 * here. This screen shows it and offers the three decisions a person makes:
 * escalate a line, send it to Black Phoenix to be priced, give it to the tenant.
 *
 * THE DEPOSIT IS TYPED HERE BECAUSE NOTHING ELSE HOLDS IT
 *
 * The lease draft form asks for a security deposit, puts it into the prompt that
 * drafts the lease, and stores only the resulting prose. So the figure exists as
 * a sentence in a document and nowhere as a number. Rather than parsing it back
 * out of lease text — which would be guessing at the most consequential figure
 * on the statement — it is asked for when the report is made. That also works
 * for a tenancy that predates the forms entirely.
 *
 * WHY THE CONDITIONS ARE SHOWN SIDE BY SIDE AND NOT AS A VERDICT
 *
 * Every line shows the arrival condition, the departure condition, and where the
 * landlord and the tenant disagreed. A single "Damaged — $820" would be easier
 * to read and impossible to check, and this document exists to be checked.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, LoaderCircle, Plus, Send, FileText, Trash2, AlertTriangle,
  CheckCircle2, Camera, Lock, ArrowRight, Wallet, ShieldAlert,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Props { session: any }

/** Mirrors the server's four states. */
type ReportStatus = 'documented' | 'sent' | 'priced' | 'shared';

const STATUS_LABEL: Record<ReportStatus, string> = {
  documented: 'Documented',
  sent: 'With Black Phoenix',
  priced: 'Priced',
  shared: 'Given to tenant',
};

const STATUS_CLASS: Record<ReportStatus, string> = {
  documented: 'border-gray-500/20 bg-gray-500/10 text-gray-300',
  sent: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  priced: 'border-teal-500/20 bg-teal-500/10 text-teal-300',
  shared: 'border-green-500/20 bg-green-500/10 text-green-400',
};

/** Wear is grey because it costs nothing. Damage is the only one that is loud. */
const CLASS_STYLE: Record<string, { label: string; cls: string }> = {
  damage: { label: 'Damage', cls: 'border-red-500/30 bg-red-500/10 text-red-300' },
  wear: { label: 'Wear', cls: 'border-gray-500/20 bg-gray-500/10 text-gray-400' },
  unchanged: { label: 'Unchanged', cls: 'border-gray-500/20 bg-gray-500/10 text-gray-500' },
  improved: { label: 'Improved', cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
  no_baseline: { label: 'No move-in record', cls: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
  unreadable: { label: 'Not comparable', cls: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
};

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '');

export default function ConditionsReports({ session }: Props) {
  const [views, setViews] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ moveOutFormId: '', deposit: '' });
  const [depositEdit, setDepositEdit] = useState<Record<string, string>>({});

  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  const load = useCallback(async () => {
    if (!authHeaders) { setLoading(false); return; }
    setLoading(true);
    try {
      const [reportRes, formRes] = await Promise.all([
        fetch(`${SERVER}/landlord/conditions-reports`, { headers: authHeaders }),
        fetch(`${SERVER}/landlord/forms`, { headers: authHeaders }),
      ]);
      const reports = await reportRes.json().catch(() => ({}));
      const formPayload = await formRes.json().catch(() => ({}));
      setViews(Array.isArray(reports?.reports) ? reports.reports : []);
      setForms(Array.isArray(formPayload?.forms) ? formPayload.forms : []);
    } catch {
      // The panel shows what it has rather than an error wall; the list is empty
      // and the buttons still work once the server is reachable again.
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);

  /** Completed move-out checklists that do not already have a report. */
  const reported = new Set(views.map(v => v.record.moveOutFormId));
  const available = forms.filter(f =>
    f.type === 'move-out' && f.status === 'completed' && !reported.has(f.id));

  /**
   * The move-in checklist that pairs with a move-out one.
   *
   * Matched on the tenant and taken as the latest completed one before the
   * departure, which is the pairing somebody would make by hand. Absent is
   * legitimate — the server reports "nothing chargeable" rather than refusing.
   */
  const baselineFor = (moveOut: any) => {
    // Guarded because the caller passes a `forms.find(...)` result: a reload that
    // drops the selected checklist would otherwise read `tenantEmail` off
    // undefined and take the whole tab down with it.
    if (!moveOut) return null;
    const candidates = forms.filter(f =>
      f.type === 'move-in' && f.status === 'completed'
      && String(f.tenantEmail || '').toLowerCase() === String(moveOut.tenantEmail || '').toLowerCase());
    candidates.sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
    return candidates.find(f => !moveOut.completedAt
      || String(f.completedAt || '') <= String(moveOut.completedAt)) || candidates[0] || null;
  };

  const create = async () => {
    const moveOut = forms.find(f => f.id === draft.moveOutFormId);
    if (!moveOut) { toast.error('Choose a completed move-out checklist.'); return; }
    if (!authHeaders) return;
    setCreating(true);
    try {
      const res = await fetch(`${SERVER}/landlord/conditions-reports`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moveOutFormId: moveOut.id,
          moveInFormId: baselineFor(moveOut)?.id || '',
          depositRaw: draft.deposit,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to make the report.');
      setViews(prev => [payload.report, ...prev]);
      setOpenId(payload.report.record.id);
      setDraft({ moveOutFormId: '', deposit: '' });
      toast.success('Conditions report created.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to make the report.');
    } finally {
      setCreating(false);
    }
  };

  /** Any write to one report, with the returned view replacing the local one. */
  const patch = async (id: string, body: any, success?: string) => {
    if (!authHeaders) return;
    setBusyId(id);
    try {
      const res = await fetch(`${SERVER}/landlord/conditions-reports/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'That did not save.');
      // Replaced from what the server returned rather than from what was sent,
      // so a refusal shows as a refusal instead of a saved-looking screen.
      setViews(prev => prev.map(v => v.record.id === id ? payload.report : v));
      if (success) toast.success(success);
    } catch (error: any) {
      toast.error(error?.message || 'That did not save.');
    } finally {
      setBusyId(null);
    }
  };

  const setLineClass = (view: any, areaName: string, to: 'wear' | 'damage') => {
    const existing = (view.record.overrides || []).filter((o: any) => o.area !== areaName);
    patch(view.record.id, {
      overrides: [...existing, { area: areaName, classification: to }],
    }, to === 'damage' ? 'Marked as damage.' : 'Marked as wear — not charged.');
  };

  const remove = async (id: string) => {
    if (!authHeaders) return;
    setBusyId(id);
    try {
      const res = await fetch(`${SERVER}/landlord/conditions-reports/${id}`, {
        method: 'DELETE', headers: authHeaders,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to delete it.');
      setViews(prev => prev.filter(v => v.record.id !== id));
      toast.success('Report deleted.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to delete it.');
    } finally {
      setBusyId(null);
    }
  };

  const inputClass = 'w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500';
  const labelClass = 'block text-xs font-semibold text-gray-400 mb-1.5';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white">Conditions reports</h3>
          <p className="text-sm text-gray-500">
            What changed between move-in and move-out, what of it is chargeable, and what that
            leaves of the deposit.
          </p>
        </div>
      </div>

      {/* MAKE ONE */}
      {available.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
          <p className="mb-3 text-sm font-bold text-white">New report</p>
          <div className="grid gap-3 sm:grid-cols-[2fr,1fr,auto] sm:items-end">
            <div>
              <label className={labelClass}>Completed move-out checklist</label>
              <select
                value={draft.moveOutFormId}
                onChange={e => setDraft(d => ({ ...d, moveOutFormId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Choose a tenant…</option>
                {available.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.tenantName || f.tenantEmail}{f.unit ? ` · ${f.unit}` : ''} · completed {day(f.completedAt)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Security deposit held</label>
              <input
                value={draft.deposit}
                onChange={e => setDraft(d => ({ ...d, deposit: e.target.value }))}
                placeholder="1800"
                className={inputClass}
              />
            </div>
            <button
              onClick={create}
              disabled={creating || !draft.moveOutFormId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50"
            >
              {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
          {draft.moveOutFormId
            && forms.some(f => f.id === draft.moveOutFormId)
            && !baselineFor(forms.find(f => f.id === draft.moveOutFormId)) && (
            <p className="mt-3 flex items-start gap-2 text-xs text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              No completed move-in checklist for this tenant. The report is still worth having as a
              record of the departure condition, but nothing can be charged against the deposit
              without an arrival condition to compare against.
            </p>
          )}
        </div>
      )}

      {/* LIST */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] divide-y divide-[#2A2A2A]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading reports…
          </div>
        ) : views.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-400">
              No conditions reports yet.
              {available.length === 0
                ? ' One can be made once a tenant has completed a move-out checklist.'
                : ' Choose a completed move-out checklist above to make one.'}
            </p>
          </div>
        ) : views.map(view => {
          const r = view.record;
          const status: ReportStatus = r.status;
          const open = openId === r.id;
          const busy = busyId === r.id;
          const s = view.settlement;

          return (
            <div key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button onClick={() => setOpenId(open ? null : r.id)} className="min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white">{r.tenantName || r.tenantEmail}</p>
                    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_CLASS[status]}`}>
                      {status === 'shared' ? <CheckCircle2 className="h-3 w-3" /> : null}
                      {STATUS_LABEL[status]}
                    </span>
                    {!view.live && (
                      <span className="inline-flex items-center gap-1 rounded border border-[#363636] px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                        <Lock className="h-3 w-3" /> Findings locked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {r.propertyAddress}{r.unit ? ` · ${r.unit}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {view.diff.chargeableAreas} chargeable
                    {view.diff.disputedAreas > 0 ? ` · ${view.diff.disputedAreas} disputed` : ''}
                    {view.diff.tenancyMonths !== null ? ` · ${view.diff.tenancyMonths} month tenancy` : ''}
                  </p>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {s.status === 'ready' && (
                    <span className="text-sm font-bold text-white">
                      {money(s.deductions)} <span className="text-xs font-normal text-gray-500">deducted</span>
                    </span>
                  )}
                  {status !== 'shared' && (
                    <button
                      onClick={() => remove(r.id)}
                      disabled={busy}
                      title="Delete report"
                      className="rounded-lg border border-[#363636] p-1.5 text-gray-400 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                    >
                      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              {open && (
                <div className="mt-4 space-y-4">
                  {/* WHAT WHOEVER READS THIS SHOULD KNOW */}
                  {(view.diff.notes.length > 0 || s.notes.length > 0) && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <ul className="space-y-1.5">
                        {[...view.diff.notes, ...s.notes].map((note: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-amber-300/90">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AREA BY AREA */}
                  <div className="overflow-x-auto rounded-lg border border-[#2A2A2A]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="px-3 py-2">Area</th>
                          <th className="px-3 py-2">On arrival</th>
                          <th className="px-3 py-2">On departure</th>
                          <th className="px-3 py-2">Finding</th>
                          <th className="px-3 py-2">Cost</th>
                          {view.live && <th className="px-3 py-2" />}
                        </tr>
                      </thead>
                      <tbody>
                        {view.diff.lines.map((line: any) => {
                          const style = CLASS_STYLE[line.classification] || CLASS_STYLE.unreadable;
                          const priced = s.lines.find((l: any) => l.area === line.area);
                          const photos = (line.moveIn?.media?.length || 0) + (line.moveOut?.media?.length || 0);
                          return (
                            <tr key={line.area} className="border-t border-[#2A2A2A] align-top text-gray-300">
                              <td className="px-3 py-2">
                                <span className="font-semibold text-white">{line.area}</span>
                                {photos > 0 && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-500">
                                    <Camera className="h-3 w-3" /> {photos}
                                  </span>
                                )}
                                <p className="mt-1 max-w-sm text-[11px] leading-snug text-gray-500">{line.why}</p>
                              </td>
                              <td className="px-3 py-2">
                                {line.moveIn?.condition || '—'}
                                {line.moveIn?.landlordCondition && (
                                  <p className="text-[10px] text-amber-400">you recorded {line.moveIn.landlordCondition}</p>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {line.moveOut?.condition || '—'}
                                {line.moveOut?.landlordCondition && (
                                  <p className="text-[10px] text-amber-400">you recorded {line.moveOut.landlordCondition}</p>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${style.cls}`}>
                                  {style.label}
                                </span>
                                {line.disputed && (
                                  <span className="ml-1 inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                                    <ShieldAlert className="h-3 w-3" /> Disputed
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {line.chargeable
                                  ? priced?.cost !== null && priced?.cost !== undefined
                                    ? <>{money(priced.cost)}{priced.quoteId && <p className="text-[10px] text-gray-600">{priced.quoteId}</p>}</>
                                    : <span className="text-gray-600">awaiting price</span>
                                  : <span className="text-gray-700">—</span>}
                              </td>
                              {view.live && (
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {(line.classification === 'wear' || line.classification === 'damage') && (
                                    <button
                                      onClick={() => setLineClass(view, line.area, line.classification === 'damage' ? 'wear' : 'damage')}
                                      disabled={busy}
                                      className="rounded border border-[#363636] px-2 py-1 text-[10px] font-bold text-gray-300 transition hover:border-teal-500/40 hover:text-teal-300 disabled:opacity-40"
                                    >
                                      {line.classification === 'damage' ? 'Not damage' : 'Mark damage'}
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* THE DEPOSIT */}
                  <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-teal-400" />
                      <p className="text-sm font-bold text-white">Security deposit</p>
                    </div>

                    {!s.deposit.readable ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[10rem] flex-1">
                          <label className={labelClass}>Deposit held</label>
                          <input
                            value={depositEdit[r.id] ?? ''}
                            onChange={e => setDepositEdit(d => ({ ...d, [r.id]: e.target.value }))}
                            placeholder="1800"
                            className={inputClass}
                          />
                        </div>
                        <button
                          onClick={() => patch(r.id, { depositOverride: depositEdit[r.id] || '' }, 'Deposit recorded.')}
                          disabled={busy || !(depositEdit[r.id] || '').trim()}
                          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <dl className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <dt className="text-xs text-gray-500">Held</dt>
                          <dd className="text-sm font-bold text-white">{money(s.deposit.amount)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Deducted</dt>
                          <dd className="text-sm font-bold text-white">
                            {s.status === 'ready' ? money(s.deductions) : <span className="text-gray-600">awaiting price</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Back to tenant</dt>
                          <dd className="text-sm font-bold text-green-400">
                            {s.status === 'ready' ? money(s.returnedToTenant) : <span className="text-gray-600">—</span>}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Still owed</dt>
                          <dd className={`text-sm font-bold ${s.owedByTenant ? 'text-red-400' : 'text-gray-500'}`}>
                            {s.status === 'ready' ? money(s.owedByTenant) : <span className="text-gray-600">—</span>}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>

                  {/* WHAT HAPPENS NEXT */}
                  <div className="flex flex-wrap items-center gap-2">
                    {status === 'documented' && view.diff.chargeableAreas > 0 && (
                      <button
                        onClick={() => patch(r.id, { status: 'sent' }, 'Sent to Black Phoenix to be priced.')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-50"
                      >
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send to Black Phoenix for pricing
                      </button>
                    )}

                    {(status === 'sent' || status === 'priced') && (
                      <button
                        onClick={() => patch(r.id, { status: 'documented' }, 'Reopened. The findings can be changed again.')}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#363636] px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:border-gray-500 disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}

                    {status !== 'shared' && (
                      <button
                        onClick={() => patch(r.id, { status: 'shared' }, 'Given to the tenant.')}
                        disabled={busy || !view.shareable}
                        title={view.shareBlockedBecause || undefined}
                        className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 px-4 py-2.5 text-sm font-bold text-teal-300 transition hover:bg-teal-500/10 disabled:opacity-40"
                      >
                        <ArrowRight className="h-4 w-4" /> Give to tenant
                      </button>
                    )}

                    {status === 'shared' && (
                      <p className="inline-flex items-center gap-2 text-xs text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Given to {r.tenantName || r.tenantEmail} on {day(r.sharedAt)}. It cannot be
                        changed or deleted now.
                      </p>
                    )}
                  </div>

                  {!view.shareable && view.shareBlockedBecause && status !== 'shared' && (
                    <p className="flex items-start gap-2 text-xs text-gray-500">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {view.shareBlockedBecause}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
