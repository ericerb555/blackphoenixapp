/**
 * Before & After Creator — a tool inside the Content Center, not a second one.
 *
 * Eric: "Add a new tool inside the existing Content Center… DO NOT create a
 * new Content Center, separate application, or duplicate existing features."
 *
 * So it reuses, rather than rebuilds:
 *
 *   the photographs   `/gallery/all`, the same job photo library JobPhotos
 *                     reads — including the published/private flag, because a
 *                     photo of a customer's half-stripped bathroom is a
 *                     progress note, not an advertisement
 *   the branding      `companyInfo`, which is already resolved per company by
 *                     `pickMainAppCompany`, so another business on this
 *                     platform gets its own logo and colours and never ours
 *   storage           `/media/upload`, the existing media library
 *   the geometry      `beforeAfterLayout`, which is tested
 *   the drawing       `beforeAfterRender`, which decides nothing
 *
 * WHAT IT WILL NOT DO, and this is the load-bearing rule: it does not alter
 * the photographs. No filter, no colour match, no generated "after". A
 * before-and-after is the one piece of marketing a builder has that a customer
 * can check against their own memory of the room, and the moment the after is
 * touched it stops being evidence and becomes a render.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon, Upload, Download, Save, Loader2, Check, Wand2,
  LayoutGrid, Tag, Palette, RefreshCw, MessageSquare, Copy, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  composeBeforeAfter, LAYOUTS, OUTPUT_SIZES,
  type BeforeAfterLayout, type BeforeAfterSize,
} from '../../lib/beforeAfterLayout';
import { renderBeforeAfter, loadImage, canvasToBlob, type Brand } from '../../lib/beforeAfterRender';
import { companyInfo } from '../../lib/config/companyInfo';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';
import { screenChannel, describeFindings } from '../../lib/captionFacts';
import {
  photoSrc, usablePhotos, jobsWithPhotos, photosForJob, NO_JOB, type JobPhoto,
} from '../../lib/jobPhotoGrouping';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

/**
 * A photograph as this panel needs it. The shape, where its address lives and
 * how it groups by job are all in `jobPhotoGrouping`, which is tested — the
 * failure here is silent in both directions, so it does not live inline.
 */
type GalleryPhoto = JobPhoto;

type Slot = 'before' | 'after';

/** One platform’s copy, exactly as `/content-studio/package` returns it. */
interface Channel { title?: string; body?: string; hashtags?: string[] }
interface Variant { angle?: string; channels?: Record<string, Channel> }

/**
 * The brand, read from whichever company is active.
 *
 * `companyInfo` is already the resolved company — `pickMainAppCompany` picks
 * the construction business for the main app and another tenant's profile
 * replaces it wholesale — so reading it here is what makes "never mix company
 * assets" true without this file knowing anything about tenancy.
 *
 * The public-facing name only. Eric: no LLC, no "Custom Builds" — that is
 * `legalName`, which belongs on a contract and nowhere near a social post.
 */
function brandFromCompany(): Brand {
  return {
    name: companyInfo.name,
    website: companyInfo.contact?.website,
    callToAction: 'Book Your Project Today',
    primaryColor: companyInfo.branding?.primaryColor || '#ea580c',
    secondaryColor: companyInfo.branding?.secondaryColor || '#0A0A0A',
    logoUrl: companyInfo.branding?.logoUrl || companyInfo.logo,
  };
}

