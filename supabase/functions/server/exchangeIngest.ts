/**
 * Phoenix Exchange — turning public records into listings.
 *
 * The directory has to look complete before anybody has joined, or a resident
 * searching on launch day finds an empty page and never comes back. So it is
 * compiled: state and county business registries, contractor licence boards,
 * health-department restaurant inspections, liquor licences, chambers of
 * commerce, OpenStreetMap.
 *
 * (Public records only. Scraping a commercial maps product and republishing
 * it breaches its terms, whatever the data looks like once it is in a table.)
 *
 * THE RULE THIS MODULE EXISTS TO ENFORCE: INVENT NOTHING.
 *
 * A compiled listing carries the business's name, type, address, phone and
 * website, and not one field more. No description, no hours, no photographs,
 * no ratings — none of that can be trusted before an owner stands behind it,
 * and a directory caught making things up about real businesses is finished.
 *
 * Every function here is therefore allowed to *drop* a value it cannot trust
 * and never allowed to guess one. A missing phone number is a gap somebody
 * can fill; a wrong phone number is a complaint from a business that never
 * asked to be listed.
 *
 * AND IT MUST NEVER OVERWRITE A CLAIMED LISTING
 *
 * Once an owner has proved control and corrected their own details, a later
 * registry import finding a stale address must not quietly put it back. See
 * `mergeListing`, which is the only place that decides what a re-import may
 * touch.
 */

import { normalisePhrase } from "./exchangeCoverage.ts";

/** One row as it arrives from a registry, before anything is trusted. */
export interface RegistryRecord {
  name?: string | null;
  /** The registry's own words for what they do — "ROOFING CONTRACTOR". */
  businessType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  phone?: string | null;
  website?: string | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  licenseExpiresAt?: string | null;
  /** Which registry this came from, for provenance. */
  source?: string | null;
}

/** What a compiled listing is allowed to contain. Nothing else. */
export interface ListingCandidate {
  name: string;
  categorySlug: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  website: string | null;
  licenseNumber: string | null;
  licenseState: string | null;
  licenseExpiresAt: string | null;
  source: string | null;
  dedupeKey: string;
}

// ── names ────────────────────────────────────────────────────────────────────

/**
 * Suffixes a registry carries and a person does not say out loud. Stripped for
 * matching only — the displayed name keeps whatever the record said, because
 * "Sutton Roofing LLC" is what is on their van and their paperwork.
 */
const LEGAL_SUFFIXES = [
  "llc", "l l c", "inc", "incorporated", "corp", "corporation", "co",
  "company", "ltd", "limited", "llp", "lp", "pllc", "pc", "pa", "dba",
];

/** Tidied for display: collapsed whitespace, stray punctuation trimmed. */
export function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const out = input
    .replace(/\s+/g, " ")
    .replace(/^[\s,.\-–—]+|[\s,.\-–—]+$/g, "")
    .trim();
  return out === "" ? null : out;
}

/**
 * The form two records are compared on: lower-cased, punctuation dropped,
 * legal suffixes removed, "and" and "&" treated as the same word.
 *
 * Deliberately lossy. "Sutton Roofing, LLC" and "Sutton Roofing Inc" are the
 * same business listed twice by two registries, and a directory showing both
 * looks broken to the one person guaranteed to notice: the owner.
 */
export function matchableName(input: unknown): string | null {
  const cleaned = cleanName(input);
  if (!cleaned) return null;

  let out = cleaned.toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip trailing legal suffixes, repeatedly — "Sutton Roofing Co Inc".
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (out === suffix) break;
      if (out.endsWith(" " + suffix)) {
        out = out.slice(0, -(suffix.length + 1)).trim();
        changed = true;
      }
    }
  }

  return out === "" ? null : out;
}

// ── contact details ──────────────────────────────────────────────────────────

/**
 * A ten-digit North American number, or nothing.
 *
 * Nothing is the important half. A seven-digit fragment, a registry's
 * placeholder of 0000000000, or a string with letters in it all become null
 * rather than something that looks dialable and is not. A listing with no
 * phone number is a gap; a listing with a wrong one sends a resident to a
 * stranger.
 */
export function normalisePhone(input: unknown): string | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const digits = String(input).replace(/\D/g, "");

  const ten = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;

  if (ten.length !== 10) return null;
  // Area codes never start with 0 or 1, and an all-same-digit run is a
  // placeholder rather than a number.
  if (/^[01]/.test(ten)) return null;
  if (/^(\d)\1{9}$/.test(ten)) return null;

  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/** Digits only, for comparing two records that format differently. */
export function phoneDigits(input: unknown): string | null {
  const formatted = normalisePhone(input);
  return formatted ? formatted.replace(/\D/g, "") : null;
}

