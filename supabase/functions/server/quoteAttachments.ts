/**
 * Photos and videos attached to a quote.
 *
 * WHY THIS EXISTS
 *
 * Eric asked why a new quote raised from the Command Center cannot take a
 * picture or a video. It could not because nothing in the quote flow ever
 * accepted a file: `StartQuoteModal` is text fields only, `QuoteToContractEditor`
 * has no file input, and neither the `Quote` nor the `WorkRequest` shape had
 * anywhere to put one. Not a bug — a missing feature.
 *
 * The photographs that matter are taken standing in front of the work, by
 * whoever is quoting it, and they are what the estimate gets argued over later.
 * So they attach to the quote itself rather than to the website gallery.
 *
 * WHY NOT `/media/upload` OR `/gallery/upload`
 *
 * `/gallery/upload` files things in the public website library, awaiting an
 * admin's decision to publish — a site photo of somebody's half-demolished
 * bathroom does not belong in a queue whose exit is the marketing page.
 * `/media/upload` is the right bucket but files everything in one flat
 * `media:all` index with no notion of what it belongs to, so there would be no
 * way to ask "what is attached to this quote" without scanning the library.
 *
 * This stores in the SAME private bucket media-library already uses, under its
 * own prefix, with one KV record per attachment keyed by quote. Listing a
 * quote's attachments is then one prefix read.
 *
 * NOTHING HERE IS PUBLIC
 *
 * The bucket is private and the URLs handed out are signed and expire. They are
 * minted fresh on every list rather than stored, because a stored URL is a URL
 * that works until it silently does not. `visibleToCustomer` is recorded per
 * attachment and defaults to FALSE — the customer-facing quote view does not
 * read it yet, and it is false so that turning that on later cannot
 * retroactively publish a photo somebody attached while it meant nothing.
 *
 * ENDPOINTS
 * - POST   /make-server-3eae23a6/quotes/:quoteId/attachments      multipart { file, caption?, visibleToCustomer? }
 * - GET    /make-server-3eae23a6/quotes/:quoteId/attachments
 * - PATCH  /make-server-3eae23a6/quotes/:quoteId/attachments/:id  JSON { caption?, visibleToCustomer? }
 * - DELETE /make-server-3eae23a6/quotes/:quoteId/attachments/:id
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { sniffPhoto } from "./photoSniff.ts";

const quoteAttachmentsRouter = new Hono();

/** The bucket media-library already created and keeps private. */
const BUCKET_NAME = "make-3eae23a6-media";

/**
 * 50MB, matching media-library's cap deliberately: the two write to the same
 * bucket, and that bucket was created with a 50MB `fileSizeLimit` (its own
 * comment records that 100MB made bucket creation 413). A larger cap here would
 * be a promise storage refuses to keep.
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const SIGNED_URL_TTL_SECONDS = 86400; // 24h, as media-library does

/**
 * THE DECLARED IMAGE TYPE IS NOT CONSULTED. See `sniffPhoto` in `photoSniff.ts`.
 *
 * This set used to be the gate, and it was wrong twice over — Eric found both
 * within the hour by pressing the button on his phone:
 *
 *  1. **It refused iPhone photographs.** A photo picked from an iOS library
 *     arrives as `image/heic`, which was not on the list, so every upload from
 *     the device the feature exists for was answered with 400.
 *
 *  2. **It advertised three formats that could never succeed.** `image/gif`,
 *     `image/bmp` and `image/tiff` passed this check and were then handed to
 *     `sniffImage`, which only knows JPEG, PNG and WebP — so they failed a
 *     second check with "not a readable image", which was both a refusal and a
 *     lie. An allowlist that disagrees with its own validator is worse than no
 *     allowlist, because it reads as permission.
 *
 * The lesson kept rather than the list: for an image, the only thing that
 * decides is the bytes. A declared type is used solely to route video, which
 * cannot be sniffed here.
 *
 * SVG is absent on purpose, unlike media-library's list. An SVG is a
 * script-bearing document and these are rendered back into a browser from our
 * own origin; a photo of a job site is never an SVG, so excluding it costs
 * nothing real. Nothing below can return one, so it cannot arrive by accident
 * either.
 */
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime", // MOV — what an iPhone produces
  "video/webm",
  "video/x-msvideo", // AVI
  "video/x-matroska", // MKV
]);

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHO IS ASKING
//
// Same rule, and the same role set, as saving the quote itself in `quotes.tsx`:
// staff only. This runs on the service-role client, which bypasses RLS, so the
// token check is the only thing between the public internet and the bucket —
// and the anon key ships in the browser bundle, so "signed in" alone is any
// account the public signup page can mint.
// ─────────────────────────────────────────────────────────────────────────────

