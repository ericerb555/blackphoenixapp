/**
 * Phoenix Exchange — the claim, as routes.
 *
 * `exchangeClaim.ts` holds every rule and is pure. This file is the part that
 * touches the world: it reads the listing, issues codes, sends them, records
 * what was answered, and writes the decision. The split is deliberate — the
 * security argument is testable in one file, and this one only has to be a
 * faithful caller of it.
 *
 * WHAT IS REFUSED, AND HOW IT IS REFUSED
 *
 * Every route needs a signed-in account, because a claim has to attach to
 * somebody we can hold responsible. A claim that does not belong to the caller
 * answers **404, not 403** — a 403 would confirm that the claim exists, and
 * whether a business is mid-claim is not a fact a stranger should be able to
 * probe.
 *
 * Nothing about a challenge is ever returned: not the code, not the hash, not
 * the destination. The claimant is told which factors are outstanding and a
 * masked target, and that is all. The registry contact is not always the
 * public one, so this screen must never become a way to read a phone number
 * that is not already on the listing page.
 *
 * ATTEMPTS ARE SPENT BEFORE THE COMPARISON
 *
 * The counter is incremented before the code is checked, not after. The other
 * order means a crash, a timeout or a disconnect between the two is a free
 * guess, and free guesses are the whole of brute force.
 *
 * THE DOMAIN COMES FROM THE RECORD, NEVER FROM THE REQUEST
 *
 * `domain_email` and `dns_token` prove control of the business's own domain,
 * which is only meaningful if the domain is the one WE hold for that listing.
 * It is read from `organizations.website` every time. A claimant who could
 * name the domain would simply name their own.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { mintShareToken, hashToken } from "./shareToken.ts";
import { trialEndFor, TRIAL_MONTHS } from "./exchangeTrials.ts";
import { safeFetch } from "./outboundGuard.ts";
import {
  FACTORS,
  enabledFactor,
  factorCategory,
  challengeUsable,
  challengeExpiry,
  withinIssueCap,
  assessClaim,
  disputeDeadline,
  sixDigitCode,
  maskPhone,
  maskEmail,
  websiteDomain,
  emailMatchesDomain,
  MAX_ATTEMPTS,
  DISPUTE_DAYS,
} from "./exchangeClaim.ts";

export const exchangeClaimRoutes = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** The columns a claim needs. The licence number is read, never returned. */
const CLAIM_LISTING_COLUMNS = [
  "id", "slug", "name", "status",
  "email", "phone", "website",
  "claim_state", "listing_source", "license_number", "license_state",
].join(", ");

/**
 * Who is asking. Null means nobody, and nobody may claim anything.
 *
 * Unlike the public directory, where an anonymous reader is the normal case,
 * here an unidentifiable caller gets nothing at all.
 */
async function claimant(c: any): Promise<{ id: string; email: string } | null> {
  const token = (c.req.header("Authorization") || "").replace("Bearer ", "");
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
 * Constant-time comparison of two hex digests.
 *
 * `===` on a hash leaks, in principle, how many leading characters matched.
 * The practical risk against a ten-minute six-digit code over the open
 * internet is small; the cost of doing it properly is four lines.
 */
function sameDigest(a: string, b: string): boolean {
  const left = String(a ?? "");
  const right = String(b ?? "");
  if (left.length !== right.length || left.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

const COMPANY = "Phoenix Exchange";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@theblackphoenixcompany.com";

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { sent: false, reason: "email is not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${COMPANY} <${FROM_EMAIL}>`, to: [to], subject, html }),
    });
    if (!res.ok) return { sent: false, reason: `the mail provider refused it (${res.status})` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "the mail provider could not be reached" };
  }
}

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from || !to) return { sent: false, reason: "texting is not configured" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) return { sent: false, reason: `the text provider refused it (${res.status})` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "the text provider could not be reached" };
  }
}

