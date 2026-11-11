/**
 * Photos and videos on a quote.
 *
 * WHY THIS EXISTS
 *
 * Eric asked why a new quote started from the Command Center could not take a
 * picture or a video. It could not because nothing in the quote flow accepted a
 * file at all — `StartQuoteModal` was text fields only and the editor's single
 * upload icon pushes materials to the Materials Hub.
 *
 * One panel, used in both places, because they are the same job at two moments:
 * attaching what you photographed while standing in front of the work, and
 * looking at it again while you argue about the price.
 *
 * ATTACHED BEFORE THE QUOTE IS SAVED
 *
 * The panel keys off an id the caller already holds, and uploads immediately
 * rather than holding files in memory until a save. A photo taken on a phone at
 * a job site should be off that phone and on the record before anything else can
 * go wrong, and a form that loses its attachments when the estimator call fails
 * is a form people stop trusting with them.
 *
 * NOTHING HERE IS PUBLIC
 *
 * The bucket is private; every URL is signed and expires. The panel re-signs by
 * refetching, so a tab left open overnight shows its photos again on reload.
 * Attachments are staff-only and do not travel to the customer's copy of the
 * quote — see `quoteAttachments.ts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, Video as VideoIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authedHeaders } from '../../utils/authHeaders';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

export interface QuoteAttachment {
  id: string;
  kind: 'image' | 'video';
  name: string;
  caption: string;
  mimeType: string;
  size: number;
  visibleToCustomer: boolean;
  uploadedAt: string;
  uploadedBy: string;
  /** Signed and expiring. Null when it could not be signed. */
  url: string | null;
}

/**
 * What the file picker offers.
 *
 * `image/*,video/*` rather than an extension list, because on a phone this is
 * what makes the camera itself one of the options — which is the entire point
 * of putting the control on the quote form.
 */
const ACCEPT = 'image/*,video/*';

/** Matches the server's cap, so an oversized file is refused before the upload. */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function humanSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** The longest edge a stored job photo needs. A 4K screen is 3840 across. */
const MAX_EDGE = 2560;

/**
 * Re-encode a photo to JPEG on the device before it is uploaded.
 *
 * WHY, AND IT IS NOT PRIMARILY ABOUT SIZE
 *
 * Every iPhone since 2017 writes **HEIC**. Safari can display it; Chrome,
 * Firefox and Edge cannot. So a HEIC accepted and stored unchanged would attach
 * fine from Eric's phone and then show as a broken thumbnail on the desktop
 * where the quote actually gets priced — attached, and useless.
 *
 * The conversion has to happen on the device that took the photo, because that
 * is the only machine guaranteed to have a HEIC decoder: iOS Safari will draw
 * it into a canvas happily. An edge function cannot — there is no `sharp` in
 * Deno Deploy — and a desktop browser cannot decode it to convert it either.
 *
 * The size win comes along for free and is worth having on its own: a 12MP
 * phone photo is 3-5MB of HEIC or 8MB of JPEG, and these are uploaded over
 * whatever signal a job site has. Capped at 2560px and quality 0.9 a job photo
 * lands around 600KB and loses nothing anybody looks at it for.
 *
 * WHAT IT DOES NOT TOUCH
 *
 * Video, which cannot be re-encoded in a canvas and is left exactly as filmed.
 * And anything it fails on: if the browser cannot decode the file, the ORIGINAL
 * bytes are uploaded unchanged and the server's sniffer gets the final say.
 * A conversion that cannot happen must never become a refusal — that is the
 * bug this panel already had once.
 */
