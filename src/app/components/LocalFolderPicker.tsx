/**
 * LocalFolderPicker — browse a folder on this machine and tick what you want.
 *
 * Point it at the job's photo folder once. After that it opens straight back
 * into it, lists what is there newest-first, and you tick the shots you want
 * rather than hunting through a file dialog for six photos every time.
 *
 * Two paths, because browser support is split. Chrome and Edge on desktop can
 * be granted access to a folder and remember it. Firefox and Safari cannot, so
 * they get a folder-select input instead — clumsier, and it does not remember,
 * but it still brings in every photo in one action rather than one at a time.
 *
 * Thumbnails are object URLs made from the files on disk and revoked when the
 * list changes. Nothing leaves the machine until something is ticked and used;
 * the folder listing itself is entirely local.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FolderOpen, Loader2, RefreshCw, Check, X, Film, Info, HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  supportsFolderAccess, pickFolder, reopenFolder, refreshFolder,
  rememberedFolderName, isVideoName,
  type LocalFolder, type LocalPhoto,
} from '../lib/localFolder';

interface Props {
  /** Keeps job photos and scanned drawings pointing at different folders. */
  slot?: string;
  /** Videos are useful for the house capture, pointless for a sketch. */
  allowVideo?: boolean;
  /** How many can be taken in one go, so the caller's own cap is respected. */
  limit?: number;
  /** Handed the chosen files; the caller decides what to do with them. */
  onPick: (files: File[]) => void | Promise<void>;
}

