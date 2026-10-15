/**
 * Phoenix Exchange — a business's logo.
 *
 * Three audiences, kept apart the same way `exchangeDealRoutes.tsx` keeps them
 * apart:
 *
 *   `/exchange/business/logo`   a business, about its own listing
 *   `/exchange/logo-review`     staff, about everybody's submissions
 *   (the public never calls these — a logo reaches a resident as a field on a
 *    listing the directory already serves)
 *
 * WHY THIS IS NOT image-upload.tsx, WHICH IS WHAT THE PLAN ASKED FOR
 *
 * The plan said reuse an existing upload path rather than invent a fourth, and
 * neither existing path can carry this:
 *
 *   `image-upload.tsx`  — right bucket, right byte-sniffing, but STAFF ONLY.
 *                         A business owner claiming their listing is not staff,
 *                         and widening that router's gate would hand every
 *                         signed-up account the project's storage.
 *   `media-library.tsx` — signed in, but a PRIVATE bucket with 24-hour signed
 *                         URLs. A logo on a public listing has to display in a
 *                         year's time to somebody who is not logged in.
 *
 * So what is reused is everything that should be: the same public bucket, the
 * same `sniffImage` that decides what a file actually is, and the same rule
 * that nothing a tenant publishes reaches a resident without a person saying
 * so. What is new is only the authorisation, which could not be expressed by
 * either of the others: the account holding a GRANTED CLAIM on this listing.
 *
 * REPLACING AN APPROVED LOGO TAKES IT DOWN UNTIL IT IS LOOKED AT AGAIN
 *
 * That is `publishApproval.ts`'s rule — the thing that was reviewed and the
 * thing being shown have to be the same thing — and it is why the stored object
 * is overwritten in place while the STATE goes back to `submitted`. Nothing
 * public renders a logo that is not approved, so the replacement is invisible
 * until a person has seen it. The business loses its badge for a day; the
 * alternative is that approval can be bypassed by anybody willing to wait.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isStaffRequest } from "./requireStaff.ts";
import { sniffImage } from "./imageSniff.ts";
import {
  businessMayMove, staffMayMove, logoObjectPath,
  refuseLogo, phraseLogoState, MAX_LOGO_BYTES,
  logoObjectUrl, publicLogoUrl, LOGO_BUCKET as BUCKET,
} from "./exchangeLogo.ts";

export const exchangeLogoRoutes = new Hono();

/** Where the addresses are rooted. Read once; it does not change. */
const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function orThrow<T>(result: { data: T; error: any }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message ?? result.error}`);
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LISTING_COLUMNS =
  "id, slug, name, claim_state, logo_path, logo_state, logo_submitted_at, logo_reject_reason";

/** Who is asking, from the token and nothing else. */
async function resident(c: any): Promise<{ id: string; email: string } | null> {
  const token = (c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const { data } = await service().auth.getUser(token);
    const user = data?.user;
    if (!user?.id) return null;
    return { id: user.id, email: String(user.email ?? "") };
  } catch {
    return null;
  }
}

/**
 * The listing this person may act for.
 *
 * Identical in shape to `listingIClaim` in `exchangeDealRoutes.tsx`, and
 * deliberately not shared with it: the two read different columns, and a
 * helper that returned a union of both would end up serving a column to a
 * surface that had no business reading it.
 */
async function listingIClaim(sb: any, userId: string, orgId: string) {
  const claim = orThrow(
    await sb.from("exchange_claim")
      .select("org_id, state")
      .eq("org_id", orgId)
      .eq("claimant_user_id", userId)
      .eq("state", "granted")
      .maybeSingle(),
    "checking your claim",
  ) as any;
  if (!claim) return null;

  return orThrow(
    await sb.from("organizations").select(LISTING_COLUMNS).eq("id", orgId).maybeSingle(),
    "finding that business",
  ) as any;
}

/**
 * What the owner is shown about their own logo — including one not yet public.
 *
 * The owner sees their own submission whatever its state. They uploaded it;
 * telling them to take our word for what it looks like would be absurd. That is
 * why this uses the ungated `logoObjectUrl` and every public surface uses
 * `publicLogoUrl` instead.
 */
function ownerView(row: any) {
  const url = logoObjectUrl(row?.logo_path, row?.logo_submitted_at, PROJECT_URL);
  return {
    state: String(row?.logo_state ?? "none"),
    says: phraseLogoState(row?.logo_state, row?.logo_reject_reason),
    reason: row?.logo_reject_reason ?? null,
    url,
    public: publicLogoUrl(row, PROJECT_URL) !== null,
    submittedAt: row?.logo_submitted_at ?? null,
    maxBytes: MAX_LOGO_BYTES,
  };
}

// ── the business, about its own listing ─────────────────────────────────────

exchangeLogoRoutes.get("/exchange/business/logo", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const orgId = String(c.req.query("org") ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    const sb = service();
    const listing = await listingIClaim(sb, me.id, orgId);
    if (!listing) {
      return c.json({ success: false, error: "That is not a listing you have claimed." }, 403);
    }
    return c.json({ success: true, business: { id: listing.id, name: listing.name }, logo: ownerView(listing) });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeLogoRoutes.post("/exchange/business/logo", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const form = await c.req.formData();
    const orgId = String(form.get("org") ?? "").trim();
    const file = form.get("file") as File | null;

    if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);
    if (!file) return c.json({ success: false, error: "No file arrived." }, 400);

    const sb = service();
    const listing = await listingIClaim(sb, me.id, orgId);
    if (!listing) {
      /*
       * The one check that makes a logo trustworthy at all. A logo is a claim
       * about who a business is, and the only person entitled to make it is
       * whoever proved control of the listed phone or email — which the claim
       * flow already decided. Anything else here, a body parameter or a role in
       * a token, would let one business brand another.
       */
      return c.json({ success: false, error: "That is not a listing you have claimed." }, 403);
    }
    // The premise, stated as a refusal: an unclaimed listing carries only what
    // the public record said.
    if (String(listing.claim_state ?? "") !== "claimed") {
      return c.json({ success: false, error: "A logo can only go on a claimed listing." }, 409);
    }
    if (!businessMayMove(listing.logo_state ?? "none", "submitted")) {
      return c.json({ success: false, error: "That logo cannot be changed just now." }, 409);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // The bytes decide what this is. The content-type header is the one part
    // of the request its sender controls completely.
    const sniffed = sniffImage(bytes);
    const refusal = refuseLogo(sniffed, bytes.length);
    if (refusal) return c.json({ success: false, error: refusal }, 400);

    const path = logoObjectPath(orgId, sniffed!.ext);
    const previous = String(listing.logo_path ?? "").trim();

    const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, bytes, {
      // The type the bytes say, never the one the browser sent.
      contentType: sniffed!.mime,
      upsert: true,
    });
    if (uploadError) {
      return c.json({ success: false, error: `We could not store that: ${uploadError.message}` }, 500);
    }

    /* A different extension means a different object, so the old one would sit
       in the bucket forever with nothing pointing at it. */
    if (previous && previous !== path) {
      try { await sb.storage.from(BUCKET).remove([previous]); } catch { /* an orphan is not worth failing an upload over */ }
    }

    const now = new Date().toISOString();
    orThrow(
      await sb.from("organizations").update({
        logo_path: path,
        logo_state: "submitted",
        logo_submitted_at: now,
        // A fresh submission is not the old decision.
        logo_decided_at: null,
        logo_decided_by: null,
        logo_reject_reason: null,
        updated_at: now,
      }).eq("id", orgId).select("id"),
      "saving your logo",
    );

    const after = orThrow(
      await sb.from("organizations").select(LISTING_COLUMNS).eq("id", orgId).maybeSingle(),
      "reading it back",
    ) as any;

    return c.json({
      success: true,
      logo: ownerView(after),
      // Said plainly, because uploading feels like publishing and is not.
      note: "We will look at it before it goes on your listing.",
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeLogoRoutes.delete("/exchange/business/logo", async (c) => {
  const me = await resident(c);
  if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

  const orgId = String(c.req.query("org") ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    const sb = service();
    const listing = await listingIClaim(sb, me.id, orgId);
    if (!listing) {
      return c.json({ success: false, error: "That is not a listing you have claimed." }, 403);
    }
    if (!businessMayMove(listing.logo_state ?? "none", "none")) {
      return c.json({ success: false, error: "There is nothing to remove." }, 409);
    }

    const path = String(listing.logo_path ?? "").trim();
    const now = new Date().toISOString();
    /* The row first. If the object delete fails we are left with a file nobody
       points at, which is tidy-up; the other order leaves a listing pointing at
       a file that has gone, which is a broken image on somebody's business. */
    orThrow(
      await sb.from("organizations").update({
        logo_path: null,
        logo_state: "none",
        logo_submitted_at: null,
        logo_decided_at: null,
        logo_decided_by: null,
        logo_reject_reason: null,
        updated_at: now,
      }).eq("id", orgId).select("id"),
      "removing your logo",
    );
    if (path) {
      try { await sb.storage.from(BUCKET).remove([path]); } catch { /* see above */ }
    }

    return c.json({ success: true, logo: ownerView({ logo_state: "none" }) });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

// ── staff, about everybody's submissions ────────────────────────────────────

exchangeLogoRoutes.get("/exchange/logo-review", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  try {
    const sb = service();
    const rows = orThrow(
      await sb.from("organizations")
        .select("id, slug, name, claim_state, logo_path, logo_state, logo_submitted_at, logo_reject_reason")
        .eq("logo_state", "submitted")
        // Oldest first: a queue that shows the newest first is a queue where
        // the oldest submission is never reached.
        .order("logo_submitted_at", { ascending: true })
        .limit(100),
      "reading the queue",
    ) as any[];

    return c.json({
      success: true,
      waiting: (rows ?? []).map((row) => ({
        orgId: row.id,
        slug: row.slug,
        name: row.name,
        claimed: String(row.claim_state ?? "") === "claimed",
        submittedAt: row.logo_submitted_at,
        // Reviewing an image means looking at it, so the queue carries the
        // address of the object itself rather than making staff go and find it.
        // Ungated on purpose: the whole job here is looking at something that
        // is not public yet.
        url: logoObjectUrl(row.logo_path, row.logo_submitted_at, PROJECT_URL),
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

exchangeLogoRoutes.post("/exchange/logo-review/:orgId/decide", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  const orgId = String(c.req.param("orgId") ?? "").trim();
  if (!UUID.test(orgId)) return c.json({ success: false, error: "Which business?" }, 400);

  try {
    const body = await c.req.json().catch(() => ({}));
    const to = String(body?.decision ?? "").trim();
    const reason = String(body?.reason ?? "").trim().slice(0, 300);

    if (to !== "approved" && to !== "rejected") {
      return c.json({ success: false, error: "Approve it or reject it." }, 400);
    }

    const sb = service();
    const listing = orThrow(
      await sb.from("organizations").select(LISTING_COLUMNS).eq("id", orgId).maybeSingle(),
      "finding that business",
    ) as any;
    if (!listing) return c.json({ success: false, error: "No such listing." }, 404);

    if (!staffMayMove(listing.logo_state ?? "none", to)) {
      return c.json({
        success: false,
        error: `A logo that is ${String(listing.logo_state ?? "none")} cannot be ${to}.`,
      }, 409);
    }
    /*
     * Approving a logo on a listing whose claim has gone would publish a brand
     * nobody standing behind the listing authorised. `logoIsPublic` would refuse
     * to serve it anyway, but a queue that lets staff tick something that then
     * does not appear is a queue that teaches staff not to trust it.
     */
    if (to === "approved" && String(listing.claim_state ?? "") !== "claimed") {
      return c.json({
        success: false,
        error: "That listing is no longer claimed, so a logo cannot be approved on it.",
      }, 409);
    }
    if (to === "rejected" && !reason) {
      // A rejection the owner cannot act on wastes everybody's time twice.
      return c.json({ success: false, error: "Say why, so they can fix it." }, 400);
    }

    const now = new Date().toISOString();
    const who = String(c.req.header("x-staff-email") || "staff");
    orThrow(
      await sb.from("organizations").update({
        logo_state: to,
        logo_decided_at: now,
        logo_decided_by: who,
        logo_reject_reason: to === "rejected" ? reason : null,
        updated_at: now,
      }).eq("id", orgId).select("id"),
      "saving that decision",
    );

    return c.json({ success: true, state: to });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});