/** The claim and its challenges, or null when it is not this caller's. */
async function loadClaim(sb: any, claimId: string, userId: string) {
  const { data: claim } = await sb
    .from("exchange_claim")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();

  // Not found and not yours are the same answer on purpose.
  if (!claim || claim.claimant_user_id !== userId) return null;

  const { data: challenges } = await sb
    .from("exchange_claim_challenge")
    .select("factor, category, issued_at, expires_at, attempts, max_attempts, satisfied_at, burned_at")
    .eq("claim_id", claimId);

  const { data: listing } = await sb
    .from("organizations")
    .select(CLAIM_LISTING_COLUMNS)
    .eq("id", claim.org_id)
    .maybeSingle();

  return { claim, challenges: challenges ?? [], listing };
}

/**
 * What the claimant is allowed to see about their own claim.
 *
 * Built from the assessment rather than from the rows, so there is no path by
 * which a challenge field reaches the browser.
 */
function claimView(claim: any, assessment: any, listing: any) {
  const domain = websiteDomain(listing?.website);

  return {
    id: claim.id,
    state: claim.state,
    business: { slug: listing?.slug ?? null, name: listing?.name ?? null },
    proven: assessment.proven,
    outstanding: assessment.outstanding,
    reason: assessment.reason,
    isDispute: Boolean(claim.is_dispute),
    disputeDecidesAfter: claim.dispute_decides_after ?? null,
    // What they could try next, with a masked destination so they can tell
    // whether it is a contact they still hold.
    options: FACTORS.filter((f) => f.enabled).map((f) => ({
      factor: f.factor,
      category: f.category,
      label: f.label,
      manual: f.manual,
      available:
        f.factor === "phone_code" ? Boolean(listing?.phone)
        : f.factor === "email_code" ? Boolean(listing?.email)
        : f.factor === "domain_email" ? Boolean(domain)
        : f.factor === "dns_token" ? Boolean(domain)
        : true,
      target:
        f.factor === "phone_code" ? maskPhone(listing?.phone)
        : f.factor === "email_code" ? maskEmail(listing?.email)
        : (f.factor === "domain_email" || f.factor === "dns_token") ? domain
        : null,
    })),
  };
}

/** The listing's current assessment, from what has been proven so far. */
function assess(claim: any, challenges: any[], listing: any) {
  return assessClaim({
    challenges,
    listing: {
      phone: listing?.phone,
      email: listing?.email,
      website: listing?.website,
      licenseNumber: listing?.license_number,
    },
    // A dispute is already recorded as one; re-reading the listing's state
    // would make a claim become a dispute halfway through if somebody else
    // succeeded in the meantime, which is handled at grant time instead.
    alreadyClaimed: Boolean(claim?.is_dispute),
  });
}

// ── starting a claim ─────────────────────────────────────────────────────────

/**
 * "This is my business."
 *
 * Idempotent: asking twice returns the claim already in progress rather than
 * starting a second one with its own fresh allowance of codes.
 */
exchangeClaimRoutes.post("/exchange/claim/start", async (c) => {
  try {
    const who = await claimant(c);
    if (!who) return c.json({ success: false, error: "Sign in to claim a listing." }, 401);

    const sb = service();
    const body = await c.req.json().catch(() => ({}));
    const slug = String(body?.slug ?? "").trim().slice(0, 200);
    if (!slug) return c.json({ success: false, error: "Which listing?" }, 400);

    const { data: listing } = await sb
      .from("organizations")
      .select(CLAIM_LISTING_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    if (!listing || listing.status !== "active") {
      return c.json({ success: false, error: "No such listing." }, 404);
    }

    const existing = await sb
      .from("exchange_claim")
      .select("*")
      .eq("org_id", listing.id)
      .eq("claimant_user_id", who.id)
      .in("state", ["open", "needs_review", "disputed"])
      .maybeSingle();

    if (existing.data) {
      const loaded = await loadClaim(sb, existing.data.id, who.id);
      const assessment = assess(loaded!.claim, loaded!.challenges, loaded!.listing);
      return c.json({ success: true, claim: claimView(loaded!.claim, assessment, loaded!.listing) });
    }

    const alreadyClaimed = String(listing.claim_state ?? "") === "claimed";
    const now = new Date().toISOString();

    const { data: created, error } = await sb
      .from("exchange_claim")
      .insert({
        org_id: listing.id,
        claimant_user_id: who.id,
        // A claim on a listing somebody already holds never takes over on its
        // own. The incumbent is told and a person rules — the legitimate
        // version of this, a business sold last month, and the attack look
        // identical from here.
        state: alreadyClaimed ? "disputed" : "open",
        is_dispute: alreadyClaimed,
        dispute_decides_after: alreadyClaimed ? disputeDeadline(now) : null,
        meta: { claimantEmail: who.email },
      })
      .select("*")
      .single();

    if (error || !created) {
      return c.json({ success: false, error: "Unable to start that claim." }, 500);
    }

    if (alreadyClaimed) {
      // Never silent. The incumbent hears about it before anything is decided.
      await notifyIncumbent(listing, who.email);
    }

    const assessment = assess(created, [], listing);
    return c.json({ success: true, claim: claimView(created, assessment, listing) });
  } catch (error: any) {
    console.error("[exchange] claim start failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to start that claim." }, 500);
  }
});

