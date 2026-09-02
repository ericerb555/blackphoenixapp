/**
 * Sending a framing submittal to an architect, without giving them an account.
 *
 * An outside firm reviews one document once. Making them register, be invited,
 * and belong to an organisation to do it is friction they will route around by
 * asking us to email a PDF — at which point the approval lives in somebody's
 * inbox and the system does not know it happened. So: a link.
 *
 * A link is the weakest thing in this codebase by construction — anyone holding
 * it is the reviewer — so it is built more carefully than the share links that
 * already exist here.
 *
 * WHAT MAKES IT SAFE ENOUGH
 *
 *   256 bits from crypto.getRandomValues. Not randomUUID, which is 122.
 *   Stored as a SHA-256 hash and never in plaintext, so a dump of the store
 *     yields nothing usable. We can verify a token and cannot reproduce one.
 *   Expires, server-side, and can be revoked.
 *   Serves a SNAPSHOT taken at issue, not the live project. Submitting for
 *     approval means submitting a specific revision — and it means a project
 *     that later gains something sensitive cannot leak through a link issued
 *     today.
 *   Read-only, plus exactly one response. The reviewer cannot edit anything.
 *   Carries no money. The snapshot is built by `architectView` on the client
 *     and re-filtered here, because two independent filters are what stops one
 *     careless spread from mattering.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Distinguish "no such link" from "expired" from "revoked" in its reply. All
 * three are 404 with the same wording. The holder of a real token learns
 * nothing they did not already know, and somebody guessing learns nothing at
 * all.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { trustedRole } from "./trustedRole.ts";

const app = new Hono();

const STAFF = new Set([
  "owner", "platform_owner", "business_owner", "admin", "master_admin",
  "super_admin", "superadmin", "management", "staff", "employee",
  "project_manager", "estimator", "office",
]);

const DEFAULT_TTL_DAYS = 30;
const MAX_TTL_DAYS = 120;

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function requireStaff(c: any, next: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return c.json({ error: "Sign in required." }, 401);
  const { data, error } = await service().auth.getUser(token);
  if (error || !data?.user) return c.json({ error: "Sign in required." }, 401);
  const owners = [
    "ericerb555@proton.me",
    ...(Deno.env.get("PLATFORM_OWNER_EMAILS") || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
  ];
  const isStaff = owners.includes(String(data.user.email || "").toLowerCase())
    || STAFF.has(trustedRole(data.user));
  if (!isStaff) return c.json({ error: "Internal access is required." }, 403);
  c.set("actor", data.user);
  await next();
}

/* ── tokens ───────────────────────────────────────────────────────────── */

function mintToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url, so it survives being pasted into a mail client and back out.
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const linkKey = (hash: string) => `architect_link:${hash}`;
const indexKey = (projectId: string) => `architect_links_for:${projectId}`;

/**
 * Everything a reviewer may see, rebuilt field by field.
 *
 * The client already filters through `architectView`. This does it again on
 * arrival rather than trusting that, because the whole value of the filter is
 * that it holds when somebody edits the other one without thinking about this.
 */
