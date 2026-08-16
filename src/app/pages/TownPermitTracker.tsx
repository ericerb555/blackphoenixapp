/**
 * Town requirements and the submission log.
 *
 * Two lists that answer two questions: what does this town want, and where does
 * every open application stand.
 *
 * Anything waiting on us is surfaced at the top rather than left to be found by
 * scrolling. A request for information sitting unanswered is how an application
 * quietly expires, and nothing in a list sorted by date makes that obvious.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, Plus, Loader2, Trash2, ExternalLink, AlertTriangle,
  ClipboardList, Save, RefreshCw, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import DesignWorkspaceNav from '../components/DesignWorkspaceNav';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: 'rgba(148,163,184,0.15)', fg: '#cbd5e1', label: 'Draft' },
  submitted: { bg: 'rgba(59,130,246,0.15)', fg: '#60a5fa', label: 'Submitted' },
  under_review: { bg: 'rgba(59,130,246,0.15)', fg: '#60a5fa', label: 'Under review' },
  info_requested: { bg: 'rgba(234,179,8,0.18)', fg: '#facc15', label: 'Info requested' },
  approved: { bg: 'rgba(22,163,74,0.15)', fg: '#4ade80', label: 'Approved' },
  denied: { bg: 'rgba(239,68,68,0.15)', fg: '#f87171', label: 'Denied' },
  withdrawn: { bg: 'rgba(148,163,184,0.15)', fg: '#cbd5e1', label: 'Withdrawn' },
  expired: { bg: 'rgba(239,68,68,0.15)', fg: '#f87171', label: 'Expired' },
};

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

const EMPTY_TOWN = {
  name: '', state: '', portalVendor: 'Other online portal', portalUrl: '',
  contactName: '', contactPhone: '', contactEmail: '',
  combinedPdf: true, maxFileSizeMb: 0, namingConvention: '',
  requiredDocumentsText: '', requiresWetStamp: false,
  typicalReviewDays: 0, permitFeeNote: '', notes: '',
  groundSnowPsf: 0, frostDepthIn: 0, codeEdition: '', loadSource: '',
};

export default function TownPermitTracker() {
  const [tab, setTab] = useState<'submissions' | 'towns'>('submissions');
  const [towns, setTowns] = useState<any[]>([]);
  const [vendors, setVendors] = useState<string[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [attention, setAttention] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [townForm, setTownForm] = useState<any>(EMPTY_TOWN);
  const [subForm, setSubForm] = useState<any>({ projectName: '', address: '', parcel: '', townId: '', status: 'draft' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await headers();
      const [t, s] = await Promise.all([
        fetch(`${SERVER}/town-permits/towns`, { headers: h }),
        fetch(`${SERVER}/town-permits/submissions`, { headers: h }),
      ]);
      const td = await t.json().catch(() => null);
      const sd = await s.json().catch(() => null);
      if (td?.success) { setTowns(td.towns || []); setVendors(td.vendors || []); }
      else toast.error(td?.error || 'Could not load towns.');
      if (sd?.success) { setSubs(sd.submissions || []); setAttention(sd.needsAttention || []); }
    } catch (err: any) {
      toast.error(err?.message || 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveTown = useCallback(async () => {
    if (!townForm.name.trim() || !townForm.state.trim()) { toast.error('Town and state are required.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${SERVER}/town-permits/towns`, {
        method: 'POST', headers: await headers(),
        body: JSON.stringify({
          ...townForm,
          requiredDocuments: String(townForm.requiredDocumentsText || '')
            .split('\n').map((x: string) => x.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || 'Save failed.'); return; }
      toast.success(`${data.town.name} saved.`);
      setTownForm(EMPTY_TOWN);
      load();
    } finally { setBusy(false); }
  }, [townForm, load]);

  const saveSub = useCallback(async (payload: any) => {
    setBusy(true);
    try {
      const res = await fetch(`${SERVER}/town-permits/submissions`, {
        method: 'POST', headers: await headers(), body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || 'Save failed.'); return; }
      toast.success('Saved.');
      load();
    } finally { setBusy(false); }
  }, [load]);

  const removeTown = useCallback(async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    const res = await fetch(`${SERVER}/town-permits/towns/${id}`, { method: 'DELETE', headers: await headers() });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) { toast.error(data?.error || 'Could not remove.'); return; }
    toast.success('Removed.');
    load();
  }, [load]);

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
  const input = 'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]';
  const lbl = 'block text-xs font-semibold text-gray-400 mb-1';

  const openCount = useMemo(
    () => subs.filter(s => !['approved', 'denied', 'withdrawn', 'expired'].includes(s.status)).length,
    [subs],
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#ea580c]" /> Permits &amp; towns
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              What each town wants, and where every application stands. {openCount} open.
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
          </button>
        </div>

        {/* Surfaced above everything: a town waiting on us, or an application
            past the review time it was quoted. Both cost real time if missed. */}
        {attention.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.35)' }}>
            <div className="flex items-center gap-2 font-bold text-yellow-300 mb-2">
              <AlertTriangle className="w-5 h-5" /> {attention.length} need attention
            </div>
            <div className="space-y-1">
              {attention.map(a => (
                <p key={a.id} className="text-sm text-yellow-200">
                  <strong>{a.project}</strong> · {a.town} ·{' '}
                  {a.status === 'info_requested'
                    ? 'the town is waiting on information'
                    : `past the expected review time (submitted ${a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—'})`}
                </p>
              ))}
            </div>
          </div>
        )}

        <DesignWorkspaceNav current="permits" />

        <div className="flex gap-2">
          {(['submissions', 'towns'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                tab === t ? 'bg-[#ea580c] text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400'
              }`}>
              {t === 'submissions' ? `Submissions (${subs.length})` : `Towns (${towns.length})`}
            </button>
          ))}
        </div>

        {tab === 'submissions' ? (
          <div className="space-y-4">
            <div className={card}>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#ea580c]" /> Log a submission
              </h2>
              <div className="grid sm:grid-cols-4 gap-2">
                <input className={input} placeholder="Project" value={subForm.projectName}
                  onChange={e => setSubForm({ ...subForm, projectName: e.target.value })} />
                <input className={input} placeholder="Address" value={subForm.address}
                  onChange={e => setSubForm({ ...subForm, address: e.target.value })} />
                <select className={input} value={subForm.townId}
                  onChange={e => setSubForm({ ...subForm, townId: e.target.value })}>
                  <option value="">Town…</option>
                  {towns.map(t => <option key={t.id} value={t.id}>{t.name}, {t.state}</option>)}
                </select>
                <button onClick={() => { saveSub(subForm); setSubForm({ projectName: '', address: '', parcel: '', townId: '', status: 'draft' }); }}
                  disabled={busy || !subForm.projectName.trim()}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: 'rgba(234,88,12,0.9)' }}>
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {subs.length === 0 ? (
              <div className={`${card} py-12 text-center text-gray-500`}>
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No submissions logged yet.
              </div>
            ) : subs.map(s => {
              const st = STATUS_STYLE[s.status] || STATUS_STYLE.draft;
              return (
                <div key={s.id} className={card}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{s.projectName}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                          style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        {s.townName || 'no town set'}{s.address ? ` · ${s.address}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        {s.confirmationNumber && <span>Conf. {s.confirmationNumber}</span>}
                        {s.permitNumber && <span>Permit {s.permitNumber}</span>}
                        {s.submittedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> submitted {new Date(s.submittedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.portalUrl && (
                        <a href={s.portalUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-sm text-blue-400">
                          <ExternalLink className="w-3.5 h-3.5" /> Portal
                        </a>
                      )}
                      <select className="px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs"
                        value={s.status}
                        onChange={e => saveSub({ id: s.id, projectName: s.projectName, status: e.target.value })}>
                        {Object.keys(STATUS_STYLE).map(k => (
                          <option key={k} value={k}>{STATUS_STYLE[k].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 mt-3">
                    <input className={input} placeholder="Confirmation #" defaultValue={s.confirmationNumber}
                      onBlur={e => e.target.value !== s.confirmationNumber &&
                        saveSub({ id: s.id, projectName: s.projectName, confirmationNumber: e.target.value })} />
                    <input className={input} placeholder="Permit #" defaultValue={s.permitNumber}
                      onBlur={e => e.target.value !== s.permitNumber &&
                        saveSub({ id: s.id, projectName: s.projectName, permitNumber: e.target.value })} />
                    <input className={input} placeholder="Notes" defaultValue={s.notes}
                      onBlur={e => e.target.value !== s.notes &&
                        saveSub({ id: s.id, projectName: s.projectName, notes: e.target.value })} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className={card}>
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#ea580c]" /> Add or update a town
              </h2>
              <div className="grid sm:grid-cols-3 gap-2 mb-2">
                <input className={input} placeholder="Town" value={townForm.name}
                  onChange={e => setTownForm({ ...townForm, name: e.target.value })} />
                <input className={input} placeholder="State (2 letters)" maxLength={2} value={townForm.state}
                  onChange={e => setTownForm({ ...townForm, state: e.target.value.toUpperCase() })} />
                <select className={input} value={townForm.portalVendor}
                  onChange={e => setTownForm({ ...townForm, portalVendor: e.target.value })}>
                  {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <input className={`${input} mb-2`} placeholder="Portal URL" value={townForm.portalUrl}
                onChange={e => setTownForm({ ...townForm, portalUrl: e.target.value })} />
              <div className="grid sm:grid-cols-3 gap-2 mb-2">
                <div>
                  <span className={lbl}>Max upload (MB, 0 = none)</span>
                  <input type="number" className={input} value={townForm.maxFileSizeMb}
                    onChange={e => setTownForm({ ...townForm, maxFileSizeMb: Number(e.target.value) })} />
                </div>
                <div>
                  <span className={lbl}>Typical review (days)</span>
                  <input type="number" className={input} value={townForm.typicalReviewDays}
                    onChange={e => setTownForm({ ...townForm, typicalReviewDays: Number(e.target.value) })} />
                </div>
                <div>
                  <span className={lbl}>File naming</span>
                  <input className={input} placeholder="e.g. Address_Sheet_Date" value={townForm.namingConvention}
                    onChange={e => setTownForm({ ...townForm, namingConvention: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mb-2">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" className="accent-[#ea580c]" checked={townForm.combinedPdf}
                    onChange={e => setTownForm({ ...townForm, combinedPdf: e.target.checked })} />
                  Wants one combined PDF
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" className="accent-[#ea580c]" checked={townForm.requiresWetStamp}
                    onChange={e => setTownForm({ ...townForm, requiresWetStamp: e.target.checked })} />
                  Requires a wet stamp
                </label>
              </div>
              {/* The load case. Kept with the town rather than typed into every
                  design, because it is a property of the jurisdiction — and
                  because frost depth is published by no national source, so the
                  building department's number entered once here is the only
                  place it can come from. */}
              <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 mb-2">
                <h4 className="text-xs font-bold text-white mb-1">What this town enforces</h4>
                <p className="text-[11px] text-gray-500 mb-2">
                  Fills the loads on any deck designed in this town. Leave a field at zero and it
                  stays blank in the designer rather than being guessed.
                </p>
                <div className="grid sm:grid-cols-3 gap-2 mb-2">
                  <div>
                    <span className={lbl}>Ground snow (psf)</span>
                    <input type="number" min={0} className={input} value={townForm.groundSnowPsf}
                      onChange={e => setTownForm({ ...townForm, groundSnowPsf: Number(e.target.value) })} />
                  </div>
                  <div>
                    <span className={lbl}>Frost depth (in)</span>
                    <input type="number" min={0} className={input} value={townForm.frostDepthIn}
                      onChange={e => setTownForm({ ...townForm, frostDepthIn: Number(e.target.value) })} />
                  </div>
                  <div>
                    <span className={lbl}>Code edition</span>
                    <input className={input} placeholder="e.g. 2021 IRC" value={townForm.codeEdition}
                      onChange={e => setTownForm({ ...townForm, codeEdition: e.target.value })} />
                  </div>
                </div>
                <span className={lbl}>Where these came from</span>
                <input className={input} placeholder="e.g. Building dept table, confirmed by phone 12 Mar"
                  value={townForm.loadSource}
                  onChange={e => setTownForm({ ...townForm, loadSource: e.target.value })} />
              </div>

              <span className={lbl}>Required documents — one per line</span>
              <textarea className={`${input} min-h-[70px] mb-2`} value={townForm.requiredDocumentsText}
                placeholder={'Plot plan\nProperty survey\nContractor license\nWorkers comp certificate'}
                onChange={e => setTownForm({ ...townForm, requiredDocumentsText: e.target.value })} />
              <textarea className={`${input} min-h-[60px] mb-2`} placeholder="Notes — quirks, who to call, what got rejected last time"
                value={townForm.notes} onChange={e => setTownForm({ ...townForm, notes: e.target.value })} />
              <button onClick={saveTown} disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: 'rgba(234,88,12,0.9)' }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save town
              </button>
            </div>

            {towns.map(t => (
              <div key={t.id} className={card}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold text-white">{t.name}, {t.state}</div>
                    <div className="text-sm text-gray-400">{t.portalVendor}</div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <div>
                        {t.combinedPdf ? 'One combined PDF' : 'Separate file per sheet'}
                        {t.maxFileSizeMb > 0 && ` · max ${t.maxFileSizeMb}MB`}
                        {t.typicalReviewDays > 0 && ` · ~${t.typicalReviewDays} day review`}
                        {t.requiresWetStamp && ' · wet stamp required'}
                      </div>
                      {t.namingConvention && <div>Naming: {t.namingConvention}</div>}
                      {(t.requiredDocuments || []).length > 0 && (
                        <div>Requires: {t.requiredDocuments.join(', ')}</div>
                      )}
                      {t.notes && <div className="text-gray-400 mt-1">{t.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.portalUrl && (
                      <a href={t.portalUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-400">
                        <ExternalLink className="w-3.5 h-3.5" /> Portal
                      </a>
                    )}
                    <button onClick={() => setTownForm({ ...EMPTY_TOWN, ...t, requiredDocumentsText: (t.requiredDocuments || []).join('\n') })}
                      className="text-sm text-gray-400 hover:text-white">Edit</button>
                    <button onClick={() => removeTown(t.id, t.name)} className="text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
