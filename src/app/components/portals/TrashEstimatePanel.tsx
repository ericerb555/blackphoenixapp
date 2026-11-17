/**
 * Photograph the pile, get a price.
 *
 * Eric, 2026-11-14: "i want them to take a picture and video of the trash
 * needed to be hauled, also and demo and haul."
 *
 * BUILT FOR A PHONE HELD IN A BASEMENT
 *
 * Which is where this is used, so the native camera comes first — a `capture`
 * file input opens the phone's own camera on iOS Safari, Android Chrome and
 * every in-app browser, needs no getUserMedia permission prompt, survives the
 * browser being backgrounded mid-recording, and hands back a full-resolution
 * file with the phone's own processing already applied. The library picker sits
 * beside it, because a camera declined once months ago must not be a dead end.
 *
 * THE VIDEO IS READ IN THIS BROWSER, NOT ON THE SERVER
 *
 * There is no ffmpeg in Deno, and a 200MB clip as base64 is a ~270MB request
 * body that would fail even if something at the far end could decode it. So
 * `framesFromVideo` seeks the clip and draws frames into a canvas here — the
 * same shared helper `HouseCapture`, `SidingTakeoff`, `RoomCapture` and
 * `BidIntakePanel` already use. The clip itself is uploaded whole regardless,
 * because a person wants to watch it and it is the evidence behind the number.
 *
 * WHAT THIS SCREEN WILL NOT DO
 *
 * It will not send a price. It sends pictures; every figure on the way back was
 * computed on the server from the rate card. And it will not submit without the
 * attestation — the sentence that says the pictures show everything and the
 * access is as described — because that is the half of the writing that makes a
 * re-price on the day fair rather than a surprise.
 */