export default function BeforeAfterCreator() {
  const [layout, setLayout] = useState<BeforeAfterLayout>('side-by-side');
  const [size, setSize] = useState<BeforeAfterSize>('square');
  const [beforeSrc, setBeforeSrc] = useState<string>('');
  const [afterSrc, setAfterSrc] = useState<string>('');
  const [beforeImg, setBeforeImg] = useState<HTMLImageElement | null>(null);
  const [afterImg, setAfterImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  const [beforeLabel, setBeforeLabel] = useState('BEFORE');
  const [afterLabel, setAfterLabel] = useState('AFTER');
  const [showLabels, setShowLabels] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [overlayText, setOverlayText] = useState('');

  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  /** '' = every photo, '__none' = the ones with no job, otherwise a job id. */
  const [jobFilter, setJobFilter] = useState('');
  const [picking, setPicking] = useState<Slot | null>(null);
  const [busy, setBusy] = useState<'' | 'saving' | 'downloading' | 'writing'>('');

  /* The copy, and the facts it is allowed to use. */
  const [projectNote, setProjectNote] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [bestIndex, setBestIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brand = useMemo(brandFromCompany, []);

  /* ── the job photo library, the same one JobPhotos reads ───────────────── */
  const loadGallery = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/gallery/all`, { headers: await authedHeaders() });
      const data = await res.json().catch(() => ({}));
      /*
       * `projects` IS THE KEY. This read `data.photos || data.items`, and the
       * route has always answered `{ projects: [...] }` — so the library came
       * back empty every single time and the panel said "nothing in it yet,
       * so upload instead" to a company with a full photo library. The same
       * mistake twice over: the filter below required `signedUrl || url`, and
       * a gallery record stores its address in `image`.
       *
       * Both spellings are accepted rather than one corrected, because this
       * endpoint is shared with JobPhotos and a tool reaching into another
       * tool's response should bend rather than demand.
       */
      const rows: GalleryPhoto[] = Array.isArray(data)
        ? data
        : (data.projects || data.photos || data.items || []);
      setGallery(usablePhotos(rows));
    } catch {
      /* An unreachable gallery is not a broken tool — uploading still works. */
      setGallery([]);
    }
  }, []);

  useEffect(() => { void loadGallery(); }, [loadGallery]);

  /**
   * The jobs that actually have photographs, newest first.
   *
   * Derived from the photos rather than fetched from `/jobs`: the only jobs
   * worth offering here are the ones with something to show, and a list of
   * every job the company has ever opened would bury them. It also means this
   * panel needs no permission the gallery has not already granted.
   */
  const jobsInGallery = useMemo(() => jobsWithPhotos(gallery), [gallery]);
  const shown = useMemo(() => photosForJob(gallery, jobFilter), [gallery, jobFilter]);

  useEffect(() => {
    if (!brand.logoUrl) return;
    loadImage(brand.logoUrl).then(setLogoImg).catch(() => setLogoImg(null));
  }, [brand.logoUrl]);

  /* ── loading a chosen photograph ───────────────────────────────────────── */
  const take = useCallback(async (slot: Slot, src: string) => {
    try {
      const img = await loadImage(src);
      if (slot === 'before') { setBeforeSrc(src); setBeforeImg(img); }
      else { setAfterSrc(src); setAfterImg(img); }
    } catch {
      toast.error('That photo could not be loaded. Try uploading it instead.');
    }
  }, []);

  const onFile = useCallback((slot: Slot, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('That is not an image.'); return; }
    const reader = new FileReader();
    reader.onload = () => void take(slot, String(reader.result || ''));
    reader.onerror = () => toast.error('That file could not be read.');
    reader.readAsDataURL(file);
  }, [take]);

  /* ── the design itself ─────────────────────────────────────────────────── */
  const composition = useMemo(() => composeBeforeAfter({
    layout,
    size,
    before: beforeImg ? { width: beforeImg.naturalWidth, height: beforeImg.naturalHeight } : { width: 4, height: 3 },
    after: afterImg ? { width: afterImg.naturalWidth, height: afterImg.naturalHeight } : { width: 4, height: 3 },
    showLabels,
    showBrand,
    beforeLabel,
    afterLabel,
  }), [layout, size, beforeImg, afterImg, showLabels, showBrand, beforeLabel, afterLabel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      renderBeforeAfter(canvas, {
        composition, before: beforeImg, after: afterImg,
        brand, logo: logoImg, overlayText: overlayText.trim() || undefined,
      });
    } catch (err: any) {
      toast.error(err?.message || 'The design could not be drawn.');
    }
  }, [composition, beforeImg, afterImg, brand, logoImg, overlayText]);

  const ready = Boolean(afterImg) && (layout === 'full-bleed' || Boolean(beforeImg));

  const download = useCallback(async (format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setBusy('downloading');
    try {
      const blob = await canvasToBlob(canvas, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `before-after-${size}-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || 'The design could not be exported.');
    } finally { setBusy(''); }
  }, [ready, size]);

  /** Into the existing media library, so the rest of the Content Center sees it. */
  const saveToLibrary = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setBusy('saving');
    try {
      const blob = await canvasToBlob(canvas, 'png');
      const form = new FormData();
      form.append('file', new File([blob], `before-after-${Date.now()}.png`, { type: 'image/png' }));
      form.append('title', `Before & After — ${new Date().toLocaleDateString()}`);
      form.append('category', 'before-after');
      const headers = await authedHeaders();
      delete (headers as any)['Content-Type']; // the browser sets the boundary
      const res = await fetch(`${SERVER}/media/upload`, { method: 'POST', headers, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || 'Upload refused.');
      toast.success('Saved to your content library.');
    } catch (err: any) {
      toast.error(err?.message || 'It could not be saved. The download still works.');
    } finally { setBusy(''); }
  }, [ready]);

  /**
   * The captions, through the route that already writes copy.
   *
   * `/content-studio/package` returns variants with a title, a body and
   * hashtags PER PLATFORM, already carrying the brand voice and already
   * metered. Writing a second copy route for this tool would mean two
   * prompts, two brand voices and two places for the tone to drift.
   *
   * WHAT IT IS ALLOWED TO SAY is the part that needed care. Eric: the AI
   * "must use actual project information and never invent completed work or
   * customer testimonials." A model handed "before and after" and nothing
   * else will cheerfully produce a delighted homeowner and a timeline it has
   * no knowledge of. So the brief it gets is built from what is actually on
   * the screen — the photo titles and whatever the user typed — and the
   * context spells out the prohibition rather than hoping.
   */
  const writeCaptions = useCallback(async () => {
    const facts = projectNote.trim();
    if (!facts) {
      toast.error('Say what the job was first — the captions are written from that, not invented.');
      return;
    }
    setBusy('writing');
    try {
      const res = await fetch(`${SERVER}/content-studio/package`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({
          topic: `Before and after: ${facts}`,
          platforms: ['instagram', 'facebook'],
          variants: 3,
          tone: 'confident, plain-spoken, proud of the work and not boastful',
          context: [
            'This is a BEFORE AND AFTER post built from the company\u2019s own project photographs.',
            `What the job actually was: ${facts}`,
            'STRICT RULES:',
            '- Use ONLY the facts above. Invent nothing else about the job.',
            '- No customer quotes, testimonials, names or reactions. None were supplied.',
            '- No timescales, prices, square footage or materials unless stated above.',
            '- Do not claim awards, ratings, guarantees or years in business.',
            '- Describe the change visible between the two photographs, nothing more.',
            `Call to action: ${brand.callToAction}. Website: ${brand.website || ''}.`,
          ].join('\n'),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `The writer refused (${res.status}).`);
      }
      const got: Variant[] = Array.isArray(data.variants) ? data.variants : [];
      if (!got.length) throw new Error('Nothing came back to use.');

      /*
       * The prohibition above is a request until something reads the answer.
       *
       * The context tells the writer to invent nothing, and on this platform a
       * prompt instruction has repeatedly turned out not to be a control — a
       * reader told "return ONLY JSON" answered in prose, another told to be
       * precise guessed a building's size three ways. The screen beside the
       * box promises "if it is not written here it will not appear", and this
       * is what makes that true rather than hopeful.
       *
       * A variant with anything invented in it is DROPPED, not shown with a
       * warning: a caption on screen is a caption somebody pastes.
       */
      const judged = got.map((v) => ({
        variant: v,
        faults: Object.values(v?.channels || {})
          .flatMap((ch) => screenChannel(ch, facts)),
      }));
      const clean = judged.filter((j) => !j.faults.length).map((j) => j.variant);
      const struck = judged.filter((j) => j.faults.length);

      if (!clean.length) {
        throw new Error(
          `Every version invented something, so none is being shown. `
          + describeFindings(struck.flatMap((j) => j.faults))
          + ' Add those details to the job notes if they are true, then write again.',
        );
      }
      if (struck.length) {
        toast.warning(
          `${struck.length} of ${got.length} dropped. `
          + describeFindings(struck.flatMap((j) => j.faults)),
        );
      }

      setVariants(clean);
      // The model's pick is an index into the list it returned, which is not
      // the list being shown once anything has been dropped.
      const picked = Number.isInteger(data.bestVariantIndex) ? data.bestVariantIndex : 0;
      const keptPick = clean.indexOf(got[picked]);
      setBestIndex(keptPick >= 0 ? keptPick : 0);
    } catch (err: any) {
      toast.error(err?.message || 'The captions could not be written.');
    } finally {
      setBusy('');
    }
  }, [projectNote, brand]);

  const copy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text)
      .then(() => toast.success('Copied.'))
      .catch(() => toast.error('Could not copy — select it by hand.'));
  }, []);

  const slotCard = (slot: Slot, src: string) => (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{slot}</span>
        {src && <Check className="w-3.5 h-3.5 text-emerald-400" />}
      </div>
      <div className="aspect-video rounded-lg border border-gray-700 bg-black overflow-hidden flex items-center justify-center">
        {src
          ? <img src={src} alt={`${slot} photo`} className="w-full h-full object-cover" />
          : <ImageIcon className="w-6 h-6 text-gray-700" />}
      </div>
      <div className="flex gap-2 mt-2">
        <label className="flex-1 cursor-pointer text-center text-xs px-2 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-white/5">
          <Upload className="w-3.5 h-3.5 inline mr-1" />Upload
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => onFile(slot, e.target.files?.[0] || null)} />
        </label>
        <button
          onClick={() => setPicking(picking === slot ? null : slot)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-white/5"
        >
          <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />Gallery
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-orange-500/20 rounded-lg"><Wand2 className="w-6 h-6 text-orange-400" /></div>
        <div>
          <h2 className="text-xl font-bold text-white">Before &amp; After Creator</h2>
          <p className="text-sm text-gray-500">
            Your own project photographs, laid out and branded. Nothing is filtered or generated —
            the after is the after.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        {/* ── the preview ── */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">
              {OUTPUT_SIZES[size].label} · {OUTPUT_SIZES[size].use}
            </span>
            <button onClick={() => void loadGallery()} className="text-xs text-gray-500 hover:text-gray-300">
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />Refresh photos
            </button>
          </div>
          <div className="bg-black rounded-lg p-3 flex items-center justify-center min-h-[320px]">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[62vh] object-contain rounded"
              style={{ aspectRatio: `${OUTPUT_SIZES[size].width} / ${OUTPUT_SIZES[size].height}` }}
            />
          </div>
          {!ready && (
            <p className="mt-3 text-sm text-amber-400/80">
              {layout === 'full-bleed'
                ? 'Choose the finished photo to see the design.'
                : 'Choose both photos to see the design.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              disabled={!ready || busy !== ''}
              onClick={() => void saveToLibrary()}
              className="px-4 py-2 rounded-lg bg-[#ea580c] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#f97316]"
            >
              {busy === 'saving' ? <Loader2 className="w-4 h-4 inline animate-spin mr-1" /> : <Save className="w-4 h-4 inline mr-1" />}
              Save to library
            </button>
            <button
              disabled={!ready || busy !== ''}
              onClick={() => void download('png')}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-200 text-sm disabled:opacity-40 hover:bg-white/5"
            >
              <Download className="w-4 h-4 inline mr-1" />PNG
            </button>
            <button
              disabled={!ready || busy !== ''}
              onClick={() => void download('jpeg')}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-200 text-sm disabled:opacity-40 hover:bg-white/5"
            >
              <Download className="w-4 h-4 inline mr-1" />JPEG
            </button>
          </div>
        </div>

        {/* ── the controls ── */}
        <div className="space-y-4">
          <div className="bg-[#111] border border-gray-700 rounded-xl p-4">
            <div className="flex gap-3">{slotCard('before', beforeSrc)}{slotCard('after', afterSrc)}</div>

            {picking && (
              <div className="mt-3 border-t border-gray-800 pt-3">
                <p className="text-xs text-gray-500 mb-2">
                  Pick a {picking} photo from your job gallery
                  {gallery.length === 0 && ' — nothing in it yet, so upload instead.'}
                </p>

                {/*
                  Narrow to one job's photographs.
                  Only offered when photos actually carry a job: before this
                  was stamped at upload nothing did, and a filter listing one
                  entry would be furniture. "All photos" stays first and stays
                  the default, because the library is mostly older photographs
                  that have no job and must not become unreachable.
                */}
                {jobsInGallery.length > 0 && (
                  <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-gray-700 bg-black/40 px-2 py-1.5 text-xs text-gray-200"
                  >
                    <option value="">All photos ({gallery.length})</option>
                    {jobsInGallery.map((j) => (
                      <option key={j.id} value={j.id}>{j.label} ({j.count})</option>
                    ))}
                    <option value={NO_JOB}>Not filed to a job ({gallery.filter((p) => !p.jobId).length})</option>
                  </select>
                )}

                <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto">
                  {shown.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { void take(picking, photoSrc(p)); setPicking(null); }}
                      className="aspect-square rounded border border-gray-700 overflow-hidden hover:border-[#ea580c]"
                      title={[p.title, p.jobTitle].filter(Boolean).join(' · ')}
                    >
                      <img src={photoSrc(p)} alt={p.title || 'job photo'} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {shown.length === 0 && gallery.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">No photos on that job yet.</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#111] border border-gray-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />Layout
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id)}
                  title={l.note}
                  className={`text-left px-3 py-2 rounded-lg border text-xs ${
                    layout === l.id
                      ? 'border-[#ea580c] bg-[#ea580c]/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-600 mt-2">
              {LAYOUTS.find((l) => l.id === layout)?.note}
            </p>
          </div>

          <div className="bg-[#111] border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">
              <Tag className="w-3.5 h-3.5 inline mr-1" />Size and labels
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(OUTPUT_SIZES) as BeforeAfterSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-2 py-2 rounded-lg border text-xs ${
                    size === s ? 'border-[#ea580c] bg-[#ea580c]/10 text-white' : 'border-gray-700 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {OUTPUT_SIZES[s].use}
                  <span className="block text-[10px] text-gray-600">{OUTPUT_SIZES[s].label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={beforeLabel} onChange={(e) => setBeforeLabel(e.target.value)}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm"
                placeholder="BEFORE"
              />
              <input
                value={afterLabel} onChange={(e) => setAfterLabel(e.target.value)}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm"
                placeholder="AFTER"
              />
            </div>
            <input
              value={overlayText} onChange={(e) => setOverlayText(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm"
              placeholder="Optional line across the design"
            />
            <div className="flex gap-4 text-xs text-gray-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                Labels
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showBrand} onChange={(e) => setShowBrand(e.target.checked)} />
                Branding
              </label>
            </div>
          </div>

          <div className="bg-[#111] border border-gray-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
              <Palette className="w-3.5 h-3.5 inline mr-1" />Branding
            </p>
            <p className="text-sm text-gray-300">{brand.name}</p>
            <p className="text-xs text-gray-500">{brand.website}</p>
            <p className="text-xs text-gray-500">{brand.callToAction}</p>
            <p className="text-[11px] text-gray-600 mt-2">
              Read from your business profile — change it there and every design follows.
            </p>
          </div>

          {/*
            The words. Through /content-studio/package, which already carries
            the brand voice and is already metered — a second copy route here
            would be a second place for the tone to drift.
          */}
          <div className="bg-[#111] border border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" />Captions and hashtags
            </p>
            <textarea
              value={projectNote}
              onChange={(e) => setProjectNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm"
              placeholder="What was the job? e.g. Full bathroom strip-out and refit in Salem — new shower, tile and vanity."
            />
            <p className="text-[11px] text-gray-600 flex gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500/70" />
              <span>
                The writer is given these facts and told to invent nothing else — no customer
                quotes, no timescales, no prices. If it is not written here it will not appear.
              </span>
            </p>
            <button
              disabled={busy !== '' || !projectNote.trim()}
              onClick={() => void writeCaptions()}
              className="w-full px-4 py-2 rounded-lg bg-[#ea580c] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#f97316]"
            >
              {busy === 'writing'
                ? <><Loader2 className="w-4 h-4 inline animate-spin mr-1" />Writing…</>
                : <><Wand2 className="w-4 h-4 inline mr-1" />Write captions</>}
            </button>

            {variants.map((v, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 ${i === bestIndex ? 'border-[#ea580c]/60 bg-[#ea580c]/5' : 'border-gray-800'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    {v.angle || `Option ${i + 1}`}{i === bestIndex ? ' · suggested' : ''}
                  </span>
                </div>
            {v.channels?.instagram && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Instagram</p>
                {v.channels.instagram.title && (
                  <p className="text-sm font-semibold text-white">{v.channels.instagram.title}</p>
                )}
                <p className="text-xs text-gray-400 whitespace-pre-wrap">{v.channels.instagram.body}</p>
                {!!v.channels.instagram.hashtags?.length && (
                  <p className="text-[11px] text-sky-400/80 mt-1">
                    {v.channels.instagram.hashtags.map((h: string) => (h.startsWith('#') ? h : '#' + h)).join(' ')}
                  </p>
                )}
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => copy([v.channels?.instagram?.title, v.channels?.instagram?.body,
                      (v.channels?.instagram?.hashtags || []).map((h: string) => (h.startsWith('#') ? h : '#' + h)).join(' ')]
                      .filter(Boolean).join('\n\n'))}
                    className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-white/5"
                  >
                    <Copy className="w-3 h-3 inline mr-1" />Copy
                  </button>
                  {v.channels.instagram.title && (
                    <button
                      onClick={() => setOverlayText(String(v.channels?.instagram?.title || '').slice(0, 60))}
                      className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-white/5"
                    >
                      Use as overlay
                    </button>
                  )}
                </div>
              </div>
            )}
            {v.channels?.facebook && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Facebook</p>
                {v.channels.facebook.title && (
                  <p className="text-sm font-semibold text-white">{v.channels.facebook.title}</p>
                )}
                <p className="text-xs text-gray-400 whitespace-pre-wrap">{v.channels.facebook.body}</p>
                {!!v.channels.facebook.hashtags?.length && (
                  <p className="text-[11px] text-sky-400/80 mt-1">
                    {v.channels.facebook.hashtags.map((h: string) => (h.startsWith('#') ? h : '#' + h)).join(' ')}
                  </p>
                )}
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => copy([v.channels?.facebook?.title, v.channels?.facebook?.body,
                      (v.channels?.facebook?.hashtags || []).map((h: string) => (h.startsWith('#') ? h : '#' + h)).join(' ')]
                      .filter(Boolean).join('\n\n'))}
                    className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-white/5"
                  >
                    <Copy className="w-3 h-3 inline mr-1" />Copy
                  </button>
                  {v.channels.facebook.title && (
                    <button
                      onClick={() => setOverlayText(String(v.channels?.facebook?.title || '').slice(0, 60))}
                      className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-white/5"
                    >
                      Use as overlay
                    </button>
                  )}
                </div>
              </div>
            )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
