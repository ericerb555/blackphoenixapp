/**
 * localFolder — reading photos out of a folder on the machine, not uploading them.
 *
 * WHAT A BROWSER WILL AND WILL NOT DO
 *
 * A web page cannot go and read your disk. That is a hard rule and a good one —
 * any page you visited could otherwise read your documents. What it can do,
 * since the File System Access API, is ask you to grant access to one folder,
 * and then read that folder freely until you take the access away.
 *
 * That is the difference this makes in practice. Instead of hunting through a
 * file dialog for six photos every time, you point the app at the job's photo
 * folder once — "C:\Jobs\Smith Deck\Photos" — and from then on it lists what is
 * in there, shows thumbnails, and you tick the ones you want. The permission
 * survives being closed and reopened, because the folder handle is kept in
 * IndexedDB.
 *
 * Chrome and Edge on desktop support this. Firefox and Safari do not, so
 * `supportsFolderAccess()` says which you have and the caller falls back to
 * selecting a whole folder through a normal file input — clumsier, but it still
 * gets every photo in one go rather than one at a time.
 *
 * One thing this does NOT change: analysing a photo or rendering from it still
 * sends that photo to the server, because that is where the models run. What
 * goes away is the hunting, not the sending.
 */

const DB_NAME = 'bpb-local-folders';
const STORE = 'handles';

export interface LocalPhoto {
  /** Path relative to the chosen folder, so subfolders stay legible. */
  path: string;
  name: string;
  size: number;
  lastModified: number;
  /** Read lazily — a folder of 300 photos should not become 300 data URIs. */
  read: () => Promise<File>;
}

/** True when this browser can be granted access to a folder. */
export function supportsFolderAccess(): boolean {
  return typeof (window as any).showDirectoryPicker === 'function';
}

/* ── keeping the handle between sessions ── */

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open local storage.'));
  });
}

async function put(key: string, value: any): Promise<void> {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function read(key: string): Promise<any> {
  const db = await idb();
  const out = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return out;
}

/* ── permissions ── */

/**
 * Confirm we still have read access.
 *
 * A stored handle is not a standing grant. The browser may ask again after a
 * restart, and `request` must happen inside a user gesture — which is why
 * reopening a remembered folder is behind a button rather than done on load.
 */
async function ensureReadable(handle: any, request: boolean): Promise<boolean> {
  if (!handle?.queryPermission) return true;
  const opts = { mode: 'read' as const };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if (!request) return false;
  return (await handle.requestPermission(opts)) === 'granted';
}

/* ── listing ── */

const IMAGE_RE = /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp)$/i;
// Widened past the four obvious containers. A phone is not the only thing that
// records a site: .mts/.m2ts come off camcorders and drones, .3gp off older
// handsets, and a file missing from this list does not fail loudly — it simply
// never appears in the picker, which reads as "the app won't take videos".
// Being generous here is safe: anything the browser cannot decode is caught
// later by framesFromVideo, which says so plainly.
const VIDEO_RE = /\.(mp4|mov|m4v|webm|avi|mkv|mts|m2ts|3gp|3g2|mpe?g|wmv|flv|ogv|ts)$/i;

/** Stop a listing from walking an entire drive if someone picks one. */
const MAX_FILES = 400;
const MAX_DEPTH = 3;

async function walk(
  dir: any,
  prefix: string,
  depth: number,
  out: LocalPhoto[],
  wantVideo: boolean,
): Promise<void> {
  if (out.length >= MAX_FILES || depth > MAX_DEPTH) return;

  for await (const entry of dir.values()) {
    if (out.length >= MAX_FILES) return;

    if (entry.kind === 'directory') {
      // Skip the folders that are never job photos and are often enormous.
      if (/^(node_modules|\.git|\$recycle\.bin|system volume information)$/i.test(entry.name)) continue;
      await walk(entry, `${prefix}${entry.name}/`, depth + 1, out, wantVideo);
      continue;
    }

    const isImage = IMAGE_RE.test(entry.name);
    const isVideo = wantVideo && VIDEO_RE.test(entry.name);
    if (!isImage && !isVideo) continue;

    // getFile() is what actually touches the disk, so metadata is fetched now
    // and the bytes only when something is picked.
    let file: File;
    try {
      file = await entry.getFile();
    } catch {
      continue;
    }

    out.push({
      path: `${prefix}${entry.name}`,
      name: entry.name,
      size: file.size,
      lastModified: file.lastModified,
      read: () => entry.getFile(),
    });
  }
}

