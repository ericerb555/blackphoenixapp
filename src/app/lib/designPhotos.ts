/**
 * Site photos that belong to a saved design, rather than to the browser tab.
 *
 * WHY THIS EXISTS
 *
 * Photos opened in the designer were `File` objects read straight off the
 * machine and held in React state. Nothing wrote them anywhere. Saving the deck
 * stored the model, the site, the loads and the takeoff — and no photographs —
 * so reopening a project showed none, and closing the tab lost them entirely.
 * The photographs of the house being rebuilt are usually the only record of
 * what was there before, so "held in memory until something clears it" is not
 * good enough for them.
 *
 * Everything here is deliberately shaped so the rest of the designer does not
 * change: photos come back as `File` objects, the same type the folder picker
 * hands over, so the house-capture step cannot tell a restored photo from a
 * freshly picked one.
 */
import { projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface StoredPhoto {
  photoId: string;
  name: string;
  contentType: string;
  addedAt: string;
  /** Signed, and it expires. Fetch it soon or ask for the list again. */
  url: string | null;
  /** 'photo' or 'video'. Anything stored before video existed reads as a photo. */
  kind?: 'photo' | 'video';
  /** Which stage of the design centre it was captured in. */
  stage?: string;
  /** Which trade it belongs to, or 'general'. */
  trade?: string;
  bytes?: number;
}

/** Where in the design centre a capture happened, carried with the file. */
export interface CaptureSection {
  stage: string;
  trade: string;
}

type Headers = Record<string, string>;

/** Read a File as a data URI, which is what the upload route accepts. */
function toDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });
}

/**
 * Attach photos to a saved project.
 *
 * Uploaded in small batches rather than one large request: a job folder can
 * hold twenty photographs, and a single body carrying all of them base64-encoded
 * is both slow to build and liable to be refused for its size.
 */
export async function uploadDesignPhotos(
  designId: string,
  ownerKey: string,
  files: File[],
  headers: Headers,
  onProgress?: (done: number, total: number) => void,
  section?: CaptureSection,
): Promise<{ added: number; skipped: string[] }> {
  const usable = files.filter((f) => f.type.startsWith('image/'));
  if (!usable.length) return { added: 0, skipped: [] };

  let added = 0;
  const skipped: string[] = [];
  const BATCH = 3;

  for (let i = 0; i < usable.length; i += BATCH) {
    const batch = usable.slice(i, i + BATCH);
    const photos = await Promise.all(
      batch.map(async (f) => {
        try {
          return { name: f.name, dataUri: await toDataUri(f) };
        } catch {
          skipped.push(`${f.name} — could not be read`);
          return null;
        }
      }),
    );
    const payload = photos.filter(Boolean);
    if (!payload.length) continue;

    const res = await fetch(`${SERVER}/design-projects/${designId}/photos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ownerKey, photos: payload, ...(section || {}) }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      added += Number(data.added) || 0;
      if (Array.isArray(data.skipped)) skipped.push(...data.skipped);
    } else {
      skipped.push(data?.error || `Upload failed (${res.status})`);
    }
    onProgress?.(Math.min(i + BATCH, usable.length), usable.length);
  }

  return { added, skipped };
}

/** The ceiling, stated here so the picker can refuse before the upload starts. */
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

/**
 * Attach one video to a saved design.
 *
 * Three steps, not one, and the shape is the point: the file goes from the
 * browser **straight into storage**, never through the edge function. A photo
 * is base64-encoded into a JSON body, which is fine at twelve megabytes and
 * fails at two hundred — the encoding adds a third and the whole thing has to
 * be held in memory on the way past.
 *
 * So: ask for a signed slot, PUT the file into it, then tell the server it
 * landed. The server checks the size of what actually arrived rather than
 * believing what was claimed, which is why the last step can still refuse.
 */
export async function uploadDesignVideo(
  designId: string,
  ownerKey: string,
  file: File,
  headers: Headers,
  section?: CaptureSection,
  onProgress?: (fraction: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file.type.startsWith('video/')) {
    return { ok: false, error: `${file.name} is not a video.` };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      error: `${file.name} is ${Math.round(file.size / 1024 / 1024)}MB and the limit is `
        + `${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB. A shorter clip of the part that matters works better anyway.`,
    };
  }

  // 1. A slot to upload into.
  const slotRes = await fetch(`${SERVER}/design-projects/${designId}/video-url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ownerKey, contentType: file.type, bytes: file.size, name: file.name }),
  });
  const slot = await slotRes.json().catch(() => null);
  if (!slotRes.ok || !slot?.success) {
    return { ok: false, error: slot?.error || `Could not start the upload (${slotRes.status})` };
  }

  // 2. The file itself, straight to storage.
  //
  // XHR rather than fetch, only because fetch cannot report upload progress and
  // a two-hundred-megabyte upload with no progress bar looks like a hung page.
  const uploaded = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', slot.uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => resolve(
      xhr.status >= 200 && xhr.status < 300
        ? { ok: true }
        : { ok: false, error: `Storage refused the upload (${xhr.status})` },
    );
    xhr.onerror = () => resolve({ ok: false, error: 'The upload was interrupted.' });
    xhr.send(file);
  });
  if (!uploaded.ok) return { ok: false, error: uploaded.error || 'The upload failed.' };

  // 3. Tell the server, which checks what actually arrived.
  const confirmRes = await fetch(`${SERVER}/design-projects/${designId}/video-confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ownerKey, mediaId: slot.mediaId, path: slot.path,
      name: file.name, contentType: file.type, ...(section || {}),
    }),
  });
  const confirmed = await confirmRes.json().catch(() => null);
  if (!confirmRes.ok || !confirmed?.success) {
    return { ok: false, error: confirmed?.error || `Could not record the video (${confirmRes.status})` };
  }
  return { ok: true };
}

/** What is attached to this project right now. */
export async function listDesignPhotos(
  designId: string,
  ownerKey: string,
  headers: Headers,
): Promise<StoredPhoto[]> {
  const res = await fetch(
    `${SERVER}/design-projects/${designId}/photos?owner=${encodeURIComponent(ownerKey)}`,
    { headers },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) return [];
  return Array.isArray(data.photos) ? data.photos : [];
}

/**
 * Pull stored photos back down as `File` objects.
 *
 * The house-capture step takes `File`s. Handing it the same type means a
 * reopened project behaves exactly like a freshly opened folder, with no second
 * code path to keep working.
 */
export async function photosAsFiles(photos: StoredPhoto[]): Promise<File[]> {
  const out = await Promise.all(
    // Videos are filtered out rather than handed over. Everything downstream of
    // this — the house reader, the sketch reader, the render — takes still
    // images, and a two-hundred-megabyte MOV arriving where a JPEG is expected
    // would be downloaded in full before failing.
    photos.filter(p => (p.kind || 'photo') !== 'video').map(async (p) => {
      if (!p.url) return null;
      try {
        const res = await fetch(p.url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], p.name || 'photo.jpg', {
          type: p.contentType || blob.type || 'image/jpeg',
        });
      } catch {
        return null;
      }
    }),
  );
  return out.filter((f): f is File => f !== null);
}

/** Detach one photo from a project. */
export async function removeDesignPhoto(
  designId: string,
  ownerKey: string,
  photoId: string,
  headers: Headers,
): Promise<boolean> {
  const res = await fetch(
    `${SERVER}/design-projects/${designId}/photos/${photoId}?owner=${encodeURIComponent(ownerKey)}`,
    { method: 'DELETE', headers },
  );
  const data = await res.json().catch(() => null);
  return Boolean(res.ok && data?.success);
}
