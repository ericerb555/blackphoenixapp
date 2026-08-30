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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import JobFolder from '../components/JobFolder';
import { forgetFolder } from '../lib/localFolder';
import DeckFinishPicker from '../components/DeckFinishPicker';
import ConnectionDetails from '../components/ConnectionDetails';
import DeckQuotePanel from '../components/DeckQuotePanel';
import SketchImport from '../components/SketchImport';
import SidingTakeoff from '../components/SidingTakeoff';
import OpeningsTakeoff from '../components/OpeningsTakeoff';
import ProjectLinkPanel, { type DesignLink } from '../components/ProjectLinkPanel';
import DeckAssistant from '../components/DeckAssistant';
import DesignWorkspaceNav from '../components/DesignWorkspaceNav';
import { DEFAULT_SITE_LOADS, computeStructural, type SiteLoads } from '../lib/deckStructural';
import { lookupTownLoads, hasUsableLoads, type TownLoadCase } from '../lib/townLoads';
import { DESIGN_OWNER_KEY } from '../lib/designProjectService';
import { setCurrentJob } from '../lib/currentJob';
import {
  DEFAULT_DECK, takeoff,
  type DeckModel, type LumberSize, type PostSize, type JoistSpacing,
} from '../lib/deckModel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface SiteInfo { projectName: string; address: string; town: string; state: string; parcel: string }

/** Bumped when this screen changes, so a stale cached page is obvious on sight. */
const BUILD_TAG = 'v7 · shared-job';

const EMPTY_SITE: SiteInfo = { projectName: 'New deck', address: '', town: '', state: '', parcel: '' };

/**
 * A deck that has not been given a size yet.
 *
 * A new deck used to start as a real 16 × 12, which meant every drawing —
 * the rendering, the framing plan, the connection details, the build spec —
 * came up fully populated the moment the desk was cleared. When the previous
 * deck was anywhere near those numbers the screen looked untouched, and the
 * only way to tell a new deck from the old one was to guess. That is not a
 * confusion worth having on a permit drawing.
 *
 * Zero means "not set" rather than "a deck zero feet wide". Everything
 * downstream is gated on a real width and depth, so nothing is drawn until
 * there is something true to draw. The rest of the defaults stay: joist size,
 * spacing and finishes are sensible starting points that do not pretend to be
 * measurements of anything.
 */
const BLANK_DECK: DeckModel = { ...DEFAULT_DECK, widthFt: 0, depthFt: 0 };

/**
 * A slider bound to one measurement of the deck.
 *
 * Declared out here rather than inside the designer, and that placement is the
 * whole point. A component defined in a render body is a brand new component
 * type on every render, so React cannot match it to the one before: it tears
 * the old input out of the DOM and mounts a fresh one after every change. On a
 * range slider that lands mid-gesture, which is why dragging one felt like it
 * slipped rather than tracked. Out here the type is stable and the input is the
 * same element from first render to last.
 *
 * It takes the model and the setter as props instead of closing over them,
 * which is what allows it to live outside.
 */
function Num({ k, min, max, step = 1, suffix, model, set }: {
  k: keyof DeckModel;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  model: DeckModel;
  set: <K extends keyof DeckModel>(k: K, v: DeckModel[K]) => void;
}) {
  // Width and depth are the two that can be genuinely unset, and a slider
  // cannot show empty — its thumb has to sit somewhere. So the readout says so
  // in words rather than showing a 0 that reads like a measured value. Other
  // fields may legitimately be zero (a cantilever often is) and are left alone.
  const unset = (k === 'widthFt' || k === 'depthFt') && !(model[k] as number);
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={model[k] as number}
        onChange={e => set(k, Number(e.target.value) as any)}
        className="flex-1 accent-[#ea580c]" />
      <span className="text-sm text-white tabular-nums w-16 text-right">
        {unset
          ? <span className="text-gray-500 text-xs">not set</span>
          : <>{model[k] as number}{suffix}</>}
      </span>
    </div>
  );
}

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

const NO_LINK: DesignLink = { customerId: '', customerName: '', jobId: '', jobTitle: '' };

/**
 * Where work goes when the server will not take it.
 *
 * 'New deck' used to refuse to clear the desk if parking failed, reasoning that
 * clearing after failing to save is worse than not clearing at all. Losing the
 * work is worse — but clearing and losing are only the same thing when the work
 * has nowhere else to go. So it goes here first, on the machine in front of the
 * user, and then the desk clears either way. A button that visibly does nothing
 * when the network is down is not a safety feature.
 */
const UNPARKED_KEY = 'deck.unparked.v1';

interface Unparked {
  name: string; model: DeckModel; site: SiteInfo; loads: SiteLoads; link: DesignLink; at: string;
}