export interface LocalFolder {
  name: string;
  handle: any;
  photos: LocalPhoto[];
  truncated: boolean;
}

async function listFolder(handle: any, wantVideo: boolean): Promise<LocalFolder> {
  const photos: LocalPhoto[] = [];
  await walk(handle, '', 0, photos, wantVideo);
  // Newest first: the photos from this morning's site visit are the ones wanted.
  photos.sort((a, b) => b.lastModified - a.lastModified);
  return {
    name: handle.name || 'Folder',
    handle,
    photos,
    truncated: photos.length >= MAX_FILES,
  };
}

/**
 * Ask for a folder. Must be called from a click.
 *
 * `slot` lets different parts of the app remember different folders — job
 * photos and scanned drawings are rarely in the same place.
 */
export async function pickFolder(slot = 'photos', wantVideo = true): Promise<LocalFolder | null> {
  if (!supportsFolderAccess()) throw new Error('This browser cannot open a folder. Use Chrome or Edge, or choose files instead.');

  let handle: any;
  try {
    handle = await (window as any).showDirectoryPicker({
      id: `bpb-${slot}`,
      mode: 'read',
      startIn: 'pictures',
    });
  } catch (err: any) {
    // The user closing the picker is not an error worth reporting.
    if (err?.name === 'AbortError') return null;
    throw err;
  }

  await put(slot, handle).catch(() => null);
  return listFolder(handle, wantVideo);
}

/** The name of the folder last used for this slot, if any. */
export async function rememberedFolderName(slot = 'photos'): Promise<string | null> {
  try {
    const handle = await read(slot);
    return handle?.name || null;
  } catch {
    return null;
  }
}

/**
 * Reopen the remembered folder. Must be called from a click, because the
 * browser may need to re-ask for permission and will refuse outside a gesture.
 */
export async function reopenFolder(slot = 'photos', wantVideo = true): Promise<LocalFolder | null> {
  const handle = await read(slot).catch(() => null);
  if (!handle) return null;
  if (!(await ensureReadable(handle, true))) return null;
  return listFolder(handle, wantVideo);
}

/** Re-read a folder already open, to pick up photos added since. */
export async function refreshFolder(folder: LocalFolder, wantVideo = true): Promise<LocalFolder> {
  if (!(await ensureReadable(folder.handle, true))) throw new Error('Access to that folder was withdrawn.');
  return listFolder(folder.handle, wantVideo);
}

export function forgetFolder(slot = 'photos'): Promise<void> {
  return put(slot, undefined).catch(() => undefined) as Promise<void>;
}

export const isVideoName = (name: string) => VIDEO_RE.test(name);
export const isImageName = (name: string) => IMAGE_RE.test(name);

/**
 * Is this file a video?
 *
 * Ask the browser first, then fall back to the name. The fallback is the whole
 * point: the File System Access API routinely hands back a File with `type: ''`
 * — Windows decides the MIME type from a registry mapping, and `.MOV`, `.avi`
 * and `.mts` are often simply absent from it. Code that tested
 * `file.type.startsWith('video/')` therefore discarded real videos silently,
 * matching neither the image branch nor the video branch, which is the worst
 * possible failure: no file, no error, nothing to act on.
 */
export const isVideoFile = (file: File) =>
  file.type ? file.type.startsWith('video/') : isVideoName(file.name);

/** Counterpart to `isVideoFile`, with the same reasoning about an empty type. */
export const isImageFile = (file: File) =>
  file.type ? file.type.startsWith('image/') : isImageName(file.name);