import { useRef, useState } from 'react';
import {
  Camera, Image as ImageIcon, Video, Trash2, Loader2, AlertTriangle,
  CheckCircle2, Info, Eye, Ban, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { authedHeaders, authedHeadersOrAnon } from '../../utils/authHeaders';
import { publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '../../lib/apiConfig';
import { fileToDataUrl, framesFromVideo, dataUrlBytes } from '../../lib/imageCapture';
import { extensionForMimeType } from '../../lib/videoCapture';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

/** The model is sent at most this many images; the server caps it again. */
const MAX_IMAGES = 12;
/** Frames pulled from the clip, before photographs are added. */
const FRAMES_PER_VIDEO = 6;
/**
 * The budget a request has to fit inside.
 *
 * Same figure and same loop as `HouseCapture.tsx`: extract, then drop frames
 * until the payload fits, rather than discovering the limit at the far end.
 */
const MAX_PAYLOAD_BYTES = 4_000_000;

/*
 * WHY EVERY FIELD ON THIS SCREEN IS 16px AND MUST STAY THERE
 *
 * Eric, from an iPhone: "the mobile version still have bunched up buttons and
 * i click them and it errored out."
 *
 * iOS Safari zooms the page when a form field with a font smaller than 16px
 * takes focus, and it does not zoom back out. The three fields here were
 * `text-sm` — 14px — so tapping the scope box, the notes box or the name field
 * left the whole page magnified: buttons crowded together, the layout shifted
 * under the finger, and a tap aimed at one control landed on its neighbour.
 * Which is also the likeliest explanation for a button "erroring out" rather
 * than doing its job.
 *
 * It is not a bug in the layout, and measuring the layout is how you miss it:
 * the buttons here are `flex-col sm:flex-row` and stack correctly at every
 * width. The page is fine until a field is touched.
 *
 * The viewport deliberately allows zoom (`user-scalable=yes` in index.html),
 * which is the right call for accessibility and is not what to change. 16px on
 * the fields is what stops the zoom being automatic and unwanted.
 *
 * So: `text-base`, never `text-sm`, on anything focusable on this screen.
 */

interface Props {
  /** Shown on the estimate, and the address the job is at. */
  customerName?: string;
  /** Jump the customer to their work requests once they ask us to confirm it. */
  onNavigate?: (page: string) => void;
  /**
   * A texted pricing link, when the visitor arrived on one.
   *
   * Present means nobody is signed in and the estimate spends as the link.
   * The panel does not interpret it — it forwards it, and the server decides
   * whether it is still good. See `junkLinks.ts`.
   */
  linkToken?: string;
}

interface Shot { id: string; file: File; preview: string }

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * What to tell the bucket this photograph is.
 *
 * An iPhone hands back HEIC, and `file.type` is empty often enough that
 * defaulting to `image/jpeg` stores a HEIC under a type it is not — a file that
 * uploads cleanly and then will not open for whoever looks at it later. The
 * bucket's allow-list already includes `image/heic` and `image/heif`, so the
 * honest type is also the accepted one. The extension is the only evidence
 * available in the browser; the server sniffs the actual bytes (`photoSniff.ts`)
 * where it matters.
 */
function photoContentType(file: File): string {
  if (file.type) return file.type;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const byExt: Record<string, string> = {
    heic: 'image/heic', heif: 'image/heif', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  };
  return byExt[ext] || 'application/octet-stream';
}

export default function TrashEstimatePanel({ customerName, onNavigate, linkToken }: Props) {
  const [photos, setPhotos] = useState<Shot[]>([]);
  const [video, setVideo] = useState<{ file: File; url: string } | null>(null);
  const [notes, setNotes] = useState('');
  /** 'Everything but the bed.' The only typed text that changes what is priced. */
  const [scope, setScope] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signedName, setSignedName] = useState(customerName || '');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [estimate, setEstimate] = useState<any>(null);
  const [showLines, setShowLines] = useState(false);
  const [asking, setAsking] = useState(false);

  const cameraRef = useRef<HTMLInputElement | null>(null);
  const libraryRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const next: Shot[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) continue;
      next.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setPhotos((current) => [...current, ...next].slice(0, MAX_IMAGES));
  };

  /**
   * Upload the originals, then send the server what it can read.
   *
   * The buckets are private and the refs are `storage://` — the same shape
   * `ClientWorkRequestForm` writes, so the server signs them on read through
   * `mediaSigning.ts` rather than anything here holding a durable link.
   */
  const submit = async () => {
    if (!photos.length) { toast.error('Add at least one photograph of what needs taking away.'); return; }
    if (!agreed || !signedName.trim()) {
      toast.error('Please confirm the pictures show everything, and type your name.');
      return;
    }

    setBusy(true);
    setEstimate(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const owner = user?.id || 'guest';
      const mediaRefs: string[] = [];

      /* ── the originals, kept ─────────────────────────────────────────── */
      setStage('Uploading your pictures…');
      for (const shot of photos) {
        const path = `${owner}/trash-estimate/${Date.now()}_${shot.file.name.replace(/[^\w.-]+/g, '_')}`;
        const { error } = await supabase.storage.from('project-photos')
          .upload(path, shot.file, { contentType: photoContentType(shot.file) });
        if (!error) mediaRefs.push(`storage://project-photos/${path}`);
      }

      if (video) {
        setStage('Uploading your video…');
        const type = video.file.type || 'video/mp4';
        const path = `${owner}/trash-estimate/${Date.now()}.${extensionForMimeType(type)}`;
        const { error } = await supabase.storage.from('project-videos')
          .upload(path, video.file, { contentType: type });
        if (!error) mediaRefs.push(`storage://project-videos/${path}`);
      }

      /* ── what the reader actually sees ───────────────────────────────── */
      let images: string[] = [];
      if (video) {
        setStage('Reading your video…');
        const room = Math.max(0, MAX_IMAGES - photos.length);
        if (room > 0) {
          /*
           * A video this browser cannot decode is not a failed estimate.
           *
           * An iPhone records H.265 inside a .mov, and a browser that cannot
           * decode it throws here — which, before this, took the whole
           * submission down with it and lost the photographs too. The clip is
           * already uploaded by this point, so somebody can still watch it;
           * the estimate carries on with the photographs and says what it
           * missed.
           */
          try {
            const frames = await framesFromVideo(
              video.file, Math.min(FRAMES_PER_VIDEO, room), undefined,
              (done, total) => setStage(`Reading your video — frame ${done} of ${total}…`),
            );
            images.push(...frames);
          } catch (err) {
            console.warn('[TrashEstimate] could not read the video', err);
            toast.message('We could not read that video on this device', {
              description: 'Your photographs still price the job, and we have kept the video for a person to watch.',
            });
          }
        }
      }

      /*
       * One photograph this browser cannot decode must not lose the other six.
       *
       * The same HEIC-on-a-desktop case as the preview above: Safari opens it,
       * another browser looking at the same synced library does not. A file
       * that will not convert is skipped and the rest are priced; only an empty
       * set is a failure, and it says which ones were skipped.
       */
      setStage('Preparing your photographs…');
      const skipped: string[] = [];
      for (const shot of photos) {
        try {
          images.push(await fileToDataUrl(shot.file));
        } catch {
          skipped.push(shot.file.name);
        }
      }
      if (skipped.length) {
        toast.message(`${skipped.length} picture${skipped.length === 1 ? '' : 's'} could not be opened on this device`, {
          description: 'They are uploaded and a person can see them. Try from your phone if the price looks light.',
        });
      }
      if (!images.length) {
        throw new Error('None of those pictures could be opened on this device. Try taking them on your phone.');
      }

      images = images.slice(0, MAX_IMAGES);
      // Drop frames until it fits, rather than finding out at the far end.
      while (images.length > 1 && images.reduce((n, u) => n + dataUrlBytes(u), 0) > MAX_PAYLOAD_BYTES) {
        images.pop();
      }

      setStage('Reading them, then checking the reading…');
      const res = await fetch(`${SERVER}/trash-estimator/read`, {
        method: 'POST',
        /*
         * A link visitor has no session, so `authedHeaders` — which throws
         * rather than quietly falling back — is the wrong helper for them. The
         * anon key identifies the project and nobody in particular, which is
         * exactly right here: the authority is the link token in the body, and
         * the server decides what it is worth.
         */
        /*
         * Anybody may price a job, so this never throws for want of a session.
         *
         * It used to pick authedHeaders when there was no link token, and that
         * helper throws rather than falling back — so a visitor with no account
         * was told 'Your session has expired' by a button they had never been
         * able to press. authedHeadersOrAnon still prefers a real session when
         * one exists, so a signed-in customer spends as themselves and an
         * anonymous visitor is counted per address per day on the server.
         */
        headers: await authedHeadersOrAnon(publicAnonKey, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          images, notes, scope, mediaRefs,
          linkToken: linkToken || undefined,
          agreedToAttestation: true,
          signedName: signedName.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `That did not go through (${res.status}).`);

      setEstimate(data.estimate);
      toast.success('Here is your estimate.');
    } catch (err: any) {
      console.error('[TrashEstimate]', err);
      toast.error(err?.message || 'Could not price that. Try again, or send fewer pictures.');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  /**
   * The handoff — where a self-serve number becomes a job.
   *
   * This is the commercially important button on the screen. Without it the
   * customer gets their price, nothing reaches the office, and the lead is
   * gone. It files the estimate for staff and tells them, and it says so
   * afterwards rather than leaving somebody wondering whether it sent.
   */
  const askUsToConfirm = async () => {
    if (!estimate?.id || asking) return;
    setAsking(true);
    try {
      const res = await fetch(`${SERVER}/trash-estimator/estimates/${estimate.id}/ask-us-to-confirm`, {
        method: 'POST',
        headers: await authedHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: notes }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `That did not send (${res.status}).`);
      setEstimate(data.estimate);
      toast.success('Sent to the office', {
        description: 'We have your estimate and the pictures. Somebody will come back to you.',
      });
    } catch (err: any) {
      console.error('[TrashEstimate] confirm', err);
      toast.error(err?.message || 'Could not send that. Try again in a moment.');
    } finally {
      setAsking(false);
    }
  };

  /* ── the estimate ──────────────────────────────────────────────────────── */

  if (estimate) {
    const b = estimate.basis || {};
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: '#0d0d0d', border: '1px solid rgba(234,88,12,0.25)' }}>
          <p className="text-[11px] font-black tracking-widest uppercase text-orange-500">Estimate</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-4xl font-black text-white">{money(estimate.cost?.likely || 0)}</span>
            <span className="text-sm font-bold text-gray-400">
              range {money(estimate.cost?.low || 0)} – {money(estimate.cost?.high || 0)}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            About {estimate.volumeCuYd?.likely} cubic yards · {estimate.loads} truck
            {estimate.loads === 1 ? '' : 's'} · {estimate.labourHours} crew hours
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Valid until {String(estimate.validUntil || '').slice(0, 10)}. This is an estimate from your
            pictures, not a visit.
          </p>
        </div>

        {/*
          * 5% for opening a free account.
          *
          * Both figures come from the server — see `signupIncentive.ts` for why
          * a discounted price is not worked out in the browser next to one that
          * is not. The block is absent unless the server sent an offer, so a
          * signed-in customer is never offered a discount for signing up, and
          * an estimate we have said we want to re-check on site is not
          * discounted while it is still provisional.
          */}
        {estimate.signupOffer && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <p className="text-sm font-black text-white">
              Take {estimate.signupOffer.percent}% off with a free account
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-black text-green-400">
                {money(estimate.signupOffer.cost?.likely || 0)}
              </span>
              <span className="text-sm font-bold text-gray-500 line-through">
                {money(estimate.cost?.likely || 0)}
              </span>
              <span className="text-sm font-bold text-green-400">
                save {money(estimate.signupOffer.saves || 0)}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Free to open, and the {estimate.signupOffer.percent}% is applied to this job when we
              write it up. You also keep this estimate, your pictures and anything we send you in
              one place.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.('signup')}
              className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-black text-black"
              style={{ background: '#22c55e' }}
            >
              Create my free account
            </button>
          </div>
        )}

        {estimate.needsSiteVisit && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
            <p className="flex items-center gap-2 text-sm font-black text-yellow-400">
              <AlertTriangle className="w-4 h-4" /> We want to look at this one before we confirm a price
            </p>
            <ul className="mt-2 space-y-1">
              {(estimate.siteVisitReasons || []).map((r: string, i: number) => (
                <li key={i} className="text-xs text-yellow-200/80">· {r}</li>
              ))}
            </ul>
          </div>
        )}

        <Section icon={<Eye className="w-4 h-4" />} title="What we could not see" tone="amber"
          lines={b.whatWeCouldNotSee} />

        {/*
          What they told us to leave, read back to them.

          High on the page and before the refusals, because this is the part
          they can correct in ten seconds and the part that costs the most if
          we got it wrong — a crew that takes the bed after being told not to.
        */}
        {(estimate.excluded || []).length > 0 && (
          <div className="rounded-xl" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="flex items-center gap-2 text-sm font-black text-white">
              <Ban className="w-4 h-4 text-gray-400" /> Left out, because you asked
            </p>
            <div className="mt-2 space-y-1.5">
              {(estimate.excluded || []).map((x: any, i: number) => (
                <p key={i} className="text-xs text-gray-300">
                  <span className="font-bold">{x.count > 1 ? `${x.count} × ` : ''}{x.name}</span>
                  <span className="text-gray-500"> — {x.reason}</span>
                </p>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Not in the price above. If we have read you wrong, tell us now rather than on the day.
            </p>
          </div>
        )}

        {(estimate.refused || []).length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="flex items-center gap-2 text-sm font-black text-red-400">
              <Ban className="w-4 h-4" /> We cannot take these, and they are not in the price
            </p>
            {(estimate.refused || []).map((r: any, i: number) => (
              <p key={i} className="mt-2 text-xs text-gray-300"><span className="font-bold">{r.label}</span> — {r.why}</p>
            ))}
          </div>
        )}

        <Section icon={<CheckCircle2 className="w-4 h-4" />} title="What we saw" lines={b.whatWeSaw} />
        <Section icon={<Info className="w-4 h-4" />} title="What we assumed" lines={b.whatWeAssumed} />
        <Section icon={<Info className="w-4 h-4" />} title="Not included" lines={b.notIncluded} />

        <div className="rounded-xl p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-black text-white">What could change this price</p>
          <div className="mt-2 space-y-2">
            {(b.whatChangesThisPrice || []).map((t: any, i: number) => (
              <div key={i} className="text-xs">
                <p className="font-bold text-gray-200">{t.trigger}</p>
                <p className="text-gray-400">{t.rate}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">{b.terms}</p>
        </div>

        <button onClick={() => setShowLines((s) => !s)}
          className="flex items-center gap-1 text-xs font-bold text-orange-400">
          {showLines ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          How the number is made up
        </button>
        {showLines && (
          <div className="rounded-xl overflow-x-auto" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
            <table className="w-full text-xs">
              <tbody>
                {(estimate.lines || []).map((l: any, i: number) => (
                  <tr key={i} style={{ borderTop: i ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <td className="p-3 text-gray-300">
                      {l.label}
                      <span className="block text-[10px] text-gray-600">{l.from}</span>
                    </td>
                    <td className="p-3 text-right text-gray-400 whitespace-nowrap">{l.quantity} {l.unit}</td>
                    <td className="p-3 text-right font-bold text-white whitespace-nowrap">{money(l.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => { setEstimate(null); setPhotos([]); setVideo(null); setAgreed(false); }}
            className="flex-1 rounded-xl py-3 text-sm font-black text-gray-300"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Price another one
          </button>
          {/*
            * A visitor on a texted link cannot ask us to confirm, so they are
            * not offered a button that fails.
            *
            * Two reasons, and the second is the one that matters. The call used
            * `authedHeaders`, which throws rather than falling back, so with no
            * session the button errored with "Your session has expired" — which
            * is nonsense to somebody who never had one. And even past that, the
            * route scopes an estimate to `customerEmail === actorEmail`, and a
            * link-priced estimate carries no email, so it would have answered
            * "No such estimate."
            *
            * Fixing those two would have produced a worse bug: a confirmation
            * request reaching the office with no way to contact the person who
            * sent it. We would know somebody wants a basement cleared and
            * nothing else. Creating the account is what supplies the contact
            * details, which is why it is the action here — and it carries the
            * 5% rather than asking them to do us a favour.
            */}
          {/*
            * Driven by whether the SERVER offered the discount, not by how
            * the visitor arrived.
            *
            * This used to key on linkToken, which was right while a texted
            * link was the only way to price a job without an account. Now
            * anybody can, so a visitor with no token and no session would
            * have been shown "Ask us to confirm it" — a button that throws
            * for want of a session and, past that, answers "No such
            * estimate" because the route scopes to customerEmail.
            *
            * signupOffer is the server saying "this caller has no account",
            * which is exactly the question being asked here. One rule covers
            * the link visitor, the anonymous visitor and the customer.
            */}
          {estimate.signupOffer || linkToken ? (
            /*
             * Only when the green offer block above is absent.
             *
             * That block already carries "Create my free account", so showing
             * another here put two near-identical buttons one under the other
             * — which on a phone is the row of bunched-up buttons rather than a
             * choice. One account CTA per screen: the offer block when there is
             * an offer, this when there is not (a site-visit estimate, say,
             * where the visitor still needs somewhere to go).
             */
            !estimate.signupOffer && (
              <button
                onClick={() => onNavigate?.('signup')}
                className="flex-1 rounded-xl text-sm font-black text-black"
                style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '12px 16px' }}
              >
                Create a free account to book it
              </button>
            )
          ) : (
            <button
              onClick={() => void askUsToConfirm()}
              disabled={asking || Boolean(estimate.confirmationRequestedAt)}
              className="flex-1 rounded-xl text-sm font-black text-black disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', padding: '12px 16px' }}
            >
              {estimate.confirmationRequestedAt
                ? 'We have it — we will come back to you'
                : asking ? 'Sending…' : 'Ask us to confirm it'}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── the capture screen ────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-lg font-black text-white">Trash, demo and haul-away — a price from your pictures</h3>
        <p className="mt-1 text-sm text-gray-400">
          Photograph the pile, and walk a slow video round it if you can. Show the way out too —
          the stairs, the door, and where a truck could park. We read all of it twice.
        </p>
      </div>

      <div className="rounded-2xl p-5 space-y-3" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-sm font-black text-white">Photographs <span className="text-gray-500 font-normal">({photos.length} of {MAX_IMAGES})</span></p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => cameraRef.current?.click()} disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-black"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
            <Camera className="w-4 h-4" /> Take a photo
          </button>
          <button onClick={() => libraryRef.current?.click()} disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-gray-200"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            <ImageIcon className="w-4 h-4" /> Choose from library
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { addPhotos(e.target.files); e.currentTarget.value = ''; }} />
        <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { addPhotos(e.target.files); e.currentTarget.value = ''; }} />

        {/*
          If the camera does not open.

          A `capture` input needs no permission prompt, but a browser whose
          camera was blocked once — months ago, for another site — silently
          falls back to the library or does nothing at all, which reads as the
          button being broken. The work request form already carries this hint
          for the same reason; it is the same sentence because it is the same
          problem.
        */}
        <p className="text-[11px] leading-relaxed text-gray-500">
          If the camera does not open, your browser may be blocking it:
          on iPhone, Settings → Safari → Camera → Allow. You can always use
          Choose from library instead — photographs you have already taken work
          just as well.
        </p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative rounded-lg overflow-hidden"
                style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.05)' }}>
                {/*
                  A HEIC off an iPhone renders here on Safari and not on a
                  desktop Chrome looking at the same synced library. The file
                  is still perfectly usable — it is converted before it is sent
                  and the server sniffs the bytes — so a preview that will not
                  decode shows the name rather than a broken image icon.
                */}
                <span className="absolute inset-0 flex items-center justify-center p-2 text-[9px] text-center text-gray-500 break-all">
                  {p.file.name}
                </span>
                <img
                  src={p.preview} alt=""
                  className="relative w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                />
                <button
                  onClick={() => setPhotos((c) => c.filter((x) => x.id !== p.id))}
                  aria-label="Remove this photo"
                  className="absolute top-1 right-1 rounded-md p-1.5"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm font-black text-white pt-2">Video <span className="text-gray-500 font-normal">(optional, about a minute)</span></p>
        <button onClick={() => videoRef.current?.click()} disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-gray-200"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
          <Video className="w-4 h-4" /> {video ? 'Replace the video' : 'Record or choose a video'}
        </button>
        <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setVideo({ file, url: URL.createObjectURL(file) });
            e.currentTarget.value = '';
          }} />
        {video && (
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <span className="text-xs text-gray-300 truncate">{video.file.name}</span>
            <button onClick={() => setVideo(null)} aria-label="Remove the video"><Trash2 className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/*
          What to take, in their words.

          Separate from the notes box below on purpose. This is the only thing
          a customer types that changes what gets priced — it can take an item
          out of the job, and it can do nothing else. Keeping it in its own
          box, with its own question, is what makes that true for the person
          typing as well as for the code.
        */}
        <label className="block pt-2">
          <span className="text-sm font-black text-white">What should we take?</span>
          <span className="block text-xs text-gray-400">
            Leave it blank and we price everything in the pictures. Tell us otherwise and we
            will only price what you want gone.
          </span>
          <textarea
            value={scope} onChange={(e) => setScope(e.target.value)} rows={2}
            placeholder="e.g. everything but the bed · only the stuff on the right · leave the washer and dryer"
            className="mt-2 w-full rounded-xl text-base text-white bg-transparent"
            style={{ border: '1px solid rgba(234,88,12,0.35)', padding: '12px' }}
          />
        </label>

        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          placeholder="Anything the pictures do not show — stairs, parking, a gate code, what is behind the pile."
          className="w-full rounded-xl p-3 text-base text-white bg-transparent"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        />
      </div>

      {/* The customer's half of the writing. Required, and said plainly. */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.25)' }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 flex-shrink-0 accent-orange-500" />
          <span className="text-xs leading-relaxed text-gray-300">
            These pictures show everything that needs taking away, and the access is as I have
            described it. I understand this is an estimate made from pictures, not a visit, and that
            if what you find is different you will show me the difference and what it costs
            <strong className="text-white"> before any extra work is done</strong>.
          </span>
        </label>
        <input
          value={signedName} onChange={(e) => setSignedName(e.target.value)}
          placeholder="Type your name"
          className="mt-3 w-full rounded-xl p-3 text-base text-white bg-transparent"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        />
      </div>

      <button
        onClick={submit}
        disabled={busy || !photos.length || !agreed || !signedName.trim()}
        className="w-full rounded-xl py-4 text-sm font-black text-black disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> {stage || 'Working…'}
          </span>
        ) : 'Price it'}
      </button>
    </div>
  );
}

function Section({ icon, title, lines, tone }: {
  icon: any; title: string; lines?: string[]; tone?: 'amber';
}) {
  if (!lines?.length) return null;
  const amber = tone === 'amber';
  return (
    <div className="rounded-xl p-4" style={{
      background: amber ? 'rgba(234,179,8,0.06)' : '#0d0d0d',
      border: `1px solid ${amber ? 'rgba(234,179,8,0.25)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      <p className={`flex items-center gap-2 text-sm font-black ${amber ? 'text-yellow-400' : 'text-white'}`}>
        {icon} {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {lines.map((l, i) => <li key={i} className="text-xs leading-relaxed text-gray-400">· {l}</li>)}
      </ul>
    </div>
  );
}