/**
 * An http or https URL, or nothing.
 *
 * Enforced here and again on the server before anything is stored, because
 * these links render across the portals and the store — a `javascript:`
 * scheme sitting in this field would execute for every other visitor. A
 * registry is not a hostile source, but it is an unchecked one, and the
 * distinction is not worth relying on.
 */
export function normaliseWebsite(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;

  // Campaign parameters from whoever compiled the registry are not the
  // business's URL and should not be republished as though they were.
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
  }

  return url.toString().replace(/\/$/, "");
}

/** Five-digit postcode, or nothing. ZIP+4 keeps only the five. */
export function normalisePostcode(input: unknown): string | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const match = String(input).trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : null;
}

/** Two-letter state code, upper-cased, or nothing. */
export function normaliseState(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const out = input.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(out) ? out : null;
}

// ── category assignment ──────────────────────────────────────────────────────

/**
 * Map a registry's description of a business onto a category.
 *
 * `aliasIndex` is the alias table, already normalised — the same table the
 * search box uses, so a phrase that resolves for a resident resolves the same
 * way here. One dictionary, not two that drift.
 *
 * Exact match first, then the longest alias contained in the text, so
 * "ROOFING AND SIDING CONTRACTOR" prefers a two-word alias over a one-word
 * one. Returns null rather than a guess: an unassigned listing is visible in
 * the directory and fixable, while a roofer filed under plumbing is a quiet
 * insult that produces no leads and no complaint until they cancel.
 */
export function assignCategory(
  businessType: unknown,
  aliasIndex: ReadonlyMap<string, string>,
): string | null {
  const text = normalisePhrase(businessType);
  if (!text || aliasIndex.size === 0) return null;

  const exact = aliasIndex.get(text);
  if (exact) return exact;

  let best: { slug: string; length: number } | null = null;
  for (const [phrase, slug] of aliasIndex) {
    if (phrase.length <= 2) continue;
    if (!text.includes(phrase)) continue;
    if (!best || phrase.length > best.length) best = { slug, length: phrase.length };
  }

  return best?.slug ?? null;
}

// ── the candidate ────────────────────────────────────────────────────────────

/**
 * How two records are recognised as the same business.
 *
 * Phone first where there is one — two registries rarely agree on how an
 * address is written and almost always agree on the number. Otherwise the
 * matchable name plus the postcode, which is wrong only for two businesses of
 * the same name in one postcode, and that is rare enough to be worth the
 * occasional manual split.
 */
export function dedupeKeyFor(record: {
  name?: unknown; phone?: unknown; postcode?: unknown;
}): string {
  const digits = phoneDigits(record?.phone);
  if (digits) return `tel:${digits}`;

  const name = matchableName(record?.name) ?? "";
  const zip = normalisePostcode(record?.postcode) ?? "";
  return `name:${name}|${zip}`;
}

/**
 * A registry row as a listing, or null when there is not enough to list.
 *
 * A name is the one thing that cannot be missing, and a business with neither
 * a postcode nor a phone number cannot be placed or contacted, so it is not
 * worth a row — it would only ever be a dead listing, which is worse than
 * an absent one.
 */
export function toListing(
  record: RegistryRecord,
  aliasIndex: ReadonlyMap<string, string>,
): ListingCandidate | null {
  const name = cleanName(record?.name);
  if (!name) return null;

  const postcode = normalisePostcode(record?.postcode);
  const phone = normalisePhone(record?.phone);
  if (!postcode && !phone) return null;

  return {
    name,
    categorySlug: assignCategory(record?.businessType, aliasIndex),
    address: cleanName(record?.address),
    city: cleanName(record?.city),
    state: normaliseState(record?.state),
    postcode,
    phone,
    website: normaliseWebsite(record?.website),
    licenseNumber: cleanName(record?.licenseNumber),
    licenseState: normaliseState(record?.licenseState),
    licenseExpiresAt: cleanName(record?.licenseExpiresAt),
    source: cleanName(record?.source),
    dedupeKey: dedupeKeyFor({ name, phone, postcode }),
  };
}

/**
 * Collapse a batch to one candidate per business.
 *
 * Later records fill gaps in earlier ones rather than replacing them: a
 * licence board that knows the licence number and a chamber of commerce that
 * knows the website describe the same business, and taking the union is the
 * whole reason to compile from several sources. First non-empty value wins,
 * so source order is the priority order.
 */