async function toUploadableImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      // A decode that never settles would hang the upload queue behind it.
      const timer = setTimeout(() => reject(new Error('decode timed out')), 20000);
      el.onload = () => { clearTimeout(timer); resolve(el); };
      el.onerror = () => { clearTimeout(timer); reject(new Error('cannot decode')); };
      el.src = url;
    });

    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
    );
    if (!blob || blob.size === 0) return file;

    // Already a modest JPEG and no resize needed? Keep the original rather than
    // re-encoding it a second time and losing a generation for nothing.
    if (scale === 1 && file.type === 'image/jpeg' && blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    // Upload what we were given. The server decides from the bytes.
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function QuoteAttachmentsPanel({
  quoteId,
  title = 'Photos & Video',
  hint = 'Site photos, measurements, a walkthrough clip. Staff only — these are not sent to the customer.',
  className = '',
  onCountChange,
}: {
  /** The quote (or work request) these belong to. Required and stable. */
  quoteId: string;
  title?: string;
  hint?: string;
  className?: string;
  /**
   * Photos and video counted separately, because a caller that asks "do we have
   * what we need" treats them differently — the intake guide stops chasing
   * photos once there are some, and keeps suggesting a walkthrough video on a
   * big job regardless. A single total could not answer either question.
   */
  onCountChange?: (counts: { photos: number; videos: number; total: number }) => void;
}) {
  const [items, setItems] = useState<QuoteAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const base = `${SERVER}/quotes/${encodeURIComponent(quoteId)}/attachments`;

  const load = useCallback(async () => {
    if (!quoteId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(base, { headers: await authedHeaders() });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      setItems(Array.isArray(body.attachments) ? body.attachments : []);
    } catch (err: any) {
      // Shown in the panel rather than as a toast. A toast about something you
      // cannot see any more is not an explanation for an empty grid.
      setLoadError(err?.message || 'Could not load the attachments.');
    } finally {
      setLoading(false);
    }
  }, [base, quoteId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    onCountChange?.({
      photos: items.filter((a) => a.kind === 'image').length,
      videos: items.filter((a) => a.kind === 'video').length,
      total: items.length,
    });
  }, [items, onCountChange]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const chosen = Array.from(files);

    setBusy(true);
    setProgress({ done: 0, total: chosen.length });
    const added: QuoteAttachment[] = [];
    const failures: string[] = [];

    // Sequential, not parallel. These are phone photos and video over whatever
    // connection a job site has, and firing six large uploads at once is how all
    // six fail.
    for (let i = 0; i < chosen.length; i++) {
      const picked = chosen[i];
      setProgress({ done: i, total: chosen.length });

      // HEIC becomes JPEG here, and a 12MP photo gets smaller, BEFORE the size
      // check — so a phone photo over the limit is shrunk rather than refused.
      const file = await toUploadableImage(picked);

      if (file.size > MAX_FILE_SIZE) {
        failures.push(`${file.name} is ${(file.size / 1024 / 1024).toFixed(0)}MB (limit 50MB)`);
        continue;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) {
          failures.push('your session has expired — sign in again');
          break;
        }

        const body = new FormData();
        body.append('file', file);

        // No Content-Type header: the browser must set the multipart boundary
        // itself, and naming a type here corrupts the body.
        const res = await fetch(base, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && json.attachment) {
          added.push(json.attachment);
        } else {
          failures.push(json?.error || `${file.name}: HTTP ${res.status}`);
        }
      } catch (err: any) {
        failures.push(err?.message || `${file.name} could not be uploaded`);
      }
    }

    setBusy(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = '';

    if (added.length) {
      setItems((prev) => [...prev, ...added]);
      toast.success(`${added.length} file${added.length === 1 ? '' : 's'} attached to this quote.`);
    }
    if (failures.length) {
      toast.error(
        `${failures.length} could not be attached`,
        { description: failures.slice(0, 3).join(' · ') },
      );
    }
  };

  const saveCaption = async (id: string, caption: string) => {
    try {
      const res = await fetch(`${base}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: await authedHeaders(),
        body: JSON.stringify({ caption }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // The caption is already on screen and already in local state; a failed
      // save is worth saying once and not worth reverting what they typed.
      toast.error('That caption was not saved. Try again.');
    }
  };

  const remove = async (id: string) => {
    setConfirmingDelete(null);
    try {
      const res = await fetch(`${base}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: await authedHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error(body?.error || `HTTP ${res.status}`);
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast.success('Removed.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove that file.');
    }
  };

  return (
    <div className={`rounded-xl border border-[#2A2A2A] bg-black/40 p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-white">
            <Camera className="h-4 w-4 text-orange-400" />
            {title}
            {items.length > 0 && (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
                {items.length}
              </span>
            )}
          </h4>
          <p className="mt-1 max-w-xl text-xs text-gray-400">{hint}</p>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || !quoteId}
          // min-h-11: pressed outdoors, often with gloves on. Apple's 44pt
          // minimum is a floor here rather than a default.
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {busy && progress
            ? `Uploading ${progress.done + 1} of ${progress.total}…`
            : 'Add photos or video'}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />

      {loading && (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading attachments…
        </div>
      )}

      {!loading && loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Attachments could not be loaded.</p>
            <p className="mt-0.5 text-amber-200/80">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 rounded-lg border border-amber-500/50 px-2.5 py-1 font-semibold text-amber-100 hover:bg-amber-500/20"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !loadError && items.length === 0 && (
        <p className="py-4 text-xs text-gray-500">
          Nothing attached yet. On a phone, “Add photos or video” opens the camera.
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <div key={a.id} className="overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#050505]">
              <div className="relative aspect-video bg-black">
                {a.url && a.kind === 'image' && (
                  <img src={a.url} alt={a.caption || a.name} className="h-full w-full object-cover" loading="lazy" />
                )}
                {a.url && a.kind === 'video' && (
                  // `preload="metadata"`: a poster frame without pulling the
                  // whole clip down for every quote anybody opens.
                  <video src={a.url} controls preload="metadata" className="h-full w-full object-cover" />
                )}
                {!a.url && (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-500">
                    {a.kind === 'video' ? <VideoIcon className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                    <span className="px-2 text-center text-[10px]">Link expired — reload to view</span>
                  </div>
                )}

                {confirmingDelete === a.id ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-2 text-center">
                    <p className="text-xs font-semibold text-white">Remove this file?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void remove(a.id)}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(null)}
                        className="rounded-lg border border-[#2A2A2A] px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-[#1A1A1A]"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    // Two presses to delete. One press on a small target next to
                    // a photograph somebody drove out to take is not enough.
                    onClick={() => setConfirmingDelete(a.id)}
                    title="Remove this file"
                    className="absolute right-1.5 top-1.5 rounded-lg bg-black/70 p-1.5 text-gray-300 transition-colors hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="p-2">
                <input
                  defaultValue={a.caption}
                  placeholder="Add a note…"
                  // Saved on blur rather than per keystroke: one request when
                  // they are finished, instead of one per letter.
                  onBlur={(e) => {
                    const next = e.target.value;
                    if (next !== a.caption) {
                      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, caption: next } : x)));
                      void saveCaption(a.id, next);
                    }
                  }}
                  className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-xs text-white placeholder-gray-600 hover:border-[#2A2A2A] focus:border-orange-500/50 focus:outline-none"
                />
                <p className="truncate px-1 text-[10px] text-gray-500" title={a.name}>
                  {a.name}
                  {a.size ? ` · ${humanSize(a.size)}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default QuoteAttachmentsPanel;