/** Where the claim stands. */
exchangeClaimRoutes.get("/exchange/claim/:id", async (c) => {
  try {
    const who = await claimant(c);
    if (!who) return c.json({ success: false, error: "Sign in to see a claim." }, 401);

    const sb = service();
    const loaded = await loadClaim(sb, c.req.param("id"), who.id);
    if (!loaded) return c.json({ success: false, error: "No such claim." }, 404);

    const assessment = assess(loaded.claim, loaded.challenges, loaded.listing);
    return c.json({ success: true, claim: claimView(loaded.claim, assessment, loaded.listing) });
  } catch (error: any) {
    console.error("[exchange] claim read failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to read that claim." }, 500);
  }
});

// ── asking for a factor ──────────────────────────────────────────────────────

/**
 * Issue one challenge.
 *
 * The destination is decided HERE, from the listing, and never taken from the
 * request — except for `domain_email`, where the claimant names an address and
 * the server checks it sits at the domain we hold for that listing.
 */
exchangeClaimRoutes.post("/exchange/claim/:id/factor", async (c) => {
  try {
    const who = await claimant(c);
    if (!who) return c.json({ success: false, error: "Sign in first." }, 401);

    const sb = service();
    const loaded = await loadClaim(sb, c.req.param("id"), who.id);
    if (!loaded) return c.json({ success: false, error: "No such claim." }, 404);
    if (loaded.claim.state !== "open") {
      return c.json({ success: false, error: "This claim is not open." }, 409);
    }

    const body = await c.req.json().catch(() => ({}));
    const definition = enabledFactor(body?.factor);
    if (!definition) return c.json({ success: false, error: "Unknown verification method." }, 400);

    const { listing } = loaded;
    const now = new Date().toISOString();

    // The issue cap is per LISTING across every claimant, because the abuse is
    // not somebody failing to type their own code — it is using our server to
    // text a stranger thirty times.
    const { data: recent } = await sb
      .from("exchange_claim_challenge")
      .select("issued_at")
      .eq("org_id", listing.id)
      .order("issued_at", { ascending: false })
      .limit(50);

    if (!withinIssueCap((recent ?? []).map((r: any) => r.issued_at), now)) {
      return c.json({
        success: false,
        error: "Too many verification attempts for this listing today. Try again tomorrow.",
      }, 429);
    }

    // What this factor sends, and where.
    let destination = "";
    let masked = "";
    let secret = "";
    let instruction: string | null = null;

    if (definition.factor === "phone_code") {
      destination = String(listing.phone ?? "").trim();
      if (!destination) return c.json({ success: false, error: "This listing has no phone number on record." }, 400);
      masked = maskPhone(destination);
      secret = sixDigitCode();
      const sent = await sendSms(destination, `${COMPANY}: your verification code is ${secret}. It expires in 10 minutes.`);
      if (!sent.sent) return c.json({ success: false, error: `We could not send the code — ${sent.reason}.` }, 502);

    } else if (definition.factor === "email_code") {
      destination = String(listing.email ?? "").trim();
      if (!destination) return c.json({ success: false, error: "This listing has no email address on record." }, 400);
      masked = maskEmail(destination);
      secret = sixDigitCode();
      const sent = await sendEmail(
        destination,
        `Verification code for ${listing.name}`,
        `<p>Somebody is claiming the ${COMPANY} listing for <strong>${escapeHtml(listing.name)}</strong>.</p>`
        + `<p>If that is you, your code is <strong>${secret}</strong>. It expires in 10 minutes.</p>`
        + `<p>If it is not you, ignore this email and tell us — nothing changes without this code.</p>`,
      );
      if (!sent.sent) return c.json({ success: false, error: `We could not send the code — ${sent.reason}.` }, 502);

    } else if (definition.factor === "domain_email") {
      // The one case where the claimant names the destination — and it is
      // checked against the domain on the LISTING, which they do not control.
      const asked = String(body?.email ?? "").trim().slice(0, 320);
      if (!emailMatchesDomain(asked, listing.website)) {
        return c.json({
          success: false,
          error: "Use an address at the business's own domain.",
        }, 400);
      }
      destination = asked;
      masked = maskEmail(asked);
      secret = sixDigitCode();
      const sent = await sendEmail(
        destination,
        `Verification code for ${listing.name}`,
        `<p>Your ${COMPANY} verification code is <strong>${secret}</strong>. It expires in 10 minutes.</p>`,
      );
      if (!sent.sent) return c.json({ success: false, error: `We could not send the code — ${sent.reason}.` }, 502);

    } else if (definition.factor === "dns_token") {
      const domain = websiteDomain(listing.website);
      if (!domain) return c.json({ success: false, error: "This listing has no website on record." }, 400);
      const minted = await mintShareToken();
      destination = domain;
      masked = domain;
      secret = minted.token;
      instruction = `Add a TXT record on ${domain} with the value: phoenix-exchange-verification=${minted.token}`;

    } else {
      /**
       * The manual factors carry no secret: a person reads what was sent and
       * decides. Recorded so the review queue knows it is waiting on us, and
       * the claimant is told plainly that a human is now involved rather than
       * being left watching a screen that will never change on its own.
       *
       * There is no document upload here yet, so the reviewer makes contact.
       * Saying so is better than offering an upload box that does nothing.
       */
      destination = "";
      masked = "";
      secret = "";
      instruction = "A reviewer will be in touch to ask for what they need.";
    }

    const { error } = await sb.from("exchange_claim_challenge").insert({
      claim_id: loaded.claim.id,
      org_id: listing.id,
      factor: definition.factor,
      category: definition.category,
      target_masked: masked || null,
      // Hashed, so a dispute can later establish which destination received
      // the code even if the listing has been edited since — without this
      // table holding a second copy of somebody's contact details.
      target_hash: destination ? await hashToken(destination) : null,
      secret_hash: secret ? await hashToken(secret) : null,
      expires_at: secret ? challengeExpiry(now) : null,
      max_attempts: MAX_ATTEMPTS,
    });

    if (error) return c.json({ success: false, error: "Unable to start that check." }, 500);

    if (definition.manual) {
      await sb.from("exchange_claim")
        .update({ state: "needs_review", updated_at: now })
        .eq("id", loaded.claim.id)
        .eq("state", "open");
    }

    return c.json({
      success: true,
      factor: definition.factor,
      sentTo: masked || null,
      instruction,
      expiresInMinutes: secret ? 10 : null,
      manual: definition.manual,
    });
  } catch (error: any) {
    console.error("[exchange] claim factor failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to start that check." }, 500);
  }
});

