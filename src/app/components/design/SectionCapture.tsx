/**
 * Photos and video, in whatever section of the design centre it is dropped into.
 *
 * WHY ONE COMPONENT RATHER THAN A PANEL PER SECTION
 *
 * Because the alternative is nine capture panels that have to be kept in step,
 * and the one that drifts is the one nobody is looking at. This takes the stage
 * and trade it is sitting in as props, tags what it uploads with them, and shows
 * back what belongs to that section and nothing else.
 *
 * WHY IT IS IN EVERY SECTION AT ALL
 *
 * Because the work is nearly always an addition to something already standing,
 * and the photographs are the best evidence of what is there — better than
 * anything typed into a field. A section that cannot take a picture is a section
 * asking somebody to describe, in writing, a thing they are stood in front of
 * with a camera in their hand.
 *
 * WHY VIDEO IS TREATED SEPARATELY
 *
 * It goes straight from the browser into storage against a signed URL, because
 * the photo path base64-encodes into a JSON body and would fail outright at two
 * hundred megabytes. That is also why video gets a progress bar and photos do
 * not: at this size, an upload with no visible progress reads as a hung page.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Film, Loader2, Trash2, ImageOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadDesignPhotos, uploadDesignVideo, listDesignPhotos,
  MAX_VIDEO_BYTES, type StoredPhoto,
} from '../../lib/designPhotos';
import { authedHeaders } from '../../utils/authHeaders';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Props {
  /** The saved design these attach to. Nothing can be filed before there is one. */
  designId: string | null;
  ownerKey: string;
  /** Where this instance is sitting. Both are tagged onto every upload. */
  stage: string;
  trade: string;
  /** Overrides the default heading, for sections where a plainer word fits. */
  title?: string;
  hint?: string;
}

export default function SectionCapture({ designId, ownerKey, stage, trade, title, hint }: Props) {
  const [media, setMedia] = useState<StoredPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  /**
   * What belongs to this section.
   *
   * Filtered here rather than by the server: the project's media is one list and
   * every section wants a different slice of it, so asking once and slicing
   * locally is one request instead of nine.
   */
  const refresh = useCallback(async () => {
    if (!designId) { setMedia([]); return; }
    setLoading(true);
    try {
      const all = await listDesignPhotos(designId, ownerKey, await authedHeaders());
      setMedia(all.filter(m => (m.stage || 'capture') === stage && (m.trade || 'general') === trade));
    } catch {
      // A capture panel that cannot list is still a capture panel that can
      // upload, so this is not surfaced as an error.
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [designId, ownerKey, stage, trade]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addPhotos = useCallback(async (files: File[]) => {
    if (!designId || !files.length) return;
    setBusy(true);
    try {
      const { added, skipped } = await uploadDesignPhotos(
        designId, ownerKey, files, await authedHeaders(), undefined, { stage, trade },
      );
      if (added) toast.success(`${added} photo${added === 1 ? '' : 's'} added.`);
      // Said out loud. A photograph that silently failed to attach is the bug
      // this whole panel exists to stop repeating.
      if (skipped.length) toast.error(`${skipped.length} not added — ${skipped[0]}`);
      if (added) await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Could not add those photos.');
    } finally {
      setBusy(false);
    }
  }, [designId, ownerKey, stage, trade, refresh]);

  const addVideo = useCallback(async (file: File) => {
    if (!designId) return;
    setBusy(true);
    setVideoProgress(0);
    try {
      const result = await uploadDesignVideo(
        designId, ownerKey, file, await authedHeaders(), { stage, trade },
        fraction => setVideoProgress(fraction),
      );
      if (result.ok) { toast.success('Video added.'); await refresh(); }
      // Narrowed by hand: this project builds with strictNullChecks off, which
      // switches off discriminated-union narrowing on a boolean, so reading
      // `result.error` after `if (result.ok)` does not typecheck on its own.
      else toast.error((result as { ok: false; error: string }).error);
    } catch (e: any) {
      toast.error(e?.message || 'Could not add that video.');
    } finally {
      setBusy(false);
      setVideoProgress(null);
    }
  }, [designId, ownerKey, stage, trade, refresh]);

  const remove = useCallback(async (photoId: string) => {
    if (!designId) return;
    try {
      const res = await fetch(
        `${SERVER}/design-projects/${designId}/photos/${encodeURIComponent(photoId)}?owner=${encodeURIComponent(ownerKey)}`,
        { method: 'DELETE', headers: await authedHeaders() },
      );
      if (!res.ok) throw new Error(`The server responded ${res.status}`);
      setMedia(m => m.filter(x => x.photoId !== photoId));
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove that.');
    }
  }, [designId, ownerKey]);

  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-40';

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#ea580c]" />
            {title || 'Photos and video'}
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {hint || 'What is already there. These stay with this part of the job.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!designId || busy}
            onClick={() => photoInput.current?.click()}
            className={`${btn} bg-[#1a1a1a] border border-[#2A2A2A] text-gray-300 hover:text-white hover:border-orange-500/40`}
          >
            {busy && videoProgress === null ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            Photos
          </button>
          <button
            type="button"
            disabled={!designId || busy}
            onClick={() => videoInput.current?.click()}
            className={`${btn} bg-[#1a1a1a] border border-[#2A2A2A] text-gray-300 hover:text-white hover:border-orange-500/40`}
          >
            <Film className="w-3.5 h-3.5" /> Video
          </button>
        </div>
      </div>

      {/* `capture="environment"` asks a phone for the rear camera rather than the
          file browser, which is the difference between taking a picture of the
          deck and hunting for one. */}
      <input
        ref={photoInput} type="file" accept="image/*" multiple capture="environment" className="hidden"
        onChange={e => { void addPhotos(Array.from(e.target.files || [])); e.target.value = ''; }}
      />
      <input
        ref={videoInput} type="file" accept="video/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addVideo(f); }}
      />

      {!designId && (
        <p className="mt-3 text-[11px] text-yellow-400">
          Save the project first and photos will have something to attach to.
        </p>
      )}

      {videoProgress !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5"><Upload className="w-3 h-3" /> Uploading video</span>
            <span className="tabular-nums">{Math.round(videoProgress * 100)}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[#0A0A0A] overflow-hidden">
            <div className="h-full bg-[#ea580c] transition-[width]" style={{ width: `${Math.round(videoProgress * 100)}%` }} />
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
        </p>
      ) : media.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {media.map(m => (
            <div key={m.photoId} className="relative group rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#0A0A0A]">
              {m.kind === 'video' ? (
                // Controls rather than autoplay: this is evidence to be looked
                // at deliberately, not decoration, and several of them playing
                // at once on a phone is a stalled page.
                m.url
                  ? <video src={m.url} controls preload="metadata" className="w-full h-20 object-cover" />
                  : <div className="w-full h-20 flex items-center justify-center"><Film className="w-4 h-4 text-gray-600" /></div>
              ) : m.url ? (
                <img src={m.url} alt={m.name} className="w-full h-20 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-20 flex items-center justify-center"><ImageOff className="w-4 h-4 text-gray-600" /></div>
              )}
              <button
                type="button"
                onClick={() => remove(m.photoId)}
                title={`Remove ${m.name}`}
                className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : designId ? (
        <p className="mt-3 text-[11px] text-gray-600">
          Nothing here yet. Video up to {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB — about two minutes.
        </p>
      ) : null}
    </div>
  );
}
