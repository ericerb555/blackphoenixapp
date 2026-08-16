/**
 * DeckDesigner — the surface that drives the 3D engine.
 *
 * Controls on the left, the three views on the right, and a materials takeoff
 * derived from the same members that get drawn. Nothing here is typed twice: the
 * quantities come out of the model, so they cannot disagree with the drawing.
 *
 * The project address is not decoration. A permit set is submitted to a specific
 * town for a specific parcel, and snow load and frost depth both come from where
 * the thing is being built — so the address is captured at design time rather
 * than bolted on at print time.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Save, Loader2, Ruler, Hammer, MapPin, AlertTriangle, Check,
  FolderOpen, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import DeckViewer3D, { type ViewMode } from '../components/DeckViewer3D';
import DeckBuildSpecPanel from '../components/DeckBuildSpecPanel';
import DeckStructuralPanel from '../components/DeckStructuralPanel';
import DeckPermitPacket from '../components/DeckPermitPacket';
import PanelErrorBoundary from '../components/PanelErrorBoundary';
import HouseCapture from '../components/HouseCapture';
import DeckFinishPicker from '../components/DeckFinishPicker';
import DesignWorkspaceNav from '../components/DesignWorkspaceNav';
import { DEFAULT_SITE_LOADS, type SiteLoads } from '../lib/deckStructural';
import {
  DEFAULT_DECK, takeoff,
  type DeckModel, type LumberSize, type PostSize, type JoistSpacing,
} from '../lib/deckModel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface SiteInfo { projectName: string; address: string; town: string; state: string; parcel: string }

/** Bumped when this screen changes, so a stale cached page is obvious on sight. */
const BUILD_TAG = 'v3 · new-deck-reset';

const EMPTY_SITE: SiteInfo = { projectName: 'New deck', address: '', town: '', state: '', parcel: '' };

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

interface Session {
  key: number;
  model: DeckModel;
  site: SiteInfo;
  loads: SiteLoads;
  id: string | null;
}

/**
 * One editing session.
 *
 * All designer state lives here and is seeded from props at mount. Starting a
 * new deck or opening a saved one remounts this under a different key, so the
 * previous deck's values cannot survive. There is no reset logic to get wrong,
 * and no way for the address to clear while the dimensions quietly keep their
 * old values — which is exactly what went wrong when reset was done by hand.
 */