// ── answering a factor ───────────────────────────────────────────────────────

exchangeClaimRoutes.post("/exchange/claim/:id/answer", async (c) => {
  try {
    const who = await claimant(c);
    if (!who) return c.json({ success: false, error: "Sign in first." }, 401);

    const sb = service();
    const loaded = await loadClaim(sb, c.req.param("id"), who.id);
    if (!loaded) return c.json({ success: false, error: "No such claim." }, 404);
    if (loaded.claim.state !== "open") {
      return c.json({ success: false, error: "This claim is not open." }, 409);
    }

    const body = await c.req.json().catch(() => ({}));
    const definition = enabledFactor(body?.factor);
    if (!definition) return c.json({ success: false, error: "Unknown verification method." }, 400);
    if (definition.manual) {
      return c.json({ success: false, error: "That check is decided by a person." }, 400);
    }

    const { data: challenge } = await sb
      .from("exchange_claim_challenge")
      .select("*")
      .eq("claim_id", loaded.claim.id)
      .eq("factor", definition.factor)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const usable = challengeUsable(challenge, now);
    if (!usable.usable) {
      return c.json({
        success: false,
        error: usable.reason === "expired"
          ? "That code has expired. Ask for a new one."
          : usable.reason === "attempts_exhausted"
            ? "Too many wrong attempts. Ask for a new code."
            : "That check is no longer open.",
      }, 409);
    }

    // SPENT BEFORE CHECKED. The other order makes a crash between the two a
    // free guess, and free guesses are the whole of brute force.
    const attempts = Number(challenge.attempts ?? 0) + 1;
    await sb.from("exchange_claim_challenge")
      .update({
        attempts,
        burned_at: attempts >= Number(challenge.max_attempts ?? MAX_ATTEMPTS) ? now : null,
      })
      .eq("id", challenge.id);

    let matched = false;

    if (definition.factor === "dns_token") {
      // The domain comes from the record, so a claimant cannot point this at a
      // domain they already control.
      const domain = websiteDomain(loaded.listing?.website);
      matched = domain ? await dnsTokenPresent(domain, String(challenge.secret_hash ?? "")) : false;
    } else {
      const answer = String(body?.code ?? "").replace(/\s/g, "");
      matched = answer.length > 0
        && sameDigest(await hashToken(answer), String(challenge.secret_hash ?? ""));
    }

    if (!matched) {
      const left = Math.max(Number(challenge.max_attempts ?? MAX_ATTEMPTS) - attempts, 0);
      return c.json({
        success: false,
        error: left > 0 ? "That code is not right." : "That code is not right, and the check is now closed.",
        attemptsLeft: left,
      }, 400);
    }

    await sb.from("exchange_claim_challenge")
      .update({ satisfied_at: now })
      .eq("id", challenge.id);

    // Reassess from the database rather than from what we think we just wrote.
    const after = await loadClaim(sb, loaded.claim.id, who.id);
    const assessment = assess(after!.claim, after!.challenges, after!.listing);

    if (assessment.decision === "granted") {
      await grantClaim(sb, after!.claim, after!.listing, who, assessment.reason);
    } else if (assessment.decision === "needs_review") {
      await sb.from("exchange_claim")
        .update({ state: "needs_review", outcome_reason: assessment.reason, updated_at: now })
        .eq("id", after!.claim.id)
        .eq("state", "open");
    }

    const fresh = await loadClaim(sb, loaded.claim.id, who.id);
    return c.json({
      success: true,
      claim: claimView(fresh!.claim, assess(fresh!.claim, fresh!.challenges, fresh!.listing), fresh!.listing),
    });
  } catch (error: any) {
    console.error("[exchange] claim answer failed:", error?.message || error);
    return c.json({ success: false, error: "Unable to check that." }, 500);
  }
});

