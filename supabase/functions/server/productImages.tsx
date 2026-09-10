/**
 * Taking a vendor's product photograph and keeping our own copy of it.
 *
 * WHY WE MIRROR INSTEAD OF LINKING
 *
 * Storing their URL is free and wrong. It breaks the day they reorganise their
 * site, which for a picture on a quote a customer is reading is the wrong kind
 * of free. Worse, it leaves the image mutable by them after the fact: a vendor
 * could change what a customer sees on a document that has already been sent,
 * and nothing on our side would know. A mirrored copy is ours, and a sent quote
 * stays what it was.
 *
 * THE FETCH IS THE DANGEROUS PART, AND IT IS NOT NEW
 *
 * We are being asked to make a request, from inside our network, to an address
 * somebody outside chose. That is server-side request forgery, and
 * `outboundGuard` already exists for exactly this — https only, a port
 * allowlist, every private and metadata range in v4 and v6, DNS resolution
 * where the runtime permits it, and redirects followed by hand and revalidated
 * at every hop. This module adds no fetching of its own.
 *
 * WHAT A PICTURE IS ALLOWED TO BE
 *
 * JPEG, PNG or WebP, decided by SNIFFING THE BYTES rather than believing the
 * Content-Type header. A hostile or merely misconfigured server can claim
 * anything, and the header is the one part of the response the sender controls
 * completely.
 *
 * SVG IS REFUSED, DELIBERATELY
 *
 * `image-upload.tsx` accepts `image/svg+xml`, which is defensible for a logo a
 * member of staff uploaded and not for a file a vendor supplied. An SVG is a
 * document that can carry script, and these are served from a PUBLIC bucket to
 * customers. That is stored cross-site scripting with extra steps.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { safeFetch } from "./outboundGuard.ts";
import { sniffImage } from "./imageSniff.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

/**
 * A bucket of its own rather than the one logos live in.
 *
 * These files come from outside the company and are written by an automated
 * import; brand assets are uploaded by staff. Keeping them apart means a policy
 * or a purge applied to one cannot surprise the other.
 */
const BUCKET = "vendor-product-images";

/** Per image. Product photography that will not fit in this is not a photograph. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

let bucketReady: Promise<void> | null = null;
/** Create the bucket on first use, not at import — cold starts pay for that. */
function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        const { data } = await admin.storage.listBuckets();
        if (data?.some((b) => b.name === BUCKET)) return;
        const { error } = await admin.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: MAX_IMAGE_BYTES,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        });
        // A 409 means somebody else created it first, which is not a failure.
        if (error && !/exist/i.test(error.message)) throw error;
      } catch (err) {
        bucketReady = null; // let the next attempt retry
        throw err;
      }
    })();
  }
  return bucketReady;
}

export interface MirroredImage {
  /** The public URL of our copy — this is what gets stored and displayed. */
  url: string;
  /** Where it came from, kept so a re-sync can tell whether it changed. */
  sourceUrl: string;
  /** Whose image it is, so their display consent can be checked before showing it. */
  vendorId: string;
  mime: string;
  bytes: number;
  addedAt: string;
}

/**
 * Fetch, check and store one vendor-supplied image.
 *
 * Returns `{ error }` rather than throwing: an image that cannot be taken is a
 * line imported without a picture, never a failed import. A price list of 1,800
 * items should not be refused because one photograph 404s.
 */
export async function mirrorVendorImage(
  vendorId: string,
  sourceUrl: string,
): Promise<{ image?: MirroredImage; error?: string }> {
  const url = String(sourceUrl || "").trim();
  if (!url) return { error: "No image address." };

  const res = await safeFetch(url, { wantBytes: true, headers: { Accept: "image/*" } });
  if (!res.ok || !res.bytes) return { error: res.error || `The image address answered ${res.status}.` };
  if (res.bytes.byteLength > MAX_IMAGE_BYTES) {
    return { error: `That image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` };
  }

  const kind = sniffImage(res.bytes);
  if (!kind) {
    // Said in terms of what happened rather than what we guessed it was: the
    // usual cause is a login page or an error page served with a 200.
    return {
      error: res.contentType
        ? `That address did not return a JPEG, PNG or WebP (it sent ${res.contentType}).`
        : "That address did not return a JPEG, PNG or WebP.",
    };
  }

  await ensureBucket();

  // Namespaced by vendor so one vendor's import can never overwrite another's
  // file, and a random name so a guessable path cannot be used to replace one.
  const path = `${vendorId}/${crypto.randomUUID()}.${kind.ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(path, res.bytes, {
    contentType: kind.mime,
    upsert: false,
  });
  if (error) return { error: error.message || "Could not store that image." };

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return {
    image: {
      url: data.publicUrl,
      sourceUrl: url,
      vendorId,
      mime: kind.mime,
      bytes: res.bytes.byteLength,
      addedAt: new Date().toISOString(),
    },
  };
}

