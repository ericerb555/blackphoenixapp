/**
 * Phoenix Exchange — the rules a logo obeys, with no Supabase client in sight.
 *
 * Same shape as `exchangeDeals.ts` and for the same reason: the decisions that
 * matter here are about who may publish what to whom, and they are worth
 * reading and testing without a database, a storage bucket or a network.
 *
 * THE RULE THAT DOES THE MOST WORK
 *
 * `logoIsPublic` requires BOTH an approved logo and a listing still in the
 * hands of whoever claimed it. One condition would not be enough: the suspend
 * route can put `claim_state` back to `listed` when a claim turns out to be
 * wrong, and a logo that kept showing afterwards would be the directory
 * asserting a brand on behalf of a business that no longer stands behind it.
 * The logo follows the claim, because the claim is the only thing that ever
 * authorised it.
 *
 * WHY A BUSINESS CANNOT REACH `approved` FROM ANY STATE
 *
 * Eric's standing rule is that nothing a tenant publishes reaches a resident
 * without a person saying so. `businessMayMove` refuses every transition to
 * `approved` from everywhere, so there is no sequence of business-side requests
 * that publishes an image — the same enforcement `exchangeDeals.ts` uses, and
 * for the same reason that a flag on a screen is not enforcement.
 */

export type LogoState = "none" | "submitted" | "approved" | "rejected";

/** The one state the public sees. */
export const PUBLISHED_STATE: LogoState = "approved";

export interface LogoRecord {
  logo_path?: string | null;
  logo_state?: unknown;
  /** From the listing itself. The logo is only ever as valid as the claim. */
  claim_state?: unknown;
}

/**
 * Whether this listing's logo may be shown to somebody who is not its owner.
 *
 * Called by every route that serves a listing publicly, which is why it takes
 * the raw row rather than a tidied object: a route that had to remember to map
 * the fields first is a route that will one day forget.
 */
export function logoIsPublic(row: LogoRecord | null | undefined): boolean {
  if (!row) return false;
  if (String(row.logo_state ?? "") !== PUBLISHED_STATE) return false;
  if (!String(row.logo_path ?? "").trim()) return false;
  // The claim is the authorisation. Lose the claim, lose the logo.
  return String(row.claim_state ?? "") === "claimed";
}

/*
 * The two state machines, written as tables so the refusals are visible rather
 * than implied by the absence of a branch.
 */
const BUSINESS_MAY: Record<string, LogoState[]> = {
  // Uploading is how you get here, and re-uploading replaces what is queued.
  none: ["submitted"],
  submitted: ["submitted", "none"],
  // Replacing a rejected logo is the normal response to being rejected.
  rejected: ["submitted", "none"],
  // Taking down your own approved logo is yours to do. Putting a different one
  // up sends it back to the queue, which is the whole point of the queue.
  approved: ["submitted", "none"],
};

const STAFF_MAY: Record<string, LogoState[]> = {
  submitted: ["approved", "rejected"],
  // Reversing a decision without making the owner re-upload.
  approved: ["rejected"],
  rejected: ["approved"],
  // Nothing has been submitted, so there is nothing to decide.
  none: [],
};

export function businessMayMove(from: unknown, to: unknown): boolean {
  return (BUSINESS_MAY[String(from ?? "")] ?? []).includes(to as LogoState);
}

export function staffMayMove(from: unknown, to: unknown): boolean {
  return (STAFF_MAY[String(from ?? "")] ?? []).includes(to as LogoState);
}

/**
 * How big a logo may be.
 *
 * A logo is a small flat image displayed at about forty pixels on a list row
 * and a little larger on a listing page. Two megabytes is already generous —
 * it is there to absorb somebody's uncompressed export, not to host artwork.
 * The ceiling matters because the bucket is public and the uploader is not
 * staff.
 */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * Where the stored copy lives.
 *
 * Keyed by the organisation and nothing else, so a listing has one logo and a
 * replacement overwrites it rather than accumulating orphans nobody will ever
 * find again. The extension comes from the sniffed bytes, never from the
 * filename the browser supplied.
 */
export function logoObjectPath(orgId: string, ext: string): string {
  const id = String(orgId ?? "").trim();
  const safeExt = /^[a-z0-9]{2,5}$/.test(String(ext ?? "")) ? String(ext) : "bin";
  return `exchange-logos/${id}.${safeExt}`;
}

/**
 * What to say about an uploaded file before it is stored.
 *
 * Takes the sniffed result rather than the claimed content type, because the
 * header is the part the sender controls completely. `sniffImage` already
 * refuses SVG — an XML document that can carry script, served from a public
 * bucket, is stored cross-site scripting — and this returns the sentence an
 * owner reads rather than a boolean they cannot act on.
 */
export function refuseLogo(
  sniffed: { mime: string; ext: string } | null,
  byteLength: number,
): string | null {
  if (!byteLength) return "That file was empty.";
  if (byteLength > MAX_LOGO_BYTES) {
    return `That is ${(byteLength / 1024 / 1024).toFixed(1)}MB. A logo has to be under ${MAX_LOGO_BYTES / 1024 / 1024}MB.`;
  }
  if (!sniffed) {
    return "That is not a JPEG, PNG or WebP. An SVG cannot be accepted — it is a document that can carry code, and this one would be served from our public bucket.";
  }
  return null;
}

/**
 * The public images bucket. The same one `image-upload.tsx` writes to, because
 * a logo is exactly the kind of thing that bucket exists for: a brand asset
 * that has to display in a year's time to somebody who is not logged in.
 */
export const LOGO_BUCKET = "make-57095a78-images";

/**
 * The address a browser loads a stored logo from, built as a string.
 *
 * Written here rather than with the storage client so that every route serving
 * a listing can produce it without constructing one, and so that the shape is
 * testable without a network.
 *
 * `?v=` is not decoration. The object path is keyed by the organisation so a
 * replacement overwrites rather than leaving an orphan nobody will ever find,
 * which means a new logo arrives at an address a CDN already has an answer for.
 * The submission timestamp changes on every upload and makes it a new address.
 */
export function logoObjectUrl(
  path: unknown,
  submittedAt: unknown,
  supabaseUrl: unknown,
): string | null {
  const object = String(path ?? "").trim();
  const base = String(supabaseUrl ?? "").trim().replace(/\/+$/, "");
  if (!object || !base) return null;
  const url = `${base}/storage/v1/object/public/${LOGO_BUCKET}/${object}`;
  const version = Date.parse(String(submittedAt ?? "")) || 0;
  return version ? `${url}?v=${version}` : url;
}

/**
 * The logo a listing may show to the public, or null.
 *
 * The gate and the address in one call, so a route cannot serve the second
 * without having asked the first. Every public listing surface uses this.
 */
export function publicLogoUrl(
  row: LogoRecord & { logo_submitted_at?: unknown } | null | undefined,
  supabaseUrl: unknown,
): string | null {
  if (!logoIsPublic(row)) return null;
  return logoObjectUrl(row!.logo_path, (row as any).logo_submitted_at, supabaseUrl);
}

/** What an owner is told their logo is doing. */
export function phraseLogoState(state: unknown, reason?: unknown): string {
  switch (String(state ?? "")) {
    case "submitted":
      return "Waiting for us to look at it. It is not on your listing yet.";
    case "approved":
      return "Showing on your listing and on the map.";
    case "rejected":
      return String(reason ?? "").trim()
        ? `Not accepted: ${String(reason).trim()}`
        : "Not accepted. Upload a different image and we will look again.";
    default:
      return "No logo yet.";
  }
}
