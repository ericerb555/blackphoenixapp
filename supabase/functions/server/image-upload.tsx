/**
 * Image Upload API — moves base64 images out of localStorage into Storage.
 *
 * Logos and brand assets must display forever, so this uses a PUBLIC bucket and
 * returns permanent public URLs (unlike media-library's 24h signed URLs).
 *
 * ENDPOINTS:
 * - POST /make-server-3eae23a6/images/upload       → JSON { dataUrl, folder? } (base64 data URL)
 * - POST /make-server-3eae23a6/images/upload-file  → multipart/form-data { file, folder? }
 *
 * STORAGE:
 * - Bucket: make-57095a78-images (public)
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const imageUploadRouter = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BUCKET_NAME = "make-57095a78-images";
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB per image is plenty for logos/photos

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

// Idempotently ensure the public bucket exists — LAZILY (on first upload), not
// at module load. Running storage network calls at import time slows cold-start
// and can fail the deploy health-check (surfacing as deploy 409s).
let bucketReady: Promise<void> | null = null;
function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some((b) => b.name === BUCKET_NAME);
        if (!exists) {
          const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: MAX_FILE_SIZE,
          });
          // A concurrent request (or a prior run) may have created it first —
          // "already exists" (409) is not a real failure; the bucket is ready.
          const alreadyExists =
            error &&
            ((error as any).statusCode === "409" ||
              (error as any).status === 409 ||
              /already exists/i.test(error.message || ""));
          if (error && !alreadyExists) {
            console.error(`❌ [ImageUpload] Failed to create bucket:`, error);
            bucketReady = null; // allow retry on next upload
            throw error;
          }
        }
        console.log(`✅ [ImageUpload] Bucket ready: ${BUCKET_NAME}`);
      } catch (error) {
        // Treat "already exists" as success even if it bubbled up here.
        if (/already exists/i.test((error as any)?.message || "")) {
          console.log(`✅ [ImageUpload] Bucket already exists: ${BUCKET_NAME}`);
          return;
        }
        console.error("❌ [ImageUpload] Error initializing bucket:", error);
        bucketReady = null;
        throw error;
      }
    })();
  }
  return bucketReady;
}

function sanitizeFolder(folder?: string | null): string {
  if (!folder) return "misc";
  return folder.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/^\/+|\/+$/g, "") || "misc";
}

function storagePath(folder: string, ext: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 12);
  return `${sanitizeFolder(folder)}/${y}/${m}/${Date.now()}-${rand}.${ext}`;
}

/**
 * Parse a data URL into { mime, bytes }. Returns null if not a data URL.
 */
function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { mime, bytes };
}

async function uploadBytes(bytes: Uint8Array, mime: string, folder: string): Promise<string> {
  await ensureBucket();
  const ext = EXT_BY_MIME[mime] || "png";
  const path = storagePath(folder, ext);
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * POST /images/upload — base64 data URL in JSON. Best for migrating existing
 * localStorage images and for small client uploads.
 */
imageUploadRouter.post("/make-server-3eae23a6/images/upload", async (c) => {
  try {
    const { dataUrl, folder } = await c.req.json();
    if (!dataUrl || typeof dataUrl !== "string") {
      return c.json({ success: false, error: "Missing dataUrl" }, 400);
    }
    // If it's already a URL (not base64), just return it — nothing to migrate.
    if (/^https?:\/\//.test(dataUrl)) {
      return c.json({ success: true, url: dataUrl, alreadyUrl: true });
    }
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return c.json({ success: false, error: "Value is not a base64 data URL" }, 400);
    }
    if (parsed.bytes.length > MAX_FILE_SIZE) {
      return c.json({ success: false, error: `Image exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB` }, 400);
    }
    const url = await uploadBytes(parsed.bytes, parsed.mime, folder);
    return c.json({ success: true, url });
  } catch (error) {
    console.error("[ImageUpload] upload error:", error);
    return c.json({ success: false, error: `Image upload failed: ${error}` }, 500);
  }
});

/**
 * POST /images/upload-file — multipart file upload.
 */
imageUploadRouter.post("/make-server-3eae23a6/images/upload-file", async (c) => {
  try {
    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    const folder = form.get("folder") as string | null;
    if (!file) return c.json({ success: false, error: "No file provided" }, 400);
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ success: false, error: `Image exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB` }, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = await uploadBytes(bytes, file.type || "image/png", folder);
    return c.json({ success: true, url });
  } catch (error) {
    console.error("[ImageUpload] upload-file error:", error);
    return c.json({ success: false, error: `Image upload failed: ${error}` }, 500);
  }
});

export { imageUploadRouter };
export default imageUploadRouter;