// ── the things that happen around a decision ─────────────────────────────────

/**
 * Is the token published on the domain?
 *
 * Over DNS-over-HTTPS to a fixed resolver, because the edge runtime does not
 * reliably permit a raw DNS lookup. The resolver is ours to choose and the
 * domain is read from our own record, so this is not a URL a stranger picked —
 * it still goes through `safeFetch`, which re-validates every redirect hop.
 *
 * Compares the HASH of the published value, so the token itself never has to
 * be stored.
 */
async function dnsTokenPresent(domain: string, secretHash: string): Promise<boolean> {
  if (!secretHash) return false;
  try {
    const result = await safeFetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT`,
      { headers: { accept: "application/dns-json" } },
    );
    if (!result?.ok || !result.body) return false;

    const payload = JSON.parse(result.body);
    const answers: any[] = Array.isArray(payload?.Answer) ? payload.Answer : [];

    for (const answer of answers) {
      const raw = String(answer?.data ?? "").replace(/^"|"$/g, "");
      const value = raw.startsWith("phoenix-exchange-verification=")
        ? raw.slice("phoenix-exchange-verification=".length)
        : "";
      if (!value) continue;
      if (sameDigest(await hashToken(value), secretHash)) return true;
    }
    return false;
  } catch {
    // A resolver that cannot be reached is not a pass.
    return false;
  }
}

/**
 * The listing becomes theirs, and the trial starts, in one action.
 *
 * Writing the claim state without the trial would produce a claimed listing
 * that belongs to no cohort and is counted nowhere, which is exactly the gap
 * `exchangeTrials.ts` exists to close.
 *
 * The unique index on `exchange_claim (org_id) where state = 'granted'` is
 * what makes this safe against two requests arriving together: the second
 * insert fails rather than quietly overwriting the first.
 */
async function grantClaim(sb: any, claim: any, listing: any, who: { id: string; email: string }, reason: string) {
  const now = new Date().toISOString();

  /**
   * THE LISTING ROW IS THE ARBITER, AND IT IS TAKEN FIRST.
   *
   * `claim_state = 'listed'` in the WHERE clause is the lock: whichever
   * request gets there first flips it and the other one comes back with no
   * rows. Writing the claim first and the listing second would let two
   * claimants both believe they had been granted the same business.
   */
  const { data: taken } = await sb.from("organizations")
    .update({ claim_state: "claimed", updated_at: now })
    .eq("id", listing.id)
    .eq("claim_state", "listed")
    .select("id");

  if (!taken || taken.length === 0) {
    // Somebody claimed it between the last read and now. This is not a
    // failure to report as an error — it is a dispute, and it is handled the
    // same way every other dispute is.
    await sb.from("exchange_claim")
      .update({
        state: "disputed",
        is_dispute: true,
        dispute_decides_after: disputeDeadline(now),
        outcome_reason: "This listing was claimed by somebody else first.",
        updated_at: now,
      })
      .eq("id", claim.id)
      .eq("state", "open");
    await notifyIncumbent(listing, who.email);
    return;
  }

  const { error } = await sb.from("exchange_claim")
    .update({ state: "granted", outcome_reason: reason, decided_at: now, updated_at: now })
    .eq("id", claim.id)
    .eq("state", "open");

  if (error) console.error("[exchange] claim row not marked granted:", error.message);

  /**
   * The trial, in the shape `exchangeTrials.ts` already defines.
   *
   * Deliberately NOT a `feature_grant`. Those feed entitlement resolution
   * across the whole platform, and what a claimed Exchange listing may reach
   * is a decision about portal access that must not ride in on the back of a
   * verification. The business portal step is where that is decided.
   */
  await kv.set(`exchange_trial:${listing.id}`, {
    orgId: listing.id,
    email: who.email,
    status: "active",
    trialStart: now,
    trialEnd: trialEndFor(now) ?? now,
    trialMonths: TRIAL_MONTHS,
    checkpointsSent: [],
    source: "claim",
    createdAt: now,
  });

  /**
   * THE BACKSTOP. The public-record contact is told whether or not it was one
   * of the factors used. If a claim is ever wrongly granted, this is how the
   * real owner finds out — which is what makes the mistake recoverable rather
   * than permanent.
   */
  const contact = String(listing.email ?? "").trim();
  if (contact) {
    await sendEmail(
      contact,
      `Your ${COMPANY} listing has been claimed`,
      `<p>The ${COMPANY} listing for <strong>${escapeHtml(listing.name)}</strong> has just been claimed`
      + ` by ${escapeHtml(who.email || "a verified account")}.</p>`
      + `<p>If that was you, there is nothing to do.</p>`
      + `<p><strong>If it was not you, reply to this message immediately.</strong>`
      + ` We will suspend the claim while we look into it.</p>`,
    );
  }
}

/** A dispute is never silent: the incumbent hears first. */
async function notifyIncumbent(listing: any, claimantEmail: string) {
  const contact = String(listing.email ?? "").trim();
  if (!contact) return;
  await sendEmail(
    contact,
    `Somebody is claiming your ${COMPANY} listing`,
    `<p>${escapeHtml(claimantEmail || "Somebody")} has asked to take over the listing for`
    + ` <strong>${escapeHtml(listing.name)}</strong>.</p>`
    + `<p><strong>Nothing has changed.</strong> You keep the listing while this is looked at.</p>`
    + `<p>You have ${DISPUTE_DAYS} days to tell us this is wrong. Reply to this message.</p>`,
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
