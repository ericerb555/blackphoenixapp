/**
 * The way a homeowner starts a project.
 *
 * WHAT WAS WRONG WITH THE OLD TAB
 *
 * It was a card and a button that said "Open the design centre". The design
 * centre is a working tool: it opens on an empty canvas at the Design stage
 * with the deck section selected, and expects dimensions, spans and a code
 * edition. Everything a homeowner actually wants first — say what you are
 * thinking about, show us the house, tell us in words — existed already, spread
 * across stages and panels they had no reason to know about. The machinery was
 * not missing. The front door was.
 *
 * WHAT THIS DOES INSTEAD
 *
 * Four short questions, then a choice. Pick the kind of work, say where it is,
 * show us photographs, describe it. At the end there are two doors, and both
 * are real endings:
 *
 *   Design it yourself — opens the design centre on the right trade, at the
 *   right stage, with the project already saved and the photos already filed.
 *
 *   Send it to us — a work request lands in the pipeline with the photographs
 *   and their own words attached, and nobody has to draw anything.
 *
 * The second door matters more than the first. Most people do not want to
 * design; they want to be understood and then quoted. Forcing everyone through
 * a CAD tool to reach us was the real defect.
 *
 * WHERE THE DATA GOES
 *
 * Into a design project, which is the record the design centre already reads.
 * Nothing here owns storage of its own and nothing here is a second copy: the
 * trade, the site and the brief are written into `meta`, the photographs are
 * filed against the project id by the same `SectionCapture` the designer uses
 * in five other places, and opening the project in the designer brings all of
 * it back. A walkthrough holding its own parallel record would be a second
 * truth to drift.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * The photo *analysis* — reading dimensions off a picture — stays in the design
 * centre. It is an AI vision call that costs money per press, and putting it in
 * front of every customer who opens a tab is a spending decision rather than a
 * design one. Uploading photographs is free and is most of the value; reading
 * them is one button further in, where it already lives.
 *
 * No price is produced here either. What somebody describes is an idea, not a
 * quote, and this says so in as many words.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Loader2, MapPin, Send, Sparkles,
  ExternalLink, RotateCcw, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { PROJECT_KINDS, projectKind, type ProjectKind } from '../../lib/trades';
import { saveDesignProject, getDesignProject, ownerKeyForCurrentUser } from '../../lib/designProjectService';
import { authedHeaders } from '../../utils/authHeaders';
import { projectId as supabaseProjectId } from '../../utils/supabase/info';
import { DEFAULT_DECK } from '../../lib/deckModel';
import { BLANK_HOUSE } from '../../lib/houseModel';
import SectionCapture from '../design/SectionCapture';

const SERVER = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-3eae23a6`;

type Step = 'kind' | 'place' | 'photos' | 'brief' | 'done';

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'kind', label: 'What' },
  { id: 'place', label: 'Where' },
  { id: 'photos', label: 'Photos' },
  { id: 'brief', label: 'Details' },
  { id: 'done', label: 'Finish' },
];

const card = 'rounded-xl border border-[#2A2A2A] bg-[#111]';
const field =
  'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm '
  + 'focus:outline-none focus:border-[#ea580c]';

export interface ResumableIntake {
  id: string;
  name: string;
  kindId: string;
}

export default function DesignWalkthrough({
  customerEmail,
  customerName,
  customerAddress,
  resumable,
  onChanged,
}: {
  customerEmail?: string;
  customerName?: string;
  customerAddress?: string;
  /** A walkthrough this customer started and never finished, if there is one. */
  resumable?: ResumableIntake | null;
  /** Something was saved or sent — the designs list above should reload. */
  onChanged?: () => void;
}) {
  const [step, setStep] = useState<Step>('kind');
  const [kindId, setKindId] = useState<string>('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState(customerAddress || '');
  const [brief, setBrief] = useState('');

  const [designId, setDesignId] = useState<string | null>(null);
  const [ownerKey, setOwnerKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const kind: ProjectKind | undefined = projectKind(kindId);

  useEffect(() => { void ownerKeyForCurrentUser().then(setOwnerKey); }, []);

  // The address is theirs unless they have said otherwise. Filled from the
  // account rather than asked for again, and still editable — the work is not
  // always at the address we bill.
  useEffect(() => {
    setAddress(prev => (prev.trim() ? prev : customerAddress || ''));
  }, [customerAddress]);

  /**
   * Write the project.
   *
   * Called at every step from Where onwards rather than once at the end,
   * because the photographs need a project to hang off and because somebody who
   * closes the laptop after step three should not lose step two. Each call is a
   * new version on the server, which is the designer's own behaviour.
   */
  const persist = useCallback(async (
    patch: { name?: string; address?: string; brief?: string; done?: boolean },
    note: string,
  ): Promise<string | null> => {
    const k = projectKind(kindId);
    if (!k) return null;
    const owner = ownerKey || await ownerKeyForCurrentUser();
    const projectName = (patch.name ?? name).trim() || k.label;
    const where = (patch.address ?? address).trim();
    try {
      const { project } = await saveDesignProject({
        id: designId || undefined,
        ownerKey: owner,
        name: projectName,
        note,
        meta: {
          kind: k.trade,
          // A deck model is saved whatever the trade, because the design centre
          // refuses to open a project without one. For anything that is not a
          // deck it is sized to zero rather than to the default 16x12 — an
          // invented deck sitting inside a bathroom project is the kind of
          // wrong number that survives into a quote.
          model: k.trade === 'deck' ? DEFAULT_DECK : { ...DEFAULT_DECK, widthFt: 0, depthFt: 0 },
          site: { projectName, address: where, town: '', state: '', parcel: '' },
          house: BLANK_HOUSE,
          customerName: customerName || '',
          // What the customer told us, kept apart from anything measured. The
          // designer shows it back; nothing computes from it.
          intake: {
            kindId: k.id,
            label: k.label,
            brief: (patch.brief ?? brief).trim(),
            done: patch.done === true,
            email: customerEmail || '',
            startedAt: new Date().toISOString(),
          },
        },
      });
      if (project?.id && project.id !== designId) setDesignId(project.id);
      onChanged?.();
      return project?.id || designId;
    } catch (e: any) {
      toast.error(e?.message || 'Could not save that. Nothing was lost — try again.');
      return null;
    }
  }, [kindId, ownerKey, name, address, brief, designId, customerName, customerEmail, onChanged]);

  /** Pick up a walkthrough that was abandoned partway through. */
  const resume = useCallback(async () => {
    if (!resumable) return;
    setBusy(true);
    try {
      const owner = ownerKey || await ownerKeyForCurrentUser();
      const { project } = await getDesignProject(owner, resumable.id);
      const intake = project?.meta?.intake || {};
      setDesignId(project.id);
      setKindId(String(intake.kindId || resumable.kindId || ''));
      setName(String(project.name || ''));
      setAddress(String(project?.meta?.site?.address || customerAddress || ''));
      setBrief(String(intake.brief || ''));
      // Straight to the photographs: what came before is answered, and the two
      // steps after it are the ones that were not.
      setStep('photos');
    } catch (e: any) {
      toast.error(e?.message || 'Could not reopen that one.');
    } finally {
      setBusy(false);
    }
  }, [resumable, ownerKey, customerAddress]);

  /** Open the design centre on the right trade, at the right stage. */
  const openDesigner = (id: string | null) => {
    const k = projectKind(kindId);
    const params = new URLSearchParams({ from: 'portal' });
    if (id) params.set('projectId', id);
    if (k) { params.set('trade', k.trade); params.set('stage', k.stage); }
    if (address.trim()) params.set('address', address.trim());
    if (customerEmail) params.set('email', customerEmail);
    const route = `deck-designer?${params.toString()}`;
    const nav = (window as any).__navigateApp;
    if (typeof nav === 'function') nav(route);
    else window.location.assign(`/${route}`);
  };

  /**
   * Send it to us without designing anything.
   *
   * Posts to the same `/work-requests` route the enquiry form and the design
   * tab already use. One way in means one place a job starts, and the ownership
   * check, the staff alert and the admin notification all come free because
   * they already guard that route.
   */
  async function send() {
    const k = projectKind(kindId);
    if (!k) return;
    setBusy(true);
    try {
      const id = await persist({ done: true }, 'Sent to Black Phoenix');
      const res = await fetch(`${SERVER}/work-requests`, {
        method: 'POST',
        headers: { ...(await authedHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designProjectId: id || undefined,
          serviceType: k.trade,
          project_name: name.trim() || k.label,
          title: name.trim() || k.label,
          description:
            `${k.label} — started from the customer portal.\n\n`
            + (brief.trim() ? `In their words:\n${brief.trim()}\n\n` : '')
            + (address.trim() ? `Address: ${address.trim()}\n` : '')
            + (id ? `Design project: ${id}\n` : '')
            + `\nPhotographs, if any, are filed against the design project. `
            + `Nothing here has been measured, checked for code, or priced.`,
          propertyAddress: address.trim(),
          client_info: { name: customerName || '', email: customerEmail || '' },
          source: 'customer-walkthrough',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `The server responded ${res.status}`);
      setSent(true);
      onChanged?.();
      toast.success('Sent. Someone will look at it and come back to you.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not send that.');
    } finally {
      setBusy(false);
    }
  }

  async function goFromPlace() {
    if (!name.trim()) { toast.error('Give it a name so you can find it again.'); return; }
    setBusy(true);
    const id = await persist({}, 'Started from the portal');
    setBusy(false);
    if (id) setStep('photos');
  }

  async function goFromBrief() {
    setBusy(true);
    await persist({}, 'Description added');
    setBusy(false);
    setStep('done');
  }

  const stepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <div className={`${card} p-5 sm:p-6`}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-orange-600/15 p-2.5">
          <Sparkles className="h-6 w-6 text-orange-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-white">Start a project</h3>
          <p className="mt-1 text-sm text-gray-400">
            Tell us what you are thinking about and show us the house. You can design
            it yourself afterwards, or just send it over and let us work it out.
          </p>
        </div>
      </div>

      {/* Where they are. Numbered rather than a bare progress bar — somebody
          halfway through wants to know how much is left, and five short steps
          is a reassuring answer. */}
      <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {STEPS.map((s, i) => {
          const state = i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'todo';
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span className={
                state === 'now' ? 'font-bold text-orange-400'
                  : state === 'done' ? 'text-green-400'
                    : 'text-gray-600'
              }>
                {state === 'done' ? <Check className="inline h-3.5 w-3.5" /> : `${i + 1}.`} {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="text-gray-700">›</span>}
            </li>
          );
        })}
      </ol>

      {/* An abandoned walkthrough, offered back rather than left to rot. Only
          on the first step: once they have started something new, pointing at
          an old one is a distraction. */}
      {resumable && step === 'kind' && !designId && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-sm text-blue-200/80">
            You started <span className="font-semibold text-blue-100">{resumable.name}</span> and
            did not finish it.
          </p>
          <button
            onClick={resume}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-500/10 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Pick it up
          </button>
        </div>
      )}

      <div className="mt-5">
        {step === 'kind' && (
          <>
            <h4 className="mb-3 font-bold text-white">What are you thinking about?</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROJECT_KINDS.map(k => {
                const Icon = k.icon;
                return (
                  <button
                    key={k.id}
                    onClick={() => { setKindId(k.id); setName(n => n || k.label); setStep('place'); }}
                    className="flex items-start gap-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 text-left transition hover:border-orange-500/50"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{k.label}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{k.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Not listed? Pick the closest one — you can describe the rest in your own
              words two steps from now.
            </p>
          </>
        )}

        {step === 'place' && kind && (
          <>
            <h4 className="mb-1 font-bold text-white">{kind.label}</h4>
            <p className="mb-4 text-xs text-gray-500">{kind.blurb}</p>

            <label className="mb-1 block text-[11px] font-semibold text-gray-400">
              Call it something
            </label>
            <input
              className={field}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={kind.label}
            />

            <label className="mb-1 mt-4 block text-[11px] font-semibold text-gray-400">
              Where is the work?
            </label>
            <input
              className={field}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Street, town, state"
            />
            {/* Said plainly, because it reads like an unnecessary question
                otherwise and people skip it. */}
            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              This sets the snow load, the frost depth and which code edition applies,
              so it changes the answer rather than just labelling it.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setStep('kind')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-bold text-gray-300 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={goFromPlace}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'photos' && kind && (
          <>
            <h4 className="mb-1 font-bold text-white">Show us the house</h4>
            <p className="mb-4 text-xs text-gray-500">
              {kind.interior
                ? 'The outside, and the rooms this affects. A slow walk on video carries '
                  + 'what a set of stills loses.'
                : 'The wall or the area this affects, and a wider shot showing the house '
                  + 'around it. A slow walk on video carries what a set of stills loses.'}
            </p>

            <SectionCapture
              designId={designId}
              ownerKey={ownerKey}
              stage="capture"
              trade={kind.trade}
              title="Outside"
              hint="The house, and the area the work happens in."
            />

            {/* One component per section, matching how the designer files
                media: same uploader, different tag, so the design centre shows
                these in the right places rather than in one undifferentiated
                pile. */}
            {kind.interior && (
              <div className="mt-4">
                <SectionCapture
                  designId={designId}
                  ownerKey={ownerKey}
                  stage="capture"
                  trade={`${kind.trade}-interior`}
                  title="Inside"
                  hint="Each room this affects — stand in a corner and turn slowly."
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStep('place')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-bold text-gray-300 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={() => setStep('brief')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500"
              >
                <ArrowRight className="h-4 w-4" /> Continue
              </button>
              {/* Skipping is allowed and says what it costs, rather than being
                  a dead end or a nag. */}
              <span className="text-xs text-gray-600">
                You can skip this — it just means we will ask for photos later.
              </span>
            </div>
          </>
        )}

        {step === 'brief' && kind && (
          <>
            <h4 className="mb-1 font-bold text-white">Tell us what you want</h4>
            <p className="mb-3 text-xs text-gray-500">
              In your own words. What you like, what you do not, anything that has to
              stay, anything you have already been told.
            </p>
            <textarea
              className={`${field} min-h-[8rem] resize-y`}
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder={
                kind.interior
                  ? 'e.g. The kitchen is cut off from the living room and we want it open. '
                    + 'Keeping the window over the sink. Two of us cook at once.'
                  : 'e.g. The old deck is rotten and too small. We want room for a table '
                    + 'for six and steps down to the lawn.'
              }
            />
            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setStep('photos')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-bold text-gray-300 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={goFromBrief}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'done' && kind && (
          <>
            <h4 className="mb-1 font-bold text-white">
              {sent ? 'Sent — we have it' : 'Saved. What next?'}
            </h4>
            <p className="mb-4 text-xs text-gray-500">
              {sent
                ? 'It is in front of our team with your photographs and your description. '
                  + 'You can still open it and draw on it while you wait.'
                : 'Two ways to go, and neither is wrong. Most people send it over.'}
            </p>

            {!sent && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                  <p className="font-semibold text-white">Send it to us</p>
                  <p className="mt-1 text-xs text-gray-400">
                    We look at your photos and what you wrote, and come back to you.
                    Nothing to draw.
                  </p>
                  <button
                    onClick={send}
                    disabled={busy}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send to Black Phoenix
                  </button>
                </div>

                <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4">
                  <p className="font-semibold text-white">Design it yourself</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Opens our own tool on {kind.label.toLowerCase()}, with everything you
                    just gave us already in it.
                  </p>
                  <button
                    onClick={() => openDesigner(designId)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] px-4 py-2 text-sm font-bold text-gray-200 transition hover:border-orange-500/40 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" /> Open the design centre
                  </button>
                </div>
              </div>
            )}

            {sent && (
              <button
                onClick={() => openDesigner(designId)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] px-4 py-2 text-sm font-bold text-gray-200 transition hover:border-orange-500/40 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" /> Open it in the design centre
              </button>
            )}

            {/* The same warning the old tab carried, kept word for word. A
                drawing is persuasive, and somebody who believes theirs is a
                quote is a difficult conversation later. */}
            <p className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200/80">
              What you draw is an idea, not a plan and not a price. We check spans, loads
              and what your town requires before anything is built or quoted.
            </p>

            <button
              onClick={() => {
                setStep('kind'); setKindId(''); setName(''); setBrief('');
                setDesignId(null); setSent(false);
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-300"
            >
              <Camera className="h-3.5 w-3.5" /> Start another project
            </button>
          </>
        )}
      </div>
    </div>
  );
}