function sanitiseView(raw: any) {
  const members = Array.isArray(raw?.members) ? raw.members.slice(0, 400) : [];
  const questions = Array.isArray(raw?.questions) ? raw.questions.slice(0, 100) : [];
  const num = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const str = (v: any, max = 400) => (typeof v === "string" ? v.slice(0, max) : undefined);

  return {
    title: str(raw?.title, 200) || "Framing submittal",
    revision: num(raw?.revision) ?? 1,
    siteAddress: str(raw?.siteAddress, 300),
    state: ["draft", "sent", "approved", "changes-requested", "superseded"]
      .includes(raw?.state) ? raw.state : "sent",
    members: members.map((m: any) => ({
      id: str(m?.id, 60) || "",
      role: str(m?.role, 40) || "other",
      location: str(m?.location, 200) || "",
      size: str(m?.size, 80) || "",
      count: num(m?.count),
      spacingIn: num(m?.spacingIn),
      spanFt: num(m?.spanFt),
      loadPlf: num(m?.loadPlf),
      utilisation: num(m?.utilisation),
      deflectionRatio: num(m?.deflectionRatio),
      note: str(m?.note),
    })),
    assumptions: {
      groundSnowPsf: num(raw?.assumptions?.groundSnowPsf),
      liveLoadPsf: num(raw?.assumptions?.liveLoadPsf),
      deadLoadPsf: num(raw?.assumptions?.deadLoadPsf),
      species: str(raw?.assumptions?.species, 100),
      deflectionLimit: num(raw?.assumptions?.deflectionLimit),
      soilBearingPsf: num(raw?.assumptions?.soilBearingPsf),
      frostDepthIn: num(raw?.assumptions?.frostDepthIn),
      codeEdition: str(raw?.assumptions?.codeEdition, 120),
    },
    questions: questions.map((q: any) => ({
      id: str(q?.id, 60) || "",
      question: str(q?.question, 600) || "",
      assumedAnswer: str(q?.assumedAnswer, 600),
      ifWrong: str(q?.ifWrong, 600),
    })),
    standingDetails: (Array.isArray(raw?.standingDetails) ? raw.standingDetails : [])
      .slice(0, 30).map((d: any) => String(d).slice(0, 600)),
    calcWarnings: (Array.isArray(raw?.calcWarnings) ? raw.calcWarnings : [])
      .slice(0, 60).map((w: any) => String(w).slice(0, 400)),
    preparedBy: str(raw?.preparedBy, 120),
    preparedOn: str(raw?.preparedOn, 40),
  };
}

/* ── issue ────────────────────────────────────────────────────────────── */

app.post("/links", requireStaff, async (c) => {
  try {
    const actor = c.get("actor");
    const body = await c.req.json().catch(() => ({}));
    const projectId = String(body?.designProjectId || "").slice(0, 200);
    const submittalId = String(body?.submittalId || "").slice(0, 200);
    const view = body?.view;

    if (!projectId || !view || typeof view !== "object") {
      return c.json({ error: "A project and a submittal are required." }, 400);
    }

    const days = Math.min(
      MAX_TTL_DAYS,
      Math.max(1, Number(body?.expiresInDays) || DEFAULT_TTL_DAYS),
    );

    const token = mintToken();
    const hash = await hashToken(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 86_400_000).toISOString();

    const record = {
      id: `alink_${crypto.randomUUID()}`,
      designProjectId: projectId,
      submittalId,
      // The snapshot. What the reviewer sees never changes under them, and a
      // later edit to the project cannot reach through this link.
      view: sanitiseView(view),
      recipientEmail: String(body?.recipientEmail || "").slice(0, 200) || null,
      issuedBy: actor?.email || null,
      issuedAt: now.toISOString(),
      expiresAt,
      revokedAt: null as string | null,
      openedAt: null as string | null,
      response: null as any,
    };

    await kv.set(linkKey(hash), record);

    // An index so the office can list and revoke without holding the token —
    // which they cannot do, because we never stored it.
    const existing = (await kv.get(indexKey(projectId))) as any[] | null;
    await kv.set(indexKey(projectId), [
      ...(Array.isArray(existing) ? existing : []),
      { id: record.id, hash, issuedAt: record.issuedAt, expiresAt, submittalId },
    ]);

    const base = Deno.env.get("APP_PUBLIC_URL") || "https://www.theblackphoenixcompany.com";
    return c.json({
      success: true,
      // Returned exactly once. There is no way to recover it afterwards, which
      // is the point of storing only the hash.
      token,
      link: `${base}/architect-review/${token}`,
      expiresAt,
      id: record.id,
      warning: "This link is shown once. It cannot be recovered — issue a new one if it is lost.",
    });
  } catch (error: any) {
    return c.json({ error: error?.message || "That link could not be issued." }, 500);
  }
});

/* ── read, by whoever holds the token ─────────────────────────────────── */

// One reply for every failure. A holder of a real token learns nothing new, and
// somebody guessing learns nothing at all — not whether the link existed, not
// whether it expired, not whether it was pulled.
const GONE = { error: "This review link is not valid. Ask for a new one." };