export function dedupeListings(candidates: readonly ListingCandidate[]): ListingCandidate[] {
  const byKey = new Map<string, ListingCandidate>();

  for (const candidate of candidates) {
    const existing = byKey.get(candidate.dedupeKey);
    if (!existing) {
      byKey.set(candidate.dedupeKey, { ...candidate });
      continue;
    }

    for (const field of [
      "categorySlug", "address", "city", "state", "postcode", "phone",
      "website", "licenseNumber", "licenseState", "licenseExpiresAt",
    ] as const) {
      if (!existing[field] && candidate[field]) {
        (existing as any)[field] = candidate[field];
      }
    }
  }

  return [...byKey.values()];
}

// ── re-importing over what is already there ──────────────────────────────────

export interface ExistingListing {
  claim_state?: string | null;
  listing_source?: string | null;
  name?: string | null;
  phone?: string | null;
  website?: string | null;
  license_number?: string | null;
}

/**
 * What a re-import is allowed to change.
 *
 * **A claimed listing is never touched.** Once an owner has proved control
 * and corrected their own details, a registry that still holds last year's
 * address must not quietly put it back. The owner would see their corrections
 * silently undone and have no idea why, which is the fastest possible way to
 * lose a member.
 *
 * On an unclaimed listing a re-import may only FILL GAPS, not replace
 * answers. Two registries disagreeing about a phone number is not a reason to
 * take the newer one; it is a reason to keep the one already shown and leave
 * the disagreement for a human.
 *
 * Returns the fields to write — empty when there is nothing to do.
 */
export function mergeListing(
  existing: ExistingListing | null | undefined,
  candidate: ListingCandidate,
): Record<string, unknown> {
  if (!existing) {
    return {
      name: candidate.name,
      phone: candidate.phone,
      website: candidate.website,
      license_number: candidate.licenseNumber,
      license_state: candidate.licenseState,
      license_expires_at: candidate.licenseExpiresAt,
      claim_state: "listed",
      listing_source: "registry",
    };
  }

  if (String(existing.claim_state ?? "").toLowerCase() === "claimed") return {};
  if (String(existing.listing_source ?? "").toLowerCase() !== "registry") return {};

  const patch: Record<string, unknown> = {};
  const fill = (column: string, current: unknown, incoming: unknown) => {
    if (!current && incoming) patch[column] = incoming;
  };

  fill("phone", existing.phone, candidate.phone);
  fill("website", existing.website, candidate.website);
  fill("license_number", existing.license_number, candidate.licenseNumber);

  return patch;
}

/**
 * The URL slug for a compiled listing.
 *
 * `organizations.slug` is unique and not null, and it is the whole address of
 * the public page — `/exchange-listing?slug=…` — so it has to be stable,
 * readable and collision-free.
 *
 * Readable matters more than it looks: this is what a business sees when they
 * are deciding whether to claim, and `sutton-roofing` reads as a product while
 * `org-7f3a91` reads as a database. The postcode is the discriminator rather
 * than a random suffix for the same reason — two Dunkin' in one town is a real
 * situation, and `dunkin-03079` still says something true.
 *
 * Accents are folded rather than dropped so that "Café Nervosa" becomes
 * `cafe-nervosa` and not `caf-nervosa`.
 */
export function listingSlug(name: unknown, discriminator?: unknown): string {
  const base = String(name ?? "")
    .normalize("NFD")
    // Combining marks, so folding happens before the strip below.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  const tail = String(discriminator ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10);

  // A name of nothing but punctuation still needs an address.
  if (!base) return tail ? `listing-${tail}` : "listing";
  return tail ? `${base}-${tail}` : base;
}

/**
 * Slug endings the invite flow owns, which a compiled listing must never take.
 *
 * `organizations.tsx` builds an invited account's slug as
 * `{email local part}-{portal type}` — joe@example.com invited to the vendor
 * portal becomes `joe-vendor`. And `ensureOrganization` REUSES an organisation
 * it finds by that slug rather than creating one.
 *
 * So a compiled business literally named "Joe Vendor" would slugify to
 * `joe-vendor`, and the next invite for joe@example.com would attach that
 * person's membership to a business they have nothing to do with. Unlikely,
 * and the consequence is somebody holding membership of a stranger's listing,
 * which is not a risk worth carrying for the sake of one tidy slug.
 *
 * The invite path is deliberately not the thing being changed here: Eric's
 * standing rule is that every way onto the platform has to keep working, and
 * compiled listings are the newcomer. The newcomer gets out of the way.
 */
const INVITE_SLUG_ENDINGS = [
  "customer", "landlord", "vendor", "subcontractor", "advertiser",
  "property_manager", "condo_manager", "condo_association", "operator",
];

/** Would this slug collide with the shape the invite flow generates? */
export function collidesWithInviteSlug(slug: unknown): boolean {
  const value = String(slug ?? "").toLowerCase();
  return INVITE_SLUG_ENDINGS.some((ending) => value.endsWith(`-${ending}`));
}
