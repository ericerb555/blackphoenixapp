/**
 * Publishing a company's refund policy, and serving it to anybody who asks.
 *
 * WHY THE READ IS PUBLIC
 *
 * The whole value of this page is that it is the URL submitted to Stripe as the
 * refund-policy disclosure. A policy behind a login is not a disclosure: the
 * card issuer's analyst reviewing a dispute cannot sign in, and neither can the
 * customer who has already stopped being one. So `GET /refund-policy/:companyId`
 * is in `PUBLIC_PREFIXES` and returns published versions only.
 *
 * WHY WRITING IS STAFF ONLY AND PUBLISHING IS A SEPARATE ACT
 *
 * Saving a draft and publishing it are different decisions. A policy is a term
 * this business is bound by; it should take a deliberate second press, and the
 * thing being published should have been readable first. `canPublish` refuses a
 * draft that still reads like one — see `refundPolicy.ts`.
 *
 * PER COMPANY, WITH NO DEFAULT
 *
 * Each company is its own standalone Stripe account, so a dispute lands on one
 * account and the policy that answers it is that company's. An unknown company
 * gets 404 and never another company's terms.
 *
 * NOTHING HERE WRITES THE WORDS
 *
 * No seeding, no generated starter text, no model. A policy drafted by this
 * software and published unread would be a legal term nobody chose. The page
 * says plainly that nothing is published yet, which is a true statement and a
 * visible gap — better than a plausible invented one.
 */

import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { isStaffRequest } from "./requireStaff.ts";
import {
  canPublish, publishedVersions, currentPolicy, nextVersion,
  type CompanyPolicy, type PolicyVersion, type PolicySection,
} from "./refundPolicy.ts";

export const refundPolicyRoutes = new Hono();

const PREFIX = "/make-server-3eae23a6";
const KEY = (companyId: string) => `refund_policy:${companyId}`;

/** A company id is a path segment and a storage key; keep it boring. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

const readPolicy = async (companyId: string): Promise<CompanyPolicy | null> => {
  try {
    const row = (await kv.get(KEY(companyId))) as CompanyPolicy | null;
    return row && typeof row === "object" ? row : null;
  } catch {
    return null;
  }
};

/** Trimmed, length-capped sections. The cap is storage hygiene, not an opinion. */
const readSections = (raw: unknown): PolicySection[] =>
  (Array.isArray(raw) ? raw : [])
    .map((s: any) => ({
      heading: String(s?.heading ?? "").trim().slice(0, 200),
      body: String(s?.body ?? "").trim().slice(0, 20_000),
    }))
    .filter((s) => s.heading || s.body)
    .slice(0, 40);

// ── public: what a customer, or a bank, can read ────────────────────────────

refundPolicyRoutes.get(`${PREFIX}/refund-policy/:companyId`, async (c) => {
  const companyId = String(c.req.param("companyId") || "").toLowerCase();
  if (!SLUG.test(companyId)) {
    return c.json({ success: false, error: "No policy at that address." }, 404);
  }

  const policy = await readPolicy(companyId);
  const current = currentPolicy(policy);

  /**
   * A company with nothing published answers 200 with `policy: null`, not 404.
   *
   * The distinction matters to the page: "this company has not published a
   * refund policy" is a different thing to say than "that address is wrong",
   * and only the first should be said out loud on a page somebody reached from
   * a receipt.
   */
  return c.json({
    success: true,
    companyId,
    companyName: policy?.companyName || null,
    policy: current
      ? {
        version: current.version,
        effectiveFrom: current.effectiveFrom,
        sections: current.sections,
        contactEmail: current.contactEmail || null,
      }
      : null,
    // So a reader can see this is not the only version there has ever been.
    publishedVersionCount: publishedVersions(policy).length,
  });
});

// ── staff: drafts, history, and the two separate acts ───────────────────────

refundPolicyRoutes.get(`${PREFIX}/company/:companyId/refund-policy`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  const companyId = String(c.req.param("companyId") || "").toLowerCase();
  if (!SLUG.test(companyId)) {
    return c.json({ success: false, error: "That is not a company id." }, 400);
  }
  const policy = await readPolicy(companyId);
  const versions = Array.isArray(policy?.versions) ? policy!.versions : [];
  const live = currentPolicy(policy);
  return c.json({
    success: true,
    companyId,
    companyName: policy?.companyName || null,
    liveVersion: live?.version ?? null,
    versions,
    // Said here so a screen can show it without re-deriving the rule.
    hasPublishedPolicy: Boolean(live),
  });
});