export default function LocalFolderPicker({
  slot = 'photos', allowVideo = true, limit = 12, onPick,
}: Props) {
  const [folder, setFolder] = useState<LocalFolder | null>(null);
  const [remembered, setRemembered] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const fallbackInput = useRef<HTMLInputElement>(null);
  const supported = supportsFolderAccess();

  useEffect(() => { rememberedFolderName(slot).then(setRemembered); }, [slot]);

  // Object URLs are revoked when the listing changes, otherwise browsing a few
  // folders in a row leaks every thumbnail that was ever shown.
  useEffect(() => {
    let live = true;
    const made: string[] = [];
    (async () => {
      if (!folder) { setThumbs({}); return; }
      const next: Record<string, string> = {};
      for (const p of folder.photos.slice(0, 60)) {
        if (!live) break;
        if (isVideoName(p.name)) continue;
        try {
          const url = URL.createObjectURL(await p.read());
          made.push(url);
          next[p.path] = url;
        } catch {
          // A file that vanished between listing and reading just gets no thumb.
        }
      }
      if (live) setThumbs(next);
    })();
    return () => { live = false; made.forEach(u => URL.revokeObjectURL(u)); };
  }, [folder]);

  const open = useCallback(async (reopening: boolean) => {
    setBusy(true);
    try {
      const f = reopening ? await reopenFolder(slot, allowVideo) : await pickFolder(slot, allowVideo);
      if (!f) {
        if (reopening) toast.error('That folder could not be reopened — choose it again.');
        return;
      }
      setFolder(f);
      setPicked(new Set());
      setRemembered(f.name);
      if (!f.photos.length) toast.message(`No photos found in ${f.name}.`);
      else if (f.truncated) toast.message(`Showing the first ${f.photos.length} — that folder is very large.`);
    } catch (err: any) {
      toast.error(err?.message || 'That folder could not be opened.');
    } finally {
      setBusy(false);
    }
  }, [slot, allowVideo]);

  const refresh = useCallback(async () => {
    if (!folder) return;
    setBusy(true);
    try {
      setFolder(await refreshFolder(folder, allowVideo));
    } catch (err: any) {
      toast.error(err?.message || 'Could not re-read that folder.');
    } finally {
      setBusy(false);
    }
  }, [folder, allowVideo]);

  const toggle = (path: string) => setPicked(s => {
    const n = new Set(s);
    if (n.has(path)) n.delete(path);
    else if (n.size >= limit) { toast.error(`Up to ${limit} at a time.`); return s; }
    else n.add(path);
    return n;
  });

  const use = useCallback(async () => {
    if (!folder || !picked.size) return;
    setBusy(true);
    try {
      const chosen: LocalPhoto[] = folder.photos.filter(p => picked.has(p.path));
      const files: File[] = [];
      for (const p of chosen) files.push(await p.read());
      await onPick(files);
      setPicked(new Set());
    } catch (err: any) {
      toast.error(err?.message || 'Those files could not be read.');
    } finally {
      setBusy(false);
    }
  }, [folder, picked, onPick]);

  /** Firefox and Safari: a whole folder through a normal input. */
  const fallbackPick = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    const images = Array.from(list)
      .filter(f => f.type.startsWith('image/') || (allowVideo && f.type.startsWith('video/')))
      .sort((a, b) => b.lastModified - a.lastModified)
      .slice(0, limit);
    if (!images.length) { toast.error('No photos in that folder.'); return; }
    await onPick(images);
    toast.success(`${images.length} taken from that folder.`);
  }, [allowVideo, limit, onPick]);

  const btn = 'flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40';
  const ghost = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' };

  if (!supported) {
    return (
      <div>
        <button onClick={() => fallbackInput.current?.click()} disabled={busy}
          className={`${btn} w-full text-white`} style={ghost}>
          <FolderOpen className="w-4 h-4" /> Choose a folder
        </button>
        {/* webkitdirectory is non-standard but works everywhere that matters
            here; React needs it spread in because it is not a typed prop. */}
        <input ref={fallbackInput} type="file" multiple className="hidden"
          {...({ webkitdirectory: '', directory: '' } as any)}
          onChange={e => { fallbackPick(e.target.files); e.currentTarget.value = ''; }} />
        <p className="flex items-start gap-1.5 text-[11px] text-gray-600 mt-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          This browser cannot keep access to a folder. Chrome or Edge will remember it and let you
          browse it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => open(false)} disabled={busy}
          className={`${btn} flex-1 text-white`} style={ghost}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
          {folder ? 'Different folder' : 'Open a folder'}
        </button>
        {!folder && remembered && (
          <button onClick={() => open(true)} disabled={busy}
            className={`${btn} text-white shrink-0`}
            style={{ background: 'rgba(234,88,12,0.16)', border: '1px solid rgba(234,88,12,0.5)' }}>
            <FolderOpen className="w-4 h-4" /> {remembered}
          </button>
        )}
        {folder && (
          <button onClick={refresh} disabled={busy} className={`${btn} text-white shrink-0`} style={ghost}
            aria-label="Re-read the folder">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {!folder && (
        <p className="flex items-start gap-1.5 text-[11px] text-gray-600 mt-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          Point this at the job's photo folder once and it opens straight back into it next time.
          Nothing is sent anywhere until you pick something.
        </p>
      )}

      {folder && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-gray-400 truncate">
              <span className="text-white font-semibold">{folder.name}</span>
              {' · '}{folder.photos.length} file{folder.photos.length === 1 ? '' : 's'}
            </span>
            <button onClick={() => { setFolder(null); setPicked(new Set()); }}
              className="text-gray-500 hover:text-white shrink-0" aria-label="Close folder">
              <X className="w-4 h-4" />
            </button>
          </div>

          {folder.photos.length === 0 ? (
            <p className="text-xs text-gray-600">Nothing in there that looks like a photo.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {folder.photos.slice(0, 60).map(p => {
                  const on = picked.has(p.path);
                  const video = isVideoName(p.name);
                  return (
                    <button key={p.path} onClick={() => toggle(p.path)} title={p.path}
                      aria-pressed={on}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 transition"
                      style={{ borderColor: on ? '#ea580c' : '#2A2A2A' }}>
                      {video ? (
                        <span className="w-full h-full grid place-items-center bg-[#0A0A0A]">
                          <Film className="w-5 h-5 text-gray-500" />
                        </span>
                      ) : thumbs[p.path] ? (
                        <img src={thumbs[p.path]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full grid place-items-center bg-[#0A0A0A]">
                          <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                        </span>
                      )}
                      {on && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#ea580c] grid place-items-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button onClick={use} disabled={busy || !picked.size}
                className={`${btn} w-full mt-2`} style={{ background: '#ea580c', color: '#fff' }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {picked.size ? `Use ${picked.size} selected` : 'Tick the ones you want'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
