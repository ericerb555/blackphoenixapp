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
      body: JSON.stringify({ ownerKey, photos: payload }),
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
    photos.map(async (p) => {
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