/**
 * Save a draft. Never publishes.
 *
 * Append-only: a new draft is a new version number, so an older published
 * version is never edited out from under an order that froze a copy of it.
 */
refundPolicyRoutes.put(`${PREFIX}/company/:companyId/refund-policy`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  const companyId = String(c.req.param("companyId") || "").toLowerCase();
  if (!SLUG.test(companyId)) {
    return c.json({ success: false, error: "That is not a company id." }, 400);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const sections = readSections(body?.sections);
    if (sections.length === 0) {
      return c.json({ success: false, error: "A draft needs at least one section." }, 400);
    }

    const existing = await readPolicy(companyId);
    const versions = Array.isArray(existing?.versions) ? [...existing!.versions] : [];
    const actor = String(c.req.header("X-Actor-Email") || "") || null;
    const now = new Date().toISOString();

    const effectiveFrom = String(body?.effectiveFrom || "").trim() || now;
    const target = Number(body?.version) || 0;

    // An existing DRAFT can be edited in place. A published version cannot —
    // that is the append-only rule, and it is what makes a snapshot evidence.
    const at = versions.findIndex((v) => Number(v?.version) === target && !v?.publishedAt);
    const draft: PolicyVersion = {
      version: at >= 0 ? versions[at].version : nextVersion(existing),
      effectiveFrom,
      publishedAt: null,
      sections,
      contactEmail: String(body?.contactEmail || "").trim().slice(0, 200) || undefined,
      updatedAt: now,
      updatedBy: actor,
    };
    if (at >= 0) versions[at] = draft; else versions.push(draft);

    const saved: CompanyPolicy = {
      companyId,
      companyName: String(body?.companyName || existing?.companyName || "").trim() || undefined,
      versions,
    };
    await kv.set(KEY(companyId), saved);

    // Reported so the screen can show whether the button should be enabled,
    // and why not, without duplicating the rule.
    const verdict = canPublish(draft);
    return c.json({
      success: true,
      version: draft.version,
      publishable: verdict.ok,
      whyNot: verdict.ok ? null : verdict.why,
    });
  } catch (error: any) {
    return c.json({ success: false, error: String(error?.message || error) }, 500);
  }
});

/** Publish one version. Refuses a draft that still reads like a draft. */
refundPolicyRoutes.post(`${PREFIX}/company/:companyId/refund-policy/:version/publish`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  const companyId = String(c.req.param("companyId") || "").toLowerCase();
  const wanted = Number(c.req.param("version"));
  if (!SLUG.test(companyId) || !Number.isFinite(wanted)) {
    return c.json({ success: false, error: "That is not a company and version." }, 400);
  }

  try {
    const existing = await readPolicy(companyId);
    const versions = Array.isArray(existing?.versions) ? [...existing!.versions] : [];
    const at = versions.findIndex((v) => Number(v?.version) === wanted);
    if (at < 0) return c.json({ success: false, error: "No such version." }, 404);
    if (versions[at].publishedAt) {
      return c.json({ success: true, alreadyPublished: true, version: wanted });
    }

    const verdict = canPublish(versions[at]);
    if (!verdict.ok) {
      // A distinct code so a screen can show the reason rather than an error.
      return c.json({
        success: false,
        code: "POLICY_NOT_READY",
        error: verdict.why,
      }, 409);
    }

    const now = new Date().toISOString();
    versions[at] = {
      ...versions[at],
      publishedAt: now,
      publishedBy: String(c.req.header("X-Actor-Email") || "") || null,
    };
    await kv.set(KEY(companyId), { ...(existing as CompanyPolicy), companyId, versions });
    console.log(`[refund-policy] ${companyId} v${wanted} published`);
    return c.json({ success: true, version: wanted, publishedAt: now });
  } catch (error: any) {
    return c.json({ success: false, error: String(error?.message || error) }, 500);
  }
});

export default refundPolicyRoutes;