app.get("/review/:token", async (c) => {
  try {
    const token = String(c.req.param("token") || "");
    if (token.length < 20 || token.length > 200) return c.json(GONE, 404);

    const hash = await hashToken(token);
    const record = (await kv.get(linkKey(hash))) as any;
    if (!record) return c.json(GONE, 404);
    if (record.revokedAt) return c.json(GONE, 404);
    if (new Date(record.expiresAt).getTime() < Date.now()) return c.json(GONE, 404);

    // First open is worth knowing — it is the difference between "they have not
    // looked" and "they looked and said nothing", which decides whether to chase.
    if (!record.openedAt) {
      await kv.set(linkKey(hash), { ...record, openedAt: new Date().toISOString() });
    }

    return c.json({
      view: record.view,
      response: record.response,
      expiresAt: record.expiresAt,
      // So the page can say who sent it rather than looking like a phishing mail.
      issuedBy: record.issuedBy,
    });
  } catch {
    return c.json(GONE, 404);
  }
});

/* ── respond ──────────────────────────────────────────────────────────── */

app.post("/review/:token/respond", async (c) => {
  try {
    const token = String(c.req.param("token") || "");
    if (token.length < 20 || token.length > 200) return c.json(GONE, 404);

    const hash = await hashToken(token);
    const record = (await kv.get(linkKey(hash))) as any;
    if (!record) return c.json(GONE, 404);
    if (record.revokedAt) return c.json(GONE, 404);
    if (new Date(record.expiresAt).getTime() < Date.now()) return c.json(GONE, 404);

    // One answer. A reviewer who changes their mind gets a new link, so an
    // approval on the record cannot be quietly overwritten later.
    if (record.response) {
      return c.json({ error: "This submittal has already been answered." }, 409);
    }

    const body = await c.req.json().catch(() => ({}));
    const verdict = body?.verdict === "approved" ? "approved"
      : body?.verdict === "changes-requested" ? "changes-requested" : null;
    if (!verdict) return c.json({ error: "Choose approved or changes requested." }, 400);

    const reviewer = String(body?.reviewer || "").trim().slice(0, 160);
    if (!reviewer) return c.json({ error: "Please give your name." }, 400);

    const comments = String(body?.comments || "").trim().slice(0, 8000);
    if (verdict === "changes-requested" && !comments) {
      return c.json({ error: "Say what needs changing — a rejection with no reason cannot be acted on." }, 400);
    }

    const response = {
      verdict,
      reviewer,
      credential: String(body?.credential || "").trim().slice(0, 160) || undefined,
      comments,
      respondedAt: new Date().toISOString(),
    };

    await kv.set(linkKey(hash), {
      ...record,
      response,
      view: { ...record.view, state: verdict },
    });

    return c.json({ success: true, response });
  } catch (error: any) {
    return c.json({ error: error?.message || "That could not be recorded." }, 500);
  }
});

/* ── list and revoke ──────────────────────────────────────────────────── */

app.get("/links/:projectId", requireStaff, async (c) => {
  try {
    const projectId = String(c.req.param("projectId") || "");
    const index = (await kv.get(indexKey(projectId))) as any[] | null;
    const rows = Array.isArray(index) ? index : [];

    const links = [];
    for (const entry of rows) {
      const record = (await kv.get(linkKey(entry.hash))) as any;
      if (!record) continue;
      links.push({
        id: record.id,
        submittalId: record.submittalId,
        recipientEmail: record.recipientEmail,
        issuedBy: record.issuedBy,
        issuedAt: record.issuedAt,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        openedAt: record.openedAt,
        response: record.response,
        expired: new Date(record.expiresAt).getTime() < Date.now(),
        // No token, and none to give — only its hash was ever stored.
      });
    }
    return c.json({ links });
  } catch (error: any) {
    return c.json({ error: error?.message || "Those links could not be listed." }, 500);
  }
});

app.post("/links/:projectId/:linkId/revoke", requireStaff, async (c) => {
  try {
    const projectId = String(c.req.param("projectId") || "");
    const linkId = String(c.req.param("linkId") || "");
    const index = (await kv.get(indexKey(projectId))) as any[] | null;

    // Found by id, which means reading each record: the index holds the hash and
    // the id lives on the record. The token itself is not here and never was.
    for (const row of (Array.isArray(index) ? index : [])) {
      const record = (await kv.get(linkKey(row.hash))) as any;
      if (!record || record.id !== linkId) continue;
      await kv.set(linkKey(row.hash), { ...record, revokedAt: new Date().toISOString() });
      return c.json({ success: true });
    }
    return c.json({ error: "That link was not found." }, 404);
  } catch (error: any) {
    return c.json({ error: error?.message || "That link could not be revoked." }, 500);
  }
});

export default app;