function DesignerSession({ session, onSession }: {
  session: Session;
  onSession: (s: Omit<Session, 'key'>) => void;
}) {
  const [model, setModel] = useState<DeckModel>(session.model);
  const [site, setSite] = useState<SiteInfo>(session.site);
  const [mode, setMode] = useState<ViewMode>('3d');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(session.id);
  const [loads, setLoads] = useState<SiteLoads>(session.loads);
  // A snapshot of what was last saved or opened. Comparing against it is how
  // 'New deck' can tell whether there is genuinely unsaved work, instead of
  // warning every time and training the warning to be ignored.
  const [clean, setClean] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const set = useCallback(<K extends keyof DeckModel>(k: K, v: DeckModel[K]) => {
    setModel(m => ({ ...m, [k]: v }));
  }, []);

  const bom = useMemo(() => takeoff(model), [model]);

  /**
   * Flags that need saying while the design is being made, not after it is
   * submitted. These are prescriptive-code reminders, not engineering: they
   * point at the rule, and the structural module will do the real check.
   */
  const advisories = useMemo(() => {
    const out: { level: 'warn' | 'info'; text: string }[] = [];
    if (model.heightFt > 2.5 && !model.guardrail) {
      out.push({ level: 'warn', text: 'A guard is required once the walking surface is more than 30" above grade.' });
    }
    if (bom.joistSpanFt > 16) {
      out.push({ level: 'warn', text: `A ${bom.joistSpanFt}ft joist span is beyond prescriptive deck tables — this will need an engineer.` });
    }
    if (model.cantileverFt > model.depthFt / 4) {
      out.push({ level: 'warn', text: 'Cantilever exceeds a quarter of the back-span, which prescriptive tables do not allow.' });
    }
    if (model.postSpacingFt > 8) {
      out.push({ level: 'warn', text: 'Posts further apart than 8ft push the beam past common span tables.' });
    }
    if (!model.ledgerAttached) {
      out.push({ level: 'info', text: 'Free-standing deck — it needs its own posts and bracing at the house side too.' });
    }
    if (model.heightFt > 6) {
      out.push({ level: 'info', text: 'Above 6ft, lateral bracing is usually required. Expect the inspector to look for it.' });
    }
    return out;
  }, [model, bom.joistSpanFt]);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${SERVER}/design-projects?ownerKey=decks`, { headers: await headers() });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.projects) {
        setProjects(data.projects.filter((p: any) => p?.meta?.kind === 'deck'));
      }
    } catch {
      // A failed list is not worth interrupting the design for.
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const save = useCallback(async () => {
    if (!site.projectName.trim()) { toast.error('Give the project a name.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/design-projects`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({
          id: savedId || undefined,
          ownerKey: 'decks',
          name: site.projectName,
          // The model and the site live together: a deck design without the
          // address it is being built at cannot be permitted, and the loads
          // depend on where it is.
          meta: { kind: 'deck', model, site, loads, takeoff: bom },
          note: savedId ? 'Updated' : 'Created',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || `Save failed (${res.status})`); return; }
      setSavedId(data.project.id);
      setClean(JSON.stringify({ model, site, loads }));
      toast.success(`Saved — version ${data.project.version}`);
      loadList();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }, [site, model, bom, loads, savedId, loadList]);

  /**
   * File the current work as its own project, then clear the desk.
   *
   * Distinct from Save, which writes another version of whatever is open.
   * Without this, the only way to keep an existing deck AND start a different
   * one was to save, then reset, and hope the reset took.
   */
  const saveAsNew = useCallback(async () => {
    const name = prompt('Save the current deck as a new project named:', `${site.projectName} (copy)`);
    if (name === null) return;
    if (!name.trim()) { toast.error('Give the project a name.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/design-projects`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({
          // No id, so the server mints a new project rather than versioning the
          // one currently open.
          ownerKey: 'decks',
          name: name.trim(),
          meta: { kind: 'deck', model, site: { ...site, projectName: name.trim() }, loads, takeoff: bom },
          note: 'Saved as a new project',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || 'Could not save a copy.'); return; }
      toast.success(`Filed as "${name.trim()}". Starting a new deck.`);
      await loadList();
      hardReset();
    } catch (err) {
      toast.error('Could not save a copy.');
    } finally {
      setSaving(false);
    }
  }, [site, model, loads, bom, loadList]);

  const snapshot = useCallback(
    () => JSON.stringify({ model, site, loads }),
    [model, site, loads],
  );
  const isDirty = clean !== '' && snapshot() !== clean;

  /**
   * Clear the desk and start again.
   *
   * Without this, opening a saved deck left savedId set forever and every
   * subsequent save wrote over that project — there was no way back to a blank
   * sheet short of reloading the page.
   */
  /** The single reset both New and Save-as-new go through. */
  const hardReset = useCallback(() => {
    onSession({ model: { ...DEFAULT_DECK }, site: { ...EMPTY_SITE }, loads: { ...DEFAULT_SITE_LOADS }, id: null });
  }, [onSession]);

  const startNew = useCallback(() => {
    if (isDirty && !confirm('Start a new deck? Unsaved changes to the current one will be lost.')) return;
    hardReset();
    toast.success('New deck started.');
  }, [isDirty, hardReset]);

  const open = useCallback((p: any) => {
    // Swapping the session remounts the editor, so the deck being opened
    // cannot inherit a single value from the one being closed.
    onSession({
      model: { ...DEFAULT_DECK, ...(p?.meta?.model || {}) },
      site: { ...EMPTY_SITE, ...(p?.meta?.site || {}) },
      loads: { ...DEFAULT_SITE_LOADS, ...(p?.meta?.loads || {}) },
      id: p.id,
    });
    toast.success(`Opened ${p.name}`);
  }, [onSession]);

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
  const label = 'block text-xs font-semibold text-gray-400 mb-1';
  const input = 'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]';

  const Num = ({ k, min, max, step = 1, suffix }: { k: keyof DeckModel; min: number; max: number; step?: number; suffix?: string }) => (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={model[k] as number}
        onChange={e => set(k, Number(e.target.value) as any)}
        className="flex-1 accent-[#ea580c]" />
      <span className="text-sm text-white tabular-nums w-16 text-right">
        {model[k] as number}{suffix}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 lg:p-6">
      <div className="max-w-[1500px] mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Hammer className="w-6 h-6 text-[#ea580c]" /> Deck Designer
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              One model, three drawings. The framing plan and the rendering are the same geometry,
              so they cannot disagree.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Which project is open, and whether it has unsaved work. Without
                this the designer looks identical whether you are editing a saved
                deck or a new one, which is how the wrong project gets overwritten. */}
            {savedId && (
              <span className="text-xs text-gray-400 mr-1">
                Editing <strong className="text-white">{site.projectName}</strong>
                {isDirty && <span className="text-yellow-400"> · unsaved changes</span>}
              </span>
            )}
            {savedId && (
              <button onClick={saveAsNew} disabled={saving}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                title="Keep this deck under its own name, then start a new one">
                <FolderOpen className="w-4 h-4" /> Save as new
              </button>
            )}
            <button onClick={startNew}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              title="Clear the desk and start a new deck">
              <Plus className="w-4 h-4" /> New deck
            </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savedId ? 'Save version' : 'Save project'}
          </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/* Controls */}
          <div className="space-y-4">
            <DesignWorkspaceNav current="deck-designer" />
            <div className={card}>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[#ea580c]" /> Project &amp; site
              </h2>
              <div className="space-y-2">
                <input className={input} placeholder="Project name" value={site.projectName}
                  onChange={e => setSite(s => ({ ...s, projectName: e.target.value }))} />
                <input className={input} placeholder="Street address" value={site.address}
                  onChange={e => setSite(s => ({ ...s, address: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} placeholder="Town" value={site.town}
                    onChange={e => setSite(s => ({ ...s, town: e.target.value }))} />
                  <input className={input} placeholder="State" value={site.state}
                    onChange={e => setSite(s => ({ ...s, state: e.target.value }))} />
                </div>
                <input className={input} placeholder="Parcel / Map-Lot (optional)" value={site.parcel}
                  onChange={e => setSite(s => ({ ...s, parcel: e.target.value }))} />
              </div>
              <p className="text-[11px] text-gray-600 mt-2">
                Snow load and frost depth come from where it is built, so the address is needed
                before the structural sheet can be produced.
              </p>
            </div>

            <div className={card}>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Ruler className="w-4 h-4 text-[#ea580c]" /> Size
              </h2>
              <div className="space-y-3">
                <div><span className={label}>Width (along house)</span><Num k="widthFt" min={6} max={40} suffix="ft" /></div>
                <div><span className={label}>Depth (out from house)</span><Num k="depthFt" min={4} max={24} suffix="ft" /></div>
                <div><span className={label}>Height above grade</span><Num k="heightFt" min={0.5} max={12} step={0.5} suffix="ft" /></div>
                <div><span className={label}>Cantilever past beam</span><Num k="cantileverFt" min={0} max={4} step={0.5} suffix="ft" /></div>
              </div>
            </div>

            <div className={card}>
              <h2 className="text-sm font-bold text-white mb-3">Framing</h2>
              <div className="space-y-3">
                <div>
                  <span className={label}>Joist size</span>
                  <select className={input} value={model.joistSize}
                    onChange={e => set('joistSize', e.target.value as LumberSize)}>
                    {(['2x6', '2x8', '2x10', '2x12'] as LumberSize[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <span className={label}>Joist spacing</span>
                  <select className={input} value={model.joistSpacing}
                    onChange={e => set('joistSpacing', Number(e.target.value) as JoistSpacing)}>
                    {[12, 16, 24].map(s => <option key={s} value={s}>{s}" on centre</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={label}>Beam</span>
                    <select className={input} value={model.beamSize}
                      onChange={e => set('beamSize', e.target.value as LumberSize)}>
                      {(['2x8', '2x10', '2x12'] as LumberSize[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className={label}>Plies</span>
                    <select className={input} value={model.beamPlies}
                      onChange={e => set('beamPlies', Number(e.target.value))}>
                      {[2, 3].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={label}>Post</span>
                    <select className={input} value={model.postSize}
                      onChange={e => set('postSize', e.target.value as PostSize)}>
                      {(['4x4', '6x6'] as PostSize[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className={label}>Post spacing</span>
                    <Num k="postSpacingFt" min={4} max={10} suffix="ft" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  {([
                    ['ledgerAttached', 'Attached to house'],
                    ['guardrail', 'Guardrail'],
                    ['stairs', 'Stairs'],
                  ] as [keyof DeckModel, string][]).map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-xs text-gray-300">
                      <input type="checkbox" className="accent-[#ea580c]"
                        checked={model[k] as boolean}
                        onChange={e => set(k, e.target.checked as any)} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {projects.length > 0 && (
              <div className={card}>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-[#ea580c]" /> Saved decks
                  {loadingList && <Loader2 className="w-3 h-3 animate-spin" />}
                </h2>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {projects.map(p => (
                    <button key={p.id} onClick={() => open(p)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        savedId === p.id ? 'bg-[#ea580c] text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 hover:text-white'
                      }`}>
                      <div className="truncate">{p.name}</div>
                      <div className="text-[11px] opacity-70">
                        v{p.version} · {p.meta?.site?.town || 'no town'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Views + takeoff */}
          <div className="space-y-4">
            <div className={card}>
              <PanelErrorBoundary name="Drawings"><DeckViewer3D model={model} mode={mode} onModeChange={setMode} height={520} /></PanelErrorBoundary>
            </div>

            <PanelErrorBoundary name="Finishes">
              <DeckFinishPicker model={model} onChange={patch => setModel(m => ({ ...m, ...patch }))} />
            </PanelErrorBoundary>

            {/* Sits directly under the drawings: the measured views and the
                photo of the real house are the two ways of looking at the same
                deck, and keeping them adjacent makes the difference between
                them obvious rather than something stated in fine print. */}
            <PanelErrorBoundary name="The existing house">
              <HouseCapture model={model} site={site}
                onApply={patch => setModel(m => ({ ...m, ...patch }))} />
            </PanelErrorBoundary>

            {advisories.length > 0 && (
              <div className={card}>
                <h2 className="text-sm font-bold text-white mb-2">Worth knowing</h2>
                <div className="space-y-2">
                  {advisories.map((a, i) => (
                    <p key={i} className="flex items-start gap-2 text-sm"
                      style={{ color: a.level === 'warn' ? '#facc15' : '#9ca3af' }}>
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {a.text}
                    </p>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 mt-3">
                  These are prescriptive-code reminders, not an engineering check. Loads and
                  footing sizes come next.
                </p>
              </div>
            )}

            <PanelErrorBoundary name="Loads and footings"><DeckStructuralPanel model={model} site={site} loads={loads} onLoadsChange={setLoads} /></PanelErrorBoundary>

            <PanelErrorBoundary name="Permit packet"><DeckPermitPacket model={model} site={site} loads={loads} /></PanelErrorBoundary>

            <PanelErrorBoundary name="Build specification"><DeckBuildSpecPanel model={model} site={site} /></PanelErrorBoundary>

            <div className={card}>
              <h2 className="text-sm font-bold text-white mb-3">Materials</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  ['Deck area', `${bom.deckAreaSqFt} sq ft`],
                  ['Joists', `${bom.joists} × ${bom.joistSize}`],
                  ['Joist spacing', `${bom.joistSpacing}" o.c.`],
                  ['Joist span', `${bom.joistSpanFt} ft`],
                  ['Beam', bom.beam],
                  ['Posts', `${bom.posts} × ${bom.postSize}`],
                  ['Footings', String(bom.footings)],
                  ['Decking boards', String(bom.deckingBoards)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-gray-500 text-xs">{k}</div>
                    <div className="text-white font-semibold">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 mt-3 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Counted from the same members that are drawn, so this cannot drift from the plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * Owns which session is being edited. Changing the key is the only way a deck
 * is swapped, so a stale value cannot outlive the swap.
 */
export default function DeckDesigner() {
  const [session, setSession] = useState<Session>({
    key: 0,
    model: { ...DEFAULT_DECK },
    site: { ...EMPTY_SITE },
    loads: { ...DEFAULT_SITE_LOADS },
    id: null,
  });

  return (
    <DesignerSession
      key={session.key}
      session={session}
      onSession={next => setSession(s => ({ ...next, key: s.key + 1 }))}
    />
  );
}