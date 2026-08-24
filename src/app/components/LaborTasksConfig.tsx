/**
 * Editing how long work takes.
 *
 * The hourly rates live next door in LaborRatesConfig. This is the other half:
 * the production rates that turn a quantity into hours, without which a rate
 * cannot price anything.
 *
 * WHAT THIS SCREEN IS HONEST ABOUT
 *
 * Every figure ships as an industry starting point, not a measurement of Black
 * Phoenix crews, and the screen says so until Eric has changed it. A task he
 * has edited is marked as his and is never overwritten by a later seed update.
 * Presenting a book number as though it were measured is how an estimate looks
 * confident and is quietly wrong.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Save, Loader2, RotateCcw, Search, Check, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import {
  SEED_TASKS, LABOR_CONDITIONS, mergeTasks, seedCoverage, estimateTaskLabor,
  type LaborTask,
} from '../lib/laborTasks';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

const TRADE_LABELS: Record<string, string> = {
  carpentry: 'Carpentry', painting: 'Painting', electrical: 'Electrical',
  plumbing: 'Plumbing', laboring: 'General Labour', sheetrock: 'Drywall & Taping',
  siding: 'Siding', roofing: 'Roofing', tile: 'Tile', flooring: 'Flooring',
  masonry: 'Masonry', hvac: 'HVAC',
};

export default function LaborTasksConfig() {
  const [tasks, setTasks] = useState<LaborTask[]>(SEED_TASKS);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [trade, setTrade] = useState<string>('all');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authedHeaders();
      const [taskRes, rateRes] = await Promise.allSettled([
        fetch(`${SERVER}/labor-tasks/get`, { headers }).then(r => r.json()),
        fetch(`${SERVER}/labor-rates/get`, { headers }).then(r => r.json()),
      ]);
      if (taskRes.status === 'fulfilled' && taskRes.value?.success) {
        setTasks(mergeTasks(taskRes.value.tasks));
        setLastSaved(taskRes.value.lastSaved || null);
      }
      if (rateRes.status === 'fulfilled' && rateRes.value?.success) {
        const map: Record<string, number> = {};
        (rateRes.value.laborRates || []).forEach((r: any) => { map[r.id] = Number(r.hourlyRate) || 0; });
        setRates(map);
      }
    } catch {
      // The seed still renders, so the screen is usable while the server is not.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (id: string, patch: Partial<LaborTask>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch, source: 'yours' } : t)));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Only what he has actually changed is stored. Sending the untouched seed
      // back would freeze today's book figures into his account and stop future
      // catalogue improvements reaching him.
      const mine = tasks.filter(t => t.source === 'yours');
      const res = await fetch(`${SERVER}/labor-tasks/save`, {
        method: 'POST', headers: await authedHeaders(), body: JSON.stringify({ tasks: mine }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not save your labour hours.');
      setLastSaved(data.lastSaved || new Date().toISOString());
      setDirty(false);
      toast.success(`Saved ${mine.length} adjusted task${mine.length === 1 ? '' : 's'}.`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save your labour hours.');
    } finally {
      setSaving(false);
    }
  };

  const revert = (id: string) => {
    const seed = SEED_TASKS.find(t => t.id === id);
    if (!seed) return;
    setTasks(prev => prev.map(t => (t.id === id ? { ...seed } : t)));
    setDirty(true);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(t => {
      if (trade !== 'all' && t.tradeId !== trade) return false;
      if (!q) return true;
      return `${t.name} ${TRADE_LABELS[t.tradeId] || t.tradeId} ${t.notes || ''}`.toLowerCase().includes(q);
    });
  }, [tasks, trade, query]);

  const coverage = seedCoverage(tasks);
  const trades = useMemo(() => [...new Set(SEED_TASKS.map(t => t.tradeId))].sort(), []);

  return (
    <div className="bplt">
      <style>{CSS}</style>

      <header className="bplt-head">
        <div>
          <h1><Clock size={20} /> Labour hours by task</h1>
          <p>
            How long each task takes, in man-hours per unit. Your hourly rates live in
            Labour Rates — these turn a quantity into hours so a quote can price it.
          </p>
        </div>
        <div className="bplt-actions">
          <button className="bplt-btn" onClick={load} disabled={loading || saving}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Reload
          </button>
          <button className="bplt-btn bplt-primary" onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </header>

      {/* The honest bit. This stays until he has been through them. */}
      {coverage.yours < coverage.total && (
        <div className="bplt-note">
          <AlertTriangle size={16} />
          <div>
            <strong>{coverage.seeded} of {coverage.total} are industry starting figures</strong>, not
            measurements of your crews. They are here so quotes are defensible on day one.
            Correct any of them against a real job and it becomes yours — a later update
            to the catalogue will never overwrite it.
            {lastSaved && <> Last changed {new Date(lastSaved).toLocaleDateString()}.</>}
          </div>
        </div>
      )}

      <div className="bplt-toolbar">
        <div className="bplt-search">
          <Search size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks — tile, framing, tape…" aria-label="Search tasks" />
        </div>
        <select className="bplt-select" value={trade} onChange={e => setTrade(e.target.value)} aria-label="Trade">
          <option value="all">All trades ({tasks.length})</option>
          {trades.map(t => (
            <option key={t} value={t}>{TRADE_LABELS[t] || t}</option>
          ))}
        </select>
      </div>

      <div className="bplt-grid">
        {visible.map(task => {
          const rate = rates[task.tradeId] || 0;
          // A worked example makes an abstract rate legible: 100 units of this
          // task, at his rate, is what it will actually put on a quote.
          const sample = estimateTaskLabor(task, 100, rate);
          return (
            <div key={task.id} className="bplt-card" data-yours={task.source === 'yours'}>
              <div className="bplt-card-head">
                <div>
                  <h3>{task.name}</h3>
                  <span className="bplt-trade">{TRADE_LABELS[task.tradeId] || task.tradeId}</span>
                </div>
                {task.source === 'yours'
                  ? <span className="bplt-badge bplt-yours"><Check size={12} /> Yours</span>
                  : <span className="bplt-badge">Starting figure</span>}
              </div>

              {task.notes && <p className="bplt-notes">{task.notes}</p>}

              <div className="bplt-fields">
                <label>
                  <span>Man-hours per {task.unit}</span>
                  <input type="number" step="0.001" min="0" value={task.hoursPerUnit}
                    onChange={e => update(task.id, { hoursPerUnit: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Minimum hours</span>
                  <input type="number" step="0.5" min="0" value={task.minimumHours}
                    onChange={e => update(task.id, { minimumHours: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Crew size</span>
                  <input type="number" step="1" min="1" value={task.crewSize}
                    onChange={e => update(task.id, { crewSize: Number(e.target.value) })} />
                </label>
              </div>

              <div className="bplt-example">
                <span>100 {task.unit}</span>
                <strong>{sample.hours} hrs</strong>
                {rate > 0
                  ? <span className="bplt-money">${sample.cost.toLocaleString()}</span>
                  : <span className="bplt-warn-inline">no rate set for this trade</span>}
                <span className="bplt-crew"><Users size={12} /> {sample.crewDays} crew-days</span>
                {task.source === 'yours' && (
                  <button className="bplt-revert" onClick={() => revert(task.id)}>Reset</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="bplt-empty">No tasks match that search.</p>
      )}

      <section className="bplt-conditions">
        <h2>Conditions that slow work down</h2>
        <p>
          These multiply the hours above when they apply to a job. They cut across every
          trade, because an occupied house slows the tiler and the painter alike.
        </p>
        <div className="bplt-cond-grid">
          {LABOR_CONDITIONS.map(c => (
            <div key={c.id} className="bplt-cond">
              <div><strong>{c.label}</strong> <span>+{Math.round((c.multiplier - 1) * 100)}%</span></div>
              <p>{c.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Real CSS, not p-* / m-*. The global reset is deliberately unlayered, which
 * leaves those utilities computing to 0px everywhere in this application.
 */
const CSS = `
.bplt { background:#0A0A0A; min-height:100vh; color:#f4f4f5; padding:22px;
  display:flex; flex-direction:column; gap:18px;
  font:14px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
@media (min-width:900px){ .bplt { padding:30px 34px; } }

.bplt-head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:14px;
  border:1px solid #2A2A2A; border-radius:18px; padding:22px;
  background:radial-gradient(700px 200px at 5% -30%, rgba(234,88,12,.16), transparent 60%), #141414; }
.bplt-head h1 { margin:0; font-size:22px; font-weight:800; letter-spacing:-.02em;
  display:flex; align-items:center; gap:10px; }
.bplt-head p { margin:6px 0 0; color:#9ca3af; font-size:13.5px; max-width:64ch; }
.bplt-actions { display:flex; gap:8px; flex-wrap:wrap; }

.bplt-btn { min-height:44px; padding:0 16px; border-radius:12px; border:1px solid #2A2A2A;
  background:#1A1A1A; color:#f4f4f5; font-size:13.5px; font-weight:700; cursor:pointer;
  display:inline-flex; align-items:center; gap:8px; }
.bplt-btn:disabled { opacity:.5; cursor:default; }
.bplt-primary { background:linear-gradient(135deg,#ea580c,#f97316); border:none; color:#fff; }

.bplt-note { display:flex; gap:11px; align-items:flex-start; padding:15px 17px; border-radius:14px;
  background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.28); color:#fcd34d; font-size:13.5px; }
.bplt-note strong { color:#fde68a; }

.bplt-toolbar { display:flex; gap:10px; flex-wrap:wrap; }
.bplt-search { position:relative; flex:1 1 260px; }
.bplt-search svg { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#6b7280; }
.bplt-search input { width:100%; min-height:44px; padding:11px 13px 11px 40px; border-radius:12px;
  background:#141414; border:1px solid #2A2A2A; color:#f4f4f5; font-size:14px; outline:none; }
.bplt-select { min-height:44px; padding:0 12px; border-radius:12px; background:#141414;
  border:1px solid #2A2A2A; color:#f4f4f5; font-size:13.5px; font-weight:600; }

.bplt-grid { display:grid; grid-template-columns:1fr; gap:12px; }
@media (min-width:760px){ .bplt-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (min-width:1300px){ .bplt-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }

.bplt-card { border:1px solid #2A2A2A; border-radius:16px; background:#141414; padding:16px;
  display:flex; flex-direction:column; gap:11px; }
.bplt-card[data-yours="true"] { border-color:rgba(52,211,153,.4); }
.bplt-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.bplt-card-head h3 { margin:0; font-size:14.5px; font-weight:700; letter-spacing:-.01em; }
.bplt-trade { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:.07em; font-weight:700; }
.bplt-badge { flex-shrink:0; font-size:10.5px; font-weight:700; padding:4px 8px; border-radius:8px;
  background:rgba(255,255,255,.05); border:1px solid #2A2A2A; color:#9ca3af; white-space:nowrap; }
.bplt-yours { background:rgba(52,211,153,.14); border-color:rgba(52,211,153,.4); color:#34d399;
  display:inline-flex; align-items:center; gap:4px; }
.bplt-notes { margin:0; font-size:12.5px; color:#9ca3af; line-height:1.55; }

.bplt-fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.bplt-fields label { display:flex; flex-direction:column; gap:5px; }
.bplt-fields span { font-size:10.5px; color:#6b7280; text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
.bplt-fields input { min-height:44px; padding:9px 10px; border-radius:10px; background:#0F0F0F;
  border:1px solid #2A2A2A; color:#f4f4f5; font-size:14px; font-variant-numeric:tabular-nums; outline:none; }
.bplt-fields input:focus { border-color:rgba(234,88,12,.55); }

.bplt-example { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding-top:10px;
  border-top:1px solid #2A2A2A; font-size:12.5px; color:#9ca3af; }
.bplt-example strong { color:#f4f4f5; font-variant-numeric:tabular-nums; }
.bplt-money { color:#34d399; font-weight:700; font-variant-numeric:tabular-nums; }
.bplt-warn-inline { color:#fbbf24; }
.bplt-crew { display:inline-flex; align-items:center; gap:4px; color:#6b7280; }
.bplt-revert { margin-left:auto; min-height:32px; padding:0 10px; border-radius:8px; border:1px solid #2A2A2A;
  background:transparent; color:#9ca3af; font-size:12px; cursor:pointer; }
/* Every control clears the tap floor on a touch screen. Reset was 32px, which
   is fine under a mouse and a miss under a thumb. */
@media (pointer:coarse){ .bplt-revert { min-height:44px; padding:0 14px; } }

.bplt-empty { color:#6b7280; text-align:center; padding:30px 0; }

.bplt-conditions { border:1px solid #2A2A2A; border-radius:18px; background:#141414; padding:22px; }
.bplt-conditions h2 { margin:0 0 6px; font-size:16px; font-weight:800; letter-spacing:-.01em; }
.bplt-conditions > p { margin:0 0 16px; color:#9ca3af; font-size:13.5px; max-width:70ch; }
.bplt-cond-grid { display:grid; grid-template-columns:1fr; gap:10px; }
@media (min-width:700px){ .bplt-cond-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (min-width:1100px){ .bplt-cond-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.bplt-cond { border:1px solid #2A2A2A; border-radius:12px; padding:13px; background:rgba(255,255,255,.02); }
.bplt-cond div { display:flex; justify-content:space-between; gap:8px; font-size:13.5px; }
.bplt-cond div span { color:#fb923c; font-weight:700; font-variant-numeric:tabular-nums; }
.bplt-cond p { margin:5px 0 0; font-size:12px; color:#6b7280; line-height:1.5; }
`;
