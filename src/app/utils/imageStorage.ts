/**
 * imageStorage — client helpers for moving base64 images to Supabase Storage.
 *
 * Storing base64 data URLs in localStorage bloats the store toward the browser's
 * ~5–10MB limit and made server backups oversized. These helpers upload images
 * to a public Storage bucket (via the server) and return permanent URLs to keep
 * in their place.
 */
import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/**
 * The signed-in person’s token, falling back to the anonymous key.
 *
 * These helpers sent the anonymous key and nothing else, so every upload came
 * back "Sign in required." — the routes are staff-only and the anonymous key
 * resolves to nobody. Uploading a logo could not have worked for anybody.
 *
 * The fallback is kept so a caller with no session still gets the server’s own
 * refusal rather than a thrown error here.
 */
async function authHeader(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return `Bearer ${session.access_token}`;
  } catch {
    /* fall through to the anonymous key */
  }
  return `Bearer ${publicAnonKey}`;
}

export function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image');
}

/**
 * Upload a base64 data URL and get back a permanent public URL.
 * If the value is already an http(s) URL, it's returned unchanged.
 */
export async function uploadImageDataUrl(dataUrl: string, folder = 'misc'): Promise<string> {
  if (/^https?:\/\//.test(dataUrl)) return dataUrl;
  const res = await fetch(`${SERVER}/images/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': await authHeader() },
    body: JSON.stringify({ dataUrl, folder }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.error || `Image upload failed (HTTP ${res.status})`);
  }
  return data.url as string;
}

/**
 * Upload a File and get back a permanent public URL.
 */
export async function uploadImageFile(file: File, folder = 'misc'): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const res = await fetch(`${SERVER}/images/upload-file`, {
    method: 'POST',
    headers: { 'Authorization': await authHeader() },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.error || `Image upload failed (HTTP ${res.status})`);
  }
  return data.url as string;
}

/**
 * Recursively walk an object/array and replace every base64 image data URL with
 * an uploaded Storage URL. Returns { value, migrated } where `migrated` is the
 * number of images moved. Non-image data URLs and http URLs are left untouched.
 */
export async function migrateImagesDeep(
  input: any,
  folder = 'migrated',
): Promise<{ value: any; migrated: number }> {
  let migrated = 0;

  async function walk(node: any): Promise<any> {
    if (isDataUrl(node)) {
      try {
        const url = await uploadImageDataUrl(node, folder);
        if (url && url !== node) migrated++;
        return url;
      } catch (e) {
        console.warn('[imageStorage] Failed to migrate an image, leaving in place:', e);
        return node; // keep base64 on failure; safety-net stripping still applies to backups
      }
    }
    if (Array.isArray(node)) {
      const out = [];
      for (const item of node) out.push(await walk(item));
      return out;
    }
    if (node && typeof node === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(node)) out[k] = await walk(v);
      return out;
    }
    return node;
  }

  const value = await walk(input);
  return { value, migrated };
}

/**
 * Recursively strip base64 image data URLs from a value (replace with '').
 * Used as a backup safety-net so oversized base64 never ships to the server,
 * even if migration hasn't run yet.
 */
export function stripDataUrlsDeep(input: any): any {
  if (isDataUrl(input)) return '';
  if (Array.isArray(input)) return input.map(stripDataUrlsDeep);
  if (input && typeof input === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) out[k] = stripDataUrlsDeep(v);
    return out;
  }
  return input;
}