function readUnparked(): Unparked | null {
  try {
    const raw = localStorage.getItem(UNPARKED_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v?.model && v?.site ? (v as Unparked) : null;
  } catch { return null; }
}

/** False when the browser refuses the write — private mode, or quota. */
function writeUnparked(v: Unparked): boolean {
  try { localStorage.setItem(UNPARKED_KEY, JSON.stringify(v)); return true; }
  catch { return false; }
}

function clearUnparked() {
  try { localStorage.removeItem(UNPARKED_KEY); } catch { /* already gone */ }
}

interface Session {
  key: number;
  model: DeckModel;
  site: SiteInfo;
  loads: SiteLoads;
  link: DesignLink;
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
  /** The saved version number, so a quote can record which design it came from. */
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  /**
   * How anything produced here reaches the customer's folder.
   *
   * Held in a ref rather than state because it is a function handed up by the
   * customer panel, and re-rendering the whole designer every time that panel
   * re-creates its callback would be a lot of work for nothing.
   */
  const filer = useRef<((label: string, category: string, dataUri: string, shared?: boolean) => Promise<boolean>) | null>(null);

  /**
   * Which part of the work is on screen.
   *
   * This page used to render eleven panels in one scroll — capture, design,
   * pricing and paperwork all at once, whatever you were actually doing. It had
   * been reorganised twice without landing, because the trouble was never the
   * arrangement: there was no notion of what stage the work was at, so there
   * was nothing to arrange around.
   *
   * Design is the default because it is where most returns to this page are
   * headed, and because it is closest to what the page used to show.
   */
  const [stage, setStage] = useState<'capture' | 'design' | 'price' | 'documents'>('design');

  /**
   * Which trade is being designed.
   *
   * The design centre is one place for every trade this company sells, and the
   * five things around the middle — the customer, the capture, the pricing, the
   * presentation, the documents — are the same whichever it is. Only the model
   * in the middle differs, which is what makes a second trade an addition here
   * rather than a second product.
   *
   * Held on the page rather than on the design, because switching trade is a
   * navigation act and not an edit: nothing about the deck is discarded by
   * looking at the siding.
   */
  const [trade, setTrade] = useState<'deck' | 'siding' | 'openings'>('deck');

  /**
   * Take the address from the job the design is attached to, but never quietly
   * replace one somebody typed.
   *
   * Filling an empty field saves retyping an address that is already on the
   * work request. Overwriting a filled one is a different act entirely: the
   * address sets snow load, frost depth and the code edition, so silently
   * moving it would silently change the structure of the deck. When the two
   * disagree the designer is told and chooses.
   */
  useEffect(() => {
    const fromJob = String(link.jobAddress || '').trim();
    if (!fromJob) return;
    setSite(s => (String(s.address || '').trim() ? s : { ...s, address: fromJob }));
  }, [link.jobAddress]);

  const addressDiffers = Boolean(
    link.jobAddress
    && String(site.address || '').trim()
    && String(site.address).trim().toLowerCase() !== String(link.jobAddress).trim().toLowerCase(),
  );
  const [loads, setLoads] = useState<SiteLoads>(session.loads);
  const [link, setLink] = useState<DesignLink>(session.link);
  // A snapshot of what was last saved or opened. Comparing against it is how
  // 'New deck' can tell whether there is genuinely unsaved work, instead of
  // warning every time and training the warning to be ignored.
  const [clean, setClean] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [parking, setParking] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  // Read at mount rather than watched: the session remounts on every reset, so
  // this is re-read at exactly the moment it can have changed.
  const [unparked, setUnparked] = useState<Unparked | null>(() => readUnparked());

  const set = useCallback(<K extends keyof DeckModel>(k: K, v: DeckModel[K]) => {
    setModel(m => ({ ...m, [k]: v }));
  }, []);

  /**
   * Files on their way from the job folder to the two readers.
   *
   * A counter rather than a comparison of the arrays: sending the same photos a
   * second time is a deliberate thing an operator does after moving one of them
   * to the other pile, and comparing contents would silently ignore it.
   */
  const [photoDrop, setPhotoDrop] = useState<{ files: File[]; n: number }>({ files: [], n: 0 });
  const [sketchDrop, setSketchDrop] = useState<{ files: File[]; n: number }>({ files: [], n: 0 });

  /**
   * What the two readers made of the folder, held here so the assistant can see
   * both at once. Neither reader needs the other's result; the assistant does,
   * because the whole point is reconciling a dimensioned drawing against what
   * the photos show of the house it has to attach to.
   */
  const [houseRead, setHouseRead] = useState<any>(null);
  const [sketchRead, setSketchRead] = useState<any>(null);
  const findings = useMemo(
    () => ({ house: houseRead, sketch: sketchRead }),
    [houseRead, sketchRead],
  );

  const sendFolder = useCallback((photos: File[], drawings: File[]) => {
    if (photos.length) setPhotoDrop(d => ({ files: photos, n: d.n + 1 }));
    if (drawings.length) setSketchDrop(d => ({ files: drawings, n: d.n + 1 }));
  }, []);

  /**
   * What the town the deck is in enforces.
   *
   * The address has always been captured here and has never done anything. It
   * is the structural input: ground snow and frost depth are what decide member
   * sizes and how deep the footings go, and they change between neighbouring
   * towns. So once the town is known, what that town enforces is offered.
   *
   * Offered, not applied. `deckStructural` is explicit that these are inputs and
   * never inferred, and this respects that — the figures come from a record
   * somebody typed off the building department's table, they arrive with the
   * note saying so, and `verified` stays false until the operator ticks it.
   */
  const [townCase, setTownCase] = useState<TownLoadCase | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    setTownCase(null);
    // Debounced: an address is typed a character at a time and this is a
    // listing request, not a keystroke handler.
    const t = setTimeout(() => {
      lookupTownLoads(site.town, site.state, ac.signal).then(setTownCase).catch(() => {});
    }, 400);
    return () => { clearTimeout(t); ac.abort(); };
  }, [site.town, site.state]);

  /** Only worth showing while it has something the design has not already got. */
  const townOffer = useMemo(() => {
    if (!townCase || !hasUsableLoads(townCase)) return null;
    const snow = townCase.groundSnowPsf > 0 && !(loads.groundSnowPsf > 0);
    const frost = townCase.frostDepthIn > 0 && !(loads.frostDepthIn > 0);
    return snow || frost ? { snow, frost } : null;
  }, [townCase, loads.groundSnowPsf, loads.frostDepthIn]);

  const applyTownLoads = useCallback(() => {
    if (!townCase) return;
    setLoads(l => ({
      ...l,
      // Never overwrite a figure already entered by hand — that one was typed
      // by someone looking at something, and this one was not.
      groundSnowPsf: l.groundSnowPsf > 0 ? l.groundSnowPsf : townCase.groundSnowPsf,
      frostDepthIn: l.frostDepthIn > 0 ? l.frostDepthIn : townCase.frostDepthIn,
      verified: false,
    }));
    toast.success(`Filled from ${townCase.townName} ${townCase.state} — confirm before this goes on a permit set.`);
  }, [townCase]);

  const bom = useMemo(() => takeoff(model), [model]);

  /**
   * Whether there is a deck to draw yet.
   *
   * Every drawing on this screen is derived from the model, so with no size
   * given they would all render something — a rendering, a framing plan, a set
   * of connection details, a materials list — for a deck nobody has described.
   * That is worse than showing nothing: it looks exactly like the previous
   * project failing to clear, and it puts numbers on screen that were never
   * entered by anyone.
   */
  const sized = (model.widthFt || 0) > 0 && (model.depthFt || 0) > 0;

  /**
   * Tell the rest of the design workspace which job this is.
   *
   * The designer is the only screen that knows — it is where a project is
   * opened and named — so it is the only writer. Everywhere else reads. That
   * asymmetry is deliberate: two writers would eventually disagree, and an
   * indicator that is sometimes wrong is worse than none, because the whole
   * point of it is to be trusted at a glance.
   *
   * An untouched blank deck publishes nothing rather than publishing the words
   * "New deck", so the other screens say "no job selected" instead of naming a
   * deck that does not exist yet.
   */
  useEffect(() => {
    const name = site.projectName.trim();
    const named = name && name !== EMPTY_SITE.projectName;
    if (!named && !savedId) { setCurrentJob(null); return; }
    setCurrentJob({
      id: savedId,
      name: name || 'Untitled deck',
      address: site.address.trim(),
      jobTitle: (link.jobTitle || '').trim(),
      // No quote is linked to a deck design yet; the field is carried so that
      // wiring one later changes this writer and nothing else.
      quoteNumber: '',
    });
  }, [site.projectName, site.address, savedId, link.jobTitle]);
  // The assistant answers against the same figures the panels below display,
  // so it is computed here once rather than described twice.
  const struct = useMemo(() => computeStructural(model, loads), [model, loads]);

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
      // `owner`, not `ownerKey` — the server reads the query as `owner` and
      // falls back to the 'shared' namespace, so decks written under DECKS
      // were being listed from somewhere they had never been saved.
      const res = await fetch(`${SERVER}/design-projects?owner=${DESIGN_OWNER_KEY}`, { headers: await headers() });
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
          ownerKey: DESIGN_OWNER_KEY,
          name: site.projectName,
          // The model and the site live together: a deck design without the
          // address it is being built at cannot be permitted, and the loads
          // depend on where it is.
          meta: { kind: 'deck', model, site, loads, takeoff: bom, ...link },
          note: savedId ? 'Updated' : 'Created',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) { toast.error(data?.error || `Save failed (${res.status})`); return; }
      setSavedId(data.project.id);
      // Kept so a quote can record which version of the design it was made from.
      setSavedVersion(Number(data.project.version) || null);
      setClean(JSON.stringify({ model, site, loads }));
      toast.success(`Saved — version ${data.project.version}`);
      loadList();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }, [site, model, bom, loads, link, savedId, loadList]);

  /**
   * File the current work as its own project, then clear the desk.
   *
   * Distinct from Save, which writes another version of whatever is open.
   * Without this, the only way to keep an existing deck AND start a different
   * one was to save, then reset, and hope the reset took.
   */
  /**
   * Clear the desk and start again. The single reset both New and Save-as-new
   * go through.
   *
   * Without this, opening a saved deck left savedId set forever and every
   * subsequent save wrote over that project — there was no way back to a blank
   * sheet short of reloading the page.
   *
   * DECLARED BEFORE ITS CALLERS ON PURPOSE. `saveAsNew` and `startNew` both name
   * it in their dependency arrays, and a dependency array is an ordinary
   * expression evaluated during render — not lazily when the callback fires. A
   * `const` declared further down the component is still in its temporal dead
   * zone at that moment, so listing it from above throws ReferenceError on the
   * very first render and takes the whole page with it. It did: minified, it
   * read "Cannot access 'We' before initialization", which says nothing about
   * where to look.
   */
  const hardReset = useCallback(() => {
    // The remembered job folder is the one thing that outlives the session. It
    // lives in IndexedDB so the picker can open straight back into a folder, and
    // it is keyed by slot rather than by deck — so without this, starting a new
    // deck left the previous job's folder attached to it, which reads as the old
    // project refusing to clear. A new deck is a different job.
    for (const slot of ['job-folder', 'job-photos', 'sketches']) {
      forgetFolder(slot).catch(() => { /* nothing remembered for that slot */ });
    }
    onSession({ model: { ...BLANK_DECK }, site: { ...EMPTY_SITE }, loads: { ...DEFAULT_SITE_LOADS }, link: { ...NO_LINK }, id: null });
  }, [onSession]);

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
          ownerKey: DESIGN_OWNER_KEY,
          name: name.trim(),
          meta: { kind: 'deck', model, site: { ...site, projectName: name.trim() }, loads, takeoff: bom, ...link },
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
  }, [site, model, loads, bom, link, loadList, hardReset]);

  const snapshot = useCallback(
    () => JSON.stringify({ model, site, loads }),
    [model, site, loads],
  );
  const isDirty = clean !== '' && snapshot() !== clean;

  /**
   * Put a deck that could not be parked back on the desk.
   *
   * It comes back with no id, so saving it files it as a new project rather
   * than versioning whatever it failed to reach in the first place.
   */
  const restoreUnparked = useCallback(() => {
    const u = readUnparked();
    if (!u) { setUnparked(null); return; }
    clearUnparked();
    onSession({ model: u.model, site: u.site, loads: u.loads, link: u.link, id: null });
    toast.success(`Restored “${u.name}”. It is unsaved — save it to file it.`);
  }, [onSession]);

  const discardUnparked = useCallback(() => {
    clearUnparked();
    setUnparked(null);
    toast.success('Held deck discarded.');
  }, []);

  /**
   * Start a new deck, and park whatever was on the desk rather than losing it.
   *
   * The old behaviour asked "are you sure, unsaved changes will be lost", which
   * is the wrong question: nobody wants to lose the work, and being asked to
   * confirm a loss trains people to click through the dialog. So there is no
   * dialog. Anything that is not a pristine default gets written as a project
   * of its own under a generated reference, and can be renamed and assigned to
   * a customer later from Open.
   *
   * If parking fails the desk still clears, because the work is written to this
   * machine first and offered back from the panel on the left. The old rule was
   * that a failed park cleared nothing, which meant a server hiccup left the
   * button doing nothing at all — no new deck, and no way to start one short of
   * reloading the page. The only case that still refuses is the one where the
   * browser will not hold the work either, since then it really would be gone.
   */
  const startNew = useCallback(async () => {
    const pristine = JSON.stringify({
      model: BLANK_DECK, site: EMPTY_SITE, loads: DEFAULT_SITE_LOADS,
    });
    const hasWork = snapshot() !== pristine;

    if (hasWork) {
      const named = site.projectName.trim() && site.projectName.trim() !== EMPTY_SITE.projectName;
      // A four-digit reference is short enough to read out over the phone and
      // long enough not to collide with the last one in a day's work.
      const ref = Math.floor(1000 + Math.random() * 9000);
      const name = named ? site.projectName.trim() : `Unassigned deck · ${ref}`;

      setParking(true);
      // The desk clears once parking resolves one way or the other, so the
      // request is not allowed to hang. A button stuck on 'Parking…' forever is
      // indistinguishable, to the person clicking it, from a button that does
      // nothing — which is how this was being reported.
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 12_000);
      let parked = false;
      let why = '';
      try {
        const res = await fetch(`${SERVER}/design-projects`, {
          method: 'POST',
          headers: await headers(),
          signal: abort.signal,
          body: JSON.stringify({
            // Update in place when it is already a saved project; otherwise
            // this becomes its own record rather than overwriting anything.
            id: savedId || undefined,
            ownerKey: DESIGN_OWNER_KEY,
            name,
            meta: {
              kind: 'deck', model, site: { ...site, projectName: name },
              loads, takeoff: bom, ...link,
            },
            note: savedId ? 'Saved on starting a new deck' : 'Parked on starting a new deck',
          }),
        });
        const data = await res.json().catch(() => null);
        parked = res.ok && !!data?.success;
        if (!parked) why = String(data?.error || res.status);
      } catch (err: any) {
        why = abort.signal.aborted
          ? 'the server did not answer'
          : (err?.message || 'the server could not be reached');
      } finally {
        clearTimeout(timer);
        setParking(false);
      }

      if (parked) {
        clearUnparked();
        toast.success(
          named ? `Saved “${name}”.` : `Parked as “${name}” — rename and assign it from Open.`,
        );
        loadList();
      } else if (writeUnparked({
        name, model, site: { ...site, projectName: name }, loads, link,
        at: new Date().toISOString(),
      })) {
        toast.error(`Could not park “${name}” (${why}) — it is held on this machine, restore it from the left.`);
      } else {
        // Nowhere at all to put the work. This is the one case where refusing to
        // clear is the right answer.
        toast.error(`Could not park “${name}” (${why}), and this browser would not hold it either — nothing was cleared.`);
        return;
      }
    }

    hardReset();
    toast.success('New deck started.');
  }, [snapshot, site, model, loads, bom, link, savedId, hardReset, loadList]);

  /**
   * Open a saved deck.
   *
   * The row from the list is not the project. Listing returns a summary — it
   * has to, because a floor-plan project's meta carries its whole element tree
   * — so the full record is fetched by id here. Opening straight from the list
   * row silently produced a default deck under the saved project's name, which
   * is the worst kind of wrong: it looks like it worked.
   */
  const open = useCallback(async (p: any) => {
    setOpening(p.id);
    try {
      const res = await fetch(`${SERVER}/design-projects/${p.id}?owner=${DESIGN_OWNER_KEY}`, {
        headers: await headers(),
      });
      const data = await res.json().catch(() => null);
      const full = data?.project;
      if (!res.ok || !full) {
        toast.error(data?.error || `Could not open that project (${res.status}).`);
        return;
      }
      if (!full.meta?.model) {
        toast.error(`“${full.name}” has no deck design saved in it.`);
        return;
      }

      // Swapping the session remounts the editor, so the deck being opened
      // cannot inherit a single value from the one being closed.
      onSession({
        model: { ...DEFAULT_DECK, ...full.meta.model },
        site: { ...EMPTY_SITE, ...(full.meta.site || {}) },
        loads: { ...DEFAULT_SITE_LOADS, ...(full.meta.loads || {}) },
        link: {
          customerId: full.meta.customerId || '',
          customerName: full.meta.customerName || '',
          jobTitle: full.meta.jobTitle || '',
          jobId: full.meta.jobId || '',
        },
        id: full.id,
      });
      toast.success(`Opened ${full.name}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not open that project.');
    } finally {
      setOpening(null);
    }
  }, [onSession]);

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
  const label = 'block text-xs font-semibold text-gray-400 mb-1';
  const input = 'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]';


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
              {/* The build this page came from.
                  A deploy re-rolls the chunk hashes, so a tab left open can go
                  on running old code long after a fix has shipped — and that
                  looks identical to the fix not working. This was already
                  declared for exactly that reason and then never rendered,
                  which made it useless. Reading it out loud is the whole point:
                  if it does not match what was shipped, the page is stale and
                  nothing else about the report can be trusted. */}
              <span className="ml-2 text-[11px] text-gray-600 font-mono">{BUILD_TAG}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Which project is open, and whether it has unsaved work.

                This used to render only when a project was open, which left the
                blank state saying nothing at all — and nothing is exactly what a
                stale project would also say. A new deck is not visibly empty: it
                comes up 16 × 12 at 3ft attached, so if the last deck was near
                those numbers the drawing looks unchanged and the only way to
                tell whether "New deck" worked was to guess. It now always says
                which of the two you are looking at. */}
            {/* Three states, not two. A deck that has been named but never
                saved is neither "editing a project" nor "a blank start", and
                calling it blank contradicted the workspace rail, which named it
                the moment it was typed. Two labels disagreeing about the same
                deck is the failure this whole indicator exists to prevent. */}
            <span className="text-xs text-gray-400 mr-1">
              {savedId ? (
                <>
                  Editing <strong className="text-white">{site.projectName}</strong>
                  {isDirty && <span className="text-yellow-400"> · unsaved changes</span>}
                </>
              ) : site.projectName.trim() && site.projectName.trim() !== EMPTY_SITE.projectName ? (
                <>
                  <strong className="text-white">{site.projectName}</strong>
                  <span className="text-yellow-400"> · not saved yet</span>
                </>
              ) : (
                <>
                  <strong className="text-white">New deck</strong>
                  <span className="text-gray-500"> · blank start, nothing saved yet</span>
                </>
              )}
            </span>
            {savedId && (
              <button onClick={saveAsNew} disabled={saving}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                title="Keep this deck under its own name, then start a new one">
                <FolderOpen className="w-4 h-4" /> Save as new
              </button>
            )}
            <button onClick={startNew} disabled={parking}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              title="Park whatever is open and start a new deck">
              {parking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {parking ? 'Parking…' : 'New deck'}
            </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savedId ? 'Save version' : 'Save project'}
          </button>
          </div>
        </div>

        {/*
          The stages of the work, in the order it happens.

          One stage on screen at a time. That is what makes this usable on a
          phone during a site visit — which is where capture actually happens —
          and a rail beside eleven stacked panels never could be.
        */}
        {/*
          Which trade. Sits above the stages because it decides what the stages
          contain — the customer, the capture, the pricing and the documents are
          the same work whichever trade this is.
        */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Trade</span>
          {([['deck', 'Deck'], ['siding', 'Siding'], ['openings', 'Doors & windows']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTrade(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                trade === id
                  ? 'bg-white/10 text-white ring-1 ring-[#ea580c]/50'
                  : 'border border-[#2A2A2A] text-gray-500 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
          <span className="ml-2 text-[11px] text-gray-600">
            Kitchens, bathrooms, doors and windows come next.
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {([
            ['capture', 'Capture', 'Photos, video and what is already there'],
            ['design', 'Design', 'Size, framing and finishes'],
            ['price', 'Price', 'What it costs, from the framing'],
            ['documents', 'Documents', 'Permit packet, spec and details'],
          ] as const).map(([id, label, hint]) => (
            <button key={id} onClick={() => setStage(id)} title={hint}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                stage === id
                  ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-500/20'
                  : 'border border-[#2A2A2A] bg-[#111] text-gray-400 hover:border-[#ea580c]/40 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/*
            The rail stays put through every stage.

            It holds the things you need whatever you are doing: which project
            is open, the site address — which decides snow load, frost depth and
            which code applies, so it is not administrative detail — and the
            deck's size. Hiding it outside the design stage was tried and was
            wrong: "Saved decks" lives here, so opening a project would have
            been impossible from three of the four stages.
          */}
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
                {/*
                  Surfaced rather than resolved. Two addresses for one job is
                  usually a design attached to the wrong work request, and it is
                  worth a second of attention because this field decides the
                  snow load the deck is framed for.
                */}
                {addressDiffers && (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2">
                    <p className="text-[11px] text-amber-500/90">
                      The job says <span className="font-semibold">{link.jobAddress}</span>.
                    </p>
                    <button
                      onClick={() => setSite(s => ({ ...s, address: String(link.jobAddress || '') }))}
                      className="mt-1 text-[11px] font-bold text-[#ea580c] hover:underline">
                      Use the job's address
                    </button>
                  </div>
                )}
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
                <div><span className={label}>Width (along house)</span><Num k="widthFt" min={6} max={40} suffix="ft" model={model} set={set} /></div>
                <div><span className={label}>Depth (out from house)</span><Num k="depthFt" min={4} max={24} suffix="ft" model={model} set={set} /></div>
                <div><span className={label}>Height above grade</span><Num k="heightFt" min={0.5} max={12} step={0.5} suffix="ft" model={model} set={set} /></div>
                <div><span className={label}>Cantilever past beam</span><Num k="cantileverFt" min={0} max={4} step={0.5} suffix="ft" model={model} set={set} /></div>
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
                    <Num k="postSpacingFt" min={4} max={10} suffix="ft" model={model} set={set} />
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

            {unparked && (
              <div className={card} style={{ borderColor: 'rgba(234,88,12,0.5)' }}>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-[#ea580c]" /> Held on this machine
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  “{unparked.name}” could not be parked on the server, so it was kept here when the
                  desk was cleared. Restoring puts it back as an unsaved deck.
                </p>
                <div className="flex gap-2">
                  <button onClick={restoreUnparked}
                    className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
                    Restore
                  </button>
                  <button onClick={discardUnparked}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-300"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    Discard
                  </button>
                </div>
              </div>
            )}

            {projects.length > 0 && (
              <div className={card}>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-[#ea580c]" /> Saved decks
                  {loadingList && <Loader2 className="w-3 h-3 animate-spin" />}
                </h2>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {projects.map(p => (
                    <button key={p.id} onClick={() => open(p)} disabled={!!opening}
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
            {/*
              Siding, as a trade inside this centre rather than a page beside
              it. The same component the standalone page uses, driven by this
              rail — two siding editors would be two takeoffs, and a customer
              would eventually be quoted from whichever one got opened.
            */}
            {trade === 'siding' && (
              <PanelErrorBoundary name="Siding">
                <SidingTakeoff stage={stage} link={link} onLink={setLink} />
              </PanelErrorBoundary>
            )}

            {trade === 'openings' && (
              <PanelErrorBoundary name="Doors and windows">
                <OpeningsTakeoff stage={stage} link={link} onLink={setLink} />
              </PanelErrorBoundary>
            )}

            {/* Said plainly rather than shown as an empty stage. A deck produces
                a permit packet and a build specification; the equivalents for
                the other trades are not written. */}
            {trade !== 'deck' && stage === 'documents' && (
              <div className={card}>
                <p className="text-sm text-gray-400">
                  No documents for this trade yet. A deck produces a permit packet and a build
                  specification; the {trade === 'siding' ? 'siding' : 'door and window'} equivalents
                  are not written.
                </p>
              </div>
            )}

            {trade === 'openings' && stage === 'capture' && (
              <div className={card}>
                <p className="text-sm text-gray-400">
                  Openings are scheduled by hand for now. The siding capture already reads windows
                  and doors off a photograph, so seeding this from it is the obvious next step.
                </p>
              </div>
            )}

            {/* Everything below is the deck. */}
            {trade === 'deck' && <>
            {/* The drawing is what you design against, so it belongs to Design. */}
            <div className={`${card} ${stage === 'design' ? '' : 'hidden'}`}>
              {sized
                ? <PanelErrorBoundary name="Drawings"><DeckViewer3D model={model} mode={mode} onModeChange={setMode} height={520} /></PanelErrorBoundary>
                : (
                  <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-[#2A2A2A] bg-[#0D0D0D]"
                    style={{ height: 520 }}>
                    <Hammer className="w-8 h-8 text-[#2A2A2A] mb-3" />
                    <p className="text-sm font-semibold text-gray-300">Nothing drawn yet</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Set a width and a depth on the left and the rendering, framing plan and
                      details all appear together.
                    </p>
                  </div>
                )}
            </div>
            </>}

            {/* The assistant and the customer apply whatever you are doing and
                whichever trade it is, so they belong to neither a stage nor a
                trade. The customer especially: a job has one, not one per
                trade. */}
            {trade === 'deck' && (
            <PanelErrorBoundary name="Assistant">
              <DeckAssistant model={model} site={site} loads={loads} takeoff={bom}
                structural={struct} advisories={advisories} findings={findings}
                onApply={patch => setModel(m => ({ ...m, ...patch }))} />
            </PanelErrorBoundary>
            )}

            <PanelErrorBoundary name="Customer and job">
              {/* The filer was exposed by this panel and never picked up, so
                  everything the design centre produced had to be downloaded and
                  re-uploaded by hand to reach the customer it belonged to. */}
              <ProjectLinkPanel designId={savedId} link={link} onLink={setLink}
                onFilerReady={f => { filer.current = f; }} />
            </PanelErrorBoundary>

            {trade === 'deck' && <>

            {/* ── Capture ────────────────────────────────────────────────
                Everything that reads what is already there. This is the stage
                that happens on a phone in somebody's yard, which is why it is
                one column and nothing else is on screen beside it.

                One folder for the job, split between the two readers below it.
                It sits above them because that is the order the work happens in:
                open the folder, then look at what each reader made of its half. */}
            <div className={`space-y-4 ${stage === 'capture' ? '' : 'hidden'}`}>
              <PanelErrorBoundary name="The job folder">
                <JobFolder onSend={sendFolder} />
              </PanelErrorBoundary>

              <PanelErrorBoundary name="The existing house">
                <HouseCapture model={model} site={site} incoming={photoDrop} onRead={setHouseRead}
                  onApply={patch => setModel(m => ({ ...m, ...patch }))}
                  customerName={link.customerName}
                  onSendToCustomer={(label, dataUri) => filer.current
                    ? filer.current(label, 'render', dataUri, true)
                    : Promise.resolve(false)} />
              </PanelErrorBoundary>

              <PanelErrorBoundary name="Read a sketch">
                <SketchImport model={model} incoming={sketchDrop} onRead={setSketchRead}
                  onApply={patch => setModel(m => ({ ...m, ...patch }))} />
              </PanelErrorBoundary>
            </div>

            {/* Finishes are a design decision, so they sit with the drawing
                rather than with the photographs. */}
            <div className={stage === 'design' ? '' : 'hidden'}>
              <PanelErrorBoundary name="Finishes">
                <DeckFinishPicker model={model} onChange={patch => setModel(m => ({ ...m, ...patch }))} />
              </PanelErrorBoundary>
            </div>

            {/* ── Price ──────────────────────────────────────────────────
                Quantities come straight out of the framing, so the quote and
                the drawing cannot disagree. */}
            <div className={stage === 'price' ? '' : 'hidden'}>
              <PanelErrorBoundary name="Quote">
                <DeckQuotePanel model={model} link={link} designId={savedId}
                  designVersion={savedVersion} projectName={site.projectName} />
              </PanelErrorBoundary>
            </div>

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

            {townOffer && townCase && (
              <div className={card} style={{ borderColor: 'rgba(234,88,12,0.5)' }}>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-[#ea580c]" />
                  What {townCase.townName} {townCase.state} enforces
                </h2>
                <ul className="text-xs text-gray-300 space-y-0.5 mb-2">
                  {townOffer.snow && <li>Ground snow load — {townCase.groundSnowPsf} psf</li>}
                  {townOffer.frost && <li>Frost depth — {townCase.frostDepthIn} in</li>}
                  {townCase.codeEdition && <li>Code in force — {townCase.codeEdition}</li>}
                </ul>
                <p className="text-[11px] text-gray-500 mb-3">
                  {townCase.loadSource
                    ? `Source: ${townCase.loadSource}${townCase.loadsUpdatedAt ? ` · recorded ${townCase.loadsUpdatedAt.slice(0, 10)}` : ''}`
                    : 'No source recorded against these figures — worth checking before you rely on them.'}
                  {' '}They land unverified either way; tick them off in Loads and footings once you have confirmed them.
                </p>
                <button onClick={applyTownLoads}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
                  Use these figures
                </button>
              </div>
            )}

            {/* Everything below is derived from the deck's size. Until there is
                one, these would each render a full set of figures for a deck
                nobody has described — which is what made a cleared desk look
                like the previous job still sitting there. */}
            {sized && <>
            {/* A span that fails should be visible while you are changing it,
                not discovered later in the paperwork — so the structural check
                lives with Design. */}
            <div className={stage === 'design' ? '' : 'hidden'}>
              <PanelErrorBoundary name="Loads and footings"><DeckStructuralPanel model={model} site={site} loads={loads} onLoadsChange={setLoads} /></PanelErrorBoundary>
            </div>

            {/* ── Documents ─────────────────────────────────────────────
                What goes to the building department and to the crew. Nothing
                here is adjusted; it is all produced from the design. */}
            <div className={`space-y-4 ${stage === 'documents' ? '' : 'hidden'}`}>
              <PanelErrorBoundary name="Permit packet"><DeckPermitPacket model={model} site={site} loads={loads} /></PanelErrorBoundary>

              <PanelErrorBoundary name="Connection details">
                <ConnectionDetails model={model} />
              </PanelErrorBoundary>

              <PanelErrorBoundary name="Build specification"><DeckBuildSpecPanel model={model} site={site} /></PanelErrorBoundary>
            </div>

            {/* The at-a-glance counts. Shown alongside the quote, where the
                same quantities are being priced, rather than as a twelfth panel
                on a page that already had eleven. */}
            <div className={`${card} ${stage === 'price' ? '' : 'hidden'}`}>
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
            </>}
            </>}
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
/**
 * A job handed over from the pipeline.
 *
 * Read from the URL rather than from a stash, because a link is something that
 * can be sent, bookmarked and reloaded — all of which somebody will do — and a
 * value parked in session storage survives none of that.
 *
 * Only ids travel. The wording and the address are filled in by the customer
 * panel once it loads that customer's records, so there is one place that knows
 * what a job is called rather than two that can disagree.
 */
function jobFromUrl(): { email: string; jobId: string } | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const email = String(q.get('email') || '').trim().toLowerCase();
    const jobId = String(q.get('wr') || '').trim();
    if (!email && !jobId) return null;
    return { email, jobId };
  } catch {
    return null;
  }
}

export default function DeckDesigner() {
  const [session, setSession] = useState<Session>(() => ({
    key: 0,
    model: { ...BLANK_DECK },
    site: { ...EMPTY_SITE },
    loads: { ...DEFAULT_SITE_LOADS },
    link: { ...NO_LINK },
    id: null,
  }));

  /**
   * A job handed over from the pipeline, resolved once.
   *
   * The email is turned into a customer id here, against the same customer list
   * the panel uses, rather than the pipeline being made to carry an id it does
   * not have. Done once and then forgotten: re-applying it would fight anybody
   * who changed the customer afterwards.
   */
  const handedOver = useRef(false);
  useEffect(() => {
    if (handedOver.current) return;
    const from = jobFromUrl();
    if (!from) return;
    handedOver.current = true;
    (async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        const res = await fetch(`${SERVER}/customers`, {
          headers: { Authorization: `Bearer ${s?.access_token || publicAnonKey}`, apikey: publicAnonKey },
        });
        const json = await res.json().catch(() => ({}));
        const match = (json?.customers || []).find(
          (c: any) => String(c?.email || '').trim().toLowerCase() === from.email,
        );
        if (!match) {
          toast.error('That customer is not in the customer list yet, so the job could not be attached.');
          return;
        }
        setSession(prev => ({
          ...prev,
          key: prev.key + 1,
          link: { ...NO_LINK, customerId: String(match.id), customerName: match.name || match.email || '', jobId: from.jobId },
        }));
      } catch {
        toast.error('Could not attach that job. Pick the customer by hand.');
      }
    })();
  }, []);

  return (
    <DesignerSession
      key={session.key}
      session={session}
      onSession={next => setSession(s => ({ ...next, key: s.key + 1 }))}
    />
  );
}