const STAFF_ROLES = new Set([
  "owner",
  "platform_owner",
  "business_owner",
  "admin",
  "master_admin",
  "management",
]);

async function actor(c: any): Promise<{ email: string; staff: boolean; userId: string; name: string }> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { email: "", staff: false, userId: "", name: "" };
  const { data, error } = await service().auth.getUser(token);
  const user = error ? null : data?.user;
  if (!user?.email) return { email: "", staff: false, userId: "", name: "" };

  const owners = (Deno.env.get("PLATFORM_OWNER_EMAILS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = String(user.email).toLowerCase();
  const role = String(
    user.app_metadata?.role || user.app_metadata?.accountType || "",
  ).toLowerCase().replace(/[\s-]+/g, "_");

  return {
    email,
    staff: owners.includes(email) || STAFF_ROLES.has(role),
    userId: String(user.id || ""),
    name: String(user.user_metadata?.full_name || user.email || ""),
  };
}

async function requireStaff(c: any): Promise<Response | null> {
  const { email, staff } = await actor(c);
  if (!email) return c.json({ success: false, error: "Sign in required." }, 401);
  if (!staff) return c.json({ success: false, error: "Administrator access is required." }, 403);
  return null;
}

/**
 * The quote id, reduced to something that can only be one path segment.
 *
 * It arrives from the URL and is dropped into both a storage path and a KV key,
 * so it gets the same treatment `media-library`'s `getFileExtension` learned to
 * apply to extensions: an id like `Q-1/../../elsewhere` would otherwise place
 * the object wherever that resolves to inside the bucket. Returns "" for
 * anything unusable, and callers refuse on "".
 */
function safeId(raw: string): string {
  return String(raw || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 120);
}

/** One harmless path segment, never the caller's own string. */
function safeExt(filename: string, fallback: string): string {
  const parts = String(filename || "").split(".");
  if (parts.length < 2) return fallback;
  const raw = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
  return raw.slice(0, 8) || fallback;
}

let bucketPromise: Promise<void> | null = null;

/**
 * Ensure the bucket exists, once per isolate, on first use.
 *
 * Lazy rather than at module load: a storage round trip at import time slows
 * every cold start, including the requests that have nothing to do with
 * attachments, and can fail the deploy health check. The memo is cleared on
 * failure so one transient error cannot poison the isolate into never retrying.
 *
 * In practice media-library has already created this bucket; this exists so a
 * fresh project does not have its first attachment upload fail.
 */
function bucketReady(): Promise<void> {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      const sb = service();
      const { data: buckets } = await sb.storage.listBuckets();
      if (buckets?.some((b) => b.name === BUCKET_NAME)) return;
      const { error } = await sb.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE,
      });
      const alreadyExists = error && (
        (error as any).statusCode === "409" ||
        (error as any).status === 409 ||
        /already exists/i.test(error.message || "")
      );
      if (error && !alreadyExists) throw error;
    })().catch((err) => { bucketPromise = null; throw err; });
  }
  return bucketPromise;
}

interface QuoteAttachment {
  id: string;
  quoteId: string;
  kind: "image" | "video";
  name: string;
  caption: string;
  mimeType: string;
  size: number;
  storagePath: string;
  /** Staff only until the customer quote view learns to read this. */
  visibleToCustomer: boolean;
  uploadedAt: string;
  uploadedBy: string;
  uploadedById: string;
}

const recordKey = (quoteId: string, id: string) => `quote-attachment:${quoteId}:${id}`;
const quotePrefix = (quoteId: string) => `quote-attachment:${quoteId}:`;

/** A signed, expiring URL for one stored object. Null if it cannot be minted. */
async function signedUrlFor(storagePath: string): Promise<string | null> {
  const { data, error } = await service().storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("[QuoteAttachments] Could not sign", storagePath, error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Read a boolean out of multipart form data, where everything is a string.
 *
 * `Boolean("false")` is true, which is exactly the bug that would publish a
 * photo to a customer because the browser sent the word "false".
 */
function formBool(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

quoteAttachmentsRouter.post(
  "/make-server-3eae23a6/quotes/:quoteId/attachments",
  async (c) => {
    const refused = await requireStaff(c);
    if (refused) return refused;
    const who = await actor(c);

    const quoteId = safeId(c.req.param("quoteId"));
    if (!quoteId) return c.json({ success: false, error: "A quote id is required." }, 400);

    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      if (!file || typeof (file as any).arrayBuffer !== "function") {
        return c.json({ success: false, error: "No file was sent." }, 400);
      }

      if (file.size === 0) {
        return c.json({ success: false, error: `"${file.name}" is empty.` }, 400);
      }
      if (file.size > MAX_FILE_SIZE) {
        return c.json({
          success: false,
          error: `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(0)}MB. The limit is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        }, 400);
      }

      const declared = String(file.type || "").toLowerCase();
      const bytes = new Uint8Array(await file.arrayBuffer());

      /**
       * Video routes on its declared type; everything else is sniffed.
       *
       * This order matters and is the fix for the bug Eric found. The old code
       * asked "is the declared type on my list of images?" FIRST, so a
       * photograph whose type was not on the list — every iPhone HEIC — was
       * refused before its bytes were ever looked at. Now a file that is not a
       * recognised video is simply handed to the sniffer, and the sniffer
       * decides. A declared type that is absent, wrong, or novel no longer
       * matters for an image.
       *
       * Video genuinely cannot be sniffed here, so it keeps the declared-type
       * check. That is acceptable where it is not for an image: a video is
       * stored private, served from a signed URL, and only ever placed in a
       * `<video>` element, which does not execute what it cannot decode.
       */
      const isVideo = VIDEO_TYPES.has(declared);

      let mimeType: string;
      let ext: string;

      if (isVideo) {
        mimeType = declared;
        ext = safeExt(file.name, "mp4");
      } else {
        const sniffed = sniffPhoto(bytes);
        if (!sniffed) {
          /**
           * Say which of the two things went wrong.
           *
           * The old message was "not a readable image" for both a corrupt JPEG
           * and a PDF somebody meant to attach, and for the HEIC case it was
           * simply false. Naming the declared type lets whoever hit it tell
           * "you sent us a document" from "that photo is damaged" without
           * reading the server log.
           */
          const looksLikeAFile = declared && !declared.startsWith("image/");
          return c.json({
            success: false,
            error: looksLikeAFile
              ? `"${file.name}" is a ${declared} — only photos and video can be attached to a quote.`
              : `"${file.name}" could not be read as a photo or a video. Photos: JPG, PNG, HEIC, WebP, GIF. Video: MP4, MOV, WebM, AVI, MKV.`,
          }, 400);
        }
        mimeType = sniffed.mime;
        ext = sniffed.ext;
      }

      await bucketReady();

      const id = `QA-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const storagePath = `quote-attachments/${quoteId}/${id}.${ext}`;

      const { error: uploadError } = await service().storage
        .from(BUCKET_NAME)
        .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

      if (uploadError) {
        console.error("[QuoteAttachments] Storage upload failed:", uploadError);
        return c.json({ success: false, error: "The file could not be stored. Please try again." }, 500);
      }

      const record: QuoteAttachment = {
        id,
        quoteId,
        kind: isVideo ? "video" : "image",
        name: String(file.name || "attachment").slice(0, 200),
        caption: String(formData.get("caption") || "").slice(0, 500),
        mimeType,
        size: file.size,
        storagePath,
        visibleToCustomer: formBool(formData.get("visibleToCustomer")),
        uploadedAt: new Date().toISOString(),
        uploadedBy: who.name || who.email,
        uploadedById: who.userId,
      };

      /**
       * Written AFTER the object is in the bucket.
       *
       * The other order leaves a record pointing at nothing when the upload
       * fails, and a thumbnail that will never load is harder to explain than
       * an upload that plainly did not happen.
       */
      await kv.set(recordKey(quoteId, id), record);

      const url = await signedUrlFor(storagePath);
      console.log(`[QuoteAttachments] ${record.kind} ${id} attached to quote ${quoteId} by ${who.email}`);
      return c.json({ success: true, attachment: { ...record, url } });
    } catch (error) {
      console.error("[QuoteAttachments] Upload error:", error);
      return c.json({
        success: false,
        error: "The file could not be attached.",
        details: String(error),
      }, 500);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────

quoteAttachmentsRouter.get(
  "/make-server-3eae23a6/quotes/:quoteId/attachments",
  async (c) => {
    const refused = await requireStaff(c);
    if (refused) return refused;

    const quoteId = safeId(c.req.param("quoteId"));
    if (!quoteId) return c.json({ success: false, error: "A quote id is required." }, 400);

    try {
      const rows = (await kv.getByPrefix(quotePrefix(quoteId))) || [];
      const records = (rows as QuoteAttachment[])
        .filter((r) => r && r.storagePath)
        .sort((a, b) => String(a.uploadedAt).localeCompare(String(b.uploadedAt)));

      // Signed fresh on every read. A URL stored at upload time would be 24
      // hours from expiring the moment it was written, and the failure is a
      // broken thumbnail with no explanation.
      const attachments = await Promise.all(
        records.map(async (r) => ({ ...r, url: await signedUrlFor(r.storagePath) })),
      );

      return c.json({ success: true, attachments });
    } catch (error) {
      console.error("[QuoteAttachments] List error:", error);
      return c.json({ success: false, error: "Could not load the attachments.", details: String(error) }, 500);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// EDIT — caption, and whether the customer may see it
// ─────────────────────────────────────────────────────────────────────────────

quoteAttachmentsRouter.patch(
  "/make-server-3eae23a6/quotes/:quoteId/attachments/:id",
  async (c) => {
    const refused = await requireStaff(c);
    if (refused) return refused;

    const quoteId = safeId(c.req.param("quoteId"));
    const id = safeId(c.req.param("id"));
    if (!quoteId || !id) return c.json({ success: false, error: "Unknown attachment." }, 400);

    try {
      const existing = (await kv.get(recordKey(quoteId, id))) as QuoteAttachment | null;
      if (!existing) return c.json({ success: false, error: "That attachment no longer exists." }, 404);

      const body = await c.req.json().catch(() => ({}));

      // Field by field, so a caller cannot rewrite `storagePath` and point a
      // record at somebody else's object.
      const updated: QuoteAttachment = {
        ...existing,
        caption: typeof body?.caption === "string" ? body.caption.slice(0, 500) : existing.caption,
        visibleToCustomer: typeof body?.visibleToCustomer === "boolean"
          ? body.visibleToCustomer
          : existing.visibleToCustomer,
      };

      await kv.set(recordKey(quoteId, id), updated);
      const url = await signedUrlFor(updated.storagePath);
      return c.json({ success: true, attachment: { ...updated, url } });
    } catch (error) {
      console.error("[QuoteAttachments] Patch error:", error);
      return c.json({ success: false, error: "Could not update the attachment.", details: String(error) }, 500);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

quoteAttachmentsRouter.delete(
  "/make-server-3eae23a6/quotes/:quoteId/attachments/:id",
  async (c) => {
    const refused = await requireStaff(c);
    if (refused) return refused;

    const quoteId = safeId(c.req.param("quoteId"));
    const id = safeId(c.req.param("id"));
    if (!quoteId || !id) return c.json({ success: false, error: "Unknown attachment." }, 400);

    try {
      const existing = (await kv.get(recordKey(quoteId, id))) as QuoteAttachment | null;
      if (!existing) {
        // Already gone. Reported as success: the caller asked for it to not be
        // there, and it is not there.
        return c.json({ success: true, deleted: id });
      }

      /**
       * The object goes first, then the record.
       *
       * If storage refuses, the record stays and the attachment is still
       * listed — recoverable, and visibly so. The other order would leave an
       * orphaned file in the bucket that nothing references and nobody can
       * find to delete.
       */
      const { error: removeError } = await service().storage
        .from(BUCKET_NAME)
        .remove([existing.storagePath]);
      if (removeError) {
        console.error("[QuoteAttachments] Storage remove failed:", removeError);
        return c.json({ success: false, error: "The file could not be removed. Please try again." }, 500);
      }

      await kv.del(recordKey(quoteId, id));
      console.log(`[QuoteAttachments] Removed ${id} from quote ${quoteId}`);
      return c.json({ success: true, deleted: id });
    } catch (error) {
      console.error("[QuoteAttachments] Delete error:", error);
      return c.json({ success: false, error: "Could not remove the attachment.", details: String(error) }, 500);
    }
  },
);

export default quoteAttachmentsRouter;
